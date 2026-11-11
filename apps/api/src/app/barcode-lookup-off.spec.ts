import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { setTimeout as wait } from 'node:timers/promises';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory with the lookup off. The lookup options are
// read when the app starts, so this block runs first. The mocks of the Vitest
// global setup stay in place, so a lookup that runs by mistake reaches the mock
// and not the real service.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
  process.env['BARCODE_LOOKUP'] = 'off';
});

interface PendingScanBody {
  id: number;
  lastLookupAt: null | string;
  lookupResult: null | Record<string, unknown>;
}

// The worker of the lookup-on tests answers within a few hundred milliseconds.
// This wait is long enough to see a lookup that runs.
const WAIT_MS = 1500;

describe('the barcode lookup with BARCODE_LOOKUP off', () => {
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
    delete process.env['BARCODE_LOOKUP'];
  });

  it('queues no lookup for an unknown code', async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify({ bookingType: 'purchase', code: '3017620422003' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    const created = (await response.json()) as PendingScanBody;

    await wait(WAIT_MS);

    const read = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(created.id)}`,
    );
    expect(await read.json()).toEqual(created);
    expect(created.lastLookupAt).toBeNull();
    expect(created.lookupResult).toBeNull();
  });
});
