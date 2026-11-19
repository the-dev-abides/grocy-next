// The collected text is discarded when no key arrives for this many
// milliseconds.
export const DISCARD_MS = 1000;

// The group separator character of a GS1 code. A hardware scanner sends it as
// Ctrl plus `]`.
const GROUP_SEPARATOR = '\u{1D}';

// One character: one Unicode code point.
const ONE_CHARACTER = /^.$/su;

// The data of one key event that the rules use. `key` is the character that
// the browser reports. `isInField` is true when a text field, a select, or an
// editable element has the focus. `time` is in milliseconds.
export interface ScannerKey {
  altKey: boolean;
  ctrlKey: boolean;
  isInField: boolean;
  key: string;
  metaKey: boolean;
  time: number;
}

// The result of one key. `code` is the full code at the Enter that ends it,
// else null. `stop` is true when the listener must stop the key, so that the
// Enter presses no button.
export interface ScannerKeyResult {
  code: null | string;
  stop: boolean;
}

const NO_CODE: ScannerKeyResult = { code: null, stop: false };

// The input types that take no typed text. A key on such an input goes to the
// listener.
const INPUTS_WITH_NO_TEXT = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

// This function tells if the focused element is a text field, a select, or an
// editable element. A key on such an element goes into that element, not to
// the listener.
export function isField(element: Element | null): boolean {
  if (element instanceof HTMLInputElement) {
    return !INPUTS_WITH_NO_TEXT.has(element.type);
  }
  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }
  return element instanceof HTMLElement && element.isContentEditable;
}

// This function gives the character that the key adds to the code, or null
// for a key that adds nothing.
function characterOf(event: ScannerKey): null | string {
  if (event.altKey || event.metaKey) {
    return null;
  }
  if (event.ctrlKey) {
    return event.key === ']' ? GROUP_SEPARATOR : null;
  }
  return ONE_CHARACTER.test(event.key) ? event.key : null;
}

// This function makes the listener rules of the hardware scanner for one scan
// screen. A hardware scanner is a device that reads a code and sends the code
// to the app as key presses. The rules take each key event, collect the keys
// into a code, and return the code at the Enter that ends it. The rules do not
// parse the code and do not remove a prefix.
export function createHardwareScannerRule(): (
  event: ScannerKey,
) => ScannerKeyResult {
  let text = '';
  let lastKeyAt = -Infinity;
  return (event) => {
    if (event.isInField) {
      return NO_CODE;
    }
    if (event.time - lastKeyAt > DISCARD_MS) {
      text = '';
    }
    const hasModifier = event.altKey || event.ctrlKey || event.metaKey;
    if (!hasModifier && event.key === 'Enter') {
      const code = text;
      text = '';
      return code === '' ? NO_CODE : { code, stop: true };
    }
    const character = characterOf(event);
    if (character !== null) {
      text += character;
      lastKeyAt = event.time;
    }
    return NO_CODE;
  };
}
