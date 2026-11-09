// PROTOTYPE. Throwaway. Variant D: "Hybrid", the maintainer's mix of B and C.
//
// The layout of C: the scans are the page, most recent at the top, with a
// camera strip that stays at the top while the list scrolls. The defaults
// are a collapsible section above the camera; open, it is the form of B
// with no price field. The price is not a default. A price row sits
// directly under the camera: the price for the next scan, unit or total.
// The user types the price, then scans the item. The scan takes the price
// and the field clears. The price type stays.
import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CameraView } from './camera-view';
import type { Force } from './decoder';
import { DefaultsFields } from './fields';
import { ScanName, ScanSource } from './scan-name';
import { dueRuleLabel, nameOf, timeOf, unitOf, useSession, type PriceType } from './session';
import { TypeCode } from './variant-a';

export const name = 'Hybrid';

export function VariantD({ force, onDone }: { force: Force; onDone: () => void }) {
  const [state, session] = useSession(force);
  const [open, setOpen] = useState(false);
  const { catalog, defaults, scans, nextPrice } = state;

  const summary = [
    nameOf(catalog?.locations, defaults.locationId),
    nameOf(catalog?.stores, defaults.storeId, 'no store'),
    dueRuleLabel(defaults.dueRule),
    nameOf(catalog?.productGroups, defaults.productGroupId, 'default group'),
  ].join(' · ');

  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="bg-background sticky top-13 z-20 lg:h-[calc(100svh-3.25rem)] lg:overflow-y-auto lg:border-r">
        {/* The defaults: a collapsible section. */}
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
              <DefaultsFields catalog={catalog} defaults={defaults} onChange={(p) => session.setDefaults(p)} idPrefix="d" withPrice={false} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => session.resetDefaults()}>Reset</Button>
              <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        )}

        <CameraView force={force} autoStart className="h-40 lg:aspect-[4/3] lg:h-auto" />

        {/* The price for the next scan. */}
        <PriceRow price={nextPrice.price} priceType={nextPrice.priceType} onChange={(p) => session.setNextPrice(p)} />
        <div className="hidden lg:block"><TypeCode onSubmit={(code) => session.typeCode(code)} /></div>
      </div>

      <div className="flex min-h-[calc(100svh-3.25rem-13rem)] flex-col lg:min-h-[calc(100svh-3.25rem)]">
        <ul className="flex-1 divide-y">
          {scans.map((scan, index) => (
            <li key={scan.id} className={cn('flex min-h-14 items-center gap-2 px-3 py-1', index === 0 && 'bg-muted/50')}>
              <div className="min-w-0 flex-1">
                <ScanName scan={scan} />
                <p className="text-muted-foreground truncate text-xs">
                  {timeOf(scan.scannedAt)} · {nameOf(catalog?.locations, scan.locationId)} · {scan.dueDate ?? 'default due'} · {scan.price ? `${scan.price} ${scan.priceType}` : 'no price'} <ScanSource scan={scan} />
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" aria-label="Less" onClick={() => session.changeAmount(scan.id, -1)}><Minus /></Button>
                <span className="w-16 text-center tabular-nums">{scan.amount} {unitOf(scan)}</span>
                <Button variant="outline" size="icon" aria-label="More" onClick={() => session.changeAmount(scan.id, 1)}><Plus /></Button>
                <Button variant="ghost" size="icon" aria-label="Reject" className="hidden sm:inline-flex" onClick={() => session.remove(scan.id)}><Trash2 /></Button>
              </div>
            </li>
          ))}
          {scans.length === 0 && <li className="text-muted-foreground px-3 py-6 text-center">Point the camera at a barcode. The scan appears here.</li>}
        </ul>
        <div className="bg-background sticky bottom-0 flex flex-col border-t pb-12 lg:pb-0">
          <div className="lg:hidden"><TypeCode onSubmit={(code) => session.typeCode(code)} /></div>
          <div className="flex h-12 items-center gap-2 px-3">
            <span className="flex-1">{scans.length} {scans.length === 1 ? 'scan' : 'scans'} in the review queue</span>
            <Button onClick={onDone}><Check data-icon="inline-start" /> Done</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ price, priceType, onChange }: { price: string; priceType: PriceType; onChange: (patch: Partial<{ price: string; priceType: PriceType }>) => void }) {
  return (
    <div className={cn('flex h-12 items-center gap-2 border-b px-3', price && 'bg-primary/10')}>
      <span className="text-muted-foreground shrink-0 text-xs">Price for the<br />next scan</span>
      <Input
        inputMode="decimal"
        placeholder="None"
        aria-label="Price for the next scan"
        className="min-w-0 flex-1"
        value={price}
        onChange={(e) => onChange({ price: e.target.value })}
      />
      <div className="flex rounded-lg border p-0.5">
        {(['unit', 'total'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ priceType: t })}
            className={cn('h-7 rounded-md px-2 text-xs', priceType === t && 'bg-accent font-medium')}
          >
            {t === 'unit' ? 'unit' : 'total'}
          </button>
        ))}
      </div>
    </div>
  );
}
