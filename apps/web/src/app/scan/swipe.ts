// The rules of the swipe to reject and of plus and minus on a row, as the Purchase scan screen prototype settled them.

// A drag past a third of the row width rejects the row.
const REJECT_FRACTION = 1 / 3;

// A move of more than this many pixels to the left starts the swipe.
const START_PX = 10;

// A vertical move of more than this many pixels before the swipe starts is a
// scroll of the page, and the swipe is cancelled.
const SCROLL_PX = 8;

export type SwipeStart = 'cancel' | 'swipe' | 'wait';

// This function decides, from the move since the pointer went down, whether
// the swipe starts, waits for more movement, or gives way to a scroll.
export function swipeStart(moveX: number, moveY: number): SwipeStart {
  if (Math.abs(moveY) > SCROLL_PX && Math.abs(moveY) > Math.abs(moveX)) {
    return 'cancel';
  }
  return moveX < -START_PX ? 'swipe' : 'wait';
}

export type SwipeEnd = 'reject' | 'snap-back';

// This function decides, from the drag distance when the pointer goes up,
// whether the row is rejected or snaps back.
export function swipeEnd(dragX: number, rowWidth: number): SwipeEnd {
  return -dragX > rowWidth * REJECT_FRACTION ? 'reject' : 'snap-back';
}

// The amount after plus or minus. The amount never goes below zero.
export function nextAmount(amount: null | number, delta: number): number {
  return Math.max(0, (amount ?? 0) + delta);
}
