import { storedPendingScanSchema } from '@grocy-next/inventory-review-queue';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory. The storage module reads the variable
// when the imports load, so this block runs first. The Grocy variables
// point at the Grocy mock that the Vitest global setup starts. The vitest
// configuration sets them.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
});

interface PendingScanBody {
  error: null | string;
  id: number;
  locationId: null | number;
  updatedAt: string;
  [field: string]: unknown;
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('the update and the delete of a pending scan', () => {
  let app: INestApplication;
  let baseUrl: string;

  async function createAndRead(body: unknown): Promise<PendingScanBody> {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    return (await response.json()) as PendingScanBody;
  }

  function update(id: number, body: unknown): Promise<Response> {
    return fetch(`${baseUrl}/api/v2/pending-scans/${String(id)}`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'PATCH',
    });
  }

  async function updateAndRead(
    id: number,
    body: unknown,
  ): Promise<PendingScanBody> {
    const response = await update(id, body);
    return (await response.json()) as PendingScanBody;
  }

  async function read(id: number): Promise<PendingScanBody> {
    const response = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(id)}`,
    );
    return (await response.json()) as PendingScanBody;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  // Every test starts with an empty queue, so a create of a fixture code in
  // one test never merges into a row of another test.
  beforeEach(async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`);
    const { items } = (await response.json()) as { items: PendingScanBody[] };
    for (const item of items) {
      await fetch(`${baseUrl}/api/v2/pending-scans/${String(item.id)}`, {
        method: 'DELETE',
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('updates every writable field of a pending scan', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '4006381333931',
    });

    const response = await update(created.id, {
      amount: 3,
      code: '5449000000996',
      dueDate: '2027-02-28',
      locationId: 3,
      note: 'Three cans',
      price: 2.55,
      priceType: 'total',
      productGroupId: 2,
      productId: 1,
      quantityUnitId: 1,
      storeId: 1,
      writeInName: 'Cola',
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as PendingScanBody;
    expect(body).toEqual({
      ...created,
      amount: 3,
      code: '5449000000996',
      dueDate: '2027-02-28',
      locationId: 3,
      note: 'Three cans',
      price: 2.55,
      priceType: 'total',
      productGroupId: 2,
      productId: 1,
      quantityUnitId: 1,
      storeId: 1,
      updatedAt: expect.stringMatching(TIMESTAMP),
      writeInName: 'Cola',
    });
    expect(body.updatedAt > created.updatedAt).toBe(true);
    expect(await read(created.id)).toEqual(body);
  });

  it('keeps an absent field and clears a field set to null, as a merge patch', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
      locationId: 2,
      note: 'Six cans',
    });

    const body = await updateAndRead(created.id, { note: null, price: null });

    expect(body).toEqual({
      ...created,
      note: null,
      price: null,
      updatedAt: expect.stringMatching(TIMESTAMP),
    });
    expect(body.locationId).toBe(2);
  });

  it('refuses an update that changes the booking type with the booking-type-fixed problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await update(created.id, {
      amount: 2,
      bookingType: 'inventory',
    });

    expect(response.status).toBe(409);
    expect(response.headers.get('content-type')).toBe(
      'application/problem+json',
    );
    expect(await response.json()).toEqual({
      detail: 'The booking type of a pending scan is set at create.',
      instance: `/api/v2/pending-scans/${String(created.id)}`,
      status: 409,
      title: 'The booking type is fixed',
      type: '/problems/booking-type-fixed',
    });
    expect(await read(created.id)).toEqual(created);
  });

  it('accepts an update that repeats the booking type', async () => {
    const created = await createAndRead({
      bookingType: 'inventory',
      code: '5449000000996',
    });

    const response = await update(created.id, {
      amount: 4,
      bookingType: 'inventory',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ amount: 4 });
  });

  // No Next API operation sets the error yet. The accept of a later ticket
  // sets it. The test writes the error into the storage to set the state.
  it('clears the error on any update', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });
    await app
      .get(DataSource)
      .getRepository(storedPendingScanSchema)
      .update({ id: created.id }, { error: 'Grocy refused the purchase.' });
    expect(await read(created.id)).toMatchObject({
      error: 'Grocy refused the purchase.',
    });

    const body = await updateAndRead(created.id, {});

    expect(body.error).toBeNull();
    expect(await read(created.id)).toEqual(body);
  });

  it('refuses a read-only field in an update with a validation problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await update(created.id, { error: null, id: 7 });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [
        { message: 'unknown field', path: 'error' },
        { message: 'unknown field', path: 'id' },
      ],
      type: '/problems/validation',
    });
  });

  it('refuses an update that leaves no code and no product with a validation problem', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const response = await update(created.id, { code: null, productId: null });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [
        {
          message: 'The pending scan needs a code or a productId.',
          path: 'code',
        },
      ],
      type: '/problems/validation',
    });
    expect(await read(created.id)).toEqual(created);
  });

  it('answers an update of an unknown id with a not-found problem', async () => {
    const response = await update(999_999, { amount: 2 });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      detail: 'No pending scan has the id 999999.',
      type: '/problems/not-found',
    });
  });

  it('deletes a pending scan and answers the row as it was', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: '7622300441937',
      note: 'The row that goes',
    });

    const response = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(created.id)}`,
      { method: 'DELETE' },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(created);
    const read = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(created.id)}`,
    );
    expect(read.status).toBe(404);
  });

  it('answers a delete of an unknown id with a not-found problem', async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans/999999`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      detail: 'No pending scan has the id 999999.',
      type: '/problems/not-found',
    });
  });
});
