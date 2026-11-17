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
  [field: string]: unknown;
}

// The fields that both transfer rows of product 1 share: stock entry 11, at
// the Fridge, with 2 cans.
const TRANSFER_ROW = {
  dueDate: '2026-12-15',
  note: null,
  price: 0.85,
  purchasedDate: '2026-10-20',
  spoiled: false,
  stockEntryId: 11,
  storeId: 1,
};

// The Transfer pending scans and their accept. The create follows the Grocy
// transfer form, as ADR 0010 decided. The fixture household has 3 cans of
// product 1 at the Fridge and 500 grams of the tare weight product 7 at the
// Pantry, its default location. The Fridge is 1, the Pantry is 2, and the
// Freezer is 3.
describe('the Transfer pending scans of the Next API', () => {
  let app: INestApplication;
  let baseUrl: string;

  function create(body: object): Promise<Response> {
    return fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify({ bookingType: 'transfer', ...body }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  }

  async function createAndRead(body: object): Promise<PendingScanBody> {
    const response = await create(body);
    return (await response.json()) as PendingScanBody;
  }

  function accept(id: number): Promise<Response> {
    return fetch(`${baseUrl}/api/v2/bookings`, {
      body: JSON.stringify({ pendingScanId: id }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  }

  async function readRow(id: number): Promise<Response> {
    return fetch(`${baseUrl}/api/v2/pending-scans/${String(id)}`);
  }

  async function list(): Promise<PendingScanBody[]> {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`);
    const { items } = (await response.json()) as { items: PendingScanBody[] };
    return items;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  // Every test starts with an empty queue.
  beforeEach(async () => {
    const items = await list();
    for (const item of items) {
      await fetch(`${baseUrl}/api/v2/pending-scans/${String(item.id)}`, {
        method: 'DELETE',
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // Product 7 has stock at its default location, the Pantry. The amount is
  // one, and the empty unit means the stock unit.
  it('creates a Transfer of product 7 with no location from the Pantry', async () => {
    const response = await create({ productId: 7 });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      amount: 1,
      bookingType: 'transfer',
      locationId: 2,
      productId: 7,
      quantityUnitId: null,
      toLocationId: null,
    });
  });

  // The product barcode 8000500310427 has the amount 2 and the unit Pack.
  it('creates a Transfer with the product barcode amount and unit and the "to" location of the scan screen', async () => {
    const response = await create({ code: '8000500310427', toLocationId: 3 });

    expect(await response.json()).toMatchObject({
      amount: 2,
      locationId: 2,
      productId: 3,
      quantityUnitId: 2,
      toLocationId: 3,
    });
  });

  // The repeat rule of ADR 0010 matches the booking type, so a Transfer scan
  // does not add to an open Consume row of the same code.
  it('makes a new row for a Transfer scan of 5449000000996 while a Consume row of that code is open', async () => {
    const consume = await createAndRead({
      bookingType: 'consume',
      code: '5449000000996',
    });

    const transfer = await createAndRead({ code: '5449000000996' });

    expect(transfer.id).not.toBe(consume.id);
    expect(transfer).toMatchObject({ amount: 1, bookingType: 'transfer' });
    expect(await list()).toHaveLength(2);
  });

  it('adds one to the open Transfer row on a second Transfer scan of the same code', async () => {
    const first = await createAndRead({ code: '5449000000996' });

    const second = await createAndRead({ code: '5449000000996' });

    expect(second).toMatchObject({ amount: 2, id: first.id });
  });

  it('accepts a Transfer of product 1 from the Fridge to the Pantry and returns the transfer bookings', async () => {
    const created = await createAndRead({
      amount: 1,
      locationId: 1,
      productId: 1,
      toLocationId: 2,
    });

    const response = await accept(created.id);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'transfer',
      bookings: [
        {
          ...TRANSFER_ROW,
          amount: -1,
          id: 107,
          locationId: 1,
          transactionType: 'transfer_from',
        },
        {
          ...TRANSFER_ROW,
          amount: 1,
          id: 108,
          locationId: 2,
          transactionType: 'transfer_to',
        },
      ],
      pendingScanId: created.id,
      productId: 1,
      transactionId: '69131a2b3cf23',
    });
    const read = await readRow(created.id);
    expect(read.status).toBe(404);
  });

  it('refuses a Transfer with no "to" location with the no-to-location problem', async () => {
    const created = await createAndRead({ amount: 1, productId: 1 });

    const response = await accept(created.id);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      detail: 'A Transfer needs a "to" location. Set the "to" location first.',
      instance: '/api/v2/bookings',
      status: 409,
      title: 'The Transfer has no "to" location',
      type: '/problems/no-to-location',
    });
    const read = await readRow(created.id);
    expect(read.status).toBe(200);
  });

  // Grocy does not transfer a tare weight product. Grocy Next adds no rule,
  // so the row keeps the Grocy message.
  it('refuses a Transfer of product 7 with the Grocy message', async () => {
    const message =
      'Transferring tare weight enabled products is not yet possible';
    const created = await createAndRead({
      amount: 100,
      productId: 7,
      toLocationId: 1,
    });

    const response = await accept(created.id);

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      grocy: { message, status: 400 },
      type: '/problems/grocy-refused',
    });
    const read = await readRow(created.id);
    const row = (await read.json()) as PendingScanBody;
    expect(row.error).toBe(message);
  });

  it('describes the transfer booking type and the no-to-location problem in the OpenAPI document', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);
    const text = await response.text();
    const document = JSON.parse(text) as {
      components: {
        schemas: Record<
          string,
          { properties: Record<string, { enum?: string[] }> }
        >;
      };
    };

    expect(
      document.components.schemas['PendingScan']?.properties['bookingType']
        ?.enum,
    ).toContain('transfer');
    expect(text).toContain('The Transfer has no \\"to\\" location');
  });
});
