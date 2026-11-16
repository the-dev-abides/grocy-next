// PROTOTYPE. The table of variant A.
import { cn } from 'cn';
import { Check, Pencil, RotateCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { Row } from './prototype-data';
import type { PrototypeQueue } from './use-prototype-queue';

import { canAccept, stateOf } from './prototype-state';
import { amountOf, nameOfRow } from './prototype-text';
import {
  ErrorLine,
  FactLine,
  Place,
  PlanLines,
  SpoiledButton,
  StateBadge,
  TypeButton,
} from './row-parts';

// The columns that show from `md`, as in the milestone 2 table.
const FROM_MD = 'hidden md:table-cell';

export interface ViewProperties {
  onEdit: (row: Row) => void;
  queue: PrototypeQueue;
  rows: readonly Row[];
}

function AcceptButton({
  queue,
  row,
}: Readonly<{ queue: PrototypeQueue; row: Row }>) {
  const state = stateOf(row);
  if (!canAccept(state)) {
    return null;
  }
  const isFailed = state === 'failed';
  return (
    <Button
      variant={isFailed ? 'outline' : 'ghost'}
      size={isFailed ? 'sm' : 'icon'}
      aria-label="Accept"
      onClick={() => {
        queue.acceptAll([row.id]);
      }}
    >
      {isFailed ? (
        <>
          <RotateCw data-icon="inline-start" /> Accept again
        </>
      ) : (
        <Check />
      )}
    </Button>
  );
}

function RowButtons({
  onEdit,
  queue,
  row,
}: Readonly<{ onEdit: () => void; queue: PrototypeQueue; row: Row }>) {
  return (
    <div
      className="
        flex flex-col items-end gap-1
        md:flex-row md:flex-wrap md:items-center md:justify-end
      "
    >
      <SpoiledButton
        row={row}
        onToggle={() => {
          queue.toggleSpoiled(row.id);
        }}
      />
      <Button variant="ghost" size="icon" aria-label="Edit" onClick={onEdit}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Reject"
        onClick={() => {
          queue.rejectAll([row.id]);
        }}
      >
        <X />
      </Button>
      <AcceptButton queue={queue} row={row} />
    </div>
  );
}

function ProductCell({
  queue,
  row,
}: Readonly<{ queue: PrototypeQueue; row: Row }>) {
  const plan = queue.plans.get(row.id);
  return (
    <TableCell className="max-w-96 align-top whitespace-normal">
      <span
        className={
          row.productId === null
            ? 'font-mono text-muted-foreground'
            : 'font-medium'
        }
      >
        {nameOfRow(row)}
      </span>
      <FactLine plan={plan} row={row} />
      <PlanLines plan={plan} row={row} />
      <div
        className="
          mt-0.5
          md:hidden
        "
      >
        <StateBadge row={row} />
      </div>
      <ErrorLine row={row} />
    </TableCell>
  );
}

function TableLine({
  onEdit,
  queue,
  row,
}: Readonly<{ onEdit: () => void; queue: PrototypeQueue; row: Row }>) {
  const isChecked = queue.checked.includes(row.id);
  return (
    <TableRow
      className={cn(
        row.error !== null &&
          `
            bg-row-expired
            hover:bg-row-expired
          `,
      )}
      data-state={isChecked ? 'selected' : undefined}
    >
      <TableCell className="w-8 align-top">
        <Checkbox
          aria-label={`Check ${nameOfRow(row)}`}
          checked={isChecked}
          onCheckedChange={() => {
            queue.toggleChecked(row.id);
          }}
        />
      </TableCell>
      <TableCell className="w-10 align-top">
        <TypeButton
          row={row}
          onFlip={() => {
            queue.flip([row.id]);
          }}
        />
      </TableCell>
      <ProductCell queue={queue} row={row} />
      <TableCell className="w-24 text-right align-top tabular-nums">
        {amountOf(row)}
      </TableCell>
      <TableCell className={cn(FROM_MD, 'align-top')}>
        <Place row={row} />
      </TableCell>
      <TableCell className={cn(FROM_MD, 'align-top')}>
        <StateBadge row={row} />
      </TableCell>
      <TableCell className="text-right align-top">
        <RowButtons queue={queue} row={row} onEdit={onEdit} />
      </TableCell>
    </TableRow>
  );
}

function Header({ queue, rows }: Readonly<Omit<ViewProperties, 'onEdit'>>) {
  const isAll =
    rows.length > 0 && rows.every((item) => queue.checked.includes(item.id));
  return (
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead className="w-8">
          <Checkbox
            aria-label="Check all shown rows"
            checked={isAll}
            onCheckedChange={() => {
              queue.setChecked(isAll ? [] : rows.map((item) => item.id));
            }}
          />
        </TableHead>
        <TableHead className="w-10">
          <span className="sr-only">Booking type</span>
        </TableHead>
        <TableHead>Product</TableHead>
        <TableHead className="w-24 text-right">Amount</TableHead>
        <TableHead className={FROM_MD}>Location</TableHead>
        <TableHead className={FROM_MD}>State</TableHead>
        <TableHead className="text-right">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function TableView({ onEdit, queue, rows }: Readonly<ViewProperties>) {
  return (
    <div className="rounded-lg border">
      <Table aria-label="Pending scans">
        <Header queue={queue} rows={rows} />
        <TableBody>
          {rows.map((row) => {
            return (
              <TableLine
                key={row.id}
                queue={queue}
                row={row}
                onEdit={() => {
                  onEdit(row);
                }}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
