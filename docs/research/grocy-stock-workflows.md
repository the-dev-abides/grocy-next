# Grocy v4.7.1 stock workflows and the barcode flow

This file answers GitHub issue #34. It describes how a user does each stock
action in Grocy v4.7.1, step by step. It describes the barcode flow in full.
It maps the "Inventory and product management" requirements in
`docs/requirements/human.md` to the workflow steps that they change.

The survey in `docs/research/grocy-survey.md` (branch
`research/grocy-survey`) lists the pages, the API operations, and the entity
types. This file does not repeat that list. This file describes behaviour.

This file contains no Grocy source code. It describes only.

## Sources

All paths are in the Grocy repo at tag `v4.7.1`:
<https://github.com/grocy/grocy/tree/v4.7.1>.

| Source | Path | What it gives |
| --- | --- | --- |
| Stock forms | `views/purchase.blade.php`, `views/consume.blade.php`, `views/transfer.blade.php`, `views/inventory.blade.php`, `views/stockentryform.blade.php` | The fields of each form and the feature flags that hide them. |
| Shopping list | `views/shoppinglist.blade.php`, `views/shoppinglistitemform.blade.php` | The list page, its actions, and the item form. |
| List pages | `views/stockoverview.blade.php`, `views/stockentries.blade.php` | The row buttons that start a stock action. |
| Shared parts | `views/components/productpicker.blade.php`, `productamountpicker.blade.php`, `productcard.blade.php`, `camerabarcodescanner.blade.php`, `datetimepicker.blade.php` | The product picker, the amount picker, the product card, the camera button, the date field. |
| Browser code | `public/viewjs/purchase.js`, `consume.js`, `transfer.js`, `inventory.js`, `stockentryform.js`, `shoppinglist.js`, `shoppinglistitemform.js`, `stockoverview.js`, `stockentries.js`, `productform.js` | What happens on product change, on save, and after save. |
| Picker code | `public/viewjs/components/productpicker.js`, `camerabarcodescanner.js`, `productamountpicker.js` | How a barcode becomes a product. How the camera feeds the picker. |
| Global code | `public/js/grocy.js`, `public/js/grocy_uisound.js` | Dialogs in iframes, the Enter key, the sounds. |
| Controllers | `controllers/StockController.php`, `controllers/Api/StockApiController.php` | Which products each form lists. The by-barcode API operations. |
| Service | `services/StockService.php` | The server rules: tare weight, due date defaults, consume order, undo, barcode lookup plugin. |
| Grocycode | `helpers/Grocycode.php`, `controllers/GrocycodeTrait.php`, `views/stockentrylabel.blade.php` | The Grocycode format and the label. |
| Plugins | `helpers/BaseBarcodeLookupPlugin.php`, `plugins/OpenFoodFactsBarcodeLookupPlugin.php`, `plugins/DemoBarcodeLookupPlugin.php` | The external barcode lookup contract. |
| Config | `config-dist.php` | The settings, the feature flags, and the default user settings. |
| Database views | `migrations/0103.sql`, `0123.sql`, `0178.sql`, `0187.sql` | The `product_barcodes` table, the consume order, the stock entry compaction rule. |

## Terms

This file uses the terms in `GLOSSARY.md`: product, stock entry, due date,
booking, transaction, quantity unit, conversion, parent product.

Two Grocy terms are not in the glossary yet:

- **Product barcode**: one row in the `product_barcodes` table. It links a
  barcode string to one product. It can hold defaults: a quantity unit, an
  amount, a store, a last price, and a note. A product can have many
  product barcodes.
- **Shopping list item**: one row on a shopping list. It has a product or a
  note, an amount, a quantity unit, and a done flag. It is not a product.

## How to read the counts

Each workflow below gives two counts: for one product, and for ten products
in a row. The counts use these units:

- **Click**: one mouse click or one tap. A press of Enter or Tab that moves
  the form on counts as one click.
- **Field entry**: the user types a value into one field, or picks one value
  from one dropdown.
- **Scan**: one barcode read by a scanner or a camera. A scan is not a click
  and not a field entry.

The counts assume the best case: the product exists, its master data has all
defaults set (default location, default due days, a last price), and the
feature flags have their default values. The counts include the one click on
the sidebar menu to open the page. They do not include the search for a row
in a table.

## Parts that all stock forms share

### The page layout

Each stock form is one page under the sidebar menu: Purchase, Consume,
Transfer, Inventory. The form is in the left column. The product card is in
the right column. The product card shows the stock amount, the location, the
last purchase, the last price, and the price history of the selected
product. It has buttons to the stock entries, the stock journal, the
shopping list, and the product edit form.

The same page can open inside a dialog. The list pages (stock overview, stock
entries, shopping list) open the form in an iframe dialog with the URL
parameter `embedded` and a prefilled product. In that mode the product card
and the "Scan mode" button are hidden, and the dialog closes after save.

### The product picker

The product picker is a text field with a dropdown (a combobox). The server
renders every product as an option. Each option carries the product's
barcodes as hidden search data. The user types part of a name, a full name,
or a barcode. The dropdown filters as the user types. Enter behaves like Tab:
when the dropdown is closed, Enter leaves the field and starts the match.
When the field loses focus, the picker runs the barcode flow described in
"The barcode flow" below.

The product list differs per page:

| Page | Products in the picker |
| --- | --- |
| Purchase | Active products that can hold own stock (`no_own_stock = 0`). |
| Consume | Active products with stock now (own stock or sub-product stock). |
| Transfer | Active products with own stock now. |
| Inventory | Active products that can hold own stock. |
| Shopping list item | All active products. |

A camera button sits at the right end of the picker. See "The camera
scanner" below.

When a product is selected, the form loads the product details from
`GET /stock/products/{productId}`, refreshes the product card, fills the
amount picker, applies the product defaults, and moves the focus to the
amount field.

### The amount picker

The amount picker is a number field and a quantity unit dropdown. The
dropdown lists the stock unit of the product and every unit that has a
conversion to it. When only one unit exists, the dropdown is locked. The
form converts the entered amount to the stock unit before it sends it to the
API. A hint under the field shows the converted amount ("This equals 500
Gram").

### The due date field

The due date field is a text field with a calendar button. The user can type
the date. On mobile browsers the field shows the number pad when
`FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_FIELD_NUMBER_PAD` is on. A checkbox
"Never overdue" below the field sets the date to 2999-12-31. When the typed
date is before today, an info line asks "are you sure?".

### Save, undo, and reset

The user saves with the OK button or with Enter in any field. Before save,
the form validates every required field. After a successful save:

1. A green toast shows the result ("Added 2 pieces of Milk to stock") with an
   Undo button. Undo calls `POST /stock/transactions/{transactionId}/undo`
   and undoes every booking of that transaction.
2. The form resets to its defaults. The focus returns to the product field.
   The user can start the next product at once.
3. In embedded mode the page does not reset. It posts a message to the
   parent page and the dialog closes.

### Userfields

When the household has defined userfields for the entity `stock`, the
purchase form, the inventory form, and the stock entry form show them below
the standard fields. The form saves them in a second request after the
stock action.

## Workflow: purchase

Page: `/purchase`. API: `POST /stock/products/{productId}/add`.

### Fields, in form order

| Field | Required | Default | Hidden when |
| --- | --- | --- | --- |
| Product | yes | empty, focus here | never |
| Amount | yes, more than 0 | user setting "Default amount for purchase" (default 0, so the user must type) or the product barcode amount | never |
| Quantity unit | yes | the product's purchase unit, or the barcode unit; locked to the stock unit for tare weight products | never |
| Purchased date | yes when shown | today | user setting "Show purchased date on purchase" is off (default off) |
| Due date | yes | today plus the product's default due days; "Never overdue" when the default is -1; the freezer rule when the location is a freezer | `FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_TRACKING` off |
| Price | no | the product's last price, divided by the unit factor; or the barcode's last price as total price | `FEATURE_FLAG_STOCK_PRICE_TRACKING` off |
| Price type: Unit price or Total price | one radio | Unit price, or the product's default price type | price tracking off |
| Store | no | the last store, else the default store, or the barcode store | price tracking off |
| Location | no | the product's default location | `FEATURE_FLAG_STOCK_LOCATION_TRACKING` off |
| Stock entry label: No label, Single label, Label per unit | no | the product's default label type | `FEATURE_FLAG_LABEL_PRINTER` off (default off) |
| Note | no | empty, or the barcode note | never |
| Userfields for `stock` | per field | empty | no userfields defined |
| Scan mode button | toggle | user setting | embedded mode |

### Steps

1. Click Purchase in the sidebar. The focus is in the product field.
2. Type a name or scan a barcode. Press Enter or pick from the dropdown. The
   form loads the product and fills the defaults. The focus moves to the
   amount field. The amount text is selected, so typing replaces it.
3. Type the amount. Change the unit when needed.
4. Check or change the due date, the price, the store, and the location.
5. Press Enter or click OK.

### After save

The server creates one stock entry and one booking of type purchase. With
"Label per unit" it creates one stock entry per unit, each with its own
Grocycode. When no due date is given, the server computes it from the
product's default due days (or the freezer rule). The server then merges
equal stock entries of the product: same due date, purchase date, price,
open state, location, store, and note. Stock entries from "Label per unit"
and stock entries with userfield values are never merged.

The form posts the price back to the product barcode row when a barcode was
used, so the barcode remembers its last price. When the user setting "Show a
warning when the due date is earlier than the next due date in stock" is on
(default on), a yellow toast warns about an earlier due date. With a label
printer configured, the form or the server sends the label webhook.

### Counts

| Case | Clicks | Field entries | Scans |
| --- | --- | --- | --- |
| One product, typed | 3 (menu, Enter after the product, OK) | 2 (product, amount) | 0 |
| One product, hardware scanner, barcode has an amount default | 2 (menu, OK) | 0 | 1 |
| One product, scan mode on, barcode has defaults | 2 (menu, scan mode button) | 0 | 1 |
| Ten products, typed | 21 | 20 | 0 |
| Ten products, hardware scanner, barcode defaults set | 11 | 0 | 10 |
| Ten products, scan mode on, barcode defaults set | 2 | 0 | 10 |
| Ten products, phone camera, scan mode on | 12 (menu, scan mode, 10 camera buttons) | 0 | 10 |

When the barcode has no amount default, scan mode sets the amount to 1 and
submits. The camera dialog closes after each scan, so each product costs one
extra click on the camera button.

## Workflow: consume

Page: `/consume`. API: `POST /stock/products/{productId}/consume`.

### Fields, in form order

| Field | Required | Default | Hidden when |
| --- | --- | --- | --- |
| Product | yes | empty, focus here | never |
| Consume exact amount | checkbox | off | the product has no tare weight handling |
| Amount | yes, more than 0, not more than the stock at the location | user setting "Default amount for consume" (default 1), or the product's quick consume amount when the setting says so, or the barcode amount | never |
| Quantity unit | yes | the product's consume unit, or the barcode unit | never |
| Location | yes | the product's default consume location, else the default location, else the first location with stock; the dropdown lists only locations where the product has stock | `FEATURE_FLAG_STOCK_LOCATION_TRACKING` off (the field is hidden, not removed) |
| Spoiled | checkbox | off | never |
| Use a specific stock item | checkbox and dropdown | off; the dropdown lists the stock entries at the chosen location with amount, due date, purchase date, open state, and note | never |
| Recipe | no | empty; "for statistical purposes only" | `FEATURE_FLAG_RECIPES` off |
| OK button | | | never |
| Mark as opened button | | disabled when all stock is open, when the product has tare weight handling, or when the product has "disable open" | `FEATURE_FLAG_STOCK_PRODUCT_OPENED_TRACKING` off |
| Scan mode button | toggle | user setting | embedded mode |

### Steps

1. Click Consume in the sidebar. The focus is in the product field.
2. Type a name or scan a barcode. Press Enter. The form loads the product,
   fills the amount and the location. The focus moves to the amount field.
3. Change the amount when needed. Tick Spoiled when the product is spoiled.
   Tick "Use a specific stock item" and pick one when needed.
4. Press Enter or click OK.

### After save

The server picks the stock entries in this order: the default consume
location first, then opened first, then first due first, then first in first
out. It takes whole stock entries until the amount is used, and splits the
last one. Each stock entry taken is one booking of type consume; all share
one transaction. The form always sends "allow sub-product substitution", so
a consume of a parent product uses sub-product stock. When the user setting
"auto add below min stock amount" is on, the server adds products that fell
below their minimum to the shopping list.

### Counts

| Case | Clicks | Field entries | Scans |
| --- | --- | --- | --- |
| One product, typed | 3 (menu, Enter, OK) | 1 (product) | 0 |
| One product, hardware scanner | 2 (menu, OK) | 0 | 1 |
| One product, scan mode on | 2 (menu, scan mode) | 0 | 1 |
| One product, quick consume button on the stock overview | 2 (menu, row button) | 0 | 0 |
| Ten products, typed | 21 | 10 | 0 |
| Ten products, hardware scanner | 11 | 0 | 10 |
| Ten products, scan mode on | 2 | 0 | 10 |

The stock overview row has three one-click buttons: consume the quick
consume amount, consume all, and open the quick open amount. These use the
product's quick amounts and need no form.

## Workflow: open

Grocy has no separate open page. Open is a second button on the consume
form, and a one-click button on the stock overview and the stock entries
pages. API: `POST /stock/products/{productId}/open`.

### Fields

The open button on the consume form uses the product, the amount, the unit,
and the "specific stock item" fields of the consume form. It ignores
Location, Spoiled, and Recipe.

### Steps

1. Click Consume in the sidebar.
2. Type a name or scan a barcode. Press Enter.
3. Change the amount when needed.
4. Click "Mark as opened". Enter does not work here; Enter triggers consume.

### After save

The server marks sealed stock entries as open in the consume order, and
splits the last one when the amount is smaller than the stock entry. It sets
the opened date to today. When the product has "default due days after
open", it moves the due date forward, but never past the original due date.
When the product has "move on open" and a default consume location, the
server also transfers the opened stock entry to that location, in the same
transaction. Each opened stock entry is one booking of type product opened.

### Counts

| Case | Clicks | Field entries | Scans |
| --- | --- | --- | --- |
| One product, consume form, typed | 3 (menu, Enter, Mark as opened) | 1 | 0 |
| One product, stock overview row button | 2 (menu, row button) | 0 | 0 |
| Ten products, consume form, typed | 21 | 10 | 0 |
| Ten products, stock overview | 11 | 0 | 0 |

Scan mode does not open. Scan mode always consumes.

## Workflow: transfer

Page: `/transfer`. API: `POST /stock/products/{productId}/transfer`.

### Fields, in form order

| Field | Required | Default | Hidden when |
| --- | --- | --- | --- |
| Product | yes | empty, focus here | never |
| From location | yes | the product's default location when it has stock there, else the first location with stock; the dropdown lists only locations with stock | never |
| Amount | yes, not more than the stock at the from location | empty (the code reads a user setting `stock_default_transfer_amount` that `config-dist.php` does not define) | never |
| Quantity unit | yes | the stock unit | never |
| To location | yes | empty; the from location is hidden in this list | never |
| Use a specific stock item | checkbox and dropdown | off | never |

Transfer has no scan mode button and no feature flag of its own. The sidebar
shows the Transfer menu item only when `FEATURE_FLAG_STOCK_LOCATION_TRACKING`
is on. The page itself does not check the flag.

### Steps

1. Click Transfer in the sidebar.
2. Type a name or scan a barcode. Press Enter. The form fills the from
   location. The focus moves to the amount field.
3. Type the amount.
4. Pick the to location.
5. Press Enter or click OK.

### After save

The server creates two bookings in one transaction: transfer from and
transfer to. The stock entry keeps its due date, price, and open state. When
the to location is a freezer and the from location is not, the form shows
"Frozen" and warns when the product "should not be frozen". The reverse
shows "Thawed". The freezer due date rules apply on the next purchase, not
on the transfer.

A product with tare weight handling cannot be transferred. The picker shows
"Products with tare weight enabled are currently not supported for transfer"
and clears itself. The server also refuses.

### Counts

| Case | Clicks | Field entries | Scans |
| --- | --- | --- | --- |
| One product, typed | 3 (menu, Enter, OK) | 3 (product, amount, to location) | 0 |
| One product, hardware scanner | 2 (menu, OK) | 2 (amount, to location) | 1 |
| Ten products, typed | 21 | 30 | 0 |
| Ten products, hardware scanner | 11 | 20 | 10 |

## Workflow: inventory

Page: `/inventory`. API: `POST /stock/products/{productId}/inventory`.
"Inventory" in Grocy means: set the stock amount of one product to a counted
value.

### Fields, in form order

| Field | Required | Default | Hidden when |
| --- | --- | --- | --- |
| Product | yes | empty, focus here | never |
| New stock amount | yes, 0 or more, not equal to the current amount | the current stock amount, text selected | never |
| Quantity unit | yes | the stock unit | never |
| Purchased date | yes when shown; applies to added stock only | today | user setting "Show purchased date on purchase" off |
| Due date | yes when the amount goes up; applies to added stock only | from the product's default due days | `FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_TRACKING` off |
| Price | no; applies to added stock only | the product's last price | `FEATURE_FLAG_STOCK_PRICE_TRACKING` off |
| Store | no; applies to added stock only | the last store | price tracking off |
| Location | yes when the amount goes up; applies to added stock only | the product's default location | `FEATURE_FLAG_STOCK_LOCATION_TRACKING` off |
| Stock entry label | no | the product's default | `FEATURE_FLAG_LABEL_PRINTER` off |
| Note | no; applies to added stock only | empty, or the barcode note | never |
| Userfields for `stock` | per field | empty | no userfields defined |

An info line under the amount says what will happen: "This means 3 pieces
will be added to stock" or "will be removed from stock".

### Steps

1. Click Inventory in the sidebar.
2. Type a name or scan a barcode. Press Enter. The amount field shows the
   current stock amount, selected.
3. Type the counted amount.
4. When the amount goes up, check the due date and the location.
5. Press Enter or click OK.

### After save

When the new amount is higher, the server runs a purchase with the
difference, with transaction type inventory correction. When it is lower,
the server runs a consume with the difference, with the same transaction
type and the normal consume order. The server refuses an amount equal to the
current amount. Inventory has no scan mode, and no location filter: it
always acts on the total stock of the product across all locations.

### Counts

| Case | Clicks | Field entries | Scans |
| --- | --- | --- | --- |
| One product, typed | 3 (menu, Enter, OK) | 2 (product, amount) | 0 |
| One product, hardware scanner | 2 (menu, OK) | 1 (amount) | 1 |
| Ten products, typed | 21 | 20 | 0 |
| Ten products, hardware scanner | 11 | 10 | 10 |

## Workflow: edit a stock entry

Page: `/stockentry/{entryId}`, always opened as a dialog from the stock
entries page (`/stockentries`) or from the product card. API:
`PUT /stock/entry/{entryId}`.

### Fields, in form order

| Field | Required | Default | Hidden when |
| --- | --- | --- | --- |
| Amount (in the stock unit) | yes | the current amount, focus here | never |
| Purchased date | yes | the current value | never |
| Due date | yes | the current value | `FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_TRACKING` off |
| Price (per stock unit) | no | the current value | `FEATURE_FLAG_STOCK_PRICE_TRACKING` off |
| Store | no | the current value | price tracking off |
| Location | yes | the current value | `FEATURE_FLAG_STOCK_LOCATION_TRACKING` off |
| Note | no | the current value | never |
| Opened | checkbox | the current open state | `FEATURE_FLAG_STOCK_PRODUCT_OPENED_TRACKING` off |
| Userfields for `stock` | per field | current values | no userfields defined |
| Reprint stock entry label | checkbox | off; ticks itself when the due date changes | `FEATURE_FLAG_LABEL_PRINTER` off |

There is no product field. A stock entry belongs to one product.

### Steps

1. Click "Stock entries" on the stock overview page, or Stock overview, then
   the row menu, then "Stock entries" for one product.
2. Find the row. Click the edit (pencil) button. The dialog opens with the
   focus in the amount field.
3. Change the fields.
4. Press Enter or click OK.

### After save

The server writes two bookings in one transaction: stock edit old and stock
edit new. Undo restores the old values. When the open checkbox goes from off
to on, the opened date is today. The server then merges equal stock entries
of the product. The dialog closes, the row refreshes, and a toast with Undo
appears.

The stock entries page also has one-click row buttons: consume this whole
stock entry, and open this stock entry.

### Counts

| Case | Clicks | Field entries | Scans |
| --- | --- | --- | --- |
| One stock entry, one field changed | 3 (menu, edit button, OK) | 1 | 0 |
| Ten stock entries, one field each | 21 | 10 | 0 |

A scanned stock entry Grocycode does not open the edit form. It selects the
stock entry on the consume and transfer forms. See "Grocycode" below.

## Workflow: shopping list

Page: `/shoppinglist`. The list is a table. Items of a product are grouped
by product group. Each row has four buttons: mark done, edit, delete, and
"Add this item to stock".

### Add one shopping list item

Dialog: `/shoppinglistitem/new`. API: `POST /objects/shopping_list`.

| Field | Required | Default | Hidden when |
| --- | --- | --- | --- |
| Shopping list | yes | the current list | `FEATURE_FLAG_SHOPPINGLIST_MULTIPLE_LISTS` off |
| Product | product or note | empty, focus here | never |
| Amount | no | 1 after the product is picked | never |
| Quantity unit | no | the product's purchase unit | never |
| Note | product or note | empty | never |
| Userfields for `shopping_list` | per field | empty | no userfields defined |

Steps:

1. Click Shopping list in the sidebar.
2. Click "Add item". The dialog opens with the focus in the product field.
3. Type a name or scan a barcode. Press Enter. The focus moves to the
   amount field.
4. Change the amount when needed.
5. Press Enter or click Save.

After save: the dialog closes and the whole shopping list page reloads with
the new row. There is no "add and next" mode. When the product is already on
the list, a second row is created. The product card and the stock overview
use a different route (`?updateexistingproduct`) that calls
`POST /stock/shoppinglist/add-product`; that route adds the amount to the
existing row.

Counts:

| Case | Clicks | Field entries | Scans |
| --- | --- | --- | --- |
| One item, typed | 4 (menu, Add item, Enter, Save) | 1 | 0 |
| One item, scanned | 3 (menu, Add item, Save) | 0 | 1 |
| Ten items, typed | 31 | 10 | 0 |
| Ten items, scanned | 21 | 0 | 10 |

### Mark done, delete, clear

- Mark done: one click on the check button. The row turns grey and struck
  through. It stays on the list. API: `PUT /objects/shopping_list/{id}`
  with `done`.
- Delete: one click on the trash button. No confirmation.
- Clear list and Clear done items: two clicks (button, confirm) for the
  whole list. API: `POST /stock/shoppinglist/clear`.

### Fill the list from stock

The "Stock actions" dropdown has: "Add products that are below defined min.
stock amount" (hidden when the auto-add user setting is on), and "Add
overdue/expired products". Each is two clicks (dropdown, item). The page
reloads after each.

### Shopping list item to stock

The box button on a row, or "Stock actions" then "Add all list items to
stock", opens the purchase form in a dialog with `flow=shoppinglistitemtostock`.
The product, the amount, and the quantity unit come from the shopping list
item. The due date, the price, the store, and the location come from the
product defaults as on a normal purchase.

1. Click the box button on one row (or "Stock actions", "Add all list items
   to stock" for the whole list).
2. Check the fields. Press Enter or click OK.
3. The purchase is saved. The shopping list item is deleted. With "Add all",
   the dialog shows "Adding shopping list item 2 of 10" and loads the next
   one. A Skip button skips one item.

When the user setting "shopping list to stock workflow auto submit when
prefilled" is on and all required fields are filled (the product needs
default due days), the purchase submits itself without a click.

Counts:

| Case | Clicks | Field entries |
| --- | --- | --- |
| One item | 3 (menu, box button, OK) | 0 |
| Ten items one by one | 21 | 0 |
| Ten items with "Add all" | 13 (menu, dropdown, menu item, 10 OK) | 0 |
| Ten items with "Add all" and auto submit on | 3 | 0 |

Items without a product (note only) have no box button.

## The barcode flow

### Where a barcode can enter

A barcode string can enter Grocy in four places:

1. The product picker on the purchase, consume, transfer, inventory, and
   shopping list item forms.
2. The barcode field on the product barcode form (adds a product barcode to
   a product).
3. The recipe picker, the chore tracking page, and the battery tracking page
   (Grocycodes of type recipe, chore, battery).
4. The API: the six `by-barcode` operations and the external lookup
   operation.

### How the product picker resolves a scanned barcode

The picker runs this sequence each time the text field loses focus or the
user presses Enter with the dropdown closed:

1. If the text starts with `grcy`, the picker splits it at the colons. When
   the second part is `p`, the third part is the product id. The picker
   selects that product and remembers the full Grocycode, including a fourth
   part (the stock entry id) when present.
2. Otherwise the picker searches the hidden barcode data of the options for
   the text followed by a comma. The comparison is lowercase. One match
   selects the product.
3. On a match, the picker stores the barcode on the product field and fires
   the product change. The form then loads the product details and reads the
   product barcode row from `GET /objects/product_barcodes_view?query[]=barcode=…`.
   It applies the barcode defaults: amount, quantity unit, store, last price
   (purchase sets it as total price), and note. Consume and transfer apply
   amount and unit only.
4. On no match, the picker checks whether the text is part of a product name
   in the dropdown. When it is, nothing happens; the dropdown stays open for
   the user to pick.
5. When the text is not part of any name and the page allows product
   workflows, the picker asks the API whether a product barcode or a product
   with that exact name exists. When one exists, the product is not in the
   picker list because it is not in stock. The picker shows "This product is
   not in stock" and clears.
6. When nothing exists, the picker opens the dialog "Create or assign
   product": "<text> could not be resolved to a product, how do you want to
   proceed?". See the next section.

The match is client side. The server does the same work for API clients in
`GetProductIdFromBarcode`: a product Grocycode gives the product id directly;
otherwise a case-insensitive lookup in `product_barcodes`; otherwise the
error "No product with barcode … found".

### The unknown barcode dialog

The dialog has these buttons, each with a hotkey letter:

| Hotkey | Button | What it does |
| --- | --- | --- |
| P | Add as new product | Opens the product form with the name prefilled from the text. After save, Grocy returns to the stock form with the new product selected. |
| B | Add as barcode to existing product | Reloads the stock form with `flow=InplaceAddBarcodeToExistingProduct`. An info line says the barcode "will be added to the list of barcodes for the selected product on submit". The user picks a product by name and finishes the stock action. On save, the form creates the product barcode row. Purchase also stores the amount, the unit, the store, and the note from the form as barcode defaults. |
| A | Add as new product and prefill barcode | Opens the product form. The product form does not read the barcode; the name is empty. After save, Grocy returns to the stock form in the "add barcode to existing product" flow with the new product selected, and stores the barcode on save of the stock action. |
| E | External barcode lookup | Shown only when a lookup plugin is configured. See the next section. |
| C | Camera icon | Clears the field and opens the camera scanner again. |
| none | Cancel | Closes the dialog and refocuses the product field. |

On the consume and transfer forms, the P, A, and E buttons are hidden. Only
B, C, and Cancel remain. The shopping list item form allows all buttons.

There is no sound and no vibration for an unknown barcode. The only alert is
the dialog. The error sound plays only in scan mode when a product was found
but a required field stayed empty.

Each "new product" path leaves the stock form, opens the full product form
(name, location, stock unit, purchase unit are required), and comes back
with the product selected. The barcode itself is saved only when the stock
action is saved.

### The external barcode lookup plugin

Setting: `STOCK_BARCODE_LOOKUP_PLUGIN` in `config-dist.php`. Default:
`OpenFoodFactsBarcodeLookupPlugin`. Empty disables the feature. A household
plugin in `data/plugins/` wins over a built-in plugin of the same name.

The E button calls `GET /stock/barcodes/external-lookup/{barcode}?add=true`.
The caller needs the permission to edit master data. The server:

1. Loads the plugin with the active locations, the active quantity units, and
   the user settings.
2. Calls the plugin's lookup. The plugin returns null (nothing found) or a
   product record with at least: name, location id, purchase unit id, stock
   unit id, the factor from purchase unit to stock unit, and the barcode. It
   can add an image URL.
3. Checks that the location and the units exist and that the factor is a
   number.
4. With `add=true`: refuses when a product with that name exists. Else it
   downloads the image, creates the product, creates the product barcode
   row, creates a product conversion when the two units differ, and returns
   the record with the new product id.

The Open Food Facts plugin queries `world.openfoodfacts.org` for the
product name and the image. It uses the "presets for new products" user
settings for the location and the unit, else the first location and the
first unit. The factor is always 1.

In the browser: null gives the toast "Nothing was found for the given
barcode" and refocuses the field. A result opens the product edit form of the
new product with `flow=InplaceNewProductByExternalBarcodeLookupPlugin` so the
user can check it. Save returns to the stock form with the product selected.

### Grocycode

A Grocycode is Grocy's own barcode. It is a text of three or more parts
joined by colons: the magic `grcy`, a type letter, an object id, and optional
extra parts. The types are `p` product, `b` battery, `c` chore, and `r`
recipe. A stock entry has no type of its own: its Grocycode is the product
code plus the stock entry id as fourth part, `grcy:p:<product id>:<stock id>`.

| Object | Grocycode | Image route | Where it is scanned |
| --- | --- | --- | --- |
| Product | `grcy:p:<id>` | `/product/{id}/grocycode` | Product picker on every stock form; API by-barcode. |
| Stock entry | `grcy:p:<product id>:<stock id>` | `/stockentry/{entryId}/grocycode`; printable label at `/stockentry/{entryId}/label` | Product picker. Consume preselects the stock entry, its location, and its amount. Transfer preselects the stock entry and the from location. API consume, open, and transfer by barcode set `stock_entry_id` from the fourth part. API inventory by barcode ignores it. |
| Battery | `grcy:b:<id>` | `/battery/{id}/grocycode` | Battery tracking page. |
| Chore | `grcy:c:<id>` | `/chore/{id}/grocycode` | Chore tracking page. |
| Recipe | `grcy:r:<id>` | `/recipe/{id}/grocycode` | Recipe picker. |

Locations, stores, quantity units, and shopping list items have no
Grocycode.

The image is Code 128 (`GROCYCODE_TYPE` = `1D`) or DataMatrix (`2D`, the
default). The product form shows the image with Download and "Print on label
printer". The stock entry label shows the image, the product name, and the
due date. The label printer is a webhook (`LABEL_PRINTER_WEBHOOK`) that
receives the product name, the Grocycode, the due date, and the product
details. Purchase and inventory can print one label per transaction or one
per unit; the stock entry form can reprint; open can reprint when the due
date changed and the product has "auto reprint".

### The camera scanner

Component: `camerabarcodescanner`. Library: ZXing in the browser. Formats:
EAN-8, EAN-13, Code 39, Code 128, DataMatrix, QR. Off when
`FEATURE_FLAG_DISABLE_BROWSER_BARCODE_CAMERA_SCANNING` is on. Camera access
needs https.

1. On page load, Grocy adds a camera button after every visible input with
   the class `barcodescanner-input`. The product picker has this class.
2. The user clicks the button. A dialog opens with the live video, a camera
   dropdown (the choice is saved in the browser), and a torch button when
   the camera has one. With `FEATURE_FLAG_AUTO_TORCH_ON_WITH_CAMERA` (default
   on) the torch turns on by itself.
3. On the first decoded code, the scanner stops, fires the browser event
   `Grocy.BarcodeScanned` with the text and the target, and closes the
   dialog.
4. The product picker listens for that event. It writes the text into the
   field and blurs it. The resolution sequence above runs.

One dialog gives one scan. Ten products need ten clicks on the camera
button.

### A hardware scanner

Grocy has no code for hardware scanners. A USB or Bluetooth scanner works as
a keyboard: it types the barcode into the focused field and sends Enter.
The product picker's Enter handler blurs the field, and the resolution
sequence runs. So the product field must have the focus. Every stock form
puts the focus there on load and after each save. In embedded dialogs with a
prefilled product, the focus is in the amount field instead.

The page "Barcode scanner testing" (`/barcodescannertesting`) checks a
scanner: the user types the expected code, scans into the scan field, and the
page counts hits and misses.

### Scan mode

Scan mode is a per-user toggle on the purchase and consume pages
(`scan_mode_purchase_enabled`, `scan_mode_consume_enabled`). When it is on:

- A beep plays when the product changes.
- When the barcode row has defaults, the form applies them and submits.
  When it has none, the form sets the amount to 1 and submits.
- When a required field is still empty, a yellow toast says "Scan mode is on
  but not all required fields could be populated automatically" and the
  error sound plays. The form waits.
- After a successful save the success sound plays.

Sounds are mp3 files played by the browser. Turning scan mode on plays a
silent file to ask the browser for audio permission. Grocy never vibrates
the device.

### Tare weight

Product settings: "Enable tare weight handling" and "Tare weight" (in the
stock unit). The user weighs the whole container. Grocy subtracts the
container weight and the current stock from that weight.

| Form | Change with tare weight on |
| --- | --- |
| Purchase | The unit is locked to the stock unit. The minimum amount is tare weight plus current stock. An info line says "please weigh the whole container". The server posts: entered amount minus current stock minus tare weight. The price per unit uses that net amount. |
| Consume | The checkbox "Consume exact amount" appears. Unticked: the minimum is the tare weight, the maximum is current stock plus tare weight, the server posts the absolute value of: entered amount minus current stock minus tare weight. Ticked: the entered amount is the net amount to remove. "Mark as opened" is disabled. |
| Stock overview row | The quick consume button and the open button are disabled. "Consume all" sends the tare weight as the amount, which the server turns into "remove everything". |
| Inventory | The minimum is the tare weight. The server compares the entered amount with current stock plus tare weight. The info line hides when the entered amount is below the tare weight. |
| Transfer | Refused in the picker and on the server. |
| Open | Refused on the server; the buttons are disabled. |
| API by-barcode | Same server rules. The caller sends the gross weight unless it sets `exact_amount`. |

## Settings and feature flags that change these workflows

### Feature flags (`config-dist.php`, instance wide)

| Flag | Default | Effect on the workflows |
| --- | --- | --- |
| `FEATURE_FLAG_STOCK` | on | The whole stock area. The shopping list page hides its stock actions without it. |
| `FEATURE_FLAG_STOCK_PRICE_TRACKING` | on | Price, price type, store on purchase, inventory, stock entry edit; price columns; total value on the shopping list. |
| `FEATURE_FLAG_STOCK_LOCATION_TRACKING` | on | Location on purchase, inventory, stock entry edit; the location dropdown on consume. |
| `FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_TRACKING` | on | Due date on purchase, inventory, stock entry edit; the due date warning; the due date on labels. |
| `FEATURE_FLAG_STOCK_PRODUCT_OPENED_TRACKING` | on | "Mark as opened" button, open buttons on rows, Opened checkbox, "Treat opened as out of stock" preset. |
| `FEATURE_FLAG_STOCK_PRODUCT_FREEZING` | on | Freezer due date rules on purchase; Frozen and Thawed toasts on transfer. |
| `FEATURE_FLAG_STOCK_BEST_BEFORE_DATE_FIELD_NUMBER_PAD` | on | Number pad for date fields on mobile. |
| `FEATURE_FLAG_SHOPPINGLIST` | on | The shopping list area and the shopping list button on the product card. |
| `FEATURE_FLAG_SHOPPINGLIST_MULTIPLE_LISTS` | on | The list dropdown and the list actions menu. |
| `FEATURE_FLAG_RECIPES` | on | The recipe picker on consume. |
| `FEATURE_FLAG_LABEL_PRINTER` | off | The "Stock entry label" field, the reprint checkbox, the label webhook. |
| `FEATURE_FLAG_THERMAL_PRINTER` | off | The "Thermal printer" button in the shopping list print dialog. |
| `FEATURE_FLAG_DISABLE_BROWSER_BARCODE_CAMERA_SCANNING` | off | Removes the camera buttons and the C option. |
| `FEATURE_FLAG_AUTO_TORCH_ON_WITH_CAMERA` | on | Torch on when the camera dialog opens. |

### Other instance settings

| Setting | Default | Effect |
| --- | --- | --- |
| `STOCK_BARCODE_LOOKUP_PLUGIN` | `OpenFoodFactsBarcodeLookupPlugin` | The E option in the unknown barcode dialog and the external lookup API. Empty disables both. |
| `GROCYCODE_TYPE` | `2D` | DataMatrix or Code 128 for Grocycode images. |
| `LABEL_PRINTER_WEBHOOK`, `LABEL_PRINTER_RUN_SERVER`, `LABEL_PRINTER_PARAMS`, `LABEL_PRINTER_HOOK_JSON` | empty, true, font, true | Where and how labels are sent. Server side or from the browser. |
| `DEFAULT_PERMISSIONS` | `ADMIN` | Row buttons and the lookup need `STOCK_CONSUME`, `STOCK_OPEN`, `STOCK_PURCHASE`, `MASTER_DATA_EDIT`. |

### Stock user settings (Stock settings page, per user)

| Setting | Default | Effect |
| --- | --- | --- |
| `product_presets_location_id`, `product_presets_product_group_id`, `product_presets_qu_id`, `product_presets_default_due_days`, `product_presets_treat_opened_as_out_of_stock`, `product_presets_default_stock_label_type` | none, none, none, 0, on, no label | Defaults for a new product. The lookup plugin uses the location and the unit. |
| `stock_due_soon_days` | 5 | Yellow rows on the overview. |
| `show_icon_on_stock_overview_page_when_product_is_on_shopping_list` | on | Cart icon on overview rows. |
| `stock_overview_show_all_out_of_stock_products` | off | Overview shows every active product. |
| `stock_default_purchase_amount` | 0 | The prefilled purchase amount. 0 forces a field entry. |
| `show_purchased_date_on_purchase` | off | Purchased date field on purchase and inventory. |
| `show_warning_on_purchase_when_due_date_is_earlier_than_next` | on | The due date warning toast. |
| `stock_default_consume_amount` | 1 | The prefilled consume amount. |
| `stock_default_consume_amount_use_quick_consume_amount` | off | Use the product's quick consume amount instead. |
| `stock_decimal_places_amounts`, `stock_decimal_places_prices_input`, `stock_decimal_places_prices_display`, `stock_auto_decimal_separator_prices` | 4, 2, 2, off | Number formats and the auto decimal separator for prices. |
| `scan_mode_purchase_enabled`, `scan_mode_consume_enabled` | off | Scan mode on each page. |

### Shopping list user settings

| Setting | Default | Effect |
| --- | --- | --- |
| `shopping_list_to_stock_workflow_auto_submit_when_prefilled` | off | Purchase from a shopping list item submits itself. |
| `shopping_list_show_calendar` | off | A month calendar next to the list. |
| `shopping_list_round_up` | off | Amounts rounded up on the list. |
| `shopping_list_auto_add_below_min_stock_amount`, `..._list_id` | off, 1 | Products below minimum are added after each consume or open. Hides the manual menu item. |
| `shopping_list_print_show_header`, `shopping_list_print_group_by_product_group`, `shopping_list_print_layout_type` | on, on, table | Print dialog defaults. |

### Product settings that change the forms

Set per product on the product form: default location, default consume
location, "move on open", default store, minimum stock amount, due date type,
default due days, default due days after open, after freezing, after thawing,
"should not be frozen", stock unit, purchase unit, consume unit, price unit,
tare weight handling and tare weight, quick consume amount, quick open
amount, default stock entry label, "auto reprint stock label", default
purchase price type, "disable open", "hide on stock overview", "no own
stock", parent product, "treat opened as out of stock".

## Map of the requirements to the workflow steps

Source: `docs/requirements/human.md`, section "Inventory and product
management". The general requirement "fewer clicks" applies to every row.

| Requirement | Workflow step | What Grocy does today | What the requirement changes |
| --- | --- | --- | --- |
| Barcode scanning with a hardware scanner and with the phone camera | "Pick the product" on every stock form and the shopping list item form | A hardware scanner types into the focused product field and sends Enter. The camera opens a dialog, reads one code, closes. Both resolve in the product picker. | Nothing in kind. Both inputs exist. The camera must stay open for the next scan, and the scanner must not depend on the focus of one field. |
| Inventory workflows: stock, shop, consume, audit | The four pages Purchase, Shopping list, Consume, Inventory | Four pages with the same picker. Transfer and open are extra. | Grocy Next names the four workflows after the household's words. "Audit" is Grocy's inventory. |
| The user scans one product after another without a stop | "After save" on purchase and consume | Scan mode submits by itself when every required field is filled. It stops for: an unknown barcode (dialog), an empty required field (toast and wait), a camera scan (dialog closes), an opened dropdown. Transfer and inventory have no scan mode. The shopping list item form reloads the page per item. | The scan never blocks. Every decision that Grocy asks for in a dialog or a toast moves out of the scan loop. |
| Each scan becomes a pending scan in the review queue | "After save" on every stock form | A scan is a booking at once. The only later correction is Undo on the toast, or the stock journal. | A new step between "pick the product" and "save": the scan waits in a queue. The booking happens when the queue entry is reviewed or auto-approved. |
| An AI can read the review queue through the MCP | none | No queue, no MCP server. The REST API exists. | New surface. |
| The tool finds the product from the barcode | "Pick the product": the resolution sequence | Client side: hidden barcode data per option, lowercase match, Grocycode prefix. Server side: `GetProductIdFromBarcode`, case-insensitive, Grocycode first. | Same rule. The queue needs the server rule, not the picker. |
| When the barcode is not found, the tool alerts the user at once with a sound, a vibration, and an onscreen alert. The user types a name and continues. | "Pick the product": the unknown barcode dialog | A modal dialog with five choices. No sound, no vibration. "Add as new product" leaves the form and opens the full product form (four required fields). The barcode is saved only after the stock action. | An alert instead of a dialog with choices. A name field inline. The product is created with presets and the barcode at once. The scan loop continues. |
| Smart scale support over Bluetooth and Wi-Fi | "Enter the amount" on purchase, consume, inventory | The user types the weight. The tare weight forms expect the gross weight of the whole container. | The scale fills the amount field. The gross weight rule stays. |
| Consume supports tare weight. The tool follows Grocy's tare setting for the product. | "Enter the amount" on consume | Consume with tare weight: gross weight by default, "Consume exact amount" for a net amount, no open, no transfer. The product's `enable_tare_weight_handling` and `tare_weight` decide. | Same semantics. Grocy Next reads the two product fields and applies the same formula. |
| Grocy is the primary source of truth for units, products, and locations | "Pick the product", "pick the unit", "pick the location" on every form | The forms read products, quantity units with conversions, and locations from Grocy's own tables. | Grocy Next reads them from Grocy and does not keep its own copy as master. |
| Mealie is the secondary source of truth, mainly for recipes | The recipe picker on consume | The recipe field on consume is for statistics only. Recipe consume is a separate API operation. | Recipes come from Mealie. The consume form's recipe field points at a Mealie recipe or disappears. |
| The "I made this" action in Mealie consumes stock | "After save" on consume, triggered from outside | `POST /recipes/{id}/consume` consumes the ingredients of a Grocy recipe. `POST /stock/products/{id}/consume` with sub-product substitution consumes one product. The bugs in `human.md` affect both when a parent product is used. | An external event starts a consume. The four bugs in `human.md` must be fixed in Grocy Next's consume rule. |

## Notes for the subdomain ticket (#30)

- Scanning is one component, the product picker, that every stock form and
  the shopping list item form share. The resolution rule (Grocycode first,
  then product barcode, case-insensitive) lives twice: in the browser and
  in `StockService`. Grocy Next needs it once, on the server, because the
  review queue resolves without a form.
- The unknown barcode handling is the only place where a scan branches into
  master data (new product, new product barcode, external lookup). The
  review queue is the natural home for that branch.
- Tare weight is a rule of the stock service, not of the form. The forms only
  show hints and limits. The queue can apply the same rule.
- Grocy v4.7.1 has three small defects in these workflows. The transfer
  amount default reads an undefined user setting, so the field is always
  empty. The "Add as new product and prefill barcode" path does not prefill
  the barcode on the product form. The shopping list item form reloads the
  whole page after each item.
