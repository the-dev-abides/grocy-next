// PROTOTYPE. Throwaway code for the ticket "Consume and Transfer scan screen".
// Three variants of the scan screen, on the route `/scan/consume-transfer`,
// with the search parameter `?variant=A`, `B`, or `C`. The data is a stand-in
// in memory. Nothing goes to the API.
import { ArrowRightLeft, type LucideIcon, Utensils } from 'lucide-react';

export type BookingType = 'consume' | 'transfer';

export const BOOKING_TYPES: readonly BookingType[] = ['consume', 'transfer'];

export function otherType(type: BookingType): BookingType {
  return type === 'consume' ? 'transfer' : 'consume';
}

// The colour and the icon of each booking type. Green and red stay free for
// the scan feedback.
export const MODE: Record<
  BookingType,
  {
    border: string;
    icon: LucideIcon;
    label: string;
    ring: string;
    solid: string;
    text: string;
    tint: string;
  }
> = {
  consume: {
    border: 'border-orange-700',
    icon: Utensils,
    label: 'Consume',
    ring: 'ring-orange-600',
    solid: 'bg-orange-700 text-white',
    text: 'text-orange-700 dark:text-orange-400',
    tint: 'bg-orange-100 dark:bg-orange-950',
  },
  transfer: {
    border: 'border-violet-700',
    icon: ArrowRightLeft,
    label: 'Transfer',
    ring: 'ring-violet-600',
    solid: 'bg-violet-700 text-white',
    text: 'text-violet-700 dark:text-violet-400',
    tint: 'bg-violet-100 dark:bg-violet-950',
  },
};

export interface PrototypeLocation {
  id: number;
  name: string;
}

export const LOCATIONS: readonly PrototypeLocation[] = [
  { id: 1, name: 'Fridge' },
  { id: 2, name: 'Pantry' },
  { id: 3, name: 'Freezer' },
  { id: 4, name: 'Cellar' },
];

// A stand-in product. `opened` is the opened stock. `sealed` holds the amount
// of each sealed stock entry in the consume order. `scanAmount` is the amount
// of one Consume scan.
export interface PrototypeProduct {
  canOpen: boolean;
  id: number;
  locationId: number;
  name: string;
  opened: number;
  scanAmount: number;
  sealed: readonly number[];
  unit: string;
}

export const PRODUCTS: readonly PrototypeProduct[] = [
  {
    canOpen: true,
    id: 1,
    locationId: 1,
    name: 'Eggs',
    opened: 0,
    scanAmount: 1,
    sealed: [12, 12],
    unit: 'piece',
  },
  {
    canOpen: true,
    id: 2,
    locationId: 1,
    name: 'Milk 3.5 %',
    opened: 1,
    scanAmount: 1,
    sealed: [1, 1],
    unit: 'carton',
  },
  {
    canOpen: true,
    id: 3,
    locationId: 2,
    name: 'Tomato paste',
    opened: 0,
    scanAmount: 1,
    sealed: [1, 1, 1],
    unit: 'can',
  },
  {
    canOpen: true,
    id: 4,
    locationId: 2,
    name: 'Basmati rice',
    opened: 0,
    scanAmount: 100,
    sealed: [1000],
    unit: 'g',
  },
  {
    canOpen: true,
    id: 5,
    locationId: 3,
    name: 'Frozen peas',
    opened: 0,
    scanAmount: 1,
    sealed: [1, 1],
    unit: 'bag',
  },
  {
    canOpen: false,
    id: 6,
    locationId: 2,
    name: 'Sea salt',
    opened: 0,
    scanAmount: 10,
    sealed: [500],
    unit: 'g',
  },
  {
    canOpen: true,
    id: 7,
    locationId: 3,
    name: 'Chicken breast',
    opened: 0,
    scanAmount: 1,
    sealed: [1, 1, 1],
    unit: 'pack',
  },
  {
    canOpen: true,
    id: 8,
    locationId: 1,
    name: 'Butter',
    opened: 0,
    scanAmount: 50,
    sealed: [250, 250],
    unit: 'g',
  },
];

export const DEMO_PREFIX = 'demo-';

// The stand-in for the barcode lookup of the server. A demo code names its
// product. Each other code maps to one product by its characters, and about
// one code in nine is an unknown code.
export function productOfCode(code: string): null | PrototypeProduct {
  if (code.startsWith(DEMO_PREFIX)) {
    const id = Number(code.slice(DEMO_PREFIX.length));
    return PRODUCTS.find((product) => product.id === id) ?? null;
  }
  let sum = 0;
  for (const character of code) {
    sum += character.codePointAt(0) ?? 0;
  }
  return sum % 9 === 8 ? null : (PRODUCTS[sum % PRODUCTS.length] ?? null);
}

export function productOf(id: null | number): null | PrototypeProduct {
  return PRODUCTS.find((product) => product.id === id) ?? null;
}

export function locationName(id: null | number, fallback: string): string {
  return LOCATIONS.find((location) => location.id === id)?.name ?? fallback;
}

// One row of the session, the stand-in for a pending scan.
export interface PrototypeRow {
  amount: number;
  bookingType: BookingType;
  code: string;
  fromLocationId: null | number;
  id: number;
  productId: null | number;
  scannedAt: string;
  spoiled: boolean;
  toLocationId: null | number;
}

export type StockHint = 'none' | 'open-stock' | 'opens' | 'short';

// What a consume of the amount does to the stock, by the open on consume of
// ADR 0017. The consume takes the opened stock first. When it leaves a sealed
// stock entry partly in stock, Grocy Next opens that stock entry.
export function stockHintOf(row: PrototypeRow): StockHint {
  const product = productOf(row.productId);
  if (product === null || row.bookingType !== 'consume') {
    return 'none';
  }
  let rest = row.amount - product.opened;
  if (rest <= 0) {
    return 'open-stock';
  }
  for (const entry of product.sealed) {
    if (rest < entry) {
      return rest > 0 && product.canOpen ? 'opens' : 'none';
    }
    rest -= entry;
  }
  return rest > 0 ? 'short' : 'none';
}

export const HINT_TEXT: Record<StockHint, string> = {
  none: '',
  'open-stock': 'From the opened pack',
  opens: 'Opens a new pack',
  short: 'More than the stock',
};

export function amountText(row: PrototypeRow): string {
  const unit = productOf(row.productId)?.unit ?? '';
  return `${String(row.amount)} ${unit}`.trim();
}

// The locations of a row in words.
export function placeText(row: PrototypeRow): string {
  const product = productOf(row.productId);
  const from = `from ${locationName(
    row.fromLocationId ?? product?.locationId ?? null,
    'the default location',
  )}`;
  return row.bookingType === 'consume'
    ? from
    : `${from} to ${locationName(row.toLocationId, '?')}`;
}

// A Transfer row needs the "to" location before the accept.
export function isWithoutTo(row: PrototypeRow): boolean {
  return row.bookingType === 'transfer' && row.toLocationId === null;
}
