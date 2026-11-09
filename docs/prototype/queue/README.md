# Review queue screen prototype

Throwaway. This branch is never merged. It answers the ticket "Review queue
screen", GitHub issue #74. It is built on top of the Inventory scan screen
prototype branch and reuses its app shell and theme.

## Run it

1. Check out the branch `prototype/review-queue-screen`.
2. Run `pnpm install`.
3. Run `pnpm exec nx run web:dev`.
4. Open `http://localhost:4200/?proto=queue&variant=a`.

The bar at the bottom of the page switches the variant and the dark mode.
The left and right arrow keys switch the variant too. The URL holds the
state: `?proto=queue&variant=a|b|c` and `&dark=1`.

The phone test needs no camera. Open the same URL from the phone with the
LAN address of the computer and `PROTO_PHONE=http pnpm exec nx run web:dev`.

## What the stand-in does

The prototype has no Next API behind it. The queue is a seed of 16 pending
scans in memory: six from an Inventory session of yesterday evening with no
count yet, one from the assistant that read a receipt, and nine from a
Purchase session of this morning. The seed covers every state: a product,
a lookup result, a lookup that still runs, a bare code with no result, a
write-in name, a failed accept, a parent product, a tare weight product, and
a product with stock at two locations. The rows vanish on reload.

The stand-in follows ADR 0010 and the Grocy API research at accept:

- A row with no product is refused. An Inventory row with no count is
  refused.
- A Purchase amount in a unit with no conversion to the stock unit fails
  with the Grocy message. The row stays with the error. An edit clears it.
- An Inventory count equal to the stock removes the row with "no change"
  and calls no Grocy. A lower count consumes in the Grocy order: open stock
  entries first, then the earliest due date first. A tare weight product
  takes the gross weight.
- Bulk accept is one call per row with one result per row. A bulk reject
  deletes the rows with no history.
- The lookup worker answers one row six seconds after the page opens, so
  the screen shows a row change after the create call.
- The product pick adds the code to the product. The short product form
  creates the product and sets it on the row, with the proposals of ADR
  0011 from the lookup result.

## The variants

- A, "Table": the Grocy pattern. One table with a checkbox per row, the
  bulk actions above it, the row actions at the right end. Inline edit in
  the cells from 768px: the amount on click, the location, the due date,
  the price, and the store. On a phone the table keeps the product, the
  amount, and the accept, and a tap on the name opens the full form.
- B, "Cards": one card per pending scan with every fact on it, plus and
  minus for the amount, the defaults as controls on the card, a big Accept
  and Reject, and a swipe to the left to reject. A "Select" switch turns on
  the checkboxes and a bar at the bottom with Edit, Reject, and Accept. One
  column on a phone, two from 1024px, three from 1536px.
- C, "Board": the rows split by what they need before the accept: a
  product, a count, a second try after a Grocy error, or nothing. Each
  section has its one control on the row. The one big button is "Accept
  all ready". From 1024px the sections are four columns; below that they
  stack. A tap on the name opens the full form.

All three share the dialogs: the full form of one row, the bulk edit with
every field empty where only a set field changes, the product pick with a
search, the short product form, and a confirm for an action on many rows.

## The screenshots

The PNG files in this folder are from Playwright on a Pixel 7 viewport, on
a 1100 by 820 viewport (`lg`), and on a 1366 by 820 viewport. The name says
the variant, the viewport, and the view.
