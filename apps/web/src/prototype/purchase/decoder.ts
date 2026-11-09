// PROTOTYPE. Throwaway. The decoder selection of ADR 0009.
//
// One interface, `BarcodeDetector`, two decoders behind it. The native
// decoder when it reads all seven formats, otherwise ZXing-C++ in
// WebAssembly through the `barcode-detector` ponyfill. The `.wasm` file is
// served from the app origin. This module runs in the Web Worker and, as a
// fallback, on the main thread.
import { BarcodeDetector as Ponyfill, prepareZXingModule } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

export const FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'data_matrix',
  'qr_code',
] as const;

export type DecoderKind = 'native' | 'zxing';
export type Force = DecoderKind | undefined;

export interface Found {
  rawValue: string;
  format: string;
}

export interface Decoder {
  kind: DecoderKind;
  nativeFormats: string[];
  detect(source: ImageBitmapSource): Promise<Found[]>;
}

type NativeCtor = typeof Ponyfill;

export async function createDecoder(force: Force): Promise<Decoder> {
  const Native = (globalThis as unknown as { BarcodeDetector?: NativeCtor }).BarcodeDetector;
  let nativeFormats: string[] = [];
  if (Native && typeof Native.getSupportedFormats === 'function') {
    try {
      nativeFormats = [...(await Native.getSupportedFormats())];
    } catch {
      nativeFormats = [];
    }
  }
  const nativeReadsAll = FORMATS.every((f) => nativeFormats.includes(f));
  const useNative = force === 'native' ? Boolean(Native) : force === 'zxing' ? false : nativeReadsAll;

  if (useNative && Native) {
    const detector = new Native({ formats: [...FORMATS] });
    return {
      kind: 'native',
      nativeFormats,
      detect: async (source) => (await detector.detect(source)).map(pick),
    };
  }

  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
    fireImmediately: true,
  });
  const detector = new Ponyfill({ formats: [...FORMATS] });
  return {
    kind: 'zxing',
    nativeFormats,
    detect: async (source) => (await detector.detect(source)).map(pick),
  };
}

function pick(d: { rawValue: string; format: string }): Found {
  return { rawValue: d.rawValue, format: d.format };
}
