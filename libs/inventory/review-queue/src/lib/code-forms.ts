// A camera decoder returns a UPC-A code as a 13-digit EAN with a leading
// zero. Grocy stores the 12 digits that its own scanner gave. The two forms
// are one code, as ADR 0011 decided.
const UPC_A_AS_EAN_13 = /^0\d{12}$/;
const UPC_A = /^\d{12}$/;

// This function returns the forms of a code, the code as scanned first. A
// 12-digit code and its 13-digit form with a leading zero are the forms of
// each other. Every other code has one form.
export function codeForms(code: string): string[] {
  if (UPC_A_AS_EAN_13.test(code)) {
    return [code, code.slice(1)];
  }
  if (UPC_A.test(code)) {
    return [code, `0${code}`];
  }
  return [code];
}
