import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory. The storage module reads the variable
// when the imports load, so this block runs first. The Grocy variables and
// the Open Facts variable point at the two mocks that the Vitest global
// setup starts. The vitest configuration sets them.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
});

interface PendingScanBody {
  code: null | string;
  id: number;
  productBarcodeId: null | number;
  productId: null | number;
  quantityUnitId: null | number;
  [field: string]: unknown;
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// A code that no product barcode of the fixture household has and that no
// Open Food Facts mock record holds.
const NEW_CODE = '4006381333931';
// The id that the Grocy mock answers for a new product barcode.
const NEW_PRODUCT_BARCODE_ID = 5;
// The code that the Grocy mock refuses as a product barcode, with the error
// of a code that another product already has.
const TAKEN_CODE = '5000112637922';

describe('the update of a pending scan that sets a product', () => {
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

  // The row carries a write-in name, so the lookup worker does not take it.
  // Product 2 has no product barcode with the code, so the update adds one
  // in Grocy. The default location of product 2 is the Fridge, location 1.
  it('adds the code to the product in Grocy, clears the write-in name and the unit, and sets the default location', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: NEW_CODE,
      quantityUnitId: 2,
      writeInName: 'Pasta',
    });
    expect(created.productId).toBeNull();

    const response = await update(created.id, { productId: 2 });

    expect(response.status).toBe(200);
    const body = (await response.json()) as PendingScanBody;
    expect(body).toEqual({
      ...created,
      locationId: 1,
      productBarcodeId: NEW_PRODUCT_BARCODE_ID,
      productId: 2,
      quantityUnitId: null,
      updatedAt: expect.stringMatching(TIMESTAMP),
      writeInName: null,
    });
    expect(await read(created.id)).toEqual(body);
  });

  // The create resolves the code to product 1 and the body sets product 2.
  // The update then changes the product to product 1, which has the code in
  // its 13-digit form, so the update adds no second product barcode.
  it('adds no second product barcode when the product has the code', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '049000006346',
      productId: 2,
      quantityUnitId: 2,
    });

    const body = await updateAndRead(created.id, { productId: 1 });

    expect(body).toEqual({
      ...created,
      locationId: 1,
      productBarcodeId: null,
      productId: 1,
      quantityUnitId: null,
      updatedAt: expect.stringMatching(TIMESTAMP),
    });
  });

  it('keeps the location of the row when the row has one', async () => {
    const created = await createAndRead({
      bookingType: 'inventory',
      code: NEW_CODE,
      locationId: 3,
      writeInName: 'Pasta',
    });

    const body = await updateAndRead(created.id, { productId: 3 });

    expect(body).toMatchObject({ locationId: 3, productId: 3 });
  });

  it('refuses the update with the grocy-refused problem when Grocy refuses the product barcode, and keeps the row', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: TAKEN_CODE,
      writeInName: 'Zero',
    });

    const response = await update(created.id, { productId: 2 });

    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'UNIQUE constraint failed: product_barcodes.barcode',
      grocy: {
        message: 'UNIQUE constraint failed: product_barcodes.barcode',
        status: 400,
      },
      instance: `/api/v2/pending-scans/${String(created.id)}`,
      status: 422,
      title: 'Grocy refused the change',
      type: '/problems/grocy-refused',
    });
    expect(await read(created.id)).toEqual(created);
  });

  it('refuses a product id that names nothing in Grocy with the unknown-id problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: NEW_CODE,
      writeInName: 'Pasta',
    });

    const response = await update(created.id, { productId: 999 });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      detail: 'No product has the id 999.',
      type: '/problems/unknown-id',
    });
    expect(await read(created.id)).toEqual(created);
  });

  // An update that repeats the product of the row writes nothing to Grocy
  // and keeps the write-in name and the unit.
  it('treats an update that repeats the product as a plain update', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '8000500310427',
      quantityUnitId: 2,
    });
    expect(created.productId).toBe(3);

    const body = await updateAndRead(created.id, { amount: 4, productId: 3 });

    expect(body).toEqual({
      ...created,
      amount: 4,
      updatedAt: expect.stringMatching(TIMESTAMP),
    });
    expect(body.quantityUnitId).toBe(2);
  });
});
