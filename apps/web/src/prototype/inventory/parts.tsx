// PROTOTYPE. Throwaway. The parts that the three Inventory variants share:
// the collapsible defaults section of variant D of the Purchase prototype
// with the three Inventory defaults, the swipe row, the difference badge,
// and the name of a pending scan.
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Catalog } from '../purchase/server';
import { dueRuleLabel, nameOf, sameUnit, unitOf, type Defaults, type DueRule, type PendingScan } from './session';

const NONE = 'none';

function RowSelect({ id, label, rows, value, onChange, none = 'Product default' }: { id: string; label: string; rows: { id: string; name: string }[]; value: string | null; onChange: (v: string | null) => void; none?: string }) {
  const items: Record<string, string> = { [NONE]: none };
  for (const r of rows) items[r.id] = r.name;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select items={items} value={value ?? NONE} onValueChange={(v) => onChange(v === NONE || v === null ? null : String(v))}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{none}</SelectItem>
          {rows.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function InventoryFields({ catalog, defaults, onChange, idPrefix = 'i', locationNone = 'Product default' }: { catalog: Catalog | null; defaults: Defaults; onChange: (patch: Partial<Defaults>) => void; idPrefix?: string; locationNone?: string }) {
  const due = defaults.dueRule;
  const dueKinds: Record<string, string> = { none: 'Product default', days: 'Days from today', date: 'Fixed date' };
  return (
    <>
      <RowSelect id={`${idPrefix}-location`} label="Location" rows={catalog?.locations ?? []} value={defaults.locationId} onChange={(locationId) => onChange({ locationId })} none={locationNone} />
      <RowSelect id={`${idPrefix}-group`} label="Product group" rows={catalog?.productGroups ?? []} value={defaults.productGroupId} onChange={(productGroupId) => onChange({ productGroupId })} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-due`}>Due date of added stock</Label>
        <div className="flex gap-2">
          <Select
            items={dueKinds}
            value={due.kind}
            onValueChange={(kind) => {
              const rule: DueRule = kind === 'days' ? { kind: 'days', days: 7 } : kind === 'date' ? { kind: 'date', date: '' } : { kind: 'none' };
              onChange({ dueRule: rule });
            }}
          >
            <SelectTrigger id={`${idPrefix}-due`} className="min-w-0 flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(dueKinds).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {due.kind === 'days' && (
            <Input type="number" inputMode="numeric" min={0} className="w-20" aria-label="Days" value={due.days} onChange={(e) => onChange({ dueRule: { kind: 'days', days: Number(e.target.value) || 0 } })} />
          )}
          {due.kind === 'date' && (
            <Input type="date" className="w-36" aria-label="Date" value={due.date} onChange={(e) => onChange({ dueRule: { kind: 'date', date: e.target.value } })} />
          )}
        </div>
      </div>
    </>
  );
}

// The collapsible defaults section of variant D. Collapsed, one summary
// line. Open, the form.
export function DefaultsSection({ catalog, defaults, onChange, onReset, locationNone }: { catalog: Catalog | null; defaults: Defaults; onChange: (p: Partial<Defaults>) => void; onReset: () => void; locationNone?: string }) {
  const [open, setOpen] = useState(false);
  const summary = [
    nameOf(catalog?.locations, defaults.locationId, locationNone ?? 'Product default'),
    dueRuleLabel(defaults.dueRule),
    nameOf(catalog?.productGroups, defaults.productGroupId, 'default group'),
  ].join(' · ');
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="hover:bg-muted flex h-11 w-full items-center gap-2 border-b px-3 text-left"
      >
        {open ? <ChevronDown className="text-muted-foreground size-4 shrink-0" /> : <ChevronRight className="text-muted-foreground size-4 shrink-0" />}
        <span className="font-medium">Defaults</span>
        {!open && <span className="text-muted-foreground min-w-0 flex-1 truncate">{summary}</span>}
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-b p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <InventoryFields catalog={catalog} defaults={defaults} onChange={onChange} locationNone={locationNone} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onReset}>Reset</Button>
            <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      )}
    </>
  );
}

// The name of a pending scan: the product, the lookup result, or the bare
// code, from the three facts of ADR 0010.
export function ScanName({ scan }: { scan: PendingScan }) {
  if (scan.product) return <span className="font-medium">{scan.product.name}</span>;
  if (scan.lookup)
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="truncate font-medium">{scan.lookup.name}</span>
        <Badge variant="outline" className="font-normal">New product</Badge>
      </span>
    );
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground font-mono">{scan.code}</span>
      <Badge variant="secondary" className="font-normal">{scan.lookupPending ? 'Lookup runs' : 'No product'}</Badge>
    </span>
  );
}

// The flags that change what the count means.
export function StockFlags({ scan }: { scan: PendingScan }) {
  if (!scan.stock) return null;
  return (
    <>
      {scan.stock.isParent && <Badge variant="outline" className="font-normal">Parent: own stock only</Badge>}
      {scan.stock.tareWeight !== null && <Badge variant="outline" className="font-normal">Tare weight {scan.stock.tareWeight}: count the gross weight</Badge>}
      {!sameUnit(scan) && <Badge variant="outline" className="font-normal">Counted in {unitOf(scan)}, stock in {scan.stock.stockUnit}</Badge>}
    </>
  );
}

// The difference between the new total and the stock in Grocy: green when
// stock is added, red when stock is removed, grey when nothing changes.
export function Diff({ newTotal, stock, pending, converted = true, className }: { newTotal: number; stock: number | null; pending?: boolean; converted?: boolean; className?: string }) {
  if (pending || stock === null) return <span className={cn('text-muted-foreground text-xs', className)}>…</span>;
  // A count in a product barcode unit needs the conversion of the product
  // before it compares with the stock. The prototype does not convert.
  if (!converted) return <span className={cn('text-muted-foreground text-xs', className)}>difference needs the conversion</span>;
  const diff = round(newTotal - stock);
  if (diff === 0) return <span className={cn('text-muted-foreground rounded px-1.5 text-xs font-medium', className)}>no change</span>;
  return (
    <span className={cn('rounded px-1.5 text-xs font-medium tabular-nums', diff > 0 ? 'bg-green-600/15 text-green-700 dark:text-green-400' : 'bg-red-600/15 text-red-700 dark:text-red-400', className)}>
      {diff > 0 ? `+${diff}` : diff}
    </span>
  );
}

export function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

// A list row that the user swipes to the left to reject. A short drag snaps
// back. A drag past a third of the row width rejects. Copied from variant D
// of the Purchase prototype.
const REJECT_FRACTION = 0.34;

export function SwipeRow({ onReject, className, children }: { onReject: () => void; className?: string; children: ReactNode }) {
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState(false);
  const start = useRef<{ x: number; y: number; id: number; active: boolean } | null>(null);
  const row = useRef<HTMLLIElement>(null);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, active: false };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.active) {
      if (Math.abs(my) > 8 && Math.abs(my) > Math.abs(mx)) { start.current = null; return; }
      if (mx > -10) return;
      s.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDx(Math.min(0, mx));
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.active) return;
    const width = row.current?.clientWidth ?? 360;
    if (-dx > width * REJECT_FRACTION) {
      setGone(true);
      setDx(-width);
      window.setTimeout(onReject, 150);
    } else {
      setDx(0);
    }
  };

  return (
    <li ref={row} className="relative overflow-hidden">
      <div aria-hidden="true" className="bg-destructive absolute inset-0 flex items-center justify-end gap-2 pr-4 text-sm font-medium text-white">
        <Trash2 className="size-4" /> Reject
      </div>
      <div
        className={cn('relative touch-pan-y', className, (dx === 0 || gone) && 'transition-transform duration-150')}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {children}
      </div>
    </li>
  );
}

// The sticky footer: the count of the rows and Done.
export function Footer({ scans, onDone, children }: { scans: PendingScan[]; onDone: () => void; children?: ReactNode }) {
  const changes = scans.filter((s) => s.stock && round(s.count - s.stock.stockAmount) !== 0).length;
  return (
    <div className="bg-background sticky bottom-0 flex flex-col border-t pb-12 lg:pb-0">
      {children}
      <div className="flex h-12 items-center gap-2 px-3">
        <span className="flex-1">{scans.length} {scans.length === 1 ? 'product' : 'products'} counted{scans.length > 0 ? `, ${changes} with a change` : ''}</span>
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
