import {
  createFieldsOf,
  defaultsSummary,
  INITIAL_DEFAULTS,
} from './session-defaults';

describe('the session defaults of a scan screen', () => {
  const today = Temporal.PlainDate.from('2026-11-11');
  const lists = {
    locations: [{ id: 2, name: 'Pantry' }],
    productGroups: [{ id: 1, name: 'Dairy' }],
    stores: [{ id: 1, name: 'Supermarket' }],
  };

  it('sends no default field while every default is unset', () => {
    expect(
      createFieldsOf(INITIAL_DEFAULTS, { price: '', priceType: 'unit' }, today),
    ).toEqual({ priceType: 'unit' });
  });

  it('copies the set defaults and the due date into the create fields', () => {
    expect(
      createFieldsOf(
        {
          dueRule: { days: 7, kind: 'days' },
          locationId: 2,
          productGroupId: 1,
          storeId: 1,
        },
        { price: '2.50', priceType: 'total' },
        today,
      ),
    ).toEqual({
      dueDate: '2026-11-18',
      locationId: 2,
      price: 2.5,
      priceType: 'total',
      productGroupId: 1,
      storeId: 1,
    });
  });

  it('sends no price and no price type for the Inventory screen, which has no price', () => {
    expect(
      createFieldsOf(
        {
          ...INITIAL_DEFAULTS,
          dueRule: { days: 3, kind: 'days' },
          locationId: 2,
        },
        null,
        today,
      ),
    ).toEqual({ dueDate: '2026-11-14', locationId: 2 });
  });

  it('sends no price for a blank price or a text that is not a number', () => {
    const fields = createFieldsOf(
      INITIAL_DEFAULTS,
      { price: 'abc', priceType: 'unit' },
      today,
    );
    expect(fields).toEqual({ priceType: 'unit' });
  });

  it('writes the summary line of the collapsed section', () => {
    expect(defaultsSummary(INITIAL_DEFAULTS, lists, 'purchase')).toBe(
      'Product default · No store · Product default · Default group',
    );
    expect(
      defaultsSummary(
        {
          dueRule: { days: 7, kind: 'days' },
          locationId: 2,
          productGroupId: 1,
          storeId: 1,
        },
        lists,
        'purchase',
      ),
    ).toBe('Pantry · Supermarket · +7 days · Dairy');
  });

  it('leaves the store out of the summary line of the Inventory screen', () => {
    expect(defaultsSummary(INITIAL_DEFAULTS, lists, 'inventory')).toBe(
      'Product default · Product default · Default group',
    );
  });
});
