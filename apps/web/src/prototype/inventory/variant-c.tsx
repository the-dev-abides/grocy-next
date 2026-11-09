// PROTOTYPE. Throwaway. Variant C: "Keypad".
//
// The most recent scan is a card under the camera, with the Grocy stock in
// large type and a count field that takes the focus after each scan, so
// that the user types the count of a full shelf instead of one scan per
// item. Two quick buttons: "Same as Grocy" and "0". A repeat scan still
// adds one. The earlier rows are a compact list under the card.
import { useEffect, useRef } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Force } from '../purchase/decoder';
import { TypeCode } from '../purchase/variant-a';
import { CameraView } from './camera-view';
import { DefaultsSection, Diff, Footer, ScanName, StockFlags, SwipeRow } from './parts';
import { nameOf, timeOf, unitOf, useSession, sameUnit } from './session';

export const name = 'Keypad';

export function VariantC({ force, onDone }: { force: Force; onDone: () => void }) {
  const [state, session] = useSession(force);
  const { catalog, defaults, scans } = state;
  const current = scans[0];
  const rest = scans.slice(1);
  const input = useRef<HTMLInputElement>(null);

  // A new scan on top takes the focus into the count field.
  useEffect(() => {
    if (current && current.source !== 'typed') input.current?.select();
  }, [current?.id, current?.scanCount, current?.source]);

  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="bg-background sticky top-13 z-20 lg:h-[calc(100svh-3.25rem)] lg:overflow-y-auto lg:border-r">
        <DefaultsSection catalog={catalog} defaults={defaults} onChange={(p) => session.setDefaults(p)} onReset={() => session.resetDefaults()} />
        <CameraView force={force} autoStart className="h-32 lg:aspect-[4/3] lg:h-auto" />

        {/* The current product: the card. */}
        {current ? (
          <div className="bg-muted flex flex-col gap-2 border-b p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 text-base"><ScanName scan={current} /></div>
              <Button variant="ghost" size="icon" aria-label="Reject" onClick={() => session.remove(current.id)}><Trash2 /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-background p-2">
                <p className="text-muted-foreground text-xs">In Grocy</p>
                <p className="text-2xl font-medium tabular-nums">{current.stock ? current.stock.stockAmount : '…'} <span className="text-muted-foreground text-sm">{current.stock?.stockUnit ?? ''}</span></p>
              </div>
              <div className="rounded-lg border bg-background p-2">
                <label htmlFor="count" className="text-muted-foreground text-xs">Counted</label>
                <div className="flex items-center gap-1">
                  <Input
                    id="count"
                    ref={input}
                    inputMode="decimal"
                    className="h-9 text-2xl font-medium tabular-nums"
                    value={String(current.count)}
                    onChange={(e) => session.setCount(current.id, Number(e.target.value) || 0)}
                  />
                  <span className="text-muted-foreground text-sm">{unitOf(current)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Diff newTotal={current.count} stock={current.stock?.stockAmount ?? null} converted={sameUnit(current)} pending={current.stockPending} className="text-sm" />
              <StockFlags scan={current} />
              <span className="flex-1" />
              <Button variant="outline" size="sm" disabled={!current.stock} onClick={() => current.stock && session.setCount(current.id, current.stock.stockAmount)}>Same as Grocy</Button>
              <Button variant="outline" size="sm" onClick={() => session.setCount(current.id, 0)}>0</Button>
              <Button variant="outline" size="icon" aria-label="Less" onClick={() => session.changeCount(current.id, -1)}><Minus /></Button>
              <Button variant="outline" size="icon" aria-label="More" onClick={() => session.changeCount(current.id, 1)}><Plus /></Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground border-b px-3 py-4 text-center text-xs">Scan a product. Its card appears here with the Grocy stock and a count field.</p>
        )}
        <div className="hidden lg:block"><TypeCode onSubmit={(code) => session.typeCode(code)} /></div>
      </div>

      <div className="flex min-h-[calc(100svh-3.25rem-13rem)] flex-col lg:min-h-[calc(100svh-3.25rem)]">
        <ul className="flex-1 divide-y">
          {rest.map((scan) => (
            <SwipeRow key={scan.id} onReject={() => session.remove(scan.id)} className="bg-background flex min-h-11 items-center gap-2 px-3 py-1">
              <div className="min-w-0 flex-1 truncate"><ScanName scan={scan} /> <span className="text-muted-foreground text-xs">· {timeOf(scan.scannedAt)} · {nameOf(catalog?.locations, scan.locationId)}</span></div>
              <span className="text-muted-foreground text-xs tabular-nums">{scan.stock ? `${scan.stock.stockAmount} →` : ''}</span>
              <span className={cn('w-14 text-right tabular-nums')}>{scan.count} {unitOf(scan)}</span>
              <Diff newTotal={scan.count} stock={scan.stock?.stockAmount ?? null} converted={sameUnit(scan)} pending={scan.stockPending} />
            </SwipeRow>
          ))}
          {rest.length === 0 && <li className="text-muted-foreground px-3 py-6 text-center text-xs">{current ? 'The earlier counts appear here.' : 'No counts yet.'}</li>}
        </ul>
        <Footer scans={scans} onDone={onDone}>
          <div className="lg:hidden"><TypeCode onSubmit={(code) => session.typeCode(code)} /></div>
        </Footer>
      </div>
    </div>
  );
}
