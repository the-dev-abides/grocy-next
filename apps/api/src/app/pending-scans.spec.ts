import { storedPendingScanSchema } from '@grocy-next/inventory-review-queue';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
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
  locationId: null | number;
  scannedAt: string;
  updatedAt: string;
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

  function update(id: number, body: unknown): Promise<Response> {
    return fetch(`${baseUrl}/api/v2/pending-scans/${String(id)}`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    });
  }

  async function updateAndRead(
    id: number,
    body: unknown,
  ): Promise<PendingScanBody> {
    const response = await update(id, body);
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
      priceType: 'total',
      productId: 1,
      quantityUnitId: 1,
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

  it('updates every writable field of a pending scan', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '4006381333931',
    });

    const response = await update(created.id, {
      amount: 3,
      code: '5449000000996',
      dueDate: '2027-02-28',
      locationId: 3,
      note: 'Three cans',
      price: 2.55,
      priceType: 'total',
      productGroupId: 2,
      productId: 1,
      quantityUnitId: 1,
      storeId: 1,
      writeInName: 'Cola',
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as PendingScanBody;
    expect(body).toEqual({
      ...created,
      amount: 3,
      code: '5449000000996',
      dueDate: '2027-02-28',
      locationId: 3,
      note: 'Three cans',
      price: 2.55,
      priceType: 'total',
      productGroupId: 2,
      productId: 1,
      quantityUnitId: 1,
      storeId: 1,
      updatedAt: expect.stringMatching(TIMESTAMP),
      writeInName: 'Cola',
    });
    expect(body.updatedAt > created.updatedAt).toBe(true);
    expect(await read(created.id)).toEqual(body);
  });

  it('keeps an absent field and clears a field set to null, as a merge patch', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
      locationId: 2,
      note: 'Six cans',
    });

    const body = await updateAndRead(created.id, { note: null, price: null });

    expect(body).toEqual({
      ...created,
      note: null,
      price: null,
      updatedAt: expect.stringMatching(TIMESTAMP),
    });
    expect(body.locationId).toBe(2);
  });

  it('refuses an update that changes the booking type with the booking-type-fixed problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await update(created.id, {
      amount: 2,
      bookingType: 'inventory',
    });

    expect(response.status).toBe(409);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'The booking type of a pending scan is set at create.',
      instance: `/api/v2/pending-scans/${String(created.id)}`,
      status: 409,
      title: 'The booking type is fixed',
      type: '/problems/booking-type-fixed',
    });
    expect(await read(created.id)).toEqual(created);
  });

  it('accepts an update that repeats the booking type', async () => {
    const created = await createAndRead({
      bookingType: 'inventory',
      code: '5449000000996',
    });

    const response = await update(created.id, {
      amount: 4,
      bookingType: 'inventory',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ amount: 4 });
  });

  // No Next API operation sets the error yet. The accept of a later ticket
  // sets it. The test writes the error into the storage to set the state.
  it('clears the error on any update', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });
    await app
      .get(DataSource)
      .getRepository(storedPendingScanSchema)
      .update({ id: created.id }, { error: 'Grocy refused the purchase.' });
    expect(await read(created.id)).toMatchObject({
      error: 'Grocy refused the purchase.',
    });

    const body = await updateAndRead(created.id, {});

    expect(body.error).toBeNull();
    expect(await read(created.id)).toEqual(body);
  });

  it('refuses a read-only field in an update with a validation problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await update(created.id, { error: null, id: 7 });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [
        { message: 'unknown field', path: 'error' },
        { message: 'unknown field', path: 'id' },
      ],
      type: '/problems/validation',
    });
  });

  it('refuses an update that leaves no code and no product with a validation problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await update(created.id, { code: null, productId: null });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [
        {
          message: 'The pending scan needs a code or a productId.',
          path: 'code',
        },
      ],
      type: '/problems/validation',
    });
    expect(await read(created.id)).toEqual(created);
  });

  it('answers an update of an unknown id with a not-found problem', async () => {
    const response = await update(999_999, { amount: 2 });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      detail: 'No pending scan has the id 999999.',
      type: '/problems/not-found',
    });
  });

  it('deletes a pending scan and answers the row as it was', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '7622300441937',
      note: 'The row that goes',
    });

    const response = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(created.id)}`,
      { method: 'DELETE' },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(created);
    const read = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(created.id)}`,
    );
    expect(read.status).toBe(404);
  });

  it('answers a delete of an unknown id with a not-found problem', async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans/999999`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      detail: 'No pending scan has the id 999999.',
      type: '/problems/not-found',
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
