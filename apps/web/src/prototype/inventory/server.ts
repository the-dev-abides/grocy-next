// PROTOTYPE. Throwaway. The stock reads that the Inventory scan screen
// needs and that the Purchase stand-in does not have.
//
// The real server reads the current stock of a product at accept and at
// display time (ADR 0010). This stand-in reads it from Grocy through the
// dev server proxy under `/grocy`. When Grocy is not reachable, a built-in
// table answers. Nothing is written anywhere.

export interface LocationStock {
  locationId: string;
  locationName: string;
  amount: number;
}

export interface ProductStock {
  productId: string;
  // The own stock of the product, in the stock unit, across all locations.
  // This is the amount that a Grocy inventory compares with.
  stockAmount: number;
  stockUnit: string;
  perLocation: LocationStock[];
  // A parent product counts own stock only. The screen says so.
  isParent: boolean;
  // A tare weight product takes the gross weight. The screen says so.
  tareWeight: number | null;
}

// One product with stock at one location, for the "not scanned" list.
export interface StockedProduct {
  productId: string;
  name: string;
  stockUnit: string;
  hereAmount: number;
  totalAmount: number;
  barcode: string | null;
}

const builtinStock: Record<string, ProductStock> = {
  '1': { productId: '1', stockAmount: 4, stockUnit: 'Bottle', perLocation: [{ locationId: '1', locationName: 'Fridge', amount: 4 }], isParent: false, tareWeight: null },
  '2': { productId: '2', stockAmount: 2, stockUnit: 'Pack', perLocation: [{ locationId: '1', locationName: 'Fridge', amount: 2 }], isParent: false, tareWeight: null },
  '3': { productId: '3', stockAmount: 1500, stockUnit: 'Gram', perLocation: [{ locationId: '2', locationName: 'Pantry', amount: 1500 }], isParent: false, tareWeight: null },
  '4': { productId: '4', stockAmount: 9, stockUnit: 'Bottle', perLocation: [{ locationId: '4', locationName: 'Cellar', amount: 6 }, { locationId: '1', locationName: 'Fridge', amount: 3 }], isParent: false, tareWeight: null },
  '5': { productId: '5', stockAmount: 0, stockUnit: 'Piece', perLocation: [], isParent: false, tareWeight: null },
};
const builtinNames: Record<string, string> = { '1': 'Whole milk 1 l', '2': 'Butter 250 g', '3': 'Basmati rice 1 kg', '4': 'Sparkling water 1.5 l', '5': 'Banana' };
const builtinBarcodes: Record<string, string> = { '1': '4006381333931', '2': '4000417025005', '3': '5000159461122', '4': '4104420038110', '5': '4011' };

let grocyReachable: boolean | null = null;

async function grocy<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`/grocy/api${path}`, { headers: { Accept: 'application/json' } });
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('json')) throw new Error(`Grocy proxy answered ${response.status}`);
    if (!response.ok) return null;
    grocyReachable = true;
    return (await response.json()) as T;
  } catch {
    grocyReachable = false;
    return null;
  }
}

interface GrocyDetails {
  product: { id: number; has_childs?: number | null; enable_tare_weight_handling?: number; tare_weight?: number | string };
  stock_amount: number | string;
  quantity_unit_stock: { id: number; name: string };
}

interface GrocyProductLocation {
  location_id: number;
  location_name: string;
  amount: number | string;
}

export async function productStock(productId: string): Promise<ProductStock | null> {
  if (grocyReachable === false) return builtinStock[productId] ?? null;
  const details = await grocy<GrocyDetails>(`/stock/products/${productId}`);
  if (!details) return builtinStock[productId] ?? null;
  const locations = (await grocy<GrocyProductLocation[]>(`/stock/products/${productId}/locations`)) ?? [];
  const tare = Number(details.product.enable_tare_weight_handling ?? 0) === 1;
  return {
    productId,
    stockAmount: Number(details.stock_amount),
    stockUnit: details.quantity_unit_stock?.name ?? '',
    perLocation: locations.map((l) => ({ locationId: String(l.location_id), locationName: l.location_name, amount: Number(l.amount) })),
    isParent: Number(details.product.has_childs ?? 0) === 1,
    tareWeight: tare ? Number(details.product.tare_weight ?? 0) : null,
  };
}

interface GrocyStockEntry {
  product_id: number;
  amount: number | string;
}

interface GrocyStockRow {
  product_id: number;
  amount: number | string;
  product: { id: number; name: string; qu_id_stock: number };
}

let stockRows: Promise<GrocyStockRow[] | null> | null = null;
let unitRows: Promise<{ id: number; name: string }[] | null> | null = null;
let barcodeRows: Promise<{ product_id: number; barcode: string }[] | null> | null = null;

// The products with stock at one location, with their amount there and
// their total own stock. The real server has one query for this.
export async function stockAtLocation(locationId: string): Promise<StockedProduct[]> {
  if (grocyReachable === false) return builtinAtLocation(locationId);
  const entries = await grocy<GrocyStockEntry[]>(`/stock/locations/${locationId}/entries`);
  if (!entries) return builtinAtLocation(locationId);
  stockRows ??= grocy<GrocyStockRow[]>('/stock');
  unitRows ??= grocy<{ id: number; name: string }[]>('/objects/quantity_units');
  barcodeRows ??= grocy<{ product_id: number; barcode: string }[]>('/objects/product_barcodes');
  const [rows, units, barcodes] = await Promise.all([stockRows, unitRows, barcodeRows]);
  const unitName = new Map((units ?? []).map((u) => [u.id, u.name]));
  const byProduct = new Map<number, number>();
  for (const e of entries) byProduct.set(e.product_id, (byProduct.get(e.product_id) ?? 0) + Number(e.amount));
  const result: StockedProduct[] = [];
  for (const [productId, hereAmount] of byProduct) {
    const row = rows?.find((r) => r.product_id === productId);
    if (!row) continue;
    result.push({
      productId: String(productId),
      name: row.product.name,
      stockUnit: unitName.get(row.product.qu_id_stock) ?? '',
      hereAmount,
      totalAmount: Number(row.amount),
      barcode: barcodes?.find((b) => b.product_id === productId)?.barcode ?? null,
    });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function builtinAtLocation(locationId: string): StockedProduct[] {
  return Object.values(builtinStock)
    .flatMap((s) => {
      const here = s.perLocation.find((l) => l.locationId === locationId);
      if (!here) return [];
      return [{ productId: s.productId, name: builtinNames[s.productId], stockUnit: s.stockUnit, hereAmount: here.amount, totalAmount: s.stockAmount, barcode: builtinBarcodes[s.productId] ?? null }];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
