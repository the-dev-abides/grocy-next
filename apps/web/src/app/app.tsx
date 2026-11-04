import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Product, useListProductsQuery } from './api';

// The one page of milestone 1: the product list. The grid has one column on
// a phone, two on a tablet, and three on a large screen.
export function App() {
  const { data: products, isLoading, isError } = useListProductsQuery();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Grocy Next</h1>
        <p className="text-muted-foreground text-sm">
          The companion app for Grocy.
        </p>
      </header>
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-medium">Products</h2>
          {products && (
            <p className="text-muted-foreground text-sm">
              {products.length} products
            </p>
          )}
        </div>
        {isLoading && <p>The product list loads.</p>}
        {isError && (
          <p role="alert">
            The product list did not load. Check that the API runs and that
            Grocy answers.
          </p>
        )}
        {products && <ProductList products={products} />}
      </section>
    </main>
  );
}

function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p>Grocy has no products.</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
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
      ))}
    </ul>
  );
}
