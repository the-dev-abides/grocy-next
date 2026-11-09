// PROTOTYPE. Throwaway. Variant A: "Count".
//
// The layout of variant D of the Purchase prototype with the Inventory
// facts on the row. The count is the new total stock of the product. Next
// to it, the stock that Grocy has now and the difference. A repeat scan
// adds one. Plus and minus change the count. Two shelves: the user keeps
// one row per product and counts on; the location default applies to
// added stock only.
import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import type { Force } from '../purchase/decoder';
import { TypeCode } from '../purchase/variant-a';
import { CameraView } from './camera-view';
import { DefaultsSection, Diff, Footer, ScanName, StockFlags, SwipeRow } from './parts';
import { nameOf, timeOf, unitOf, useSession, sameUnit } from './session';

export const name = 'Count';

export function VariantA({ force, onDone }: { force: Force; onDone: () => void }) {
  const [state, session] = useSession(force);
  const { catalog, defaults, scans } = state;

  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="bg-background sticky top-13 z-20 lg:h-[calc(100svh-3.25rem)] lg:overflow-y-auto lg:border-r">
        <DefaultsSection catalog={catalog} defaults={defaults} onChange={(p) => session.setDefaults(p)} onReset={() => session.resetDefaults()} />
        <CameraView force={force} autoStart className="h-40 lg:aspect-[4/3] lg:h-auto" />
        <div className="hidden lg:block"><TypeCode onSubmit={(code) => session.typeCode(code)} /></div>
      </div>

      <div className="flex min-h-[calc(100svh-3.25rem-13rem)] flex-col lg:min-h-[calc(100svh-3.25rem)]">
        <ul className="flex-1 divide-y">
          {scans.map((scan, index) => (
            <SwipeRow key={scan.id} onReject={() => session.remove(scan.id)} className={cn('flex min-h-14 items-center gap-2 px-3 py-1', index === 0 ? 'bg-muted' : 'bg-background')}>
              <div className="min-w-0 flex-1">
                <ScanName scan={scan} />
                <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
                  {scan.stockPending && <span>The stock loads.</span>}
                  {scan.stock && <span>In Grocy: <span className="text-foreground tabular-nums">{scan.stock.stockAmount} {scan.stock.stockUnit}</span></span>}
                  {scan.stock && <Diff newTotal={scan.count} stock={scan.stock.stockAmount} converted={sameUnit(scan)} />}
                  <StockFlags scan={scan} />
                  <span>· {timeOf(scan.scannedAt)} · {nameOf(catalog?.locations, scan.locationId)}</span>
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" aria-label="Less" onClick={() => session.changeCount(scan.id, -1)}><Minus /></Button>
                <span className="w-16 text-center tabular-nums">{scan.count} {unitOf(scan)}</span>
                <Button variant="outline" size="icon" aria-label="More" onClick={() => session.changeCount(scan.id, 1)}><Plus /></Button>
                <Button variant="ghost" size="icon" aria-label="Reject" className="hidden sm:inline-flex" onClick={() => session.remove(scan.id)}><Trash2 /></Button>
              </div>
            </SwipeRow>
          ))}
          {scans.length === 0 && <li className="text-muted-foreground px-3 py-6 text-center">Point the camera at a barcode. Each scan of the same product adds one to its count.</li>}
        </ul>
        <Footer scans={scans} onDone={onDone}>
          <div className="lg:hidden"><TypeCode onSubmit={(code) => session.typeCode(code)} /></div>
        </Footer>
      </div>
    </div>
  );
}
