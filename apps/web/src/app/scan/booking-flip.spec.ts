import { isSwitchBookingType } from '../booking-types';
import { flipLabel, flippedBookingType } from './booking-flip';

describe('the flip of a booking type', () => {
  it('flips a Consume to a Transfer and a Transfer to a Consume', () => {
    expect(flippedBookingType('consume')).toBe('transfer');
    expect(flippedBookingType('transfer')).toBe('consume');
  });

  it('gives no flip for a Purchase and an Inventory', () => {
    expect(isSwitchBookingType('purchase')).toBe(false);
    expect(isSwitchBookingType('inventory')).toBe(false);
  });

  it('names the booking type and the booking type after a tap', () => {
    expect(flipLabel('consume')).toBe('Consume. Change to Transfer.');
    expect(flipLabel('transfer')).toBe('Transfer. Change to Consume.');
  });
});
