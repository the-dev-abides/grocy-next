// The repeat rule of ADR 0009. One barcode value is one scan while the
// decoder finds it in consecutive frames. The value becomes a new scan after
// it has been absent from the frames for this many milliseconds. The gap is a
// constant in the code, not a user setting.
export const ABSENCE_MS = 1000;

// This function makes the rule for one scan session. The clock gives the
// time in milliseconds. The rule takes the values that the decoder found in
// one frame and returns the values that are a new scan.
export function createRepeatRule(
  now: () => number,
): (valuesInFrame: readonly string[]) => string[] {
  const lastSeenAt = new Map<string, number>();
  return (valuesInFrame) => {
    const time = now();
    const scans: string[] = [];
    const values = new Set(valuesInFrame);
    for (const value of values) {
      if (value === '') {
        continue;
      }
      const seenAt = lastSeenAt.get(value);
      if (seenAt === undefined || time - seenAt > ABSENCE_MS) {
        scans.push(value);
      }
      lastSeenAt.set(value, time);
    }
    return scans;
  };
}
