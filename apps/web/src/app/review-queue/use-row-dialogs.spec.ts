import { act, renderHook } from '@testing-library/react';

import { useRowDialogs } from './use-row-dialogs';

// A row draws a dialog only after the user opened it one time. A closed
// dialog that never opened costs a part of the first draw of every row.
describe('the dialogs of a row', () => {
  it('draws no dialog before the user opens one', () => {
    const { result } = renderHook(() => useRowDialogs<'form' | 'pick'>());

    expect(result.current.dialog).toBeNull();
    expect(result.current.isDrawn('form')).toBe(false);
    expect(result.current.isDrawn('pick')).toBe(false);
  });

  it('draws the dialog that the user opens, and no other dialog', () => {
    const { result } = renderHook(() => useRowDialogs<'form' | 'pick'>());

    act(() => {
      result.current.open('form');
    });

    expect(result.current.dialog).toBe('form');
    expect(result.current.isDrawn('form')).toBe(true);
    expect(result.current.isDrawn('pick')).toBe(false);
  });

  it('keeps an opened dialog drawn after the close, so that it can close with its animation', () => {
    const { result } = renderHook(() => useRowDialogs<'form' | 'pick'>());

    act(() => {
      result.current.open('form');
    });
    act(() => {
      result.current.open('pick');
    });
    act(() => {
      result.current.close();
    });

    expect(result.current.dialog).toBeNull();
    expect(result.current.isDrawn('form')).toBe(true);
    expect(result.current.isDrawn('pick')).toBe(true);
  });
});
