// PROTOTYPE. Throwaway. Sample data for the shell and the review queue table.
import {
  Boxes,
  ClipboardList,
  Inbox,
  Package,
  Palette,
  ScanBarcode,
  Settings,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';

export type Page = 'purchase' | 'inventory' | 'queue' | 'stock' | 'shopping' | 'products' | 'settings' | 'theme';

export interface NavItem {
  page: Page;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const scanItems: NavItem[] = [
  { page: 'purchase', label: 'Purchase', icon: ScanBarcode },
  { page: 'inventory', label: 'Inventory', icon: ClipboardList },
];

export const queueItem: NavItem = { page: 'queue', label: 'Review queue', icon: Inbox, badge: 7 };

export const stockItems: NavItem[] = [
  { page: 'stock', label: 'Stock overview', icon: Boxes },
  { page: 'shopping', label: 'Shopping list', icon: ShoppingCart },
  { page: 'products', label: 'Products', icon: Package },
];

export const otherItems: NavItem[] = [
  { page: 'settings', label: 'Settings', icon: Settings },
  { page: 'theme', label: 'Theme (prototype)', icon: Palette },
];

export const allItems: NavItem[] = [...scanItems, queueItem, ...stockItems, ...otherItems];

export const pageTitle: Record<Page, string> = {
  purchase: 'Purchase',
  inventory: 'Inventory',
  queue: 'Review queue',
  stock: 'Stock overview',
  shopping: 'Shopping list',
  products: 'Products',
  settings: 'Settings',
  theme: 'Theme',
};

export interface PendingScan {
  id: number;
  barcode: string;
  bookingType: 'purchase' | 'inventory';
  product: string | null;
  lookup: 'product' | 'result' | 'none' | 'waiting';
  amount: number;
  unit: string;
  location: string;
  dueDate: string;
  store: string;
  price: string;
  error?: string;
  scannedAt: string;
}

export const pendingScans: PendingScan[] = [
  { id: 101, barcode: '4006381333931', bookingType: 'purchase', product: 'Whole milk 1 l', lookup: 'product', amount: 2, unit: 'Bottle', location: 'Fridge', dueDate: '2026-11-16', store: 'Rewe', price: '1.09', scannedAt: '09:41' },
  { id: 102, barcode: '4000417025005', bookingType: 'purchase', product: 'Butter 250 g', lookup: 'product', amount: 1, unit: 'Pack', location: 'Fridge', dueDate: '2026-12-02', store: 'Rewe', price: '2.49', scannedAt: '09:41' },
  { id: 103, barcode: '8712100849725', bookingType: 'purchase', product: 'Peanut butter crunchy 350 g', lookup: 'result', amount: 1, unit: 'Jar', location: 'Pantry', dueDate: '2027-04-30', store: 'Rewe', price: '3.29', scannedAt: '09:42' },
  { id: 104, barcode: '20004715', bookingType: 'purchase', product: null, lookup: 'none', amount: 1, unit: 'Piece', location: 'Pantry', dueDate: '2026-11-19', store: 'Rewe', price: '', scannedAt: '09:42' },
  { id: 105, barcode: '5000159461122', bookingType: 'purchase', product: 'Basmati rice 1 kg', lookup: 'product', amount: 3, unit: 'Bag', location: 'Pantry', dueDate: '2028-01-01', store: 'Rewe', price: '2.99', scannedAt: '09:43', error: 'Grocy refused: location Pantry has no stock for this product.' },
  { id: 106, barcode: '4260044262277', bookingType: 'purchase', product: null, lookup: 'waiting', amount: 1, unit: 'Piece', location: 'Pantry', dueDate: '2026-11-19', store: 'Rewe', price: '', scannedAt: '09:44' },
  { id: 107, barcode: 'GRCY:p:42', bookingType: 'inventory', product: 'Olive oil 750 ml', lookup: 'product', amount: 2, unit: 'Bottle', location: 'Pantry', dueDate: '2027-09-12', store: '', price: '', scannedAt: 'Yesterday' },
  { id: 108, barcode: '4337256096539', bookingType: 'inventory', product: 'Oat flakes 500 g', lookup: 'product', amount: 0, unit: 'Pack', location: 'Pantry', dueDate: '2026-10-28', store: '', price: '', scannedAt: 'Yesterday' },
  { id: 109, barcode: '7622210449283', bookingType: 'inventory', product: 'Dark chocolate 100 g', lookup: 'product', amount: 5, unit: 'Bar', location: 'Pantry', dueDate: '2027-02-01', store: '', price: '', scannedAt: 'Yesterday' },
  { id: 110, barcode: '4104420038110', bookingType: 'purchase', product: 'Sparkling water 6 x 1.5 l', lookup: 'result', amount: 1, unit: 'Crate', location: 'Cellar', dueDate: '2027-11-01', store: 'Edeka', price: '4.49', scannedAt: 'Yesterday' },
];

export const locations = ['Fridge', 'Freezer', 'Pantry', 'Cellar', 'Bathroom'];
export const units = ['Piece', 'Pack', 'Bottle', 'Jar', 'Bag', 'Bar', 'Crate'];
