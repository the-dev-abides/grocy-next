// PROTOTYPE. Throwaway. Variant A: "Table".
//
// The Grocy pattern: one table, a checkbox per row, the bulk actions above
// it, the row actions at the right end. Inline edit in the cells from the
// md width: the amount and the location; from xl also the due date and
// the price; from 2xl the store. On a phone the table keeps three columns and a tap on the name
// opens the full form.
import { useState } from 'react';
import { Check, Pencil, RotateCw, Search, Sparkles, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AmountText, Attribution, DiffBadge, ErrorLine, NumberField, ResultsPanel, RowSelect, ScanMeta, ScanName, StateBadge } from './parts';
import { canAccept, round, rowName, sourceLabel, stateOf, timeOf, unitOf, useQueue, type PendingScan } from './queue';
import { useDialogs, useSelection } from './use-dialogs';

export const name = 'Table';

export function VariantA() {
  const [{ scans, catalog, results, busy }, queue] = useQueue();
  const d = useDialogs(catalog, queue, scans);
  const sel = useSelection(scans);
  const [runTotal, setRunTotal] = useState(0);

  const acceptSelected = () => { setRunTotal(sel.selected.length); d.acceptIds(sel.selected, 'Accept the selected rows'); sel.clear(); };
  const rejectSelected = () => { d.rejectIds(sel.selected, 'Reject the selected rows'); sel.clear(); };
  const acceptAll = () => { setRunTotal(scans.length); d.acceptIds(scans.map((s) => s.id), 'Accept all'); };
  const rejectAll = () => d.rejectIds(scans.map((s) => s.id), 'Reject all');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground mr-auto">
          {scans.length} pending {scans.length === 1 ? 'scan' : 'scans'}{sel.some && `, ${sel.selected.length} selected`}.
        </p>
        {sel.some ? (
          <>
            <Button variant="outline" size="sm" onClick={() => d.bulkEdit(sel.selected)}><Pencil data-icon="inline-start" /> Edit {sel.selected.length}</Button>
            <Button variant="outline" size="sm" onClick={rejectSelected}><Trash2 data-icon="inline-start" /> Reject {sel.selected.length}</Button>
            <Button size="sm" onClick={acceptSelected}><Check data-icon="inline-start" /> Accept {sel.selected.length}</Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" disabled={scans.length === 0} onClick={rejectAll}><Trash2 data-icon="inline-start" /> Reject all</Button>
            <Button size="sm" disabled={scans.length === 0} onClick={acceptAll}><Check data-icon="inline-start" /> Accept all</Button>
          </>
        )}
      </div>

      {results && <ResultsPanel results={results} total={runTotal || results.length} onClose={() => queue.clearResults()} />}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8"><Checkbox checked={sel.all} onCheckedChange={sel.toggleAll} aria-label="Select all" /></TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="w-20 text-right md:w-36">Amount</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden xl:table-cell">Due date</TableHead>
              <TableHead className="hidden xl:table-cell text-right">Price</TableHead>
              <TableHead className="hidden 2xl:table-cell">Store</TableHead>
              <TableHead className="hidden 2xl:table-cell">Scanned</TableHead>
              <TableHead className="hidden md:table-cell">State</TableHead>
              <TableHead className="w-8 text-right md:w-28"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan) => (
              <Row key={scan.id} scan={scan} selected={sel.has(scan.id)} onToggle={() => sel.toggle(scan.id)} busy={busy.has(scan.id)} d={d} />
            ))}
            {scans.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-muted-foreground py-8 text-center">The review queue is empty.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Attribution scans={scans} />
      {d.dialogs}
    </div>
  );
}

function Row({ scan, selected, onToggle, busy, d }: { scan: PendingScan; selected: boolean; onToggle: () => void; busy: boolean; d: ReturnType<typeof useDialogs> }) {
  const [{ catalog }, queue] = useQueue();
  const state = stateOf(scan);
  const inventory = scan.bookingType === 'inventory';
  const accept = () => void queue.accept(scan.id);
  return (
    <TableRow data-state={selected ? 'selected' : undefined} className={cn(scan.error && 'proto-row-expired', busy && 'opacity-50')}>
      <TableCell><Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${scan.product?.name ?? scan.code ?? ''}`} /></TableCell>
      <TableCell className="max-w-72 whitespace-normal">
        <button type="button" className="block text-left md:pointer-events-none" onClick={() => d.edit(scan)}>
          <ScanName scan={scan} />
          <ScanMeta scan={scan} />
        </button>
        <p className="text-muted-foreground hidden text-xs md:block">{inventory ? 'Inventory' : 'Purchase'} · {sourceLabel[scan.source]} · {timeOf(scan.scannedAt)}</p>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs md:hidden">
          <span>{inventory ? 'Inventory' : 'Purchase'}</span>
          <span>· {rowName(catalog.locations, scan.locationId ?? scan.product?.defaultLocationId ?? null)}</span>
          {scan.dueDate && <span>· due {scan.dueDate}</span>}
          <StateBadge scan={scan} className="ml-0.5" />
        </div>
        {inventory && scan.product && (
          <p className="text-muted-foreground mt-0.5 text-xs">
            In Grocy: <span className="text-foreground tabular-nums">{scan.product.stock} {scan.product.stockUnit}</span>
            {scan.product.isParent && ', parent product, own stock only'}
            {scan.product.tareWeight !== null && `, tare weight ${scan.product.tareWeight} ${scan.product.stockUnit}, count the gross weight`}
            {scan.amount !== null && <> <DiffBadge diff={round((scan.product.tareWeight !== null ? scan.amount - scan.product.tareWeight : scan.amount) - scan.product.stock)} unit={scan.product.stockUnit} /></>}
          </p>
        )}
        <ErrorLine scan={scan} className="mt-0.5" />
        {!scan.product && state.kind !== 'lookup-runs' && (
          <div className="mt-1 flex flex-wrap gap-1">
            <Button variant="outline" size="xs" onClick={() => d.pick(scan)}><Search data-icon="inline-start" /> Pick product</Button>
            <Button variant="outline" size="xs" onClick={() => d.create(scan)}><Sparkles data-icon="inline-start" /> New product</Button>
          </div>
        )}
      </TableCell>
      <TableCell className="text-right whitespace-normal">
        <span className="md:hidden"><AmountText scan={scan} /></span>
        <span className="hidden md:block"><AmountCell scan={scan} /></span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="w-32"><RowSelect id={`loc-${scan.id}`} rows={catalog.locations} value={scan.locationId} onChange={(locationId) => queue.update(scan.id, { locationId: locationId ?? null })} size="sm" /></div>
      </TableCell>
      <TableCell className="hidden xl:table-cell">
        <Input type="date" aria-label="Due date" value={scan.dueDate ?? ''} onChange={(e) => queue.update(scan.id, { dueDate: e.target.value || null })} className="h-7 w-34 text-[0.8rem]" />
      </TableCell>
      <TableCell className="hidden xl:table-cell text-right">
        {!inventory && (
          <span className="flex items-center justify-end gap-1">
            <Input inputMode="decimal" aria-label="Price" placeholder="0.00" value={scan.price} onChange={(e) => queue.update(scan.id, { price: e.target.value })} className="h-7 w-18 text-right text-[0.8rem] tabular-nums" />
            <button type="button" className="text-muted-foreground w-9 text-left text-xs underline" onClick={() => queue.update(scan.id, { priceType: scan.priceType === 'unit' ? 'total' : 'unit' })}>{scan.priceType === 'unit' ? '/unit' : 'total'}</button>
          </span>
        )}
      </TableCell>
      <TableCell className="hidden 2xl:table-cell">
        {!inventory && <RowSelect id={`store-${scan.id}`} rows={catalog.stores} value={scan.storeId} onChange={(storeId) => queue.update(scan.id, { storeId: storeId ?? null })} none="None" size="sm" />}
      </TableCell>
      <TableCell className="hidden 2xl:table-cell text-muted-foreground whitespace-nowrap">{timeOf(scan.scannedAt)}</TableCell>
      <TableCell className="hidden md:table-cell"><StateBadge scan={scan} /></TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label="Edit" className="hidden md:inline-flex" onClick={() => d.edit(scan)}><Pencil /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Reject" className="hidden md:inline-flex" onClick={() => queue.reject(scan.id)}><Trash2 /></Button>
          <Button variant={state.kind === 'error' ? 'outline' : 'ghost'} size="icon-sm" aria-label={state.kind === 'error' ? 'Accept again' : 'Accept'} disabled={!canAccept(scan) || busy} onClick={accept}>
            {state.kind === 'error' ? <RotateCw /> : <Check />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// The amount cell: click to edit. Inventory with no count shows the stock
// as the placeholder.
function AmountCell({ scan }: { scan: PendingScan }) {
  const [, queue] = useQueue();
  const [editing, setEditing] = useState(false);
  const inventory = scan.bookingType === 'inventory';
  if (!scan.product && !editing) return <span className="tabular-nums">{scan.amount ?? '—'}</span>;
  if (editing || (inventory && scan.amount === null)) {
    return (
      <span className="flex items-center justify-end gap-1">
        <NumberField value={scan.amount} onCommit={(amount) => { queue.update(scan.id, { amount }); setEditing(false); }} placeholder={inventory && scan.product ? `${scan.product.stock}` : ''} autoFocus={editing} size="sm" className="w-20 text-right" />
        <span className="text-muted-foreground w-12 truncate text-left text-xs">{unitOf(scan)}</span>
      </span>
    );
  }
  return (
    <button type="button" className="hover:bg-muted -mx-1 rounded px-1 py-0.5 tabular-nums" title="Click to edit" onClick={() => setEditing(true)}>
      <AmountText scan={scan} />
    </button>
  );
}
