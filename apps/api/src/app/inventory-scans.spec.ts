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
  code: null | string;
  id: number;
  productId: null | number;
  [field: string]: unknown;
}

// The Inventory scan screen creates one pending scan per product. The create
// copies none of the amount, the unit, the price, and the store from the
// product barcode. A repeat scan of a product changes nothing on its row, as
// ADR 0010 decided.
describe('the Inventory pending scans of the Next API', () => {
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

  // Every test starts with an empty queue. Thus a repeat scan of a fixture code
  // in one test never merges into a row of another test.
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

  // The product barcode 8000500310427 has the amount 2 and the unit Pack.
  // An Inventory pending scan takes neither. The amount stays null until
  // the review queue sets it.
  it('creates an Inventory pending scan with no amount and none of the product barcode defaults', async () => {
    const response = await create({
      bookingType: 'inventory',
      code: '8000500310427',
      locationId: 2,
      productGroupId: 2,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      amount: null,
      bookingType: 'inventory',
      code: '8000500310427',
      locationId: 2,
      price: null,
      priceType: 'unit',
      productGroupId: 2,
      productId: 3,
      quantityUnitId: null,
      storeId: null,
    });
  });

  it('answers a repeat Inventory scan of a code with the open row and changes nothing', async () => {
    const first = await createAndRead({
      bookingType: 'inventory',
      code: '8000500310427',
    });

    const response = await create({
      bookingType: 'inventory',
      code: '8000500310427',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(await response.json()).toEqual(first);
    expect(await list()).toEqual([first]);
  });

  // Product 1 has two product barcodes. A scan of the second one is a scan of
  // the same product. Thus the row of the first scan is the open Inventory
  // pending scan of that product.
  it('keeps one open Inventory pending scan per product across its product barcodes', async () => {
    const first = await createAndRead({
      bookingType: 'inventory',
      code: '5449000000996',
    });

    const response = await create({
      bookingType: 'inventory',
      code: '049000006346',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(first);
    expect(await list()).toEqual([first]);
  });

  // An unknown code has no product, so the repeat rule matches on the code
  // forms, as a Purchase repeat scan does. The four-digit produce code
  // queues no lookup, so the row stays as the create stored it.
  it('answers a repeat Inventory scan of an unknown code with the open row', async () => {
    const first = await createAndRead({
      bookingType: 'inventory',
      code: '4011',
    });

    const response = await create({
      bookingType: 'inventory',
      code: '4011',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(first);
    expect(await list()).toEqual([first]);
  });

  it('does not count an open Purchase row of the product as the open Inventory pending scan', async () => {
    const purchase = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await create({
      bookingType: 'inventory',
      code: '5449000000996',
    });

    expect(response.status).toBe(201);
    const inventory = (await response.json()) as PendingScanBody;
    expect(inventory.id).not.toBe(purchase.id);
    expect(await list()).toEqual([inventory, purchase]);
  });

  // A row with no code is never a merge target, as the spec decided. A row
  // from the assistant with the product and no code stays as it is.
  it('never merges an Inventory scan into a row with no code', async () => {
    const first = await createAndRead({
      bookingType: 'inventory',
      productId: 1,
    });

    const response = await create({
      bookingType: 'inventory',
      code: '5449000000996',
    });

    expect(response.status).toBe(201);
    const second = (await response.json()) as PendingScanBody;
    expect(second.id).not.toBe(first.id);
    expect(await list()).toEqual([second, first]);
  });
});
