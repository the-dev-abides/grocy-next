// PROTOTYPE. Throwaway. Variant B: "Cards".
//
// Each pending scan is one card with every fact on it and its own big
// Accept and Reject. The amount has plus and minus. The defaults are chips
// that open in place. A swipe to the left rejects a card, as on the scan
// screens. A "Select" switch turns on the checkboxes for the bulk actions,
// which sit in a bar at the bottom. One column on a phone, two from lg.
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Check, Minus, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Attribution, ErrorLine, InventoryPreview, LookupImage, NumberField, ResultsPanel, RowSelect, ScanMeta, ScanName, StateBadge } from './parts';
import { canAccept, round, sourceLabel, stateOf, timeOf, unitOf, useQueue, type PendingScan } from './queue';
import { useDialogs, useSelection } from './use-dialogs';

export const name = 'Cards';

export function VariantB() {
  const [{ scans, catalog, results, busy }, queue] = useQueue();
  const d = useDialogs(catalog, queue, scans);
  const sel = useSelection(scans);
  const [selecting, setSelecting] = useState(false);
  const [runTotal, setRunTotal] = useState(0);
  const stopSelecting = () => { setSelecting(false); sel.clear(); };

  return (
    <div className="flex flex-col gap-3 pb-16">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground mr-auto">{scans.length} pending {scans.length === 1 ? 'scan' : 'scans'}.</p>
        <Button variant={selecting ? 'secondary' : 'outline'} size="sm" onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
          {selecting ? <><X data-icon="inline-start" /> Done</> : 'Select'}
        </Button>
        {!selecting && (
          <>
            <Button variant="outline" size="sm" disabled={scans.length === 0} onClick={() => d.rejectIds(scans.map((s) => s.id), 'Reject all')}><Trash2 data-icon="inline-start" /> Reject all</Button>
            <Button size="sm" disabled={scans.length === 0} onClick={() => { setRunTotal(scans.length); d.acceptIds(scans.map((s) => s.id), 'Accept all'); }}><Check data-icon="inline-start" /> Accept all</Button>
          </>
        )}
      </div>

      {results && <ResultsPanel results={results} total={runTotal || results.length} onClose={() => queue.clearResults()} />}

      <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {scans.map((scan) => (
          <Card key={scan.id} scan={scan} selecting={selecting} selected={sel.has(scan.id)} onToggle={() => sel.toggle(scan.id)} busy={busy.has(scan.id)} d={d} />
        ))}
        {scans.length === 0 && <li className="text-muted-foreground py-8 text-center lg:col-span-2">The review queue is empty.</li>}
      </ul>
      <Attribution scans={scans} />

      {selecting && (
        <div className="bg-sidebar border-sidebar-border fixed inset-x-0 bottom-0 z-30 flex h-14 items-center gap-2 border-t px-3 md:left-14 lg:left-[250px]">
          <Checkbox checked={sel.all} onCheckedChange={sel.toggleAll} aria-label="Select all" />
          <span className="mr-auto">{sel.selected.length} selected</span>
          <Button variant="outline" size="sm" disabled={!sel.some} onClick={() => d.bulkEdit(sel.selected)}><Pencil data-icon="inline-start" /> Edit</Button>
          <Button variant="outline" size="sm" disabled={!sel.some} onClick={() => { d.rejectIds(sel.selected, 'Reject the selected cards'); stopSelecting(); }}><Trash2 data-icon="inline-start" /> Reject</Button>
          <Button size="sm" disabled={!sel.some} onClick={() => { setRunTotal(sel.selected.length); d.acceptIds(sel.selected, 'Accept the selected cards'); stopSelecting(); }}><Check data-icon="inline-start" /> Accept</Button>
        </div>
      )}
      {d.dialogs}
    </div>
  );
}

function Card({ scan, selecting, selected, onToggle, busy, d }: { scan: PendingScan; selecting: boolean; selected: boolean; onToggle: () => void; busy: boolean; d: ReturnType<typeof useDialogs> }) {
  const [{ catalog }, queue] = useQueue();
  const state = stateOf(scan);
  const inventory = scan.bookingType === 'inventory';
  const step = (delta: number) => {
    const base = scan.amount ?? (inventory ? (scan.product?.stock ?? 0) : 0);
    queue.update(scan.id, { amount: Math.max(0, round(base + delta)) });
  };
  return (
    <SwipeCard onReject={() => queue.reject(scan.id)} className={cn('bg-card flex flex-col gap-2 rounded-lg border p-3', scan.error && 'proto-row-expired', selected && 'ring-primary ring-2', busy && 'opacity-50')}>
      <div className="flex items-start gap-2">
        {selecting && <Checkbox checked={selected} onCheckedChange={onToggle} aria-label="Select" className="mt-1" />}
        <LookupImage src={scan.lookup?.imageUrl} className="bg-muted size-12 shrink-0 rounded object-contain" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <ScanName scan={scan} className="text-base" />
            <StateBadge scan={scan} className="ml-auto" />
          </div>
          <ScanMeta scan={scan} />
          <p className="text-muted-foreground text-xs">{inventory ? 'Inventory' : 'Purchase'} · {sourceLabel[scan.source]} · {timeOf(scan.scannedAt)}</p>
        </div>
      </div>

      {inventory && <InventoryPreview scan={scan} catalog={catalog} />}
      <ErrorLine scan={scan} />

      {(scan.product || !inventory) && (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-auto text-xs">{inventory ? `Count in ${scan.product?.stockUnit ?? 'the stock unit'}` : 'Amount'}</span>
          <Button variant="outline" size="icon" aria-label="Less" onClick={() => step(-1)}><Minus /></Button>
          <NumberField key={scan.amount ?? 'none'} value={scan.amount} onCommit={(amount) => queue.update(scan.id, { amount })} placeholder={inventory && scan.product ? `${scan.product.stock}` : ''} className="w-20 text-center" />
          <span className="w-14 truncate text-xs">{unitOf(scan)}</span>
          <Button variant="outline" size="icon" aria-label="More" onClick={() => step(1)}><Plus /></Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <RowSelect id={`b-loc-${scan.id}`} rows={catalog.locations} value={scan.locationId} onChange={(locationId) => queue.update(scan.id, { locationId: locationId ?? null })} size="sm" none={inventory ? 'Added stock: default' : 'Product default'} />
        <Input type="date" aria-label="Due date" value={scan.dueDate ?? ''} onChange={(e) => queue.update(scan.id, { dueDate: e.target.value || null })} className="h-7 text-[0.8rem]" />
        {!inventory && (
          <>
            <RowSelect id={`b-store-${scan.id}`} rows={catalog.stores} value={scan.storeId} onChange={(storeId) => queue.update(scan.id, { storeId: storeId ?? null })} none="No store" size="sm" />
            <span className="flex gap-1">
              <Input inputMode="decimal" aria-label="Price" placeholder="Price" value={scan.price} onChange={(e) => queue.update(scan.id, { price: e.target.value })} className="h-7 min-w-0 flex-1 text-[0.8rem] tabular-nums" />
              <Button variant="outline" size="sm" className="h-7 w-14 px-1" onClick={() => queue.update(scan.id, { priceType: scan.priceType === 'unit' ? 'total' : 'unit' })}>{scan.priceType === 'unit' ? '/ unit' : 'total'}</Button>
            </span>
          </>
        )}
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2">
        {!scan.product && state.kind !== 'lookup-runs' ? (
          <>
            <Button variant="outline" onClick={() => d.pick(scan)}><Search data-icon="inline-start" /> Pick product</Button>
            <Button onClick={() => d.create(scan)}><Sparkles data-icon="inline-start" /> New product</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => queue.reject(scan.id)}><Trash2 data-icon="inline-start" /> Reject</Button>
            <Button disabled={!canAccept(scan) || busy} onClick={() => void queue.accept(scan.id)}>
              <Check data-icon="inline-start" /> {state.kind === 'error' ? 'Accept again' : state.kind === 'no-count' ? 'Set the count' : 'Accept'}
            </Button>
          </>
        )}
      </div>
      <button type="button" className="text-muted-foreground self-end text-xs underline" onClick={() => d.edit(scan)}>All fields</button>
    </SwipeCard>
  );
}

// The swipe of the scan screens on a rounded card. A drag past a third of
// the width rejects; a short drag snaps back.
const REJECT_FRACTION = 0.34;

function SwipeCard({ onReject, className, children }: { onReject: () => void; className?: string; children: ReactNode }) {
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState(false);
  const start = useRef<{ x: number; y: number; id: number; active: boolean } | null>(null);
  const row = useRef<HTMLLIElement>(null);
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
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
  const onUp = () => {
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
    <li ref={row} className="relative overflow-hidden rounded-lg">
      {dx < 0 && (
        <div aria-hidden="true" className="bg-destructive absolute inset-0 flex items-center justify-end gap-2 rounded-lg pr-4 text-sm font-medium text-white">
          <Trash2 className="size-4" /> Reject
        </div>
      )}
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
