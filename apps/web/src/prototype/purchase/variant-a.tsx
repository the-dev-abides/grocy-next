// PROTOTYPE. Throwaway. Variant A: "Viewfinder".
//
// The camera fills the screen. The session defaults are chips over the top
// of the camera; a tap on a chip opens a bottom sheet with the options, and
// a tap on an option closes it: two taps for one change. The last scans sit
// in a dark panel over the bottom of the camera. The session starts when the
// screen opens, and ends with Done.
import { useState, type ReactNode } from 'react';
import { CalendarClock, Check, Keyboard, List, MapPin, Store, Tag, Tags } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CameraView } from './camera-view';
import type { Force } from './decoder';
import { ScanName } from './scan-name';
import { dueRuleLabel, nameOf, priceLabel, timeOf, unitOf, useSession, type Defaults, type DueRule } from './session';

export const name = 'Viewfinder';

type Field = 'location' | 'group' | 'store' | 'due' | 'price';

export function VariantA({ force, onDone }: { force: Force; onDone: () => void }) {
  const [state, session] = useSession(force);
  const [open, setOpen] = useState<Field | null>(null);
  const [typing, setTyping] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const { catalog, defaults, scans } = state;

  const chips: { field: Field; icon: typeof MapPin; label: string; set: boolean }[] = [
    { field: 'location', icon: MapPin, label: nameOf(catalog?.locations, defaults.locationId), set: defaults.locationId !== null },
    { field: 'store', icon: Store, label: nameOf(catalog?.stores, defaults.storeId, 'Store'), set: defaults.storeId !== null },
    { field: 'due', icon: CalendarClock, label: dueRuleLabel(defaults.dueRule), set: defaults.dueRule.kind !== 'none' },
    { field: 'price', icon: Tag, label: priceLabel(defaults), set: defaults.price !== '' },
    { field: 'group', icon: Tags, label: nameOf(catalog?.productGroups, defaults.productGroupId, 'Group'), set: defaults.productGroupId !== null },
  ];

  return (
    <div className="relative h-[calc(100svh-3.25rem)]">
      <CameraView force={force} autoStart className="absolute inset-0" feedbackPlacement="below-chips">
        {/* The defaults as chips. */}
        <div className="absolute inset-x-0 top-2 flex gap-1.5 overflow-x-auto px-2 pb-1 [scrollbar-width:none]">
          {chips.map((c) => (
            <button
              key={c.field}
              type="button"
              onClick={() => setOpen(c.field)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm whitespace-nowrap backdrop-blur-sm',
                c.set ? 'bg-primary text-primary-foreground' : 'bg-black/55 text-white',
              )}
            >
              <c.icon className="size-4" /> {c.label}
            </button>
          ))}
        </div>

        {/* The last scans. */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col bg-black/70 pb-12 text-white backdrop-blur-sm lg:pb-0">
          <div className="flex h-11 items-center gap-1 px-2">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setListOpen(true)}>
              <List className="size-4 shrink-0" />
              <span className="truncate">{scans.length} {scans.length === 1 ? 'scan' : 'scans'} this session</span>
            </button>
            <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/15 hover:text-white" aria-label="Type a code" onClick={() => setTyping((t) => !t)}><Keyboard /></Button>
            <Button size="sm" onClick={onDone}><Check data-icon="inline-start" /> Done</Button>
          </div>
          {typing && <TypeCode onSubmit={(code) => { session.typeCode(code); setTyping(false); }} light />}
          <ul className="flex flex-col divide-y divide-white/10 border-t border-white/10">
            {scans.slice(0, 3).map((scan) => (
              <li key={scan.id} className="flex h-10 items-center gap-2 px-3">
                <span className="min-w-0 flex-1 truncate"><ScanName scan={scan} light /></span>
                <span className="tabular-nums">{scan.amount} {unitOf(scan)}</span>
                <span className="w-12 text-right text-xs text-white/60 tabular-nums">{timeOf(scan.scannedAt)}</span>
              </li>
            ))}
            {scans.length === 0 && <li className="h-10 px-3 leading-10 text-white/60">Point the camera at a barcode.</li>}
          </ul>
        </div>
      </CameraView>

      <PickSheet field={open} onClose={() => setOpen(null)} defaults={defaults} catalog={catalog} onChange={(p) => session.setDefaults(p)} />

      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto">
          <SheetHeader><SheetTitle>This session</SheetTitle><SheetDescription>Every scan is in the review queue already.</SheetDescription></SheetHeader>
          <ul className="divide-y">
            {scans.map((scan) => (
              <li key={scan.id} className="flex min-h-11 items-center gap-2 py-1">
                <span className="min-w-0 flex-1"><ScanName scan={scan} /><p className="text-muted-foreground text-xs">{nameOf(catalog?.locations, scan.locationId)} · {scan.dueDate ?? 'Product default'} · {scan.price ? `${scan.price} ${scan.priceType}` : 'no price'}</p></span>
                <span className="tabular-nums">{scan.amount} {unitOf(scan)}</span>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function TypeCode({ onSubmit, light }: { onSubmit: (code: string) => void; light?: boolean }) {
  const [code, setCode] = useState('');
  return (
    <form
      className="flex gap-2 px-2 pb-2"
      onSubmit={(e) => { e.preventDefault(); if (code.trim()) onSubmit(code); setCode(''); }}
    >
      <Input autoFocus inputMode="numeric" placeholder="Type a code, for example 4011" value={code} onChange={(e) => setCode(e.target.value)} className={cn(light && 'border-white/30 bg-white/10 text-white placeholder:text-white/50')} />
      <Button type="submit" variant={light ? 'secondary' : 'default'}>Add</Button>
    </form>
  );
}

function Row({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex h-11 w-full items-center gap-2 rounded-md px-3 text-left', selected ? 'bg-accent font-medium' : 'hover:bg-muted')}>
      <span className="flex-1">{children}</span>
      {selected && <Check className="text-primary size-4" />}
    </button>
  );
}

function PickSheet({ field, onClose, defaults, catalog, onChange }: { field: Field | null; onClose: () => void; defaults: Defaults; catalog: ReturnType<typeof useSession>[0]['catalog']; onChange: (p: Partial<Defaults>) => void }) {
  const pick = (p: Partial<Defaults>) => { onChange(p); onClose(); };
  const titles: Record<Field, string> = { location: 'Location', group: 'Product group', store: 'Store', due: 'Due date', price: 'Price' };
  const [days, setDays] = useState(7);
  const [date, setDate] = useState('');
  const [price, setPrice] = useState(defaults.price);
  const [priceType, setPriceType] = useState(defaults.priceType);

  return (
    <Sheet open={field !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto">
        <SheetHeader><SheetTitle>{field ? titles[field] : ''}</SheetTitle><SheetDescription>For the scans that follow.</SheetDescription></SheetHeader>
        {field === 'location' && (
          <div className="flex flex-col">
            <Row selected={defaults.locationId === null} onClick={() => pick({ locationId: null })}>Product default</Row>
            {catalog?.locations.map((l) => <Row key={l.id} selected={defaults.locationId === l.id} onClick={() => pick({ locationId: l.id })}>{l.name}</Row>)}
          </div>
        )}
        {field === 'group' && (
          <div className="flex flex-col">
            <Row selected={defaults.productGroupId === null} onClick={() => pick({ productGroupId: null })}>Product default</Row>
            {catalog?.productGroups.map((g) => <Row key={g.id} selected={defaults.productGroupId === g.id} onClick={() => pick({ productGroupId: g.id })}>{g.name}</Row>)}
          </div>
        )}
        {field === 'store' && (
          <div className="flex flex-col">
            <Row selected={defaults.storeId === null} onClick={() => pick({ storeId: null })}>None</Row>
            {catalog?.stores.map((s) => <Row key={s.id} selected={defaults.storeId === s.id} onClick={() => pick({ storeId: s.id })}>{s.name}</Row>)}
          </div>
        )}
        {field === 'due' && (
          <div className="flex flex-col gap-1">
            <Row selected={defaults.dueRule.kind === 'none'} onClick={() => pick({ dueRule: { kind: 'none' } })}>Product default</Row>
            <div className="flex items-center gap-2 px-3">
              <span className="flex-1">Days from today</span>
              <Input type="number" inputMode="numeric" className="w-20" value={days} onChange={(e) => setDays(Number(e.target.value) || 0)} aria-label="Days" />
              <Button size="sm" onClick={() => pick({ dueRule: { kind: 'days', days } as DueRule })}>Set</Button>
            </div>
            <div className="flex items-center gap-2 px-3">
              <span className="flex-1">Fixed date</span>
              <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
              <Button size="sm" disabled={!date} onClick={() => pick({ dueRule: { kind: 'date', date } })}>Set</Button>
            </div>
          </div>
        )}
        {field === 'price' && (
          <div className="flex flex-col gap-3 px-3">
            <div className="flex gap-2">
              <Input inputMode="decimal" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Price" autoFocus />
              <div className="flex rounded-lg border p-0.5">
                {(['unit', 'total'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setPriceType(t)} className={cn('rounded-md px-3 text-sm', priceType === t && 'bg-accent font-medium')}>{t === 'unit' ? 'per unit' : 'total'}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => pick({ price: '' })}>Clear</Button>
              <Button onClick={() => pick({ price, priceType })}>Set</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
