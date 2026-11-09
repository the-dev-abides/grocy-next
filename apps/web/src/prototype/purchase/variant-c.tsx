// PROTOTYPE. Throwaway. Variant C: "List".
//
// The scans of the session are the page. The camera is a short strip that
// stays at the top while the list scrolls. The defaults are one line under
// the strip; a tap on it opens a dialog with all five fields, so that the
// user changes several in one go. Each row has plus and minus for the
// amount. The session starts when the screen opens; a sticky footer ends it.
import { useState } from 'react';
import { Check, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CameraView } from './camera-view';
import type { Force } from './decoder';
import { DefaultsFields } from './fields';
import { ScanName, ScanSource } from './scan-name';
import { dueRuleLabel, nameOf, priceLabel, timeOf, unitOf, useSession } from './session';
import { TypeCode } from './variant-a';

export const name = 'List';

export function VariantC({ force, onDone }: { force: Force; onDone: () => void }) {
  const [state, session] = useSession(force);
  const [editing, setEditing] = useState(false);
  const { catalog, defaults, scans } = state;

  const summary = [
    nameOf(catalog?.locations, defaults.locationId),
    nameOf(catalog?.stores, defaults.storeId, 'no store'),
    dueRuleLabel(defaults.dueRule),
    priceLabel(defaults),
    nameOf(catalog?.productGroups, defaults.productGroupId, 'default group'),
  ].join(' · ');

  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="sticky top-13 z-20 lg:h-[calc(100svh-3.25rem)] lg:overflow-y-auto lg:border-r">
        <CameraView force={force} autoStart className="h-40 lg:aspect-[4/3] lg:h-auto" />
        <button type="button" onClick={() => setEditing(true)} className="bg-background hover:bg-muted flex h-11 w-full items-center gap-2 border-b px-3 text-left">
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <Pencil className="text-muted-foreground size-4 shrink-0" />
        </button>
        <div className="hidden lg:block"><TypeCode onSubmit={(code) => session.typeCode(code)} /></div>
      </div>

      <div className="flex min-h-[calc(100svh-3.25rem-10rem)] flex-col lg:min-h-[calc(100svh-3.25rem)]">
        <ul className="flex-1 divide-y">
          {scans.map((scan) => (
            <li key={scan.id} className="flex min-h-14 items-center gap-2 px-3 py-1">
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

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Session defaults</DialogTitle>
            <DialogDescription>The scans that follow copy these.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <DefaultsFields catalog={catalog} defaults={defaults} onChange={(p) => session.setDefaults(p)} idPrefix="c" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => session.resetDefaults()}>Reset</Button>
            <Button onClick={() => setEditing(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
