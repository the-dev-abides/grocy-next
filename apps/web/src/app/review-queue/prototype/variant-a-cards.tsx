// PROTOTYPE. The cards of variant A.
import { cn } from 'cn';
import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import type { Row } from './prototype-data';
import type { PrototypeQueue } from './use-prototype-queue';
import type { ViewProperties } from './variant-a-table';

import { canAccept, stateOf } from './prototype-state';
import { amountOf, nameOfRow } from './prototype-text';
import {
  ErrorLine,
  FactLine,
  PlanLines,
  SpoiledButton,
  StateBadge,
  TypeButton,
} from './row-parts';

function CardButtons({
  onEdit,
  queue,
  row,
}: Readonly<{ onEdit: () => void; queue: PrototypeQueue; row: Row }>) {
  const state = stateOf(row);
  return (
    <div className="flex items-center gap-2">
      <StateBadge row={row} />
      <span className="ml-auto" />
      <SpoiledButton
        row={row}
        onToggle={() => {
          queue.toggleSpoiled(row.id);
        }}
      />
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Edit"
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          queue.rejectAll([row.id]);
        }}
      >
        Reject
      </Button>
      <Button
        size="lg"
        disabled={!canAccept(state)}
        onClick={() => {
          queue.acceptAll([row.id]);
        }}
      >
        {state === 'failed' ? 'Accept again' : 'Accept'}
      </Button>
    </div>
  );
}

function Card({
  onEdit,
  queue,
  row,
}: Readonly<{ onEdit: () => void; queue: PrototypeQueue; row: Row }>) {
  const plan = queue.plans.get(row.id);
  const isChecked = queue.checked.includes(row.id);
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3',
        row.error === null ? 'bg-card' : 'bg-row-expired',
        isChecked && 'ring-2 ring-primary',
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          aria-label={`Check ${nameOfRow(row)}`}
          checked={isChecked}
          className="mt-2.5"
          onCheckedChange={() => {
            queue.toggleChecked(row.id);
          }}
        />
        <TypeButton
          row={row}
          size="icon-lg"
          onFlip={() => {
            queue.flip([row.id]);
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <span className="font-medium">{nameOfRow(row)}</span>
            <span className="ml-auto shrink-0 tabular-nums">
              {amountOf(row)}
            </span>
          </div>
          <FactLine plan={plan} row={row} />
        </div>
      </div>
      <PlanLines plan={plan} row={row} />
      <ErrorLine row={row} />
      <CardButtons queue={queue} row={row} onEdit={onEdit} />
    </div>
  );
}

export function CardsView({ onEdit, queue, rows }: Readonly<ViewProperties>) {
  return (
    <div
      className="
        grid gap-3
        md:grid-cols-2
        xl:grid-cols-3
      "
    >
      {rows.map((row) => {
        return (
          <Card
            key={row.id}
            queue={queue}
            row={row}
            onEdit={() => {
              onEdit(row);
            }}
          />
        );
      })}
    </div>
  );
}
