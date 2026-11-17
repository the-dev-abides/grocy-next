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
  locationId: null | number;
  productId: null | number;
  quantityUnitId: null | number;
  [field: string]: unknown;
}

// The Consume scans of the Consume and Transfer scan screen. The create
// follows the Grocy consume form, as ADR 0010 decided. The Grocy mock has the
// default consume amount 1 and the quick consume amount setting off.
describe('the Consume pending scans of the Next API', () => {
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

  // Product 1 has the Fridge as its default consume location. Its product
  // barcode 5449000000996 has no amount and the unit Piece, which is also the
  // consume unit of product 1. The amount is the Grocy default consume amount.
  it('creates a Consume of a code with the default consume amount, the consume unit, and the default consume location', async () => {
    const response = await create({
      bookingType: 'consume',
      code: '5449000000996',
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      amount: 1,
      bookingType: 'consume',
      locationId: 1,
      productId: 1,
      quantityUnitId: 1,
      spoiled: false,
      stockEntryId: null,
      toLocationId: null,
    });
  });

  // The product barcode 8000500310427 has the amount 2 and the unit Pack.
  // Product 3 has no default consume location, so the "from" location is its
  // default location, the Pantry.
  it('creates a Consume with the product barcode amount and unit', async () => {
    const response = await create({
      bookingType: 'consume',
      code: '8000500310427',
    });
    expect(await response.json()).toMatchObject({
      amount: 2,
      locationId: 2,
      productId: 3,
      quantityUnitId: 2,
    });
  });

  it('keeps the "from" location of the scan screen', async () => {
    const response = await create({
      bookingType: 'consume',
      code: '5449000000996',
      locationId: 2,
    });
    expect(await response.json()).toMatchObject({ locationId: 2 });
  });

  // The stock entry Grocycode names stock entry 14 of product 1: 1 can, open,
  // at the Pantry. The Grocy consume form then sets the "from" location to
  // the location of the stock entry and the amount to its amount. Grocy
  // stores that amount in the stock unit, so the row takes the stock unit,
  // the Can. The location of the stock entry wins over the "from" location of the scan
  // screen, because the accept can take the stock entry at its location only.
  it('creates a Consume of a stock entry Grocycode with the product, the stock entry, and its location and amount', async () => {
    const response = await create({
      bookingType: 'consume',
      code: 'grcy:p:1:69131a2b3c84c',
      locationId: 1,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      amount: 1,
      locationId: 2,
      productId: 1,
      quantityUnitId: 1,
      stockEntryId: '69131a2b3c84c',
    });
  });

  // A Transfer of a stock entry Grocycode takes the "from" location of the
  // stock entry, as the Grocy transfer form does. The amount stays the
  // Transfer default.
  it('creates a Transfer of a stock entry Grocycode with the location of the stock entry', async () => {
    const response = await create({
      bookingType: 'transfer',
      code: 'grcy:p:1:69131a2b3c95d',
    });
    expect(await response.json()).toMatchObject({
      amount: 1,
      locationId: 2,
      productId: 1,
      stockEntryId: '69131a2b3c95d',
    });
  });

  // A product Grocycode with no fourth part names no stock entry.
  it('creates a Consume of a product Grocycode with no stock entry', async () => {
    const response = await create({
      bookingType: 'consume',
      code: 'grcy:p:1',
    });
    expect(await response.json()).toMatchObject({
      locationId: 1,
      productId: 1,
      stockEntryId: null,
    });
  });

  // An unknown code has no product, so it has no default location. The
  // amount is the Grocy default consume amount.
  it('creates a Consume of an unknown code with the default consume amount and no location', async () => {
    const response = await create({
      bookingType: 'consume',
      code: '4000000000000',
    });
    expect(await response.json()).toMatchObject({
      amount: 1,
      locationId: null,
      productId: null,
    });
  });

  it('adds a second Consume scan of a code to the open Consume row', async () => {
    const first = await createAndRead({
      bookingType: 'consume',
      code: '5449000000996',
    });
    const second = await create({
      bookingType: 'consume',
      code: '5449000000996',
    });
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ amount: 2, id: first.id });
    expect(await list()).toHaveLength(1);
  });

  // Stock entry 69131a2b3c619 of product 1 holds 2 cans at the Fridge. A
  // new Consume row of its Grocycode gets the amount 2, so the merge adds 2,
  // not the Purchase default of 1.
  it('adds the amount of a new Consume row of the stock entry Grocycode to the open row', async () => {
    const code = 'grcy:p:1:69131a2b3c619';
    const first = await createAndRead({ bookingType: 'consume', code });
    expect(first.amount).toBe(2);

    const second = await createAndRead({ bookingType: 'consume', code });

    expect(second).toMatchObject({ amount: 4, id: first.id });
  });

  it('makes a new Consume row when the "from" location of the scan is not the location of the open row', async () => {
    const code = '5449000000996';
    await create({ bookingType: 'consume', code, locationId: 1 });

    const second = await create({
      bookingType: 'consume',
      code,
      locationId: 2,
    });

    expect(second.status).toBe(201);
    expect(await list()).toHaveLength(2);
  });

  it('makes a new Consume row when the stock entry of the scan is not the stock entry of the open row', async () => {
    const code = '5449000000996';
    await create({ bookingType: 'consume', code });

    const second = await create({
      bookingType: 'consume',
      code,
      stockEntryId: '69131a2b3c619',
    });

    expect(second.status).toBe(201);
    expect(await list()).toHaveLength(2);
  });

  it('does not merge a Consume scan into a spoiled row, and does not merge a spoiled scan', async () => {
    const code = '5449000000996';
    await create({ bookingType: 'consume', code, spoiled: true });

    const plain = await create({ bookingType: 'consume', code });
    const spoiled = await create({
      bookingType: 'consume',
      code,
      spoiled: true,
    });

    expect(plain.status).toBe(201);
    expect(spoiled.status).toBe(201);
    expect(await list()).toHaveLength(3);
  });

  it('does not merge a Consume scan into a Purchase row of the same code', async () => {
    await create({ bookingType: 'purchase', code: '5449000000996' });
    const consume = await create({
      bookingType: 'consume',
      code: '5449000000996',
    });
    expect(consume.status).toBe(201);
    expect(await list()).toHaveLength(2);
  });

  // Every response has every field, as ADR 0014 decided. A Purchase row has
  // the three new fields too.
  it('gives a Purchase row the three new fields', async () => {
    const response = await create({
      bookingType: 'purchase',
      code: '5449000000996',
    });
    expect(await response.json()).toMatchObject({
      spoiled: false,
      stockEntryId: null,
      toLocationId: null,
    });
  });

  it('describes the consume booking type and the three new fields in the OpenAPI document', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);
    const document = (await response.json()) as {
      components: {
        schemas: Record<
          string,
          { properties: Record<string, { enum?: string[] }> }
        >;
      };
    };
    const { properties } = document.components.schemas['PendingScan'] ?? {
      properties: {},
    };
    expect(properties['bookingType']?.enum).toContain('consume');
    expect(Object.keys(properties)).toEqual(
      expect.arrayContaining(['spoiled', 'stockEntryId', 'toLocationId']),
    );
  });
});
