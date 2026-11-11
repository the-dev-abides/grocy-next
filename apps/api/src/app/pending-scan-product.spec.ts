import {
  storedNutritionFactsSchema,
  storedPendingScanSchema,
} from '@grocy-next/inventory-review-queue';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { setTimeout as wait } from 'node:timers/promises';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory. The storage module reads the variable
// when the imports load, so this block runs first. The Grocy variables and
// the Open Facts variable point at the two mocks that the Vitest global
// setup starts. The vitest configuration sets them.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
});

interface OpenApiOperation {
  responses: Record<string, { description: string }>;
}
interface OpenApiDocument {
  paths: Record<string, Record<string, OpenApiOperation>>;
}

interface PendingScanBody {
  code: null | string;
  id: number;
  lastLookupAt: null | string;
  lookupResult: null | { imageUrl: null | string; [field: string]: unknown };
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
// The unknown fixture code, Nutella 400 g. The Open Food Facts mock holds its
// record, so the lookup worker stores a lookup result and one nutrition facts
// record for it.
const UNKNOWN_CODE = '3017620422003';

// The worker answers within a few hundred milliseconds. The poll stops well
// before the Vitest timeout, so a failure names the row.
const LOOKUP_TIMEOUT_MS = 15_000;
const POLL_MS = 100;

// The Open Food Facts mock serves the front image of the unknown code at the
// first path and answers 500 at the second. The record of the code names the
// real image host, so the tests point the image URL of the row at the mock.
const openFactsUrl = String(process.env['OPEN_FACTS_URL']);
const MOCK_IMAGE_URL = `${openFactsUrl}/images/products/301/762/042/2003/front_en.879.400.jpg`;
const FAILING_IMAGE_URL = `${openFactsUrl}/images/products/301/762/042/2003/front_en.failing.400.jpg`;

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

  // The test reaches the worker through the HTTP boundary only: it polls the
  // row until the lookup set the fields.
  async function pollUntilLookedUp(id: number): Promise<PendingScanBody> {
    const deadline = Date.now() + LOOKUP_TIMEOUT_MS;
    let row = await read(id);
    while (row.lastLookupAt === null && Date.now() < deadline) {
      await wait(POLL_MS);
      row = await read(id);
    }
    return row;
  }

  function nutritionFacts() {
    return app.get(DataSource).getRepository(storedNutritionFactsSchema);
  }

  // The lookup result of the row names the real image host. The test writes the
  // image URL of the mock into the stored lookup result. Thus the picture
  // download reaches the mock, and no test reaches the network.
  async function lookUpWithImage(imageUrl: string): Promise<PendingScanBody> {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: UNKNOWN_CODE,
    });
    const row = await pollUntilLookedUp(created.id);
    await app
      .get(DataSource)
      .getRepository(storedPendingScanSchema)
      .update(
        { id: row.id },
        { lookupResult: { ...row.lookupResult!, imageUrl } },
      );
    return read(row.id);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  // Every test starts with an empty queue and no nutrition facts. Thus a create
  // of a fixture code in one test never merges into a row of another test. No
  // Next API operation reads the nutrition facts, so the test clears the
  // storage.
  beforeEach(async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`);
    const { items } = (await response.json()) as { items: PendingScanBody[] };
    for (const item of items) {
      await fetch(`${baseUrl}/api/v2/pending-scans/${String(item.id)}`, {
        method: 'DELETE',
      });
    }
    await nutritionFacts().clear();
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

  // Product 8 is inactive in the Grocy mock. Grocy refuses the read of an
  // inactive product as it refuses an unknown id.
  it.each([
    { productId: 999, reason: 'names nothing in Grocy' },
    { productId: 8, reason: 'names an inactive product' },
  ])(
    'refuses a product id that $reason with the unknown-id problem',
    async ({ productId }) => {
      const created = await createAndRead({
        bookingType: 'purchase',
        code: NEW_CODE,
        writeInName: 'Pasta',
      });

      const response = await update(created.id, { productId });

      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({
        detail: `No product has the id ${String(productId)}.`,
        type: '/problems/unknown-id',
      });
      expect(await read(created.id)).toEqual(created);
    },
  );

  // The product of the row became inactive in Grocy after the create. The
  // test writes the product id into the stored row, because the create
  // refuses an inactive product. An update that repeats that product id is
  // refused too.
  it('refuses an update that repeats the product id of an inactive product', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      productId: 3,
    });
    await app
      .get(DataSource)
      .getRepository(storedPendingScanSchema)
      .update({ id: created.id }, { productId: 8 });
    const stored = await read(created.id);

    const response = await update(created.id, { amount: 4, productId: 8 });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      detail: 'No product has the id 8.',
      type: '/problems/unknown-id',
    });
    expect(await read(created.id)).toEqual(stored);
  });

  // No fixture product has a picture. Thus the update downloads the front image
  // from the mock and uploads it to Grocy as a product picture. Then it sets
  // the picture name on the product. The Grocy mock answers both writes with
  // 204 and holds no state, so the response carries the row only.
  it('sets the lookup picture on a product with no picture and answers the row', async () => {
    const row = await lookUpWithImage(MOCK_IMAGE_URL);
    expect(row.lookupResult?.imageUrl).toBe(MOCK_IMAGE_URL);

    const response = await update(row.id, { productId: 2 });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ...row,
      locationId: 1,
      productBarcodeId: NEW_PRODUCT_BARCODE_ID,
      productId: 2,
      updatedAt: expect.stringMatching(TIMESTAMP),
    });
  });

  // A failed image download is logged and does not fail the update.
  it('answers the row when the image download fails', async () => {
    const row = await lookUpWithImage(FAILING_IMAGE_URL);

    const response = await update(row.id, { productId: 3 });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      productBarcodeId: NEW_PRODUCT_BARCODE_ID,
      productId: 3,
    });
  });

  // No Next API operation reads the nutrition facts, so the test reads the
  // record from the storage.
  it('links the nutrition facts record of the code to the product and the new product barcode', async () => {
    const created = await lookUpWithImage(MOCK_IMAGE_URL);
    expect(await nutritionFacts().findBy({ code: UNKNOWN_CODE })).toMatchObject(
      [{ productBarcodeId: null, productId: null }],
    );

    const body = await updateAndRead(created.id, { productId: 2 });

    expect(body).toMatchObject({
      productBarcodeId: NEW_PRODUCT_BARCODE_ID,
      productId: 2,
    });
    expect(await nutritionFacts().findBy({ code: UNKNOWN_CODE })).toMatchObject(
      [{ productBarcodeId: NEW_PRODUCT_BARCODE_ID, productId: 2 }],
    );
  });

  // The update that sets a product can fail with the problems of the Grocy
  // writes, so the operation declares them.
  it('declares the problems of the Grocy writes on the update in the OpenAPI document', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    const document = (await response.json()) as OpenApiDocument;
    const update = document.paths['/api/v2/pending-scans/{id}']?.['patch'];
    expect(Object.keys(update?.responses ?? {})).toEqual([
      '200',
      '400',
      '404',
      '409',
      '415',
      '422',
      '502',
    ]);
    expect(update?.responses['422']?.description).toBe(
      'An id names nothing in Grocy\n\nGrocy refused the change',
    );
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
