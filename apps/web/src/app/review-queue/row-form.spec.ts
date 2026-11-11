import { rowFormBody, rowFormOf, unitChoices } from './row-form';

const scan = {
  amount: 2,
  dueDate: '2027-02-01',
  locationId: 1,
  note: 'Top shelf',
  price: 1.5,
  priceType: 'unit' as const,
  productGroupId: null,
  quantityUnitId: 3,
  storeId: 1,
};

describe('the full form of one row', () => {
  it('opens with the fields of the row, the numbers as text', () => {
    expect(rowFormOf(scan)).toEqual({
      amount: '2',
      dueDate: '2027-02-01',
      locationId: 1,
      note: 'Top shelf',
      price: '1.5',
      priceType: 'unit',
      productGroupId: null,
      quantityUnitId: 3,
      storeId: 1,
    });
  });

  it('opens with empty texts for the fields that the row does not have', () => {
    expect(
      rowFormOf({
        ...scan,
        amount: null,
        dueDate: null,
        note: null,
        price: null,
      }),
    ).toMatchObject({ amount: '', dueDate: '', note: '', price: '' });
  });

  it('saves every field of the form', () => {
    expect(
      rowFormBody({
        amount: '4',
        dueDate: '2027-03-01',
        locationId: 2,
        note: ' Box 2 ',
        price: '3.2',
        priceType: 'total',
        productGroupId: 1,
        quantityUnitId: 2,
        storeId: null,
      }),
    ).toEqual({
      amount: 4,
      dueDate: '2027-03-01',
      locationId: 2,
      note: 'Box 2',
      price: 3.2,
      priceType: 'total',
      productGroupId: 1,
      quantityUnitId: 2,
      storeId: null,
    });
  });

  it('saves null for an empty field', () => {
    expect(
      rowFormBody({
        ...rowFormOf(scan),
        amount: '',
        dueDate: '',
        note: '',
        price: 'x',
      }),
    ).toMatchObject({ amount: null, dueDate: null, note: null, price: null });
  });
});

describe('the unit choices of a Purchase row', () => {
  const units = [
    { id: 1, name: 'Can' },
    { id: 2, name: 'Pack' },
    { id: 3, name: 'Box' },
    { id: 4, name: 'Gram' },
  ];

  it('offers the purchase unit, the stock unit, and the units of the conversions of the product', () => {
    expect(
      unitChoices(
        {
          conversions: [
            { factor: 6, fromQuantityUnitId: 3, toQuantityUnitId: 2 },
          ],
          purchaseUnitId: 2,
          stockUnitId: 2,
        },
        units,
      ),
    ).toEqual([
      { id: 2, name: 'Pack' },
      { id: 3, name: 'Box' },
    ]);
  });

  it('offers every unit while the row has no product', () => {
    expect(unitChoices(undefined, units)).toEqual(units);
  });
});
