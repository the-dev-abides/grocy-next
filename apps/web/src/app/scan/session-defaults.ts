import type {
  CreatePendingScan,
  Location,
  PendingScan,
  ProductGroup,
  Store,
} from '../api/next-api';
import type { DueRule } from './due-rule';

import { dueDateOf, dueRuleText } from './due-rule';
import { nameOf } from './scan-text';

// The session defaults of a scan screen, as ADR 0010 decided: the location,
// the store, the product group, and the due date rule. The screen holds
// them in memory and copies them into each create call. The server knows
// no session.
export interface SessionDefaults {
  dueRule: DueRule;
  locationId: null | number;
  productGroupId: null | number;
  storeId: null | number;
}

export const INITIAL_DEFAULTS: SessionDefaults = {
  dueRule: { kind: 'none' },
  locationId: null,
  productGroupId: null,
  storeId: null,
};

// The price for the next scan, as typed. The scan takes it, the price
// clears, and the price type stays.
export interface NextPrice {
  price: string;
  priceType: PendingScan['priceType'];
}

export const INITIAL_NEXT_PRICE: NextPrice = { price: '', priceType: 'unit' };

// The master data lists that name the defaults.
export interface DefaultsLists {
  locations: readonly Location[] | undefined;
  productGroups: readonly ProductGroup[] | undefined;
  stores: readonly Store[] | undefined;
}

export type CreateFields = Omit<CreatePendingScan, 'bookingType' | 'code'>;

// This function returns the price as a number, or null for a blank field or
// a text that is not a number.
function priceOf(price: string): null | number {
  const value = Number(price);
  return price.trim() === '' || !Number.isFinite(value) ? null : value;
}

// This function turns the defaults and the price for the next scan into the
// fields of one create call. An unset default is left out of the body, so
// the server stores null for it. The due date rule becomes a date now. The
// Inventory screen has no price, so it gives null and sends no price field.
export function createFieldsOf(
  defaults: SessionDefaults,
  nextPrice: NextPrice | null,
  today: Temporal.PlainDate = Temporal.Now.plainDateISO(),
): CreateFields {
  const fields: CreateFields =
    nextPrice === null ? {} : { priceType: nextPrice.priceType };
  const dueDate = dueDateOf(defaults.dueRule, today);
  if (dueDate !== null) {
    fields.dueDate = dueDate;
  }
  if (defaults.locationId !== null) {
    fields.locationId = defaults.locationId;
  }
  if (defaults.productGroupId !== null) {
    fields.productGroupId = defaults.productGroupId;
  }
  if (defaults.storeId !== null) {
    fields.storeId = defaults.storeId;
  }
  const price = nextPrice === null ? null : priceOf(nextPrice.price);
  if (price !== null) {
    fields.price = price;
  }
  return fields;
}

// The one line of the collapsed defaults section: the location, the store
// on the Purchase screen, the due date rule, and the product group.
export function defaultsSummary(
  defaults: SessionDefaults,
  lists: DefaultsLists,
  bookingType: PendingScan['bookingType'],
): string {
  const store =
    bookingType === 'purchase'
      ? [nameOf(lists.stores, defaults.storeId, 'No store')]
      : [];
  return [
    nameOf(lists.locations, defaults.locationId, 'Product default'),
    ...store,
    dueRuleText(defaults.dueRule),
    nameOf(lists.productGroups, defaults.productGroupId, 'Default group'),
  ].join(' · ');
}
