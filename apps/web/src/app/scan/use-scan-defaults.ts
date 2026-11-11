import { useState } from 'react';

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
  defaults: SessionDefaults;
  nextPrice: NextPrice;
  resetDefaults: () => void;
  setDefaults: (patch: Partial<SessionDefaults>) => void;
  setNextPrice: (patch: Partial<NextPrice>) => void;
  takeCreateFields: () => CreateFields;
}

// This hook holds the session defaults and the price for the next scan in
// memory, as ADR 0010 decided. Nothing is stored. A scan takes the create
// fields of the moment: the defaults with the due date rule turned into a
// date, and the price. The price clears, and the price type stays.
export function useScanDefaults(): ScanDefaults {
  const [defaults, setDefaults] = useState(INITIAL_DEFAULTS);
  const [nextPrice, setNextPrice] = useState(INITIAL_NEXT_PRICE);
  return {
    defaults,
    nextPrice,
    resetDefaults: () => {
      setDefaults(INITIAL_DEFAULTS);
    },
    setDefaults: (patch) => {
      setDefaults((current) => ({ ...current, ...patch }));
    },
    setNextPrice: (patch) => {
      setNextPrice((current) => ({ ...current, ...patch }));
    },
    takeCreateFields: () => {
      setNextPrice((current) => ({ ...current, price: '' }));
      return createFieldsOf(defaults, nextPrice);
    },
  };
}
