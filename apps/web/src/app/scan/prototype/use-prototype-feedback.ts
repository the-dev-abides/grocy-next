// PROTOTYPE. The feedback of the last scan, with the booking type of the scan.
import { useEffect, useState } from 'react';

import type { FeedbackKind } from '../feedback';
import type { BookingType, PrototypeRow } from './prototype-data';

import { bannerMs, FLASH_MS, playFeedback, playTransfer } from '../feedback';
import { amountText, locationName, MODE, productOf } from './prototype-data';

export interface PrototypeBanner {
  bookingType: BookingType;
  detail: string;
  kind: FeedbackKind;
  pill?: string;
  title: string;
}

export interface PrototypeFeedback {
  banner: null | PrototypeBanner;
  flash: null | { bookingType: BookingType; kind: FeedbackKind };
  show: (row: PrototypeRow, kind: FeedbackKind) => void;
}

// The words of the banner. The detail line starts with the booking type.
export function bannerOfRow(
  row: PrototypeRow,
  kind: FeedbackKind,
): PrototypeBanner {
  const label = MODE[row.bookingType].label;
  if (kind === 'unknown') {
    return {
      bookingType: row.bookingType,
      detail: `${label} · ${row.code}`,
      kind,
      title: 'Unknown barcode',
    };
  }
  const to =
    row.bookingType === 'transfer'
      ? ` to ${locationName(row.toLocationId, '?')}`
      : '';
  const banner: PrototypeBanner = {
    bookingType: row.bookingType,
    detail: `${label} · ${amountText(row)}${to}${row.spoiled ? ' · spoiled' : ''}`,
    kind,
    title: productOf(row.productId)?.name ?? row.code,
  };
  return kind === 'repeat' ? { ...banner, pill: 'more' } : banner;
}

// `hasTypeSound` gives a Transfer its own sound and vibration. Without it,
// both booking types sound the same, as on the Purchase scan screen.
export function usePrototypeFeedback(hasTypeSound: boolean): PrototypeFeedback {
  const [flash, setFlash] = useState<PrototypeFeedback['flash']>(null);
  const [banner, setBanner] = useState<null | PrototypeBanner>(null);

  useEffect(() => {
    if (flash === null) {
      return;
    }
    const timer = setTimeout(() => {
      setFlash(null);
    }, FLASH_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [flash]);

  useEffect(() => {
    if (banner === null) {
      return;
    }
    const timer = setTimeout(() => {
      setBanner(null);
    }, bannerMs(banner.kind));
    return () => {
      clearTimeout(timer);
    };
  }, [banner]);

  return {
    banner,
    flash,
    show: (row, kind) => {
      if (
        hasTypeSound &&
        kind !== 'unknown' &&
        row.bookingType === 'transfer'
      ) {
        playTransfer();
      } else {
        playFeedback(kind);
      }
      setFlash({ bookingType: row.bookingType, kind });
      setBanner(bannerOfRow(row, kind));
    },
  };
}
