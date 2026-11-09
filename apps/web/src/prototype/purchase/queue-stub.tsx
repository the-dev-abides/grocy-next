// PROTOTYPE. Throwaway. Where Done lands: the review queue with the scans of
// this session. The review queue screen is its own prototype ticket.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Force } from './decoder';
import { ScanName } from './scan-name';
import { nameOf, timeOf, unitOf, useSession } from './session';

export function QueueStub({ force }: { force: Force }) {
  const [{ scans, catalog }] = useSession(force);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        {scans.length} pending scans from this session. The review queue screen is a separate prototype; this is a stub.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden sm:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">Due date</TableHead>
              <TableHead className="hidden md:table-cell">Store</TableHead>
              <TableHead className="hidden md:table-cell text-right">Price</TableHead>
              <TableHead className="text-right">Scanned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan) => (
              <TableRow key={scan.id}>
                <TableCell className="whitespace-normal"><ScanName scan={scan} /></TableCell>
                <TableCell className="text-right tabular-nums">{scan.amount} {unitOf(scan)}</TableCell>
                <TableCell className="hidden sm:table-cell">{nameOf(catalog?.locations, scan.locationId)}</TableCell>
                <TableCell className="hidden md:table-cell tabular-nums">{scan.dueDate ?? 'Product default'}</TableCell>
                <TableCell className="hidden md:table-cell">{nameOf(catalog?.stores, scan.storeId, '')}</TableCell>
                <TableCell className="hidden md:table-cell text-right tabular-nums">{scan.price ? `${scan.price} ${scan.priceType}` : ''}</TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">{timeOf(scan.scannedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
