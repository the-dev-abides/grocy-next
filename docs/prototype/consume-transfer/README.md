# Prototype: Consume and Transfer scan screen

This is throwaway code for the ticket "Consume and Transfer scan screen"
(#128). The branch `prototype/consume-transfer-scan-screen` is never merged.

## How to run

1. Check out the branch. The dev server of the web app serves it.
2. Open `/scan/consume-transfer`. The top bar and the sidebar have a button
   for it.
3. Use the black bar in the top bar:
   - The arrows change the variant. The left and right arrow keys do the same.
     The address has `?variant=A`, `B`, or `C`.
   - The dice button makes a demo scan of the next stand-in product.
   - The question mark button makes a demo scan of an unknown code.
   - The braces button shows the state of the session.

The camera is the real one. A real barcode maps to one of eight stand-in
products. About one code in nine is an unknown code. The session is in
memory. Nothing goes to the API. The rows stay when the variant changes.

## The variants

| Question | A: switch under the camera | B: mode on the camera | C: switch at the thumb |
| --- | --- | --- | --- |
| Where the mode shows | A strip under the camera and the switch | A plate on the camera and a thick camera frame | The page title band |
| The switch | Two halves under the camera | One button "Transfer the next scan" | Two large buttons at the bottom |
| The switch after a scan | It stays | It goes back to Consume after each Transfer scan | It goes back to Consume after 20 seconds with no scan |
| The feedback | Green banner, the booking type in the detail line, one sound | The plate shows the result in the colour of the booking type. A Transfer has its own sound and vibration. | A banner in the colour of the booking type, the new row flashes. A Transfer has its own sound and vibration. |
| The defaults | A section that opens, as on the Purchase scan screen | "From" and "To" are always on the screen | A sheet behind a button in the title band |
| The "to" location | Under the switch, only on Transfer | Always on the screen | In the title band text, set in the sheet |
| The flip on the row | A tap on the chip with the booking type | An icon button on the right | A tap opens the row. The open row has a switch. |
| The open on consume | Words on the row | A badge with an icon | Words in the detail line |
| The spoiled flag | A "Spoiled" chip on the row | A button for the next scan, and a badge on the row | A check box in the open row |
| The row locations | Not on the scan screen | Not on the scan screen | "From" and "To" in the open row |
| The page title | Consume and Transfer | None | The mode: "Consume" or "Transfer to Freezer" |
| The top bar button | Consume and Transfer | Consume | Use or move |

In each variant, a Transfer row with no "to" location shows its locations
in red.

## Not tested

- A real phone. The screenshots come from a desktop browser at phone size
  with a fake camera.
- The sound and the vibration.

## Screenshots

The files `phone-<variant>-<step>.png` and `desktop-<variant>-3-after-scans.png`
are in this directory.
