import { PendingScansService } from '@grocy-next/inventory-review-queue';
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
  amount: null | number;
  id: number;
  scannedAt: string;
  [field: string]: unknown;
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Every field of the pending scan resource, with the values of a row that
// no product barcode matched. A test spreads the fields that differ.
const UNSET_FIELDS = {
  amount: null,
  bookingType: 'purchase',
  code: null,
  createdAt: expect.stringMatching(TIMESTAMP),
  dueDate: null,
  error: null,
  id: expect.any(Number),
  lastLookupAt: null,
  locationId: null,
  lookupResult: null,
  note: null,
  price: null,
  priceType: 'unit',
  productBarcodeId: null,
  productGroupId: null,
  productId: null,
  quantityUnitId: null,
  scannedAt: expect.stringMatching(TIMESTAMP),
  storeId: null,
  updatedAt: expect.stringMatching(TIMESTAMP),
  writeInName: null,
};

describe('the pending scans of the Next API', () => {
  let app: INestApplication;
  let baseUrl: string;

  function create(body: unknown): Promise<Response> {
    return fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  }

  async function createAndRead(body: unknown): Promise<PendingScanBody> {
    const response = await create(body);
    return (await response.json()) as PendingScanBody;
  }

  async function read(id: number): Promise<PendingScanBody> {
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

  // Every test starts with an empty queue. Thus a repeat scan of a fixture code
  // in one test never merges into a row of another test.
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

  it('creates a pending scan from a known code with the product and the product barcode defaults', async () => {
    const response = await create({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as PendingScanBody;
    expect(response.headers.get('location')).toBe(
      `/api/v2/pending-scans/${String(body.id)}`,
    );
    expect(body).toEqual({
      ...UNSET_FIELDS,
      amount: 1,
      code: '5449000000996',
      price: 0.85,
      priceType: 'unit',
      productId: 1,
      quantityUnitId: 1,
    });
  });

  // The last price of a product barcode is the price of one product barcode
  // amount. The product barcode 8000500310427 has the amount 2 packs and the
  // last price 7.98, so the unit price is 3.99 per pack.
  it('stores the last price of a product barcode with an amount as a unit price', async () => {
    const response = await create({
      bookingType: 'purchase',
      code: '8000500310427',
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      amount: 2,
      price: 3.99,
      priceType: 'unit',
      quantityUnitId: 2,
    });
  });

  it('creates a pending scan from an unknown code with the bare code and an amount of one', async () => {
    const response = await create({
      bookingType: 'purchase',
      code: '4006381333931',
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ...UNSET_FIELDS,
      amount: 1,
      code: '4006381333931',
    });
  });

  it('creates a pending scan from a product Grocycode with the product and no barcode defaults', async () => {
    const response = await create({
      bookingType: 'purchase',
      code: 'grcy:p:2',
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ...UNSET_FIELDS,
      amount: 1,
      code: 'grcy:p:2',
      productId: 2,
    });
  });

  it('treats a Grocycode of another type as an unknown code', async () => {
    const response = await create({
      bookingType: 'purchase',
      code: 'grcy:c:1',
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      code: 'grcy:c:1',
      productId: null,
    });
  });

  it('matches a 12-digit code against its 13-digit product barcode and stores the code as typed', async () => {
    const response = await create({
      bookingType: 'purchase',
      code: '049000006346',
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      code: '049000006346',
      productId: 1,
      quantityUnitId: 1,
    });
  });

  it('matches a code with case ignored', async () => {
    const response = await create({
      bookingType: 'purchase',
      code: 'GRCY:P:3',
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      code: 'GRCY:P:3',
      productId: 3,
    });
  });

  it('keeps the values of the body over the product barcode defaults', async () => {
    const response = await create({
      amount: 6,
      bookingType: 'purchase',
      code: '5449000000996',
      dueDate: '2027-01-31',
      locationId: 2,
      note: 'Six cans',
      price: 4.5,
      priceType: 'unit',
      productGroupId: 1,
      storeId: 1,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ...UNSET_FIELDS,
      amount: 6,
      code: '5449000000996',
      dueDate: '2027-01-31',
      locationId: 2,
      note: 'Six cans',
      price: 4.5,
      priceType: 'unit',
      productGroupId: 1,
      productId: 1,
      quantityUnitId: 1,
      storeId: 1,
    });
  });

  it('copies no amount, unit, price, or store onto an Inventory pending scan', async () => {
    const response = await create({
      bookingType: 'inventory',
      code: '5449000000996',
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ...UNSET_FIELDS,
      bookingType: 'inventory',
      code: '5449000000996',
      productId: 1,
    });
  });

  it('creates a pending scan from a product with no code', async () => {
    const response = await create({
      bookingType: 'purchase',
      productId: 3,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      ...UNSET_FIELDS,
      amount: 1,
      productId: 3,
    });
  });

  it('adds a repeat scan of a code to the open Purchase row and answers it with 200', async () => {
    const first = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await create({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    const body = (await response.json()) as PendingScanBody;
    expect(body).toEqual({
      ...first,
      amount: 2,
      scannedAt: expect.stringMatching(TIMESTAMP),
      updatedAt: expect.stringMatching(TIMESTAMP),
    });
    expect(body.scannedAt > first.scannedAt).toBe(true);
    const list = await fetch(`${baseUrl}/api/v2/pending-scans`);
    const { items } = (await list.json()) as { items: PendingScanBody[] };
    expect(items).toEqual([body]);
  });

  it('moves the merged row to the top of the list', async () => {
    const first = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });
    const second = await createAndRead({
      bookingType: 'purchase',
      code: '7622300441937',
    });

    await create({ bookingType: 'purchase', code: '5449000000996' });

    const list = await fetch(`${baseUrl}/api/v2/pending-scans`);
    const { items } = (await list.json()) as { items: PendingScanBody[] };
    expect(items.map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it('adds the product barcode amount on a repeat scan when the product barcode has one', async () => {
    const first = await createAndRead({
      bookingType: 'purchase',
      code: '8000500310427',
    });
    expect(first.amount).toBe(2);

    const body = await createAndRead({
      bookingType: 'purchase',
      code: '8000500310427',
    });

    expect(body.id).toBe(first.id);
    expect(body.amount).toBe(4);
    expect(body).toMatchObject({ price: 3.99, priceType: 'unit' });
  });

  it('merges the two forms of a 12-digit code as one code', async () => {
    const first = await createAndRead({
      bookingType: 'purchase',
      code: '049000006346',
    });

    const response = await create({
      bookingType: 'purchase',
      code: '0049000006346',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      amount: 2,
      code: '049000006346',
      id: first.id,
    });
  });

  it('does not merge a repeat scan into a row of the other booking type', async () => {
    const first = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await create({
      bookingType: 'inventory',
      code: '5449000000996',
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as PendingScanBody;
    expect(body.id).not.toBe(first.id);
    expect(await read(first.id)).toEqual(first);
  });

  it('never merges into a row with no code', async () => {
    const first = await createAndRead({
      bookingType: 'purchase',
      productId: 3,
    });

    const sameProduct = await create({ bookingType: 'purchase', productId: 3 });
    const sameCode = await create({
      bookingType: 'purchase',
      code: '8000500310427',
    });

    expect(sameProduct.status).toBe(201);
    expect(sameCode.status).toBe(201);
    const list = await fetch(`${baseUrl}/api/v2/pending-scans`);
    const { items } = (await list.json()) as { items: PendingScanBody[] };
    expect(items).toHaveLength(3);
    expect(await read(first.id)).toEqual(first);
  });

  // The MCP tool of a later spec creates with no merge. No HTTP operation
  // reaches that path, so the test calls the service.
  it('never merges a create with no merge', async () => {
    const service = app.get(PendingScansService);
    const body = { bookingType: 'purchase', code: '5449000000996' } as const;

    const first = await service.create(body, 'no merge');
    const second = await service.create(body, 'no merge');
    const third = await service.create(body, 'merge');

    expect(first.isMerged).toBe(false);
    expect(second.isMerged).toBe(false);
    expect(second.pendingScan.id).not.toBe(first.pendingScan.id);
    expect(third.isMerged).toBe(true);
    expect(third.pendingScan.id).toBe(second.pendingScan.id);
    expect(third.pendingScan.amount).toBe(2);
  });

  it('refuses a body with no code and no product with a validation problem', async () => {
    const response = await create({ bookingType: 'purchase' });

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'The body, the query, or the path fails the schema.',
      errors: [
        { message: 'The body needs a code or a productId.', path: 'code' },
      ],
      instance: '/api/v2/pending-scans',
      status: 400,
      title: 'The request fails the schema',
      type: '/problems/validation',
    });
  });

  it('refuses an unknown body field with a validation problem', async () => {
    const response = await create({
      bookingType: 'purchase',
      code: '5449000000996',
      colour: 'red',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [{ message: 'unknown field', path: 'colour' }],
      type: '/problems/validation',
    });
  });

  it('lists every pending scan in the items envelope, most recent first', async () => {
    const first = await createAndRead({
      bookingType: 'purchase',
      code: '7622300441937',
    });
    const second = await createAndRead({
      bookingType: 'inventory',
      code: '8000500310427',
    });

    const response = await fetch(`${baseUrl}/api/v2/pending-scans`);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: PendingScanBody[] };
    expect(Object.keys(body)).toEqual(['items']);
    const ids = body.items.map((item) => item.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
    const times = body.items.map((item) => item.scannedAt);
    const isMostRecentFirst = times.every(
      (time, position) => position === 0 || times[position - 1]! >= time,
    );
    expect(isMostRecentFirst).toBe(true);
    expect(body.items.find((item) => item.id === second.id)).toEqual(second);
  });

  it('reads one pending scan by its id', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(created.id)}`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(created);
  });

  it('answers a read of an unknown id with a not-found problem', async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans/999999`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'No pending scan has the id 999999.',
      instance: '/api/v2/pending-scans/999999',
      status: 404,
      title: 'Not found',
      type: '/problems/not-found',
    });
  });

  it('refuses a path id that is not a number with a validation problem', async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans/latest`);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [{ path: 'id' }],
      type: '/problems/validation',
    });
  });

  it('declares the pending scan operations in the OpenAPI document', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    const document = (await response.json()) as {
      components: { schemas: Record<string, { required?: string[] }> };
      paths: Record<string, Record<string, { operationId: string }>>;
    };
    const operationIds: string[] = [];
    for (const [path, methods] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        operationIds.push(`${method} ${path} ${operation.operationId}`);
      }
    }
    expect(operationIds).toEqual(
      expect.arrayContaining([
        'post /api/v2/pending-scans createPendingScan',
        'get /api/v2/pending-scans listPendingScans',
        'get /api/v2/pending-scans/{id} getPendingScan',
        'patch /api/v2/pending-scans/{id} updatePendingScan',
        'delete /api/v2/pending-scans/{id} deletePendingScan',
      ]),
    );
    expect(document.components.schemas['PendingScan']?.required).toEqual(
      Object.keys(UNSET_FIELDS),
    );
  });
});
