import { expect, test } from './fixtures.js';
import {
  createRow,
  pickOption,
  queueRows,
  removeRows,
  storedRow,
} from './pending-scans.js';

// The tests of the stock entry lines of the review queue. Each test creates
// its own rows through the API with a note of its own.

// The stock entry lines of a row chain with every Consume and Transfer row of
// the same product in the queue. The browser projects run at the same time
// against one API, so each project uses its own product. No other test makes
// a Consume or a Transfer of these products. Each product has one sealed
// stock entry.
interface Fixture {
  location: string;
  locationId: number;
  name: string;
  olderAmount: number;
  option: string;
  productId: number;
  stock: number;
  stockEntryId: string;
}

// Product 6 has 3 packs at the Fridge, due 25 Nov. Product 3 has 1 pack at
// the Pantry, due 15 Jan.
const FIXTURES: Readonly<Record<string, Fixture>> = {
  chromium: {
    location: 'Fridge',
    locationId: 1,
    name: 'Yoghurt Strawberry 150 g',
    olderAmount: 1,
    option: 'Amount: 3; Due on 2026-11-25; Bought on 2026-11-08; Not opened',
    productId: 6,
    stock: 3,
    stockEntryId: '69131a2b3cd91',
  },
  firefox: {
    location: 'Pantry',
    locationId: 2,
    name: 'Nutella Biscuits 304 g',
    olderAmount: 0.5,
    option: 'Amount: 1; Due on 2027-01-15; Bought on 2026-01-10; Not opened',
    productId: 3,
    stock: 1,
    stockEntryId: '69131a2b3cc80',
  },
};

const DUE: Readonly<Record<number, string>> = {
  3: '(15 Jan|Jan 15)',
  6: '(25 Nov|Nov 25)',
};

// The fixture of the browser project. A project with no fixture of its own,
// such as WebKit, takes the Chromium fixture.
function fixtureOf(project: string): Fixture {
  const fixture = FIXTURES[project] ?? FIXTURES['chromium'];
  if (fixture === undefined) {
    throw new Error('No fixture for the browser project.');
  }
  return fixture;
}

function dueOf(fixture: Fixture): string {
  return DUE[fixture.productId] ?? '';
}

// The line of the older row: a part of the sealed pack, which opens the rest.
function olderLineOf(fixture: Fixture): RegExp {
  const amount = String(fixture.olderAmount);
  const tail = String.raw`\. Opens the rest\.$`;
  return new RegExp(
    `^${amount} Pack from a new pack in ${fixture.location}, due ${dueOf(fixture)}${tail}`,
  );
}

// The first line of the newer row: the opened rest after the older row.
function newerLineOf(fixture: Fixture): RegExp {
  const rest = String(fixture.stock - fixture.olderAmount);
  return new RegExp(
    `^${rest} Pack from the opened pack in ${fixture.location}, due ${dueOf(fixture)}$`,
  );
}

// The older row takes a part of the sealed pack and opens the rest. The newer
// row sees the opened rest after the older row, and its amount is the whole
// stock, more than the rest. The stock entry select of the row form picks the
// stock entry.
test('the stock entry lines of two Consume rows of one product chain, and the newer row shows the warning above the stock', async ({
  page,
  request,
}, testInfo) => {
  const fixture = fixtureOf(testInfo.project.name);
  const note = `review-queue-stock-entry-lines-${testInfo.project.name}`;
  await removeRows(request, (row) => {
    return (
      row.productId === fixture.productId &&
      (row.bookingType === 'consume' || row.bookingType === 'transfer')
    );
  });
  const rest = fixture.stock - fixture.olderAmount;
  await createRow(request, {
    amount: fixture.olderAmount,
    bookingType: 'consume',
    locationId: fixture.locationId,
    note: `${note}-older`,
    productId: fixture.productId,
  });
  const newer = await createRow(request, {
    amount: fixture.stock,
    bookingType: 'consume',
    locationId: fixture.locationId,
    note: `${note}-newer`,
    productId: fixture.productId,
  });
  await page.goto('/review-queue');

  const older = queueRows(page).filter({ hasText: `${note}-older` });
  await expect(older.getByRole('list', { name: 'Stock entries' })).toHaveText(
    olderLineOf(fixture),
  );
  const newerRow = queueRows(page).filter({ hasText: `${note}-newer` });
  const lines = newerRow.getByRole('list', { name: 'Stock entries' });
  await expect(lines.getByRole('listitem')).toHaveText([
    newerLineOf(fixture),
    `Grocy has only ${String(rest)} Pack for this Consume. The accept fails.`,
  ]);
  await expect(newerRow).toContainText('Ready');

  await newerRow.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: fixture.name });
  await pickOption(dialog, 'Stock entry', fixture.option);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  expect(await storedRow(request, newer.id)).toMatchObject({
    stockEntryId: fixture.stockEntryId,
  });
  await removeRows(request, (row) => row.note?.startsWith(note) === true);
});

// Product 5, Yoghurt, is a parent product with no own stock. Its child,
// product 6, has 3 packs at the Fridge, due 25 Nov. A Consume of the parent
// takes the stock of the child, as the accept does, so the row shows the
// pack of the child and the warning above that stock. No other test makes a
// Consume or a Transfer of product 5.
test('the stock entry lines of a Consume of a parent product show the stock of its sub-product and the warning above it', async ({
  page,
  request,
}, testInfo) => {
  const note = `review-queue-stock-entry-parent-${testInfo.project.name}`;
  await removeRows(request, (row) => {
    return (
      row.productId === 5 &&
      (row.bookingType === 'consume' || row.bookingType === 'transfer')
    );
  });
  await createRow(request, {
    amount: 4,
    bookingType: 'consume',
    locationId: 1,
    note,
    productId: 5,
  });
  await page.goto('/review-queue');

  const row = queueRows(page).filter({ hasText: note });
  const lines = row.getByRole('list', { name: 'Stock entries' });
  await expect(lines.getByRole('listitem')).toHaveText([
    /^3 Pack, all of a sealed pack in Fridge, due (25 Nov|Nov 25)$/,
    'Grocy has only 3 Pack for this Consume. The accept fails.',
  ]);
  await removeRows(request, (item) => item.note === note);
});

// An accept changes the stock, so the review queue loads the product read of
// the booked product again. The stock entry lines of the other rows of the
// product and the Inventory preview then use the new stock. The Grocy mock
// answers the consume of product 1 and keeps its stock.
test('an accept loads the product read of the booked product again', async ({
  page,
  request,
}, testInfo) => {
  const note = `review-queue-stock-entry-refresh-${testInfo.project.name}`;
  await removeRows(request, (row) => row.note?.startsWith(note) === true);
  for (const name of ['accepted', 'kept']) {
    await createRow(request, {
      amount: 1,
      bookingType: 'consume',
      locationId: 1,
      note: `${note}-${name}`,
      productId: 1,
    });
  }
  await page.goto('/review-queue');
  const kept = queueRows(page).filter({ hasText: `${note}-kept` });
  await expect(kept.getByRole('list', { name: 'Stock entries' })).toBeVisible();

  const productRead = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/v2/products/1'
    );
  });
  const accepted = queueRows(page).filter({ hasText: `${note}-accepted` });
  await accepted.getByRole('button', { name: 'Accept' }).click();

  await expect(accepted).toHaveCount(0);
  await productRead;
  await removeRows(request, (row) => row.note?.startsWith(note) === true);
});
