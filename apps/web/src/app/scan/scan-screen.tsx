import type { ReactNode } from 'react';

import { cn } from 'cn';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';

import type { PendingScan } from '../api/next-api';
import type { ScanFeedback } from './use-scan-feedback';
import type { ScanSession } from './use-scan-session';
import type { ScannerHandle } from './use-scanner';

import { CameraView } from './camera-view';
import { DefaultsSection } from './defaults-section';
import { bannerOf } from './scan-outcome';
import { SwipeRow } from './swipe-row';
import { TypeCodeField } from './type-code-field';
import { useScanFeedback } from './use-scan-feedback';
import { useScanSession } from './use-scan-session';
import { useScanner } from './use-scanner';

// The scans of the session, most recent at the top. The first row has the
// muted background. A swipe to the left rejects a row.
function SessionList({
  emptyText,
  renderRow,
  rows,
  session,
}: Readonly<{
  emptyText: string;
  renderRow: (scan: PendingScan) => ReactNode;
  rows: readonly PendingScan[];
  session: ScanSession;
}>) {
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
            {renderRow(scan)}
          </SwipeRow>
        );
      })}
      {rows.length === 0 && (
        <li className="px-3 py-6 text-center text-muted-foreground">
          {emptyText}
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

// The alert under the camera when a create call failed.
function FailureAlert({ hasFailed }: Readonly<{ hasFailed: boolean }>) {
  if (!hasFailed) {
    return null;
  }
  return (
    <p role="alert" className="px-3 py-2 text-destructive">
      The code did not become a pending scan. Check that the API runs.
    </p>
  );
}

// The left column, which stays at the top. It holds the title, the defaults
// section, and the camera view with the feedback of the last scan. It holds the
// controls of the screen under the camera. From `lg` up, it also holds the
// typed code field.
function ScanControls({
  bookingType,
  children,
  feedback,
  onCode,
  scanner,
  session,
  title,
}: Readonly<{
  bookingType: PendingScan['bookingType'];
  children?: ReactNode;
  feedback: ScanFeedback;
  onCode: (code: string) => void;
  scanner: ScannerHandle;
  session: ScanSession;
  title: string;
}>) {
  const { hasFailed, lists, scanDefaults } = session;
  return (
    <div
      className="
        sticky top-13 z-20 bg-background
        lg:h-[calc(100svh-3.25rem)] lg:overflow-y-auto lg:border-r
      "
    >
      <h1 className="px-3 pt-3 pb-2 text-2xl font-medium">{title}</h1>
      <DefaultsSection
        bookingType={bookingType}
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
      <FailureAlert hasFailed={hasFailed} />
      {children}
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

// The scan screen that the Purchase and the Inventory screens share, in the
// layout of the prototype. A left column stays at the top. It holds the
// defaults section, the camera view, the controls of the screen, and the typed
// code field. The scans of the session are the page, most recent at the top. A
// camera scan and a typed code send the same create call and get the same
// feedback. The screen gives the controls under the camera and the row of the
// session list.
export function ScanScreen({
  bookingType,
  emptyText,
  renderControls,
  renderRow,
  title,
}: Readonly<{
  bookingType: PendingScan['bookingType'];
  emptyText: string;
  renderControls?: (session: ScanSession) => ReactNode;
  renderRow: (scan: PendingScan, session: ScanSession) => ReactNode;
  title: string;
}>) {
  const navigate = useNavigate();
  const session = useScanSession(bookingType);
  const feedback = useScanFeedback();

  async function scan(code: string): Promise<void> {
    const added = await session.addCode(code);
    if (added !== null) {
      feedback.show(bannerOf(added.scan, session.lists, added.wasInSession));
    }
  }
  const addCode = (code: string) => {
    void scan(code);
  };
  const scanner = useScanner(addCode);

  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      <ScanControls
        bookingType={bookingType}
        feedback={feedback}
        scanner={scanner}
        session={session}
        title={title}
        onCode={addCode}
      >
        {renderControls?.(session)}
      </ScanControls>
      <div className="flex min-h-[calc(100svh-3.25rem)] flex-col">
        <SessionList
          emptyText={emptyText}
          rows={session.rows}
          session={session}
          renderRow={(row) => renderRow(row, session)}
        />
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
