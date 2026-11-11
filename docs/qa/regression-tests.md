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

| Identifier | Title                             | Device or browser         |
| ---------- | --------------------------------- | ------------------------- |
| QA-001     | Install the app from the manifest | The test phone, in Chrome |

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
