// PROTOTYPE. Throwaway. Not merged.
//
// Three variants of the theme and the app shell, switchable with
// `?variant=a|b|c` on the one route of the web app. Add `&dark=1` for dark
// mode. The floating bar at the bottom switches both.
//
// Design plan:
// - Colour: the Grocy palette from the theme research. Blue #337ab7 is the
//   one accent in every variant. A: grey bars #e5e5e5 and the Grocy night
//   mode #333131 with the pink #ff7585. B: white chrome, blue tint on the
//   active item, a cool dark grey at night. C: the blue is the bar itself.
// - Type: A Roboto 14px (Grocy). B Geist 14px (the repo font). C Roboto 15px.
// - Layout: A top bar + 250px sidebar (Grocy). B bottom tab bar on a phone,
//   icon rail on a large screen. C blue top bar with the links in it, one
//   round scan button on a phone.
// - Every variant shows the same review queue table, the same edit dialog,
//   and the same theme page with the palette, the type, and the manifest.
import { useEffect, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PrototypeSwitcher } from './switcher';
import { VariantA, name as nameA } from './variant-a';
import { VariantB, name as nameB } from './variant-b';
import { VariantC, name as nameC } from './variant-c';
import './prototype.css';

const variants = ['a', 'b', 'c'];
const names: Record<string, string> = { a: nameA, b: nameB, c: nameC };

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const v = p.get('variant') ?? 'a';
  return { variant: variants.includes(v) ? v : 'a', dark: p.get('dark') === '1' };
}

export function ThemePrototype() {
  const [{ variant, dark }, setState] = useState(readParams);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('proto-a', 'proto-b', 'proto-c', 'dark', 'proto-font-roboto', 'proto-font-geist');
    html.classList.add(`proto-${variant}`);
    // The font goes on <html>, so that a dialog in a portal gets it too.
    html.classList.add(variant === 'b' ? 'proto-font-geist' : 'proto-font-roboto');
    if (dark) html.classList.add('dark');
    html.style.colorScheme = dark ? 'dark' : 'light';
    const p = new URLSearchParams(window.location.search);
    p.set('variant', variant);
    if (dark) p.set('dark', '1'); else p.delete('dark');
    window.history.replaceState(null, '', `?${p.toString()}`);
  }, [variant, dark]);

  return (
    <TooltipProvider>
      {variant === 'a' && <VariantA />}
      {variant === 'b' && <VariantB />}
      {variant === 'c' && <VariantC />}
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
