# Hardware scanners in keyboard mode in a web app

Research for issue #124. This file records facts, not decisions.

The earlier research on branch `research/grocy-stock-workflows`, section "A
hardware scanner", records these facts. This file does not repeat them:

- Grocy has no code for hardware scanners.
- A USB or Bluetooth scanner types the barcode into the focused field and
  sends Enter.
- Grocy puts the focus in the product field on load and after each save.
- Grocy has a scanner test page at `/barcodescannertesting`.

Terms: "keyboard mode" (also "keyboard wedge" or "HID keyboard") means that
the scanner tells the host that it is a keyboard. HID means USB Human
Interface Device. The scanner then sends one key press for each character.
"Prefix" and "suffix" are the characters that the scanner adds before and
after the barcode data.

## 1. How a scanner in keyboard mode sends a code

### Key events in the browser

- A key gives the events in this order: `keydown`, then `beforeinput` and
  `input` (only when the key makes a character or changes the page), then
  `keyup`.
  Source: <https://w3c.github.io/uievents/#events-keyboard-event-order>
- `keypress` is deprecated. `keydown` fires for all keys.
  Source: <https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event>
- `KeyboardEvent.key` gives the character. The value includes the modifier
  keys and "the keyboard locale and layout". When the browser cannot identify
  the key, the value is `Unidentified`.
  Source: <https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key>
- `KeyboardEvent.code` gives the physical key. The keyboard layout does not
  change it. Example from MDN: `KeyQ` is Q on QWERTY, ' on Dvorak, and A on
  AZERTY.
  Source: <https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code>
- The UI Events specification says that virtual keyboards "are expected to
  produce the normal range of keyboard events".
  Source: <https://w3c.github.io/uievents/#idl-keyboardeventinit>

### Suffix and prefix

- Honeywell Voyager 1450g Quick Start Guide (VG1450-QS Rev A): the user scans
  "Add CR Suffix" for a carriage return after the barcode, "Add Tab Suffix"
  for a tab, or "Remove Suffix". The guide does not mark a default.
  Source (distributor copy of the Honeywell document):
  <https://www.posnet.com.pl/files/download/skaner-voyager-1450g---skrocona-instrukcja-obslugi-wer.-ang..pdf>
- Zebra ASCII character set table (DS4678 guide): prefix and suffix value
  1009 is Tab, 1013 is Enter, and 1029 is the keystroke `CTRL ]` (GS). For
  1009 and 1013, the scanner sends `CTRL I` and `CTRL M` unless "Function Key
  Mapping" is on. With Function Key Mapping on, it sends the Tab and Enter
  keys. Function Key Mapping is off by default.
  Sources:
  <https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/ascii-character-sets.html>,
  <https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/c-param-desc-usb-interface/c-param-desc-usb-host-parameters/r-param-desc-function-key-mapping-usb.html>
- Zebra: "ASCII values under 32 are normally sent as a control-key sequence."
  Source: the Function Key Mapping page above.
- A scanner can add an AIM symbology identifier as a prefix. This is a
  3-character code that starts with `]`, for example `]d2`. Some scanners need
  a configuration barcode to turn it on.
  Source: <https://github.com/NielsLeenheer/KeyboardBarcodeScanner>

### Time between keys

- Zebra USB Keystroke Delay: "No Delay" (default), "Medium Delay (20 msec)",
  "Long Delay (40 msec)".
  Source: <https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/c-param-desc-usb-interface/c-param-desc-usb-host-parameters/r-param-desc-usb-keystroke-delay.html>
- The author of `@point-of-sale/keyboard-barcode-scanner` measured these
  times between keys: Netum NSL-5 6 ms, Netum NSC750 19 ms, Honeywell HF680
  10 ms, Honeywell Voyager 1400g 10 ms, Datalogic BC2090 1 ms.
  Source: <https://github.com/NielsLeenheer/KeyboardBarcodeScanner/blob/main/src/main.js>
- The same author's README says: Honeywell scanners average 10 ms between
  keys. Zebra scanners average 80 ms, with peaks up to 100 ms. A QR code with
  about 250 characters "may take up to 25 seconds to type out".
  Source: <https://github.com/NielsLeenheer/KeyboardBarcodeScanner>
- The README of `@use-symbology-scanner` says to set `maxDelay` to 100 or
  200 ms for Bluetooth scanners because of latency. Its default is 20 ms.
  Source: <https://github.com/markjaniczak/symbology-scanner>

### How libraries tell a scanner from a person

All libraries below use timing. None has a method that is always correct.

- `@point-of-sale/keyboard-barcode-scanner` 1.1.4:
  - More than 2 keys at less than 30 ms each puts it in "data mode". In data
    mode it calls `preventDefault()` and `stopPropagation()` on each key.
  - A gap of more than 40 ms ends the code. 200 ms after the last key it also
    ends the code. The comment says the browser "may pause events for a
    couple of tens of ms".
  - It ignores all keys when the event target is an `INPUT` or `TEXTAREA`.
  - It turns Ctrl plus a character into a control character (character code
    minus 0x40). So `Ctrl+]` becomes 0x1D (GS).
  - It reads Alt plus numeric keypad sequences between two `Clear`/`NumLock`
    keys as one character code.
  - Its key map holds the string `'Escape:'` with a colon. So the Escape key
    does not map to 0x1B.
  - The README says: fast typing "may get picked up as a barcode. There is
    nothing that can be done about this."
  Sources: <https://github.com/NielsLeenheer/KeyboardBarcodeScanner/blob/main/src/main.js>,
  <https://github.com/NielsLeenheer/KeyboardBarcodeScanner>
- `onscan.js` 1.5.2:
  - Defaults: `avgTimeByChar` 30 ms, `timeBeforeScanTest` 100 ms,
    `minLength` 6, `suffixKeyCodes` `[9,13]` (Tab and Enter),
    `prefixKeyCodes` `[]`, `reactToPaste` false, `reactToKeydown` true.
  - `ignoreIfFocusOn` drops scans while a matching element has focus.
  - `reactToPaste` supports scanners that paste the code (clipboard mode).
  Source: <https://github.com/axenox/onscan.js>
  - The default `decodeKeyEvent` returns a character only for key codes
    48–90, 96–105, and 106–111 (digits, letters, numeric keypad). For other
    keys it returns an empty string. So punctuation such as `-`, `/`, and
    `]` is lost unless the app gives its own `keyCodeMapper`.
  Source: <https://github.com/axenox/onscan.js/blob/master/onscan.js>
- `use-scan-detection` 0.2.3: default `averageWaitTime` 50 ms, `minLength`
  1, `endCharacter` Enter and Escape. The repository is archived (since
  2023-12-05). The README points to `use-symbology-scanner`.
  Source: <https://github.com/markjaniczak/use-scan-detection>
- `@use-symbology-scanner/react` and `@use-symbology-scanner/vanilla`
  1.1.0: match the buffered keys against symbology rules (allowed characters,
  minimum and maximum length). Default `scannerOptions`:
  `{ prefix: '', suffix: '', maxDelay: 20 }`. Default `ignoreRepeats` true.
  Source: <https://github.com/markjaniczak/symbology-scanner>
- `@gooby/scanner` 1.2.2: listens to `keypress` on the document. Enter ends
  the code. It skips keys in `input`, `textarea`, `select`, and
  `contenteditable` elements. The source has no timing test.
  Sources: <https://github.com/angus-mcritchie/scanner>,
  <https://github.com/angus-mcritchie/scanner/blob/main/Scanner.js>

## 2. Focus

- The target of a key event is the focused element. "If no suitable element
  is in focus, the event target will be the `<body>` or the root." The event
  bubbles to `Document` and `Window`.
  Source: <https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event>
- The UI Events specification says the same: the body element, else the
  root element.
  Source: <https://w3c.github.io/uievents/#events-keyboard-event-order>
- So a page gets the keys with no focused input. It listens on `document` or
  `window`. All the libraries in section 1 listen on `document` by default
  (`use-scan-detection` option `container`, `@use-symbology-scanner` option
  `target`).
  Sources: the library README links in section 1.
- Without a focused input, an Enter or Tab in the scanner data can act on
  the page. The KeyboardBarcodeScanner README says the scanner "may 'tab'
  it's way to the browser location bar, type some data and press Enter".
  Source: <https://github.com/NielsLeenheer/KeyboardBarcodeScanner>
- The libraries skip keys when an input has focus (KeyboardBarcodeScanner
  always; `onscan.js` and `use-scan-detection` with `ignoreIfFocusOn`;
  `@gooby/scanner` with `ignoreSelector`). So a person can type in a form
  field and the library does not read it as a scan.
  Sources: the library links in section 1.
- A key event that the page makes with `dispatchEvent()` has `isTrusted`
  false. A key from the scanner has `isTrusted` true.
  Source: <https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted>

## 3. Android, iOS, and the desktop

### Android with a Bluetooth scanner

- Android 14 and later: Settings > System > Keyboard > Physical keyboard.
  "Use on-screen keyboard": "Turn this on if you want to keep your virtual
  keyboard on the tablet's screen when the physical keyboard is active."
  Source: <https://support.google.com/android/answer/14114879?hl=en>
- In the Android Settings source, the switch `show_virtual_keyboard_switch`
  has `android:defaultValue="false"`. So the soft keyboard hides when a
  physical keyboard (the scanner) is connected, by default.
  Source: <https://android.googlesource.com/platform/packages/apps/Settings/+/0dc4311/res/xml/physical_keyboard_settings.xml>
- The same Google page tells how to set the layout of a physical keyboard:
  Settings > System > Keyboard > Physical keyboard, select the keyboard,
  select the language, then "choose a layout". Some steps need Android 14 or
  later.
  Source: <https://support.google.com/android/answer/14114879?hl=en>
- Android maps the key codes of an external keyboard to characters with a
  key character map file. "If no device-specific key layout file is
  available, then the system will choose a default instead." The system has
  "a generic key character map that is suitable for many external keyboards".
  Source: <https://source.android.com/docs/core/interaction/input/key-character-map-files>
- `inputmode="none"` on an input: "No virtual keyboard. For when the page
  implements its own keyboard input control." `inputmode` is a hint.
  Source: <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode>
- The VirtualKeyboard API (`navigator.virtualKeyboard`, `show()`, `hide()`,
  attribute `virtualkeyboardpolicy="manual"` on `contenteditable`) is
  experimental and not Baseline. It needs a secure context (HTTPS).
  Source: <https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API>
- With the Android soft keyboard, Chrome reports `keyCode` 229 for letters.
  This is Chromium issue 118639. The soft keyboard is a different input path
  from the scanner.
  Source: <https://groups.google.com/a/chromium.org/g/chromium-bugs/c/08KdqaHAhsY>
- MDN: `keyCode` 229 marks an event that an input method (IME) processed. MDN
  shows a check: `event.isComposing || event.keyCode === 229`.
  Source: <https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event>

### iOS and iPadOS

- iPhone: Settings > General > Keyboard > Hardware Keyboard controls how the
  iPhone acts on an external keyboard. There the user can "Assign an
  alternative keyboard layout".
  Source: <https://support.apple.com/en-asia/guide/iphone/magic-keyboard-iph2ced3177/14.0/ios>
- The same page: when the keyboard reconnects, "the onscreen keyboard doesn't
  appear". The Eject key on the external keyboard shows and hides it.
  Source: the same page.
- Zebra parameter 1114, "Apple iOS Virtual Keyboard Toggle", default
  Disable. "When this feature is enabled, the scanner may be incompatible
  with non-Apple iOS devices." For the RS6100, Zebra says the option lets the
  user open and close the iOS virtual keyboard with the Restore key.
  Sources:
  <https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/c-param-desc-radio-communications/c-param-desc-hid-host-parameters/r-param-desc-apple-ios-virtual-keyboard-toggle.html>,
  <https://docs.zebra.com/us/en/mobile-computers/wearable/rs6-series/rs6100-product-reference-guide/bluetooth-communications/hid-host-parameters/apple-ios-virtual-keyboard-toggle.html>
- A user post on the Zebra developer forum says that an iPhone or iPad turns
  off its soft keyboard while a scanner is connected in Bluetooth HID mode.
  This is a user report, not Zebra documentation.
  Source: <https://developer.zebra.com/thread/26414>

### Desktop

- The browser gives `key` from the active layout of the operating system
  (see `KeyboardEvent.key` in section 1). The scanner sends key positions
  (HID usage codes), not characters. So the host layout decides the
  character.
  Sources: <https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key>,
  <https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code>

## 4. Keyboard layout errors

- Honeywell (VG1450-QS Rev A): the user scans "Program Keyboard Country",
  then a country number, then "Save". USA (0) is the default. "As a general
  rule, the following characters are not supported by the scanner for
  countries other than the United States: @ | $ # { } [ ] = / ' \ < > ~."
  Source (distributor copy of the Honeywell document):
  <https://www.posnet.com.pl/files/download/skaner-voyager-1450g---skrocona-instrukcja-obslugi-wer.-ang..pdf>
- Datalogic Gryphon I GD4500 Quick Reference Guide: Country Mode default is
  U.S. Only "USB Keyboard with alternate key encoding" and "USB Keyboard with
  standard key encoding" support all Country Modes. Other interfaces support
  only U.S., Belgium, United Kingdom, France, Germany, Italy, Spain, Sweden.
  Source: <https://cdn.datalogic.com/Download?iddwnfile=35950>
- Zebra Keypad Emulation: "send all characters as ASCII sequences over the
  numeric keypad". Example: A is sent as "ALT make 0 6 5 ALT Break". Zebra
  says to use it "If your keyboard type is not listed in the country code
  list".
  Source: <https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/c-param-desc-usb-interface/c-param-desc-usb-host-parameters/r-param-desc-keypad-emulation.html>
- MDN example of a mismatch: one physical key gives Q on QWERTY and A on
  AZERTY. A scanner set to US on an AZERTY host sends the Q key position. The
  host then gives A.
  Source: <https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code>
- `@point-of-sale/keyboard-barcode-scanner` reads Alt plus numeric keypad
  sequences as characters (see section 1). This path does not depend on the
  host layout.
  Source: <https://github.com/NielsLeenheer/KeyboardBarcodeScanner/blob/main/src/main.js>

## 5. GS1 DataMatrix and QR: FNC1 and the group separator

- FNC1 in GS1 DataMatrix has two uses: a start character, and a field
  separator after an Application Identifier (AI) that has no fixed length.
  FNC1 is "a special, non-printable, character".
  Source: GS1 DataMatrix Guideline Release 2.3, section 2.2,
  <https://ref.gs1.org/guidelines/datamatrix/2.3.0/>
- The symbology identifier is "the first three characters transmitted by
  the scanner". For GS1 DataMatrix it is `]d2`. "]d2 is a system feature and
  is never directly encoded into the GS1 DataMatrix symbol." If FNC1 is not
  in the first position, the scanner sends a different identifier.
  Source: the same guideline, sections 2.2.2 and 3.3.1.
- The scanner sends the first FNC1 as `]d2` and a separator FNC1 as `<GS>`.
  Example from the guideline:
  `]d201034531200000111719112510ABCD1234<GS>2110`. In hexadecimal the GS
  is `1d`. The same example ends with `0d 0a` (CR LF).
  Source: the same guideline, section 3.3.2.
- In keyboard mode, Zebra sends ASCII 29 (GS) as the keystroke `CTRL ]`.
  Source: <https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/ascii-character-sets.html>
- Zebra "USB Keyboard FN1 Substitution": "replace any FN1 character in a GS1
  128 barcode with a user-selected Key Category and value". It applies to
  Code 128 and ISBT 128. Default Disable.
  Source: <https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/c-param-desc-usb-interface/c-param-desc-usb-host-parameters/r-param-desc-usb-keyboard-fn1-substitution.html>
- `]` is one of the characters that Honeywell says are generally not
  supported outside the US layout (section 4). `CTRL ]` uses the `]` key
  position.
  Source: the Honeywell Quick Start Guide link in section 4.
- `@point-of-sale/keyboard-barcode-scanner` parses GS1 data into `gtin` and
  `elements` (`ai`, `label`, `value`). It reads a leading AIM identifier
  (`]` plus 2 characters) to set the symbology.
  Source: <https://github.com/NielsLeenheer/KeyboardBarcodeScanner>

## 6. Libraries

Versions are from `npm view <name> version` on 2026-11-12. The release date
is the npm publish time of that version.

| Package | Latest version | Licence | Release date | Notes |
| --- | --- | --- | --- | --- |
| `@point-of-sale/keyboard-barcode-scanner` | 1.1.4 | MIT | 2025-06-27 | No framework. Uses `@point-of-sale/barcode-parser` 1.0.4 (MIT, 2025-06-27) for AIM and GS1. |
| `onscan.js` | 1.5.2 | MIT | 2020-05-18 | No framework. Last commit 2024-11-01. |
| `@use-symbology-scanner/react` | 1.1.0 | MIT | 2024-08-20 | React hook. A `vanilla` package has the same version. |
| `use-scan-detection` | 0.2.3 | MIT | 2019-10-30 | React hook. Repository archived 2023-12-05. |
| `@gooby/scanner` | 1.2.2 | MIT | 2026-08-07 | No framework. Enter-terminated, no timing test. |
| `@point-of-sale/webhid-barcode-scanner` | 1.2.2 | MIT | 2025-04-08 | Not keyboard mode. Reads Honeywell, Zebra, or Datalogic scanners in HID POS mode through WebHID. |

Sources: the npm registry (`npm view`), and the repository links in
section 1. WebHID package:
<https://github.com/NielsLeenheer/WebHidBarcodeScanner>.

## 7. Testing with no device

- `onscan.simulate(element, codeOrArray)` fires a scan. A string skips key
  decoding. An array of key codes gives `keydown` events with an empty `key`.
  An array of objects (`keyCode`, `key`, `shiftKey`) can match native events
  closely.
  Source: <https://github.com/axenox/onscan.js>
- Events made with `dispatchEvent()` have `isTrusted` false. Code that checks
  `isTrusted` rejects them.
  Source: <https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted>
- Playwright `keyboard.type(text, { delay })`: `delay` is the time between key
  presses in ms, default 0. "For characters that are not on a US keyboard,
  only an `input` event will be sent." `keyboard.insertText` sends only an
  `input` event, with no `keydown` or `keyup`. `keyboard.press` supports
  modifier shortcuts such as `Control+o`. The page does not list
  `BracketRight`.
  Source: <https://playwright.dev/docs/api/class-keyboard>
- On Linux, `ydotool type` types text through `/dev/uinput`, so the
  operating system sees a keyboard. Option `-d,--key-delay` sets the delay
  between key events, default 12 ms.
  Source: the `ydotool(1)` manual page, ydotool 1.0.4;
  <https://github.com/ReimuNotMoe/ydotool>

## Gaps

- The full Honeywell user guide was not read. Its Function Code Transmit
  table and the default suffix are not recorded here.
- The Datalogic Product Reference Guide was too large to fetch. Its control
  character emulation and intercharacter delay are not recorded.
- No source was found that says whether Chrome on Android gives correct
  `key` values for an external Bluetooth keyboard with no focused input.
- No primary Android source for `adb shell input text` was found.
- No library was run. The facts about libraries come from their READMEs
  and source files.
