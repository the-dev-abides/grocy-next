// PROTOTYPE. Throwaway. Variant C: "Board".
//
// The queue is split by what each row needs before the accept: a product,
// a count, a second try after a Grocy error, or nothing. Each section shows
// the one control that its rows need, and the Ready section has the one
// big button, "Accept all ready". From lg the sections are columns side by
// side; below lg they stack. Every row has a checkbox for the bulk edit. A
// tap on the name opens the full form.
import { useState } from 'react';
import { Check, Pencil, RotateCw, Search, Sparkles, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AmountText, Attribution, DiffBadge, ErrorLine, NumberField, ResultsPanel, ScanMeta, ScanName } from './parts';
import { round, rowName, stateOf, timeOf, useQueue, type PendingScan, type RowState } from './queue';
import { useDialogs, useSelection } from './use-dialogs';

export const name = 'Board';

type Section = 'product' | 'count' | 'failed' | 'ready';

const sectionOf: Record<RowState['kind'], Section> = {
  'no-product': 'product', 'new-product': 'product', 'lookup-runs': 'product', 'no-count': 'count', error: 'failed', ready: 'ready',
};

const sectionTitle: Record<Section, string> = {
  product: 'Needs a product', count: 'Needs a count', failed: 'Accept failed', ready: 'Ready',
};

export function VariantC() {
  const [{ scans, catalog, results, busy }, queue] = useQueue();
  const d = useDialogs(catalog, queue, scans);
  const sel = useSelection(scans);
  const [runTotal, setRunTotal] = useState(0);
  const groups: Record<Section, PendingScan[]> = { product: [], count: [], failed: [], ready: [] };
  for (const s of scans) groups[sectionOf[stateOf(s).kind]].push(s);
  const readyIds = groups.ready.map((s) => s.id);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground mr-auto">
          {scans.length} pending {scans.length === 1 ? 'scan' : 'scans'}{sel.some && `, ${sel.selected.length} selected`}.
        </p>
        {sel.some ? (
          <>
            <Button variant="ghost" size="sm" onClick={sel.clear}>Clear</Button>
            <Button variant="outline" size="sm" onClick={() => d.bulkEdit(sel.selected)}><Pencil data-icon="inline-start" /> Edit {sel.selected.length}</Button>
            <Button variant="outline" size="sm" onClick={() => { d.rejectIds(sel.selected, 'Reject the selected rows'); sel.clear(); }}><Trash2 data-icon="inline-start" /> Reject {sel.selected.length}</Button>
            <Button size="sm" onClick={() => { setRunTotal(sel.selected.length); d.acceptIds(sel.selected, 'Accept the selected rows'); sel.clear(); }}><Check data-icon="inline-start" /> Accept {sel.selected.length}</Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" disabled={scans.length === 0} onClick={() => d.rejectIds(scans.map((s) => s.id), 'Reject all')}><Trash2 data-icon="inline-start" /> Reject all</Button>
            <Button size="sm" disabled={readyIds.length === 0} onClick={() => { setRunTotal(readyIds.length); void queue.acceptMany(readyIds); }}><Check data-icon="inline-start" /> Accept all ready ({readyIds.length})</Button>
          </>
        )}
      </div>

      {results && <ResultsPanel results={results} total={runTotal || results.length} onClose={() => queue.clearResults()} />}

      <div className="grid gap-4 lg:grid-cols-4 lg:items-start">
        {(['product', 'count', 'failed', 'ready'] as Section[]).map((section) => (
          <section key={section} className={cn('flex flex-col gap-2', groups[section].length === 0 && 'hidden lg:flex')} aria-label={sectionTitle[section]}>
            <h2 className="flex items-center gap-2 text-lg font-medium">
              {sectionTitle[section]}
              <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-px text-xs tabular-nums">{groups[section].length}</span>
            </h2>
            <ul className="flex flex-col gap-2">
              {groups[section].map((scan) => (
                <Row key={scan.id} scan={scan} section={section} selected={sel.has(scan.id)} onToggle={() => sel.toggle(scan.id)} busy={busy.has(scan.id)} d={d} />
              ))}
              {groups[section].length === 0 && <li className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">Nothing here.</li>}
            </ul>
          </section>
        ))}
      </div>
      <Attribution scans={scans} />
      {d.dialogs}
    </div>
  );
}

function Row({ scan, section, selected, onToggle, busy, d }: { scan: PendingScan; section: Section; selected: boolean; onToggle: () => void; busy: boolean; d: ReturnType<typeof useDialogs> }) {
  const [{ catalog }, queue] = useQueue();
  const state = stateOf(scan);
  const inventory = scan.bookingType === 'inventory';
  const p = scan.product;
  return (
    <li className={cn('bg-card flex flex-col gap-1.5 rounded-lg border p-2', scan.error && 'proto-row-expired', selected && 'ring-primary ring-2', busy && 'opacity-50')}>
      <div className="flex items-start gap-2">
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label="Select" className="mt-1" />
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => d.edit(scan)}>
          <ScanName scan={scan} />
          <ScanMeta scan={scan} />
          <span className="text-muted-foreground block text-xs">
            {inventory ? 'Inventory' : 'Purchase'} · {timeOf(scan.scannedAt)} · {rowName(catalog.locations, scan.locationId ?? p?.defaultLocationId ?? null)}
            {!inventory && <> · <AmountText scan={scan} /></>}
            {!inventory && scan.price && ` · ${scan.price} ${scan.priceType === 'unit' ? '/ unit' : 'total'}`}
          </span>
          {inventory && p && (
            <span className="text-muted-foreground block text-xs">
              In Grocy: <span className="text-foreground tabular-nums">{p.stock} {p.stockUnit}</span>
              {p.isParent && ', own stock only'}
              {p.tareWeight !== null && `, tare ${p.tareWeight} ${p.stockUnit}`}
              {scan.amount !== null && <> → {scan.amount} {p.stockUnit} <DiffBadge diff={round((p.tareWeight !== null ? scan.amount - p.tareWeight : scan.amount) - p.stock)} unit={p.stockUnit} /></>}
            </span>
          )}
        </button>
      </div>
      <ErrorLine scan={scan} />

      {section === 'product' && (
        state.kind === 'lookup-runs' ? (
          <p className="text-muted-foreground animate-pulse text-xs">The lookup runs. The row updates when the worker answers.</p>
        ) : (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => d.pick(scan)}><Search data-icon="inline-start" /> Pick</Button>
            <Button size="sm" className="flex-1" onClick={() => d.create(scan)}><Sparkles data-icon="inline-start" /> New</Button>
            <Button variant="ghost" size="icon-sm" aria-label="Reject" onClick={() => queue.reject(scan.id)}><Trash2 /></Button>
          </div>
        )
      )}
      {section === 'count' && p && (
        <div className="flex items-center gap-1.5">
          <NumberField value={scan.amount} onCommit={(amount) => queue.update(scan.id, { amount })} placeholder={`${p.stock}`} size="sm" className="w-28" />
          <span className="text-muted-foreground mr-auto text-xs whitespace-nowrap">{p.stockUnit}{p.tareWeight !== null ? ', gross' : ''}</span>
          <Button variant="outline" size="sm" onClick={() => queue.update(scan.id, { amount: p.stock })}>Same as Grocy</Button>
          <Button variant="ghost" size="icon-sm" aria-label="Reject" onClick={() => queue.reject(scan.id)}><Trash2 /></Button>
        </div>
      )}
      {section === 'failed' && (
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => d.edit(scan)}><Pencil data-icon="inline-start" /> Edit</Button>
          <Button size="sm" className="flex-1" disabled={busy} onClick={() => void queue.accept(scan.id)}><RotateCw data-icon="inline-start" /> Accept again</Button>
          <Button variant="ghost" size="icon-sm" aria-label="Reject" onClick={() => queue.reject(scan.id)}><Trash2 /></Button>
        </div>
      )}
      {section === 'ready' && (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label="Reject" onClick={() => queue.reject(scan.id)}><Trash2 /></Button>
          <Button variant="outline" size="icon-sm" aria-label="Accept" disabled={busy} onClick={() => void queue.accept(scan.id)}><Check /></Button>
        </div>
      )}
    </li>
  );
}
