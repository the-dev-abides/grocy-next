// PROTOTYPE. The black bar at the top that switches the variant. It also
// resets the stand-in data and shows the state of the queue.
import { Braces, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { useSearchParams } from 'react-router';

import type { PrototypeQueue } from './use-prototype-queue';

export const VARIANTS = [
  { key: 'A', name: 'One table, a booking type column' },
  { key: 'B', name: 'A tab for each booking type' },
  { key: 'C', name: 'Grouped by product, with the stock' },
] as const;

export type Variant = (typeof VARIANTS)[number];

export function useVariant(): undefined | Variant {
  const [parameters] = useSearchParams();
  const key = parameters.get('variant');
  return VARIANTS.find((variant) => variant.key === key);
}

function isTextTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
  );
}

function useStep(variant: Variant): (delta: number) => void {
  const [, setParameters] = useSearchParams();
  const index = VARIANTS.indexOf(variant);
  const step = (delta: number) => {
    const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
    setParameters({ variant: next?.key ?? 'A' }, { replace: true });
  };
  const onArrow = useEffectEvent(step);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isDialog = document.querySelector('[role="dialog"]') !== null;
      if (isDialog || isTextTarget(event.target)) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        onArrow(-1);
      } else if (event.key === 'ArrowRight') {
        onArrow(1);
      }
    };
    globalThis.addEventListener('keydown', onKey);
    return () => {
      globalThis.removeEventListener('keydown', onKey);
    };
  }, []);
  return step;
}

const BUTTON = `
  flex size-7 items-center justify-center rounded-full
  hover:bg-white/20
`;

function StatePanel({
  queue,
  variant,
}: Readonly<{ queue: PrototypeQueue; variant: Variant }>) {
  const state = {
    checked: queue.checked,
    plans: Object.fromEntries(queue.plans),
    rows: queue.rows,
    stock: Object.fromEntries(queue.stock),
    variant: `${variant.key}: ${variant.name}`,
  };
  return (
    <pre
      className="
        fixed inset-x-2 top-14 z-50 max-h-[60svh] overflow-auto rounded-lg
        bg-black/90 p-3 font-mono text-xs text-white shadow-lg
        sm:left-auto sm:w-md
      "
    >
      {JSON.stringify(state, null, 2)}
    </pre>
  );
}

function VariantButtons({ variant }: Readonly<{ variant: Variant }>) {
  const step = useStep(variant);
  return (
    <>
      <button
        type="button"
        aria-label="Previous variant"
        className={BUTTON}
        onClick={() => {
          step(-1);
        }}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="px-1 font-medium" title={variant.name}>
        {variant.key}
        <span
          className="
            hidden
            md:inline
          "
        >
          {' '}
          {variant.name}
        </span>
      </span>
      <button
        type="button"
        aria-label="Next variant"
        className={BUTTON}
        onClick={() => {
          step(1);
        }}
      >
        <ChevronRight className="size-4" />
      </button>
    </>
  );
}

export function PrototypeSwitcher({
  queue,
  variant,
}: Readonly<{ queue: PrototypeQueue; variant: Variant }>) {
  const [isStateOpen, setIsStateOpen] = useState(false);
  if (!import.meta.env.DEV) {
    return null;
  }
  return (
    <>
      <div
        className="
          fixed top-2 right-2 z-50 flex h-9 items-center gap-0.5 rounded-full
          bg-black px-1 text-sm text-white shadow-lg
          sm:right-1/2 sm:translate-x-1/2
        "
      >
        <VariantButtons variant={variant} />
        <span className="mx-0.5 h-4 w-px bg-white/30" />
        <button
          type="button"
          aria-label="Reset the demo data"
          title="Reset the demo data"
          className={BUTTON}
          onClick={queue.reset}
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Show the state"
          aria-pressed={isStateOpen}
          title="Show the state"
          className={BUTTON}
          onClick={() => {
            setIsStateOpen((open) => !open);
          }}
        >
          <Braces className="size-4" />
        </button>
      </div>
      {isStateOpen && <StatePanel queue={queue} variant={variant} />}
    </>
  );
}
