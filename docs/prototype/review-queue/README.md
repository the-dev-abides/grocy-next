# Prototype: review queue screen with the four booking types

This is throwaway code for the ticket "Review queue screen with the four
booking types" (#129). The branch `prototype/review-queue-four-booking-types`
is never merged. The maintainer chose variant A.

## How to run

1. Check out the branch. The dev server of the web app serves it.
2. Open `/review-queue?variant=A`. Without `?variant=`, the real review queue
   shows.
3. Use the black bar in the top bar:
   - The arrows change the variant. The left and right arrow keys do the same.
     The address has `?variant=A`, `B`, or `C`.
   - The circle arrow resets the demo data.
   - The braces button shows the rows, the plans, and the stock.

The data is a stand-in in memory. Nothing goes to the API. The rows stay when
the variant changes. An accept changes the stand-in stock, so the plans of the
other rows change too.

## The stand-in data

The queue has 13 rows of the four booking types. The rows show these cases:

- A Consume that takes the opened pack and then opens a new pack.
- A Consume of a whole sealed pack, with the spoiled flag on.
- A Consume of a product that cannot be opened.
- A Consume of more than the stock.
- A Consume of a stock entry Grocycode.
- A Transfer with a "to" location, and a Transfer with no "to" location.
- A failed Transfer of a tare weight product.
- A Purchase, an Inventory count, and two unknown codes.

The oldest row books first. Each row sees the stock after the older rows of
the same product.

## The variants

| Question | A: one table | B: a tab for each booking type | C: grouped by product |
| --- | --- | --- | --- |
| The layout | The milestone 2 table with a booking type column at the left | One table for each booking type, with its own columns | One box for each product, with all its rows |
| The booking type | An icon at the left of the row | The tab | An icon at the left of the row |
| The flip | A tap on the icon | A tap on the icon moves the row to the other tab | A tap on the icon |
| The filter by booking type | A select next to the location and the state | The tabs | Chips that turn a booking type on or off |
| The stock entries | One line for each entry under the name | A "Takes from" column or a "Moves" column | Each Grocy stock entry, with the rows that take from it |
| The spoiled flag | A trash can on the row | A check box column | A trash can on the row |
| The "to" location | "From → To" in the location column, and in the form | A select in the row | "From → To" on the row, and in the form |
| The bulk edit | Only the fields that a checked row has | The same form, one booking type at a time | The same form as A |
| The cards | A table or cards switch, as in milestone 2 | No cards | The boxes work on a phone |

All variants share:

- The row form has a stock entry select, as the Grocy consume form and
  transfer form have.
- The bulk edit tells how many of the checked rows each field changes, for
  example "To (1 of 2 rows)".
- A Transfer with no "to" location has the state "Needs a 'to' location", and
  its accept is off.
- A Consume of more than the stock shows a red warning. Its state stays
  "Ready", and the accept fails.
- The location filter shows a Transfer when its "from" location or its "to"
  location matches.

## Not tested

- A real phone. The screenshots come from a desktop browser at phone size.
- The dark mode.

## Screenshots

The files `desktop-<variant>.png` and `phone-<variant>.png` show each variant.
`desktop-A-after-accept.png` shows the result panel after an accept of all
rows. `desktop-A-bulk-edit.png` shows the bulk edit of one Consume row and one
Transfer row.
