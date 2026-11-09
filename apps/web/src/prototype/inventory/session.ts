// PROTOTYPE. Throwaway. The scan session of the Inventory scan screen: the
// time between the open and the close of the screen, with the defaults that
// the screen copies into each pending scan (ADR 0010). Nothing here is
// stored. One store object holds the state; the variants read it with
// `useSession`.
//
// The Inventory rules of ADR 0010 that this session follows:
// - The booking type is `inventory`. The count is the new stock amount.
// - One product has at most one open Inventory pending scan. A repeat scan
//   adds to it. The row holds the total count.
// - The empty unit means the stock unit.
// - The current stock comes from the product, not from the row.
import { useSyncExternalStore } from 'react';
import { audioUnlocked, feedbackKnown, feedbackRepeat, feedbackUnknown, unlockAudio } from '../purchase/feedback';
import { Scanner, type ScannerStatus } from '../purchase/scanner';
import type { Force, Found } from '../purchase/decoder';
import { codeForms, loadCatalog, lookupApplies, lookupCode, resolveCode, type Catalog, type LookupResult, type ResolvedProduct } from '../purchase/server';
import { productStock, type ProductStock, type StockedProduct } from './server';

export type DueRule = { kind: 'none' } | { kind: 'days'; days: number } | { kind: 'date'; date: string };

export interface Defaults {
  locationId: string | null;
  productGroupId: string | null;
  dueRule: DueRule;
}

export interface PendingScan {
  id: number;
  code: string | null;
  format: string;
  bookingType: 'inventory';
  product: ResolvedProduct | null;
  lookup: LookupResult | null;
  lookupPending: boolean;
  // The current stock of the product, read from Grocy after the scan.
  stock: ProductStock | null;
  stockPending: boolean;
  // The count. In variant A and C it is the new total. In variant B it is
  // the count at the session location; the variant derives the new total.
  count: number;
  unit: string | null;
  locationId: string | null;
  productGroupId: string | null;
  dueDate: string | null;
  scannedAt: Date;
  scanCount: number;
  // How the row came to be: a scan, a typed code, or "not here" in variant B.
  source: 'scan' | 'typed' | 'not-here';
}

export interface Feedback {
  id: number;
  kind: 'known' | 'repeat' | 'unknown';
  title: string;
  detail: string;
}

export interface SessionState {
  catalog: Catalog | null;
  defaults: Defaults;
  scans: PendingScan[];
  flash: Feedback['kind'] | null;
  feedback: Feedback | null;
  scanner: ScannerStatus;
  audio: boolean;
  force: Force;
}

const initialScanner: ScannerStatus = {
  camera: 'off', decoder: null, thread: null, nativeFormats: [], lastDecodeMs: null, inView: [], message: null,
};

export const initialDefaults: Defaults = {
  locationId: null,
  productGroupId: null,
  dueRule: { kind: 'none' },
};

type Listener = () => void;

export class Session {
  private state: SessionState;
  private listeners = new Set<Listener>();
  private scanner: Scanner | null = null;
  private nextId = 1;
  private nextFeedback = 1;

  constructor(force: Force) {
    this.state = {
      catalog: null, defaults: initialDefaults, scans: [], flash: null, feedback: null, scanner: initialScanner, audio: false, force,
    };
    void loadCatalog().then((catalog) => this.set({ catalog }));
    const unlock = () => {
      unlockAudio();
      this.set({ audio: audioUnlocked() });
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  }

  get = () => this.state;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  setDefaults(patch: Partial<Defaults>) {
    this.set({ defaults: { ...this.state.defaults, ...patch } });
  }

  resetDefaults() {
    this.set({ defaults: initialDefaults });
  }

  attachCamera(video: HTMLVideoElement) {
    this.scanner?.stop();
    this.scanner = new Scanner(
      video,
      { onStatus: (scanner) => this.set({ scanner }), onScan: (found) => void this.scan(found) },
      this.state.force,
    );
    void this.scanner.start();
  }

  detachCamera() {
    this.scanner?.stop();
    this.scanner = null;
  }

  typeCode(code: string) {
    void this.scan({ rawValue: code.trim(), format: 'typed' });
  }

  // The create call of ADR 0010 for an Inventory scan: resolve the code,
  // copy the defaults, merge a repeat scan, read the current stock, queue
  // the lookup.
  private async scan(found: Found) {
    const code = found.rawValue;
    const forms = codeForms(code).map((f) => f.toLowerCase());
    const open = this.state.scans.find((s) => s.code !== null && forms.includes(s.code.toLowerCase()));
    if (open) {
      const add = open.product?.barcodeAmount ?? 1;
      const merged = { ...open, count: open.count + add, scanCount: open.scanCount + 1 };
      this.set({ scans: [merged, ...this.state.scans.filter((s) => s.id !== open.id)] });
      feedbackRepeat();
      this.feedback('repeat', merged.product?.name ?? merged.lookup?.name ?? code, countDetail(merged));
      return;
    }
    const product = await resolveCode(code);
    // One product has one open Inventory pending scan, also when a second
    // product barcode of the same product is scanned, or when the row came
    // from "not here".
    const sameProduct = product ? this.state.scans.find((s) => s.product?.id === product.id) : undefined;
    if (sameProduct) {
      const add = product?.barcodeAmount ?? 1;
      const merged = { ...sameProduct, code: sameProduct.code ?? code, count: sameProduct.count + add, scanCount: sameProduct.scanCount + 1 };
      this.set({ scans: [merged, ...this.state.scans.filter((s) => s.id !== sameProduct.id)] });
      feedbackRepeat();
      this.feedback('repeat', merged.product?.name ?? code, countDetail(merged));
      return;
    }
    const d = this.state.defaults;
    const scan: PendingScan = {
      id: this.nextId++,
      code,
      format: found.format,
      bookingType: 'inventory',
      product,
      lookup: null,
      lookupPending: !product && lookupApplies(code),
      stock: null,
      stockPending: !!product,
      count: product?.barcodeAmount ?? 1,
      unit: product?.barcodeUnit ?? null,
      locationId: d.locationId,
      productGroupId: d.productGroupId,
      dueDate: dueDateOf(d.dueRule),
      scannedAt: new Date(),
      scanCount: 1,
      source: found.format === 'typed' ? 'typed' : 'scan',
    };
    this.set({ scans: [scan, ...this.state.scans] });
    if (product) {
      feedbackKnown();
      this.feedback('known', product.name, `${scan.count} ${unitOf(scan)} counted. The stock loads.`);
      const stock = await productStock(product.id);
      this.update(scan.id, { stock, stockPending: false });
      const now = this.state.scans.find((s) => s.id === scan.id);
      if (now && this.state.feedback?.title === product.name) this.feedback('known', product.name, countDetail(now));
    } else {
      feedbackUnknown();
      this.feedback('unknown', 'Unknown barcode', scan.lookupPending ? `${code}. The lookup runs.` : `${code}. No lookup for this code.`);
    }
    if (scan.lookupPending) {
      const lookup = await lookupCode(code);
      this.update(scan.id, { lookup, lookupPending: false });
    }
  }

  // Variant B: a product that Grocy has at this location and that the user
  // did not scan. The row gets a count of zero at this location.
  notHere(item: StockedProduct, locationId: string) {
    if (this.state.scans.some((s) => s.product?.id === item.productId)) return;
    const d = this.state.defaults;
    const scan: PendingScan = {
      id: this.nextId++,
      code: item.barcode,
      format: 'not-here',
      bookingType: 'inventory',
      product: {
        id: item.productId, name: item.name, purchaseUnit: item.stockUnit, stockUnit: item.stockUnit, defaultLocationId: null,
        barcodeAmount: null, barcodeUnit: null, barcodeStoreId: null, barcodeLastPrice: null, barcodeNote: null,
      },
      lookup: null,
      lookupPending: false,
      stock: null,
      stockPending: true,
      count: 0,
      unit: null,
      locationId,
      productGroupId: d.productGroupId,
      dueDate: dueDateOf(d.dueRule),
      scannedAt: new Date(),
      scanCount: 0,
      source: 'not-here',
    };
    this.set({ scans: [scan, ...this.state.scans] });
    void productStock(item.productId).then((stock) => this.update(scan.id, { stock, stockPending: false }));
  }

  update(id: number, patch: Partial<PendingScan>) {
    this.set({ scans: this.state.scans.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  changeCount(id: number, delta: number) {
    const scan = this.state.scans.find((s) => s.id === id);
    if (!scan) return;
    this.update(id, { count: Math.max(0, scan.count + delta) });
  }

  setCount(id: number, count: number) {
    this.update(id, { count: Math.max(0, count) });
  }

  remove(id: number) {
    this.set({ scans: this.state.scans.filter((s) => s.id !== id) });
  }

  private flashTimer = 0;
  private feedbackTimer = 0;

  private feedback(kind: Feedback['kind'], title: string, detail: string) {
    const id = this.nextFeedback++;
    this.set({ flash: kind, feedback: { id, kind, title, detail } });
    clearTimeout(this.flashTimer);
    clearTimeout(this.feedbackTimer);
    this.flashTimer = window.setTimeout(() => this.set({ flash: null }), 700);
    this.feedbackTimer = window.setTimeout(() => {
      if (this.state.feedback?.id === id) this.set({ feedback: null });
    }, kind === 'unknown' ? 3000 : 1800);
  }
}

// The feedback line for a known product: the count next to the stock.
function countDetail(scan: PendingScan) {
  const unit = unitOf(scan);
  if (!scan.stock) return `${scan.count} ${unit} counted`;
  return `${scan.count} ${unit} counted · ${scan.stock.stockAmount} ${scan.stock.stockUnit} in Grocy`;
}

export function dueDateOf(rule: DueRule): string | null {
  if (rule.kind === 'none') return null;
  if (rule.kind === 'date') return rule.date || null;
  const d = new Date();
  d.setDate(d.getDate() + rule.days);
  return d.toISOString().slice(0, 10);
}

// The empty unit means the stock unit for Inventory (ADR 0010).
export function unitOf(scan: PendingScan) {
  return scan.unit ?? scan.stock?.stockUnit ?? scan.product?.stockUnit ?? '';
}

// True when the count and the stock are in the same unit, so that the
// difference means something. A product barcode with its own unit needs
// the conversion of the product; the prototype does not convert.
export function sameUnit(scan: PendingScan) {
  return scan.unit === null || scan.unit === (scan.stock?.stockUnit ?? scan.product?.stockUnit);
}

// The stock of the product at one location.
export function stockAt(scan: PendingScan, locationId: string | null) {
  if (!scan.stock || locationId === null) return 0;
  return scan.stock.perLocation.find((l) => l.locationId === locationId)?.amount ?? 0;
}

export function nameOf(rows: { id: string; name: string }[] | undefined, id: string | null, fallback = 'Product default') {
  if (id === null) return fallback;
  return rows?.find((r) => r.id === id)?.name ?? `#${id}`;
}

export function dueRuleLabel(rule: DueRule) {
  if (rule.kind === 'none') return 'Product default';
  if (rule.kind === 'days') return `+${rule.days} days`;
  return rule.date || 'Pick a date';
}

export function timeOf(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

let session: Session | null = null;

export function getSession(force: Force) {
  session ??= new Session(force);
  return session;
}

export function useSession(force: Force): [SessionState, Session] {
  const s = getSession(force);
  const state = useSyncExternalStore(s.subscribe, s.get, s.get);
  return [state, s];
}
