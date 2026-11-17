import {
  bulkEditBody,
  bulkFieldCounts,
  bulkFieldLabel,
  EMPTY_BULK_EDIT,
} from './bulk-edit';

const purchase = { bookingType: 'purchase' as const };
const inventory = { bookingType: 'inventory' as const };
const consume = { bookingType: 'consume' as const };
const transfer = { bookingType: 'transfer' as const };

describe('the update of the bulk edit', () => {
  it('sends no field when the user set no field', () => {
    expect(bulkEditBody(EMPTY_BULK_EDIT, purchase)).toEqual({});
  });

  it('sends only the one field that the user set', () => {
    expect(
      bulkEditBody({ ...EMPTY_BULK_EDIT, locationId: 3 }, purchase),
    ).toEqual({
      locationId: 3,
    });
  });

  it('sends every field that the user set to a Purchase row, with the numbers as numbers', () => {
    expect(
      bulkEditBody(
        {
          ...EMPTY_BULK_EDIT,
          amount: '2',
          dueDate: '2027-03-01',
          locationId: 1,
          note: 'Top shelf',
          price: '1.25',
          priceType: 'total',
          productGroupId: 2,
          storeId: 1,
        },
        purchase,
      ),
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
      bulkEditBody(
        {
          ...EMPTY_BULK_EDIT,
          dueDate: null,
          productGroupId: null,
          storeId: null,
        },
        purchase,
      ),
    ).toEqual({ dueDate: null, productGroupId: null, storeId: null });
  });

  it('sends no amount and no price for a text that is not a number', () => {
    expect(
      bulkEditBody({ ...EMPTY_BULK_EDIT, amount: 'two', price: ' ' }, purchase),
    ).toEqual({});
  });

  it('sends no due date while the fixed date is empty', () => {
    expect(bulkEditBody({ ...EMPTY_BULK_EDIT, dueDate: '' }, purchase)).toEqual(
      {},
    );
  });
});

describe('the bulk edit of rows of different booking types', () => {
  const edit = {
    ...EMPTY_BULK_EDIT,
    amount: '2',
    bookingType: undefined,
    dueDate: '2027-03-01',
    price: '1.25',
    priceType: 'total' as const,
    spoiled: true,
    storeId: 1,
    toLocationId: 4,
  };

  it('sends to each row only the fields of its booking type', () => {
    expect(bulkEditBody(edit, purchase)).toEqual({
      amount: 2,
      dueDate: '2027-03-01',
      price: 1.25,
      priceType: 'total',
      storeId: 1,
    });
    expect(bulkEditBody(edit, inventory)).toEqual({
      amount: 2,
      dueDate: '2027-03-01',
      price: 1.25,
      storeId: 1,
    });
    expect(bulkEditBody(edit, consume)).toEqual({ amount: 2, spoiled: true });
    expect(bulkEditBody(edit, transfer)).toEqual({
      amount: 2,
      toLocationId: 4,
    });
  });

  it('changes the booking type of a Consume row and a Transfer row only, and sends the fields of the new booking type', () => {
    const toTransfer = { ...EMPTY_BULK_EDIT, bookingType: 'transfer' as const };

    expect(bulkEditBody({ ...toTransfer, toLocationId: 4 }, consume)).toEqual({
      bookingType: 'transfer',
      toLocationId: 4,
    });
    expect(bulkEditBody({ ...toTransfer, spoiled: true }, transfer)).toEqual({
      bookingType: 'transfer',
    });
    expect(bulkEditBody(toTransfer, purchase)).toEqual({});
  });

  it('counts the checked rows that each field changes', () => {
    const rows = [purchase, inventory, consume, transfer];

    expect(bulkFieldCounts(EMPTY_BULK_EDIT, rows)).toEqual({
      amount: 4,
      bookingType: 2,
      dueDate: 2,
      location: 4,
      note: 4,
      price: 2,
      priceType: 1,
      productGroup: 4,
      spoiled: 1,
      store: 2,
      toLocation: 1,
    });
  });

  it('counts the "to" location and spoiled after the booking type change', () => {
    const rows = [consume, transfer];

    expect(
      bulkFieldCounts({ ...EMPTY_BULK_EDIT, bookingType: 'transfer' }, rows),
    ).toMatchObject({ spoiled: 0, toLocation: 2 });
    expect(
      bulkFieldCounts({ ...EMPTY_BULK_EDIT, bookingType: 'consume' }, rows),
    ).toMatchObject({ spoiled: 2, toLocation: 0 });
  });

  it('names the count in the label only when the field changes a part of the rows', () => {
    expect(bulkFieldLabel('To', 1, 2)).toBe('To (1 of 2 rows)');
    expect(bulkFieldLabel('To', 2, 2)).toBe('To');
    expect(bulkFieldLabel('Spoiled', 1, 1)).toBe('Spoiled');
  });
});
