// PROTOTYPE. Throwaway. The session default fields as form controls. Variant
// B shows them on the page; variant C shows them in a dialog.
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Catalog } from './server';
import type { Defaults, DueRule } from './session';

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

export function DefaultsFields({ catalog, defaults, onChange, idPrefix = 'f', withPrice = true }: { catalog: Catalog | null; defaults: Defaults; onChange: (patch: Partial<Defaults>) => void; idPrefix?: string; withPrice?: boolean }) {
  const due = defaults.dueRule;
  const dueKinds: Record<string, string> = { none: 'Product default', days: 'Days from today', date: 'Fixed date' };
  return (
    <>
      <RowSelect id={`${idPrefix}-location`} label="Location" rows={catalog?.locations ?? []} value={defaults.locationId} onChange={(locationId) => onChange({ locationId })} />
      <RowSelect id={`${idPrefix}-store`} label="Store" rows={catalog?.stores ?? []} value={defaults.storeId} onChange={(storeId) => onChange({ storeId })} none="None" />
      <RowSelect id={`${idPrefix}-group`} label="Product group" rows={catalog?.productGroups ?? []} value={defaults.productGroupId} onChange={(productGroupId) => onChange({ productGroupId })} none="Product default" />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-due`}>Due date</Label>
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
      {withPrice && (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-price`}>Price</Label>
        <div className="flex gap-2">
          <Input id={`${idPrefix}-price`} inputMode="decimal" placeholder="None" className="min-w-0 flex-1" value={defaults.price} onChange={(e) => onChange({ price: e.target.value })} />
          <Select items={{ unit: 'per unit', total: 'total' }} value={defaults.priceType} onValueChange={(v) => onChange({ priceType: v === 'total' ? 'total' : 'unit' })}>
            <SelectTrigger className="w-28" aria-label="Price type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unit">per unit</SelectItem>
              <SelectItem value="total">total</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      )}
    </>
  );
}
