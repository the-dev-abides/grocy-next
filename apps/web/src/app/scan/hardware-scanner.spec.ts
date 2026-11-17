import type { ScannerKey } from './hardware-scanner';

import {
  createHardwareScannerRule,
  DISCARD_MS,
  isField,
} from './hardware-scanner';

// The listener rules of the hardware scanner, with made key events. A
// hardware scanner sends a code as key presses and ends it with Enter.

function key(
  value: string,
  time: number,
  extra: Partial<ScannerKey> = {},
): ScannerKey {
  return {
    altKey: false,
    ctrlKey: false,
    isInField: false,
    key: value,
    metaKey: false,
    time,
    ...extra,
  };
}

// This function sends each character of the text as one key, 10 ms apart,
// then Enter. It returns the result of the Enter.
function typeAndEnter(
  rule: ReturnType<typeof createHardwareScannerRule>,
  text: string,
) {
  let time = 0;
  for (const character of text) {
    rule(key(character, time));
    time += 10;
  }
  return rule(key('Enter', time));
}

describe('the listener rules of the hardware scanner', () => {
  it('gives the collected code at Enter and stops that Enter', () => {
    const rule = createHardwareScannerRule();

    expect(typeAndEnter(rule, '8000500310427')).toEqual({
      code: '8000500310427',
      stop: true,
    });
  });

  it('gives nothing and does not stop a key that is not Enter', () => {
    const rule = createHardwareScannerRule();

    expect(rule(key('8', 0))).toEqual({ code: null, stop: false });
  });

  it('starts a new code after each Enter', () => {
    const rule = createHardwareScannerRule();
    typeAndEnter(rule, '4011');

    expect(typeAndEnter(rule, '4011')).toEqual({ code: '4011', stop: true });
  });

  it('does nothing at an Enter with no collected text', () => {
    const rule = createHardwareScannerRule();

    expect(rule(key('Enter', 0))).toEqual({ code: null, stop: false });
  });

  it('ignores the keys while a text field has the focus', () => {
    const rule = createHardwareScannerRule();
    rule(key('4', 0, { isInField: true }));
    rule(key('0', 10, { isInField: true }));

    expect(rule(key('Enter', 20, { isInField: true }))).toEqual({
      code: null,
      stop: false,
    });
  });

  it('ignores a key that does not make one character', () => {
    const rule = createHardwareScannerRule();
    rule(key('Shift', 0));
    rule(key('A', 10));
    rule(key('Tab', 20));
    rule(key('ArrowDown', 30));
    rule(key('Dead', 40));

    expect(rule(key('Enter', 50))).toEqual({ code: 'A', stop: true });
  });

  it('takes a character that is not on a US keyboard', () => {
    const rule = createHardwareScannerRule();

    expect(typeAndEnter(rule, 'é§')).toEqual({ code: 'é§', stop: true });
  });

  it('ignores a key with Ctrl, Alt, or Meta', () => {
    const rule = createHardwareScannerRule();
    rule(key('1', 0));
    rule(key('c', 10, { ctrlKey: true }));
    rule(key('x', 20, { altKey: true }));
    rule(key('v', 30, { metaKey: true }));

    expect(rule(key('Enter', 40))).toEqual({ code: '1', stop: true });
  });

  it('ignores an Enter with Ctrl, Alt, or Meta', () => {
    const rule = createHardwareScannerRule();
    rule(key('1', 0));

    expect(rule(key('Enter', 10, { ctrlKey: true }))).toEqual({
      code: null,
      stop: false,
    });
    expect(rule(key('Enter', 20))).toEqual({ code: '1', stop: true });
  });

  it('changes Ctrl plus ] into the group separator character', () => {
    const rule = createHardwareScannerRule();
    rule(key(']', 0));
    rule(key('d', 10));
    rule(key('2', 20));
    rule(key('0', 30));
    rule(key('1', 40));
    rule(key(']', 50, { ctrlKey: true }));
    rule(key('1', 60));
    rule(key('0', 70));

    expect(rule(key('Enter', 80))).toEqual({
      code: ']d201\u{1D}10',
      stop: true,
    });
  });

  it('ignores Ctrl plus ] with Alt or Meta', () => {
    const rule = createHardwareScannerRule();
    rule(key('1', 0));
    rule(key(']', 10, { altKey: true, ctrlKey: true }));
    rule(key(']', 20, { ctrlKey: true, metaKey: true }));

    expect(rule(key('Enter', 30))).toEqual({ code: '1', stop: true });
  });

  it('keeps the text when the next key comes within one second', () => {
    const rule = createHardwareScannerRule();
    rule(key('1', 0));
    rule(key('2', DISCARD_MS));

    expect(rule(key('Enter', 2 * DISCARD_MS))).toEqual({
      code: '12',
      stop: true,
    });
  });

  it('discards the text after one second with no key', () => {
    const rule = createHardwareScannerRule();
    rule(key('1', 0));
    rule(key('2', DISCARD_MS + 1));

    expect(rule(key('Enter', DISCARD_MS + 11))).toEqual({
      code: '2',
      stop: true,
    });
  });

  it('does nothing at an Enter that comes more than one second after the last key', () => {
    const rule = createHardwareScannerRule();
    rule(key('1', 0));

    expect(rule(key('Enter', DISCARD_MS + 1))).toEqual({
      code: null,
      stop: false,
    });
  });

  it('is one second', () => {
    expect(DISCARD_MS).toBe(1000);
  });
});

// This function makes an element. jsdom does not compute
// `isContentEditable`, so the function sets it as a browser does.
function element(
  tag: string,
  attributes: Readonly<Record<string, string>> = {},
): HTMLElement {
  const made = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    made.setAttribute(name, value);
  }
  Object.defineProperty(made, 'isContentEditable', {
    value: attributes['contenteditable'] === 'true',
  });
  return made;
}

describe('the focus rule of the hardware scanner', () => {
  it('counts a text field, a number field, and a text area as a field', () => {
    expect(isField(element('input', { type: 'text' }))).toBe(true);
    expect(isField(element('input'))).toBe(true);
    expect(isField(element('input', { type: 'number' }))).toBe(true);
    expect(isField(element('input', { type: 'search' }))).toBe(true);
    expect(isField(element('textarea'))).toBe(true);
  });

  it('counts a select as a field', () => {
    expect(isField(element('select'))).toBe(true);
  });

  it('counts an editable element as a field', () => {
    expect(isField(element('div', { contenteditable: 'true' }))).toBe(true);
  });

  it('does not count no focus, a button, a link, or a checkbox as a field', () => {
    expect(isField(null)).toBe(false);
    expect(isField(element('div'))).toBe(false);
    expect(isField(element('button'))).toBe(false);
    expect(isField(element('a', { href: '/' }))).toBe(false);
    expect(isField(element('input', { type: 'checkbox' }))).toBe(false);
    expect(isField(element('input', { type: 'radio' }))).toBe(false);
    expect(isField(element('input', { type: 'submit' }))).toBe(false);
  });
});

