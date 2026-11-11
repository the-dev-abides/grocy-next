import { readLookupOptions } from './lookup-options.ts';

describe('the lookup options', () => {
  it('turns the lookup on and reads Open Food Facts when neither variable is set', () => {
    expect(readLookupOptions({})).toEqual({
      isOn: true,
      openFactsUrl: 'https://world.openfoodfacts.org',
    });
  });

  it('turns the lookup on when BARCODE_LOOKUP is on', () => {
    expect(readLookupOptions({ BARCODE_LOOKUP: 'on' })).toMatchObject({
      isOn: true,
    });
  });

  it('turns the lookup off when BARCODE_LOOKUP is off', () => {
    expect(readLookupOptions({ BARCODE_LOOKUP: 'off' })).toMatchObject({
      isOn: false,
    });
  });

  it('rejects a BARCODE_LOOKUP that is not on or off', () => {
    expect(() => readLookupOptions({ BARCODE_LOOKUP: 'yes' })).toThrow(
      'BARCODE_LOOKUP must be "on" or "off". The value is "yes".',
    );
  });

  it('reads the Open Facts base URL from OPEN_FACTS_URL', () => {
    expect(
      readLookupOptions({ OPEN_FACTS_URL: 'http://localhost:18083' }),
    ).toMatchObject({ openFactsUrl: 'http://localhost:18083' });
  });

  it('rejects an OPEN_FACTS_URL that is not a URL', () => {
    expect(() => readLookupOptions({ OPEN_FACTS_URL: 'open facts' })).toThrow(
      'OPEN_FACTS_URL must be a URL. The value is "open facts".',
    );
  });
});
