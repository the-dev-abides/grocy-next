import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { request as httpRequest } from 'node:http';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory. The test writes no file. The storage
// module reads the variable when the imports load, so this block runs first.
// The Grocy variables point at the Grocy mock that the Vitest global setup
// starts. The vitest configuration sets them.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
});

interface OpenApiResponse {
  content?: Record<string, { schema: unknown }>;
}
interface OpenApiOperation {
  operationId?: string;
  responses: Record<string, OpenApiResponse>;
}
interface OpenApiDocument {
  components: { schemas: Record<string, unknown> };
  openapi: string;
  paths: Record<string, Record<string, OpenApiOperation>>;
}

interface SentResponse {
  body: string;
  contentType: null | string;
  status: number;
}

describe('the API at its HTTP boundary', () => {
  let app: INestApplication;
  let baseUrl: string;

  // `fetch` refuses a GET request with a body, so this helper sends one to
  // the product list with the Node HTTP client. The Next API has no body
  // operation yet.
  function sendWithBody(options: {
    body: string;
    contentType: string;
  }): Promise<SentResponse> {
    return new Promise((resolve, reject) => {
      const request = httpRequest(
        `${baseUrl}/api/v2/products`,
        {
          headers: {
            'content-length': Buffer.byteLength(options.body),
            'content-type': options.contentType,
          },
          method: 'GET',
        },
        (response) => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', (chunk: string) => {
            body += chunk;
          });
          response.on('end', () => {
            resolve({
              body,
              contentType: response.headers['content-type'] ?? null,
              status: response.statusCode ?? 0,
            });
          });
        },
      );
      request.on('error', reject);
      request.end(options.body);
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

  it('answers the liveness check with success while the process runs', async () => {
    const response = await fetch(`${baseUrl}/api/v2/health/live`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });

  it('answers the startup check with success when the migrations have run', async () => {
    const response = await fetch(`${baseUrl}/api/v2/health/startup`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ok',
      info: { migrations: { status: 'up' } },
    });
  });

  it('answers the readiness check with success when the database answers', async () => {
    const response = await fetch(`${baseUrl}/api/v2/health/ready`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' } },
    });
  });

  it('lists the three fixture products through the Grocy mock', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        { description: null, id: 1, name: 'Coca-Cola Original 330 ml' },
        { description: null, id: 2, name: 'Philadelphia Original 150 g' },
        { description: null, id: 3, name: 'Nutella Biscuits 304 g' },
      ],
    });
  });

  it('refuses an unknown query field with a validation problem', async () => {
    const response = await fetch(`${baseUrl}/api/v2/products?colour=red`);

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'The body, the query, or the path fails the schema.',
      errors: [{ message: 'unknown field', path: 'colour' }],
      instance: '/api/v2/products',
      status: 400,
      title: 'The request fails the schema',
      type: '/problems/validation',
    });
  });

  it('refuses a body that is not JSON with a not-json problem', async () => {
    const response = await sendWithBody({
      body: 'name=Milk',
      contentType: 'application/x-www-form-urlencoded',
    });

    expect(response.status).toBe(415);
    expect(response.contentType).toBe('application/problem+json');
    expect(JSON.parse(response.body)).toMatchObject({
      instance: '/api/v2/products',
      status: 415,
      title: 'The body is not JSON',
      type: '/problems/not-json',
    });
  });

  it('refuses a body that is broken JSON with a not-json problem', async () => {
    const response = await sendWithBody({
      body: '{"name": ',
      contentType: 'application/json',
    });

    expect(response.status).toBe(415);
    expect(response.contentType).toBe('application/problem+json');
    expect(JSON.parse(response.body)).toMatchObject({
      instance: '/api/v2/products',
      status: 415,
      type: '/problems/not-json',
    });
  });

  it('answers an unknown path with a not-found problem', async () => {
    const response = await fetch(`${baseUrl}/api/v2/nothing?x=1`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'Cannot GET /api/v2/nothing?x=1',
      instance: '/api/v2/nothing',
      status: 404,
      title: 'Not found',
      type: '/problems/not-found',
    });
  });

  it('serves the OpenAPI document with the product list and the health checks', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    expect(response.status).toBe(200);
    const document = (await response.json()) as OpenApiDocument;
    expect(document.openapi).toMatch(/^3\./);
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/api/v2/health/live',
        '/api/v2/health/startup',
        '/api/v2/health/ready',
        '/api/v2/products',
      ]),
    );
  });

  it('builds the OpenAPI schemas from the Zod schemas', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    const document = (await response.json()) as OpenApiDocument;
    expect(document.components.schemas['ProductList']).toEqual({
      additionalProperties: false,
      properties: {
        items: {
          description: 'Every product.',
          items: { $ref: '#/components/schemas/Product' },
          type: 'array',
        },
      },
      required: ['items'],
      type: 'object',
    });
    expect(document.components.schemas['Product']).toMatchObject({
      additionalProperties: false,
      required: ['description', 'id', 'name'],
    });
    expect(document.components.schemas['Problem']).toMatchObject({
      additionalProperties: false,
      required: ['detail', 'instance', 'status', 'title', 'type'],
    });
    const listProducts = document.paths['/api/v2/products']?.['get'];
    expect(listProducts?.operationId).toBe('listProducts');
    expect(listProducts?.responses['200']?.content).toEqual({
      'application/json': {
        schema: { $ref: '#/components/schemas/ProductList' },
      },
    });
  });

  // The health checks are not Next API resources. They keep the Terminus
  // body, which the readiness test below asserts.
  it('declares application/problem+json for every error response of the resources', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    const document = (await response.json()) as OpenApiDocument;
    const resourcePaths = Object.entries(document.paths).filter(
      ([path]) => !path.startsWith('/api/v2/health/'),
    );
    expect(resourcePaths.length).toBeGreaterThan(0);
    for (const [, operations] of resourcePaths) {
      for (const operation of Object.values(operations)) {
        const errorResponses = Object.entries(operation.responses).filter(
          ([status]) => Number(status) >= 400,
        );
        expect(errorResponses.length).toBeGreaterThan(0);
        for (const [, errorResponse] of errorResponses) {
          expect(Object.keys(errorResponse.content ?? {})).toEqual([
            'application/problem+json',
          ]);
          expect(errorResponse.content?.['application/problem+json']).toEqual({
            schema: { $ref: '#/components/schemas/Problem' },
          });
        }
      }
    }
  });

  // This test closes the database connection. It runs last.
  it('answers the readiness check with failure when the database connection is lost', async () => {
    await app.get(DataSource).destroy();

    const response = await fetch(`${baseUrl}/api/v2/health/ready`);

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: 'error',
      error: { database: { status: 'down' } },
    });
  });
});
