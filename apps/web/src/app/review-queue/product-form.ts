import type { CreateProduct, PendingScan } from '../api/next-api';

import { proposeProduct } from './product-proposal';

interface Named {
  id: number;
  name: string;
}

// The fields of the short product form. The numbers are the typed text, so
// the user can clear a field and type again.
export interface ProductForm {
  defaultDueDays: string;
  description: string;
  factor: string;
  locationId: null | number;
  name: string;
  productGroupId: null | number;
  purchaseUnitId: null | number;
  stockUnitId: null | number;
}

// The form as it opens. It has the proposals of ADR 0011 and the location and
// the product group of the row. The due days are 0, which means no due date.
export function formOf(
  scan: Pick<
    PendingScan,
    'locationId' | 'lookupResult' | 'productGroupId' | 'writeInName'
  >,
  units: readonly Named[] | undefined,
): ProductForm {
  const proposal = proposeProduct(scan, units);
  return {
    defaultDueDays: '0',
    description: proposal.description,
    factor: String(proposal.purchaseToStockFactor),
    locationId: scan.locationId,
    name: proposal.name,
    productGroupId: scan.productGroupId,
    purchaseUnitId: proposal.purchaseUnitId,
    stockUnitId: proposal.stockUnitId,
  };
}

function factorOf(form: ProductForm): null | number | undefined {
  if (form.purchaseUnitId === form.stockUnitId) {
    return undefined;
  }
  const factor = Number(form.factor);
  return form.factor.trim() === '' || !Number.isFinite(factor) || factor <= 0
    ? null
    : factor;
}

function dueDaysOf(form: ProductForm): null | number {
  const days =
    form.defaultDueDays.trim() === '' ? 0 : Number(form.defaultDueDays);
  return Number.isSafeInteger(days) && days >= -1 ? days : null;
}

// The body of the product create from the form, or null while the form is not
// complete. A name, a location, and the two units are required. When the units
// differ, the factor must be a number above zero. The due days must be a whole
// number from -1. The description and the factor go only when they have a
// value.
export function bodyOf(form: ProductForm): CreateProduct | null {
  const name = form.name.trim();
  const factor = factorOf(form);
  const defaultDueDays = dueDaysOf(form);
  if (
    name === '' ||
    factor === null ||
    defaultDueDays === null ||
    form.locationId === null ||
    form.stockUnitId === null ||
    form.purchaseUnitId === null
  ) {
    return null;
  }
  const description = form.description.trim();
  return {
    defaultDueDays,
    ...(description !== '' && { description }),
    locationId: form.locationId,
    name,
    ...(form.productGroupId !== null && {
      productGroupId: form.productGroupId,
    }),
    ...(factor !== undefined && { purchaseToStockFactor: factor }),
    purchaseUnitId: form.purchaseUnitId,
    stockUnitId: form.stockUnitId,
  };
}
