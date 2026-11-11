// The pending scan list refreshes every three seconds while a screen is
// open, as ADR 0014 decided. The scan screens, the review queue, and the
// sidebar badge read the list with this interval.
export const POLL_MS = 3000;
