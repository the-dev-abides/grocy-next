// PROTOTYPE. Throwaway code for the ticket "Review queue screen with the four
// booking types". Three variants of the review queue screen, on the route
// `/review-queue` with the search parameter `?variant=A`, `B`, or `C`. The
// data is a stand-in in memory. Nothing goes to the API.
import {
  ArrowRightLeft,
  ClipboardList,
  type LucideIcon,
  ScanBarcode,
  Utensils,
} from 'lucide-react';

export type BookingType = 'consume' | 'inventory' | 'purchase' | 'transfer';

export const BOOKING_TYPES: readonly BookingType[] = [
  'purchase',
  'inventory',
  'consume',
  'transfer',
];

// The icon and the label of each booking type. The icons of Consume and
// Transfer are the icons of the Consume and Transfer scan screen.
export const TYPE: Record<BookingType, { icon: LucideIcon; label: string }> = {
  consume: { icon: Utensils, label: 'Consume' },
  inventory: { icon: ClipboardList, label: 'Inventory' },
  purchase: { icon: ScanBarcode, label: 'Purchase' },
  transfer: { icon: ArrowRightLeft, label: 'Transfer' },
};

export function canFlip(type: BookingType): boolean {
  return type === 'consume' || type === 'transfer';
}

export function flipped(type: BookingType): BookingType {
  if (type === 'consume') {
    return 'transfer';
  }
  return type === 'transfer' ? 'consume' : type;
}

export interface Named {
  id: number;
  name: string;
}

export const LOCATIONS: readonly Named[] = [
  { id: 1, name: 'Fridge' },
  { id: 2, name: 'Pantry' },
  { id: 3, name: 'Freezer' },
  { id: 4, name: 'Cellar' },
];

export const STORES: readonly Named[] = [
  { id: 1, name: 'Market' },
  { id: 2, name: 'Bakery' },
];

export function nameOf(list: readonly Named[], id: null | number): string {
  return list.find((item) => item.id === id)?.name ?? 'None';
}

// One stock entry in Grocy. `amount` is in the stock unit.
export interface StockEntry {
  amount: number;
  dueDate: string;
  id: number;
  isOpened: boolean;
  locationId: number;
}

export interface Unit {
  factor: number;
  name: string;
}

export interface Product {
  canOpen: boolean;
  defaultLocationId: number;
  id: number;
  name: string;
  tareWeight: null | number;
  // The first unit is the stock unit. One of a unit is `factor` stock units.
  units: readonly Unit[];
}

export const PRODUCTS: readonly Product[] = [
  {
    canOpen: true,
    defaultLocationId: 1,
    id: 1,
    name: 'Milk',
    tareWeight: null,
    units: [
      { factor: 1, name: 'l' },
      { factor: 0.25, name: 'glass' },
    ],
  },
  {
    canOpen: true,
    defaultLocationId: 1,
    id: 2,
    name: 'Butter',
    tareWeight: null,
    units: [{ factor: 1, name: 'pack' }],
  },
  {
    canOpen: true,
    defaultLocationId: 2,
    id: 3,
    name: 'Rice',
    tareWeight: null,
    units: [
      { factor: 1, name: 'g' },
      { factor: 1000, name: 'kg' },
    ],
  },
  {
    canOpen: true,
    defaultLocationId: 1,
    id: 4,
    name: 'Chicken breast',
    tareWeight: null,
    units: [{ factor: 1, name: 'piece' }],
  },
  {
    canOpen: false,
    defaultLocationId: 2,
    id: 5,
    name: 'Bread rolls',
    tareWeight: null,
    units: [{ factor: 1, name: 'piece' }],
  },
  {
    canOpen: false,
    defaultLocationId: 2,
    id: 6,
    name: 'Flour (in the jar)',
    tareWeight: 450,
    units: [{ factor: 1, name: 'g' }],
  },
  {
    canOpen: true,
    defaultLocationId: 1,
    id: 7,
    name: 'Yogurt',
    tareWeight: null,
    units: [{ factor: 1, name: 'cup' }],
  },
];

export function productOf(id: null | number): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

export function stockUnit(product: Product): string {
  return product.units[0]?.name ?? '';
}

// A pending scan of one of the four booking types, as the amended ADR 0010
// has it. `locationId` is the "from" location of a Consume and a Transfer.
// `stockEntryId` comes from a scan of a stock entry Grocycode.
export interface Row {
  amount: null | number;
  bookingType: BookingType;
  code: string;
  dueDate: null | string;
  error: null | string;
  id: number;
  locationId: null | number;
  note: null | string;
  price: null | number;
  productId: null | number;
  scannedAt: string;
  spoiled: boolean;
  stockEntryId: null | number;
  storeId: null | number;
  toLocationId: null | number;
  unit: string;
}
