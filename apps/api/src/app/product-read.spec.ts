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

interface OpenApiOperation {
  operationId?: string;
  responses: Record<string, { content?: Record<string, { schema: unknown }> }>;
}
interface OpenApiDocument {
  components: { schemas: Record<string, { required?: string[] }> };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

// The stock entries of product 1 in the Grocy consume order, as the Grocy mock
// answers them. The Fridge is the default consume location of the product, so
// its two stock entries come first. Then comes the open stock entry in the
// Pantry. Then come the two closed Pantry stock entries, by due date and then
// by purchase date.
const PRODUCT_1_STOCK_ENTRIES = [
  {
    amount: 2,
    dueDate: '2026-12-15',
    id: 11,
    locationId: 1,
    open: false,
    purchasedDate: '2026-10-20',
  },
  {
    amount: 1,
    dueDate: '2027-01-01',
    id: 12,
    locationId: 1,
    open: false,
    purchasedDate: '2026-11-01',
  },
  {
    amount: 1,
    dueDate: '2027-02-01',
    id: 14,
    locationId: 2,
    open: true,
    purchasedDate: '2026-11-05',
  },
  {
    amount: 1,
    dueDate: '2026-12-01',
    id: 13,
    locationId: 2,
    open: false,
    purchasedDate: '2026-10-01',
  },
  {
    amount: 1,
    dueDate: '2026-12-01',
    id: 15,
    locationId: 2,
    open: false,
    purchasedDate: '2026-10-25',
  },
];

// The product read gives the scan screens and the review queue the facts of one
// product at display time. The product carries the fields of the list and the
// fields that the short product form sets. It also carries the own stock in the
// stock unit, the picture flag, the parent flag, and the tare weight. It also
// carries the stock entries in the Grocy consume order and the resolved
// conversions.
describe('the product read of the Next API', () => {
  let app: INestApplication;
  let baseUrl: string;

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

  // The fixture household has six cans of product 1 in five stock entries. The
  // Can, unit 1, is its stock unit and its purchase unit. No fixture product
  // has a picture. Product 1 is no parent product and has no tare weight
  // handling, so the tare weight is null.
  it('reads one product with its form fields, its stock, its stock entries in the Grocy order, and its conversions through the Grocy mock', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/1`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      conversions: [{ factor: 1, fromQuantityUnitId: 1, toQuantityUnitId: 1 }],
      defaultDueDays: 0,
      description: null,
      hasPicture: false,
      id: 1,
      isParent: false,
      locationId: 1,
      minStockAmount: 0,
      name: 'Coca-Cola Original 330 ml',
      productGroupId: null,
      purchaseToStockFactor: 1,
      purchaseUnitId: 1,
      stockAmount: 6,
      stockEntries: PRODUCT_1_STOCK_ENTRIES,
      stockUnitId: 1,
      tareWeight: null,
    });
  });

  // Product 3 has the conversion 1 Box = 6 Packs, so Grocy resolves four
  // conversions: each unit to itself and the pair in both directions.
  it('reads the resolved conversions of a product', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/3`);

    expect(await response.json()).toMatchObject({
      conversions: [
        { factor: 1, fromQuantityUnitId: 2, toQuantityUnitId: 2 },
        { factor: 6, fromQuantityUnitId: 3, toQuantityUnitId: 2 },
        { factor: 1 / 6, fromQuantityUnitId: 2, toQuantityUnitId: 3 },
        { factor: 1, fromQuantityUnitId: 3, toQuantityUnitId: 3 },
      ],
      stockEntries: [
        {
          amount: 1,
          dueDate: '2027-01-15',
          id: 17,
          locationId: 2,
          open: false,
          purchasedDate: '2026-01-10',
        },
      ],
    });
  });

  // Product 5 is the parent product Yoghurt. Its stock amount is its own
  // stock only, and the three packs of its child do not count. It has no
  // own stock entry.
  it('reads the parent flag and the own stock of a parent product', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/5`);

    expect(await response.json()).toMatchObject({
      id: 5,
      isParent: true,
      name: 'Yoghurt',
      stockAmount: 0,
      stockEntries: [],
      tareWeight: null,
    });
  });

  // Product 7 is the Rice jar with tare weight handling on. The tare weight
  // is a number only when the handling is on.
  it('reads the tare weight of a tare weight product', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/7`);

    expect(await response.json()).toMatchObject({
      id: 7,
      isParent: false,
      name: 'Rice jar',
      stockAmount: 500,
      stockUnitId: 4,
      tareWeight: 250,
    });
  });

  // Product 3 is in the Pantry, location 2, in the product group Snacks, 2,
  // with the Pack, unit 2, as both units.
  it('reads the product group and the units of a product', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/3`);

    expect(await response.json()).toMatchObject({
      locationId: 2,
      productGroupId: 2,
      purchaseUnitId: 2,
      stockUnitId: 2,
    });
  });

  it('reads the stock amount of each product', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/3`);

    expect(await response.json()).toMatchObject({
      id: 3,
      name: 'Nutella Biscuits 304 g',
      stockAmount: 1,
    });
  });

  // Grocy answers an unknown id and an inactive product with the same
  // refusal. The Next API answers both with the not-found problem.
  it('answers a read of an unknown id with a not-found problem', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/999`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'No product has the id 999.',
      instance: '/api/v2/products/999',
      status: 404,
      title: 'Not found',
      type: '/problems/not-found',
    });
  });

  it('refuses a path id that is not a number with a validation problem', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/latest`);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [{ path: 'id' }],
      instance: '/api/v2/products/latest',
      type: '/problems/validation',
    });
  });

  it('refuses an unknown query field with a validation problem', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/1?stock=all`);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [{ message: 'unknown field', path: 'stock' }],
      type: '/problems/validation',
    });
  });

  // The product is the resource of the read. The list carries a shorter
  // item, as the spec decided.
  it('declares the product read and the list item in the OpenAPI document', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    const document = (await response.json()) as OpenApiDocument;
    const read = document.paths['/api/v2/products/{id}']?.['get'];
    expect(read?.operationId).toBe('getProduct');
    expect(read?.responses['200']?.content).toEqual({
      'application/json': { schema: { $ref: '#/components/schemas/Product' } },
    });
    expect(Object.keys(read?.responses ?? {})).toEqual([
      '200',
      '400',
      '404',
      '502',
    ]);
    expect(document.components.schemas['Product']).toMatchObject({
      additionalProperties: false,
      required: [
        'description',
        'id',
        'name',
        'conversions',
        'defaultDueDays',
        'hasPicture',
        'isParent',
        'locationId',
        'minStockAmount',
        'productGroupId',
        'purchaseToStockFactor',
        'purchaseUnitId',
        'stockAmount',
        'stockEntries',
        'stockUnitId',
        'tareWeight',
      ],
    });
    expect(document.components.schemas['StockEntry']).toMatchObject({
      additionalProperties: false,
      required: [
        'amount',
        'dueDate',
        'id',
        'locationId',
        'open',
        'purchasedDate',
      ],
    });
    expect(document.components.schemas['QuantityUnitConversion']).toMatchObject(
      {
        additionalProperties: false,
        required: ['factor', 'fromQuantityUnitId', 'toQuantityUnitId'],
      },
    );
    expect(document.components.schemas['ProductListItem']).toMatchObject({
      additionalProperties: false,
      required: ['description', 'id', 'name'],
    });
    expect(document.components.schemas['ProductList']).toMatchObject({
      properties: {
        items: { items: { $ref: '#/components/schemas/ProductListItem' } },
      },
    });
  });
});
