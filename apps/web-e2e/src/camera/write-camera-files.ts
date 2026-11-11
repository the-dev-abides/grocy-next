// This script writes the camera files of the end-to-end tests: one file per
// fixture code, as ADR 0015 decided. The ZXing writer draws the EAN-13
// barcode, Chromium renders it as a JPEG, and the file gets the `.mjpeg`
// extension. The Chromium flag `--use-file-for-fake-video-capture` accepts
// a `.y4m` file or a `.mjpeg` file only. It reads a file with one JPEG as a
// one-frame MJPEG stream and loops it.
//
// Run it from the repo root: `pnpm --filter @grocy-next/web-e2e camera-files`.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareZXingModule, writeBarcode } from 'zxing-wasm/writer';

// The four codes of the fixture household: three product barcodes and the
// unknown code with an Open Food Facts record.
const CODES = [
  '5449000000996',
  '7622300441937',
  '8000500310427',
  '3017620422003',
];

// The frame size of the fake camera and the width of the barcode in it.
const FRAME = { height: 360, width: 640 };
const BARCODE_WIDTH_PX = 420;
const JPEG_QUALITY = 60;

const folder = import.meta.dirname;

async function barcodeSvg(code: string): Promise<string> {
  const result = await writeBarcode(code, {
    format: 'EAN-13',
    withHRT: false,
    withQuietZones: true,
  });
  if (result.error !== '') {
    throw new Error(`The writer refused the code ${code}: ${result.error}`);
  }
  return result.svg;
}

function pageOf(svg: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;height:100vh"><style>svg{width:${String(BARCODE_WIDTH_PX)}px;height:auto}</style>${svg}</body></html>`;
}

async function writeCameraFiles(): Promise<void> {
  // The writer runs in Node, so the script gives it the WebAssembly file of
  // the package instead of a download.
  const wasmBinary = await readFile(
    new URL(import.meta.resolve('zxing-wasm/writer/zxing_writer.wasm')),
  );
  await prepareZXingModule({
    fireImmediately: true,
    overrides: { wasmBinary },
  });
  await using browser = await chromium.launch();
  const page = await browser.newPage({ viewport: FRAME });
  for (const code of CODES) {
    await page.setContent(pageOf(await barcodeSvg(code)));
    const jpeg = await page.screenshot({
      quality: JPEG_QUALITY,
      type: 'jpeg',
    });
    await writeFile(path.join(folder, `${code}.mjpeg`), jpeg);
  }
}

await writeCameraFiles();
