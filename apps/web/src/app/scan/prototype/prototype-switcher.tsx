// PROTOTYPE. The bar that switches the variant. It is in the top bar, since
// each variant has controls at the bottom of the screen. It also makes demo
// scans and shows the state of the session.
import {
  Braces,
  ChevronLeft,
  ChevronRight,
  Dices,
  FileQuestion,
} from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { useSearchParams } from 'react-router';

import type { PrototypeSession } from './use-prototype-session';

import { DEMO_PREFIX, PRODUCTS } from './prototype-data';

export const PROTOTYPE_PATH = '/scan/consume-transfer';

export const VARIANTS = [
  {
    key: 'A',
    name: 'Switch under the camera',
    navLabel: 'Consume and Transfer',
    policy: 'stay',
    typeSound: false,
  },
  {
    key: 'B',
    name: 'Mode on the camera, Transfer for one scan',
    navLabel: 'Consume',
    policy: 'each-scan',
    typeSound: true,
  },
  {
    key: 'C',
    name: 'Switch at the thumb, with a time limit',
    navLabel: 'Use or move',
    policy: 'timed',
    typeSound: true,
  },
] as const;

export type Variant = (typeof VARIANTS)[number];

export function useVariant(): Variant {
  const [searchParameters] = useSearchParams();
  const key = searchParameters.get('variant');
  return VARIANTS.find((variant) => variant.key === key) ?? VARIANTS[0];
}

function isTextTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
  );
}

// This hook gives the step to the next or the previous variant. The left
// and the right arrow keys make the step too, when no field has the focus.
function useVariantStep(): (delta: number) => void {
  const [, setSearchParameters] = useSearchParams();
  const index = VARIANTS.indexOf(useVariant());
  const step = (delta: number) => {
    const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
    setSearchParameters({ variant: next?.key ?? 'A' }, { replace: true });
  };
  const onArrow = useEffectEvent(step);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTextTarget(event.target)) {
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

function VariantButtons() {
  const variant = useVariant();
  const step = useVariantStep();
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

const demo = { next: 0 };

// The demo scans: each tap scans the next stand-in product, and one button
// scans an unknown code.
function DemoButtons({ onCode }: Readonly<{ onCode: (code: string) => void }>) {
  return (
    <>
      <button
        type="button"
        aria-label="Demo scan of a product"
        title="Demo scan of a product"
        className={BUTTON}
        onClick={() => {
          const product = PRODUCTS[demo.next++ % PRODUCTS.length];
          onCode(`${DEMO_PREFIX}${String(product?.id ?? 1)}`);
        }}
      >
        <Dices className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Demo scan of an unknown code"
        title="Demo scan of an unknown code"
        className={BUTTON}
        onClick={() => {
          onCode(`${DEMO_PREFIX}unknown`);
        }}
      >
        <FileQuestion className="size-4" />
      </button>
    </>
  );
}

function StatePanel({ session }: Readonly<{ session: PrototypeSession }>) {
  const variant = useVariant();
  const state = {
    fromLocationId: session.fromLocationId,
    mode: session.mode,
    rows: session.rows,
    soundPerBookingType: variant.typeSound,
    spoiledNext: session.spoiledNext,
    switchPolicy: variant.policy,
    toLocationId: session.toLocationId,
    topBarButton: variant.navLabel,
    variant: `${variant.key}: ${variant.name}`,
  };
  return (
    <pre
      className="
        fixed inset-x-2 top-14 z-50 max-h-[60svh] overflow-auto rounded-lg
        bg-black/90 p-3 font-mono text-xs text-white shadow-lg
        sm:left-auto sm:w-96
      "
    >
      {JSON.stringify(state, null, 2)}
    </pre>
  );
}

export function PrototypeSwitcher({
  onCode,
  session,
}: Readonly<{ onCode: (code: string) => void; session: PrototypeSession }>) {
  const [isStateOpen, setIsStateOpen] = useState(false);
  if (!import.meta.env.DEV) {
    return null;
  }
  return (
    <>
      <div
        className="
          fixed top-2 right-2 z-50 flex h-9 items-center gap-0.5 rounded-full
          bg-black px-1 text-white shadow-lg
          sm:right-1/2 sm:translate-x-1/2
        "
      >
        <VariantButtons />
        <span className="mx-0.5 h-4 w-px bg-white/30" />
        <DemoButtons onCode={onCode} />
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
      {isStateOpen && <StatePanel session={session} />}
    </>
  );
}
