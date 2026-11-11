import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';
import path from 'node:path';

// The camera tests of ADR 0015.
// The Firefox and WebKit projects leave this file out in the Playwright configuration.
// The three flags below give the Chromium fake camera.
// They make Chromium grant the camera permission with no prompt.
// They make Chromium offer a fake camera and play a checked-in file as the camera picture.
// The file holds the barcode of one fixture code, so every page load of the Purchase scan screen scans that code one time.
// The tests of this file run one after the other in one worker, because they scan the same code against one API.
// Playwright takes the launch options at the top of the file only.

// The unknown code of the fixture. No other test creates a Purchase pending
// scan with this code, so a row of this code belongs to this file.
const CODE = '3017620422003';
const CAMERA_FILE = path.join(import.meta.dirname, 'camera', `${CODE}.mjpeg`);

const PENDING_SCANS = '/api/v2/pending-scans';

// The ZXing path loads a WebAssembly file of about one megabyte before the
// first decode.
const DECODER_TIMEOUT_MS = 20_000;

interface PendingScanRow {
  amount: null | number;
  code: null | string;
  id: number;
}

async function rowsWithCode(
  request: APIRequestContext,
  code: string,
): Promise<PendingScanRow[]> {
  const response = await request.get(PENDING_SCANS);
  const { items } = (await response.json()) as { items: PendingScanRow[] };
  return items.filter((row) => row.code === code);
}

async function removeRowsWithCode(
  request: APIRequestContext,
  code: string,
): Promise<void> {
  const rows = await rowsWithCode(request, code);
  for (const row of rows) {
    await request.delete(`${PENDING_SCANS}/${String(row.id)}`);
  }
}

function sessionRows(page: Page): Locator {
  return page
    .getByRole('list', { name: 'Scans of this session' })
    .getByRole('listitem');
}

function decoderLabel(page: Page): Locator {
  return page.getByText(/^(Native|ZXing) · (worker|main thread)/);
}

// One poll of the pending scan list, every three seconds while the screen
// is open. A wait for two polls keeps the barcode in view for more than the
// one-second repeat gap and lets a merged repeat reach the list.
async function waitForPoll(page: Page): Promise<void> {
  await page.waitForResponse((response) => {
    return (
      response.url().endsWith(PENDING_SCANS) &&
      response.request().method() === 'GET'
    );
  });
}

test.describe.configure({ mode: 'default' });
test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${CAMERA_FILE}`,
    ],
  },
});

test.describe('the Purchase scan screen with the fake camera', () => {
  test('the camera starts when the Purchase scan screen opens', async ({
    page,
  }) => {
    await page.goto('/scan/purchase');

    // The e2e project has no DOM types. The video plays when it has the
    // current frame (ready state 2 or more), is not paused, and has a width.
    const video = page.locator('video');
    await expect
      .poll(() => {
        return video.evaluate((element) => {
          const media = element as unknown as {
            paused: boolean;
            readyState: number;
            videoWidth: number;
          };
          return media.readyState >= 2 && !media.paused && media.videoWidth > 0;
        });
      })
      .toBe(true);
    await expect(page.getByText('The camera starts.')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeHidden();
  });

  test('the label names the active decoder and the thread', async ({
    page,
  }) => {
    await page.goto('/scan/purchase');

    const label = decoderLabel(page);
    await expect(label).toBeVisible({ timeout: DECODER_TIMEOUT_MS });
    // The test output names the decoder that ran. Playwright Chromium on
    // Linux has no native decoder, so the label names ZXing in the worker.
    test.info().annotations.push({
      description: await label.innerText(),
      type: 'decoder label',
    });
    await expect(label).toContainText(/ · \d+ ms$/, {
      timeout: DECODER_TIMEOUT_MS,
    });
  });

  test('the barcode in the camera file becomes one row, and stays one row while it stays in view', async ({
    page,
    request,
  }) => {
    await removeRowsWithCode(request, CODE);
    await page.goto('/scan/purchase');

    const rows = sessionRows(page);
    await expect(rows).toHaveCount(1, { timeout: DECODER_TIMEOUT_MS });
    await expect(rows.first()).toContainText(/3017620422003|Nutella/);
    await expect(page.getByRole('status')).toContainText('Unknown barcode');
    await expect(
      page.getByText('1 scan in the review queue', { exact: true }),
    ).toBeVisible();

    await waitForPoll(page);
    await waitForPoll(page);

    await expect(rows).toHaveCount(1);
    await expect(
      page.getByText('1 scan in the review queue', { exact: true }),
    ).toBeVisible();
    const stored = await rowsWithCode(request, CODE);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.amount).toBe(1);
  });
});

// Headless Chromium has no flag that refuses the camera permission: with no
// fake camera it answers `NotSupportedError`. A script in the page makes the
// camera request fail the way a refused permission fails, before the page
// loads.
test.describe('the Purchase scan screen with a refused camera permission', () => {
  test('a refused camera permission shows the message, the retry button, and the code field', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const devices = (
        navigator as unknown as {
          mediaDevices: { getUserMedia: () => Promise<unknown> };
        }
      ).mediaDevices;
      devices.getUserMedia = () => {
        return Promise.reject(
          new DOMException('Permission denied', 'NotAllowedError'),
        );
      };
    });
    await page.goto('/scan/purchase');

    await expect(
      page.getByText('The camera permission was refused', { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Code' })).toBeVisible();

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(
      page.getByText('The camera permission was refused', { exact: false }),
    ).toBeVisible();
  });
});
