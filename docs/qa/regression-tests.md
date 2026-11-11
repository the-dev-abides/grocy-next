# QA regression tests

This document holds the test cases that no automated test reaches, as ADR
0015 decided. Each case has an identifier, a title, the preconditions,
numbered steps, one expected result per step, and the device or browser.

A pull request that adds or changes a behaviour updates the cases in the same
pull request. A test run is one GitHub issue from the "Test run" issue
template, with the build, the device, the tester, and pass or fail per case.
This document holds no run history.

The test phone is an Android phone with the current Chrome. The cases name a
different device or browser when they need one.

## The cases

| Identifier | Title                                                  | Device or browser         |
| ---------- | ------------------------------------------------------ | ------------------------- |
| QA-001     | Install the app from the manifest                      | The test phone, in Chrome |
| QA-002     | Reject a pending scan with a swipe on the touch screen | The test phone, in Chrome |

## QA-001 Install the app from the manifest

Device or browser: the test phone, in Chrome.

Preconditions:

- The build under test runs, and the phone reaches it over HTTPS. Chrome
  installs a web app from a secure origin only.
- The app is not installed on the phone. Remove an earlier install first.

Steps:

1. Open the address of the build in Chrome.
   Expected: the review queue page opens, with the grey top bar, the mark,
   the name `Grocy Next`, and the hamburger button on the left.
2. Open the Chrome menu and select `Add to Home screen` or `Install app`.
   Expected: the install dialog shows the name `Grocy Next` and the icon
   with the white barcode on the blue square.
3. Confirm the install.
   Expected: an icon with the name `Grocy Next` appears on the home screen.
   The icon is the barcode mark, with no white border around it.
4. Open the app from the home screen icon.
   Expected: the app opens in its own window with no browser address bar.
   The status bar is the Grocy blue. The review queue page shows.
5. Turn the phone to landscape.
   Expected: the app turns with the phone. The page keeps the top bar and
   the hamburger button, or shows the icon rail when the width is 768px or
   more.

## QA-002 Reject a pending scan with a swipe on the touch screen

Device or browser: the test phone, in Chrome.

Preconditions:

- The build under test runs, and the phone reaches it.
- The API reaches a Grocy with the product barcode `5449000000996`, or the
  Grocy mock of the end-to-end tests.

Steps:

1. Open the Purchase scan screen from the sidebar.
   Expected: the Purchase screen opens, with the code field above the footer
   and the text `0 scans in the review queue` in the footer.
2. Type `5449000000996` into the code field and tap `Add`.
   Expected: one row with the product name of the code appears at the top of
   the list within three seconds. The footer reads `1 scan in the review
queue`.
3. Type `4011` into the code field and tap `Add`.
   Expected: a second row with the bare code `4011` appears at the top. The
   footer reads `2 scans in the review queue`.
4. Put one finger on the row with `4011` and move it to the left by about a
   quarter of the screen width, then lift the finger.
   Expected: the row follows the finger and shows the red layer with `Reject`
   behind it. When the finger lifts, the row slides back into place. Both
   rows stay. The footer still reads `2 scans in the review queue`.
5. Put one finger on the row with `4011` and move it up or down to scroll.
   Expected: the page scrolls. The row does not move to the left.
6. Put one finger on the row with `4011` and move it to the left past the
   middle of the screen, then lift the finger.
   Expected: the row slides out to the left and is gone. One row stays. The
   footer reads `1 scan in the review queue`.
7. Tap `Done`.
   Expected: the review queue page opens.
