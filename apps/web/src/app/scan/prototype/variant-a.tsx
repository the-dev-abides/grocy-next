// PROTOTYPE. Variant A, "Switch under the camera".
// - The layout of the Purchase scan screen, with one more line of controls.
// - A switch with two halves under the camera. It stays where the user put it.
// - A strip between the camera and the switch names the next booking type.
// - The "to" location shows under the switch only on Transfer.
// - The banner and the sound are those of the Purchase scan screen. The
//   detail line of the banner names the booking type.
// - Each row has a chip with its booking type. A tap on the chip flips it.
// - A Consume row has a "Spoiled" chip. The open shows as words on the row.
// - The defaults section is the one of the Purchase scan screen.
import { cn } from 'cn';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { VariantProperties } from './prototype-parts';
import type { PrototypeSession } from './use-prototype-session';

import { CameraView } from '../camera-view';
import { SwipeRow } from '../swipe-row';
import { TypeCodeField } from '../type-code-field';
import { BOOKING_TYPES, locationName, MODE } from './prototype-data';
import { InlineSelect, PrototypeFooter } from './prototype-parts';
import { VariantARow } from './variant-a-row';

function Defaults({ session }: Readonly<{ session: PrototypeSession }>) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        className="
          flex h-11 w-full items-center gap-2 border-b px-3 text-left
          hover:bg-muted
        "
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        {isOpen ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium">Defaults</span>
        {!isOpen && (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            From {locationName(session.fromLocationId, 'product default')}
            {' · '}
            To {locationName(session.toLocationId, 'not set')}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-3 border-b p-3">
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
        </div>
      )}
    </>
  );
}

function ModeSwitch({ session }: Readonly<{ session: PrototypeSession }>) {
  return (
    <div
      role="radiogroup"
      aria-label="Booking type of the next scan"
      className="grid grid-cols-2 gap-1 p-2"
    >
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
                flex h-11 items-center justify-center gap-2 rounded-md border
                font-medium
              `,
              isOn
                ? cn(mode.solid, 'border-transparent')
                : 'bg-background text-muted-foreground',
            )}
            onClick={() => {
              session.setMode(type);
            }}
          >
            <mode.icon className="size-4" /> {mode.label}
          </button>
        );
      })}
    </div>
  );
}

function SessionList({ session }: Readonly<{ session: PrototypeSession }>) {
  return (
    <ul aria-label="Scans of this session" className="flex-1 divide-y">
      {session.rows.map((row, index) => {
        return (
          <SwipeRow
            key={row.id}
            className={cn(
              'flex min-h-14 items-center gap-2 px-3 py-1',
              index === 0 ? 'bg-muted' : 'bg-background',
            )}
            onReject={() => {
              session.reject(row.id);
            }}
          >
            <VariantARow row={row} session={session} />
          </SwipeRow>
        );
      })}
      {session.rows.length === 0 && (
        <li className="px-3 py-6 text-center text-muted-foreground">
          Point the camera at a barcode, or type a code. The scan appears here.
        </li>
      )}
    </ul>
  );
}

// The strip that names the booking type of the next scan, the switch, and
// the "to" location of a Transfer.
function ModeControls({ session }: Readonly<{ session: PrototypeSession }>) {
  const mode = MODE[session.mode];
  const to =
    session.mode === 'transfer'
      ? ` to ${locationName(session.toLocationId, '?')}`
      : '';
  return (
    <>
      <p className={cn('px-3 py-1 font-medium', mode.solid)}>
        The next scan is a {mode.label}
        {to}
      </p>
      <ModeSwitch session={session} />
      {session.mode === 'transfer' && (
        <InlineSelect
          className="px-2 pb-2"
          label="To"
          none="Select a location"
          value={session.toLocationId}
          onChange={session.setToLocationId}
        />
      )}
    </>
  );
}

export function VariantA({
  feedback,
  onCode,
  onDone,
  scanner,
  session,
}: Readonly<VariantProperties>) {
  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div
        className="
          sticky top-13 z-20 bg-background
          lg:h-[calc(100svh-3.25rem)] lg:overflow-y-auto lg:border-r
        "
      >
        <h1 className="px-3 pt-3 pb-2 text-2xl font-medium">
          Consume and Transfer
        </h1>
        <Defaults session={session} />
        <CameraView
          className="
            h-40
            lg:aspect-4/3 lg:h-auto
          "
          attachVideo={scanner.attachVideo}
          banner={feedback.banner}
          flash={feedback.flash?.kind ?? null}
          isAudioUnlocked={scanner.isAudioUnlocked}
          status={scanner.status}
          onRetry={scanner.retry}
        />
        <ModeControls session={session} />
        <div
          className="
            hidden
            lg:block
          "
        >
          <TypeCodeField onSubmit={onCode} />
        </div>
      </div>
      <div className="flex min-h-[calc(100svh-3.25rem)] flex-col">
        <SessionList session={session} />
        <PrototypeFooter
          count={session.rows.length}
          onCode={onCode}
          onDone={onDone}
        />
      </div>
    </div>
  );
}
