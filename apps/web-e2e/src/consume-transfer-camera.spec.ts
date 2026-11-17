import path from 'node:path';

import { expect, test } from './fixtures.js';
import {
  listRows,
  type PendingScanRow,
  removeRows,
  sessionRows,
} from './pending-scans.js';

// The camera test of the Consume and Transfer scan screen, as in
// `camera.spec.ts`. The file name ends with `camera.spec.ts`, so the Firefox
// and WebKit projects leave this file out. Playwright takes the launch options
// at the top of the file only, so this test has a file of its own.
//
// The camera file holds the barcode 5449000000996 of product 1, so every page
// load of the screen scans that code one time. No other test makes a Consume
// pending scan with this code. The Purchase test of this code removes its
// Purchase rows only.

const CODE = '5449000000996';
const CAMERA_FILE = path.join(import.meta.dirname, 'camera', `${CODE}.mjpeg`);

// The ZXing path loads a WebAssembly file of about one megabyte before the
// first decode.
const DECODER_TIMEOUT_MS = 20_000;

function isConsumeOfCode(row: PendingScanRow): boolean {
  return row.bookingType === 'consume' && row.code === CODE;
}

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${CAMERA_FILE}`,
    ],
  },
});

test('the barcode in the camera file becomes one Consume row on the Consume and Transfer scan screen', async ({
  page,
  request,
}) => {
  await removeRows(request, (row) => isConsumeOfCode(row));
  await page.goto('/scan/consume-transfer');

  const rows = sessionRows(page);
  await expect(rows).toHaveCount(1, { timeout: DECODER_TIMEOUT_MS });
  const row = rows.first();
  await expect(row).toContainText('Coca-Cola Original 330 ml');
  await expect(
    row.getByRole('button', { name: 'Consume. Change to Transfer.' }),
  ).toBeVisible();
  await expect(row).toContainText('Consume from Fridge');
  await expect(
    page.getByText('1 scan in the review queue', { exact: true }),
  ).toBeVisible();
  const stored = await listRows(request);
  expect(stored.filter((item) => isConsumeOfCode(item))).toHaveLength(1);
});
