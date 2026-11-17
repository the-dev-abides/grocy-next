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
| QA-006     | See the Open Facts image in the browser on the phone   | The test phone, in Chrome |
| QA-007     | Scan with a USB hardware scanner on a desktop browser  | A desktop browser         |
| QA-008     | Scan with a Bluetooth hardware scanner on the phone    | The test phone, in Chrome |
| QA-009     | Scan with a keyboard layout that is not US             | A desktop browser         |
| QA-010     | Scan with a host layout that differs from the scanner  | A desktop browser         |
| QA-011     | Scan while the amount field of a row has the focus     | A desktop browser         |
| QA-012     | Scan a GS1 DataMatrix code with a group separator      | A desktop browser         |
| QA-013     | Consume and transfer with the camera, then accept both | The test phone, in Chrome |

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

## QA-006 See the Open Facts image in the browser on the phone

Device or browser: the test phone, in Chrome.

Preconditions:

- The build under test runs, and the phone reaches it.
- The API reaches the internet, and the online barcode lookup is on. The
  variable `BARCODE_LOOKUP` is unset or `on`, and `OPEN_FACTS_URL` is unset
  or the real Open Food Facts host.
- The API reaches a Grocy with no product barcode `3017620422003`.
- The phone reaches the internet over a network other than the network of
  the build, such as the mobile network, so that a block of the image host
  on one network shows.

Steps:

1. Open the Purchase scan screen from the sidebar.
   Expected: the Purchase screen opens, with the code field above the footer.
2. Type `3017620422003` into the code field and tap `Add`.
   Expected: one row with the bare code `3017620422003` appears at the top of
   the list, and the red banner reads `Unknown barcode`.
3. Wait up to ten seconds and read the row.
   Expected: the row reads `Nutella` with the words `New product`, and the
   line under the name ends with the link `Open Food Facts`.
4. Tap the link `Open Food Facts` on the row.
   Expected: Chrome opens the product page of the code on the Open Food Facts
   site in a new tab. Go back to the app.
5. Tap `Done`.
   Expected: the review queue page opens, and the row of the code shows the
   name `Nutella`.
6. Read the row of the code in the review queue.
   Expected: the row shows the front picture of the product, loaded from the
   Open Facts image host by the browser. The picture is not a broken image
   icon and not blank. When the picture does not show, record the answer in
   the test run: the image host refused the browser, and a follow-up ticket
   decides a proxy.
7. Swipe the row to the left past the middle of the screen on the Purchase
   scan screen, or reject it in the review queue.
   Expected: the row is gone. The test leaves no pending scan of the code.

## QA-007 Scan with a USB hardware scanner on a desktop browser

Device or browser: a desktop computer with a current Chrome, Firefox, or
Safari, and a USB hardware scanner in keyboard mode. A hardware scanner is a
device that reads a code and sends the code to the app as key presses.

Preconditions:

- The build under test runs, and the computer reaches it.
- The API reaches a Grocy with the product barcode `5449000000996`, or the
  Grocy mock of the end-to-end tests.
- The hardware scanner sends Enter after the code and sends no code prefix
  (the AIM identifier). The host keyboard layout and the layout of the
  hardware scanner are both US.
- A printed EAN-13 barcode `5449000000996` is at hand.

Steps:

1. Open the Purchase scan screen from the sidebar. Click on the title of
   the screen, so that no field and no button has the focus.
   Expected: the list is empty.
2. Scan the barcode `5449000000996` with the hardware scanner.
   Expected: one row with the product name of the code appears at the top of
   the list. The frame of the camera picture turns green, and the banner
   shows the product name. The line at the bottom left of the camera picture
   shows the word `Scanner`.
3. Scan the same barcode again.
   Expected: the banner shows `+1`, and the row shows the amount `2`. Each
   scan makes one create call, so two scans count two.
4. Click `Done`, then reject the row in the review queue.
   Expected: the row is gone.
5. Open the Inventory scan screen from the sidebar. Click on the title of
   the screen. Scan the barcode `5449000000996`.
   Expected: one row with the product name and the Grocy stock appears. The
   line at the bottom left of the camera picture shows the word `Scanner`.
6. Click the `Add` button of the code field, then press Enter on the
   keyboard.
   Expected: the focused button works as before. An Enter with no code does
   nothing to the list.
7. Reject the row.
   Expected: the row is gone.
8. Open the Consume and Transfer scan screen from the sidebar. Click on the
   title of the screen. Scan the barcode `5449000000996`.
   Expected: one Consume row with the product name and the fork and knife
   icon appears. The line at the bottom left of the camera picture shows the
   word `Scanner`.
9. Tap `Transfer` on the switch under the camera. Click on the title of the
   screen. Scan the barcode `5449000000996`.
   Expected: one Transfer row with the two arrows icon appears. The list has
   two rows.
10. Reject the two rows. Use the `Reject` button in the row form, which
    opens when you click the product name of the row.
    Expected: the rows are gone. The test leaves no pending scan of the
    code.

## QA-008 Scan with a Bluetooth hardware scanner on the phone

Device or browser: the test phone, in Chrome, and a Bluetooth hardware
scanner in keyboard mode.

Preconditions:

- The build under test runs, and the phone reaches it.
- The API reaches a Grocy with the product barcode `5449000000996`, or the
  Grocy mock of the end-to-end tests.
- The hardware scanner is paired with the phone, sends Enter after the code,
  and sends no code prefix.
- A printed EAN-13 barcode `5449000000996` is at hand.

Steps:

1. Open the Purchase scan screen from the sidebar. Tap on the title of the
   screen, so that no field has the focus.
   Expected: the soft keyboard does not open.
2. Scan the barcode `5449000000996` with the hardware scanner.
   Expected: one row with the product name appears. The phone plays the
   sound and vibrates as for a camera scan. The line at the bottom left of
   the camera picture shows the word `Scanner`. The soft keyboard does not
   open.
3. Scan the same barcode again.
   Expected: the row shows the amount `2`. The list still has one row.
4. Open the Android settings, then `System`, `Keyboard`, and `Physical
keyboard`. Turn on `Use on-screen keyboard`. The name of the path can
   differ on the phone. On some phones the setting is `Show virtual
keyboard`.
   Expected: the setting is on.
5. Go back to the app and tap the code field.
   Expected: the soft keyboard opens while the hardware scanner is
   connected.
6. Reject the row.
   Expected: the row is gone. The test leaves no pending scan of the code.

## QA-009 Scan with a keyboard layout that is not US

Device or browser: a desktop browser, and a USB hardware scanner in keyboard
mode.

Preconditions:

- The build under test runs, and the computer reaches it.
- The host keyboard layout is not US, for example German or French. The
  hardware scanner is set to the same layout.
- A Code 128 or QR code with letters, digits, and the symbols
  `@ # / - .` is at hand, for example `AB-12/34@x.y#z`.

Steps:

1. Open the Purchase scan screen. Click on the title of the screen.
   Expected: no field has the focus.
2. Scan the code.
   Expected: one row with the bare text of the code appears. The text on the
   row is the same as the text in the code, symbol for symbol.
3. Reject the row.
   Expected: the row is gone.

## QA-010 Scan with a host layout that differs from the scanner

Device or browser: a desktop browser, and a USB hardware scanner in keyboard
mode.

Preconditions:

- The build under test runs, and the computer reaches it.
- The host keyboard layout is not the layout of the hardware scanner, for
  example a German host and a US hardware scanner.
- The same code as in QA-009 is at hand.

Steps:

1. Open the Purchase scan screen. Click on the title of the screen.
   Expected: no field has the focus.
2. Scan the code.
   Expected: one row appears. The symbols, and on some layouts the letters
   `y` and `z`, can be wrong. The app does not correct them. Record in the
   test run the text on the row and the two layouts.
3. Reject the row.
   Expected: the row is gone.

## QA-011 Scan while the amount field of a row has the focus

Device or browser: a desktop browser, and a USB hardware scanner in keyboard
mode.

Preconditions:

- The build under test runs, and the computer reaches it.
- The API reaches a Grocy with the product barcode `5449000000996`, or the
  Grocy mock of the end-to-end tests.
- A printed EAN-13 barcode `5449000000996` is at hand.

Steps:

1. Open the Consume and Transfer scan screen. Type `5449000000996` into the
   code field and click `Add`.
   Expected: one Consume row with the product name of the code appears.
2. Click the product name of the row.
   Expected: the row form opens under the row, with the field `Amount`.
3. Click into the field `Amount`, so that the field has the focus. Then
   scan the barcode `5449000000996` with the hardware scanner.
   Expected: the digits of the code go into the field, after the amount.
   The Enter of the hardware scanner stores the text of the field as the
   amount of the row. The app makes no new row. The line at the bottom left
   of the camera picture does not show the word `Scanner`.
4. Select the text of the field `Amount`, type `1`, and press Enter.
   Expected: the row shows the amount `1`.
5. Click `Reject` in the row form.
   Expected: the row is gone. The test leaves no pending scan of the code.

## QA-012 Scan a GS1 DataMatrix code with a group separator

Device or browser: a desktop browser, and a USB hardware scanner in keyboard
mode that sends the group separator as Ctrl plus `]`.

Preconditions:

- The build under test runs, and the computer reaches it.
- The hardware scanner sends no code prefix.
- A GS1 DataMatrix code with two variable-length elements is at hand, for
  example the batch `(10)ABC123` followed by the serial `(21)XYZ`. A group
  separator is between the two elements.

Steps:

1. Open the Purchase scan screen. Click on the title of the screen.
   Expected: no field has the focus.
2. Scan the DataMatrix code.
   Expected: one row with the bare code appears.
3. Read the code of the row with the API:
   `GET /api/v2/pending-scans`.
   Expected: the code of the row holds the group separator character
   (0x1D, written `\u001d` in the JSON) between `ABC123` and `21XYZ`.
4. Reject the row.
   Expected: the row is gone.

## QA-013 Consume and transfer with the camera, then accept both

Device or browser: the test phone, in Chrome.

This case is the exit condition of the Consume and Transfer milestone.

Preconditions:

- The build under test runs, and the phone reaches it over HTTPS. Chrome
  gives the camera to a secure origin only.
- The API reaches a Grocy with stock of two products. Each product has a
  product barcode, and each barcode is at hand as a printed or on-screen
  barcode. Use a Grocy for tests, because the accept changes the stock.
- Grocy has at least two locations.
- Note the stock and the locations of the two products in Grocy before the
  test.

Steps:

1. Open the Consume and Transfer scan screen from the sidebar.
   Expected: the camera starts with no tap. The strip under the camera
   reads `The next scan is a Consume`.
2. Point the camera at the barcode of the first product.
   Expected: the frame turns green. The banner shows the product name and a
   line that starts with `Consume ·`.
   One Consume row with the product name and the fork and knife icon
   appears. The detail line names the "from" location.
3. Tap `Transfer` on the switch, then pick a "to" location in `To` that is
   not the location of the second product.
   Expected: the strip reads `The next scan is a Transfer to` and the name
   of the location.
4. Point the camera at the barcode of the second product.
   Expected: the frame turns green. The banner shows the product name and a
   line that starts with `Transfer ·`.
   One Transfer row with the two arrows icon appears. The detail line shows
   the "from" location, an arrow, and the "to" location.
5. Tap `Done`.
   Expected: the review queue opens. It shows the Consume row and the
   Transfer row with the state `Ready`. Each row shows its stock entry
   lines.
6. Tap `Accept` on the Consume row.
   Expected: the result panel shows the consume of the first product. When
   the consume took a part of a sealed pack, it also shows the open of the
   rest. The row is gone.
7. Tap `Accept` on the Transfer row.
   Expected: the result panel shows one `transfer_from` booking and one
   `transfer_to` booking. The row is gone.
8. Open Grocy and look at the stock of the two products.
   Expected: the stock of the first product is less by the amount of the
   Consume. The second product has the amount of the Transfer at the "to"
   location.
