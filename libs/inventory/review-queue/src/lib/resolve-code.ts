import type {
  GrocyClient,
  ProductBarcode,
  ProductDetails,
} from '@grocy-next/inventory-products';

import { codeForms } from './code-forms.ts';

// The product that a code resolved to, with the product barcode row that
// matched the code. A product Grocycode has no product barcode row.
export interface ProductMatch {
  barcode: null | ProductBarcode;
  productId: number;
}

// A Grocycode has three or more parts joined by `:`. Part one is `grcy`.
// Part two is the type: `p` for a product. Part three is the id. A stock
// entry Grocycode has a fourth part, which this resolution ignores.
const GROCYCODE = /^grcy:/i;
const PRODUCT_GROCYCODE = /^grcy:p:(\d+)(?::|$)/i;

// The resolution order of ADR 0011: a product Grocycode, then the Grocy
// product barcode lookup for each form of the code. Grocy ignores case on
// the product barcode lookup. A Grocycode of another type and an inactive
// product count as no match.
export async function resolveCode(
  grocy: GrocyClient,
  code: string,
): Promise<null | ProductMatch> {
  if (GROCYCODE.test(code)) {
    return resolveGrocycode(grocy, code);
  }
  for (const form of codeForms(code)) {
    const match = await resolveBarcode(grocy, form);
    if (match !== null) {
      return match;
    }
  }
  return null;
}

async function resolveGrocycode(
  grocy: GrocyClient,
  code: string,
): Promise<null | ProductMatch> {
  const [, id] = PRODUCT_GROCYCODE.exec(code) ?? [];
  if (id === undefined) {
    return null;
  }
  const product = await grocy.readProductDetails(Number(id));
  return isActive(product) ? { barcode: null, productId: product.id } : null;
}

async function resolveBarcode(
  grocy: GrocyClient,
  form: string,
): Promise<null | ProductMatch> {
  const product = await grocy.readProductDetailsByBarcode(form);
  if (!isActive(product)) {
    return null;
  }
  const code = form.toLowerCase();
  const barcode =
    product.barcodes.find((row) => row.barcode.toLowerCase() === code) ?? null;
  return { barcode, productId: product.id };
}

function isActive(product: null | ProductDetails): product is ProductDetails {
  return product?.isActive ?? false;
}
