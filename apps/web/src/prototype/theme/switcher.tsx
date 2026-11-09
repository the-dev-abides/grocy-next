// PROTOTYPE. Throwaway. The floating bar that switches the variant and the
// dark mode. Hidden in a production build.
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';
import { cn } from 'cn';

export function PrototypeSwitcher({
  variants, current, names, onChange, dark, onDark, raise,
}: {
  variants: string[]; current: string; names: Record<string, string>;
  onChange: (v: string) => void; dark: boolean; onDark: (d: boolean) => void; raise?: boolean;
}) {
  const index = variants.indexOf(current);
  const prev = () => onChange(variants[(index - 1 + variants.length) % variants.length]);
  const next = () => onChange(variants[(index + 1) % variants.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (import.meta.env.PROD) return null;
  return (
    <div
      role="toolbar"
      aria-label="Prototype variant"
      className={cn(
        'fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-1.5 py-1 font-sans text-xs text-white shadow-xl ring-2 ring-yellow-400',
        raise ? 'bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-4' : 'bottom-4',
      )}
    >
      <button type="button" onClick={prev} aria-label="Previous variant" className="rounded-full p-1 hover:bg-white/20"><ChevronLeft className="size-4" /></button>
      <span className="min-w-28 text-center font-medium whitespace-nowrap">{current.toUpperCase()} · {names[current]}</span>
      <button type="button" onClick={next} aria-label="Next variant" className="rounded-full p-1 hover:bg-white/20"><ChevronRight className="size-4" /></button>
      <span className="mx-1 h-4 w-px bg-white/30" />
      <button type="button" onClick={() => onDark(!dark)} aria-pressed={dark} aria-label="Dark mode" className="rounded-full p-1 hover:bg-white/20">
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </div>
  );
}
