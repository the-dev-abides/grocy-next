import type { Decoder, DecoderKind } from './decoder';

import { createDecoder } from './decoder';

// The decode runs in this Web Worker, as ADR 0009 decided. The scanner sends
// one init request, then one detect request per frame with the frame as an
// image bitmap. The worker answers every request with one response.
export type WorkerRequest =
  { bitmap: ImageBitmap; type: 'detect' } | { type: 'init' };

export type WorkerResponse =
  | { kind: DecoderKind; type: 'ready' }
  | { message: string; type: 'failed' }
  | { type: 'result'; values: string[] };

const state: { decoder: Decoder | null } = { decoder: null };

async function detect(bitmap: ImageBitmap): Promise<WorkerResponse> {
  if (state.decoder === null) {
    bitmap.close();
    return { type: 'result', values: [] };
  }
  try {
    return { type: 'result', values: await state.decoder.detect(bitmap) };
  } finally {
    bitmap.close();
  }
}

async function answer(request: WorkerRequest): Promise<WorkerResponse> {
  if (request.type === 'detect') {
    return detect(request.bitmap);
  }
  state.decoder = await createDecoder();
  return { kind: state.decoder.kind, type: 'ready' };
}

async function respond(request: WorkerRequest): Promise<void> {
  let response: WorkerResponse;
  try {
    response = await answer(request);
  } catch (error) {
    response = { message: String(error), type: 'failed' };
  }
  globalThis.postMessage(response, { transfer: [] });
}

globalThis.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  // A dedicated worker receives messages from the page that made it only.
  // Such a message has the empty origin.
  if (event.origin === '') {
    void respond(event.data);
  }
});
