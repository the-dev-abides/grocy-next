// PROTOTYPE. Throwaway. The camera and the decode loop of ADR 0009.
//
// The frame clock is `requestVideoFrameCallback`. One decode is in flight
// at a time; a frame that arrives while a decode runs is skipped. The
// decode runs in a Web Worker. When the worker fails, the decode runs on
// the main thread, and the label on the screen says so.
//
// The repeat rule: one value is one scan while the decoder finds it in
// consecutive frames. The value is a new scan after it has been absent from
// the frames for 1 second.
import { createDecoder, type Decoder, type DecoderKind, type Force, type Found } from './decoder';
import type { WorkerIn, WorkerOut } from './decode.worker';

export const ABSENCE_MS = 1000;

export interface ScannerStatus {
  camera: 'off' | 'starting' | 'on' | 'denied' | 'error';
  decoder: DecoderKind | null;
  thread: 'worker' | 'main' | null;
  nativeFormats: string[];
  lastDecodeMs: number | null;
  inView: string[];
  message: string | null;
}

export interface ScannerEvents {
  onStatus(status: ScannerStatus): void;
  onScan(found: Found): void;
}

export class Scanner {
  private status: ScannerStatus = {
    camera: 'off',
    decoder: null,
    thread: null,
    nativeFormats: [],
    lastDecodeMs: null,
    inView: [],
    message: null,
  };
  private stream: MediaStream | null = null;
  private worker: Worker | null = null;
  private mainDecoder: Decoder | null = null;
  private inFlight = false;
  private stopped = true;
  private lastSeen = new Map<string, number>();
  private frameHandle = 0;

  constructor(
    private video: HTMLVideoElement,
    private events: ScannerEvents,
    private force: Force,
  ) {}

  async start() {
    this.stopped = false;
    this.set({ camera: 'starting', message: null });
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      this.set({
        camera: name === 'NotAllowedError' ? 'denied' : 'error',
        message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      });
      return;
    }
    if (this.stopped) {
      this.stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => undefined);
    this.set({ camera: 'on' });
    await this.startWorker();
    if (!this.stopped) this.scheduleFrame();
  }

  stop() {
    this.stopped = true;
    if (this.frameHandle && 'cancelVideoFrameCallback' in this.video) {
      this.video.cancelVideoFrameCallback(this.frameHandle);
    }
    this.worker?.terminate();
    this.worker = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.set({ camera: 'off', inView: [] });
  }

  private async startWorker() {
    const ready = await new Promise<WorkerOut | null>((resolve) => {
      let worker: Worker;
      try {
        worker = new Worker(new URL('./decode.worker.ts', import.meta.url), { type: 'module' });
      } catch {
        resolve(null);
        return;
      }
      const timer = setTimeout(() => resolve(null), 15000);
      worker.onmessage = (e: MessageEvent<WorkerOut>) => {
        if (e.data.type === 'ready') {
          clearTimeout(timer);
          this.worker = worker;
          resolve(e.data);
        } else if (e.data.type === 'failed') {
          clearTimeout(timer);
          worker.terminate();
          this.set({ message: `Worker failed: ${e.data.message}` });
          resolve(null);
        }
      };
      worker.onerror = (e) => {
        clearTimeout(timer);
        worker.terminate();
        this.set({ message: `Worker error: ${e.message}` });
        resolve(null);
      };
      send(worker, { type: 'init', force: this.force });
    });
    if (ready && ready.type === 'ready') {
      this.set({ decoder: ready.kind, thread: 'worker', nativeFormats: ready.nativeFormats });
      return;
    }
    // Fallback: the main thread.
    this.mainDecoder = await createDecoder(this.force);
    this.set({ decoder: this.mainDecoder.kind, thread: 'main', nativeFormats: this.mainDecoder.nativeFormats });
  }

  private scheduleFrame() {
    if (this.stopped) return;
    if ('requestVideoFrameCallback' in this.video) {
      this.frameHandle = this.video.requestVideoFrameCallback(() => this.onFrame());
    } else {
      this.frameHandle = requestAnimationFrame(() => this.onFrame()) as unknown as number;
    }
  }

  private async onFrame() {
    if (this.stopped) return;
    if (this.inFlight || this.video.readyState < 2) {
      this.scheduleFrame();
      return;
    }
    this.inFlight = true;
    try {
      const found = await this.decode();
      this.onFound(found);
    } catch (error) {
      this.set({ message: `Decode failed: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      this.inFlight = false;
      this.scheduleFrame();
    }
  }

  private async decode(): Promise<Found[]> {
    const t0 = performance.now();
    if (this.worker) {
      const bitmap = await createImageBitmap(this.video);
      const worker = this.worker;
      return new Promise<Found[]>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent<WorkerOut>) => {
          if (e.data.type === 'result') {
            this.set({ lastDecodeMs: Math.round(performance.now() - t0) });
            resolve(e.data.found);
          } else if (e.data.type === 'failed') {
            reject(new Error(e.data.message));
          }
        };
        send(worker, { type: 'detect', bitmap }, [bitmap]);
      });
    }
    if (this.mainDecoder) {
      const found = await this.mainDecoder.detect(this.video);
      this.set({ lastDecodeMs: Math.round(performance.now() - t0) });
      return found;
    }
    return [];
  }

  private onFound(found: Found[]) {
    const now = performance.now();
    const values: string[] = [];
    for (const f of found) {
      if (!f.rawValue || values.includes(f.rawValue)) continue;
      values.push(f.rawValue);
      const seen = this.lastSeen.get(f.rawValue);
      if (seen === undefined || now - seen > ABSENCE_MS) this.events.onScan(f);
      this.lastSeen.set(f.rawValue, now);
    }
    const inView = values.join('|') === this.status.inView.join('|') ? this.status.inView : values;
    if (inView !== this.status.inView) this.set({ inView });
  }

  private set(patch: Partial<ScannerStatus>) {
    this.status = { ...this.status, ...patch };
    this.events.onStatus(this.status);
  }
}

function send(worker: Worker, msg: WorkerIn, transfer: Transferable[] = []) {
  worker.postMessage(msg, transfer);
}
