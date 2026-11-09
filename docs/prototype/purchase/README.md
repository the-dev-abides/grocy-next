# Purchase scan screen prototype

Throwaway. This branch is never merged. It answers the ticket "Purchase
scan screen", GitHub issue #72.

## Run it on a desktop

1. Check out the branch `prototype/purchase-scan-screen`.
2. Run `pnpm install`.
3. Run `pnpm exec nx run web:dev`.
4. Open `http://localhost:4200/?proto=purchase&variant=d`.

The bar at the bottom of the page switches the variant and the dark mode.
The URL holds the state: `?proto=purchase&variant=d|a|b|c` and `&dark=1`.
Add `&decoder=zxing` or `&decoder=native` to force one decoder. That switch
exists only in the prototype. The product has none (ADR 0009).

A desktop browser on Linux has no native decoder, so the label on the camera
says `ZXing · worker`. Type a code in the field under the camera when there
is no camera: `4011` is a built-in product when Grocy is not reachable.

## Run it on the phone

The camera needs a secure context. The dev server has two ways:

1. HTTPS with a self-signed certificate. Run
   `PROTO_PHONE=1 pnpm exec nx run web:dev`. On the phone, open
   `https://<the LAN address of the computer>:4200/?proto=purchase&variant=d`.
   Chrome shows a certificate warning. Tap "Advanced", then "Proceed".
2. HTTP with a Chrome flag. Run `PROTO_PHONE=http pnpm exec nx run web:dev`.
   On the phone, open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`,
   add `http://<the LAN address of the computer>:4200`, enable the flag, and
   restart Chrome. Then open
   `http://<the LAN address of the computer>:4200/?proto=purchase&variant=d`.

If port 4200 is in use, the dev server prints the port that it took.

Chrome on Android plays the sound and the vibration only after one tap on
the page. The speaker icon at the bottom right of the camera goes from muted
to on after that tap.

## What the stand-in server does

The prototype has no Next API behind it. A stand-in in the browser does what
ADR 0010 and ADR 0011 give the server:

- It reads the locations, the stores, the product groups, and the product
  barcodes from Grocy through the dev server proxy under `/grocy`. The
  proxy takes `GROCY_URL` and `GROCY_API_KEY` from the workspace `.env`.
  When Grocy is not reachable, a built-in table of five products answers.
- It resolves a code in the order of ADR 0011: a Grocycode, then a product
  barcode, then the online lookup at Open Food Facts for a code of 8, 12,
  13, or 14 digits, then the bare code.
- It merges a repeat scan into the open pending scan of the same code.
- It writes nothing. The pending scans live in memory and vanish on reload.

## The variants

- D, "Hybrid": the maintainer's mix after the first review, and the
  direction of the ticket. The layout of C. The defaults are a collapsible
  section above the camera; open, it is the form of B with no price field.
  A price row sits under the camera: the price for the next scan, unit or
  total. The user types the price, then scans the item. The scan takes the
  price and the field clears; the price type stays. A swipe to the left on
  a row rejects the scan; a short swipe snaps back.
- A, "Viewfinder": the camera fills the screen. The defaults are chips over
  the camera; a chip opens a bottom sheet. The last scans sit in a panel
  over the bottom of the camera. The camera starts when the screen opens.
- B, "Form": the Grocy purchase page with a camera in it. The defaults are
  form fields on the page. The camera is a box under the form and starts
  with a button. The scans are a table.
- C, "List": the scans are the page. The camera is a strip at the top that
  stays while the list scrolls. The defaults are one line and one dialog.
  Each row has plus and minus for the amount.

## The screenshots

The PNG files in this folder are from Playwright on a Pixel 7 viewport and
on a 1366 by 820 viewport, with a fake camera that shows one barcode. The
"known" files show a barcode that the Grocy of the test household holds.
