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

interface BookingBody {
  bookings: Record<string, unknown>[];
  [field: string]: unknown;
}

interface OpenApiOperation {
  operationId?: string;
  responses: Record<string, { content?: Record<string, { schema: unknown }> }>;
}
interface OpenApiDocument {
  components: {
    schemas: Record<
      string,
      { properties?: Record<string, unknown>; required?: string[] }
    >;
  };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

// The stock log row that the Grocy mock returns for a purchase. It has the
// product of the path and the amount and the price of the request. The other
// fields have fixed values. Grocy writes no stock entry id on a purchase.
const MOCK_PURCHASE_ROW = {
  dueDate: '2027-01-01',
  id: 101,
  locationId: 1,
  note: null,
  purchasedDate: '2026-11-10',
  stockEntryId: null,
  storeId: null,
  transactionType: 'purchase',
};
const MOCK_TRANSACTION_ID = '69131a2b3c4e6';

// The accept of a Purchase pending scan: the creation of a booking, as ADR 0010
// decided. The fixture household has the conversion 1 Box = 6 Packs on product
// 3. It has no conversion from the Pack to the Can on product 1.
describe('the accept of a Purchase pending scan', () => {
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

  // Every test starts with an empty queue, so a create of a fixture code in
  // one test never merges into a row of another test.
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

  // The scan of the can carries the product barcode defaults: one can in the
  // stock unit and the last price 0.85 as a unit price. The accept sends
  // amount 1 and price 0.85 per can, and the row goes.
  it('accepts a Purchase in the stock unit and deletes the row', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bookingType: 'purchase',
      bookings: [{ ...MOCK_PURCHASE_ROW, amount: 1, price: 0.85 }],
      pendingScanId: created.id,
      productId: 1,
      transactionId: MOCK_TRANSACTION_ID,
    });
    expect(await readStatus(created.id)).toBe(404);
  });

  // The product barcode 8000500310427 has the amount 2 packs and the last
  // price 7.98, so each scan adds two packs at 3.99 per pack. After the
  // repeat scan the row holds four packs, and the accept books each pack at
  // 3.99.
  it('books the unit price of the product barcode on a merged Purchase row', async () => {
    const first = await createAndRead({
      bookingType: 'purchase',
      code: '8000500310427',
    });
    await createAndRead({ bookingType: 'purchase', code: '8000500310427' });

    const response = await accept({ pendingScanId: first.id });

    expect(response.status).toBe(200);
    const booking = (await response.json()) as BookingBody;
    expect(booking.bookings).toEqual([
      { ...MOCK_PURCHASE_ROW, amount: 4, price: 3.99 },
    ]);
  });

  it('converts the amount with the resolved conversion and divides a unit price by the factor', async () => {
    const created = await createAndRead({
      amount: 1,
      bookingType: 'purchase',
      price: 3,
      priceType: 'unit',
      productId: 3,
      quantityUnitId: 3,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(200);
    const booking = (await response.json()) as BookingBody;
    expect(booking['productId']).toBe(3);
    expect(booking.bookings).toEqual([
      { ...MOCK_PURCHASE_ROW, amount: 6, price: 0.5 },
    ]);
  });

  it('divides a total price by the stock amount', async () => {
    const created = await createAndRead({
      amount: 2,
      bookingType: 'purchase',
      price: 3,
      priceType: 'total',
      productId: 3,
      quantityUnitId: 3,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(200);
    const booking = (await response.json()) as BookingBody;
    expect(booking.bookings).toEqual([
      { ...MOCK_PURCHASE_ROW, amount: 12, price: 0.25 },
    ]);
  });

  // The Grocy mock refuses a purchase into the inactive location 4 only when
  // the request has no due date, as Grocy does. A due date on the row makes
  // the same purchase pass, so the accept sends the due date.
  it('sends the due date when the row has one', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      dueDate: '2027-02-28',
      locationId: 4,
      productId: 1,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(200);
    expect(await readStatus(created.id)).toBe(404);
  });

  it('refuses a row with no product with the no-product problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '4006381333931',
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(409);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'The pending scan has no product. Set a product first.',
      instance: '/api/v2/bookings',
      status: 409,
      title: 'The pending scan has no product',
      type: '/problems/no-product',
    });
    expect(await readStatus(created.id)).toBe(200);
  });

  it('refuses a Purchase with an amount of zero with the no-amount problem', async () => {
    const created = await createAndRead({
      amount: 0,
      bookingType: 'purchase',
      productId: 1,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      status: 409,
      title: 'The pending scan has no amount',
      type: '/problems/no-amount',
    });
  });

  // Product 1 has no conversion from the Pack to the Can. A server rule
  // refuses the accept, so the row keeps no error.
  it('refuses a unit with no path to the stock unit with the no-conversion problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
      quantityUnitId: 2,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      detail:
        'The product has no conversion from the quantity unit 2 to the stock unit 1.',
      instance: '/api/v2/bookings',
      status: 422,
      title: 'The product has no conversion to the stock unit',
      type: '/problems/no-conversion',
    });
    expect(await readRow(created.id)).toEqual(created);
  });

  it('refuses a product id that names nothing in Grocy with the unknown-id problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      productId: 999,
    });

    const response = await accept({ pendingScanId: created.id });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      detail: 'No product has the id 999.',
      instance: '/api/v2/bookings',
      status: 422,
      title: 'An id names nothing in Grocy',
      type: '/problems/unknown-id',
    });
  });

  // Grocy refuses a purchase into the inactive location 4 with no due date.
  // The row stays, and its error is the Grocy message.
  it('keeps the row with the Grocy message as its error after a Grocy 400', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      locationId: 4,
      productId: 1,
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

  it('answers a pending scan id that names nothing with a not-found problem', async () => {
    const response = await accept({ pendingScanId: 999 });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      detail: 'No pending scan has the id 999.',
      type: '/problems/not-found',
    });
  });

  it('refuses a body with no pending scan id and an unknown field with a validation problem', async () => {
    const response = await accept({ id: 1 });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: expect.arrayContaining([
        { message: 'unknown field', path: 'id' },
        expect.objectContaining({ path: 'pendingScanId' }),
      ]),
      type: '/problems/validation',
    });
  });

  it('declares the booking in the OpenAPI document', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    const document = (await response.json()) as OpenApiDocument;
    const create = document.paths['/api/v2/bookings']?.['post'];
    expect(create?.operationId).toBe('createBooking');
    expect(create?.responses['200']?.content).toEqual({
      'application/json': { schema: { $ref: '#/components/schemas/Booking' } },
    });
    expect(Object.keys(create?.responses ?? {})).toEqual([
      '200',
      '400',
      '404',
      '409',
      '415',
      '422',
      '502',
    ]);
    expect(document.components.schemas['Booking']).toMatchObject({
      additionalProperties: false,
      required: [
        'bookings',
        'bookingType',
        'pendingScanId',
        'productId',
        'transactionId',
      ],
    });
    expect(document.components.schemas['StockLogRow']).toMatchObject({
      additionalProperties: false,
      required: [
        'amount',
        'dueDate',
        'id',
        'locationId',
        'note',
        'price',
        'purchasedDate',
        'stockEntryId',
        'storeId',
        'transactionType',
      ],
    });
    expect(document.components.schemas['Problem']?.properties).toHaveProperty(
      'grocy',
    );
  });
});
