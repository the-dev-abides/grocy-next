// PROTOTYPE. Variant B, "The mode on the camera, Transfer for one scan".
// - No page title. A plate on the camera names the next booking type. The
//   camera has a thick frame in the colour of the booking type.
// - Consume is the home state. A button sets Transfer for one scan. After
//   that scan, the screen goes back to Consume.
// - The plate shows the result of a scan in the colour of its booking type,
//   then the plate shows the mode again. The user looks at one place.
// - A Transfer has its own sound and vibration.
// - "From" and "To" are always on the screen. There is no defaults section.
// - "Spoiled" is set before the scan, for one scan, like the price of the
//   Purchase scan screen.
// - A row has a colour band and an icon. An icon button flips the row.
// - The open and the spoiled flag show as badges on the row.
import { cn } from 'cn';

import type { VariantProperties } from './prototype-parts';
import type { PrototypeFeedback } from './use-prototype-feedback';
import type { PrototypeSession } from './use-prototype-session';

import { CameraView } from '../camera-view';
import { SwipeRow } from '../swipe-row';
import { TypeCodeField } from '../type-code-field';
import { locationName, MODE, otherType } from './prototype-data';
import { bannerColour, InlineSelect, PrototypeFooter } from './prototype-parts';
import { VariantBRow } from './variant-b-row';

// The plate on the camera. It names the booking type of the next scan. For
// two seconds after a scan it shows the result of that scan.
function Plate({
  feedback,
  session,
}: Readonly<{ feedback: PrototypeFeedback; session: PrototypeSession }>) {
  const { banner } = feedback;
  if (banner !== null) {
    return (
      <div
        role="status"
        className={cn(
          `
            absolute inset-x-3 top-3 z-10 flex items-start gap-2 rounded-lg px-3
            py-2 shadow-lg
          `,
          bannerColour(banner.kind, banner.bookingType),
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium">{banner.title}</p>
          <p className="truncate text-xs opacity-90">{banner.detail}</p>
        </div>
        {banner.pill !== undefined && (
          <span className="rounded-full bg-white/25 px-2 text-xs font-medium">
            {banner.pill}
          </span>
        )}
      </div>
    );
  }
  const mode = MODE[session.mode];
  return (
    <p
      className={cn(
        `
          absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center
          gap-2 rounded-lg px-3 py-2 text-lg font-medium shadow-lg
        `,
        mode.solid,
      )}
    >
      <mode.icon className="size-5 shrink-0" />
      <span className="truncate">
        {mode.label}
        {session.mode === 'transfer' &&
          ` to ${locationName(session.toLocationId, '?')}`}
        {session.mode === 'consume' && session.spoiledNext && ', spoiled'}
      </span>
    </p>
  );
}

function Controls({ session }: Readonly<{ session: PrototypeSession }>) {
  const isTransfer = session.mode === 'transfer';
  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      <button
        type="button"
        aria-pressed={isTransfer}
        className={cn(
          'h-12 rounded-md border px-2 text-left leading-tight font-medium',
          isTransfer
            ? cn(MODE.transfer.solid, 'border-transparent')
            : cn(MODE.transfer.text, MODE.transfer.border),
        )}
        onClick={() => {
          session.setMode(otherType(session.mode));
        }}
      >
        {isTransfer
          ? 'Transfer is on. Tap to cancel.'
          : 'Transfer the next scan'}
      </button>
      <button
        type="button"
        aria-pressed={session.spoiledNext}
        disabled={isTransfer}
        className={cn(
          `
            h-12 rounded-md border px-2 text-left leading-tight font-medium
            disabled:opacity-40
          `,
          session.spoiledNext && 'border-transparent bg-destructive text-white',
        )}
        onClick={() => {
          session.setSpoiledNext(!session.spoiledNext);
        }}
      >
        {session.spoiledNext
          ? 'Spoiled is on. Tap to cancel.'
          : 'The next scan is spoiled'}
      </button>
      <InlineSelect
        label="From"
        none="Default"
        value={session.fromLocationId}
        onChange={session.setFromLocationId}
      />
      <InlineSelect
        label="To"
        none="Not set"
        value={session.toLocationId}
        onChange={session.setToLocationId}
      />
    </div>
  );
}

// The frame of the camera. It has the colour of the next booking type. For
// a short time after a scan it is thick and has the colour of that scan.
function frameOf(
  flash: PrototypeFeedback['flash'],
  mode: PrototypeSession['mode'],
): string {
  if (flash === null) {
    return cn('ring-[6px]', MODE[mode].ring);
  }
  const ring =
    flash.kind === 'unknown' ? 'ring-red-500' : MODE[flash.bookingType].ring;
  return cn('ring-16', ring);
}

function Camera({
  feedback,
  scanner,
  session,
}: Readonly<Pick<VariantProperties, 'feedback' | 'scanner' | 'session'>>) {
  return (
    <div className="relative">
      <CameraView
        className="
          h-52
          lg:aspect-4/3 lg:h-auto
        "
        attachVideo={scanner.attachVideo}
        banner={null}
        flash={null}
        isAudioUnlocked={scanner.isAudioUnlocked}
        status={scanner.status}
        onRetry={scanner.retry}
      />
      <div
        aria-hidden="true"
        className={cn(
          `
            pointer-events-none absolute inset-0 transition-shadow duration-200
            ring-inset
          `,
          frameOf(feedback.flash, session.mode),
        )}
      />
      <Plate feedback={feedback} session={session} />
    </div>
  );
}

function SessionList({ session }: Readonly<{ session: PrototypeSession }>) {
  return (
    <ul aria-label="Scans of this session" className="flex-1 divide-y">
      {session.rows.map((row) => {
        return (
          <SwipeRow
            key={row.id}
            className={cn(
              `
                flex min-h-14 items-center gap-2 border-l-[6px] bg-background
                py-1 pr-3 pl-2
              `,
              MODE[row.bookingType].border,
            )}
            onReject={() => {
              session.reject(row.id);
            }}
          >
            <VariantBRow row={row} session={session} />
          </SwipeRow>
        );
      })}
      {session.rows.length === 0 && (
        <li className="px-3 py-6 text-center text-muted-foreground">
          Scan what you take out of stock. For a move to a different location,
          tap "Transfer the next scan" first.
        </li>
      )}
    </ul>
  );
}

export function VariantB({
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
        <h1 className="sr-only">Consume</h1>
        <Camera feedback={feedback} scanner={scanner} session={session} />
        <Controls session={session} />
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
