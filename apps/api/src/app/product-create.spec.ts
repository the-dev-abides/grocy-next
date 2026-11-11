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
  requestBody?: { content: Record<string, { schema: unknown }> };
  responses: Record<string, { content?: Record<string, { schema: unknown }> }>;
}
interface OpenApiDocument {
  components: { schemas: Record<string, { required?: string[] }> };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

// The id that the Grocy mock answers for a new product.
const NEW_PRODUCT_ID = 4;
// The name of product 1. The Grocy mock refuses a product create with it, as
// Grocy refuses a name that another product has.
const TAKEN_NAME = 'Coca-Cola Original 330 ml';

// The four required fields of a create, with the Fridge, location 1, and
// the Pack, unit 2, as both units.
const MINIMAL_BODY = {
  locationId: 1,
  name: 'Milk 1 l',
  purchaseUnitId: 2,
  stockUnitId: 2,
};

// The product create of the short product form. The server creates the product
// in Grocy. When the purchase unit differs from the stock unit, the Grocy
// trigger creates a conversion row, and the server sets the factor on it. The
// server answers the product as Grocy stores it. The Grocy mock holds no
// state. Thus the details of the new product come from an Imposter store that
// the create and the conversion row update fill. The mock does not capture the
// description and the product group, so the details answer null for both. A new
// product has no stock entry. Its resolved conversions in the mock hold the one
// row from the purchase unit to the stock unit.
describe('the product create of the Next API', () => {
  let app: INestApplication;
  let baseUrl: string;

  function create(body: unknown): Promise<Response> {
    return fetch(`${baseUrl}/api/v2/products`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
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

  // The Pantry is location 2, the Pack is unit 2, and the Box is unit 3. The
  // Grocy trigger creates the conversion row from the Box to the Pack with
  // factor 1. The create sets the factor of the form on that row.
  it('creates a product with the factor on the conversion row from the purchase unit to the stock unit', async () => {
    const response = await create({
      defaultDueDays: 180,
      locationId: 2,
      minStockAmount: 1,
      name: 'Nutella 400 g',
      purchaseToStockFactor: 4.5,
      purchaseUnitId: 3,
      stockUnitId: 2,
    });

    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(
      `/api/v2/products/${String(NEW_PRODUCT_ID)}`,
    );
    expect(await response.json()).toEqual({
      conversions: [
        { factor: 4.5, fromQuantityUnitId: 3, toQuantityUnitId: 2 },
      ],
      defaultDueDays: 180,
      description: null,
      hasPicture: false,
      id: NEW_PRODUCT_ID,
      isParent: false,
      locationId: 2,
      minStockAmount: 1,
      name: 'Nutella 400 g',
      productGroupId: null,
      purchaseToStockFactor: 4.5,
      purchaseUnitId: 3,
      stockAmount: 0,
      stockEntries: [],
      stockUnitId: 2,
      tareWeight: null,
    });
  });

  // The Grocy trigger creates no conversion row when the purchase unit is
  // the stock unit, so the create sets no factor. The mock sets the factor of
  // its store to 1 on every create, so a factor from the test above does not
  // reach this response.
  it('creates a product with one unit as the stock unit and the purchase unit, and no factor', async () => {
    const response = await create(MINIMAL_BODY);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      conversions: [{ factor: 1, fromQuantityUnitId: 2, toQuantityUnitId: 2 }],
      defaultDueDays: 0,
      description: null,
      hasPicture: false,
      id: NEW_PRODUCT_ID,
      isParent: false,
      locationId: 1,
      minStockAmount: 0,
      name: 'Milk 1 l',
      productGroupId: null,
      purchaseToStockFactor: 1,
      purchaseUnitId: 2,
      stockAmount: 0,
      stockEntries: [],
      stockUnitId: 2,
      tareWeight: null,
    });
  });

  // The create of ADR 0010 touches no pending scan. The screen sets the new
  // product on the row with a second call. The row carries a write-in name,
  // so the lookup worker does not take it.
  it('changes no pending scan', async () => {
    const created = await fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify({
        bookingType: 'purchase',
        code: '4006381333931',
        writeInName: 'Milk 1 l',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    const row = (await created.json()) as { id: number };

    await create(MINIMAL_BODY);

    const response = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(row.id)}`,
    );
    expect(await response.json()).toMatchObject({
      productId: null,
      writeInName: 'Milk 1 l',
    });
  });

  // Grocy does not check that the ids of a product create name a row. Thus the
  // server checks them against the active rows of the master data tables. The
  // Garage, location 4, is the one inactive row.
  it.each([
    {
      change: { locationId: 9 },
      detail: 'No location has the id 9.',
      field: 'location',
    },
    {
      change: { locationId: 4 },
      detail: 'No location has the id 4.',
      field: 'inactive location',
    },
    {
      change: { productGroupId: 9 },
      detail: 'No product group has the id 9.',
      field: 'product group',
    },
    {
      change: { stockUnitId: 9 },
      detail: 'No quantity unit has the id 9.',
      field: 'stock unit',
    },
    {
      change: { purchaseUnitId: 9 },
      detail: 'No quantity unit has the id 9.',
      field: 'purchase unit',
    },
  ])(
    'refuses an unknown $field with the unknown-id problem',
    async ({ change, detail }) => {
      const response = await create({ ...MINIMAL_BODY, ...change });

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        detail,
        instance: '/api/v2/products',
        status: 422,
        title: 'An id names nothing in Grocy',
        type: '/problems/unknown-id',
      });
    },
  );

  it('refuses a name that Grocy refuses with the grocy-refused problem', async () => {
    const response = await create({ ...MINIMAL_BODY, name: TAKEN_NAME });

    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'UNIQUE constraint failed: products.name',
      grocy: {
        message: 'UNIQUE constraint failed: products.name',
        status: 400,
      },
      instance: '/api/v2/products',
      status: 422,
      title: 'Grocy refused the change',
      type: '/problems/grocy-refused',
    });
  });

  it('refuses a body with no name, a factor of zero, and an unknown field with a validation problem', async () => {
    const response = await create({
      colour: 'red',
      locationId: 1,
      purchaseToStockFactor: 0,
      purchaseUnitId: 3,
      stockUnitId: 2,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [
        { path: 'name' },
        { path: 'purchaseToStockFactor' },
        { message: 'unknown field', path: 'colour' },
      ],
      instance: '/api/v2/products',
      type: '/problems/validation',
    });
  });

  it('declares the product create and its body in the OpenAPI document', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    const document = (await response.json()) as OpenApiDocument;
    const create = document.paths['/api/v2/products']?.['post'];
    expect(create?.operationId).toBe('createProduct');
    expect(create?.requestBody?.content).toEqual({
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateProduct' },
      },
    });
    expect(create?.responses['201']?.content).toEqual({
      'application/json': { schema: { $ref: '#/components/schemas/Product' } },
    });
    expect(Object.keys(create?.responses ?? {})).toEqual([
      '201',
      '400',
      '415',
      '422',
      '502',
    ]);
    expect(document.components.schemas['CreateProduct']).toMatchObject({
      additionalProperties: false,
      required: ['locationId', 'name', 'purchaseUnitId', 'stockUnitId'],
    });
  });

  // A product whose purchase unit is the stock unit has no conversion row,
  // so a factor other than 1 has no place to go.
  it('refuses a factor other than 1 when the purchase unit is the stock unit', async () => {
    const response = await create({
      ...MINIMAL_BODY,
      purchaseToStockFactor: 6,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [
        {
          message: 'must be 1 when the purchase unit is the stock unit',
          path: 'purchaseToStockFactor',
        },
      ],
      type: '/problems/validation',
    });
  });
});
