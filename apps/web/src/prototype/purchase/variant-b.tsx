// PROTOTYPE. Throwaway. Variant B: "Form".
//
// The Grocy purchase page with a camera in it. The defaults are form fields
// on the page, all visible at once; a change is a tap on the field and a tap
// on the option. The camera is a box under the form, and the session starts
// with an explicit Start. The scans of the session are a table under the
// camera, or in a second column on a large screen.
import { Check, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CameraView } from './camera-view';
import type { Force } from './decoder';
import { DefaultsFields } from './fields';
import { ScanName, ScanSource } from './scan-name';
import { nameOf, timeOf, unitOf, useSession } from './session';
import { TypeCode } from './variant-a';

export const name = 'Form';

export function VariantB({ force, onDone }: { force: Force; onDone: () => void }) {
  const [state, session] = useSession(force);
  const { catalog, defaults, scans } = state;

  return (
    <div className="grid gap-4 pb-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Session defaults</h2>
            <Button variant="ghost" size="sm" onClick={() => session.resetDefaults()}>Reset</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DefaultsFields catalog={catalog} defaults={defaults} onChange={(p) => session.setDefaults(p)} idPrefix="b" />
          </div>
          <p className="text-muted-foreground text-xs">The scans that follow copy these. A change does not touch the scans before it.</p>
        </section>

        <CameraView force={force} autoStart={false} className="aspect-[4/3] w-full rounded-lg" />
        <TypeCode onSubmit={(code) => session.typeCode(code)} />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => session.detachCamera()}><Square data-icon="inline-start" /> Stop the camera</Button>
          <Button className="flex-1" onClick={onDone}><Check data-icon="inline-start" /> Done, review</Button>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Scanned this session</h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell">Due date</TableHead>
                <TableHead className="hidden md:table-cell text-right">Price</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell className="whitespace-normal"><ScanName scan={scan} /> <ScanSource scan={scan} /></TableCell>
                  <TableCell className="text-right tabular-nums">{scan.amount} {unitOf(scan)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{nameOf(catalog?.locations, scan.locationId)}</TableCell>
                  <TableCell className="hidden md:table-cell tabular-nums">{scan.dueDate ?? 'Product default'}</TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums">{scan.price ? `${scan.price} ${scan.priceType}` : ''}</TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">{timeOf(scan.scannedAt)}</TableCell>
                </TableRow>
              ))}
              {scans.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-muted-foreground h-11 text-center">No scan yet. Start the camera.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-muted-foreground text-xs">Every scan is in the review queue already. Contains data from Open Food Facts, available under the Open Database License.</p>
      </section>
    </div>
  );
}
