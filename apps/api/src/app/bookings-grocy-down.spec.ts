import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory against a Grocy address that nothing
// listens on. The Grocy address is read when the app starts, so this block
// runs first. Port 9 is the discard port, and no process listens on it on a
// test machine.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
  process.env['GROCY_URL'] = 'http://127.0.0.1:9';
});

interface PendingScanBody {
  id: number;
  [field: string]: unknown;
}

// The server creates a pending scan with a product and no code with no Grocy
// read. Thus the queue holds a row that the accept can try against a Grocy that
// does not answer.
describe('the accept when Grocy does not answer', () => {
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
    delete process.env['GROCY_URL'];
  });

  it('answers the grocy-unavailable problem and leaves the row unchanged', async () => {
    const creation = await fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify({ bookingType: 'purchase', productId: 1 }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    const created = (await creation.json()) as PendingScanBody;

    const response = await fetch(`${baseUrl}/api/v2/bookings`, {
      body: JSON.stringify({ pendingScanId: created.id }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      detail: 'Grocy did not answer.',
      instance: '/api/v2/bookings',
      status: 502,
      title: 'Grocy is unavailable',
      type: '/problems/grocy-unavailable',
    });
    const read = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(created.id)}`,
    );
    expect(await read.json()).toEqual(created);
  });
});
