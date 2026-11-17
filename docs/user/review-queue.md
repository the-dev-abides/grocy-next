# The review queue

The review queue is the list of pending scans that wait for your decision. A
pending scan is one scanned or typed code from a scan screen. Open the review
queue from the sidebar, or tap `Done` on a scan screen. The address `/` of
Grocy Next also opens the review queue.

The review queue shows the pending scans of every scan screen, with the most
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

## The booking type

Each row and each card starts with the icon of its booking type:

| Icon           | Booking type |
| -------------- | ------------ |
| Barcode        | Purchase     |
| Clipboard      | Inventory    |
| Fork and knife | Consume      |
| Two arrows     | Transfer     |

On a Consume row and a Transfer row, the icon is a button. Tap it to flip
the row between Consume and Transfer. Do this when you scanned with the
switch in the wrong position. The row keeps all its fields, so a flip two
times loses no data. The flip clears the Grocy message of the last failed
accept, as each change of a row does. On a Purchase row and an Inventory row,
a tap on the icon does nothing.

The location of a Transfer shows as "From → To", for example
`Fridge → Freezer`. A Transfer with no "to" location shows
`No "to" location` in place of the "to" location.

## The state of a pending scan

Each pending scan has one of five states. A badge on the row or the card
shows the state.

| State                   | Meaning                                                   |
| ----------------------- | --------------------------------------------------------- |
| `Needs a product`       | The code matched no product in Grocy.                     |
| `Needs a count`         | The Inventory pending scan has no count.                  |
| `Needs a 'to' location` | The Transfer pending scan has no "to" location.           |
| `Ready`                 | You can accept the pending scan.                          |
| `Accept failed`         | Grocy refused the last accept. The row shows the message. |

A row or a card with `Accept failed` has a different background colour.

## The filter

The filter is above the list. It has four fields:

- `Booking type`: Purchase, Inventory, Consume, or Transfer.
- `Location`: the location of the pending scan. A Transfer shows when its
  "from" location or its "to" location is the location of the filter.
- `Product group`: the product group of the pending scan. The scan screens
  copy it from the session defaults.
- `State`: one of the five states.

The filter changes the pending scans that the list shows. The line above
the list shows the number of pending scans, the number that the filter
shows, and the number that you checked.

## Accept and reject one pending scan

Each row and each card has these buttons:

- `Spoiled` (a trash can) shows only on a Consume. A tap turns the spoiled
  flag on or off. The trash can is red when the flag is on.
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

The form proposes the stock unit from the net quantity of the label, in g
or ml. When the household has a unit with a conversion to g, kg, ml, or l,
the form proposes that unit. For example, with the conversion 1 Bag = 500 g
and the net quantity 1 kg, the stock unit is Bag and the amount is 2. Else
the form proposes the household unit that is named g, kg, ml, or l.

When the form has no unit proposal, it shows the quantity text of the label.
Pick the units yourself.

Tap `Create and use`. Grocy Next makes the product in Grocy with the code,
and the pending scan gets the new product. When Grocy refuses the product,
the form stays open and shows the problem.

## The full form

Tap `Edit` to open the full form of one pending scan. Tap `Save` to keep the
changes. The fields depend on the booking type:

- Purchase: the amount, the unit, the location, the due date, the store, the
  price, and the price type.
- Inventory: the count, the location of added stock, and the due date of
  added stock.
- Consume: the booking type, `Spoiled`, the amount, the unit, and `From`, the
  "from" location.
- Transfer: the booking type, the amount, the unit, `From`, and `To`, the "to"
  location.

Every form also has the product group of a new product, when the pending scan
has no product, and the note.

The empty unit is the default unit of the booking type. The unit select names
it, for example `Consume unit (Can)`. It is the purchase unit on a Purchase,
the consume unit on a Consume, and the stock unit on a Transfer. A Consume
with no unit shows the amount in the consume unit of the product, as Grocy
does.

The booking type field changes a Consume to a Transfer, or a Transfer to a
Consume. The pending scan keeps all its fields.

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

A field shows only when it applies to a checked pending scan:

- `Booking type` applies to a Consume and a Transfer. It changes a Consume
  to a Transfer, or a Transfer to a Consume.
- `To` applies to a Transfer. `Spoiled` applies to a Consume. These two
  fields use the booking type that you set in `Booking type`.
- `Due date` applies to a Purchase and an Inventory.
- `Store`, `Price`, and `Price type` apply to a Purchase.
- `Amount`, the location, `Product group of a new product`, and `Note`
  apply to all pending scans. When you check only Consume and Transfer
  pending scans, the location field is `From`.

When a field applies to only some of the checked pending scans, its label
shows the number, for example `To (1 of 2 rows)`. The field changes only
those pending scans.

### Accept all and Reject all

`Accept all` and `Reject all` act on every pending scan that the filter
shows. They do not use the checkboxes. To act on a part of the list, set
the filter first.

Each button opens a confirm dialog with the number of pending scans.

- `Accept all` books every pending scan that has a product, for Inventory a
  count, and for a Transfer a "to" location. It skips the other pending
  scans. The dialog shows the
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

## The Consume accept

The accept of a Consume pending scan takes the amount out of stock at the
"from" location. Grocy picks the stock entries in its consume order.

- When the amount is more than the stock at the "from" location, the accept
  fails with the Grocy message. Grocy does not change.
- When the consume takes a part of a sealed stock entry, the accept also
  opens the rest of that stock entry. You do not open it in a second step.
  Grocy applies the "move on open" setting and the due date after the open.
- A product with the Grocy setting "cannot be opened" and a product with a
  tare weight get no open.
- When the open fails, the consume stays booked, and the accept succeeds.
- A Consume of a parent product can take the stock of its child products,
  as the Grocy consume form does.
- A product with a tare weight needs the gross weight, with the container.
- A spoiled Consume follows the same steps. Grocy stores the consume as
  spoiled.

The result panel shows the consume and the open.

## The Transfer accept

The accept of a Transfer pending scan moves the amount from the "from"
location to the "to" location. The amount is in the stock unit of the
product, unless the pending scan has a different unit.

- A Transfer with no "to" location has no `Accept` button. Tap `Edit`, set
  `To`, and tap `Save`.
- Grocy picks the stock entries at the "from" location in its consume order.
  Grocy applies its freezer rules to the due dates.
- Grocy cannot transfer a product with a tare weight. The accept fails with
  the Grocy message.

The result panel shows one `transfer_from` booking and one `transfer_to`
booking for each stock entry that Grocy moved.

## The attribution

The review queue shows the line `Contains data from Open Food Facts,
available under the Open Database License.` The product data from the
online barcode service is under that license.
