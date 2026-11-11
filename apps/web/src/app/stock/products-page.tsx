import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { Product } from '../api';

import { useListProductsQuery } from '../api';
import { Page } from '../shell/page';

// The product list of milestone 1, under Stock in the shell. The grid has
// one column on a phone, two on a tablet, and three on a large screen.
export function ProductsPage() {
  const {
    data: products,
    isError,
    isLoading,
  } = useListProductsQuery(undefined);

  return (
    <Page title="Products">
      {products && (
        <p className="text-sm text-muted-foreground">
          {products.length} products
        </p>
      )}
      {isLoading && <p>The product list loads.</p>}
      {isError && (
        <p role="alert">
          The product list did not load. Check that the API runs and that Grocy
          answers.
        </p>
      )}
      {products && <ProductList products={products} />}
    </Page>
  );
}

function ProductList({ products }: Readonly<{ products: readonly Product[] }>) {
  if (products.length === 0) {
    return <p>Grocy has no products.</p>;
  }
  return (
    <ul
      className="
        grid grid-cols-1 gap-3
        sm:grid-cols-2
        lg:grid-cols-3
      "
    >
      {products.map((product) => {
        return (
          <li key={product.id}>
            <Card size="sm" className="h-full">
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                {product.description && (
                  <CardDescription>{product.description}</CardDescription>
                )}
              </CardHeader>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
