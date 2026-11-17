import { expect, type Page, type Response, test } from '@playwright/test';
import {
  createRow,
  PENDING_SCANS,
  queueRows,
  removeRows,
} from './pending-scans.js';

// The tests of a change on the review queue while a poll of the pending scan list is on the way.
// The API keeps its rows for the whole run, and every test of every file runs in parallel against one API.
// Each test creates its own rows through the API with a note of its own.
// The rows carry a product and no code, so no scan merges into them.

// The browser holds the answer of the next poll of the pending scan list until
// the answer of the change arrives. The API reads the list when the poll
// starts, so the held answer does not have the change. The function returns
// when the API has read the list for the held poll.
async function holdNextPollUntil(
  page: Page,
  isChange: (response: Response) => boolean,
): Promise<void> {
  const changed = page.waitForResponse(isChange);
  let isHeld = false;
  let isRead = false;
  await page.route(`**${PENDING_SCANS}`, async (route) => {
    if (isHeld || route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    isHeld = true;
    const response = await route.fetch();
    isRead = true;
    await changed;
    await route.fulfill({ response });
  });
  await expect.poll(() => isRead).toBe(true);
}

// The next poll comes three seconds after the held answer. The list must load
// again after the held answer, so the change shows before that poll.
const BEFORE_NEXT_POLL_MS = 2000;

test('a reject while a poll is on the way removes the row before the next poll', async ({
  page,
  request,
}) => {
  const note = 'review-queue-reject-during-poll';
  await removeRows(request, (row) => row.note === note);
  await createRow(request, { bookingType: 'purchase', note, productId: 2 });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await expect(row).toBeVisible();
  await holdNextPollUntil(
    page,
    (response) => response.request().method() === 'DELETE',
  );

  await row.getByRole('button', { name: 'Reject' }).click();

  await expect(row).toHaveCount(0, { timeout: BEFORE_NEXT_POLL_MS });
});

test('a failed accept while a poll is on the way shows the failure before the next poll', async ({
  page,
  request,
}) => {
  const note = 'review-queue-failed-accept-during-poll';
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
  await holdNextPollUntil(page, (response) =>
    response.url().endsWith('/api/v2/bookings'),
  );

  await row.getByRole('button', { name: 'Accept' }).click();

  await expect(row).toContainText('Accept failed', {
    timeout: BEFORE_NEXT_POLL_MS,
  });
  await removeRows(request, (item) => item.id === created.id);
});
