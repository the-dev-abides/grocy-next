import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';
import {
  createRow,
  listRows,
  type PendingScanRow,
  pickOption,
  removeRowsWithNote,
  storedRow,
  swipeLeft,
} from './pending-scans.js';

// The tests of the cards view and the view switch of the review queue.
// The API keeps its rows for the whole run, and every test of every file runs in parallel against one API.
// Each test creates its own rows through the API with a note of its own.
// The rows have no code, so no scan merges into them.
// The rows are in the Fridge and in the group Dairy, and the tests filter on the two.
// No other file puts a row in that location and that group, so the list shows no row of another file.
// The swipe and the bulk edit act only on the cards of the note of the test.

const FRIDGE = 1;
const PANTRY = 2;
const DAIRY = 1;

const PHONE = { height: 812, width: 375 };
const LARGE = { height: 768, width: 1024 };

// A row in the Fridge and in the group Dairy, so the filter of the tests
// shows it.
function createCardRow(
  request: APIRequestContext,
  body: Record<string, unknown>,
): Promise<PendingScanRow> {
  return createRow(request, {
    locationId: FRIDGE,
    productGroupId: DAIRY,
    ...body,
  });
}

function table(page: Page): Locator {
  return page.getByRole('table', { name: 'Pending scans' });
}

function cardList(page: Page): Locator {
  return page.getByRole('list', { name: 'Pending scans' });
}

function cardsOf(page: Page, note: string): Locator {
  return cardList(page).getByRole('listitem').filter({ hasText: note });
}

// The review queue on a phone, filtered to the rows of this file.
async function openCards(page: Page) {
  await page.setViewportSize(PHONE);
  await page.goto('/review-queue');
  await pickOption(page, 'Location', 'Fridge');
  await pickOption(page, 'Product group', 'Dairy');
}

test('the review queue opens as the table at 1024px and as the cards at 375px', async ({
  page,
}) => {
  await page.setViewportSize(LARGE);
  await page.goto('/review-queue');
  await expect(table(page)).toBeVisible();
  await expect(cardList(page)).toHaveCount(0);

  await page.setViewportSize(PHONE);
  await page.reload();
  await expect(cardList(page)).toBeVisible();
  await expect(table(page)).toHaveCount(0);
});

test('the switch changes the view, and the choice survives a reload', async ({
  page,
}) => {
  await page.setViewportSize(LARGE);
  await page.goto('/review-queue');
  const view = page.getByRole('group', { name: 'View' });
  await expect(view.getByRole('button', { name: 'Table' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await view.getByRole('button', { name: 'Cards' }).click();

  await expect(cardList(page)).toBeVisible();
  await expect(table(page)).toHaveCount(0);
  await expect(view.getByRole('button', { name: 'Cards' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(cardList(page)).toBeVisible();

  await view.getByRole('button', { name: 'Table' }).click();
  await page.setViewportSize(PHONE);
  await page.reload();
  await expect(table(page)).toBeVisible();
  await expect(cardList(page)).toHaveCount(0);
});

test('a swipe to the left on a card removes the row, and a short swipe keeps it', async ({
  page,
  request,
}) => {
  const note = 'cards-swipe';
  await removeRowsWithNote(request, note);
  const created = await createCardRow(request, {
    bookingType: 'purchase',
    note,
    productId: 2,
  });
  await openCards(page);
  const card = cardsOf(page, note);
  await expect(card).toContainText('Philadelphia Original 150 g');

  await swipeLeft(page, card, 0.15);
  // The poll runs one time before the check, so a sent delete would show.
  await expect(card).toBeVisible();
  expect(await storedRow(request, created.id)).toBeDefined();

  await swipeLeft(page, card, 0.5);

  await expect(card).toHaveCount(0, { timeout: 3000 });
  expect(await storedRow(request, created.id)).toBeUndefined();
});

test('plus and minus on an Inventory card set the count from the Grocy stock, and the accept on the card books it', async ({
  page,
  request,
}) => {
  const note = 'cards-count';
  await removeRowsWithNote(request, note);
  // Product 3 has the stock 1 in the unit Pack and the default location
  // Pantry.
  const created = await createCardRow(request, {
    bookingType: 'inventory',
    note,
    productId: 3,
  });
  await openCards(page);
  const card = cardsOf(page, note);
  const field = card.getByRole('spinbutton', { name: 'Count in Pack' });
  await expect(field).toHaveAttribute('placeholder', '1');
  await expect(card).toContainText('Needs a count');
  await expect(card.getByRole('button', { name: 'Accept' })).toHaveCount(0);

  await card.getByRole('button', { name: 'More' }).click();
  await expect(field).toHaveValue('2');
  await card.getByRole('button', { name: 'More' }).click();
  await expect(field).toHaveValue('3');
  await card.getByRole('button', { name: 'Less' }).click();
  await expect(field).toHaveValue('2');
  await expect(card).toContainText('+1 Pack');
  await expect
    .poll(async () => {
      const row = await storedRow(request, created.id);
      return row?.amount;
    })
    .toBe(2);

  await card.getByRole('button', { name: 'Accept' }).click();

  // The Grocy mock answers every inventory increase with the defaults of
  // product 3.
  await expect(card).toHaveCount(0);
  expect(await storedRow(request, created.id)).toBeUndefined();
  await expect(page.getByRole('status')).toContainText(
    'Nutella Biscuits 304 g: Booked 3 Pack at Pantry, due 2027-01-01, price 3.99 per Pack, inventory-correction.',
  );
});

test('the bulk edit acts on the checked cards and changes no other card', async ({
  page,
  request,
}) => {
  const note = 'cards-bulk';
  await removeRowsWithNote(request, note);
  const first = await createCardRow(request, {
    bookingType: 'purchase',
    note,
    productId: 5,
  });
  const second = await createCardRow(request, {
    bookingType: 'purchase',
    note,
    productId: 2,
  });
  const unchecked = await createCardRow(request, {
    bookingType: 'purchase',
    note,
    productId: 3,
  });
  await openCards(page);
  const cards = cardsOf(page, note);
  await expect(cards).toHaveCount(3);
  await cards.filter({ hasText: 'Yoghurt' }).getByRole('checkbox').check();
  await cards
    .filter({ hasText: 'Philadelphia Original 150 g' })
    .getByRole('checkbox')
    .check();

  await page.getByRole('button', { name: 'Bulk edit' }).click();

  const dialog = page.getByRole('dialog', { name: 'Edit 2 pending scans' });
  await pickOption(dialog, 'Location', 'Pantry');
  await dialog.getByRole('button', { name: 'Apply' }).click();

  await expect(dialog).toBeHidden();
  // The bulk edit sends one update per row, one after the other.
  await expect
    .poll(async () => {
      const rows = await listRows(request);
      return [first.id, second.id].map(
        (id) => rows.find((row) => row.id === id)?.locationId,
      );
    })
    .toEqual([PANTRY, PANTRY]);
  expect(await storedRow(request, unchecked.id)).toEqual(unchecked);

  await removeRowsWithNote(request, note);
});
