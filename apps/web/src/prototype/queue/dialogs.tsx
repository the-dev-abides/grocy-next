// PROTOTYPE. Throwaway. The dialogs that the three variants share:
// - EditDialog: the full form of one pending scan.
// - BulkEditDialog: the empty form for the selected rows. Only the fields
//   that the user sets change (the human requirement on bulk edit).
// - PickProductDialog: an existing product for a row with a wrong or a
//   missing match. The server adds the code to that product.
// - NewProductDialog: the short product form of ADR 0011, filled from the
//   lookup result or the write-in name.
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, InventoryPreview, LookupImage, NumberField, RowSelect, UnitSelect } from './parts';
import { nameOf, proposeProduct, rowName, type BulkEdit, type Catalog, type NewProductForm, type PendingScan, type PriceType, type Queue } from './queue';

const priceTypes: Record<PriceType, string> = { unit: 'per unit', total: 'in total' };

// ------------------------------------------------------------ one row

export function EditDialog({ scan, catalog, queue, onClose, onPick }: { scan: PendingScan | null; catalog: Catalog; queue: Queue; onClose: () => void; onPick: (scan: PendingScan) => void }) {
  return (
    <Dialog open={scan !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {scan && <EditForm key={scan.id} scan={scan} catalog={catalog} queue={queue} onClose={onClose} onPick={onPick} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ scan, catalog, queue, onClose, onPick }: { scan: PendingScan; catalog: Catalog; queue: Queue; onClose: () => void; onPick: (scan: PendingScan) => void }) {
  const [draft, setDraft] = useState<PendingScan>(scan);
  const set = (p: Partial<PendingScan>) => setDraft((d) => ({ ...d, ...p }));
  const inventory = draft.bookingType === 'inventory';
  const unitChoices = draft.product ? [draft.product.purchaseUnit, draft.product.stockUnit, ...Object.keys(draft.product.conversions)].filter((u, i, a) => a.indexOf(u) === i) : catalog.units;
  const save = () => {
    const { amount, unit, locationId, productGroupId, storeId, dueDate, price, priceType, note } = draft;
    queue.update(scan.id, { amount, unit, locationId, productGroupId, storeId, dueDate, price, priceType, note });
    onClose();
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>{nameOf(scan)}</DialogTitle>
        <DialogDescription>
          {inventory ? 'Inventory. The accept sets the stock to the count.' : 'Purchase. The accept adds one stock entry.'}
          {scan.error && <span className="text-destructive block">Last accept: {scan.error}</span>}
        </DialogDescription>
      </DialogHeader>
      {inventory && <InventoryPreview scan={draft} catalog={catalog} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="e-amount" label={inventory ? `Count in ${draft.product?.stockUnit ?? 'the stock unit'}` : 'Amount'}>
          <NumberField id="e-amount" value={draft.amount} onCommit={(amount) => set({ amount })} placeholder={inventory && draft.product ? `${draft.product.stock} now` : ''} autoFocus />
        </Field>
        {!inventory && (
          <UnitSelect id="e-unit" label="Unit" units={unitChoices} value={draft.unit} onChange={(unit) => set({ unit })} none={draft.product ? `Purchase unit (${draft.product.purchaseUnit})` : 'Purchase unit'} />
        )}
        <RowSelect id="e-location" label={inventory ? 'Location of added stock' : 'Location'} rows={catalog.locations} value={draft.locationId} onChange={(locationId) => set({ locationId: locationId ?? null })} />
        <Field id="e-due" label={inventory ? 'Due date of added stock' : 'Due date'}>
          <Input id="e-due" type="date" value={draft.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || null })} />
        </Field>
        {!inventory && (
          <>
            <RowSelect id="e-store" label="Store" rows={catalog.stores} value={draft.storeId} onChange={(storeId) => set({ storeId: storeId ?? null })} none="None" />
            <Field id="e-price" label="Price">
              <div className="flex gap-2">
                <Input id="e-price" inputMode="decimal" placeholder="0.00" value={draft.price} onChange={(e) => set({ price: e.target.value })} className="min-w-0 flex-1" />
                <Select items={priceTypes} value={draft.priceType} onValueChange={(v) => set({ priceType: v as PriceType })}>
                  <SelectTrigger aria-label="Price type" className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(priceTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </Field>
          </>
        )}
        {!draft.product && (
          <RowSelect id="e-group" label="Product group of the new product" rows={catalog.productGroups} value={draft.productGroupId} onChange={(productGroupId) => set({ productGroupId: productGroupId ?? null })} none="None" />
        )}
        <Field id="e-note" label="Note">
          <Input id="e-note" value={draft.note ?? ''} onChange={(e) => set({ note: e.target.value || null })} />
        </Field>
      </div>
      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" onClick={() => onPick(scan)}>{scan.product ? 'Change the product' : 'Pick a product'}</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </DialogFooter>
    </>
  );
}

// ------------------------------------------------------------- bulk edit

export function BulkEditDialog({ ids, scans, catalog, queue, onClose }: { ids: number[] | null; scans: PendingScan[]; catalog: Catalog; queue: Queue; onClose: () => void }) {
  return (
    <Dialog open={ids !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {ids && <BulkEditForm key={ids.join(',')} ids={ids} scans={scans} catalog={catalog} queue={queue} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function BulkEditForm({ ids, scans, catalog, queue, onClose }: { ids: number[]; scans: PendingScan[]; catalog: Catalog; queue: Queue; onClose: () => void }) {
  const [edit, setEdit] = useState<BulkEdit>({});
  const [priceText, setPriceText] = useState('');
  const rows = scans.filter((s) => ids.includes(s.id));
  const purchases = rows.filter((s) => s.bookingType === 'purchase').length;
  const inventories = rows.length - purchases;
  const set = (p: BulkEdit) => setEdit((e) => ({ ...e, ...p }));
  const setFields = Object.entries(edit).filter(([, v]) => v !== undefined).length;
  const KEEP = 'Keep as is';
  const save = () => {
    queue.bulkEdit(ids, edit);
    onClose();
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit {rows.length} pending scans</DialogTitle>
        <DialogDescription>
          {purchases > 0 && `${purchases} Purchase`}{purchases > 0 && inventories > 0 && ', '}{inventories > 0 && `${inventories} Inventory`}. Every field starts empty. Only a field that you set changes on the rows.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="b-amount" label={inventories > 0 && purchases === 0 ? 'Count' : 'Amount'}>
          <NumberField id="b-amount" value={edit.amount ?? null} onCommit={(amount) => set({ amount: amount ?? undefined })} placeholder={KEEP} />
        </Field>
        <RowSelect id="b-location" label={purchases > 0 ? 'Location' : 'Location of added stock'} rows={catalog.locations} value={edit.locationId} onChange={(locationId) => set({ locationId })} keep={KEEP} />
        <Field id="b-due" label="Due date">
          <div className="flex gap-2">
            <Input id="b-due" type="date" value={edit.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || undefined })} className="min-w-0 flex-1" />
            <Button variant={edit.dueDate === null ? 'secondary' : 'outline'} size="sm" className="h-8" onClick={() => set({ dueDate: edit.dueDate === null ? undefined : null })}>Product default</Button>
          </div>
        </Field>
        {purchases > 0 && (
          <>
            <RowSelect id="b-store" label="Store" rows={catalog.stores} value={edit.storeId} onChange={(storeId) => set({ storeId })} none="None" keep={KEEP} />
            <Field id="b-price" label="Price">
              <div className="flex gap-2">
                <Input id="b-price" inputMode="decimal" placeholder={KEEP} value={priceText} onChange={(e) => { setPriceText(e.target.value); set({ price: e.target.value || undefined }); }} className="min-w-0 flex-1" />
                <Select items={{ keep: KEEP, ...priceTypes }} value={edit.priceType ?? 'keep'} onValueChange={(v) => set({ priceType: v === 'keep' ? undefined : (v as PriceType) })}>
                  <SelectTrigger aria-label="Price type" className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">{KEEP}</SelectItem>
                    {Object.entries(priceTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Field>
          </>
        )}
        <RowSelect id="b-group" label="Product group of a new product" rows={catalog.productGroups} value={edit.productGroupId} onChange={(productGroupId) => set({ productGroupId })} none="None" keep={KEEP} />
        <Field id="b-note" label="Note">
          <Input id="b-note" placeholder={KEEP} value={edit.note ?? ''} onChange={(e) => set({ note: e.target.value || undefined })} />
        </Field>
      </div>
      <DialogFooter className="sm:items-center">
        <span className="text-muted-foreground mr-auto text-xs">{setFields === 0 ? 'No field set.' : `${setFields} ${setFields === 1 ? 'field' : 'fields'} will change on ${rows.length} rows.`}</span>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={setFields === 0}>Apply</Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------- pick product

export function PickProductDialog({ scan, catalog, queue, onClose }: { scan: PendingScan | null; catalog: Catalog; queue: Queue; onClose: () => void }) {
  return (
    <Dialog open={scan !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {scan && <PickProductForm key={scan.id} scan={scan} catalog={catalog} queue={queue} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function PickProductForm({ scan, catalog, queue, onClose }: { scan: PendingScan; catalog: Catalog; queue: Queue; onClose: () => void }) {
  const [text, setText] = useState('');
  const hits = useMemo(() => {
    const q = text.trim().toLowerCase();
    const all = [...catalog.products].sort((a, b) => a.name.localeCompare(b.name));
    return q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all;
  }, [text, catalog.products]);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{scan.product ? 'Change the product' : 'Pick the product'}</DialogTitle>
        <DialogDescription>
          {scan.code ? <>The code <span className="font-mono">{scan.code}</span> is added to the product that you pick.</> : 'The pending scan gets the product that you pick.'}
          {scan.lookup && ' The lookup picture is set when the product has none.'}
        </DialogDescription>
      </DialogHeader>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-2 left-2.5 size-4" />
        <Input autoFocus placeholder="Search the products" value={text} onChange={(e) => setText(e.target.value)} className="pl-8" aria-label="Search the products" />
      </div>
      <ul className="-mx-1 max-h-72 overflow-y-auto">
        {hits.map((p) => (
          <li key={p.id}>
            <button type="button" className="hover:bg-muted flex h-11 w-full items-center gap-2 rounded-md px-3 text-left" onClick={() => { queue.setProduct(scan.id, p.id); onClose(); }}>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-muted-foreground text-xs tabular-nums">{p.stock} {p.stockUnit} · {rowName(catalog.locations, p.defaultLocationId, '')}</span>
            </button>
          </li>
        ))}
        {hits.length === 0 && <li className="text-muted-foreground px-3 py-4 text-center">No product matches.</li>}
      </ul>
    </>
  );
}

// ----------------------------------------------------------- new product

export function NewProductDialog({ scan, catalog, queue, onClose }: { scan: PendingScan | null; catalog: Catalog; queue: Queue; onClose: () => void }) {
  return (
    <Dialog open={scan !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {scan && <NewProductForm key={scan.id} scan={scan} catalog={catalog} queue={queue} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function NewProductForm({ scan, catalog, queue, onClose }: { scan: PendingScan; catalog: Catalog; queue: Queue; onClose: () => void }) {
  const [form, setForm] = useState<NewProductForm>(() => proposeProduct(scan, catalog));
  const set = (p: Partial<NewProductForm>) => setForm((f) => ({ ...f, ...p }));
  const l = scan.lookup;
  const valid = form.name.trim() !== '' && form.stockUnit !== '' && form.purchaseUnit !== '' && form.locationId !== null;
  const proposed = !!l?.netQuantity && form.stockUnit !== '';
  const save = () => {
    queue.createProduct(scan.id, form);
    onClose();
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>New product</DialogTitle>
        <DialogDescription>
          The product is created in Grocy with the code {scan.code ? <span className="font-mono">{scan.code}</span> : 'of the scan'}, and the pending scan gets it. {l ? `The proposals come from ${l.service}. Change any of them.` : 'The name is the write-in name from the scan screen.'}
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-3">
        <LookupImage src={l?.imageUrl} className="bg-muted size-20 shrink-0 rounded-md object-contain" />
        <div className="grid min-w-0 flex-1 gap-3">
          <Field id="n-name" label="Name">
            <Input id="n-name" autoFocus value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field id="n-desc" label="Description">
            <Input id="n-desc" value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <RowSelect id="n-location" label="Default location" rows={catalog.locations} value={form.locationId} onChange={(locationId) => set({ locationId: locationId ?? null })} none="Pick one" />
        <RowSelect id="n-group" label="Product group" rows={catalog.productGroups} value={form.productGroupId} onChange={(productGroupId) => set({ productGroupId: productGroupId ?? null })} none="None" />
        <UnitSelect id="n-stock" label="Stock unit" units={catalog.units} value={form.stockUnit || null} onChange={(u) => set({ stockUnit: u ?? '' })} none="Pick one" />
        <UnitSelect id="n-purchase" label="Purchase unit" units={catalog.units} value={form.purchaseUnit || null} onChange={(u) => set({ purchaseUnit: u ?? '' })} none="Pick one" />
        {form.purchaseUnit && form.stockUnit && form.purchaseUnit !== form.stockUnit && (
          <Field id="n-factor" label={`One ${form.purchaseUnit} is how many ${form.stockUnit}`}>
            <NumberField id="n-factor" value={form.factor} onCommit={(factor) => set({ factor: factor ?? 1 })} />
          </Field>
        )}
        <Field id="n-due" label="Default due days">
          <NumberField id="n-due" value={form.dueDays} onCommit={(dueDays) => set({ dueDays })} placeholder="None" />
        </Field>
      </div>
      {l && !proposed && (
        <p className="text-muted-foreground text-xs">The label says "{l.quantityText ?? 'nothing'}". No unit proposal; pick the units.</p>
      )}
      {l && (
        <p className="text-muted-foreground text-xs">Contains data from <a className="underline" href={l.sourceUrl} target="_blank" rel="noreferrer">{l.service}</a>, available under the Open Database License. The picture is copied to Grocy.</p>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!valid}>Create and use</Button>
      </DialogFooter>
    </>
  );
}
