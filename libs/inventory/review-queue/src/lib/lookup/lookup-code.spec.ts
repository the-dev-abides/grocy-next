import { lookupCodeOf } from './lookup-code.ts';

describe('the lookup code rule', () => {
  it('sends a 13-digit code as scanned', () => {
    expect(lookupCodeOf('3017620422003')).toBe('3017620422003');
  });

  it('sends a 12-digit code as scanned', () => {
    expect(lookupCodeOf('049000006346')).toBe('049000006346');
  });

  it('sends a 14-digit code as scanned', () => {
    expect(lookupCodeOf('00049000006346')).toBe('00049000006346');
  });

  // The pair is the UPC-E example of the GS1 specification: the UPC-E code 0
  // 425261 4 is the UPC-A code 0 42100 00526 4.
  it('expands a UPC-E code to its 12-digit UPC-A form', () => {
    expect(lookupCodeOf('04252614')).toBe('042100005264');
  });

  it('expands a UPC-E code whose sixth digit is 3, 4, or 5 to 9 by its pattern', () => {
    expect(lookupCodeOf('01234531')).toBe('012300000451');
    expect(lookupCodeOf('01234543')).toBe('012340000053');
    expect(lookupCodeOf('01234565')).toBe('012345000065');
  });

  it('sends an EAN-8 code as scanned', () => {
    expect(lookupCodeOf('96385074')).toBe('96385074');
  });

  it('sends an 8-digit code whose check digit fits no UPC-E expansion as scanned', () => {
    expect(lookupCodeOf('01234534')).toBe('01234534');
  });

  it('looks up no typed produce code', () => {
    expect(lookupCodeOf('4011')).toBeNull();
  });

  it('looks up no Grocycode', () => {
    expect(lookupCodeOf('grcy:p:1')).toBeNull();
  });

  it('looks up no code with a letter among twelve characters', () => {
    expect(lookupCodeOf('04900000634A')).toBeNull();
  });
});
