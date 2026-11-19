import { useState } from 'react';

import type { PendingScan } from '../api/next-api';
import type { SwitchBookingType } from '../booking-types';
import type {
  CreateFields,
  NextPrice,
  SessionDefaults,
} from './session-defaults';

import {
  createFieldsOf,
  INITIAL_DEFAULTS,
  INITIAL_NEXT_PRICE,
} from './session-defaults';

export interface ScanDefaults {
  bookingType: PendingScan['bookingType'];
  defaults: SessionDefaults;
  nextPrice: NextPrice;
  resetDefaults: () => void;
  setBookingType: (bookingType: SwitchBookingType) => void;
  setDefaults: (patch: Partial<SessionDefaults>) => void;
  setNextPrice: (patch: Partial<NextPrice>) => void;
  takeCreateFields: () => CreateFields;
}

// This hook holds the session defaults and the price for the next scan in
// memory, as ADR 0010 decided. Nothing is stored. A scan takes the create
// fields of the moment. These are the defaults with the due date rule turned
// into a date, and on the Purchase screen the price. The price clears, and the
// price type stays. The Inventory screen has no price and sends none. On the
// Consume and Transfer screen, the switch sets the booking type of the next
// scan. It starts on the booking type of the screen, and Reset does not move
// it. Only a Transfer sends the "to" location.
export function useScanDefaults(
  screenBookingType: PendingScan['bookingType'],
): ScanDefaults {
  const [bookingType, setBookingType] = useState(screenBookingType);
  const [defaults, setDefaults] = useState(INITIAL_DEFAULTS);
  const [nextPrice, setNextPrice] = useState(INITIAL_NEXT_PRICE);
  return {
    bookingType,
    defaults,
    nextPrice,
    resetDefaults: () => {
      setDefaults(INITIAL_DEFAULTS);
    },
    setBookingType,
    setDefaults: (patch) => {
      setDefaults((current) => ({ ...current, ...patch }));
    },
    setNextPrice: (patch) => {
      setNextPrice((current) => ({ ...current, ...patch }));
    },
    takeCreateFields: () => {
      setNextPrice((current) => ({ ...current, price: '' }));
      return createFieldsOf(
        bookingType === 'transfer'
          ? defaults
          : { ...defaults, toLocationId: null },
        bookingType === 'purchase' ? nextPrice : null,
      );
    },
  };
}
