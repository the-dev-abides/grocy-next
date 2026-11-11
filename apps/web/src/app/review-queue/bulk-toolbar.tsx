import { Check, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { PendingScan } from '../api/next-api';
import type { Confirm } from './confirm-dialog';
import type { BulkActions } from './use-bulk-actions';

import {
  acceptConfirmText,
  bulkAcceptPlan,
  rejectConfirmText,
} from './bulk-accept';
import { ConfirmDialog } from './confirm-dialog';

function scansText(count: number): string {
  return `${String(count)} pending ${count === 1 ? 'scan' : 'scans'}`;
}

// The confirm of Accept all, with the count of rows that it books and the
// count of rows that it skips.
function acceptConfirm(
  rows: readonly PendingScan[],
  actions: BulkActions,
): Confirm {
  const plan = bulkAcceptPlan(rows);
  return {
    action: `Accept ${String(plan.bookable.length)}`,
    body: acceptConfirmText(plan.bookable.length, plan.skipped.length),
    isDestructive: false,
    isEnabled: plan.bookable.length > 0,
    onConfirm: () => {
      actions.acceptAll(rows);
    },
    title: 'Accept all',
  };
}

function rejectConfirm(
  rows: readonly PendingScan[],
  actions: BulkActions,
): Confirm {
  return {
    action: `Reject ${String(rows.length)}`,
    body: rejectConfirmText(rows.length),
    isDestructive: true,
    isEnabled: true,
    onConfirm: () => {
      actions.rejectAll(rows);
    },
    title: 'Reject all',
  };
}

// The bulk actions above the table: the counts, Bulk edit on the checked rows, and Reject all and Accept all on the rows that the filter shows.
// Reject all and Accept all open a confirm first.
export function BulkToolbar({
  actions,
  checkedCount,
  onBulkEdit,
  shown,
  totalCount,
}: Readonly<{
  actions: BulkActions;
  checkedCount: number;
  onBulkEdit: () => void;
  shown: readonly PendingScan[];
  totalCount: number;
}>) {
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const isIdle = !actions.isRunning && shown.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-auto text-muted-foreground">
        {scansText(totalCount)}. {shown.length} shown, {checkedCount} checked.
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={actions.isRunning || checkedCount === 0}
        onClick={onBulkEdit}
      >
        <Pencil data-icon="inline-start" /> Bulk edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!isIdle}
        onClick={() => {
          setConfirm(rejectConfirm(shown, actions));
        }}
      >
        <Trash2 data-icon="inline-start" /> Reject all
      </Button>
      <Button
        size="sm"
        disabled={!isIdle}
        onClick={() => {
          setConfirm(acceptConfirm(shown, actions));
        }}
      >
        <Check data-icon="inline-start" /> Accept all
      </Button>
      <ConfirmDialog
        confirm={confirm}
        onClose={() => {
          setConfirm(null);
        }}
      />
    </div>
  );
}
