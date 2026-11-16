// PROTOTYPE. The table of one tab of variant B.
import { cn } from 'cn';
import { Check, Pencil, X } from 'lucide-react';

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

import type { PrototypeQueue } from './use-prototype-queue';

import { type BookingType, type Row, TYPE } from './prototype-data';
import { canAccept, stateOf } from './prototype-state';
import { nameOfRow, timeText } from './prototype-text';
import { ErrorLine, StateBadge, TypeButton } from './row-parts';
import { type Column, columnsOf } from './variant-b-columns';

function RowButtons({
  onEdit,
  queue,
  row,
}: Readonly<{ onEdit: () => void; queue: PrototypeQueue; row: Row }>) {
  return (
    <div className="flex items-center justify-end gap-1">
      <TypeButton
        row={row}
        onFlip={() => {
          queue.flip([row.id]);
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
      <Button
        variant="ghost"
        size="icon"
        aria-label="Accept"
        disabled={!canAccept(stateOf(row))}
        onClick={() => {
          queue.acceptAll([row.id]);
        }}
      >
        <Check />
      </Button>
    </div>
  );
}

function NameCell({ row }: Readonly<{ row: Row }>) {
  return (
    <TableCell className="max-w-56 align-top whitespace-normal">
      <span
        className={
          row.productId === null
            ? 'font-mono text-muted-foreground'
            : 'font-medium'
        }
      >
        {nameOfRow(row)}
      </span>
      <p className="text-xs text-muted-foreground">
        {timeText(row.scannedAt)}
        {row.stockEntryId !== null && ' · One stock entry'}
      </p>
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

function TypeLine({
  columns,
  onEdit,
  queue,
  row,
}: Readonly<{
  columns: readonly Column[];
  onEdit: () => void;
  queue: PrototypeQueue;
  row: Row;
}>) {
  const plan = queue.plans.get(row.id);
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
      <TableCell className="align-top">
        <Checkbox
          aria-label={`Check ${nameOfRow(row)}`}
          checked={isChecked}
          onCheckedChange={() => {
            queue.toggleChecked(row.id);
          }}
        />
      </TableCell>
      <NameCell row={row} />
      {columns.map((column) => {
        return (
          <TableCell
            key={column.head}
            className={cn('align-top', column.className)}
          >
            {column.render(row, plan)}
          </TableCell>
        );
      })}
      <TableCell className="text-right align-top">
        <RowButtons queue={queue} row={row} onEdit={onEdit} />
      </TableCell>
    </TableRow>
  );
}

function Header({
  columns,
  queue,
  rows,
}: Readonly<{
  columns: readonly Column[];
  queue: PrototypeQueue;
  rows: readonly Row[];
}>) {
  const isAll =
    rows.length > 0 && rows.every((item) => queue.checked.includes(item.id));
  return (
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead className="w-8">
          <Checkbox
            aria-label="Check all rows of the tab"
            checked={isAll}
            onCheckedChange={() => {
              queue.setChecked(isAll ? [] : rows.map((item) => item.id));
            }}
          />
        </TableHead>
        <TableHead>Product</TableHead>
        {columns.map((column) => {
          return (
            <TableHead key={column.head} className={column.className}>
              {column.head}
            </TableHead>
          );
        })}
        <TableHead className="text-right">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function TypeTable({
  onEdit,
  queue,
  rows,
  type,
}: Readonly<{
  onEdit: (row: Row) => void;
  queue: PrototypeQueue;
  rows: readonly Row[];
  type: BookingType;
}>) {
  const columns = columnsOf(type, queue);
  return (
    <div className="rounded-lg border">
      <Table aria-label={`${TYPE[type].label} pending scans`}>
        <Header columns={columns} queue={queue} rows={rows} />
        <TableBody>
          {rows.map((row) => {
            return (
              <TypeLine
                key={row.id}
                columns={columns}
                queue={queue}
                row={row}
                onEdit={() => {
                  onEdit(row);
                }}
              />
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length + 3}
                className="py-8 text-center text-muted-foreground"
              >
                No {TYPE[type].label} rows.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
