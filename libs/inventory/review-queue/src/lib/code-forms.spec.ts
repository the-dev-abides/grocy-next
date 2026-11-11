import { codeForms } from './code-forms.ts';

describe('the code forms rule', () => {
  it('pairs a 13-digit code with a leading zero with its 12-digit form, the code as scanned first', () => {
    expect(codeForms('0049000006346')).toEqual([
      '0049000006346',
      '049000006346',
    ]);
  });

  it('pairs a 12-digit code with its 13-digit form with a leading zero, the code as scanned first', () => {
    expect(codeForms('049000006346')).toEqual([
      '049000006346',
      '0049000006346',
    ]);
  });

  it('gives a 13-digit code with no leading zero one form', () => {
    expect(codeForms('5449000000996')).toEqual(['5449000000996']);
  });

  it('gives an 8-digit code one form', () => {
    expect(codeForms('96385074')).toEqual(['96385074']);
  });

  it('gives a 14-digit code one form', () => {
    expect(codeForms('00049000006346')).toEqual(['00049000006346']);
  });

  it('gives a typed produce code one form', () => {
    expect(codeForms('4011')).toEqual(['4011']);
  });

  it('gives a Grocycode one form', () => {
    expect(codeForms('grcy:p:1')).toEqual(['grcy:p:1']);
  });

  it('gives a code with a letter among twelve characters one form', () => {
    expect(codeForms('04900000634A')).toEqual(['04900000634A']);
  });
});
