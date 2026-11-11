// The online lookup runs only for a code of 8, 12, 13, or 14 digits, as ADR
// 0011 decided. A typed produce code, a Code 128 value, and a QR or Data Matrix
// value that is not a Grocycode skip it.
const LOOKUP_CODE = /^\d{8}$|^\d{12,14}$/;

// A UPC-E code has 8 digits: the number system 0 or 1, six data digits, and the
// check digit of its UPC-A form. An EAN-8 code starts with another digit.
const UPC_E = /^[01]\d{7}$/;

// The UPC-E patterns. The sixth data digit selects the pattern. The
// manufacturer part and the product part of the UPC-A form come from the five
// other data digits with zeros in the fixed places.
function upcAParts(data: string): [string, string] {
  const sixth = data.slice(5, 6);
  if (['0', '1', '2'].includes(sixth)) {
    return [`${data.slice(0, 2)}${sixth}00`, `00${data.slice(2, 5)}`];
  }
  if (sixth === '3') {
    return [`${data.slice(0, 3)}00`, `000${data.slice(3, 5)}`];
  }
  if (sixth === '4') {
    return [`${data.slice(0, 4)}0`, `0000${data.slice(4, 5)}`];
  }
  return [data.slice(0, 5), `0000${sixth}`];
}

// The GS1 check digit of eleven digits: the odd positions count three times,
// the even positions one time, and the check digit completes the sum to a
// multiple of ten.
function checkDigitOf(body: string): string {
  let sum = 0;
  for (let index = 0; index < body.length; index += 1) {
    sum += Number(body.charAt(index)) * (index % 2 === 0 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

// This function expands a UPC-E code to its 12-digit UPC-A form. A code whose
// check digit does not fit the expansion is not a UPC-E code and stays as
// scanned.
function expandUpcE(code: string): string {
  const numberSystem = code.slice(0, 1);
  const data = code.slice(1, 7);
  const [manufacturer, product] = upcAParts(data);
  const body = `${numberSystem}${manufacturer}${product}`;
  const checkDigit = checkDigitOf(body);
  return checkDigit === code.slice(7) ? `${body}${checkDigit}` : code;
}

// This function returns the code that the lookup sends for a scanned code, or
// null when the code gets no lookup. A UPC-E code of 8 digits is expanded to
// its 12-digit form for the lookup only. The pending scan keeps the code as
// scanned.
export function lookupCodeOf(code: string): null | string {
  if (!LOOKUP_CODE.test(code)) {
    return null;
  }
  return UPC_E.test(code) ? expandUpcE(code) : code;
}
