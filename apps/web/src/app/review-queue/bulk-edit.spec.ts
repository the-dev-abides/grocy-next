import { bulkEditBody, EMPTY_BULK_EDIT } from './bulk-edit';

describe('the update of the bulk edit', () => {
  it('sends no field when the user set no field', () => {
    expect(bulkEditBody(EMPTY_BULK_EDIT)).toEqual({});
  });

  it('sends only the one field that the user set', () => {
    expect(bulkEditBody({ ...EMPTY_BULK_EDIT, locationId: 3 })).toEqual({
      locationId: 3,
    });
  });

  it('sends every field that the user set, with the numbers as numbers', () => {
    expect(
      bulkEditBody({
        amount: '2',
        dueDate: '2027-03-01',
        locationId: 1,
        note: 'Top shelf',
        price: '1.25',
        priceType: 'total',
        productGroupId: 2,
        storeId: 1,
      }),
    ).toEqual({
      amount: 2,
      dueDate: '2027-03-01',
      locationId: 1,
      note: 'Top shelf',
      price: 1.25,
      priceType: 'total',
      productGroupId: 2,
      storeId: 1,
    });
  });

  it('sends null for a field that the user set to none', () => {
    expect(
      bulkEditBody({
        ...EMPTY_BULK_EDIT,
        dueDate: null,
        productGroupId: null,
        storeId: null,
      }),
    ).toEqual({ dueDate: null, productGroupId: null, storeId: null });
  });

  it('sends no amount and no price for a text that is not a number', () => {
    expect(
      bulkEditBody({ ...EMPTY_BULK_EDIT, amount: 'two', price: ' ' }),
    ).toEqual({});
  });

  it('sends no due date while the fixed date is empty', () => {
    expect(bulkEditBody({ ...EMPTY_BULK_EDIT, dueDate: '' })).toEqual({});
  });
});
