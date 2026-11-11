import { nextAmount, swipeEnd, swipeStart } from './swipe';

describe('the swipe to reject on a row', () => {
  it('rejects when the drag goes past a third of the row width', () => {
    expect(swipeEnd(-121, 360)).toBe('reject');
    expect(swipeEnd(-360, 360)).toBe('reject');
  });

  it('snaps back on a short drag, a third of the row width included', () => {
    expect(swipeEnd(-120, 360)).toBe('snap-back');
    expect(swipeEnd(-40, 360)).toBe('snap-back');
    expect(swipeEnd(0, 360)).toBe('snap-back');
  });

  it('starts the swipe after ten pixels to the left', () => {
    expect(swipeStart(-11, 0)).toBe('swipe');
    expect(swipeStart(-11, 5)).toBe('swipe');
  });

  it('waits while the move is short or to the right', () => {
    expect(swipeStart(-10, 0)).toBe('wait');
    expect(swipeStart(20, 0)).toBe('wait');
  });

  it('cancels when the move is a vertical scroll', () => {
    expect(swipeStart(-4, 9)).toBe('cancel');
    expect(swipeStart(-4, -9)).toBe('cancel');
  });

  it('keeps a horizontal move that is also vertical', () => {
    expect(swipeStart(-12, 9)).toBe('swipe');
  });
});

describe('plus and minus on a row', () => {
  it('adds or removes one', () => {
    expect(nextAmount(2, 1)).toBe(3);
    expect(nextAmount(2, -1)).toBe(1);
  });

  it('never goes below zero', () => {
    expect(nextAmount(0, -1)).toBe(0);
  });

  it('counts a row with no amount as zero', () => {
    expect(nextAmount(null, 1)).toBe(1);
  });
});
