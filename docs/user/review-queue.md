# The review queue

The review queue is the list of pending scans that wait for your decision. A
pending scan is one scanned or typed code from a scan screen. Open the review
queue from the sidebar, or tap `Done` on a scan screen. The address `/` of
Grocy Next also opens the review queue.

The review queue shows the pending scans of both scan screens, with the most
recent scan at the top. It gets the new pending scans every three seconds.

When you accept a pending scan, Grocy Next makes the booking in Grocy and
removes the pending scan from the list. When you reject a pending scan,
Grocy Next deletes it. Grocy does not change. The review queue keeps no
history.

## The two views

The review queue has two views: `Table` and `Cards`. The buttons at the top
right change the view.

- `Table` shows one pending scan on each row. A wider screen shows more
  columns.
- `Cards` shows one pending scan on each card, with big buttons for a touch
  screen.

On a screen that is 1024 pixels wide or more, the review queue opens in the
table view. On a smaller screen, it opens in the cards view. When you change
the view, the browser keeps your choice for the next visit.

## The state of a pending scan

Each pending scan has one of four states. A badge on the row or the card
shows the state.

| State             | Meaning                                                   |
| ----------------- | --------------------------------------------------------- |
| `Needs a product` | The code matched no product in Grocy.                     |
| `Needs a count`   | The Inventory pending scan has no count.                  |
| `Ready`           | You can accept the pending scan.                          |
| `Accept failed`   | Grocy refused the last accept. The row shows the message. |

A row or a card with `Accept failed` has a different background colour.

## The filter

The filter is above the list. It has three fields:

- `Location`: the location of the pending scan.
- `Product group`: the product group of the pending scan. The scan screens
  copy it from the session defaults.
- `State`: one of the four states.

The filter changes the pending scans that the list shows. The line above
the list shows the number of pending scans, the number that the filter
shows, and the number that you checked.

## Accept and reject one pending scan

Each row and each card has these buttons:

- `Edit` (the pencil icon) opens the full form of the pending scan.
- `Reject` (the trash icon) deletes the pending scan.
- `Accept` (the check icon) makes the booking. This button shows only on a
  pending scan that is `Ready`.
- `Accept again` shows on a pending scan with `Accept failed`. Read the
  Grocy message on the row, correct the pending scan, then tap the button.

A card that needs a count has the closed button `Set the count`. Type the
count first.

On a card, you can also swipe the card to the left to reject it. A swipe
past one third of the card width rejects it.

The result panel shows above the list after an accept. It shows one line
for each pending scan with the booking that Grocy stored, or the problem.
Tap `Close` to remove the panel.

## Pick product

A pending scan with `Needs a product` has the buttons `Pick product` and
`New product`.

Tap `Pick product` when the product is already in Grocy.

1. Type a part of the product name into the search field.
2. Tap the product.

Grocy Next adds the code to the product in Grocy. The next scan of the code
finds the product. When the online barcode service had a picture and the
product has no picture, Grocy Next copies the picture to the product.

To change a wrong product, tap `Edit`, then tap `Change the product`.

## New product

Tap `New product` when the product is not in Grocy. The short product form
opens. When an online barcode service knew the code, the form starts with
its data. When you typed a name on the Inventory screen, the form starts
with that name. You can change every field.

The fields are:

- `Name` and `Description`.
- `Stock unit` and `Purchase unit`. When the two units are different, a
  field asks how many stock units one purchase unit holds.
- `Default location`, `Product group`, and `Default due days`.

When the form has no unit proposal, it shows the quantity text of the label.
Pick the units yourself.

Tap `Create and use`. Grocy Next makes the product in Grocy with the code,
and the pending scan gets the new product. When Grocy refuses the product,
the form stays open and shows the problem.

## The full form

Tap `Edit` to open the full form of one pending scan. The form has every
field: the amount or the count, the unit, the location, the due date, the
store, the price and the price type, the product group of a new product,
and the note. Tap `Save` to keep the changes.

## The bulk actions

The buttons above the list act on many pending scans at once.

### Bulk edit

`Bulk edit` acts on the pending scans that you checked. Check a row or a
card with its checkbox. The checkbox at the top checks every pending scan
that the filter shows. The checkboxes control only the bulk edit.

1. Check the pending scans.
2. Tap `Bulk edit`.
3. Set the fields that you want to change. Every field starts at
   `Keep as is`. A field that you do not set does not change.
4. Tap `Apply`.

### Accept all and Reject all

`Accept all` and `Reject all` act on every pending scan that the filter
shows. They do not use the checkboxes. To act on a part of the list, set
the filter first.

Each button opens a confirm dialog with the number of pending scans.

- `Accept all` books every pending scan that has a product and, for
  Inventory, a count. It skips the other pending scans. The dialog shows the
  number that it books and the number that it skips.
- `Reject all` deletes every pending scan that the filter shows.

The result panel shows one line for each pending scan. It also shows the
number of booked, failed, and skipped pending scans.

## The Inventory count

An Inventory pending scan needs a count before the accept. The count is the
amount that you have, in the stock unit of the product. The accept sets the
Grocy stock to the count.

Type the count:

- In the cards view, use the count field of the card, or the minus button
  and the plus button. When the field is empty, the plus button and the
  minus button start from the Grocy stock.
- In the table view on a screen that is 768 pixels wide or more, use the
  count field in the `Amount` column. Click the count to change it again.
- In the full form, use the field `Count in` the stock unit.

The empty count field shows the Grocy stock as grey text. Press Enter or
leave the field to keep the count. Press Escape to stop with no change.

After you type the count, the pending scan shows what the accept will do:

- The Grocy stock, for example `In Grocy: 5 Piece in 2 stock entries`.
- The difference between the count and the Grocy stock. A green value is an
  increase. A red value is a decrease. `no change` means that the count is
  equal to the stock.
- For an increase, the stock entry that the accept adds, with its location
  and its due date.
- For a decrease, the stock entries that the accept takes from, in the
  order that Grocy uses.

When the count is equal to the Grocy stock, the accept books nothing in
Grocy. The result panel shows `No change. Grocy was not called.`

Two types of product have a note on the stock line:

- A parent product counts only its own stock, not the stock of its child
  products.
- A product with a tare weight needs the gross weight, with the container.
  A count below the tare weight shows a red warning, and Grocy refuses the
  accept.

## The attribution

The review queue shows the line `Contains data from Open Food Facts,
available under the Open Database License.` The product data from the
online barcode service is under that license.
