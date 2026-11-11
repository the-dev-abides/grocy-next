import { dueDateText, nameOf, priceText, stockText } from './scan-text';

describe('the words of a scan row', () => {
  const locations = [
    { id: 1, name: 'Fridge' },
    { id: 2, name: 'Pantry' },
  ];

  it('names a master data row by its id', () => {
    expect(nameOf(locations, 2, 'Product default')).toBe('Pantry');
  });

  it('shows the fallback for a null id', () => {
    expect(nameOf(locations, null, 'Product default')).toBe('Product default');
  });

  it('shows the id while the list has not loaded or has no such row', () => {
    expect(nameOf(undefined, 3, 'Product default')).toBe('#3');
    expect(nameOf(locations, 3, 'Product default')).toBe('#3');
  });

  it('writes the price as entered with its type', () => {
    expect(priceText({ price: 0.85, priceType: 'total' })).toBe('0.85 total');
    expect(priceText({ price: 2, priceType: 'unit' })).toBe('2 unit');
  });

  it('writes no price for a row with none', () => {
    expect(priceText({ price: null, priceType: 'unit' })).toBe('no price');
  });

  it('writes the due date or the default', () => {
    expect(dueDateText('2026-12-01')).toBe('2026-12-01');
    expect(dueDateText(null)).toBe('default due');
  });

  it('writes the Grocy stock of a product in its stock unit', () => {
    const quantityUnits = [{ id: 1, name: 'Can' }];
    expect(stockText({ stockAmount: 6, stockUnitId: 1 }, quantityUnits)).toBe(
      'In Grocy: 6 Can',
    );
  });

  it('writes that the stock loads while the product read has not answered', () => {
    expect(stockText(undefined, [])).toBe('The stock loads');
  });
});
