import type { WorkerRequest, WorkerResponse } from './decode.worker';
import type { Decoder, DecoderKind } from './decoder';

import DecodeWorker from './decode.worker?worker';
import { createDecoder } from './decoder';
import { createRepeatRule } from './repeat-rule';

// The scanner of ADR 0009: the camera, the decoder in a Web Worker with the main thread as the fallback, the frame clock, and the repeat rule.

export interface ScannerStatus {
  camera: 'denied' | 'error' | 'off' | 'on' | 'starting';
  decoder: DecoderKind | null;
  lastDecodeMs: null | number;
  message: null | string;
  thread: 'main' | 'worker' | null;
}

export const INITIAL_SCANNER_STATUS: ScannerStatus = {
  camera: 'off',
  decoder: null,
  lastDecodeMs: null,
  message: null,
  thread: null,
};

export interface ScannerEvents {
  onScan(code: string): void;
  onStatus(status: ScannerStatus): void;
}

// The worker loads the decoder and, on the ZXing path, the `.wasm` file. A
// worker that does not answer within this time gives way to the main thread.
const WORKER_START_TIMEOUT_MS = 15_000;

function now(): number {
  return performance.now();
}

// This function sends one request to the worker and waits for its one
// response. The scanner has one decode in flight at a time, so one pair of
// listeners per request is enough.
function request(
  worker: Worker,
  message: WorkerRequest,
  transfer: Transferable[] = [],
  timeoutMs?: number,
): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer =
      timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            controller.abort();
            reject(new Error('The worker did not answer in time.'));
          }, timeoutMs);
    const done = () => {
      clearTimeout(timer);
      controller.abort();
    };
    worker.addEventListener(
      'message',
      (event: MessageEvent<WorkerResponse>) => {
        done();
        resolve(event.data);
      },
      { signal: controller.signal },
    );
    worker.addEventListener(
      'error',
      (event) => {
        done();
        reject(new Error(event.message));
      },
      { signal: controller.signal },
    );
    worker.postMessage(message, transfer);
  });
}

export class Scanner {
  private readonly video: HTMLVideoElement;
  private readonly events: ScannerEvents;
  private readonly scansInFrame = createRepeatRule(now);
  private status: ScannerStatus = INITIAL_SCANNER_STATUS;
  private stream: MediaStream | null = null;
  private worker: null | Worker = null;
  private mainDecoder: Decoder | null = null;
  private frameHandle: null | number = null;
  private isStopped = true;

  constructor(video: HTMLVideoElement, events: ScannerEvents) {
    this.video = video;
    this.events = events;
  }

  private set(patch: Partial<ScannerStatus>): void {
    this.status = { ...this.status, ...patch };
    this.events.onStatus(this.status);
  }

  private stopStream(): void {
    if (this.stream !== null) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
    }
    this.stream = null;
  }

  private async openCamera(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          height: { ideal: 720 },
          width: { ideal: 1280 },
        },
      });
    } catch (error) {
      const isDenied =
        error instanceof DOMException && error.name === 'NotAllowedError';
      this.set({
        camera: isDenied ? 'denied' : 'error',
        message: String(error),
      });
      return false;
    }
    return true;
  }

  private async playVideo(): Promise<void> {
    this.video.srcObject = this.stream;
    try {
      await this.video.play();
    } catch {
      // The browser refused the autoplay. The frame clock still runs when
      // the video plays later.
    }
  }

  // The decoder starts in the worker. When the worker fails, the decoder
  // runs on the main thread and the status says so.
  private async startDecoder(): Promise<void> {
    let worker: Worker;
    let response: WorkerResponse;
    try {
      worker = new DecodeWorker();
      response = await request(
        worker,
        { type: 'init' },
        [],
        WORKER_START_TIMEOUT_MS,
      );
    } catch (error) {
      await this.switchToMainThread(`The worker failed: ${String(error)}`);
      return;
    }
    if (response.type === 'ready') {
      this.worker = worker;
      this.set({ decoder: response.kind, thread: 'worker' });
      return;
    }
    worker.terminate();
    const detail = response.type === 'failed' ? response.message : 'no answer';
    await this.switchToMainThread(`The worker failed: ${detail}`);
  }

  private async switchToMainThread(message: string): Promise<void> {
    this.worker?.terminate();
    this.worker = null;
    this.set({ message });
    try {
      this.mainDecoder = await createDecoder();
    } catch (error) {
      this.set({ message: `The decoder failed: ${String(error)}` });
      return;
    }
    this.set({ decoder: this.mainDecoder.kind, thread: 'main' });
  }

  // The frame clock: one decode per video frame, one decode in flight. The
  // next frame callback is requested after the decode, so a frame that
  // arrives while a decode runs is skipped.
  private scheduleFrame(): void {
    if (this.isStopped) {
      return;
    }
    this.frameHandle = this.video.requestVideoFrameCallback(() => {
      this.frameHandle = null;
      void this.onFrame();
    });
  }

  private async onFrame(): Promise<void> {
    if (this.isStopped) {
      return;
    }
    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      await this.decodeFrame();
    }
    this.scheduleFrame();
  }

  private async decodeFrame(): Promise<void> {
    let found: string[];
    try {
      found = await this.decode();
    } catch (error) {
      await this.switchToMainThread(`The decode failed: ${String(error)}`);
      return;
    }
    for (const code of this.scansInFrame(found)) {
      this.events.onScan(code);
    }
  }

  private async decode(): Promise<string[]> {
    const startedAt = now();
    const found =
      this.worker === null
        ? await this.decodeOnMainThread()
        : await this.decodeInWorker(this.worker);
    this.set({ lastDecodeMs: Math.round(now() - startedAt) });
    return found;
  }

  private async decodeInWorker(worker: Worker): Promise<string[]> {
    const bitmap = await createImageBitmap(this.video);
    const response = await request(worker, { bitmap, type: 'detect' }, [
      bitmap,
    ]);
    if (response.type === 'result') {
      return response.values;
    }
    throw new Error(
      response.type === 'failed' ? response.message : 'no result',
    );
  }

  private async decodeOnMainThread(): Promise<string[]> {
    return this.mainDecoder === null
      ? []
      : await this.mainDecoder.detect(this.video);
  }

  private hasStopped(): boolean {
    return this.isStopped;
  }

  // This method asks for the environment-facing camera at 1280 by 720 ideal,
  // starts the decoder, and starts the frame clock. A refused permission sets
  // the camera to `denied`. A call after a stop or a refusal starts again.
  async start(): Promise<void> {
    this.isStopped = false;
    this.set({ camera: 'starting', message: null });
    const isOpen = await this.openCamera();
    if (!isOpen) {
      return;
    }
    if (this.hasStopped()) {
      this.stopStream();
      return;
    }
    await this.playVideo();
    this.set({ camera: 'on' });
    if (this.status.decoder === null) {
      await this.startDecoder();
    }
    this.scheduleFrame();
  }

  // This method stops the camera, the worker, and the frame clock.
  stop(): void {
    this.isStopped = true;
    if (this.frameHandle !== null) {
      this.video.cancelVideoFrameCallback(this.frameHandle);
      this.frameHandle = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.mainDecoder = null;
    this.stopStream();
    this.video.srcObject = null;
    this.set({ camera: 'off', decoder: null, thread: null });
  }
}
