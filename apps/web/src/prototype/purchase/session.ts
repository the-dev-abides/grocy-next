// PROTOTYPE. Throwaway. The scan session of ADR 0010: the time between the
// open and the close of the scan screen, with the defaults that the screen
// copies into each pending scan. Nothing here is stored. One store object
// holds the state; the variants read it with `useSession`.
import { useSyncExternalStore } from 'react';
import { audioUnlocked, feedbackKnown, feedbackRepeat, feedbackUnknown, unlockAudio } from './feedback';
import { Scanner, type ScannerStatus } from './scanner';
import type { Force, Found } from './decoder';
import {
  loadCatalog,
  lookupApplies,
  codeForms,
  lookupCode,
  resolveCode,
  type Catalog,
  type LookupResult,
  type ResolvedProduct,
} from './server';

export type DueRule = { kind: 'none' } | { kind: 'days'; days: number } | { kind: 'date'; date: string };
export type PriceType = 'unit' | 'total';

export interface Defaults {
  locationId: string | null;
  productGroupId: string | null;
  storeId: string | null;
  dueRule: DueRule;
  price: string;
  priceType: PriceType;
}

export interface PendingScan {
  id: number;
  code: string;
  format: string;
  bookingType: 'purchase';
  product: ResolvedProduct | null;
  lookup: LookupResult | null;
  lookupPending: boolean;
  amount: number;
  unit: string | null;
  locationId: string | null;
  productGroupId: string | null;
  storeId: string | null;
  dueDate: string | null;
  price: string;
  priceType: PriceType;
  note: string | null;
  scannedAt: Date;
  scanCount: number;
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
  // The on-screen feedback. `flash` is the frame colour for 0.7 s; `feedback`
  // is the message for about 2 s. The store clears both on a timer.
  flash: Feedback['kind'] | null;
  feedback: Feedback | null;
  // The price for the next scan (variant D). The scan takes it; the price
  // clears, the price type stays.
  nextPrice: { price: string; priceType: PriceType };
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
  storeId: null,
  dueRule: { kind: 'none' },
  price: '',
  priceType: 'unit',
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
      catalog: null, defaults: initialDefaults, scans: [], flash: null, feedback: null, nextPrice: { price: '', priceType: 'unit' }, scanner: initialScanner, audio: false, force,
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

  setNextPrice(patch: Partial<{ price: string; priceType: PriceType }>) {
    this.set({ nextPrice: { ...this.state.nextPrice, ...patch } });
  }

  private takeNextPrice(): { price: string; priceType: PriceType } | null {
    const next = this.state.nextPrice;
    if (!next.price) return null;
    this.set({ nextPrice: { price: '', priceType: next.priceType } });
    return next;
  }

  // The camera. One scanner at a time, bound to the video element of the
  // variant that is on the screen.
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

  // One typed code goes through the same path as a scanned one.
  typeCode(code: string) {
    void this.scan({ rawValue: code.trim(), format: 'typed' });
  }

  // The create call of ADR 0010: resolve the code, copy the defaults, merge
  // a repeat scan, queue the lookup.
  private async scan(found: Found) {
    const code = found.rawValue;
    const forms = codeForms(code).map((f) => f.toLowerCase());
    const open = this.state.scans.find((s) => forms.includes(s.code.toLowerCase()));
    if (open) {
      const add = open.product?.barcodeAmount ?? 1;
      const typed = this.takeNextPrice();
      const merged = { ...open, amount: open.amount + add, scanCount: open.scanCount + 1, ...(typed ?? {}) };
      this.set({ scans: [merged, ...this.state.scans.filter((s) => s.id !== open.id)] });
      feedbackRepeat();
      this.feedback('repeat', merged.product?.name ?? merged.lookup?.name ?? code, `${merged.amount} ${unitOf(merged)}`.trim());
      return;
    }
    const product = await resolveCode(code);
    const d = this.state.defaults;
    const typed = this.takeNextPrice();
    const scan: PendingScan = {
      id: this.nextId++,
      code,
      format: found.format,
      bookingType: 'purchase',
      product,
      lookup: null,
      lookupPending: !product && lookupApplies(code),
      amount: product?.barcodeAmount ?? 1,
      unit: product?.barcodeUnit ?? null,
      locationId: d.locationId,
      productGroupId: d.productGroupId,
      storeId: d.storeId ?? product?.barcodeStoreId ?? null,
      dueDate: dueDateOf(d.dueRule),
      price: typed?.price || d.price || product?.barcodeLastPrice || '',
      priceType: typed ? typed.priceType : d.price ? d.priceType : product?.barcodeLastPrice ? 'total' : d.priceType,
      note: product?.barcodeNote ?? null,
      scannedAt: new Date(),
      scanCount: 1,
    };
    this.set({ scans: [scan, ...this.state.scans] });
    if (product) {
      feedbackKnown();
      this.feedback('known', product.name, `${scan.amount} ${unitOf(scan)}`.trim());
    } else {
      feedbackUnknown();
      this.feedback('unknown', 'Unknown barcode', scan.lookupPending ? `${code}. The lookup runs.` : `${code}. No lookup for this code.`);
    }
    if (scan.lookupPending) {
      const lookup = await lookupCode(code);
      this.update(scan.id, { lookup, lookupPending: false });
    }
  }

  update(id: number, patch: Partial<PendingScan>) {
    this.set({ scans: this.state.scans.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  changeAmount(id: number, delta: number) {
    const scan = this.state.scans.find((s) => s.id === id);
    if (!scan) return;
    this.update(id, { amount: Math.max(0, scan.amount + delta) });
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

export function dueDateOf(rule: DueRule): string | null {
  if (rule.kind === 'none') return null;
  if (rule.kind === 'date') return rule.date || null;
  const d = new Date();
  d.setDate(d.getDate() + rule.days);
  return d.toISOString().slice(0, 10);
}

export function unitOf(scan: PendingScan) {
  return scan.unit ?? scan.product?.purchaseUnit ?? '';
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

export function priceLabel(d: { price: string; priceType: PriceType }) {
  if (!d.price) return 'None';
  return `${d.price} / ${d.priceType === 'unit' ? 'unit' : 'total'}`;
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
