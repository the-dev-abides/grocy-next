# The scan screens

Grocy Next has two scan screens: `Purchase` and `Inventory`. Open them from
the `Scan` group of the sidebar. On a phone, tap the menu button in the top
bar to open the sidebar.

A scan screen does not change the stock in Grocy. Each scan becomes one
pending scan in the review queue. A pending scan is one scanned or typed code
that waits for your decision. You accept or reject it in the review queue.
The page "The review queue" tells how.

## The two screens

- The `Purchase` screen is for products that you bought. The accept of a
  Purchase pending scan adds one stock entry in Grocy.
- The `Inventory` screen is for a count of the products that you have. The
  accept of an Inventory pending scan sets the Grocy stock of the product to
  the count. You type the count in the review queue, not on the scan screen.

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

| Field                                   | Choices                                            | Screen              |
| --------------------------------------- | -------------------------------------------------- | ------------------- |
| `Location`                              | `Product default`, or a Grocy location             | Purchase, Inventory |
| `Store`                                 | `No store`, or a Grocy store                       | Purchase            |
| `Product group`                         | `Product default`, or a Grocy product group        | Purchase, Inventory |
| `Due date` or `Due date of added stock` | `Product default`, `Days from today`, `Fixed date` | Purchase, Inventory |

- `Product default` uses the value of the product in Grocy.
- `Days from today` starts at 7 days. Type a different number of days.
- `Fixed date` uses the date that you pick.
- On the Inventory screen, the due date applies only to the stock that an
  increase adds.
- The product group applies to a new product that you make from a pending
  scan. The filter of the review queue also uses it.

Tap `Reset` to set every default back to its first value.

The defaults are not stored. When you close the screen, the defaults are
lost. A new scan session starts with no defaults.

## The price field

The Purchase screen has the field `Price for the next scan` under the
camera. The Inventory screen has no price.

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
| Repeat scan   | Green | The product name and `+1` (Purchase only) | Two quick rising tones, a short vibration |
| Unknown code  | Red   | `Unknown barcode` and the code            | Two low tones, a long vibration           |

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

## Reject a scan

To reject a pending scan, swipe the row to the left. A short swipe moves the
row back. A swipe past one third of the row width rejects it.

On a screen that is 640 pixels wide or more, each row also has a reject
button with a trash icon.

A reject deletes the pending scan. Grocy does not change.
