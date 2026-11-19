import { useEffect, useEffectEvent, useState } from 'react';

import { createHardwareScannerRule, isField } from './hardware-scanner';

export interface HardwareScannerHandle {
  // True after the first code from the hardware scanner in this scan session.
  hasScanned: boolean;
}

// This hook puts one key listener on the page for a hardware scanner. The
// listener sends each code to the scan function, as the camera does. It stops
// the Enter that ends a code, so that the Enter presses no button. The listener
// runs in the capture phase, so it gets the key before the page does. A new
// screen starts a new scan session.
export function useHardwareScanner(
  onScan: (code: string) => void,
): HardwareScannerHandle {
  const [hasScanned, setHasScanned] = useState(false);
  const handleScan = useEffectEvent(onScan);

  useEffect(() => {
    const rule = createHardwareScannerRule();
    const onKey = (event: KeyboardEvent) => {
      const result = rule({
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        isInField: isField(document.activeElement),
        key: event.key,
        metaKey: event.metaKey,
        time: event.timeStamp,
      });
      if (result.stop) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (result.code === null) {
        return;
      }
      setHasScanned(true);
      handleScan(result.code);
    };
    globalThis.addEventListener('keydown', onKey, { capture: true });
    return () => {
      globalThis.removeEventListener('keydown', onKey, { capture: true });
    };
  }, []);

  return { hasScanned };
}
