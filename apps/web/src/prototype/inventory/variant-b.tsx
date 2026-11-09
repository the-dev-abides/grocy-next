// PROTOTYPE. Throwaway. Variant B: "Shelf".
//
// The session is bound to one location: the shelf. The count on a row is
// the count at this location. The new total that the accept sends is the
// stock elsewhere plus the count here, so that a product on two shelves
// keeps its stock on the other shelf. Under the scanned rows, the products
// that Grocy has at this location and that the user did not scan, with a
// "Not here" button that sets their count here to zero. A change of the
// location in the defaults changes the shelf.
import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import type { Force } from '../purchase/decoder';
import { TypeCode } from '../purchase/variant-a';
import { CameraView } from './camera-view';
import { DefaultsSection, Diff, Footer, ScanName, StockFlags, SwipeRow, round } from './parts';
import { stockAtLocation, type StockedProduct } from './server';
import { nameOf, stockAt, timeOf, unitOf, useSession, type PendingScan, sameUnit } from './session';

export const name = 'Shelf';

// The new total: the stock at the other locations plus the count here.
export function newTotalOf(scan: PendingScan, locationId: string | null) {
  if (!scan.stock) return scan.count;
  return round(scan.stock.stockAmount - stockAt(scan, locationId) + scan.count);
}

export function VariantB({ force, onDone }: { force: Force; onDone: () => void }) {
  const [state, session] = useSession(force);
  const { catalog, defaults, scans } = state;
  const locationId = defaults.locationId;
  const [atLocation, setAtLocation] = useState<StockedProduct[] | null>(null);

  useEffect(() => {
    if (locationId === null) { setAtLocation(null); return; }
    let live = true;
    setAtLocation(null);
    void stockAtLocation(locationId).then((rows) => { if (live) setAtLocation(rows); });
    return () => { live = false; };
  }, [locationId]);

  const notScanned = (atLocation ?? []).filter((p) => !scans.some((s) => s.product?.id === p.productId));
  const shelf = nameOf(catalog?.locations, locationId, 'Pick a location');

  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="bg-background sticky top-13 z-20 lg:h-[calc(100svh-3.25rem)] lg:overflow-y-auto lg:border-r">
        <DefaultsSection catalog={catalog} defaults={defaults} onChange={(p) => session.setDefaults(p)} onReset={() => session.resetDefaults()} locationNone="Pick a location" />
        <CameraView force={force} autoStart className="h-40 lg:aspect-[4/3] lg:h-auto">
          <div className="pointer-events-none absolute top-2 left-2 rounded bg-black/55 px-2 py-0.5 text-xs font-medium">Shelf: {shelf}</div>
        </CameraView>
        <div className="hidden lg:block"><TypeCode onSubmit={(code) => session.typeCode(code)} /></div>
      </div>

      <div className="flex min-h-[calc(100svh-3.25rem-13rem)] flex-col lg:min-h-[calc(100svh-3.25rem)]">
        {locationId === null && (
          <p className="bg-yellow-500/15 text-foreground border-b px-3 py-2 text-xs">No shelf. Pick a location in the defaults. The count is then the count on that shelf.</p>
        )}
        <ul className="flex-1 divide-y">
          {scans.map((scan, index) => {
            const here = stockAt(scan, locationId);
            const elsewhere = scan.stock ? round(scan.stock.stockAmount - here) : 0;
            const total = newTotalOf(scan, locationId);
            return (
              <SwipeRow key={scan.id} onReject={() => session.remove(scan.id)} className={cn('flex min-h-14 items-center gap-2 px-3 py-1', index === 0 ? 'bg-muted' : 'bg-background')}>
                <div className="min-w-0 flex-1">
                  <ScanName scan={scan} />
                  <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
                    {scan.stockPending && <span>The stock loads.</span>}
                    {scan.stock && <span>Here in Grocy: <span className="text-foreground tabular-nums">{here}</span></span>}
                    {scan.stock && elsewhere > 0 && <span>· elsewhere: <span className="text-foreground tabular-nums">{elsewhere}</span></span>}
                    {scan.stock && <span>· new total <span className="text-foreground tabular-nums">{total} {scan.stock.stockUnit}</span></span>}
                    {scan.stock && <Diff newTotal={total} stock={scan.stock.stockAmount} converted={sameUnit(scan)} />}
                    <StockFlags scan={scan} />
                    {scan.source === 'not-here' && <span>· not here</span>}
                    {scan.source !== 'not-here' && <span>· {timeOf(scan.scannedAt)}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" aria-label="Less" onClick={() => session.changeCount(scan.id, -1)}><Minus /></Button>
                  <span className="w-16 text-center tabular-nums">{scan.count} {unitOf(scan)}</span>
                  <Button variant="outline" size="icon" aria-label="More" onClick={() => session.changeCount(scan.id, 1)}><Plus /></Button>
                  <Button variant="ghost" size="icon" aria-label="Reject" className="hidden sm:inline-flex" onClick={() => session.remove(scan.id)}><Trash2 /></Button>
                </div>
              </SwipeRow>
            );
          })}
          {scans.length === 0 && <li className="text-muted-foreground px-3 py-6 text-center">Point the camera at a barcode. The count is the count on this shelf.</li>}
        </ul>

        {locationId !== null && (
          <section className="border-t">
            <header className="bg-muted/50 flex h-10 items-center gap-2 px-3 text-xs">
              <span className="flex-1 font-medium">In Grocy at {shelf}, not scanned{atLocation ? `: ${notScanned.length}` : ''}</span>
              {notScanned.length > 0 && (
                <Button variant="outline" size="xs" onClick={() => notScanned.forEach((p) => session.notHere(p, locationId))}>All not here</Button>
              )}
            </header>
            <ul className="divide-y">
              {atLocation === null && <li className="text-muted-foreground px-3 py-3 text-xs">The stock at this location loads.</li>}
              {atLocation !== null && notScanned.length === 0 && <li className="text-muted-foreground px-3 py-3 text-xs">Every product that Grocy has here is counted.</li>}
              {notScanned.map((p) => (
                <li key={p.productId} className="flex min-h-11 items-center gap-2 px-3 py-1">
                  <div className="min-w-0 flex-1">
                    <span>{p.name}</span>
                    <p className="text-muted-foreground text-xs tabular-nums">Here: {p.hereAmount} {p.stockUnit}{p.totalAmount > p.hereAmount ? ` · elsewhere: ${round(p.totalAmount - p.hereAmount)}` : ''}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => session.notHere(p, locationId)}>Not here</Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Footer scans={scans} onDone={onDone}>
          <div className="lg:hidden"><TypeCode onSubmit={(code) => session.typeCode(code)} /></div>
        </Footer>
      </div>
    </div>
  );
}
