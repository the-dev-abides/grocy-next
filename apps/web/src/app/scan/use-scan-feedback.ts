import { useEffect, useState } from 'react';

import type { FeedbackKind } from './feedback';

import { bannerMs, FLASH_MS, playFeedback } from './feedback';

export interface ScanBanner {
  detail: string;
  kind: FeedbackKind;
  // The short pill on the right of the banner, such as `+1` for a merged
  // Purchase repeat scan.
  pill?: string;
  title: string;
}

export interface ScanFeedback {
  banner: null | ScanBanner;
  flash: FeedbackKind | null;
  show: (banner: ScanBanner) => void;
}

// This hook holds the on-screen feedback of the last scan. The frame colour
// shows for 0.7 seconds. The banner shows for about 2 seconds, and for 3
// seconds for an unknown code. The hook plays the sound and the vibration of
// the outcome. Each scan is a new object, so a scan within the time of the last
// one starts the time again.
export function useScanFeedback(): ScanFeedback {
  const [flash, setFlash] = useState<null | { kind: FeedbackKind }>(null);
  const [banner, setBanner] = useState<null | ScanBanner>(null);

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
    flash: flash === null ? null : flash.kind,
    show: (next) => {
      playFeedback(next.kind);
      setFlash({ kind: next.kind });
      setBanner({ ...next });
    },
  };
}
