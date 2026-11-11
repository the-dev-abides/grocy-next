import { cn } from 'cn';

import { Input } from '@/components/ui/input';

import type { PriceType } from '../api/next-api';
import type { NextPrice } from './session-defaults';

const PRICE_TYPES: readonly PriceType[] = ['unit', 'total'];

// The price for the next scan, under the camera: a decimal field and the
// price type, unit or total. The row is tinted while a price is typed. The
// scan takes the price, the field clears, and the price type stays.
export function PriceField({
  nextPrice,
  onChange,
}: Readonly<{
  nextPrice: NextPrice;
  onChange: (patch: Partial<NextPrice>) => void;
}>) {
  return (
    <div
      className={cn(
        'flex h-12 items-center gap-2 border-b px-3',
        nextPrice.price === '' ? 'bg-background' : 'bg-primary/10',
      )}
    >
      <span className="shrink-0 text-xs text-muted-foreground">
        Price for the
        <br />
        next scan
      </span>
      <Input
        inputMode="decimal"
        placeholder="None"
        aria-label="Price for the next scan"
        className="min-w-0 flex-1"
        value={nextPrice.price}
        onChange={(event) => {
          onChange({ price: event.target.value });
        }}
      />
      <div
        role="group"
        aria-label="Price type"
        className="flex rounded-lg border p-0.5"
      >
        {PRICE_TYPES.map((type) => {
          return (
            <button
              key={type}
              type="button"
              aria-pressed={nextPrice.priceType === type}
              className={cn(
                'h-7 rounded-md px-2 text-xs',
                nextPrice.priceType === type ? 'bg-accent font-medium' : '',
              )}
              onClick={() => {
                onChange({ priceType: type });
              }}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}
