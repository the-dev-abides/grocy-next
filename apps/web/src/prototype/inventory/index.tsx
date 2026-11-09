// PROTOTYPE. Throwaway. Not merged.
//
// Three variants of the Inventory scan screen, switchable with
// `?proto=inventory&variant=a|b|c` on the one route of the web app. Add
// `&dark=1` for dark mode and `&decoder=zxing` or `&decoder=native` to force
// one decoder (a prototype switch; the product has none, ADR 0009).
//
// The layout is fixed: variant D of the Purchase scan screen, which the
// maintainer picked. The variants differ in what the count means and in
// how the screen handles a shelf:
// - A, "Count": the count is the new total. The row shows the Grocy stock
//   and the difference. No shelf logic.
// - B, "Shelf": the session is bound to one location. The count is the
//   count on that shelf; the new total keeps the stock elsewhere. The
//   products that Grocy has on the shelf and that were not scanned are
//   listed with a "Not here" button.
// - C, "Keypad": the most recent scan is a card with the Grocy stock in
//   large type and a count field that takes the focus, for a typed count.
import { useEffect, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Force } from '../purchase/decoder';
import { pageTitle, Shell, type Page } from '../purchase/shell';
import { PrototypeSwitcher } from '../theme/switcher';
import { QueueStub } from './queue-stub';
import { useSession } from './session';
import { VariantA, name as nameA } from './variant-a';
import { VariantB, name as nameB } from './variant-b';
import { VariantC, name as nameC } from './variant-c';
import '../theme/prototype.css';

const variants = ['a', 'b', 'c'];
const names: Record<string, string> = { a: nameA, b: nameB, c: nameC };

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const v = p.get('variant') ?? 'a';
  const d = p.get('decoder');
  return {
    variant: variants.includes(v) ? v : 'a',
    dark: p.get('dark') === '1',
    force: (d === 'zxing' || d === 'native' ? d : undefined) as Force,
  };
}

export function InventoryPrototype() {
  const [{ variant, dark, force }, setState] = useState(readParams);
  const [page, setPage] = useState<Page>('inventory');
  const [{ scans }] = useSession(force);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('proto-a', 'proto-b', 'proto-c', 'dark', 'proto-font-geist');
    html.classList.add('proto-a', 'proto-font-roboto');
    if (dark) html.classList.add('dark');
    html.style.colorScheme = dark ? 'dark' : 'light';
    const p = new URLSearchParams(window.location.search);
    p.set('proto', 'inventory');
    p.set('variant', variant);
    if (dark) p.set('dark', '1'); else p.delete('dark');
    window.history.replaceState(null, '', `?${p.toString()}`);
  }, [variant, dark]);

  const done = () => setPage('queue');

  return (
    <TooltipProvider>
      <Shell page={page} go={setPage} queueCount={scans.length} bare={page === 'inventory'}>
        {page === 'inventory' && variant === 'a' && <VariantA force={force} onDone={done} />}
        {page === 'inventory' && variant === 'b' && <VariantB force={force} onDone={done} />}
        {page === 'inventory' && variant === 'c' && <VariantC force={force} onDone={done} />}
        {page === 'queue' && <QueueStub force={force} />}
        {page !== 'inventory' && page !== 'queue' && (
          <p className="text-muted-foreground">The {pageTitle[page]} screen is not part of this prototype.</p>
        )}
      </Shell>
      <PrototypeSwitcher
        variants={variants}
        names={names}
        current={variant}
        onChange={(v) => setState((s) => ({ ...s, variant: v }))}
        dark={dark}
        onDark={(d) => setState((s) => ({ ...s, dark: d }))}
      />
    </TooltipProvider>
  );
}
