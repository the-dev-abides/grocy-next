import type { ProductListItem } from '../api/next-api';

// The search of the product pick dialog runs in the browser over the product
// list: the products whose name holds the typed text, case ignored, sorted
// by name. An empty text lists every product.
export function searchProducts(
  products: readonly ProductListItem[] | undefined,
  text: string,
): ProductListItem[] {
  const query = text.trim().toLowerCase();
  return (products ?? [])
    .filter((product) => product.name.toLowerCase().includes(query))
    .toSorted((first, second) => first.name.localeCompare(second.name));
}
