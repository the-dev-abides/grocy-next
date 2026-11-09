// PROTOTYPE. Throwaway. The name of a pending scan: the product, the lookup
// result, or the bare code. The words come from the three facts of ADR 0010.
import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';
import type { PendingScan } from './session';

export function ScanName({ scan, light }: { scan: PendingScan; light?: boolean }) {
  const muted = light ? 'text-white/70' : 'text-muted-foreground';
  if (scan.product) return <span className="font-medium">{scan.product.name}</span>;
  if (scan.lookup)
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="truncate font-medium">{scan.lookup.name}</span>
        <Badge variant="outline" className={cn('font-normal', light && 'border-white/40 text-white')}>New product</Badge>
      </span>
    );
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className={cn('font-mono', muted)}>{scan.code}</span>
      <Badge variant={light ? 'outline' : 'secondary'} className={cn('font-normal', light && 'border-white/40 text-white')}>
        {scan.lookupPending ? 'Lookup runs' : 'No product'}
      </Badge>
    </span>
  );
}

export function ScanSource({ scan }: { scan: PendingScan }) {
  if (!scan.lookup) return null;
  return (
    <a href={scan.lookup.sourceUrl} target="_blank" rel="noreferrer" className="text-muted-foreground text-xs underline">
      {scan.lookup.service}
    </a>
  );
}
