// PROTOTYPE. The columns of each tab of variant B.
import type { ReactNode } from 'react';

import { Checkbox } from '@/components/ui/checkbox';

import type { Plan } from './prototype-plan';
import type { PrototypeQueue } from './use-prototype-queue';

import { ChoiceSelect } from '../choice-select';
import { idOf, locationChoices, NONE, valueOf } from './form-parts';
import {
  type BookingType,
  LOCATIONS,
  nameOf,
  type Row,
  STORES,
} from './prototype-data';
import { amountOf, dueText, nameOfRow } from './prototype-text';
import { PlanLines, StateBadge } from './row-parts';

export interface Column {
  className?: string;
  head: string;
  render: (row: Row, plan: Plan | undefined) => ReactNode;
}

export const MD = 'hidden md:table-cell';

function fromText(row: Row, fallback: string) {
  return row.locationId === null ? fallback : nameOf(LOCATIONS, row.locationId);
}

const AMOUNT: Column = {
  className: 'text-right tabular-nums',
  head: 'Amount',
  render: (row) => amountOf(row),
};

const STATE: Column = {
  className: MD,
  head: 'State',
  render: (row) => <StateBadge row={row} />,
};

function locationColumn(head: string, fallback: string): Column {
  return { className: MD, head, render: (row) => fromText(row, fallback) };
}

function takesColumn(head: string): Column {
  return {
    className: 'whitespace-normal',
    head,
    render: (row, plan) => <PlanLines plan={plan} row={row} />,
  };
}

const PURCHASE: Column[] = [
  AMOUNT,
  locationColumn('Location', 'Product default'),
  {
    className: MD,
    head: 'Due date',
    render: (row) => (row.dueDate === null ? 'None' : dueText(row.dueDate)),
  },
  {
    className: MD,
    head: 'Price',
    render: (row) => (row.price === null ? 'None' : row.price.toFixed(2)),
  },
  {
    className: MD,
    head: 'Store',
    render: (row) => nameOf(STORES, row.storeId),
  },
  STATE,
];

const INVENTORY: Column[] = [
  { ...AMOUNT, head: 'Count' },
  locationColumn('Location', 'Product default'),
  STATE,
];

function consumeColumns(queue: PrototypeQueue): Column[] {
  const spoiled: Column = {
    head: 'Spoiled',
    render: (row) => {
      return (
        <Checkbox
          aria-label={`${nameOfRow(row)} is spoiled`}
          checked={row.spoiled}
          onCheckedChange={() => {
            queue.toggleSpoiled(row.id);
          }}
        />
      );
    },
  };
  return [
    AMOUNT,
    locationColumn('From', 'Any location'),
    takesColumn('Takes from'),
    spoiled,
    STATE,
  ];
}

// The Transfer tab has the "to" location as a select in the row.
function transferColumns(queue: PrototypeQueue): Column[] {
  const to: Column = {
    head: 'To',
    render: (row) => {
      return (
        <div className="w-32">
          <ChoiceSelect
            label=""
            choices={locationChoices({ label: 'Not set', value: NONE })}
            value={valueOf(row.toLocationId)}
            onChange={(value) => {
              queue.edit([row.id], { toLocationId: idOf(value) });
            }}
          />
        </div>
      );
    },
  };
  return [
    AMOUNT,
    locationColumn('From', 'Product default'),
    to,
    takesColumn('Moves'),
    STATE,
  ];
}

export function columnsOf(type: BookingType, queue: PrototypeQueue): Column[] {
  if (type === 'purchase') {
    return PURCHASE;
  }
  if (type === 'inventory') {
    return INVENTORY;
  }
  return type === 'consume' ? consumeColumns(queue) : transferColumns(queue);
}
