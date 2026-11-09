// PROTOTYPE. Throwaway. Not merged.
//
// Three variants of the review queue screen, switchable with
// `?proto=queue&variant=a|b|c` on the one route of the web app. Add
// `&dark=1` for dark mode. The shell is variant A of the theme prototype
// (ADR 0013). The queue is an in-memory seed with rows from both scan
// screens and from the MCP server; see `queue.ts`.
//
// - A, "Table": one table with checkboxes, inline edit in the cells, the
//   row actions at the right end.
// - B, "Cards": one card per pending scan with every fact, plus and minus,
//   big Accept and Reject, a swipe to reject, and a select mode.
// - C, "Board": the rows split by what they need before the accept, each
//   section with its one control, and "Accept all ready".
import { useEffect, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { pageTitle, Shell, type Page } from '../purchase/shell';
import { PrototypeSwitcher } from '../theme/switcher';
import { useQueue } from './queue';
import { VariantA, name as nameA } from './variant-a';
import { VariantB, name as nameB } from './variant-b';
import { VariantC, name as nameC } from './variant-c';
import '../theme/prototype.css';

const variants = ['a', 'b', 'c'];
const names: Record<string, string> = { a: nameA, b: nameB, c: nameC };

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const v = p.get('variant') ?? 'a';
  return { variant: variants.includes(v) ? v : 'a', dark: p.get('dark') === '1' };
}

export function QueuePrototype() {
  const [{ variant, dark }, setState] = useState(readParams);
  const [page, setPage] = useState<Page>('queue');
  const [{ scans }] = useQueue();

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('proto-a', 'proto-b', 'proto-c', 'dark', 'proto-font-geist');
    html.classList.add('proto-a', 'proto-font-roboto');
    if (dark) html.classList.add('dark');
    html.style.colorScheme = dark ? 'dark' : 'light';
    const p = new URLSearchParams(window.location.search);
    p.set('proto', 'queue');
    p.set('variant', variant);
    if (dark) p.set('dark', '1'); else p.delete('dark');
    window.history.replaceState(null, '', `?${p.toString()}`);
  }, [variant, dark]);

  return (
    <TooltipProvider>
      <Shell page={page} go={setPage} queueCount={scans.length}>
        {page === 'queue' && variant === 'a' && <VariantA />}
        {page === 'queue' && variant === 'b' && <VariantB />}
        {page === 'queue' && variant === 'c' && <VariantC />}
        {page !== 'queue' && (
          <p className="text-muted-foreground">The {pageTitle[page]} screen is not part of this prototype. The scan screens are on their own branches.</p>
        )}
      </Shell>
      <PrototypeSwitcher
        variants={variants}
        names={names}
        current={variant}
        onChange={(v) => setState((s) => ({ ...s, variant: v }))}
        dark={dark}
        onDark={(d) => setState((s) => ({ ...s, dark: d }))}
        raise={variant === 'b'}
      />
    </TooltipProvider>
  );
}
