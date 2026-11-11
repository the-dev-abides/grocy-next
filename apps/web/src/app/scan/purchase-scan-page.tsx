import { cn } from 'cn';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';

import type { PendingScan } from '../api/next-api';
import type { PurchaseSession } from './use-purchase-session';
import type { ScanFeedback } from './use-scan-feedback';
import type { ScannerHandle } from './use-scanner';

import { CameraView } from './camera-view';
import { DefaultsSection } from './defaults-section';
import { PriceField } from './price-field';
import { bannerOf } from './scan-outcome';
import { ScanRow } from './scan-row';
import { SwipeRow } from './swipe-row';
import { TypeCodeField } from './type-code-field';
import { usePurchaseSession } from './use-purchase-session';
import { useScanFeedback } from './use-scan-feedback';
import { useScanner } from './use-scanner';

// The scans of the session, most recent at the top. The first row has the
// muted background. A swipe to the left rejects a row.
function SessionList({
  rows,
  session,
}: Readonly<{ rows: readonly PendingScan[]; session: PurchaseSession }>) {
  return (
    <ul aria-label="Scans of this session" className="flex-1 divide-y">
      {rows.map((scan, index) => {
        return (
          <SwipeRow
            key={scan.id}
            className={cn(
              'flex min-h-14 items-center gap-2 px-3 py-1',
              index === 0 ? 'bg-muted' : 'bg-background',
            )}
            onReject={() => {
              session.reject(scan);
            }}
          >
            <ScanRow
              lists={session.lists}
              scan={scan}
              onChangeAmount={(delta) => {
                session.changeAmount(scan, delta);
              }}
              onReject={() => {
                session.reject(scan);
              }}
            />
          </SwipeRow>
        );
      })}
      {rows.length === 0 && (
        <li className="px-3 py-6 text-center text-muted-foreground">
          Point the camera at a barcode, or type a code. The scan appears here.
        </li>
      )}
    </ul>
  );
}

// The footer: the typed code field on a phone, the count of the session,
// and Done. Done opens the review queue.
function ScanFooter({
  count,
  onCode,
  onDone,
}: Readonly<{
  count: number;
  onCode: (code: string) => void;
  onDone: () => void;
}>) {
  return (
    <footer className="sticky bottom-0 flex flex-col border-t bg-background">
      <div className="lg:hidden">
        <TypeCodeField onSubmit={onCode} />
      </div>
      <div className="flex h-12 items-center gap-2 px-3">
        <span className="flex-1">
          {count} {count === 1 ? 'scan' : 'scans'} in the review queue
        </span>
        <Button onClick={onDone}>
          <Check data-icon="inline-start" /> Done
        </Button>
      </div>
    </footer>
  );
}

// The left column, which stays at the top: the defaults section, the camera
// view with the feedback of the last scan, the price for the next scan, and
// from `lg` up the typed code field.
function ScanControls({
  feedback,
  onCode,
  scanner,
  session,
}: Readonly<{
  feedback: ScanFeedback;
  onCode: (code: string) => void;
  scanner: ScannerHandle;
  session: PurchaseSession;
}>) {
  const { hasFailed, lists, scanDefaults } = session;
  return (
    <div
      className="
        sticky top-13 z-20 bg-background
        lg:h-[calc(100svh-3.25rem)] lg:overflow-y-auto lg:border-r
      "
    >
      <h1 className="px-3 pt-3 pb-2 text-2xl font-medium">Purchase</h1>
      <DefaultsSection
        defaults={scanDefaults.defaults}
        lists={lists}
        onChange={scanDefaults.setDefaults}
        onReset={scanDefaults.resetDefaults}
      />
      <CameraView
        className="
          h-40
          lg:aspect-4/3 lg:h-auto
        "
        attachVideo={scanner.attachVideo}
        banner={feedback.banner}
        flash={feedback.flash}
        isAudioUnlocked={scanner.isAudioUnlocked}
        status={scanner.status}
        onRetry={scanner.retry}
      />
      {hasFailed && (
        <p role="alert" className="px-3 py-2 text-destructive">
          The code did not become a pending scan. Check that the API runs.
        </p>
      )}
      <PriceField
        nextPrice={scanDefaults.nextPrice}
        onChange={scanDefaults.setNextPrice}
      />
      <div
        className="
          hidden
          lg:block
        "
      >
        <TypeCodeField onSubmit={onCode} />
      </div>
    </div>
  );
}

// The Purchase scan screen, in the layout of the prototype: a left column
// that stays at the top with the defaults section, the camera view, the
// price for the next scan, and the typed code field, and the scans of the
// session as the page, most recent at the top. A camera scan and a typed
// code send the same create call and get the same feedback.
export function PurchaseScanPage() {
  const navigate = useNavigate();
  const session = usePurchaseSession();
  const feedback = useScanFeedback();

  async function scan(code: string): Promise<void> {
    const row = await session.addCode(code);
    if (row !== null) {
      feedback.show(bannerOf(row, session.lists));
    }
  }
  const addCode = (code: string) => {
    void scan(code);
  };
  const scanner = useScanner(addCode);

  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      <ScanControls
        feedback={feedback}
        scanner={scanner}
        session={session}
        onCode={addCode}
      />
      <div className="flex min-h-[calc(100svh-3.25rem)] flex-col">
        <SessionList rows={session.rows} session={session} />
        <ScanFooter
          count={session.rows.length}
          onCode={addCode}
          onDone={() => {
            void navigate('/review-queue');
          }}
        />
      </div>
    </div>
  );
}
