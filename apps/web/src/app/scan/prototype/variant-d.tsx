// PROTOTYPE. Variant D, from the answers of the maintainer to A, B, and C.
// - The screen of variant A: the title, the defaults section, the strip, and
//   the switch under the camera. The switch stays where the user put it.
// - No colour for a booking type. The mode and the icons use the standard
//   colour of the app.
// - The row has the icon of its booking type, as in B. A tap on the icon
//   flips the booking type, as the chip did in A.
// - A Consume row has a trash can button for the spoiled flag.
// - A tap on the name opens the row, as in C. The open row has a field for
//   the amount, the unit, and the locations.
import { cn } from 'cn';
import { useState } from 'react';

import type { VariantProperties } from './prototype-parts';
import type { PrototypeSession } from './use-prototype-session';

import { CameraView } from '../camera-view';
import { SwipeRow } from '../swipe-row';
import { TypeCodeField } from '../type-code-field';
import { PrototypeFooter } from './prototype-parts';
import { Defaults, ModeControls } from './variant-a';
import { VariantDRow } from './variant-d-row';

// The rows of the session. One row can be open.
function SessionList({ session }: Readonly<{ session: PrototypeSession }>) {
  const [openId, setOpenId] = useState<null | number>(null);
  return (
    <ul aria-label="Scans of this session" className="flex-1 divide-y">
      {session.rows.map((row, index) => {
        return (
          <SwipeRow
            key={row.id}
            className={cn('px-2', index === 0 ? 'bg-muted' : 'bg-background')}
            onReject={() => {
              session.reject(row.id);
            }}
          >
            <VariantDRow
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
          Point the camera at a barcode, or type a code. The scan appears here.
        </li>
      )}
    </ul>
  );
}

export function VariantD({
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
