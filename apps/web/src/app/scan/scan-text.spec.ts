import {
  consumeDetailText,
  dueDateText,
  nameOf,
  nextScanText,
  priceText,
  stockText,
  transferDetailText,
} from './scan-text';

describe('the words of a pending scan', () => {
  const locations = [
    { id: 1, name: 'Fridge' },
    { id: 2, name: 'Pantry' },
    { id: 3, name: 'Freezer' },
  ];

  it('names a master data row by its id', () => {
    expect(nameOf(locations, 2, 'Product default')).toBe('Pantry');
  });

  it('shows the fallback for a null id', () => {
    expect(nameOf(locations, null, 'Product default')).toBe('Product default');
  });

  it('shows the id while the list has not loaded or has no such row', () => {
    expect(nameOf(undefined, 3, 'Product default')).toBe('#3');
    expect(nameOf(locations, 9, 'Product default')).toBe('#9');
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

  it('writes the booking type and the "from" location of a Consume row', () => {
    expect(
      consumeDetailText({ locationId: 1, spoiled: false }, locations),
    ).toBe('Consume from Fridge');
  });

  it('writes the product default for a Consume row with no location', () => {
    expect(
      consumeDetailText({ locationId: null, spoiled: false }, locations),
    ).toBe('Consume from the product default');
  });

  it('writes "Spoiled" for a spoiled Consume row', () => {
    expect(consumeDetailText({ locationId: 1, spoiled: true }, locations)).toBe(
      'Consume from Fridge · Spoiled',
    );
  });

  it('writes the booking type and both locations of a Transfer row', () => {
    expect(
      transferDetailText({ locationId: 1, toLocationId: 3 }, locations),
    ).toBe('Transfer Fridge → Freezer');
  });

  it('names the missing "to" location of a Transfer row', () => {
    expect(
      transferDetailText({ locationId: 1, toLocationId: null }, locations),
    ).toBe('Transfer Fridge → No "to" location');
  });

  it('names the booking type of the next scan in the strip', () => {
    expect(nextScanText('consume', 3, locations)).toBe(
      'The next scan is a Consume',
    );
    expect(nextScanText('transfer', 3, locations)).toBe(
      'The next scan is a Transfer to Freezer',
    );
  });

  it('says in the strip that the next Transfer has no "to" location', () => {
    expect(nextScanText('transfer', null, locations)).toBe(
      'The next scan is a Transfer with no "to" location',
    );
  });

  it('writes that the stock loads while the product read has not answered', () => {
    expect(stockText(undefined, [])).toBe('The stock loads');
  });
});
