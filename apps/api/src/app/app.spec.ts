import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

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
    const response = await fetch(`${baseUrl}/api/health/live`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });

  it('serves the OpenAPI document of the Next API', async () => {
    const response = await fetch(`${baseUrl}/api/openapi.json`);

    expect(response.status).toBe(200);
    const document = (await response.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(document.openapi).toMatch(/^3\./);
    expect(Object.keys(document.paths)).toContain('/api/health/live');
  });
});
