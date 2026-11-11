import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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

describe('the API at its HTTP boundary', () => {
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
    expect(await response.json()).toEqual([
      { description: null, id: 1, name: 'Coca-Cola Original 330 ml' },
      { description: null, id: 2, name: 'Philadelphia Original 150 g' },
      { description: null, id: 3, name: 'Nutella Biscuits 304 g' },
    ]);
  });

  it('serves the OpenAPI document with the product list and the health checks', async () => {
    const response = await fetch(`${baseUrl}/api/v2/openapi.json`);

    expect(response.status).toBe(200);
    const document = (await response.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
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
