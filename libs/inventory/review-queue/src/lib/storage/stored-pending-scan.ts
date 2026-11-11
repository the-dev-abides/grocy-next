import type { ValueTransformer } from 'typeorm';

import { EntitySchema } from 'typeorm';

import type { BookingType, LookupResult, PriceType } from '../pending-scan.ts';

// One pending scan as the Grocy Next storage holds it. The shape is the
// pending scan of the Next API: a timestamp is RFC 3339 text in UTC, a due
// date is `YYYY-MM-DD` text, and the lookup result is one JSON text.
export interface StoredPendingScan {
  amount: null | number;
  bookingType: BookingType;
  code: null | string;
  createdAt: string;
  dueDate: null | string;
  error: null | string;
  id: number;
  lastLookupAt: null | string;
  locationId: null | number;
  lookupResult: LookupResult | null;
  note: null | string;
  price: null | number;
  priceType: PriceType;
  productBarcodeId: null | number;
  productGroupId: null | number;
  productId: null | number;
  quantityUnitId: null | number;
  scannedAt: string;
  storeId: null | number;
  updatedAt: string;
  writeInName: null | string;
}

// A pending scan before the storage gave it an id.
export type PendingScanToStore = Omit<StoredPendingScan, 'id'>;

// A timestamp column holds a date and time in UTC. TypeORM writes the RFC
// 3339 text as the driver wants it and reads a `Date`. The transformer gives
// the text back.
const timestamp: ValueTransformer = {
  from: (value: Date | null): null | string => value?.toISOString() ?? null,
  to: (value: null | string): null | string => value,
};

// The entity of the pending scan, with the Data Mapper pattern of ADR 0008.
// The entity is a TypeORM schema, not a decorated class, because a class
// field with a decorator has no value until the storage sets one. The
// column types are the TypeORM names that both drivers map: a `Date` column
// is `datetime` on SQLite and `timestamp` on PostgreSQL. The migration
// creates the table with the same mapping.
export const storedPendingScanSchema = new EntitySchema<StoredPendingScan>({
  columns: {
    amount: { nullable: true, type: 'float' },
    bookingType: { type: 'varchar' },
    code: { nullable: true, type: 'varchar' },
    createdAt: { transformer: timestamp, type: Date },
    dueDate: { nullable: true, type: 'date' },
    error: { nullable: true, type: 'text' },
    id: { generated: 'increment', primary: true, type: 'integer' },
    lastLookupAt: { nullable: true, transformer: timestamp, type: Date },
    locationId: { nullable: true, type: 'integer' },
    lookupResult: { nullable: true, type: 'simple-json' },
    note: { nullable: true, type: 'text' },
    price: { nullable: true, type: 'float' },
    priceType: { type: 'varchar' },
    productBarcodeId: { nullable: true, type: 'integer' },
    productGroupId: { nullable: true, type: 'integer' },
    productId: { nullable: true, type: 'integer' },
    quantityUnitId: { nullable: true, type: 'integer' },
    scannedAt: { transformer: timestamp, type: Date },
    storeId: { nullable: true, type: 'integer' },
    updatedAt: { transformer: timestamp, type: Date },
    writeInName: { nullable: true, type: 'varchar' },
  },
  name: 'StoredPendingScan',
  tableName: 'pending_scan',
});
