import { useEffect, useEffectEvent, useState } from 'react';

import type { ScannerStatus } from './scanner';

import { isAudioUnlocked, unlockAudio } from './feedback';
import { INITIAL_SCANNER_STATUS, Scanner } from './scanner';

export interface ScannerHandle {
  attachVideo: (video: HTMLVideoElement | null) => void;
  isAudioUnlocked: boolean;
  retry: () => void;
  status: ScannerStatus;
}

// This hook runs the scanner on the video element of the camera view. The
// camera starts when the element mounts and stops when it unmounts. A retry
// stops the scanner and starts it again. The audio unlocks on the first
// pointer or key event on the page.
export function useScanner(onScan: (code: string) => void): ScannerHandle {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ScannerStatus>(INITIAL_SCANNER_STATUS);
  const [hasAudio, setHasAudio] = useState(false);
  const handleScan = useEffectEvent(onScan);

  useEffect(() => {
    if (video === null) {
      return;
    }
    const scanner = new Scanner(video, {
      onScan: (code) => {
        handleScan(code);
      },
      onStatus: setStatus,
    });
    void scanner.start();
    return () => {
      scanner.stop();
    };
  }, [video, attempt]);

  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      setHasAudio(isAudioUnlocked());
    };
    globalThis.addEventListener('pointerdown', unlock, { passive: true });
    globalThis.addEventListener('keydown', unlock);
    return () => {
      globalThis.removeEventListener('pointerdown', unlock);
      globalThis.removeEventListener('keydown', unlock);
    };
  }, []);

  return {
    attachVideo: setVideo,
    isAudioUnlocked: hasAudio,
    retry: () => {
      setAttempt((count) => count + 1);
    },
    status,
  };
}
