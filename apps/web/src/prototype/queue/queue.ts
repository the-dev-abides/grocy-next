// PROTOTYPE. Throwaway. Not merged.
//
// The review queue of ADR 0010 as one in-memory store, with a seed of
// pending scans from both scan screens and from the MCP server. The store
// stands in for the Next API: the accept, the reject, the update, the bulk
// calls, the product pick, the short product form, and the lookup worker.
// Nothing is written to Grocy. The rows vanish on reload.
//
// The stand-in follows the rules of ADR 0010 and the Grocy API research:
// - The accept of a row with no product is refused.
// - A Purchase amount is in the scanned unit; the server converts to the
//   stock unit at accept. A missing conversion is an accept error.
// - An Inventory amount is the new own stock in the stock unit. Equal to
//   the current stock: no Grocy call, the row leaves with "no change".
// - A tare weight product takes the gross weight. Lower than the tare
//   weight is a Grocy error.
// - A failed accept keeps the row and stores the Grocy message as the error.
//   An update of the row clears the error.
// - Bulk accept and bulk reject are one call per row, one result per row.
import { useSyncExternalStore } from 'react';

export interface NamedRow {
  id: string;
  name: string;
}

export interface StockEntry {
  id: string;
  amount: number;
  dueDate: string;
  locationId: string;
  open: boolean;
}

export interface Product {
  id: string;
  name: string;
  stockUnit: string;
  purchaseUnit: string;
  // The units with a conversion to the stock unit, with the factor.
  conversions: Record<string, number>;
  defaultLocationId: string | null;
  productGroupId: string | null;
  // The own stock, in the stock unit, and its stock entries in the Grocy
  // consume order: open first, then the earliest due date first.
  stock: number;
  entries: StockEntry[];
  isParent: boolean;
  tareWeight: number | null;
  hasPicture: boolean;
  barcodes: string[];
}

export interface LookupResult {
  service: string;
  name: string;
  brand: string | null;
  quantityText: string | null;
  netQuantity: number | null;
  netUnit: string | null;
  imageUrl: string | null;
  sourceUrl: string;
}

export type BookingType = 'purchase' | 'inventory';
export type PriceType = 'unit' | 'total';
export type Source = 'purchase-scan' | 'inventory-scan' | 'assistant';

export interface PendingScan {
  id: number;
  code: string | null;
  bookingType: BookingType;
  product: Product | null;
  lookup: LookupResult | null;
  // True while the lookup worker has not run for this code yet.
  lookupPending: boolean;
  writeInName: string | null;
  // The Grocy message of the last failed accept, or null.
  error: string | null;
  // Purchase: in `unit`, the scanned unit, or the purchase unit when null.
  // Inventory: the new own stock in the stock unit. Null: not set yet.
  amount: number | null;
  unit: string | null;
  locationId: string | null;
  productGroupId: string | null;
  storeId: string | null;
  dueDate: string | null;
  price: string;
  priceType: PriceType;
  note: string | null;
  scannedAt: Date;
  source: Source;
}

export type EditableField = 'amount' | 'unit' | 'locationId' | 'productGroupId' | 'storeId' | 'dueDate' | 'price' | 'priceType' | 'note';

// What the user can set on many rows at once. Only the set fields change.
export interface BulkEdit {
  amount?: number;
  locationId?: string | null;
  productGroupId?: string | null;
  storeId?: string | null;
  dueDate?: string | null;
  price?: string;
  priceType?: PriceType;
  note?: string | null;
}

export interface NewProductForm {
  name: string;
  description: string;
  locationId: string | null;
  productGroupId: string | null;
  stockUnit: string;
  purchaseUnit: string;
  factor: number;
  dueDays: number | null;
}

export interface AcceptResult {
  id: number;
  name: string;
  ok: boolean;
  message: string;
}

export interface Catalog {
  locations: NamedRow[];
  stores: NamedRow[];
  productGroups: NamedRow[];
  units: string[];
  products: Product[];
}

// ------------------------------------------------------------------ seed

const locations: NamedRow[] = [
  { id: '1', name: 'Fridge' },
  { id: '2', name: 'Pantry' },
  { id: '3', name: 'Freezer' },
  { id: '4', name: 'Cellar' },
];
const stores: NamedRow[] = [
  { id: '1', name: 'Rewe' },
  { id: '2', name: 'Edeka' },
  { id: '3', name: 'Aldi' },
];
const productGroups: NamedRow[] = [
  { id: '1', name: 'Dairy' },
  { id: '2', name: 'Dry goods' },
  { id: '3', name: 'Drinks' },
  { id: '4', name: 'Fruit and vegetables' },
  { id: '5', name: 'Spreads' },
];
const units = ['Piece', 'Pack', 'Bottle', 'Jar', 'Bag', 'Bar', 'Crate', 'Gram', 'Kilogram', 'Litre'];

function product(p: Partial<Product> & Pick<Product, 'id' | 'name' | 'stockUnit'>): Product {
  return {
    purchaseUnit: p.stockUnit,
    conversions: {},
    defaultLocationId: null,
    productGroupId: null,
    stock: 0,
    entries: [],
    isParent: false,
    tareWeight: null,
    hasPicture: true,
    barcodes: [],
    ...p,
  };
}

const products: Product[] = [
  product({ id: '1', name: 'Whole milk 1 l', stockUnit: 'Bottle', defaultLocationId: '1', productGroupId: '1', stock: 4, entries: [{ id: 'a1', amount: 1, dueDate: '2026-11-10', locationId: '1', open: true }, { id: 'a2', amount: 3, dueDate: '2026-11-14', locationId: '1', open: false }], barcodes: ['4006381333931'] }),
  product({ id: '2', name: 'Butter 250 g', stockUnit: 'Pack', defaultLocationId: '1', productGroupId: '1', stock: 2, entries: [{ id: 'b1', amount: 2, dueDate: '2026-12-02', locationId: '1', open: false }], barcodes: ['4000417025005'] }),
  product({ id: '3', name: 'Basmati rice 1 kg', stockUnit: 'Gram', purchaseUnit: 'Bag', conversions: { Bag: 1000, Kilogram: 1000 }, defaultLocationId: '2', productGroupId: '2', stock: 1500, entries: [{ id: 'c1', amount: 500, dueDate: '2027-03-01', locationId: '2', open: true }, { id: 'c2', amount: 1000, dueDate: '2028-01-01', locationId: '2', open: false }], barcodes: ['5000159461122'] }),
  product({ id: '4', name: 'Sparkling water 1.5 l', stockUnit: 'Bottle', conversions: { Crate: 6 }, defaultLocationId: '4', productGroupId: '3', stock: 9, entries: [{ id: 'd1', amount: 6, dueDate: '2027-11-01', locationId: '4', open: false }, { id: 'd2', amount: 3, dueDate: '2027-11-01', locationId: '1', open: false }], barcodes: ['4104420038110'] }),
  product({ id: '5', name: 'Banana', stockUnit: 'Piece', defaultLocationId: '2', productGroupId: '4', stock: 0, barcodes: ['4011'] }),
  product({ id: '6', name: 'Olive oil 750 ml', stockUnit: 'Bottle', defaultLocationId: '2', productGroupId: '2', stock: 3, entries: [{ id: 'f1', amount: 1, dueDate: '2027-02-12', locationId: '2', open: true }, { id: 'f2', amount: 2, dueDate: '2027-09-12', locationId: '2', open: false }], barcodes: ['8001250012340'] }),
  product({ id: '7', name: 'Oat flakes 500 g', stockUnit: 'Pack', defaultLocationId: '2', productGroupId: '2', stock: 2, entries: [{ id: 'g1', amount: 2, dueDate: '2026-10-28', locationId: '2', open: false }], barcodes: ['4337256096539'] }),
  product({ id: '8', name: 'Pasta', stockUnit: 'Pack', defaultLocationId: '2', productGroupId: '2', stock: 1, entries: [{ id: 'h1', amount: 1, dueDate: '2027-06-30', locationId: '2', open: false }], isParent: true, barcodes: [] }),
  product({ id: '9', name: 'Flour 1 kg', stockUnit: 'Gram', defaultLocationId: '2', productGroupId: '2', stock: 650, entries: [{ id: 'i1', amount: 650, dueDate: '2027-05-01', locationId: '2', open: true }], tareWeight: 120, barcodes: ['4005500069003'] }),
  product({ id: '10', name: 'Eggs 10 pieces', stockUnit: 'Pack', defaultLocationId: '1', productGroupId: '1', stock: 1, entries: [{ id: 'j1', amount: 1, dueDate: '2026-11-20', locationId: '1', open: false }], hasPicture: false, barcodes: [] }),
  product({ id: '11', name: 'Dark chocolate 100 g', stockUnit: 'Bar', defaultLocationId: '2', productGroupId: '2', stock: 5, entries: [{ id: 'k1', amount: 5, dueDate: '2027-02-01', locationId: '2', open: false }], barcodes: ['7622210449283'] }),
  product({ id: '12', name: 'Peanut butter crunchy 350 g', stockUnit: 'Jar', defaultLocationId: '2', productGroupId: '5', stock: 1, entries: [{ id: 'l1', amount: 1, dueDate: '2027-01-15', locationId: '2', open: true }], barcodes: [] }),
  product({ id: '13', name: 'Strawberry jam 450 g', stockUnit: 'Jar', defaultLocationId: '2', productGroupId: '5', stock: 0, barcodes: [] }),
  product({ id: '14', name: 'Frozen peas 1 kg', stockUnit: 'Bag', defaultLocationId: '3', productGroupId: '4', stock: 2, entries: [{ id: 'n1', amount: 2, dueDate: '2027-08-01', locationId: '3', open: false }], barcodes: ['4056489001234'] }),
];

function byId(id: string) {
  const p = products.find((x) => x.id === id);
  if (!p) throw new Error(`no product ${id}`);
  return p;
}

const today = new Date();
function at(daysAgo: number, hour: number, minute: number) {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function row(p: Partial<PendingScan> & Pick<PendingScan, 'id' | 'bookingType' | 'scannedAt' | 'source'>): PendingScan {
  return {
    code: null, product: null, lookup: null, lookupPending: false, writeInName: null, error: null,
    amount: null, unit: null, locationId: null, productGroupId: null, storeId: null, dueDate: null,
    price: '', priceType: 'unit', note: null,
    ...p,
  };
}

// The rows of the seed, oldest first. The screens sort most recent first.
const seed: PendingScan[] = [
  // Yesterday evening: an Inventory session in the pantry. No amount yet;
  // the review queue sets it (ADR 0010, amended by the Inventory prototype).
  row({ id: 101, code: '8001250012340', bookingType: 'inventory', product: byId('6'), locationId: '2', scannedAt: at(1, 18, 2), source: 'inventory-scan' }),
  row({ id: 102, code: '4337256096539', bookingType: 'inventory', product: byId('7'), locationId: '2', scannedAt: at(1, 18, 3), source: 'inventory-scan' }),
  row({ id: 103, code: 'grcy:p:8', bookingType: 'inventory', product: byId('8'), locationId: '2', scannedAt: at(1, 18, 3), source: 'inventory-scan' }),
  row({ id: 104, code: '4005500069003', bookingType: 'inventory', product: byId('9'), locationId: '2', scannedAt: at(1, 18, 4), source: 'inventory-scan' }),
  row({ id: 105, code: '20012345', bookingType: 'inventory', writeInName: "Grandma's plum jam", locationId: '2', productGroupId: '5', scannedAt: at(1, 18, 5), source: 'inventory-scan' }),
  row({ id: 106, code: '4104420038110', bookingType: 'inventory', product: byId('4'), locationId: '2', scannedAt: at(1, 18, 6), source: 'inventory-scan' }),
  // This morning: the assistant read a receipt through the MCP server. No
  // code, a product, and a note.
  row({ id: 107, bookingType: 'purchase', product: byId('10'), amount: 1, storeId: '1', price: '2.79', priceType: 'total', dueDate: '2026-11-23', note: 'Receipt of 2026-11-08, Rewe, read by the assistant', scannedAt: at(0, 8, 12), source: 'assistant' }),
  // This morning: a Purchase session.
  row({ id: 108, code: '4006381333931', bookingType: 'purchase', product: byId('1'), amount: 2, locationId: '1', storeId: '1', price: '1.09', dueDate: '2026-11-16', scannedAt: at(0, 9, 41), source: 'purchase-scan' }),
  row({ id: 109, code: '4000417025005', bookingType: 'purchase', product: byId('2'), amount: 1, locationId: '1', storeId: '1', price: '2.49', dueDate: '2026-12-02', scannedAt: at(0, 9, 41), source: 'purchase-scan' }),
  row({ id: 110, code: '8712100849725', bookingType: 'purchase', lookup: { service: 'Open Food Facts', name: 'Peanut butter crunchy', brand: 'Calvé', quantityText: '350 g', netQuantity: 350, netUnit: 'g', imageUrl: 'https://images.openfoodfacts.org/images/products/871/210/084/9725/front_en.5.400.jpg', sourceUrl: 'https://world.openfoodfacts.org/product/8712100849725' }, amount: 1, locationId: '2', productGroupId: '5', storeId: '1', price: '3.29', dueDate: '2027-04-30', scannedAt: at(0, 9, 42), source: 'purchase-scan' }),
  row({ id: 111, code: '20004715', bookingType: 'purchase', amount: 1, locationId: '2', storeId: '1', dueDate: '2026-11-19', scannedAt: at(0, 9, 42), source: 'purchase-scan' }),
  // An earlier accept failed: 3 Bag of rice, and the product has no
  // conversion from Bag... in this seed the conversion is missing on purpose.
  row({ id: 112, code: '5000159461122', bookingType: 'purchase', product: { ...byId('3'), conversions: {} }, amount: 3, unit: 'Bag', locationId: '2', storeId: '1', price: '2.99', dueDate: '2028-01-01', error: 'No conversion from Bag to Gram for Basmati rice 1 kg.', scannedAt: at(0, 9, 43), source: 'purchase-scan' }),
  row({ id: 113, code: '4104420038110', bookingType: 'purchase', product: byId('4'), amount: 6, unit: 'Bottle', locationId: '4', storeId: '2', price: '4.49', priceType: 'total', note: 'Crate of 6', dueDate: '2027-11-01', scannedAt: at(0, 9, 44), source: 'purchase-scan' }),
  row({ id: 114, code: '4260044262277', bookingType: 'purchase', lookupPending: true, amount: 1, locationId: '1', storeId: '1', dueDate: '2026-11-19', scannedAt: at(0, 9, 45), source: 'purchase-scan' }),
  row({ id: 115, code: '4011', bookingType: 'purchase', product: byId('5'), amount: 6, locationId: '2', storeId: '1', price: '0.29', dueDate: '2026-11-14', scannedAt: at(0, 9, 45), source: 'purchase-scan' }),
  row({ id: 116, code: '4056489001234', bookingType: 'purchase', product: byId('14'), amount: 1, locationId: '3', storeId: '1', price: '1.99', scannedAt: at(0, 9, 46), source: 'purchase-scan' }),
];

// ----------------------------------------------------------------- store

export interface QueueState {
  catalog: Catalog;
  scans: PendingScan[];
  // The result list of the last bulk run, newest run only.
  results: AcceptResult[] | null;
  // The rows with an accept or a reject in flight.
  busy: Set<number>;
}

type Listener = () => void;

export class Queue {
  private state: QueueState;
  private listeners = new Set<Listener>();
  private nextProductId = 100;

  constructor() {
    this.state = {
      catalog: { locations, stores, productGroups, units, products: [...products] },
      scans: [...seed].sort((a, b) => b.scannedAt.getTime() - a.scannedAt.getTime()),
      results: null,
      busy: new Set(),
    };
    // The lookup worker of ADR 0011 stands in: one row gets its lookup
    // result after a few seconds, so that the screen shows the change.
    window.setTimeout(() => {
      this.update(114, {
        lookupPending: false,
        lookup: { service: 'Open Food Facts', name: 'Oat drink Barista Edition', brand: 'Oatly', quantityText: '1 l', netQuantity: 1000, netUnit: 'ml', imageUrl: 'https://images.openfoodfacts.org/images/products/426/004/426/2277/front_en.3.400.jpg', sourceUrl: 'https://world.openfoodfacts.org/product/4260044262277' },
      }, false);
    }, 6000);
  }

  get = () => this.state;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<QueueState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  find(id: number) {
    return this.state.scans.find((s) => s.id === id);
  }

  // PATCH /api/v2/pending-scans/{id}. An update clears the error.
  update(id: number, patch: Partial<PendingScan>, clearError = true) {
    this.set({ scans: this.state.scans.map((s) => (s.id === id ? { ...s, ...patch, ...(clearError ? { error: null } : {}) } : s)) });
  }

  // The bulk edit: the same PATCH per row, with the set fields only.
  bulkEdit(ids: number[], edit: BulkEdit) {
    const patch: Partial<PendingScan> = {};
    for (const [k, v] of Object.entries(edit)) if (v !== undefined) (patch as Record<string, unknown>)[k] = v;
    this.set({ scans: this.state.scans.map((s) => (ids.includes(s.id) ? { ...s, ...patch, error: null } : s)) });
  }

  // An update that sets an existing product. The server adds the code to
  // that product in Grocy and links the nutrition facts (ADR 0011).
  setProduct(id: number, productId: string) {
    const scan = this.find(id);
    const p = this.state.catalog.products.find((x) => x.id === productId);
    if (!scan || !p) return;
    if (scan.code && !p.barcodes.includes(scan.code)) p.barcodes = [...p.barcodes, scan.code];
    if (scan.lookup?.imageUrl && !p.hasPicture) p.hasPicture = true;
    this.update(id, { product: p, writeInName: null, unit: null, locationId: scan.locationId ?? p.defaultLocationId, amount: scan.bookingType === 'inventory' ? scan.amount : (scan.amount ?? 1) });
  }

  // POST /api/v2/products, the short product form, then the row gets the
  // product. Two calls behind one click (ADR 0010).
  createProduct(id: number, form: NewProductForm) {
    const scan = this.find(id);
    if (!scan) return;
    const p = product({
      id: String(this.nextProductId++),
      name: form.name,
      stockUnit: form.stockUnit,
      purchaseUnit: form.purchaseUnit,
      conversions: form.purchaseUnit !== form.stockUnit ? { [form.purchaseUnit]: form.factor } : {},
      defaultLocationId: form.locationId,
      productGroupId: form.productGroupId,
      hasPicture: !!scan.lookup?.imageUrl,
      barcodes: scan.code ? [scan.code] : [],
    });
    this.state.catalog.products.push(p);
    this.update(id, { product: p, writeInName: null, unit: null, locationId: scan.locationId ?? form.locationId, amount: scan.bookingType === 'inventory' ? scan.amount : (scan.amount ?? 1) });
  }

  // DELETE /api/v2/pending-scans/{id}. No history.
  reject(id: number) {
    this.set({ scans: this.state.scans.filter((s) => s.id !== id) });
  }

  // POST /api/v2/bookings for one row. The stand-in waits a moment, as a
  // Grocy call does, then books or fails.
  async accept(id: number): Promise<AcceptResult> {
    const scan = this.find(id);
    if (!scan) return { id, name: '', ok: false, message: 'The row is gone.' };
    const name = nameOf(scan);
    const busy = new Set(this.state.busy);
    busy.add(id);
    this.set({ busy });
    await new Promise((r) => window.setTimeout(r, 350 + Math.random() * 300));
    const result = this.book(scan);
    const done = new Set(this.state.busy);
    done.delete(id);
    if (result.ok) {
      this.set({ busy: done, scans: this.state.scans.filter((s) => s.id !== id) });
    } else {
      this.set({ busy: done, scans: this.state.scans.map((s) => (s.id === id ? { ...s, error: result.message } : s)) });
    }
    return { id, name, ...result };
  }

  // Bulk accept: one call per row, in order, one result per row.
  async acceptMany(ids: number[]) {
    this.set({ results: null });
    const results: AcceptResult[] = [];
    for (const id of ids) {
      results.push(await this.accept(id));
      this.set({ results: [...results] });
    }
    return results;
  }

  rejectMany(ids: number[]) {
    const results = ids.map((id) => ({ id, name: nameOf(this.find(id)), ok: true, message: 'Rejected.' }));
    this.set({ scans: this.state.scans.filter((s) => !ids.includes(s.id)), results });
    return results;
  }

  clearResults() {
    this.set({ results: null });
  }

  // The Grocy rules that the real server applies at accept.
  private book(scan: PendingScan): { ok: boolean; message: string } {
    const p = scan.product;
    if (!p) return { ok: false, message: 'Refused: the pending scan has no product.' };
    if (scan.amount === null) return { ok: false, message: scan.bookingType === 'inventory' ? 'Refused: no count set.' : 'Refused: no amount set.' };
    const loc = this.state.catalog.locations.find((l) => l.id === (scan.locationId ?? p.defaultLocationId))?.name ?? 'the default location';
    if (scan.bookingType === 'purchase') {
      const unit = scan.unit ?? p.purchaseUnit;
      const factor = unit === p.stockUnit ? 1 : p.conversions[unit];
      if (factor === undefined) return { ok: false, message: `No conversion from ${unit} to ${p.stockUnit} for ${p.name}.` };
      if (scan.amount <= 0) return { ok: false, message: 'Grocy refused: the amount must be greater than zero.' };
      const stockAmount = round(scan.amount * factor);
      p.stock = round(p.stock + stockAmount);
      const due = scan.dueDate ?? 'the product default';
      return { ok: true, message: `Booked ${stockAmount} ${p.stockUnit} to ${loc}, due ${due}${scan.price ? `, ${scan.price} ${scan.priceType === 'total' ? 'in total' : `per ${unit}`}` : ''}.` };
    }
    // Inventory. The amount is the new own stock in the stock unit, or the
    // gross weight for a tare weight product.
    if (p.tareWeight !== null) {
      if (scan.amount < p.tareWeight) return { ok: false, message: 'Grocy refused: the amount cannot be lower than the defined tare weight.' };
      const net = round(scan.amount - p.tareWeight);
      if (net === p.stock) return { ok: true, message: 'No change: the gross weight equals the stock plus the tare weight. Grocy was not called.' };
      const diff = round(net - p.stock);
      p.stock = net;
      return { ok: true, message: diff > 0 ? `Booked +${diff} ${p.stockUnit} to ${loc}.` : `Consumed ${-diff} ${p.stockUnit} in the Grocy order.` };
    }
    if (scan.amount === p.stock) return { ok: true, message: 'No change: the count equals the stock. Grocy was not called.' };
    const diff = round(scan.amount - p.stock);
    const plan = consumePlan(p, -diff);
    p.stock = scan.amount;
    return { ok: true, message: diff > 0 ? `Booked +${diff} ${p.stockUnit} to ${loc}.` : `Consumed ${-diff} ${p.stockUnit}: ${plan.map((e) => `${e.take} from the entry due ${e.entry.dueDate}`).join(', ')}.` };
  }
}

// What a decrease takes from each stock entry, in the Grocy order: open
// entries first, then the earliest due date first. The entries of the seed
// are already in that order.
export function consumePlan(p: Product, amount: number) {
  const plan: { entry: StockEntry; take: number }[] = [];
  let left = amount;
  for (const entry of p.entries) {
    if (left <= 0) break;
    const take = Math.min(entry.amount, left);
    plan.push({ entry, take: round(take) });
    left = round(left - take);
  }
  return plan;
}

export function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

// ----------------------------------------------------------------- views

export type RowState =
  | { kind: 'ready' }
  | { kind: 'no-count' }
  | { kind: 'lookup-runs' }
  | { kind: 'new-product' }
  | { kind: 'no-product' }
  | { kind: 'error'; message: string };

// The words that the screens show come from the three facts of ADR 0010,
// plus the Inventory count.
export function stateOf(scan: PendingScan): RowState {
  if (scan.error) return { kind: 'error', message: scan.error };
  if (!scan.product) {
    if (scan.lookupPending) return { kind: 'lookup-runs' };
    if (scan.lookup || scan.writeInName) return { kind: 'new-product' };
    return { kind: 'no-product' };
  }
  if (scan.bookingType === 'inventory' && scan.amount === null) return { kind: 'no-count' };
  return { kind: 'ready' };
}

export function canAccept(scan: PendingScan) {
  const k = stateOf(scan).kind;
  return k === 'ready' || k === 'error';
}

export function nameOf(scan: PendingScan | undefined) {
  if (!scan) return '';
  return scan.product?.name ?? scan.writeInName ?? scan.lookup?.name ?? scan.code ?? '';
}

export function unitOf(scan: PendingScan) {
  if (scan.bookingType === 'inventory') return scan.product?.stockUnit ?? '';
  return scan.unit ?? scan.product?.purchaseUnit ?? '';
}

export function rowName(rows: NamedRow[], id: string | null, fallback = 'Product default') {
  if (id === null) return fallback;
  return rows.find((r) => r.id === id)?.name ?? `#${id}`;
}

export function timeOf(date: Date) {
  const sameDay = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

export const sourceLabel: Record<Source, string> = {
  'purchase-scan': 'Purchase scan',
  'inventory-scan': 'Inventory scan',
  assistant: 'Assistant',
};

// The proposal of the short product form from the lookup result or the
// write-in name (ADR 0011).
export function proposeProduct(scan: PendingScan, catalog: Catalog): NewProductForm {
  const l = scan.lookup;
  const stockUnit = l?.netUnit === 'g' ? 'Gram' : l?.netUnit === 'ml' ? 'Litre' : '';
  const factor = l?.netQuantity && stockUnit ? (l.netUnit === 'ml' ? l.netQuantity / 1000 : l.netQuantity) : 1;
  const text = (l?.quantityText ?? '').toLowerCase();
  const purchaseUnit = stockUnit
    ? (/jar|glass/.test(text) ? 'Jar' : /bottle|l\b/.test(text) ? 'Bottle' : /bag|sack/.test(text) ? 'Bag' : /bar/.test(text) ? 'Bar' : 'Pack')
    : '';
  return {
    name: scan.writeInName ?? l?.name ?? '',
    description: [l?.brand, l?.quantityText].filter(Boolean).join(', '),
    locationId: scan.locationId,
    productGroupId: scan.productGroupId,
    stockUnit,
    purchaseUnit: catalog.units.includes(purchaseUnit) ? purchaseUnit : '',
    factor: round(factor),
    dueDays: null,
  };
}

let queue: Queue | null = null;

export function getQueue() {
  queue ??= new Queue();
  return queue;
}

export function useQueue(): [QueueState, Queue] {
  const q = getQueue();
  const state = useSyncExternalStore(q.subscribe, q.get, q.get);
  return [state, q];
}
