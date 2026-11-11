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
| QA-003     | Scan with the native decoder on the test phone         | The test phone, in Chrome |
| QA-004     | Decode in the worker at speed on the test phone        | The test phone, in Chrome |
| QA-005     | Hear and feel the scan feedback after the permission   | The test phone, in Chrome |

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

## QA-003 Scan with the native decoder on the test phone

Device or browser: the test phone, in Chrome, with Google Play Services.

Preconditions:

- The build under test runs, and the phone reaches it over HTTPS. Chrome
  gives the camera to a secure origin only.
- The API reaches a Grocy with the product barcode `5449000000996`, or the
  Grocy mock of the end-to-end tests.
- A printed or on-screen EAN-13 barcode `5449000000996` and a Data Matrix
  or QR code with any text are at hand.

Steps:

1. Open the Purchase scan screen from the sidebar.
   Expected: the camera starts with no tap, and the picture of the back
   camera shows in the strip above the code field. Chrome shows the camera
   permission prompt on the first open. Allow it.
2. Read the small label at the bottom left of the camera picture.
   Expected: the label reads `Native · worker` followed by a decode time in
   milliseconds. The label does not read `ZXing`.
3. Point the camera at the barcode `5449000000996`.
   Expected: the frame turns green, one row with the product name of the
   code appears at the top of the list, and the footer reads `1 scan in the
review queue`.
4. Keep the barcode in view for five seconds.
   Expected: the row stays one row with the amount `1`. No new row appears.
5. Move the barcode out of view for two seconds, then back into view.
   Expected: the frame turns green, the banner shows `+1`, and the row
   shows the amount `2`. The list still has one row.
6. Point the camera at the Data Matrix or QR code.
   Expected: the frame turns red, and a row with the bare text of the code
   appears at the top of the list.
7. Tap `Done`.
   Expected: the review queue page opens.

## QA-004 Decode in the worker at speed on the test phone

Device or browser: the test phone, in Chrome.

Preconditions:

- The preconditions of QA-003.

Steps:

1. Open the Purchase scan screen and allow the camera.
   Expected: the small label at the bottom left of the camera picture
   names the thread `worker`. It does not read `main thread`.
2. Point the camera at a blank wall for ten seconds and read the decode
   time in the label.
   Expected: the decode time stays under 100 milliseconds on every reading.
   The camera picture moves with no stutter.
3. Point the camera at the barcode `5449000000996` from about 20
   centimetres.
   Expected: the green frame shows within one second of the barcode
   entering the view.
4. Move the barcode out of view and back into view five times, with a pause
   of two seconds out of view each time.
   Expected: each return gives one `+1` banner within one second. The row
   shows the amount `6` after the fifth return.
5. Lock the phone, wait five seconds, and unlock it.
   Expected: the camera picture runs again, and the label still names the
   thread `worker`.

## QA-005 Hear and feel the scan feedback after the permission

Device or browser: the test phone, in Chrome.

Preconditions:

- The preconditions of QA-003.
- The phone is not in silent mode, and the media volume is up.
- Chrome has no camera permission for the origin of the build. Remove the
  permission in the site settings of Chrome first.

Steps:

1. Open the Purchase scan screen from the sidebar.
   Expected: Chrome shows the camera permission prompt. The speaker icon at
   the bottom right of the camera picture is the muted icon.
2. Tap `Allow` on the prompt. Do not touch the page.
   Expected: the camera starts. Note whether the speaker icon changed to the
   on icon. Record the answer in the test run: it says whether the tap on
   the prompt counts as the first tap on the page.
3. Point the camera at the barcode `5449000000996`.
   Expected: the frame turns green. When the speaker icon is on, the phone
   plays one short high tone and vibrates one time, short. When the icon is
   muted, the phone plays nothing and does not vibrate.
4. When the speaker icon is still muted, tap once on the page outside a
   button or a field.
   Expected: the speaker icon changes to the on icon.
5. Move the barcode out of view for two seconds, then back into view.
   Expected: the phone plays a two-tone, low then high, and vibrates one
   time, short. The banner shows `+1`.
6. Point the camera at a Data Matrix or QR code with text that is not a
   product barcode.
   Expected: the phone plays two low tones and vibrates long, in a pattern
   of two pulses. The frame turns red, and the red banner stays for about
   three seconds.
7. Refuse the camera permission: open the site settings of Chrome, block
   the camera, and reload the page.
   Expected: the camera strip shows the message that the permission was
   refused, a `Retry` button, and the code field below it. A code typed into
   the field still becomes a row.
