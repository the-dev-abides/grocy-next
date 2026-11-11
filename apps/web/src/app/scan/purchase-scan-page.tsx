import { cn } from 'cn';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';

import type { PendingScan } from '../api/next-api';
import type { PurchaseSession } from './use-purchase-session';

import { ScanRow } from './scan-row';
import { SwipeRow } from './swipe-row';
import { TypeCodeField } from './type-code-field';
import { usePurchaseSession } from './use-purchase-session';

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
          Type a code. The scan appears here.
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

// The Purchase scan screen, in the layout of the prototype: a left column
// that stays at the top, and the scans of the session as the page, most
// recent at the top. The defaults section, the camera view, and the price
// row for the next scan come with later tickets and go into the left column
// above the typed code field.
export function PurchaseScanPage() {
  const navigate = useNavigate();
  const session = usePurchaseSession();
  const { addCode, hasFailed, rows } = session;

  return (
    <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div
        className="
          sticky top-13 z-20 bg-background
          lg:h-[calc(100svh-3.25rem)] lg:overflow-y-auto lg:border-r
        "
      >
        <h1 className="px-3 pt-3 pb-2 text-2xl font-medium">Purchase</h1>
        {hasFailed && (
          <p role="alert" className="px-3 pb-2 text-destructive">
            The code did not become a pending scan. Check that the API runs.
          </p>
        )}
        <div
          className="
            hidden
            lg:block
          "
        >
          <TypeCodeField onSubmit={addCode} />
        </div>
      </div>
      <div className="flex min-h-[calc(100svh-3.25rem)] flex-col">
        <SessionList rows={rows} session={session} />
        <ScanFooter
          count={rows.length}
          onCode={addCode}
          onDone={() => {
            void navigate('/review-queue');
          }}
        />
      </div>
    </div>
  );
}
