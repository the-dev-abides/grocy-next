import { Search } from 'lucide-react';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import type { PendingScan, ProductListItem } from '../api/next-api';

import { searchProducts } from './product-search';

// The words under the title: the server adds the code to the product, and
// sets the lookup picture when the product has none, as ADR 0011 decided.
function PickDescription({ scan }: Readonly<{ scan: PendingScan }>) {
  return (
    <DialogDescription>
      {scan.code === null ? (
        'The pending scan gets the product that you pick.'
      ) : (
        <>
          The code <span className="font-mono">{scan.code}</span> is added to
          the product that you pick.
        </>
      )}
      {scan.lookupResult !== null &&
        ' The lookup picture is set when the product has none.'}
    </DialogDescription>
  );
}

// The list of the products that match the search. A product is a button
// that picks it.
function ProductHits({
  onPick,
  products,
}: Readonly<{
  onPick: (productId: number) => void;
  products: readonly ProductListItem[];
}>) {
  if (products.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-muted-foreground">
        No product matches.
      </p>
    );
  }
  return (
    <ul className="-mx-1 max-h-72 overflow-y-auto" aria-label="Products">
      {products.map((product) => {
        return (
          <li key={product.id}>
            <button
              type="button"
              className="
                flex h-11 w-full items-center gap-2 rounded-md px-3 text-left
                hover:bg-muted
              "
              onClick={() => {
                onPick(product.id);
              }}
            >
              <span className="min-w-0 flex-1 truncate">{product.name}</span>
              {product.description !== null && (
                <span className="truncate text-xs text-muted-foreground">
                  {product.description}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// The search field and the hits. The dialog mounts this form when it opens,
// so the search starts empty every time.
function PickProductForm({
  onPick,
  products,
}: Readonly<{
  onPick: (productId: number) => void;
  products: readonly ProductListItem[] | undefined;
}>) {
  const [text, setText] = useState('');
  return (
    <>
      <div className="relative">
        <Search className="absolute top-2 left-2.5 size-4 text-muted-foreground" />
        <Input
          aria-label="Search the products"
          placeholder="Search the products"
          className="pl-8"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </div>
      <ProductHits products={searchProducts(products, text)} onPick={onPick} />
    </>
  );
}

// The product pick dialog of a row with no product or with a wrong match: a search over the products, filtered in the browser by a part of the name.
// The pick sends the update with the product id. The server adds the code to
// the product and sets the picture, as ADR 0010 and ADR 0011 decided.
export function PickProductDialog({
  isOpen,
  onClose,
  onPick,
  products,
  scan,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onPick: (productId: number) => void;
  products: readonly ProductListItem[] | undefined;
  scan: PendingScan;
}>) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pick the product</DialogTitle>
          <PickDescription scan={scan} />
        </DialogHeader>
        {isOpen && (
          <PickProductForm
            products={products}
            onPick={(productId) => {
              onPick(productId);
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
