// PROTOTYPE. Throwaway. Not merged.
//
// Three variants of the Purchase scan screen, switchable with
// `?proto=purchase&variant=a|b|c` on the one route of the web app. Add
// `&dark=1` for dark mode and `&decoder=zxing` or `&decoder=native` to force
// one decoder (a prototype switch; the product has none, ADR 0009).
//
// Design plan:
// - A, "Viewfinder": the camera is the screen. Defaults as chips over the
//   camera, a bottom sheet per chip. The last scans in a panel over the
//   camera. Camera on at open.
// - B, "Form": the Grocy purchase page with a camera in it. Defaults as form
//   fields on the page. The scans as a table. Camera on with Start.
// - C, "List": the scans are the page, the camera is a strip at the top,
//   the defaults are one line and one dialog. Plus and minus per row.
// - D, "Hybrid": the maintainer's mix after the first review. The layout
//   of C, the defaults as a collapsible form above the camera, no price
//   default, and a price row for the most recent scan under the camera.
// All four use the app shell of ADR 0013 and the same camera view, with
// the same sound, vibration, and on-screen feedback.
import { useEffect, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Force } from './decoder';
import { QueueStub } from './queue-stub';
import { pageTitle, Shell, type Page } from './shell';
import { useSession } from './session';
import { PrototypeSwitcher } from '../theme/switcher';
import { VariantA, name as nameA } from './variant-a';
import { VariantB, name as nameB } from './variant-b';
import { VariantC, name as nameC } from './variant-c';
import { VariantD, name as nameD } from './variant-d';
import '../theme/prototype.css';

const variants = ['d', 'a', 'b', 'c'];
const names: Record<string, string> = { a: nameA, b: nameB, c: nameC, d: nameD };

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const v = p.get('variant') ?? 'd';
  const d = p.get('decoder');
  return {
    variant: variants.includes(v) ? v : 'd',
    dark: p.get('dark') === '1',
    force: (d === 'zxing' || d === 'native' ? d : undefined) as Force,
  };
}

export function PurchasePrototype() {
  const [{ variant, dark, force }, setState] = useState(readParams);
  const [page, setPage] = useState<Page>('purchase');
  const [{ scans }] = useSession(force);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('proto-a', 'proto-b', 'proto-c', 'dark', 'proto-font-geist');
    html.classList.add('proto-a', 'proto-font-roboto');
    if (dark) html.classList.add('dark');
    html.style.colorScheme = dark ? 'dark' : 'light';
    const p = new URLSearchParams(window.location.search);
    p.set('proto', 'purchase');
    p.set('variant', variant);
    if (dark) p.set('dark', '1'); else p.delete('dark');
    window.history.replaceState(null, '', `?${p.toString()}`);
  }, [variant, dark]);

  const done = () => setPage('queue');

  return (
    <TooltipProvider>
      <Shell page={page} go={setPage} queueCount={scans.length} bare={page === 'purchase' && variant !== 'b'}>
        {page === 'purchase' && variant === 'a' && <VariantA force={force} onDone={done} />}
        {page === 'purchase' && variant === 'b' && <VariantB force={force} onDone={done} />}
        {page === 'purchase' && variant === 'c' && <VariantC force={force} onDone={done} />}
        {page === 'purchase' && variant === 'd' && <VariantD force={force} onDone={done} />}
        {page === 'queue' && <QueueStub force={force} />}
        {page !== 'purchase' && page !== 'queue' && (
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
