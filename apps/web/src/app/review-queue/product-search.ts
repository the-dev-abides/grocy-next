import type { ProductListItem } from '../api/next-api';

// The search of the product pick dialog runs in the browser over the product
// list. It finds the products whose name holds the typed text, with the case
// ignored. It sorts them by name. An empty text lists every product.
export function searchProducts(
  products: readonly ProductListItem[] | undefined,
  text: string,
): ProductListItem[] {
  const query = text.trim().toLowerCase();
  return (products ?? [])
    .filter((product) => product.name.toLowerCase().includes(query))
    .toSorted((first, second) => first.name.localeCompare(second.name));
}
