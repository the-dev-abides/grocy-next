// PROTOTYPE. Throwaway. Where Done lands: the review queue with the
// Inventory pending scans of this session. The review queue screen is its
// own prototype ticket.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Force } from '../purchase/decoder';
import { Diff, ScanName } from './parts';
import { nameOf, timeOf, unitOf, useSession, sameUnit } from './session';

export function QueueStub({ force }: { force: Force }) {
  const [{ scans, catalog }] = useSession(force);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        {scans.length} Inventory pending scans from this session. The review queue screen is a separate prototype; this is a stub.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead className="text-right">In Grocy</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="hidden sm:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">Due date</TableHead>
              <TableHead className="text-right">Scanned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan) => (
              <TableRow key={scan.id}>
                <TableCell className="whitespace-normal"><ScanName scan={scan} /></TableCell>
                <TableCell className="text-right tabular-nums">{scan.count} {unitOf(scan)}</TableCell>
                <TableCell className="text-right tabular-nums">{scan.stock ? `${scan.stock.stockAmount} ${scan.stock.stockUnit}` : ''}</TableCell>
                <TableCell className="text-right"><Diff newTotal={scan.count} stock={scan.stock?.stockAmount ?? null} converted={sameUnit(scan)} pending={scan.stockPending} /></TableCell>
                <TableCell className="hidden sm:table-cell">{nameOf(catalog?.locations, scan.locationId)}</TableCell>
                <TableCell className="hidden md:table-cell tabular-nums">{scan.dueDate ?? 'Product default'}</TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">{timeOf(scan.scannedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
