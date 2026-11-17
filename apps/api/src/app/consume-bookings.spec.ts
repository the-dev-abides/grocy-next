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

// The fields of a consume row that the Grocy mock answers for every product.
// The mock writes the amount of the request as a negative number.
const CONSUME_TRANSACTION_ID = '69131a2b3cf01';
const CONSUME_ROW = {
  id: 105,
  note: null,
  storeId: 1,
  transactionType: 'consume',
};

// The consume row of product 1: the first stock entry in the consume order,
// stock entry 11 with 2 cans at the Fridge.
const PRODUCT_1_CONSUME_ROW = {
  ...CONSUME_ROW,
  amount: -1,
  dueDate: '2026-12-15',
  locationId: 1,
  price: 0.85,
  purchasedDate: '2026-10-20',
  spoiled: false,
  stockEntryId: 11,
};

// The open row of the rest of stock entry 11, in its own transaction.
const PRODUCT_1_OPEN_ROW = {
  amount: 1,
  dueDate: '2026-12-15',
  id: 106,
  locationId: 1,
  note: null,
  price: 0.85,
  purchasedDate: '2026-10-20',
  spoiled: false,
  stockEntryId: 11,
  storeId: 1,
  transactionType: 'product-opened',
};

// The accept of a Consume pending scan, with the open on consume of ADR
// 0017. The fixture household has this stock. Product 1 has 3 cans at the
// Fridge in two sealed stock entries. Product 2 has 2 packs in one sealed stock
// entry. Product 3 has 1 pack in one sealed stock entry. Product 6, the child
// of the parent product 5, has 3 packs in one sealed stock entry. The tare
// weight product 7 has 500 grams. Product 2 has the Grocy setting "cannot be
// opened".
describe('the accept of a Consume pending scan', () => {
  let app: INestApplication;
  let baseUrl: string;

  async function createAndRead(body: unknown): Promise<PendingScanBody> {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify({ bookingType: 'consume', ...(body as object) }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    return (await response.json()) as PendingScanBody;
  }

  function accept(id: number): Promise<Response> {
    return fetch(`${baseUrl}/api/v2/bookings`, {
      body: JSON.stringify({ pendingScanId: id }),
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

  afterAll(async () => {
    await app.close();
  });

  // The consume takes 1 of the 2 cans of the sealed stock entry 11, so the
  // accept opens the rest of it.
  it('accepts a Consume of 1 of product 1 at the Fridge and opens the rest of stock entry 11', async () => {
    const created = await createAndRead({
      amount: 1,
      locationId: 1,
      productId: 1,
    });

    const response = await accept(created.id);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'consume',
      bookings: [PRODUCT_1_CONSUME_ROW, PRODUCT_1_OPEN_ROW],
      pendingScanId: created.id,
      productId: 1,
      transactionId: CONSUME_TRANSACTION_ID,
    });
    expect(await readStatus(created.id)).toBe(404);
  });

  // The consume takes the whole stock entry 17, so nothing is left to open.
  it('accepts a Consume of 1 of product 3 with no open, because the consume takes the whole stock entry', async () => {
    const created = await createAndRead({ amount: 1, productId: 3 });

    const response = await accept(created.id);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'consume',
      bookings: [
        {
          ...CONSUME_ROW,
          amount: -1,
          dueDate: '2027-01-15',
          locationId: 2,
          price: 3.99,
          purchasedDate: '2026-01-10',
          spoiled: false,
          stockEntryId: 17,
        },
      ],
      pendingScanId: created.id,
      productId: 3,
      transactionId: CONSUME_TRANSACTION_ID,
    });
  });

  it('accepts a Consume of 1 of product 2 with no open, because the product cannot be opened', async () => {
    const created = await createAndRead({ amount: 1, productId: 2 });

    const response = await accept(created.id);

    expect(response.status).toBe(200);
    const booking = (await response.json()) as { bookings: unknown[] };
    expect(booking.bookings).toEqual([
      expect.objectContaining({ stockEntryId: 16, transactionType: 'consume' }),
    ]);
  });

  // A spoiled consume follows the same steps as any consume. The Grocy mock
  // echoes the spoiled flag of the request in the consume row. The open row
  // is not spoiled.
  it('accepts a spoiled Consume, and the consume booking has the spoiled flag', async () => {
    const created = await createAndRead({
      amount: 1,
      locationId: 1,
      productId: 1,
      spoiled: true,
    });

    const response = await accept(created.id);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'consume',
      bookings: [
        { ...PRODUCT_1_CONSUME_ROW, spoiled: true },
        PRODUCT_1_OPEN_ROW,
      ],
      pendingScanId: created.id,
      productId: 1,
      transactionId: CONSUME_TRANSACTION_ID,
    });
  });

  // The Grocy mock refuses the open of product 6. The consume stays booked.
  it('accepts a Consume of 1 of product 6 when the open fails, and removes the row', async () => {
    const created = await createAndRead({ amount: 1, productId: 6 });

    const response = await accept(created.id);

    expect(response.status).toBe(200);
    const booking = (await response.json()) as { bookings: unknown[] };
    expect(booking.bookings).toEqual([
      expect.objectContaining({ stockEntryId: 20, transactionType: 'consume' }),
    ]);
    expect(await readStatus(created.id)).toBe(404);
  });

  // The parent product 5 has no own stock. The Grocy mock books the consume of
  // product 5 only when the request allows the sub-product substitution. The
  // stock of its child product 6 at the Fridge passes the amount check.
  it('accepts a Consume of the parent product 5 through the sub-product substitution', async () => {
    const created = await createAndRead({ amount: 1, productId: 5 });

    const response = await accept(created.id);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      bookings: [{ stockEntryId: 20, transactionType: 'consume' }],
      productId: 5,
      transactionId: CONSUME_TRANSACTION_ID,
    });
  });

  // The amount of a tare weight product is the gross weight. The Grocy mock
  // echoes the amount of the request, so the row shows the gross weight that
  // the accept sent. 650 grams on the scale take 100 grams from the 500
  // grams in stock. A tare weight product gets no open.
  it('accepts a Consume of a gross weight of product 7 and books the gross weight with no open', async () => {
    const created = await createAndRead({ amount: 650, productId: 7 });

    const response = await accept(created.id);

    expect(response.status).toBe(200);
    const booking = (await response.json()) as { bookings: unknown[] };
    expect(booking.bookings).toEqual([
      expect.objectContaining({ amount: -650, stockEntryId: 21 }),
    ]);
  });

  // The Grocy API books less with no error, so the accept checks the stock at
  // the "from" location first and makes no Grocy call. The refusal is a
  // server rule, so the problem has no `grocy` field.
  it('refuses a Consume of 4 of product 1 at the Fridge, where the stock is 3, with the Grocy message', async () => {
    const message =
      'Amount to be consumed cannot be > current stock amount (if supplied, at the desired location)';
    const created = await createAndRead({
      amount: 4,
      locationId: 1,
      productId: 1,
    });

    const response = await accept(created.id);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      detail: message,
      instance: '/api/v2/bookings',
      status: 422,
      title: 'The amount is above the stock',
      type: '/problems/above-stock',
    });
    const row = await readRow(created.id);
    expect(row.error).toBe(message);
  });

  // The row names stock entry 14, the open can at the Pantry. The consume
  // takes that stock entry only. It is open, so no open follows.
  it('accepts a Consume of a stock entry and names the stock entry in the Grocy consume', async () => {
    const created = await createAndRead({
      amount: 1,
      locationId: 2,
      productId: 1,
      stockEntryId: '69131a2b3c84c',
    });

    const response = await accept(created.id);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'consume',
      bookings: [
        {
          ...CONSUME_ROW,
          amount: -1,
          dueDate: '2027-02-01',
          id: 109,
          locationId: 2,
          price: 0.85,
          purchasedDate: '2026-11-05',
          spoiled: false,
          stockEntryId: 14,
        },
      ],
      pendingScanId: created.id,
      productId: 1,
      transactionId: '69131a2b3cf34',
    });
  });

  // The Pantry has 3 cans of product 1, but stock entry 14 has 1 can. The
  // amount check uses the stock entry, as the Grocy consume form does.
  it('refuses a Consume above the amount of the stock entry of the row', async () => {
    const created = await createAndRead({
      amount: 2,
      locationId: 2,
      productId: 1,
      stockEntryId: '69131a2b3c84c',
    });

    const response = await accept(created.id);

    expect(response.status).toBe(422);
    const row = await readRow(created.id);
    expect(row.error).toBe(
      'Amount to be consumed cannot be > current stock amount (if supplied, at the desired location)',
    );
  });

  it('describes the bookings of the open in the OpenAPI document', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);
    const document = (await response.json()) as {
      components: {
        schemas: Record<
          string,
          { properties: Record<string, { description?: string }> }
        >;
      };
    };
    const { properties } = document.components.schemas['Booking'] ?? {
      properties: {},
    };
    expect(properties['bookings']?.description).toContain('open');
    expect(properties['bookings']?.description).toContain('product-opened');
    expect(properties['transactionId']?.description).toContain(
      'transaction of the consume',
    );
  });
});
