// PROTOTYPE. The controls of variant C: the title band with the defaults
// sheet, and the switch at the bottom of the screen.
import { cn } from 'cn';
import { Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import type { PrototypeSession } from './use-prototype-session';

import { BOOKING_TYPES, locationName, MODE } from './prototype-data';
import { InlineSelect } from './prototype-parts';
import { TIMED_MS } from './use-prototype-session';

const COUNTDOWN = `
  @keyframes prototype-countdown {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
  }
`;

function DefaultsSheet({ session }: Readonly<{ session: PrototypeSession }>) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Defaults"
            className="
              text-white
              hover:bg-white/20 hover:text-white
            "
          />
        }
      >
        <Settings2 />
      </SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col gap-4 p-4">
        <SheetTitle>Defaults</SheetTitle>
        <InlineSelect
          label="From"
          none="Product default"
          value={session.fromLocationId}
          onChange={session.setFromLocationId}
        />
        <InlineSelect
          label="To, for a Transfer"
          none="Not set"
          value={session.toLocationId}
          onChange={session.setToLocationId}
        />
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={session.reset}>
            Reset
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TitleBand({
  session,
}: Readonly<{ session: PrototypeSession }>) {
  const mode = MODE[session.mode];
  const to =
    session.toLocationId === null
      ? ': select the "to" location'
      : ` to ${locationName(session.toLocationId, '')}`;
  return (
    <div className={cn('flex h-12 items-center gap-2 pr-1 pl-3', mode.solid)}>
      <mode.icon className="size-5 shrink-0" />
      <h1 className="min-w-0 flex-1 truncate text-xl font-medium">
        {mode.label}
        {session.mode === 'transfer' && to}
      </h1>
      <DefaultsSheet session={session} />
    </div>
  );
}

// The switch at the bottom of the screen. The Transfer button shows the
// time that is left before the switch goes back to Consume.
export function ThumbSwitch({
  session,
}: Readonly<{ session: PrototypeSession }>) {
  return (
    <div
      role="radiogroup"
      aria-label="Booking type of the next scan"
      className="grid grid-cols-2 border-t"
    >
      <style>{COUNTDOWN}</style>
      {BOOKING_TYPES.map((type) => {
        const mode = MODE[type];
        const isOn = session.mode === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={isOn}
            className={cn(
              `
                relative flex h-14 items-center justify-center gap-2
                overflow-hidden text-base font-medium
              `,
              isOn ? mode.solid : 'bg-background text-muted-foreground',
            )}
            onClick={() => {
              session.setMode(type);
            }}
          >
            <mode.icon className="size-5" /> {mode.label}
            {isOn && type === 'transfer' && (
              <span
                key={session.armCount}
                aria-hidden="true"
                className="
                  absolute inset-x-0 bottom-0 h-1.5 origin-left bg-white/80
                "
                style={{
                  animation: `prototype-countdown ${String(TIMED_MS)}ms linear forwards`,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
