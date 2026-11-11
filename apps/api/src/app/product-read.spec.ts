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

// The product read gives the scan screens and the review queue the facts of
// one product at display time. In this ticket the product carries the
// fields of the list and the own stock in the stock unit. A later ticket
// widens it.
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

  // The fixture household has six cans of product 1 in the Fridge.
  it('reads one product with its stock amount through the Grocy mock', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products/1`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      description: null,
      id: 1,
      name: 'Coca-Cola Original 330 ml',
      stockAmount: 6,
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
      required: ['description', 'id', 'name', 'stockAmount'],
    });
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
