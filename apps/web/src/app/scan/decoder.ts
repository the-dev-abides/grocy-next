import {
  prepareZXingModule,
  BarcodeDetector as ZxingBarcodeDetector,
} from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

// The seven formats of ADR 0009. Data Matrix and Code 128 cover the two
// Grocycode print types. QR serves the re-order sheet later.
const FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'data_matrix',
  'qr_code',
] as const;

export type DecoderKind = 'native' | 'zxing';

// One decoder behind the one interface of ADR 0009. The detect call returns
// the values of the barcodes in the frame.
export interface Decoder {
  detect(source: ImageBitmapSource): Promise<string[]>;
  kind: DecoderKind;
}

// The shape of the native `BarcodeDetector` of the browser. The DOM types of
// TypeScript do not declare the Shape Detection API.
interface NativeBarcodeDetector {
  detect(source: ImageBitmapSource): Promise<readonly { rawValue: string }[]>;
}
interface NativeBarcodeDetectorConstructor {
  getSupportedFormats(): Promise<readonly string[]>;
  new (options: { formats: readonly string[] }): NativeBarcodeDetector;
}

function isNativeBarcodeDetectorConstructor(
  value: unknown,
): value is NativeBarcodeDetectorConstructor {
  return (
    typeof value === 'function' &&
    'getSupportedFormats' in value &&
    typeof value.getSupportedFormats === 'function'
  );
}

// The native constructor of this browser, or null. Chrome on Android without
// Google Play Services has the constructor and an empty format list, so the
// caller checks the formats too.
function nativeBarcodeDetector(): NativeBarcodeDetectorConstructor | null {
  const candidate: unknown = Reflect.get(globalThis, 'BarcodeDetector');
  return isNativeBarcodeDetectorConstructor(candidate) ? candidate : null;
}

async function nativeFormats(
  native: NativeBarcodeDetectorConstructor | null,
): Promise<readonly string[]> {
  if (native === null) {
    return [];
  }
  try {
    return await native.getSupportedFormats();
  } catch {
    return [];
  }
}

function values(found: readonly { rawValue: string }[]): string[] {
  return found.map((barcode) => barcode.rawValue);
}

// The selection rule of ADR 0009: the native decoder when it reads all seven
// formats, else ZXing-C++ in WebAssembly through the ponyfill. The ZXing
// `.wasm` file is served from the app origin: the `?url` import makes Vite
// copy the file into the assets of the build.
export async function createDecoder(): Promise<Decoder> {
  const native = nativeBarcodeDetector();
  const formats = await nativeFormats(native);
  if (native !== null && FORMATS.every((format) => formats.includes(format))) {
    const detector = new native({ formats: FORMATS });
    return {
      detect: async (source) => values(await detector.detect(source)),
      kind: 'native',
    };
  }
  await prepareZXingModule({
    fireImmediately: true,
    overrides: {
      locateFile: (file: string, prefix: string) =>
        file.endsWith('.wasm') ? wasmUrl : prefix + file,
    },
  });
  const detector = new ZxingBarcodeDetector({ formats: [...FORMATS] });
  return {
    detect: async (source) => values(await detector.detect(source)),
    kind: 'zxing',
  };
}
