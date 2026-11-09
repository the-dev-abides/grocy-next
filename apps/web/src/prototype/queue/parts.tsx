// PROTOTYPE. Throwaway. The parts that the three review queue variants
// share: the name of a pending scan, the state badge, the Inventory
// preview, the result panel of a bulk run, the attribution line, and the
// small form fields.
import { useState, type ReactNode } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { consumePlan, round, rowName, stateOf, unitOf, type AcceptResult, type Catalog, type NamedRow, type PendingScan, type RowState } from './queue';

// The name of a pending scan: the product, the write-in name, the lookup
// result, or the bare code, from the three facts of ADR 0010.
export function ScanName({ scan, className }: { scan: PendingScan; className?: string }) {
  if (scan.product) return <span className={cn('font-medium', className)}>{scan.product.name}</span>;
  if (scan.writeInName) return <span className={cn('font-medium', className)}>{scan.writeInName}</span>;
  if (scan.lookup) return <span className={cn('font-medium', className)}>{scan.lookup.name}{scan.lookup.brand ? <span className="text-muted-foreground font-normal"> · {scan.lookup.brand}</span> : null}</span>;
  return <span className={cn('text-muted-foreground font-mono', className)}>{scan.code}</span>;
}

// The second line under the name: the code, the source, and the lookup
// service as the attribution link of ADR 0011.
export function ScanMeta({ scan, className }: { scan: PendingScan; className?: string }) {
  return (
    <span className={cn('text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs', className)}>
      {scan.code && scan.product && <span className="font-mono">{scan.code}</span>}
      {scan.lookup && (
        <a href={scan.lookup.sourceUrl} target="_blank" rel="noreferrer" className="underline">{scan.lookup.service}</a>
      )}
      {scan.note && <span className="truncate">{scan.note}</span>}
    </span>
  );
}

const stateStyle: Record<RowState['kind'], { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  ready: { label: 'Ready', variant: 'outline' },
  'no-count': { label: 'Needs a count', variant: 'secondary' },
  'lookup-runs': { label: 'Lookup runs', variant: 'secondary' },
  'new-product': { label: 'New product', variant: 'secondary' },
  'no-product': { label: 'No product', variant: 'secondary' },
  error: { label: 'Accept failed', variant: 'destructive' },
};

export function StateBadge({ scan, className }: { scan: PendingScan; className?: string }) {
  const s = stateOf(scan);
  const style = stateStyle[s.kind];
  return <Badge variant={style.variant} className={cn('font-normal whitespace-nowrap', s.kind === 'ready' && 'text-muted-foreground', className)}>{style.label}</Badge>;
}

export function ErrorLine({ scan, className }: { scan: PendingScan; className?: string }) {
  if (!scan.error) return null;
  return (
    <p className={cn('text-destructive flex items-start gap-1 text-xs', className)}>
      <AlertTriangle className="mt-px size-3.5 shrink-0" /> <span>{scan.error}</span>
    </p>
  );
}

// The Inventory facts: the stock now, the difference, and what the accept
// does. Grocy has no field for a specific stock entry, so the screen shows
// the entries that a decrease takes from, in the Grocy order.
export function InventoryPreview({ scan, catalog, compact }: { scan: PendingScan; catalog: Catalog; compact?: boolean }) {
  const p = scan.product;
  if (!p || scan.bookingType !== 'inventory') return null;
  const unit = p.stockUnit;
  const gross = p.tareWeight !== null;
  const net = scan.amount === null ? null : gross ? round(scan.amount - p.tareWeight!) : scan.amount;
  const diff = net === null ? null : round(net - p.stock);
  return (
    <div className={cn('text-muted-foreground flex flex-col gap-0.5 text-xs', compact && 'flex-row flex-wrap items-center gap-x-1.5')}>
      <span>
        In Grocy: <span className="text-foreground tabular-nums">{p.stock} {unit}</span>
        {p.entries.length > 1 && !compact && <span> in {p.entries.length} stock entries</span>}
        {p.isParent && <span> · parent product, own stock only</span>}
        {gross && <span> · tare weight {p.tareWeight} {unit}, count the gross weight</span>}
      </span>
      {diff !== null && <DiffBadge diff={diff} unit={unit} />}
      {!compact && diff !== null && diff < 0 && (
        <span>
          Takes {consumePlan(p, -diff).map((e, i) => (
            <span key={e.entry.id}>{i > 0 ? ', ' : ''}{e.take} {unit} from the entry due {e.entry.dueDate} at {rowName(catalog.locations, e.entry.locationId)}{e.entry.open ? ' (open)' : ''}</span>
          ))}.
        </span>
      )}
      {!compact && diff !== null && diff > 0 && (
        <span>Adds one stock entry of {diff} {unit} at {rowName(catalog.locations, scan.locationId ?? p.defaultLocationId)}, due {scan.dueDate ?? 'the product default'}.</span>
      )}
      {!compact && net !== null && net < 0 && <span className="text-destructive">Below the tare weight. Grocy refuses this.</span>}
    </div>
  );
}

export function DiffBadge({ diff, unit }: { diff: number; unit: string }) {
  if (diff === 0) return <span className="text-muted-foreground rounded px-1.5 text-xs font-medium">no change</span>;
  return (
    <span className={cn('rounded px-1.5 text-xs font-medium tabular-nums', diff > 0 ? 'bg-green-600/15 text-green-700 dark:text-green-400' : 'bg-red-600/15 text-red-700 dark:text-red-400')}>
      {diff > 0 ? `+${diff}` : diff} {unit}
    </span>
  );
}

// The amount with its unit, as words. Inventory with no count: the stock
// as a grey placeholder, so the user sees what "no change" would be.
export function AmountText({ scan }: { scan: PendingScan }) {
  if (scan.amount === null) {
    if (scan.product && scan.bookingType === 'inventory') return <span className="text-muted-foreground">— <span className="block text-xs whitespace-normal md:inline">({scan.product.stock} {scan.product.stockUnit} now)</span></span>;
    return <span className="text-muted-foreground">—</span>;
  }
  return <span className="tabular-nums">{scan.amount} {unitOf(scan)}</span>;
}

// A lookup image. The Open Facts host can refuse the hotlink; the image
// then hides instead of showing a broken icon.
export function LookupImage({ src, className }: { src: string | null | undefined; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img src={src} alt="" className={className} onError={() => setFailed(true)} />;
}

// The results of a bulk run, one line per row.
export function ResultsPanel({ results, total, onClose }: { results: AcceptResult[]; total: number; onClose: () => void }) {
  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  const running = results.length < total;
  return (
    <div role="status" className="bg-muted/50 flex flex-col gap-1 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {running ? `${results.length} of ${total} done` : `${ok} booked`}
          {failed > 0 && `, ${failed} failed`}
        </span>
        {!running && <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>Close</Button>}
      </div>
      <ul className="flex flex-col gap-0.5 text-xs">
        {results.map((r) => (
          <li key={r.id} className="flex items-start gap-1.5">
            {r.ok ? <Check className="mt-px size-3.5 shrink-0 text-green-700 dark:text-green-400" /> : <X className="text-destructive mt-px size-3.5 shrink-0" />}
            <span><span className="font-medium">{r.name}</span>: {r.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Attribution({ scans }: { scans: PendingScan[] }) {
  const services = [...new Set(scans.filter((s) => s.lookup).map((s) => s.lookup!.service))];
  if (services.length === 0) return null;
  return (
    <p className="text-muted-foreground text-xs">
      Contains data from {services.map((s, i) => <span key={s}>{i > 0 ? ' and ' : ''}<a className="underline" href={`https://world.${s.toLowerCase().replace(/ /g, '')}.org`} target="_blank" rel="noreferrer">{s}</a></span>)}, available under the Open Database License.
    </p>
  );
}

// A confirm dialog for an action on many rows.
export function ConfirmDialog({ open, title, body, action, destructive, onConfirm, onClose }: { open: boolean; title: string; body: ReactNode; action: string; destructive?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={() => { onConfirm(); onClose(); }}>{action}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------- fields

export const NONE = '__none__';

export function RowSelect({ id, label, rows, value, onChange, none = 'Product default', keep, size }: { id: string; label?: string; rows: NamedRow[]; value: string | null | undefined; onChange: (v: string | null | undefined) => void; none?: string; keep?: string; size?: 'sm' | 'default' }) {
  const KEEP = '__keep__';
  const items: Record<string, string> = {};
  if (keep) items[KEEP] = keep;
  items[NONE] = none;
  for (const r of rows) items[r.id] = r.name;
  const current = value === undefined ? (keep ? KEEP : NONE) : value === null ? NONE : value;
  const field = (
    <Select items={items} value={current} onValueChange={(v) => onChange(v === KEEP ? undefined : v === NONE || v === null ? null : String(v))}>
      <SelectTrigger id={id} size={size} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {keep && <SelectItem value={KEEP}>{keep}</SelectItem>}
        <SelectItem value={NONE}>{none}</SelectItem>
        {rows.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
  if (!label) return field;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {field}
    </div>
  );
}

export function UnitSelect({ id, label, units, value, onChange, none, size }: { id: string; label?: string; units: string[]; value: string | null; onChange: (v: string | null) => void; none: string; size?: 'sm' | 'default' }) {
  const items: Record<string, string> = { [NONE]: none };
  for (const u of units) items[u] = u;
  const field = (
    <Select items={items} value={value ?? NONE} onValueChange={(v) => onChange(v === NONE || v === null ? null : String(v))}>
      <SelectTrigger id={id} size={size} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{none}</SelectItem>
        {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
      </SelectContent>
    </Select>
  );
  if (!label) return field;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {field}
    </div>
  );
}

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

// A number field that commits on Enter and on blur.
export function NumberField({ id, value, onCommit, placeholder, className, autoFocus, size }: { id?: string; value: number | null; onCommit: (v: number | null) => void; placeholder?: string; className?: string; autoFocus?: boolean; size?: 'sm' }) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const commit = () => {
    const n = text.trim() === '' ? null : Number(text);
    onCommit(n === null || Number.isNaN(n) ? null : n);
  };
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      autoFocus={autoFocus}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); } if (e.key === 'Escape') { setText(value === null ? '' : String(value)); (e.target as HTMLInputElement).blur(); } }}
      className={cn(size === 'sm' && 'h-7 text-[0.8rem]', className)}
    />
  );
}
