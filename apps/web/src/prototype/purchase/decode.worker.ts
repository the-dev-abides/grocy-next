// PROTOTYPE. Throwaway. The decode Web Worker of ADR 0009.
//
// The main thread sends one `ImageBitmap` per frame, one in flight. The
// worker decodes it and answers with the values that it found.
import { createDecoder, type Decoder, type Force } from './decoder';

export type WorkerIn = { type: 'init'; force: Force } | { type: 'detect'; bitmap: ImageBitmap };
export type WorkerOut =
  | { type: 'ready'; kind: Decoder['kind']; nativeFormats: string[] }
  | { type: 'result'; found: { rawValue: string; format: string }[]; ms: number }
  | { type: 'failed'; message: string };

let decoder: Decoder | null = null;

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerIn>) => void) | null;
  postMessage: (message: WorkerOut) => void;
};

scope.onmessage = async (event: MessageEvent<WorkerIn>) => {
  const msg = event.data;
  try {
    if (msg.type === 'init') {
      decoder = await createDecoder(msg.force);
      post({ type: 'ready', kind: decoder.kind, nativeFormats: decoder.nativeFormats });
      return;
    }
    if (msg.type === 'detect') {
      const t0 = performance.now();
      const found = decoder ? await decoder.detect(msg.bitmap) : [];
      msg.bitmap.close();
      post({ type: 'result', found, ms: Math.round(performance.now() - t0) });
    }
  } catch (error) {
    post({ type: 'failed', message: error instanceof Error ? error.message : String(error) });
  }
};

function post(msg: WorkerOut) {
  scope.postMessage(msg);
}
