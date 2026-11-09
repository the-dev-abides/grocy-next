# Inventory scan screen prototype

Throwaway. This branch is never merged. It answers the ticket "Inventory
scan screen", GitHub issue #73. It is built on top of the Purchase scan
screen prototype branch and reuses its camera, decoder, feedback, app
shell, and Grocy stand-in.

## Run it on a desktop

1. Check out the branch `prototype/inventory-scan-screen`.
2. Run `pnpm install`.
3. Run `pnpm exec nx run web:dev`.
4. Open `http://localhost:4200/?proto=inventory&variant=a`.

The bar at the bottom of the page switches the variant and the dark mode.
The URL holds the state: `?proto=inventory&variant=a|b|c` and `&dark=1`.
Add `&decoder=zxing` or `&decoder=native` to force one decoder. That switch
exists only in the prototype. The product has none (ADR 0009).

Type a code in the field under the camera when there is no camera. With
Grocy reachable, type a product barcode of the test household. Without
Grocy, `4011` and `4104420038110` are built-in products with stock.

## Run it on the phone

The same two ways as the Purchase prototype. See
`docs/prototype/purchase/README.md` on the branch
`prototype/purchase-scan-screen`. Replace `proto=purchase` with
`proto=inventory` in the URL.

## What the stand-in server does

The Purchase stand-in resolves the code (ADR 0011) and reads the catalog.
This prototype adds three stock reads from Grocy through the dev server
proxy under `/grocy`:

- The own stock of the product, its stock unit, the parent flag, and the
  tare weight, from the product details.
- The stock of the product per location.
- The products with stock at one location, for variant B.

It writes nothing. The pending scans live in memory and vanish on reload.
When Grocy is not reachable, a built-in table of five products answers.

## The variants

The layout is fixed: variant D of the Purchase scan screen, which the
maintainer picked. The scans are the page, most recent at the top. A camera
strip stays at the top. A collapsible defaults section sits above the
camera with the three Inventory defaults: location, product group, and the
due date rule for added stock. No store and no price. A swipe to the left
rejects a row. Done opens the review queue.

The variants differ in what the count means and in how the screen handles
a shelf:

- A, "Count": the count on the row is the new total stock of the product.
  The row shows the stock that Grocy has now and the difference. A repeat
  scan adds one. Plus and minus change the count. No shelf logic. A product
  on two shelves keeps one row; the user counts on.
- B, "Shelf": the session is bound to one location, the shelf. The count
  is the count on that shelf. The new total that the accept sends is the
  stock elsewhere plus the count here, so that a product on two shelves
  keeps its stock on the other shelf. Under the scanned rows, the products
  that Grocy has at this location and that the user did not scan, each with
  a "Not here" button and one "All not here" button. "Not here" makes a row
  with a count of zero here.
- C, "Keypad": the most recent scan is a card under the camera, with the
  Grocy stock in large type and a count field that takes the focus after
  each scan, for a typed count of a full shelf. Two quick buttons, "Same as
  Grocy" and "0". A repeat scan still adds one. The earlier rows are a
  compact list.

## The screenshots

The PNG files in this folder are from Playwright on a Pixel 7 viewport and
on a 1366 by 820 viewport, with a fake camera that shows one product
barcode of the test household. A second product barcode was typed.
