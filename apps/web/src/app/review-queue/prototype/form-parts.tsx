// PROTOTYPE. Small parts of the row form and the bulk edit form.
import type { ReactNode } from 'react';

import type { Choice } from '../choice-select';

import { BOOKING_TYPES, type BookingType, LOCATIONS } from './prototype-data';

export const NONE = 'none';
export const KEEP = 'keep';

export function locationChoices(first: Choice): Choice[] {
  return [
    first,
    ...LOCATIONS.map((item) => ({ label: item.name, value: String(item.id) })),
  ];
}

export function idOf(value: string): null | number {
  return value === NONE ? null : Number(value);
}

export function valueOf(id: null | number): string {
  return id === null ? NONE : String(id);
}

export function typeOf(value: string): BookingType | undefined {
  return BOOKING_TYPES.find((type) => type === value);
}

export function numberOf(text: string): null | number {
  const value = Number(text);
  return text.trim() === '' || Number.isNaN(value) ? null : value;
}

export const MOVE_CHOICES: readonly Choice[] = [
  { label: 'Consume', value: 'consume' },
  { label: 'Transfer', value: 'transfer' },
];

export function Field({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
