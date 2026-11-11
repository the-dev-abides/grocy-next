import type {
  GrocyClient,
  ProductDetails,
} from '@grocy-next/inventory-products';

import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';

// This function reads the product that a product id names. The id must name
// an active product in Grocy. Grocy answers an unknown id and an inactive
// product with one refusal, and the function also checks the active flag of
// the details. Both are the unknown-id problem of ADR 0014.
export async function readActiveProduct(
  grocy: GrocyClient,
  productId: number,
): Promise<ProductDetails> {
  const product = await grocy.readProductDetails(productId);
  if (product?.isActive !== true) {
    throw new ProblemException(
      PROBLEM_TYPES.unknownId,
      `No product has the id ${String(productId)}.`,
    );
  }
  return product;
}
