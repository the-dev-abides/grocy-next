// PROTOTYPE. Throwaway. A stand-in for the Next API behind the scan screen.
//
// The real server resolves the code against Grocy and queues the lookup
// (ADR 0010, ADR 0011). This stand-in does the same from the browser: it
// reads Grocy through the dev server proxy under `/grocy`, and it asks Open
// Food Facts directly. When Grocy is not reachable, a small built-in product
// table answers instead, so that the screen can be tried with no Grocy.
// Nothing is written anywhere. The pending scans live in memory.

export interface NamedRow {
  id: string;
  name: string;
}

export interface Catalog {
  source: 'grocy' | 'builtin';
  locations: NamedRow[];
  stores: NamedRow[];
  productGroups: NamedRow[];
}

export interface ResolvedProduct {
  id: string;
  name: string;
  purchaseUnit: string;
  stockUnit: string;
  defaultLocationId: string | null;
  // The defaults of the matched product barcode (the glossary term).
  barcodeAmount: number | null;
  barcodeUnit: string | null;
  barcodeStoreId: string | null;
  barcodeLastPrice: string | null;
  barcodeNote: string | null;
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

const builtinCatalog: Catalog = {
  source: 'builtin',
  locations: [
    { id: '1', name: 'Fridge' },
    { id: '2', name: 'Pantry' },
    { id: '3', name: 'Freezer' },
    { id: '4', name: 'Cellar' },
  ],
  stores: [
    { id: '1', name: 'Rewe' },
    { id: '2', name: 'Edeka' },
    { id: '3', name: 'Aldi' },
  ],
  productGroups: [
    { id: '1', name: 'Dairy' },
    { id: '2', name: 'Dry goods' },
    { id: '3', name: 'Drinks' },
    { id: '4', name: 'Fruit and vegetables' },
  ],
};

const builtinProducts: Record<string, ResolvedProduct> = {
  '4006381333931': {
    id: '1', name: 'Whole milk 1 l', purchaseUnit: 'Bottle', stockUnit: 'Bottle', defaultLocationId: '1',
    barcodeAmount: null, barcodeUnit: null, barcodeStoreId: '1', barcodeLastPrice: '1.09', barcodeNote: null,
  },
  '4000417025005': {
    id: '2', name: 'Butter 250 g', purchaseUnit: 'Pack', stockUnit: 'Pack', defaultLocationId: '1',
    barcodeAmount: null, barcodeUnit: null, barcodeStoreId: null, barcodeLastPrice: '2.49', barcodeNote: null,
  },
  '5000159461122': {
    id: '3', name: 'Basmati rice 1 kg', purchaseUnit: 'Bag', stockUnit: 'Gram', defaultLocationId: '2',
    barcodeAmount: null, barcodeUnit: null, barcodeStoreId: null, barcodeLastPrice: '2.99', barcodeNote: null,
  },
  '4104420038110': {
    id: '4', name: 'Sparkling water 1.5 l', purchaseUnit: 'Bottle', stockUnit: 'Bottle', defaultLocationId: '4',
    barcodeAmount: 6, barcodeUnit: 'Bottle', barcodeStoreId: '2', barcodeLastPrice: '4.49', barcodeNote: 'Crate of 6',
  },
  '4011': {
    id: '5', name: 'Banana', purchaseUnit: 'Piece', stockUnit: 'Piece', defaultLocationId: '2',
    barcodeAmount: null, barcodeUnit: null, barcodeStoreId: null, barcodeLastPrice: null, barcodeNote: null,
  },
};

let grocyReachable: boolean | null = null;

async function grocy<T>(path: string): Promise<{ ok: true; body: T } | { ok: false; status: number }> {
  const response = await fetch(`/grocy/api${path}`, { headers: { Accept: 'application/json' } });
  if (response.status >= 500 || response.status === 404) {
    // 404 with an HTML body is the Vite dev server with no proxy.
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('json')) throw new Error(`Grocy proxy answered ${response.status}`);
  }
  if (!response.ok) return { ok: false, status: response.status };
  return { ok: true, body: (await response.json()) as T };
}

export async function loadCatalog(): Promise<Catalog> {
  try {
    const [locations, stores, groups] = await Promise.all([
      grocy<{ id: number; name: string }[]>('/objects/locations'),
      grocy<{ id: number; name: string }[]>('/objects/shopping_locations'),
      grocy<{ id: number; name: string }[]>('/objects/product_groups'),
    ]);
    if (!locations.ok || !stores.ok || !groups.ok) throw new Error('Grocy refused the catalog');
    grocyReachable = true;
    const rows = (list: { id: number; name: string }[]) =>
      list.map((r) => ({ id: String(r.id), name: r.name })).sort((a, b) => a.name.localeCompare(b.name));
    return { source: 'grocy', locations: rows(locations.body), stores: rows(stores.body), productGroups: rows(groups.body) };
  } catch {
    grocyReachable = false;
    return builtinCatalog;
  }
}

interface GrocyProductDetails {
  product: { id: number; name: string; location_id: number | null };
  product_barcodes?: { barcode: string; amount: number | null; qu_id: number | null; shopping_location_id: number | null; last_price: number | null; note: string | null }[];
  quantity_unit_stock: { id: number; name: string };
  default_quantity_unit_purchase: { id: number; name: string };
}

// A UPC-A read by ZXing comes back as a 13-digit EAN with a leading zero.
// Grocy stores the 12 digits that its own scanner gave. The server must
// match both forms. Finding of this prototype; see the ticket.
export function codeForms(code: string): string[] {
  if (/^0\d{12}$/.test(code)) return [code, code.slice(1)];
  if (/^\d{12}$/.test(code)) return [code, `0${code}`];
  return [code];
}

// The resolution order of ADR 0011: a Grocycode, then a product barcode.
export async function resolveCode(code: string): Promise<ResolvedProduct | null> {
  for (const form of codeForms(code)) {
    const found = await resolveOneForm(form);
    if (found) return found;
  }
  return null;
}

async function resolveOneForm(code: string): Promise<ResolvedProduct | null> {
  const grocycode = /^grcy:p:(\d+)/i.exec(code);
  if (grocyReachable === false) {
    if (grocycode) return Object.values(builtinProducts).find((p) => p.id === grocycode[1]) ?? null;
    return builtinProducts[code.toLowerCase()] ?? builtinProducts[code] ?? null;
  }
  try {
    const result = grocycode
      ? await grocy<GrocyProductDetails>(`/stock/products/${grocycode[1]}`)
      : await grocy<GrocyProductDetails>(`/stock/products/by-barcode/${encodeURIComponent(code)}`);
    if (!result.ok) return null;
    const d = result.body;
    const barcode = d.product_barcodes?.find((b) => b.barcode.toLowerCase() === code.toLowerCase()) ?? null;
    const units = await unitNames();
    return {
      id: String(d.product.id),
      name: d.product.name,
      purchaseUnit: d.default_quantity_unit_purchase?.name ?? '',
      stockUnit: d.quantity_unit_stock?.name ?? '',
      defaultLocationId: d.product.location_id == null ? null : String(d.product.location_id),
      barcodeAmount: barcode?.amount ?? null,
      barcodeUnit: barcode?.qu_id == null ? null : (units.get(String(barcode.qu_id)) ?? null),
      barcodeStoreId: barcode?.shopping_location_id == null ? null : String(barcode.shopping_location_id),
      barcodeLastPrice: barcode?.last_price == null ? null : String(barcode.last_price),
      barcodeNote: barcode?.note ?? null,
    };
  } catch {
    grocyReachable = false;
    return builtinProducts[code] ?? null;
  }
}

let unitCache: Map<string, string> | null = null;
async function unitNames() {
  if (unitCache) return unitCache;
  const r = await grocy<{ id: number; name: string }[]>('/objects/quantity_units');
  unitCache = new Map(r.ok ? r.body.map((u) => [String(u.id), u.name]) : []);
  return unitCache;
}

// The online lookup of ADR 0011: one v3 read with `product_type=all`.
// Only for a code of 8, 12, 13, or 14 digits.
export function lookupApplies(code: string) {
  return /^\d{8}$|^\d{12,14}$/.test(code);
}

export async function lookupCode(code: string): Promise<LookupResult | null> {
  const fields = 'product_name,brands,quantity,product_quantity,product_quantity_unit,image_front_url';
  const url = `https://world.openfoodfacts.org/api/v3/product/${code}?product_type=all&fields=${fields}`;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      status?: string;
      product?: { product_name?: string; brands?: string; quantity?: string; product_quantity?: number | string; product_quantity_unit?: string; image_front_url?: string };
    };
    if (body.status !== 'success' || !body.product?.product_name) return null;
    const host = new URL(response.url).host;
    const service = host.includes('beauty') ? 'Open Beauty Facts'
      : host.includes('petfood') ? 'Open Pet Food Facts'
      : host.includes('products') ? 'Open Products Facts'
      : 'Open Food Facts';
    const p = body.product;
    return {
      service,
      name: p.product_name ?? '',
      brand: p.brands || null,
      quantityText: p.quantity || null,
      netQuantity: p.product_quantity == null || p.product_quantity === '' ? null : Number(p.product_quantity),
      netUnit: p.product_quantity_unit || null,
      imageUrl: p.image_front_url || null,
      sourceUrl: `https://${host}/product/${code}`,
    };
  } catch {
    return null;
  }
}
