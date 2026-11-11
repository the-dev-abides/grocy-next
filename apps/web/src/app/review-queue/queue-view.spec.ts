import { storedView, viewToStore } from './queue-view';

function throws(): never {
  throw new Error('The storage is blocked.');
}

describe('the view of the review queue', () => {
  it('is the table on 1024px and wider when the browser keeps no choice', () => {
    expect(storedView(() => null, 1024)).toBe('table');
    expect(storedView(() => null, 1920)).toBe('table');
  });

  it('is the cards below 1024px when the browser keeps no choice', () => {
    expect(storedView(() => null, 1023)).toBe('cards');
    expect(storedView(() => null, 375)).toBe('cards');
  });

  it('is the kept choice at every width', () => {
    expect(storedView(() => 'cards', 1920)).toBe('cards');
    expect(storedView(() => 'table', 375)).toBe('table');
  });

  it('is the default by width when the kept value is not a view', () => {
    expect(storedView(() => '', 375)).toBe('cards');
    expect(storedView(() => 'board', 1280)).toBe('table');
  });

  it('is the default by width when the storage read fails', () => {
    expect(storedView(throws, 375)).toBe('cards');
    expect(storedView(throws, 1280)).toBe('table');
  });

  it('keeps the choice, and a failed storage write changes nothing', () => {
    const kept: string[] = [];
    viewToStore((value) => {
      kept.push(value);
    }, 'cards');
    expect(kept).toEqual(['cards']);
    expect(() => {
      viewToStore(throws, 'table');
    }).not.toThrow();
  });
});
