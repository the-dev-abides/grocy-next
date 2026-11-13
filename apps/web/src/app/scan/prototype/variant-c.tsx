// PROTOTYPE. Variant C, "The switch at the thumb, with a time limit".
// - The title of the page is the mode. The title band has the colour of the
//   booking type and names the "to" location.
// - The switch is two large buttons at the bottom of the screen, where the
//   thumb is.
// - Transfer goes back to Consume after 20 seconds with no scan. A line on
//   the Transfer button shows the time that is left.
// - A Transfer has its own sound and vibration. The new row flashes in the
//   colour of its booking type.
// - A row is one quiet line. A tap opens the row. The open row has the
//   booking type, the amount, the locations, and the spoiled flag.
// - The defaults are in a sheet behind a button in the title band.
import { cn } from 'cn';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { VariantProperties } from './prototype-parts';
import type { PrototypeSession } from './use-prototype-session';

import { CameraView } from '../camera-view';
import { SwipeRow } from '../swipe-row';
import { TypeCodeField } from '../type-code-field';
import { MODE } from './prototype-data';
import { bannerColour } from './prototype-parts';
import { ThumbSwitch, TitleBand } from './variant-c-controls';
import { VariantCRow } from './variant-c-row';

// The camera with the banner of the last scan in the colour of its booking
// type.
function Camera({
  feedback,
  scanner,
}: Readonly<Pick<VariantProperties, 'feedback' | 'scanner'>>) {
  const { banner, flash } = feedback;
  return (
    <div className="relative">
      <CameraView
        className="
          h-36
          lg:aspect-4/3 lg:h-auto
        "
        attachVideo={scanner.attachVideo}
        banner={null}
        flash={flash?.kind ?? null}
        isAudioUnlocked={scanner.isAudioUnlocked}
        status={scanner.status}
        onRetry={scanner.retry}
      />
      {banner !== null && (
        <div
          role="status"
          className={cn(
            `absolute inset-x-3 top-3 z-10 rounded-lg px-3 py-2 shadow-lg`,
            bannerColour(banner.kind, banner.bookingType),
          )}
        >
          <p className="truncate font-medium">{banner.title}</p>
          <p className="truncate text-xs opacity-90">{banner.detail}</p>
        </div>
      )}
    </div>
  );
}

// The rows of the session. The row of the last scan has the colour of its
// booking type for a short time. One row can be open.
function SessionList({
  hasFlash,
  session,
}: Readonly<{ hasFlash: boolean; session: PrototypeSession }>) {
  const [openId, setOpenId] = useState<null | number>(null);
  return (
    <ul aria-label="Scans of this session" className="flex-1 divide-y">
      {session.rows.map((row) => {
        const isNew = hasFlash && session.lastRowId === row.id;
        return (
          <SwipeRow
            key={row.id}
            className={cn(
              'px-3 transition-colors duration-500',
              isNew ? MODE[row.bookingType].tint : 'bg-background',
            )}
            onReject={() => {
              session.reject(row.id);
            }}
          >
            <VariantCRow
              isOpen={openId === row.id}
              row={row}
              session={session}
              onToggle={() => {
                setOpenId(openId === row.id ? null : row.id);
              }}
            />
          </SwipeRow>
        );
      })}
      {session.rows.length === 0 && (
        <li className="px-3 py-6 text-center text-muted-foreground">
          Select Consume or Transfer at the bottom. Then point the camera at a
          barcode, or type a code.
        </li>
      )}
    </ul>
  );
}

function Footer({
  onCode,
  onDone,
  session,
}: Readonly<Pick<VariantProperties, 'onCode' | 'onDone' | 'session'>>) {
  const count = session.rows.length;
  return (
    <footer className="sticky bottom-0 flex flex-col border-t bg-background">
      <div className="lg:hidden">
        <TypeCodeField onSubmit={onCode} />
      </div>
      <div className="flex h-11 items-center gap-2 px-3">
        <span className="flex-1">
          {count} {count === 1 ? 'scan' : 'scans'} in the review queue
        </span>
        <Button variant="outline" size="sm" onClick={onDone}>
          <Check data-icon="inline-start" /> Done
        </Button>
      </div>
      <ThumbSwitch session={session} />
    </footer>
  );
}

export function VariantC({
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
        <TitleBand session={session} />
        <Camera feedback={feedback} scanner={scanner} />
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
        <SessionList hasFlash={feedback.flash !== null} session={session} />
        <Footer session={session} onCode={onCode} onDone={onDone} />
      </div>
    </div>
  );
}
