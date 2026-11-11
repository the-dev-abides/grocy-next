import { storedPendingScanSchema } from '@grocy-next/inventory-review-queue';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
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

// The create of a pending scan with a product reads the product from Grocy,
// so the test stores the row through the storage. Thus the queue holds a row
// that the accept can try against a Grocy that does not answer.
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
    const time = '2026-11-11T12:00:00.000Z';
    const stored = await app
      .get(DataSource)
      .getRepository(storedPendingScanSchema)
      .save({
        amount: 1,
        bookingType: 'purchase',
        code: null,
        createdAt: time,
        dueDate: null,
        error: null,
        lastLookupAt: null,
        locationId: null,
        lookupResult: null,
        note: null,
        price: null,
        priceType: 'unit',
        productBarcodeId: null,
        productGroupId: null,
        productId: 1,
        quantityUnitId: null,
        scannedAt: time,
        storeId: null,
        updatedAt: time,
        writeInName: null,
      });
    const creation = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(stored.id)}`,
    );
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

  it('answers the grocy-unavailable problem on a create with a product', async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify({ bookingType: 'purchase', productId: 1 }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      type: '/problems/grocy-unavailable',
    });
  });
});
