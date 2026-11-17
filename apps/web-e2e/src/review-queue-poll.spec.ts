import { type Locator, type Page, type Response } from '@playwright/test';
import { expect, test } from './fixtures.js';
import {
  createRow,
  PENDING_SCANS,
  queueRows,
  removeRows,
} from './pending-scans.js';

// The tests of a change on the review queue while a poll of the pending scan list is on the way.
// The API keeps its rows for the whole run, and every test of every file runs in parallel against one API.
// Each test creates its own rows through the API with a note of its own.
// No other note contains the note of a test of this file, and the note of a test contains no other note.
// The rows carry a product and no code, so no scan merges into them.

// The next poll comes three seconds after the answer of the last poll. After
// the held answer, the list must load again at once, not at the next poll.
const AT_ONCE_MS = 1500;

interface HeldPoll {
  // The time from the release of the held answer to the next request of the
  // list, or null while no request came.
  msToNextRequest: () => null | number;
}

function msBetween(start: null | number, end: null | number): null | number {
  return start === null || end === null ? null : end - start;
}

// The browser holds the answer of the next poll of the pending scan list until
// the answer of the change arrives and the row is not busy any more. The row
// is busy until the action has asked for the list again. The API reads the
// list when the poll starts, so the held answer does not have the change. The
// function returns when the API has read the list for the held poll.
async function holdNextPollUntil(
  page: Page,
  isChange: (response: Response) => boolean,
  row: Locator,
): Promise<HeldPoll> {
  const changed = page.waitForResponse(isChange);
  let isRead = false;
  let releasedAt: null | number = null;
  let nextRequestAt: null | number = null;
  await page.route(`**${PENDING_SCANS}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    if (isRead) {
      nextRequestAt ??= Date.now();
      await route.continue();
      return;
    }
    isRead = true;
    const response = await route.fetch();
    await changed;
    await expect(row.getByRole('button', { name: 'Reject' })).toBeEnabled();
    releasedAt = Date.now();
    await route.fulfill({ response });
  });
  await expect.poll(() => isRead).toBe(true);
  return {
    msToNextRequest: () => msBetween(releasedAt, nextRequestAt),
  };
}

test('a reject while a poll is on the way loads the list again at once', async ({
  page,
  request,
}) => {
  const note = 'held-poll reject';
  await removeRows(request, (row) => row.note === note);
  await createRow(request, { bookingType: 'purchase', note, productId: 2 });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await expect(row).toBeVisible();
  const heldPoll = await holdNextPollUntil(
    page,
    (response) => response.request().method() === 'DELETE',
    row,
  );

  await row.getByRole('button', { name: 'Reject' }).click();

  await expect(row).toHaveCount(0);
  await expect.poll(heldPoll.msToNextRequest).not.toBeNull();
  expect(heldPoll.msToNextRequest()).toBeLessThan(AT_ONCE_MS);
});

test('a failed accept while a poll is on the way loads the list again at once', async ({
  page,
  request,
}) => {
  const note = 'held-poll failed accept';
  await removeRows(request, (row) => row.note === note);
  // The Grocy mock refuses a purchase into the inactive location 4 with no
  // due date.
  const created = await createRow(request, {
    bookingType: 'purchase',
    locationId: 4,
    note,
    productId: 3,
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await expect(row.getByRole('button', { name: 'Accept' })).toBeVisible();
  const heldPoll = await holdNextPollUntil(
    page,
    (response) => response.url().endsWith('/api/v2/bookings'),
    row,
  );

  await row.getByRole('button', { name: 'Accept' }).click();

  await expect(row).toContainText('Accept failed');
  await expect.poll(heldPoll.msToNextRequest).not.toBeNull();
  expect(heldPoll.msToNextRequest()).toBeLessThan(AT_ONCE_MS);
  await removeRows(request, (item) => item.id === created.id);
});
