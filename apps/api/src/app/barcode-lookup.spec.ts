import { storedNutritionFactsSchema } from '@grocy-next/inventory-review-queue';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory. The storage module reads the variable when
// the imports load, so this block runs first. The Grocy variables and the Open
// Facts variable point at the two mocks that the Vitest global setup starts.
// The vitest configuration sets them.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
});

interface PendingScanBody {
  id: number;
  lastLookupAt: null | string;
  lookupResult: null | Record<string, unknown>;
  [field: string]: unknown;
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// The unknown fixture code, Nutella 400 g. The Open Food Facts mock holds its
// live record. The expected values below come from that record file.
const UNKNOWN_CODE = '3017620422003';
// A code that no mock record holds. The lookup is a miss.
const MISS_CODE = '4006381333931';

const MOCK_RECORD_FILE = path.join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'tools',
  'mocks',
  'open-food-facts',
  'responses',
  `product-${UNKNOWN_CODE}.json`,
);
const mockRecord = JSON.parse(readFileSync(MOCK_RECORD_FILE, 'utf8')) as {
  product: { nutriments: Record<string, unknown> };
};

const openFactsUrl = String(process.env['OPEN_FACTS_URL']);
const IMAGE_URL =
  'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg';

// The worker answers within a few hundred milliseconds. The poll stops well
// before the Vitest timeout, so a failure names the row.
const LOOKUP_TIMEOUT_MS = 15_000;
const POLL_MS = 100;

describe('the barcode lookup of a pending scan', () => {
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

  async function read(id: number): Promise<PendingScanBody> {
    const response = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(id)}`,
    );
    return (await response.json()) as PendingScanBody;
  }

  // The test reaches the worker through the HTTP boundary only: it polls the
  // row until the lookup set the fields.
  async function pollUntilLookedUp(id: number): Promise<PendingScanBody> {
    const deadline = Date.now() + LOOKUP_TIMEOUT_MS;
    let row = await read(id);
    while (row.lastLookupAt === null && Date.now() < deadline) {
      await wait(POLL_MS);
      row = await read(id);
    }
    return row;
  }

  function nutritionFacts() {
    return app.get(DataSource).getRepository(storedNutritionFactsSchema);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  // Every test starts with an empty queue and no nutrition facts. No Next API
  // operation reads the nutrition facts, so the test clears the storage.
  beforeEach(async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`);
    const { items } = (await response.json()) as { items: PendingScanBody[] };
    for (const item of items) {
      await fetch(`${baseUrl}/api/v2/pending-scans/${String(item.id)}`, {
        method: 'DELETE',
      });
    }
    await nutritionFacts().clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores the lookup result and the time of the lookup on the row of an unknown code', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: UNKNOWN_CODE,
    });
    expect(created.lookupResult).toBeNull();
    expect(created.lastLookupAt).toBeNull();

    const row = await pollUntilLookedUp(created.id);

    expect(row).toEqual({
      ...created,
      lastLookupAt: expect.stringMatching(TIMESTAMP),
      lookupResult: {
        brand: 'Ferrero, Nutella',
        imageUrl: IMAGE_URL,
        name: 'Nutella',
        netQuantity: 400,
        netQuantityUnit: 'g',
        quantityText: '400 g e',
        service: 'Open Food Facts',
        sourceUrl: `${openFactsUrl}/product/${UNKNOWN_CODE}`,
      },
      updatedAt: expect.stringMatching(TIMESTAMP),
    });
  });

  it('sets the time of the lookup and no result on a miss', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: MISS_CODE,
    });

    const row = await pollUntilLookedUp(created.id);

    expect(row).toEqual({
      ...created,
      lastLookupAt: expect.stringMatching(TIMESTAMP),
      updatedAt: expect.stringMatching(TIMESTAMP),
    });
    expect(row.lookupResult).toBeNull();
    expect(row['error']).toBeNull();
    expect(await nutritionFacts().findBy({ code: MISS_CODE })).toEqual([]);
  });

  // The worker runs the lookups in the order of the queue, one at a time. When
  // the unknown code that the test creates last is looked up, every earlier row
  // that was queued is looked up too.
  it('runs no lookup for a known code, a typed produce code, or a row with a write-in name', async () => {
    const known = await createAndRead({
      bookingType: 'purchase',
      code: '5449000000996',
    });
    const typed = await createAndRead({
      bookingType: 'purchase',
      code: '4011',
    });
    const writeIn = await createAndRead({
      bookingType: 'inventory',
      code: MISS_CODE,
      writeInName: 'Pasta',
    });
    const unknown = await createAndRead({
      bookingType: 'purchase',
      code: UNKNOWN_CODE,
    });
    await pollUntilLookedUp(unknown.id);

    for (const row of [known, typed, writeIn]) {
      expect(await read(row.id)).toEqual(row);
      expect(row.lastLookupAt).toBeNull();
      expect(row.lookupResult).toBeNull();
    }
  });

  it('writes one nutrition facts record after a hit, with the source fields and the raw nutriments object', async () => {
    const created = await createAndRead({
      bookingType: 'purchase',
      code: UNKNOWN_CODE,
    });
    await pollUntilLookedUp(created.id);

    const records = await nutritionFacts().find();

    expect(records).toEqual([
      {
        additiveTags: [],
        allergenTags: ['en:milk', 'en:nuts', 'en:soybeans'],
        analysisTags: ['en:palm-oil', 'en:maybe-vegan', 'en:vegetarian'],
        carbohydratesPer100: 57.5,
        carbohydratesPerServing: null,
        code: UNKNOWN_CODE,
        createdAt: expect.stringMatching(TIMESTAMP),
        dataBasis: '100g',
        ecoScoreGrade: 'f',
        ecoScoreScore: 12,
        energyKcalPer100: 539,
        energyKcalPerServing: null,
        energyKjPer100: 2252,
        energyKjPerServing: null,
        fatPer100: 30.9,
        fatPerServing: null,
        fetchedAt: expect.stringMatching(TIMESTAMP),
        fiberPer100: 0,
        fiberPerServing: null,
        id: expect.any(Number),
        imageSourceUrl: IMAGE_URL,
        ingredientsText: 'sugar, palm oil',
        licence: 'Open Database License (ODbL)',
        novaGroup: 3,
        nutrientLevels: {
          fat: 'high',
          salt: 'low',
          'saturated-fat': 'high',
          sugars: 'high',
        },
        nutriments: mockRecord.product.nutriments,
        nutriScoreGrade: 'e',
        productBarcodeId: null,
        productId: null,
        proteinsPer100: 6.3,
        proteinsPerServing: null,
        saltPer100: 0.107,
        saltPerServing: null,
        saturatedFatPer100: 10.6,
        saturatedFatPerServing: null,
        service: 'Open Food Facts',
        servingQuantity: null,
        servingQuantityUnit: 'g',
        servingSize: null,
        sodiumPer100: 0.0428,
        sodiumPerServing: null,
        sourceUrl: `${openFactsUrl}/product/${UNKNOWN_CODE}`,
        sugarsPer100: 56.3,
        sugarsPerServing: null,
        traceTags: [],
        updatedAt: expect.stringMatching(TIMESTAMP),
      },
    ]);
  });
});
