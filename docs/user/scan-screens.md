# The scan screens

Grocy Next has three scan screens: `Purchase`, `Inventory`, and `Consume and
Transfer`. Open them from the `Scan` group of the sidebar. On a phone, tap
the menu button in the top bar to open the sidebar.

A scan screen does not change the stock in Grocy. Each scan becomes one
pending scan in the review queue. A pending scan is one scanned or typed code
that waits for your decision. You accept or reject it in the review queue.
The page "The review queue" tells how.

## The three screens

- The `Purchase` screen is for products that you bought. The accept of a
  Purchase pending scan adds one stock entry in Grocy.
- The `Inventory` screen is for a count of the products that you have. The
  accept of an Inventory pending scan sets the Grocy stock of the product to
  the count. You type the count in the review queue, not on the scan screen.
- The `Consume and Transfer` screen is for products that you take out of
  stock and for products that you move to a different location. The accept
  of a Consume pending scan takes the amount out of stock in Grocy. The
  accept of a Transfer pending scan moves the amount from the "from"
  location to the "to" location. A switch under the camera sets the booking
  type of the next scan.

The time between the open and the close of one scan screen is the scan
session. The list on the screen shows the pending scans of this scan session
only, with the most recent scan at the top. The footer shows the number of
scans of the scan session. Tap `Done` to open the review queue.

## The camera

The camera starts when the screen opens. You do not tap a button. The browser
asks for the camera permission on the first open. Allow it.

The browser gives the camera only to a secure address. Open Grocy Next over
HTTPS, or the camera does not start.

Hold the barcode inside the white frame. The app reads these barcode types:
EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Data Matrix, and QR.

One barcode is one scan while it stays in view. The camera does not scan it
again. To scan the same item again, move the barcode out of view for more
than one second, then back into view.

The small label at the bottom left of the camera picture shows the decoder.
The decoder is the part of the app that reads the barcode from the camera
picture. The label has three parts:

- The decoder: `Native` is the barcode reader of the browser. `ZXing` is the
  reader that the app brings. The app uses `Native` when the browser reads
  all the barcode types above. Otherwise it uses `ZXing`.
- The thread: `worker` or `main thread`. The app reads the barcode in the
  background when it can. A label with `main thread` is slower.
- The time of the last read in milliseconds.

When a barcode does not scan, write the label into the bug report.

When the camera does not start, the camera area shows a message and a
`Retry` button:

- When you refused the camera permission, allow the camera for this site in
  the browser settings. Then tap `Retry`.
- When the camera did not start for another reason, the message shows the
  error. Tap `Retry`.

The typed code field works without the camera.

### The camera paths that are untested

The manual tests of the camera are for an Android phone with Chrome. These
paths are untested on a real device:

- The camera on an iPhone or an iPad (iOS). The browser on iOS has no native
  barcode reader, so the app uses `ZXing`.
- The camera of a desktop computer or a laptop. The automatic tests use a
  camera file in Chromium on a desktop computer. They do not use a real
  camera.

The automatic tests scan with the camera file on the Purchase screen and on
the Consume and Transfer screen.

## The hardware scanner

A hardware scanner is a device that reads a code and sends the code to the
app as key presses, as a keyboard does. Connect it with USB or Bluetooth in
keyboard mode. You do not tap a button. The camera and the hardware scanner
work at the same time.

A code from the hardware scanner gets the same feedback as a camera scan.
After the first code in a scan session, the label at the bottom left of the
camera picture shows the word `Scanner`. Each code from the hardware scanner
is one scan. Two scans of the same item count two.

Set the hardware scanner as follows. The guide of the hardware scanner tells
how to change each setting.

- Set the hardware scanner to send Enter after the code. The app ends the
  code at Enter. A Tab after the code does not end it.
- Turn off the code prefix (the AIM identifier). The prefix is a short text,
  such as `]E0`, before the code. The app does not remove it, so the code
  does not match a product barcode.
- Make the keyboard layout of the computer or the phone the same as the
  keyboard layout of the hardware scanner. The hardware scanner sends key
  positions, and the layout of the computer or the phone gives the
  characters. When the two layouts differ, symbols such as `@ # / [ ]` can
  be wrong.

Before a scan, tap outside the fields of the screen, for example on the
title. A scan while a field has the focus goes into that field. A scan into
the typed code field becomes a scan at the Enter. A scan into a field of a
row, such as the amount field of a Consume row, changes that field. The
Enter of the hardware scanner stores the text of the field.
Correct the field on the screen or in the review queue.

The app discards the collected key presses after one second with no key.

On Android, the soft keyboard does not open while a hardware scanner is
connected. To show it, open the Android settings, then `System`,
`Keyboard`, and `Physical keyboard`, and turn on `Use on-screen keyboard`.
The path and the name can differ on your phone. On some phones the setting
is `Show virtual keyboard`.

### The hardware scanner paths that are untested

Nobody tested the hardware scanner with a real device. The automatic tests
send the key presses from the test browser on a desktop computer, on each of
the three scan screens. These paths are untested:

- A real hardware scanner, with USB or Bluetooth.
- A Bluetooth hardware scanner on Android.
- A keyboard layout that is not US.
- The soft keyboard on a phone while a hardware scanner is connected.

## The typed code field

Use the typed code field for a code that has no barcode, for example the
four-digit code on fruit and vegetables. Type the code, then tap `Add`. A
typed code gets the same feedback as a camera scan.

On a phone, the field is above the footer. On a screen that is 1024 pixels
wide or more, the field is under the camera.

## The session defaults

The `Defaults` section is above the camera. Tap `Defaults` to open or close
it. When it is closed, the line shows the active defaults.

The screen copies the defaults into each new pending scan. A change applies
to the next scans. It does not change the scans that are already in the
list. You can change a pending scan in the review queue.

| Field                                   | Choices                                            | Screen               |
| --------------------------------------- | -------------------------------------------------- | -------------------- |
| `Location`                              | `Product default`, or a Grocy location             | Purchase, Inventory  |
| `From`                                  | `Product default`, or a Grocy location             | Consume and Transfer |
| `To, for a Transfer`                    | `Not set`, or a Grocy location                     | Consume and Transfer |
| `Store`                                 | `No store`, or a Grocy store                       | Purchase             |
| `Product group`                         | `Product default`, or a Grocy product group        | Purchase, Inventory  |
| `Due date` or `Due date of added stock` | `Product default`, `Days from today`, `Fixed date` | Purchase, Inventory  |

- `Product default` uses the value of the product in Grocy.
- `Days from today` starts at 7 days. Type a different number of days.
- `Fixed date` uses the date that you pick.
- On the Inventory screen, the due date applies only to the stock that an
  increase adds.
- The product group applies to a new product that you make from a pending
  scan. The filter of the review queue also uses it.
- On the Consume and Transfer screen, `From` is the "from" location of the
  next scans. `To, for a Transfer` is the "to" location of the next Transfer
  scans. The `To` select under the switch shows the same value. A change in
  one of the two fields also changes the other field.

Tap `Reset` to set every default back to its first value. On the Consume and
Transfer screen, `Reset` also clears the "to" location. It does not move the
switch.

The defaults are not stored. When you close the screen, the defaults are
lost. A new scan session starts with no defaults.

## The price field

The Purchase screen has the field `Price for the next scan` under the
camera. The Inventory screen and the Consume and Transfer screen have no
price.

1. Type the price before you scan the item. The field changes colour while
   it holds a price.
2. Tap `unit` or `total`. `unit` is the price of one unit. `total` is the
   price of the full amount.
3. Scan the item.

The scan takes the price, and the field becomes empty. The choice of `unit`
or `total` stays for the next scan.

## The feedback

Each scan gives a sound, a vibration, a colour on the frame of the camera
picture, and a banner at the top of the camera picture.

| Outcome       | Frame | Banner                                    | Sound and vibration                       |
| ------------- | ----- | ----------------------------------------- | ----------------------------------------- |
| Known product | Green | The product name and the amount           | One short high tone, a short vibration    |
| Repeat scan   | Green | The product name and `+1` (not Inventory) | Two quick rising tones, a short vibration |
| Unknown code  | Red   | `Unknown barcode` and the code            | Two low tones, a long vibration           |

On the Consume and Transfer screen, the banner starts with the booking type,
for example `Consume · 1 Can`.

The browser plays no sound before you touch the page. Tap the page one time
for sound. The speaker icon at the bottom right of the camera picture shows
when the sound is on.

When the server does not take the code, a red message shows under the
camera: `The code did not become a pending scan. Check that the API runs.`

### An unknown code

An unknown code is a code that matches no product barcode in Grocy. The
server asks an online barcode service, such as Open Food Facts, for the
code. When the service knows the code, the name shows in the list with the
words `New product`, and a link to the service. You make the product in the
review queue.

## The rows of the Purchase screen

Each row shows the product name, the time of the scan, the location, the due
date, and the price.

- A repeat scan of a product adds 1 to the amount of its row. The screen does
  not add a second row.
- When you type a price before a repeat scan, the row takes that price and
  its type. A repeat scan with no typed price keeps the price of the row.
- Tap the minus button or the plus button to change the amount. The amount
  does not go below 0.

## The rows of the Inventory screen

The Inventory screen has one row for each product. A repeat scan of a
product does not change its row. The banner shows `Already in the list`.

Each row shows the product name, the time of the scan, the Grocy stock of
the product, the location, and the due date. The row has no amount. You type
the count in the review queue.

When the code matches no product and the online service does not know it,
the row has the field `Type the product name`. Type the name, then press
Enter or leave the field. The review queue uses this name for the new
product.

## The Consume and Transfer screen

### The switch and the strip

The switch under the camera has two halves: `Consume`, with the fork and
knife icon, and `Transfer`, with the two arrows icon. Tap a half to set the
booking type of the next scan. The switch starts on `Consume`. It stays
where you put it until you close the screen. A change of the switch does not
change the scans that are already in the list.

The strip above the switch names the booking type of the next scan, so you
see it before you scan:

- `The next scan is a Consume`.
- `The next scan is a Transfer to Freezer`.
- `The next scan is a Transfer with no "to" location`.

### The "To" location

When the switch is on `Transfer`, the `To` select shows under the switch.
Pick the "to" location of the next scans. It is the same value as
`To, for a Transfer` in the defaults section. The "to" location stays for
the scan session, as the defaults do. A Consume does not use it.

A Transfer with no "to" location shows its detail line in red. The review
queue gives it the state `Needs a 'to' location`. Set the "to" location in
the row form or in the review queue before the accept.

### What the server sets on a new row

- The amount of a Consume is the amount of the product barcode, when the
  product barcode has one. Else it is the default consume amount of Grocy.
  When the Grocy setting for the quick consume amount is on, the quick
  consume amount of the product applies.
- The amount of a Transfer is the amount of the product barcode, when the
  product barcode has one. Else it is 1.
- The empty unit is the consume unit of the product on a Consume, and the
  stock unit on a Transfer.
- The "from" location is `From` of the defaults. When `From` is
  `Product default`, the server uses the location of the Grocy form. On a
  Consume, that is the default consume location of the product, or the default
  location when the product has no default consume location. On a Transfer,
  it is the default location. When that location has no stock, the server
  uses the first location with stock, in the Grocy consume order.
- A stock entry Grocycode, for example from a Grocy label, names one stock
  entry. The row takes the location of that stock entry. A Consume also
  takes the amount of that stock entry, in the stock unit. The accept takes
  that stock entry only.

### The rows

Each row starts with the icon of its booking type: the fork and knife for a
Consume, the two arrows for a Transfer. The icon is a button. Tap it to flip
the row between Consume and Transfer. Do this when you scanned with the
switch in the wrong position. The row keeps all its fields.

The detail line shows the time of the scan and the locations:

- A Consume shows `Consume from Fridge`. A spoiled Consume ends with
  `· Spoiled`.
- A Transfer shows the "from" location and the "to" location, for example
  `Transfer Fridge → Freezer`.
- A Consume also shows what the accept does to the packs. `Opens a new pack`
  means that the Consume takes a part of a sealed pack, and the accept opens
  the rest. `From the opened pack` means that the Consume takes only from
  opened packs. The text uses the Grocy stock and the older rows of the scan
  session.

A repeat scan of a code with the same booking type adds to the amount of its
row: the amount of the product barcode, else 1. A Consume row and a Transfer
row of the same code are two rows.

Tap the minus button or the plus button to change the amount by 1. The
amount does not go below 1.

A Consume row has the trash can button `Spoiled`. Tap it to mark the Consume
as spoiled. The trash can is red while the flag is on. Tap it again to turn
the flag off. Grocy stores a spoiled Consume as spoiled at the accept. A
Transfer row has no trash can.

When the code matches no product and the online service does not know it,
the row has the field `Type the product name`, as on the Inventory screen.

### The row form

Tap the product name of a row to open the row form under the row. Tap the
name again to close it. Each change in the form changes the pending scan at
once.

- `Amount`: type the amount, for example `0.5` or `0,5`. Press Enter or
  leave the field to keep it. A text that is not an amount above 0 puts the
  old amount back.
- `Unit`: the unit of the amount. The first choice is the default unit of
  the booking type, for example `Consume unit (Can)`.
- `From`: the "from" location.
- `To`: the "to" location. This field shows on a Transfer only.
- `Reject`: deletes the pending scan.

The row form has no stock entry select. To pick a stock entry, use the full
form in the review queue.

## Reject a scan

To reject a pending scan, swipe the row to the left. A short swipe moves the
row back. A swipe past one third of the row width rejects it.

On a screen that is 640 pixels wide or more, each row of the Purchase and
the Inventory screens also has a reject button with a trash icon. A row of
the Consume and Transfer screen has the `Reject` button in its row form.

A reject deletes the pending scan. Grocy does not change.
