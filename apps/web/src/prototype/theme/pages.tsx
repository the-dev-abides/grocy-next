// PROTOTYPE. Throwaway. The page content that every shell variant shows.
import { useEffect, useState, type ReactNode } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { locations, pageTitle, pendingScans, units, type Page, type PendingScan } from './data';

// ---------------------------------------------------------------- pages

export function PageContent({ page, variant }: { page: Page; variant: string }) {
  if (page === 'queue') return <ReviewQueuePage />;
  if (page === 'theme') return <ThemePage variant={variant} />;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground">
        The {pageTitle[page]} screen is not part of this prototype. Open the
        review queue or the theme page.
      </p>
    </div>
  );
}

// ---------------------------------------------------------- review queue

function ScanName({ scan }: { scan: PendingScan }) {
  if (scan.lookup === 'product') return <span className="font-medium">{scan.product}</span>;
  if (scan.lookup === 'result')
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium">{scan.product}</span>
        <Badge variant="outline" className="font-normal">New product</Badge>
      </span>
    );
  if (scan.lookup === 'waiting')
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-muted-foreground">{scan.barcode}</span>
        <Badge variant="secondary" className="font-normal">Lookup runs</Badge>
      </span>
    );
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-muted-foreground">{scan.barcode}</span>
      <Badge variant="secondary" className="font-normal">No product</Badge>
    </span>
  );
}

export function ReviewQueuePage() {
  const [selected, setSelected] = useState<Set<number>>(() => new Set([101, 102, 103]));
  const [editing, setEditing] = useState<PendingScan | null>(null);
  const all = selected.size === pendingScans.length;

  const toggleAll = () =>
    setSelected(all ? new Set() : new Set(pendingScans.map((s) => s.id)));
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground mr-auto">
          {pendingScans.length} pending scans. {selected.size} selected.
        </p>
        <Button variant="outline" size="sm" disabled={selected.size === 0}>
          <X data-icon="inline-start" /> Reject selected
        </Button>
        <Button size="sm" disabled={selected.size === 0}>
          <Check data-icon="inline-start" /> Accept selected
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8">
                <Checkbox checked={all} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">Due date</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Price</TableHead>
              <TableHead className="hidden lg:table-cell">Scanned</TableHead>
              <TableHead className="w-8 text-right sm:w-24">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingScans.map((scan) => (
              <TableRow
                key={scan.id}
                data-state={selected.has(scan.id) ? 'selected' : undefined}
                className={scan.error ? 'proto-row-expired' : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={selected.has(scan.id)}
                    onCheckedChange={() => toggle(scan.id)}
                    aria-label={`Select ${scan.product ?? scan.barcode}`}
                  />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <ScanName scan={scan} />
                  {scan.error && (
                    <p className="text-destructive mt-0.5 text-xs">{scan.error}</p>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {scan.bookingType === 'purchase' ? 'Purchase' : 'Inventory'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {scan.amount} {scan.unit}
                </TableCell>
                <TableCell className="hidden md:table-cell">{scan.location}</TableCell>
                <TableCell className="hidden md:table-cell tabular-nums">{scan.dueDate}</TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums">
                  {scan.price ? `${scan.price} €` : ''}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{scan.scannedAt}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-0.5">
                    <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => setEditing(scan)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Reject" className="hidden sm:inline-flex">
                      <Trash2 />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Accept" className="hidden sm:inline-flex">
                      <Check />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Product data from Open Food Facts, ODbL. Rows with a red tint carry a Grocy error.
      </p>

      <EditDialog scan={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditDialog({ scan, onClose }: { scan: PendingScan | null; onClose: () => void }) {
  return (
    <Dialog open={scan !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit pending scan</DialogTitle>
          <DialogDescription>
            {scan?.product ?? scan?.barcode}. The accept books one{' '}
            {scan?.bookingType === 'inventory' ? 'inventory' : 'purchase'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" inputMode="decimal" defaultValue={scan?.amount} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">Unit</Label>
            <Select defaultValue={scan?.unit ?? 'Piece'}>
              <SelectTrigger id="unit" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Select defaultValue={scan?.location ?? 'Pantry'}>
              <SelectTrigger id="location" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="due">Due date</Label>
            <Input id="due" type="date" defaultValue={scan?.dueDate} />
          </div>
          {scan?.bookingType === 'purchase' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price">Price</Label>
                <Input id="price" inputMode="decimal" defaultValue={scan?.price} placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="store">Store</Label>
                <Input id="store" defaultValue={scan?.store} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------- theme page

const tokens = [
  'background', 'foreground', 'primary', 'primary-foreground', 'secondary', 'muted',
  'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'border', 'input', 'ring',
  'sidebar', 'sidebar-foreground', 'sidebar-primary', 'sidebar-accent', 'sidebar-border',
];

function useComputedTokens(variant: string) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const t of tokens) next[t] = style.getPropertyValue(`--${t}`).trim();
      next.font = style.fontFamily;
      next.radius = style.getPropertyValue('--radius').trim();
      setValues(next);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [variant]);
  return values;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

export function ThemePage({ variant }: { variant: string }) {
  const values = useComputedTokens(variant);
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <Section title="Palette">
        <p className="text-muted-foreground">
          The shadcn/ui tokens of the active variant. Switch dark mode on the bar at the bottom.
        </p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {tokens.map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-md border p-1.5">
              <span
                className="size-9 shrink-0 rounded border"
                style={{ background: `var(--${t})` }}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-medium">{t}</span>
                <span className="text-muted-foreground truncate text-[10px]">{values[t]}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Stock status rows">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Next due date</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="proto-row-expired"><TableCell>Yoghurt</TableCell><TableCell className="text-right">2 Cup</TableCell><TableCell>2026-11-01</TableCell><TableCell>Expired</TableCell></TableRow>
              <TableRow className="proto-row-overdue"><TableCell>Crackers</TableCell><TableCell className="text-right">1 Pack</TableCell><TableCell>2026-11-05</TableCell><TableCell>Overdue</TableCell></TableRow>
              <TableRow className="proto-row-due-soon"><TableCell>Whole milk</TableCell><TableCell className="text-right">1 Bottle</TableCell><TableCell>2026-11-11</TableCell><TableCell>Due soon</TableCell></TableRow>
              <TableRow className="proto-row-below-min"><TableCell>Coffee beans</TableCell><TableCell className="text-right">0 Bag</TableCell><TableCell></TableCell><TableCell>Below minimum stock</TableCell></TableRow>
              <TableRow><TableCell>Olive oil</TableCell><TableCell className="text-right">2 Bottle</TableCell><TableCell>2027-09-12</TableCell><TableCell></TableCell></TableRow>
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Type">
        <p className="text-muted-foreground">
          Family: <span className="font-medium text-foreground">{values.font}</span>. Radius:{' '}
          <span className="font-medium text-foreground">{values.radius}</span>.
        </p>
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <p className="text-2xl font-medium">Page title, 1.5rem 500</p>
          <p className="text-lg font-medium">Section title, 1.125rem 500</p>
          <p className="text-base">
            Body, 1rem 400. Scan the barcode. The pending scan waits in the review queue
            until you accept it.
          </p>
          <p className="text-sm">
            Table and form text, 0.875rem 400. Whole milk 1 l, 2 Bottle, Fridge, 2026-11-16.
          </p>
          <p className="text-muted-foreground text-xs">Small text, 0.75rem 400. Scanned at 09:41.</p>
          <p className="font-mono text-sm">Code, 0.875rem monospace. 4006381333931</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>Accept</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Reject</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Badge>Badge</Badge>
          <Badge variant="secondary">7</Badge>
          <Badge variant="outline">New product</Badge>
        </div>
      </Section>

      <Section title="Install manifest">
        <p className="text-muted-foreground">
          The icon at the three sizes that a phone needs. The circle marks the safe zone of the
          maskable icon. The manifest file is at <span className="font-mono">/manifest.webmanifest</span>.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <figure className="flex flex-col items-center gap-1">
            <img src="/icons/icon-192.png" alt="" width={96} height={96} className="rounded-2xl" />
            <figcaption className="text-muted-foreground text-xs">any, 192 and 512</figcaption>
          </figure>
          <figure className="flex flex-col items-center gap-1">
            <span className="relative">
              <img src="/icons/icon-maskable-512.png" alt="" width={96} height={96} />
              <span className="pointer-events-none absolute inset-[10%] rounded-full border border-dashed border-white/80" />
            </span>
            <figcaption className="text-muted-foreground text-xs">maskable, 512</figcaption>
          </figure>
          <figure className="flex flex-col items-center gap-1">
            <img src="/icons/icon-maskable-512.png" alt="" width={48} height={48} className="rounded-full" />
            <figcaption className="text-muted-foreground text-xs">as Android shows it</figcaption>
          </figure>
        </div>
        <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs leading-relaxed">{`{
  "id": "/",
  "name": "Grocy Next",
  "short_name": "Grocy Next",
  "description": "Scan to stock for Grocy.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#ffffff",
  "theme_color": "#337ab7",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}`}</pre>
      </Section>
    </div>
  );
}
