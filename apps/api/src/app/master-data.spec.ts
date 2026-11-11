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
  components: { schemas: Record<string, unknown> };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

const LIST_PATHS = [
  '/api/v2/locations',
  '/api/v2/stores',
  '/api/v2/product-groups',
  '/api/v2/quantity-units',
];

describe('the master data lists of the Next API', () => {
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

  // The fixture household has four locations. The Garage is inactive, so
  // the list holds the three active ones.
  it('lists the active locations through the Grocy mock', async () => {
    const response = await fetch(`${baseUrl}/api/v2/locations`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        { id: 1, name: 'Fridge' },
        { id: 2, name: 'Pantry' },
        { id: 3, name: 'Freezer' },
      ],
    });
  });

  // Grocy names the store `shopping_location`. The Next API names it store.
  it('lists the active stores through the Grocy mock', async () => {
    const response = await fetch(`${baseUrl}/api/v2/stores`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [{ id: 1, name: 'Supermarket' }],
    });
  });

  it('lists the active product groups through the Grocy mock', async () => {
    const response = await fetch(`${baseUrl}/api/v2/product-groups`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        { id: 1, name: 'Dairy' },
        { id: 2, name: 'Snacks' },
      ],
    });
  });

  // The item carries the singular name only. The plural name waits for a
  // later milestone.
  it('lists the active quantity units through the Grocy mock', async () => {
    const response = await fetch(`${baseUrl}/api/v2/quantity-units`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        { id: 1, name: 'Can' },
        { id: 2, name: 'Pack' },
      ],
    });
  });

  it('refuses an unknown query field on every list with a validation problem', async () => {
    for (const path of LIST_PATHS) {
      const response = await fetch(`${baseUrl}${path}?active=0`);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        detail: 'The body, the query, or the path fails the schema.',
        errors: [{ message: 'unknown field', path: 'active' }],
        instance: path,
        status: 400,
        title: 'The request fails the schema',
        type: '/problems/validation',
      });
    }
  });

  it('declares the four lists in the OpenAPI document with one strict schema per table', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    const document = (await response.json()) as OpenApiDocument;
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(LIST_PATHS),
    );
    const operations = LIST_PATHS.map(
      (path) => document.paths[path]?.['get']?.operationId,
    );
    expect(operations).toEqual([
      'listLocations',
      'listStores',
      'listProductGroups',
      'listQuantityUnits',
    ]);
    for (const name of ['Location', 'Store', 'ProductGroup', 'QuantityUnit']) {
      expect(document.components.schemas[name]).toMatchObject({
        additionalProperties: false,
        properties: { id: { type: 'integer' }, name: { type: 'string' } },
        required: ['id', 'name'],
      });
      expect(document.components.schemas[`${name}List`]).toMatchObject({
        additionalProperties: false,
        properties: {
          items: { items: { $ref: `#/components/schemas/${name}` } },
        },
        required: ['items'],
      });
    }
  });
});
