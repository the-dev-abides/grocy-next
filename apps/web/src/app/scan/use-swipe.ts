import { type PointerEvent, useState } from 'react';

import { swipeEnd, swipeStart } from './swipe';

// The pointer that went down on the row, and whether its move became a
// swipe.
interface PointerStart {
  isSwiping: boolean;
  pointerId: number;
  x: number;
  y: number;
}

// The time of the slide out before the reject call, in milliseconds.
const SLIDE_MS = 150;

type RowPointerEvent = PointerEvent<HTMLDivElement>;

export interface Swipe {
  dragX: number;
  handlers: {
    onPointerCancel: (event: RowPointerEvent) => void;
    onPointerDown: (event: RowPointerEvent) => void;
    onPointerMove: (event: RowPointerEvent) => void;
    onPointerUp: (event: RowPointerEvent) => void;
  };
  isGone: boolean;
}

function pointerStartOf(event: RowPointerEvent): null | PointerStart {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return null;
  }
  return {
    isSwiping: false,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
}

// The swipe to the left on a row. The hook follows one pointer from the down to
// the up and keeps the drag distance. When the drag went past a third of the
// row width, the hook calls `onReject` after the slide out. The row element
// that gets the handlers gives its width.
export function useSwipe(onReject: () => void): Swipe {
  const [dragX, setDragX] = useState(0);
  const [isGone, setIsGone] = useState(false);
  const [pointer, setPointer] = useState<null | PointerStart>(null);

  const onPointerMove = (event: RowPointerEvent) => {
    if (pointer?.pointerId !== event.pointerId) {
      return;
    }
    const moveX = event.clientX - pointer.x;
    if (!pointer.isSwiping) {
      const outcome = swipeStart(moveX, event.clientY - pointer.y);
      if (outcome === 'cancel') {
        setPointer(null);
      }
      if (outcome !== 'swipe') {
        return;
      }
      setPointer({ ...pointer, isSwiping: true });
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setDragX(Math.min(0, moveX));
  };
  const onPointerUp = (event: RowPointerEvent) => {
    setPointer(null);
    if (pointer?.isSwiping !== true) {
      return;
    }
    const width = event.currentTarget.clientWidth;
    if (swipeEnd(dragX, width) === 'reject') {
      setIsGone(true);
      setDragX(-width);
      globalThis.setTimeout(onReject, SLIDE_MS);
    } else {
      setDragX(0);
    }
  };

  return {
    dragX,
    handlers: {
      onPointerCancel: onPointerUp,
      onPointerDown: (event) => {
        setPointer(pointerStartOf(event));
      },
      onPointerMove,
      onPointerUp,
    },
    isGone,
  };
}
