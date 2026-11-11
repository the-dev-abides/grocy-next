import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory. The storage module reads the variable
// when the imports load, so this block runs first. The Grocy variables
// point at the Grocy mock that the Vitest global setup starts. The vitest
// configuration sets them.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
});

interface PendingScanBody {
  error: null | string;
  id: number;
  updatedAt: string;
  [field: string]: unknown;
}

// The stock log row that the Grocy mock returns for an inventory that adds
// stock. It is an increase of 3 on the product of the path. It has the due
// date, the location, the price, the store, and the note of the request. Grocy
// writes no stock entry id on added stock.
const MOCK_INCREASE_ROW = {
  amount: 3,
  id: 102,
  purchasedDate: '2026-11-10',
  stockEntryId: null,
  transactionType: 'inventory-correction',
};
const MOCK_INCREASE_TRANSACTION_ID = '69131a2b3c508';

// The accept of an Inventory pending scan: the creation of a booking, as ADR
// 0010 decided. The amount is the new own stock in the stock unit, or the
// gross weight for a tare weight product. The fixture household has 6 cans
// of product 1, 1 pack of product 3, and 500 grams of the tare weight
// product 7 in stock.
describe('the accept of an Inventory pending scan', () => {
  let app: INestApplication;
  let baseUrl: string;

  async function createAndRead(body: unknown): Promise<PendingScanBody> {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    return (await response.json()) as PendingScanBody;
  }

  function accept(body: unknown): Promise<Response> {
    return fetch(`${baseUrl}/api/v2/bookings`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  }

  async function readStatus(id: number): Promise<number> {
    const response = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(id)}`,
    );
    return response.status;
  }

  async function readRow(id: number): Promise<PendingScanBody> {
    const response = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(id)}`,
    );
    return (await response.json()) as PendingScanBody;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  // Every test starts with an empty queue, so one product has at most one
  // open Inventory pending scan across the tests.
  beforeEach(async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`);
    const { items } = (await response.json()) as { items: PendingScanBody[] };
    for (const item of items) {
      await fetch(`${baseUrl}/api/v2/pending-scans/${String(item.id)}`, {
        method: 'DELETE',
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // A count above the stock adds stock. The accept sends the new amount with
  // the due date, the location, the price, the store, and the note of the
  // row. The Grocy mock answers these values in the row, so the booking shows
  // what the accept sent.
  it('accepts an increase with the fields of the added stock and deletes the row', async () => {
    const created = await createAndRead({
      amount: 4,
      bookingType: 'inventory',
      dueDate: '2027-03-01',
      locationId: 2,
      note: 'Counted at the shelf',
      price: 3.5,
      productId: 3,
      storeId: 1,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'inventory',
      bookings: [
        {
          ...MOCK_INCREASE_ROW,
          dueDate: '2027-03-01',
          locationId: 2,
          note: 'Counted at the shelf',
          price: 3.5,
          storeId: 1,
        },
      ],
      pendingScanId: created.id,
      productId: 3,
      transactionId: MOCK_INCREASE_TRANSACTION_ID,
    });
    expect(await readStatus(created.id)).toBe(404);
  });

  // A count below the stock consumes the difference in the Grocy order. The
  // Grocy mock answers two stock log rows with negative amounts for product
  // 1, one per stock entry that the decrease took from. Each row carries the
  // stock entry id, so the booking shows which stock entries went.
  it('accepts a decrease with one row per stock entry and deletes the row', async () => {
    const created = await createAndRead({
      amount: 3,
      bookingType: 'inventory',
      productId: 1,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'inventory',
      bookings: [
        {
          amount: -2,
          dueDate: '2026-12-15',
          id: 103,
          locationId: 1,
          note: null,
          price: 0.85,
          purchasedDate: '2026-10-20',
          stockEntryId: 11,
          storeId: 1,
          transactionType: 'inventory-correction',
        },
        {
          amount: -1,
          dueDate: '2027-01-01',
          id: 104,
          locationId: 1,
          note: null,
          price: 0.85,
          purchasedDate: '2026-11-01',
          stockEntryId: 12,
          storeId: 1,
          transactionType: 'inventory-correction',
        },
      ],
      pendingScanId: created.id,
      productId: 1,
      transactionId: '69131a2b3c72a',
    });
    expect(await readStatus(created.id)).toBe(404);
  });

  // The Grocy mock refuses an inventory whose new amount equals the stock,
  // as Grocy does. A success here shows that the accept called no Grocy.
  it('removes a row with a count equal to the stock as no change and calls no Grocy', async () => {
    const created = await createAndRead({
      amount: 6,
      bookingType: 'inventory',
      productId: 1,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'inventory',
      bookings: [],
      pendingScanId: created.id,
      productId: 1,
      transactionId: null,
    });
    expect(await readStatus(created.id)).toBe(404);
  });

  // The count of a tare weight product is the gross weight on the scale,
  // container included. The Rice jar, product 7, has 500 grams in stock and
  // the tare weight 250, so the gross weight 750 is no change. The Grocy
  // mock refuses an inventory of 750 on product 7, as Grocy does, so a
  // success here shows that the accept called no Grocy.
  it('removes a row with a gross weight equal to the stock plus the tare weight of a tare weight product as no change', async () => {
    const created = await createAndRead({
      amount: 750,
      bookingType: 'inventory',
      productId: 7,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'inventory',
      bookings: [],
      pendingScanId: created.id,
      productId: 7,
      transactionId: null,
    });
    expect(await readStatus(created.id)).toBe(404);
  });

  // A gross weight equal to the own stock of a tare weight product is a
  // change: the jar then holds 250 grams less than before. The accept sends
  // it to Grocy, and the Grocy mock answers the fixed increase row.
  it('books a gross weight equal to the own stock of a tare weight product', async () => {
    const created = await createAndRead({
      amount: 500,
      bookingType: 'inventory',
      productId: 7,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      bookings: [{ transactionType: 'inventory-correction' }],
      productId: 7,
      transactionId: MOCK_INCREASE_TRANSACTION_ID,
    });
    expect(await readStatus(created.id)).toBe(404);
  });

  // An Inventory pending scan arrives with no amount, and the review queue
  // sets it. The accept with no amount is refused, and the row stays as it
  // was.
  it('refuses an Inventory with no amount with the no-amount problem', async () => {
    const created = await createAndRead({
      bookingType: 'inventory',
      productId: 1,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(409);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'An Inventory needs the new amount of the product.',
      instance: '/api/v2/bookings',
      status: 409,
      title: 'The pending scan has no amount',
      type: '/problems/no-amount',
    });
    expect(await readRow(created.id)).toEqual(created);
  });

  // Grocy refuses added stock into the inactive location 4 with no due date,
  // as on a purchase. The row stays, and its error is the Grocy message.
  it('keeps the row with the Grocy message as its error after a Grocy 400', async () => {
    const created = await createAndRead({
      amount: 4,
      bookingType: 'inventory',
      locationId: 4,
      productId: 3,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      detail: 'Location does not exist',
      grocy: { message: 'Location does not exist', status: 400 },
      instance: '/api/v2/bookings',
      status: 422,
      title: 'Grocy refused the change',
      type: '/problems/grocy-refused',
    });
    const row = await readRow(created.id);
    expect(row).toEqual({
      ...created,
      error: 'Location does not exist',
      updatedAt: expect.any(String),
    });
    expect(row.updatedAt > created.updatedAt).toBe(true);
  });

  it('refuses a product id that names nothing in Grocy with the unknown-id problem', async () => {
    const created = await createAndRead({
      amount: 4,
      bookingType: 'inventory',
      productId: 999,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      detail: 'No product has the id 999.',
      type: '/problems/unknown-id',
    });
  });
});
