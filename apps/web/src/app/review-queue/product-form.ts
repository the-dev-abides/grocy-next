import type {
  CreateProduct,
  PendingScan,
  QuantityUnitConversion,
} from '../api/next-api';
import type { Named } from './named-unit';

import { householdFactorOf } from './household-conversion';
import { proposeFactor, proposeProduct } from './product-proposal';

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

// The household units and the household conversions for the unit proposals.
interface UnitLists {
  quantityUnitConversions: readonly QuantityUnitConversion[] | undefined;
  quantityUnits: readonly Named[] | undefined;
}

type FormUnits = Pick<ProductForm, 'purchaseUnitId' | 'stockUnitId'>;

// Whether the form asks for a factor. It does when the two units are set and
// differ, and the household conversions do not resolve the pair. When they
// resolve it, the Grocy trigger creates no conversion row, and the product uses
// the household conversion.
export function requiresFactor(
  form: FormUnits,
  conversions: readonly QuantityUnitConversion[] | undefined,
): boolean {
  return (
    form.purchaseUnitId !== null &&
    form.stockUnitId !== null &&
    form.purchaseUnitId !== form.stockUnitId &&
    householdFactorOf(form.purchaseUnitId, form.stockUnitId, conversions) ===
      null
  );
}

// The factor text for two units: the factor proposal from the net quantity
// when the form asks for a factor and the net quantity gives a value. Else the
// text is empty, and the user types the factor when the form asks for one.
function factorTextOf(
  form: FormUnits,
  lookup: PendingScan['lookupResult'],
  lists: UnitLists,
): string {
  if (
    form.purchaseUnitId === null ||
    form.stockUnitId === null ||
    !requiresFactor(form, lists.quantityUnitConversions)
  ) {
    return '';
  }
  const factor = proposeFactor(
    lookup,
    { purchaseUnitId: form.purchaseUnitId, stockUnitId: form.stockUnitId },
    lists.quantityUnits,
    lists.quantityUnitConversions,
  );
  return factor === null ? '' : String(factor);
}

// The form as it opens. It has the proposals of ADR 0011 and the location and
// the product group of the row. The due days are 0, which means no due date.
export function formOf(
  scan: Pick<
    PendingScan,
    'locationId' | 'lookupResult' | 'productGroupId' | 'writeInName'
  >,
  lists: UnitLists,
): ProductForm {
  const proposal = proposeProduct(
    scan,
    lists.quantityUnits,
    lists.quantityUnitConversions,
  );
  return {
    defaultDueDays: '0',
    description: proposal.description,
    factor: factorTextOf(proposal, scan.lookupResult, lists),
    locationId: scan.locationId,
    name: proposal.name,
    productGroupId: scan.productGroupId,
    purchaseUnitId: proposal.purchaseUnitId,
    stockUnitId: proposal.stockUnitId,
  };
}

// The form after a change of the user. A change of the stock unit or the
// purchase unit computes the factor again for the new pair, so a factor of
// the old pair never stays. A change of any other field keeps the factor.
export function withPatch(
  form: ProductForm,
  patch: Partial<ProductForm>,
  scan: Pick<PendingScan, 'lookupResult'>,
  lists: UnitLists,
): ProductForm {
  const changed = { ...form, ...patch };
  const isUnitChange =
    changed.purchaseUnitId !== form.purchaseUnitId ||
    changed.stockUnitId !== form.stockUnitId;
  return isUnitChange
    ? { ...changed, factor: factorTextOf(changed, scan.lookupResult, lists) }
    : changed;
}

function factorOf(
  form: ProductForm,
  conversions: readonly QuantityUnitConversion[] | undefined,
): null | number | undefined {
  if (!requiresFactor(form, conversions)) {
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
// complete. A name, a location, and the two units are required. When the form
// asks for a factor, the factor must be a number above zero. The due days must
// be a whole number from -1. The description and the factor go only when they
// have a value. A pair that the household conversions resolve sends no factor,
// so the server writes no product conversion.
export function bodyOf(
  form: ProductForm,
  conversions: readonly QuantityUnitConversion[] | undefined,
): CreateProduct | null {
  const name = form.name.trim();
  const factor = factorOf(form, conversions);
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
