# Grocy v4.7.1 API calls for consume, open, and transfer

This file answers GitHub issue #123. It records what the Grocy v4.7.1 API
calls for consume, open, and transfer do. It records facts, not decisions.
It contains no Grocy source code.

Two earlier files hold related facts. This file does not repeat them:

- `docs/research/grocy-stock-workflows.md` on the branch
  `research/grocy-stock-workflows`: the forms, the buttons, the tare weight
  table, and a short description of each workflow.
- `docs/research/grocy-api-review-queue.md` on the branch
  `research/grocy-api-review-queue`: the shared API rules, the stock log row,
  the barcode lookup, purchase, inventory, and undo.

This file uses the terms in `GLOSSARY.md`: product, stock entry, due date,
booking, transaction, quantity unit, conversion, parent product, consume,
transfer.

## Sources

All paths are in the Grocy repo at tag `v4.7.1`,
<https://github.com/grocy/grocy/tree/v4.7.1>. Line numbers refer to that tag.

| Short name | Path |
| --- | --- |
| Service | [`services/StockService.php`](https://github.com/grocy/grocy/blob/v4.7.1/services/StockService.php) |
| Controller | [`controllers/Api/StockApiController.php`](https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/StockApiController.php) |
| OpenAPI | [`grocy.openapi.json`](https://github.com/grocy/grocy/blob/v4.7.1/grocy.openapi.json) |
| Consume order view | [`migrations/0200.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0200.sql) |
| Default location trigger | [`migrations/0095.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0095.sql) |
| Triggers on stock | [`migrations/0254.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0254.sql) |
| Stock overview view | [`migrations/0252.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0252.sql) |
| Browser code | [`public/viewjs/consume.js`](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/consume.js), [`transfer.js`](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/transfer.js), [`stockoverview.js`](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/stockoverview.js), [`stockentries.js`](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/stockentries.js), [`productform.js`](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/productform.js) |
| Pages | [`views/stockoverview.blade.php`](https://github.com/grocy/grocy/blob/v4.7.1/views/stockoverview.blade.php), [`views/stockentries.blade.php`](https://github.com/grocy/grocy/blob/v4.7.1/views/stockentries.blade.php), [`views/productform.blade.php`](https://github.com/grocy/grocy/blob/v4.7.1/views/productform.blade.php) |
| Row library | [`src/LessQL/Row.php`](https://github.com/berrnd/lessql/blob/master/src/LessQL/Row.php) in the Grocy fork of LessQL (`composer.json` line 12) |

## Summary

- No call takes a quantity unit. Every amount is in the stock unit of the
  product. The browser converts before it calls.
- Consume checks the amount against the total stock of the product, not
  against the stock at `location_id` or in `stock_entry_id`. When the
  filtered stock is smaller, Grocy consumes what it finds and returns `200`.
  It does not report the shortfall.
- Open takes sealed stock entries in the consume order. It can open part of
  one stock entry. It then splits the stock entry in two. The opened part
  keeps the old `stock_id`. The sealed rest gets a new `stock_id`.
- Consume never changes the open state of a stock entry. No consume field
  opens stock.
- Transfer applies the freezer and thaw due date rules on the server. The
  earlier research says the opposite. The code is in the service, lines
  1326 to 1349.
- Open and transfer have no check for an amount of 0 or less.
- Open, consume, and transfer run without a database transaction. A failure
  in the middle leaves the bookings made before it.
- The undo check for "subsequent dependent bookings" counts only later
  bookings that have a `correlation_id`. Only transfer bookings have one. A
  later consume does not block an undo. A later transfer does.

## 1. Consume

Paths: `POST /stock/products/{productId}/consume` and
`POST /stock/products/by-barcode/{barcode}/consume`. Permission:
`STOCK_CONSUME` (controller line 259).

### Fields

Sources: controller lines 257 to 326, OpenAPI path
`/stock/products/{productId}/consume` (line 1969).

| Field | Required | How the controller reads it | Default |
| --- | --- | --- | --- |
| `amount` | yes | The key must exist (line 271). The value goes to a `float` parameter. | none |
| `spoiled` | no | Passed as given to a `bool` parameter (lines 276 to 280). | `false` |
| `transaction_type` | no | See "The transaction type defect" below (lines 282 to 286). | `consume` |
| `stock_entry_id` | no | Used when not empty (lines 288 to 292). It is the text `stock_id`, not the row id. | none |
| `location_id` | no | Used when not empty and numeric (lines 294 to 298). Else null. | null, any location |
| `recipe_id` | no | Used when numeric (lines 300 to 304). Stored on the stock log rows only. | null |
| `exact_amount` | no | Passed as given (lines 306 to 310). Has an effect only for tare weight products. | `false` |
| `allow_subproduct_substitution` | no | Passed as given (lines 312 to 316). | `false` |

PHP converts a JSON string to `bool` by its own rule. The strings `""` and
`"0"` give `false`. Any other string, `"false"` included, gives `true`. The
service file has no `strict_types` line (service lines 1 to 9).

### The transaction type defect

The controller tests for the key `transaction_type`. It then reads the key
`transactiontype`, without the underscore (controller lines 282 to 286). A
body with only `transaction_type` books a consume. To change the type, the
body must hold both keys. The service accepts only `consume` and
`inventory-correction` (service line 401). Any other value gives `400`
`"Transaction type <value> is not valid (StockService.ConsumeProduct)"`
(service line 524).

### Checks, in order

Source: service lines 365 to 423.

1. The product exists and is active. Else `400` `"Product does not exist or
   is inactive"`.
2. `amount` is more than 0. Else `400` `"Amount can't be <= 0"`.
3. When `location_id` is given, the location exists and is active (service
   lines 377 to 380 and 1856 to 1860). Else `400` `"Location does not
   exist"`.
4. Tare weight rules (see "Tare weight" below).
5. The transaction type is valid.
6. `round(amount, 2)` is not more than `round(stock_amount_aggregated, 2)`.
   Else `400` `"Amount to be consumed cannot be > current stock amount (if
   supplied, at the desired location)"` (lines 419 to 423).

Check 6 uses the aggregated stock of the whole product at all locations. It
uses it also when `location_id`, `stock_entry_id`, or no sub-product
substitution limits the stock entries. The message says "at the desired
location", but the code does not check the location.

### Which stock entries Grocy takes

Sources: service lines 403 to 417 and 868 to 899, consume order view lines 1
to 20.

- With no `location_id`, Grocy reads the stock entries of the product from
  the view `stock_next_use`. With `location_id`, it keeps only the stock
  entries at that location.
- With `stock_entry_id`, it keeps only the stock entries with that
  `stock_id`. After a partial transfer, two stock entries can share one
  `stock_id` (see section 3).
- Open and sealed stock entries both count.
- The view sorts in this order: stock entries at the default consume
  location of their own product first, then open first, then the earliest
  due date first, then the earliest purchase date first.
- The service query adds a `WHERE` clause to the view. It adds no
  `ORDER BY`. The order comes from the `ORDER BY` inside the view.

### What Grocy writes

Source: service lines 430 to 518.

- For each stock entry, while an amount remains:
  - When the amount left is equal to or more than the stock entry amount,
    Grocy deletes the stock entry. It writes one stock log row with the
    negative stock entry amount.
  - Else Grocy reduces the stock entry amount. It writes one stock log row
    with the negative amount left. The stock entry keeps its `stock_id`, its
    open state, and its due date.
- Each stock log row copies the due date, the purchase date, the price, the
  `opened_date`, the location, the store, and the note of the stock entry.
  It adds `used_date` (today), `spoiled`, and `recipe_id`.
- All rows share one `transaction_id`.
- When the stock entries run out before the amount, the loop ends. Grocy
  writes no error. The response holds only the rows written.
- When no row was written, the controller returns `400` `"No transaction was
  found by the given transaction id"` (controller lines 792 to 808). This
  happens, for example, when `stock_entry_id` matches no stock entry, or when
  the location has no stock.
- After the loop, when the user setting
  `shopping_list_auto_add_below_min_stock_amount` is on, Grocy adds missing
  products to the shopping list (lines 515 to 518).

### Sub-product substitution

Source: service lines 437 to 446 and 475 to 480, and lines 868 to 883.

- With `allow_subproduct_substitution = true`, the list of stock entries
  holds the stock entries of the parent product and of all its sub-products.
  They are mixed in the consume order of the view. The parent stock does not
  go first.
- For a stock entry of a sub-product, Grocy multiplies the amount left by a
  factor. The factor comes from `cache__quantity_unit_conversions_resolved`
  with `product_id` = the sub-product, from the parent stock unit to the
  sub-product stock unit. When no row exists, Grocy uses the amount as it is
  (factor 1).
- After it takes a whole sub-product stock entry, Grocy divides the amount
  left by the same factor.
- Without substitution, a parent product with no own stock passes check 6
  (aggregated stock), finds no stock entries, and gives `400` `"No
  transaction was found by the given transaction id"`.
- The Grocy consume form, the stock overview consume button, and the stock
  overview open button always send `allow_subproduct_substitution: true`
  (consume.js line 24, stockoverview.js lines 139 and 191). The stock
  entries page does not send it (stockentries.js lines 79 and 125).

### Tare weight

Source: service lines 384 to 399. The earlier research gives the forms. These
are the server facts that it does not give.

- Without `exact_amount`, `amount` is the gross weight. Grocy refuses a gross
  weight below `tare_weight` with `400` `"The amount cannot be lower than the
  defined tare weight"`.
- Grocy books `abs(amount - stock_amount - tare_weight)`. The absolute value
  means that a gross weight above stock plus tare weight also books a
  consume, of the difference.
- With `exact_amount = true`, Grocy first sets
  `amount = stock_amount + tare_weight - amount`. The formula then gives the
  net amount back. A net amount above `stock_amount` gives the error "The
  amount cannot be lower than the defined tare weight".
- `stock_amount` here is the own stock of the product, at all locations. The
  stock check after it uses `stock_amount_aggregated`.

### By barcode

Source: controller lines 328 to 351.

- Grocy resolves the product as the earlier research describes.
- When the barcode is a stock entry Grocycode, Grocy sets `stock_entry_id`
  from the fourth part. It overwrites any `stock_entry_id` in the body.
- The product barcode amount and unit are not used. `amount` stays
  required.

### OpenAPI and code differences

- OpenAPI says for `stock_entry_id`: "if used, the amount has to be 1". The
  code does not check this. Any amount up to the stock entry amount works.
- OpenAPI lists `transaction_type` as a working field. See the defect above.
- The `StockTransactionType` enum (OpenAPI line 6034) lists `purchase`,
  `consume`, `inventory-correction`, `product-opened`. It omits
  `self-production`, `transfer_from`, `transfer_to`, `stock-edit-new`, and
  `stock-edit-old` (service lines 11 to 19).

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `Request body could not be parsed (probably invalid JSON format or missing/wrong Content-Type header)` | No body. |
| 400 | `An amount is required` | No `amount` key. |
| 400 | `Product does not exist or is inactive` | Unknown or inactive product. |
| 400 | `Amount can't be <= 0` | Zero or negative amount. |
| 400 | `Location does not exist` | Unknown or inactive `location_id`. |
| 400 | `The amount cannot be lower than the defined tare weight` | Tare weight product, see above. |
| 400 | `Transaction type <value> is not valid (StockService.ConsumeProduct)` | Bad type in `transactiontype`. |
| 400 | `Amount to be consumed cannot be > current stock amount (if supplied, at the desired location)` | More than the aggregated stock. |
| 400 | `No transaction was found by the given transaction id` | No stock entry matched the filters. |
| 400 | `No product with barcode <text> found`, `Invalid Grocycode` | By-barcode path. |
| 403 | `Permission missing: STOCK_CONSUME` | |

## 2. Open

Paths: `POST /stock/products/{productId}/open` and
`POST /stock/products/by-barcode/{barcode}/open`. Permission: `STOCK_OPEN`
(controller line 542).

### Fields

Sources: controller lines 540 to 579, OpenAPI path
`/stock/products/{productId}/open` (line 2223).

| Field | Required | Default | Note |
| --- | --- | --- | --- |
| `amount` | yes | none | The key must exist. In the stock unit. |
| `stock_entry_id` | no | none | The text `stock_id`. Used when not empty. |
| `allow_subproduct_substitution` | no | `false` | As on consume. |

Open has no `location_id`. It opens stock at any location.

### Checks, in order

Source: service lines 983 to 1007.

1. The product exists and is active. Else `400` `"Product does not exist or
   is inactive"`.
2. The product has `disable_open = 0`. Else `400` `"Product can't be
   opened"`.
3. The product has `enable_tare_weight_handling = 0`. Else `400` `"Opening
   tare weight handling enabled products is not supported"`.
4. `amount` is not more than `stock_amount_aggregated -
   stock_amount_opened_aggregated`. Else `400` `"Amount to be opened cannot
   be > current unopened stock amount"`.

Open has no check for an amount of 0 or less.

- An amount of 0 writes nothing. The controller then returns `400` `"No
  transaction was found by the given transaction id"`.
- A negative amount passes all checks. The split branch then runs with the
  negative amount. It creates a sealed stock entry with more than the old
  amount, and an open stock entry with a negative amount (service lines
  1095 to 1138).

Check 4 uses the aggregated unopened stock. The `stock_entry_id` filter comes
after the check (lines 1009 to 1012). An amount above the chosen stock entry
opens that stock entry only. Grocy reports no shortfall.

### Which stock entries Grocy opens

Source: service lines 997 and 1019 to 1148.

- Only sealed stock entries (`open = 0`) count.
- The order is the consume order of `stock_next_use` (section 1).
- Grocy opens whole stock entries until the amount is used. When the amount
  left is smaller than a stock entry, Grocy opens part of it.
- One call can open many stock entries. Each one gives one stock log row of
  type `product-opened`.

### Open of part of a stock entry

Source: service lines 1095 to 1138.

When the amount left is smaller than the stock entry amount:

1. Grocy creates a new stock entry with the rest amount. It gets a new
   `stock_id` (`uniqid()`). It copies the due date, the purchase date, the
   location, the store, the price, and the note. It is sealed: it has no
   `open` value and no `opened_date`. The table defaults apply.
2. Grocy writes one stock log row with the opened amount and the old
   `stock_id`.
3. Grocy changes the old stock entry: amount = the opened amount, `open = 1`,
   `opened_date` = today, due date = the new due date.

So the opened part keeps the old `stock_id` and the old row id. A printed
stock entry Grocycode now points at the opened part. The sealed rest has a
`stock_id` that no label carries. Userfield values stay with the old row id.

### Open and a partial consume on one stock entry

- A consume never changes `open` or `opened_date` (service lines 448 to
  512). A partial consume of an open stock entry leaves it open with a lower
  amount.
- The consume order puts open stock entries before sealed ones at the same
  priority level.
- An open after a partial consume opens what is left. The open ignores
  stock entries that are already open.

### Due date after open

Source: service lines 1026 to 1036.

- When `default_best_before_days_after_open` is more than 0, the new due
  date is today plus that many days.
- When that date is later than the old due date, Grocy keeps the old due
  date.
- A value of 0 keeps the old due date. A value of `-1` has no special
  meaning here. Values of 0 or less keep the old due date.
- Grocy writes the old due date into the stock log row. The undo uses it.
- When the due date changes, the label printer is on and runs on the
  server, and the product has `auto_reprint_stock_label = 1`, Grocy sends
  the label webhook (lines 1037 to 1053).

### Move on open

Source: service lines 1140 to 1147.

- After it opens each stock entry, Grocy checks the product that the call
  names. When it has `move_on_open = 1` and a `default_consume_location_id`
  that differs from the location of the stock entry, Grocy calls the
  transfer code for that stock entry.
- The transfer amount is the stock entry amount after the open. The row
  library sets the new values on the row object (LessQL `Row.php`,
  `update` calls `setData`). So only the opened part moves.
- The transfer uses the same `transaction_id`. The open response holds the
  `product-opened` rows and the `transfer_from` and `transfer_to` rows.
- All transfer rules apply, freezer rules included. When the default
  consume location is a freezer, the freezer due date rule applies.
- With sub-product substitution, Grocy uses the `move_on_open` and the
  default consume location of the named product (the parent). It transfers
  the sub-product stock entry.
- The transfer can fail, for example for an inactive destination location.
  The open rows stay written. The caller gets `400` with the transfer error.

### Sub-product substitution on open

Source: service lines 1056 to 1065 and 1093.

- Grocy multiplies the amount left by the conversion factor before it opens
  a sub-product stock entry, as on consume.
- After it opens a whole sub-product stock entry, Grocy does not divide the
  amount left back. The consume code does (line 479). The open code has no
  such line. The next stock entry gets an amount in the wrong unit when the
  factor is not 1.

### By barcode

Source: controller lines 581 to 604. As on consume: a stock entry Grocycode
sets `stock_entry_id`.

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `Request body could not be parsed (probably invalid JSON format or missing/wrong Content-Type header)` | No body. |
| 400 | `An amount is required` | No `amount` key. |
| 400 | `Product does not exist or is inactive` | Unknown or inactive product. |
| 400 | `Product can't be opened` | `disable_open = 1`. |
| 400 | `Opening tare weight handling enabled products is not supported` | Tare weight product. |
| 400 | `Amount to be opened cannot be > current unopened stock amount` | More than the aggregated sealed stock. |
| 400 | `No transaction was found by the given transaction id` | Amount 0, or no sealed stock entry matched `stock_entry_id`. |
| 400 | any transfer error | Move on open failed. The open is stored. |
| 400 | `No product with barcode <text> found`, `Invalid Grocycode` | By-barcode path. |
| 403 | `Permission missing: STOCK_OPEN` | |

## 3. Transfer

Paths: `POST /stock/products/{productId}/transfer` and
`POST /stock/products/by-barcode/{barcode}/transfer`. Permission:
`STOCK_TRANSFER` (controller line 812).

### Fields

Sources: controller lines 810 to 853, OpenAPI path
`/stock/products/{productId}/transfer` (line 2061).

| Field | Required | Note |
| --- | --- | --- |
| `amount` | yes | The key must exist. In the stock unit. |
| `location_id_from` | yes | The key must exist (line 826). |
| `location_id_to` | yes | The key must exist (line 831). |
| `stock_entry_id` | no | The text `stock_id`. Used when not empty. |

Transfer has no `allow_subproduct_substitution`. It moves own stock of the
named product only (service lines 1301 and 1302).

The service takes the location ids as `int` parameters (line 1267). A value
that PHP cannot convert to an integer raises a `TypeError`. The controller
catches only `\Exception`, so this error is not caught there. The earlier
research gives `500` for an unhandled error.

### Checks, in order

Source: service lines 1269 to 1307.

1. The product exists and is active. Else `400` `"Product does not exist or
   is inactive"`.
2. The from location exists and is active. Else `400` `"Source location does
   not exist"`.
3. The to location exists and is active. Else `400` `"Destination location
   does not exist"`.
4. The product has no tare weight handling. Else `400` `"Transferring tare
   weight enabled products is not yet possible"`. The tare weight code after
   this line never runs.
5. `amount` is not more than the own stock of the product at the from
   location. Else `400` `"Amount to be transferred cannot be > current stock
   amount at the source location"`.

Transfer has no check that the two locations differ. It has no check for an
amount of 0 or less.

- An amount of 0 writes nothing and gives `400` `"No transaction was found
  by the given transaction id"`.
- A negative amount runs the split branch. It writes a positive
  `transfer_from` row, a negative `transfer_to` row, and a stock entry with a
  negative amount at the to location (lines 1417 to 1480).

Check 5 uses the stock at the from location. The `stock_entry_id` filter
comes after it (lines 1309 to 1312). An amount above the chosen stock entry
moves that stock entry only, without an error.

### Which stock entries Grocy moves

- The stock entries of the product at the from location, in the consume
  order of `stock_next_use`. Open and sealed stock entries both count.
- Grocy moves whole stock entries until the amount is used, and splits the
  last one.

### What Grocy writes

Source: service lines 1370 to 1480.

- For each stock entry, Grocy creates one new `correlation_id`. It writes
  two stock log rows with it: `transfer_from` (negative amount, from
  location, old due date) and `transfer_to` (positive amount, to location,
  new due date).
- The code writes the key `transaction_Id` with a capital `I` (line 1386).
  SQLite column names ignore case, so the value goes into `transaction_id`.
- Whole stock entry: Grocy changes its location and due date. The row id,
  the `stock_id`, and the open state stay.
- Part of a stock entry: the old stock entry stays at the from location with
  the rest amount and the old due date. Grocy creates a new stock entry at
  the to location with the moved amount and the new due date. The new stock
  entry keeps the same `stock_id`, `open`, and `opened_date`. Two stock
  entries then share one `stock_id`. The new stock entry has a new row id
  and no userfield values.
- Transfer does not merge stock entries afterwards.
- Transfer does not add missing products to the shopping list.

### Freezer and thaw due date rules

Source: service lines 1326 to 1349. The rules apply only when
`FEATURE_FLAG_STOCK_PRODUCT_FREEZING` is on.

| Move | Product field | Value | New due date |
| --- | --- | --- | --- |
| Not freezer to freezer | `default_best_before_days_after_freezing` | more than 0 | today plus that many days |
| Not freezer to freezer | `default_best_before_days_after_freezing` | `-1` | `2999-12-31` |
| Not freezer to freezer | `default_best_before_days_after_freezing` | `0` | unchanged |
| Freezer to not freezer | `default_best_before_days_after_thawing` | more than 0 | today plus that many days |
| Freezer to not freezer | `default_best_before_days_after_thawing` | `0` or `-1` | unchanged |
| Freezer to freezer, or not freezer to not freezer | none | any | unchanged |

- The new due date has no upper limit. It can be later than the old due
  date.
- `is_freezer` is a field of the location.
- The server does not read `should_not_be_frozen`. Only the browser warns
  (transfer.js lines 83 to 94).
- When the due date changes and auto reprint is on, Grocy sends the label
  webhook (lines 1351 to 1367).

### By barcode

Source: controller lines 855 to 878. As on consume: a stock entry Grocycode
sets `stock_entry_id`.

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `Request body could not be parsed (probably invalid JSON format or missing/wrong Content-Type header)` | No body. |
| 400 | `An amount is required` | No `amount` key. |
| 400 | `A transfer from location is required` | No `location_id_from` key. |
| 400 | `A transfer to location is required` | No `location_id_to` key. |
| 400 | `Product does not exist or is inactive` | Unknown or inactive product. |
| 400 | `Source location does not exist` | Unknown or inactive from location. |
| 400 | `Destination location does not exist` | Unknown or inactive to location. |
| 400 | `Transferring tare weight enabled products is not yet possible` | Tare weight product. |
| 400 | `Amount to be transferred cannot be > current stock amount at the source location` | Too much. |
| 400 | `No transaction was found by the given transaction id` | Amount 0, or no stock entry matched `stock_entry_id` at the from location. |
| 400 | `No product with barcode <text> found`, `Invalid Grocycode` | By-barcode path. |
| 403 | `Permission missing: STOCK_TRANSFER` | |

## 4. Units

- None of the three calls has a quantity unit field. `amount` is always in
  the stock unit of the named product (controller lines 257 to 326, 540 to
  579, 810 to 853).
- The consume form and the open button on it send the stock amount that the
  amount picker computed (consume.js lines 20 to 21 and 168 to 169).
- The product field `qu_id_consume` is the default unit of the consume form
  only. The API does not read it.
- The product barcode amount and unit are not used by any of the three
  calls.

## 5. Quick consume and quick open amounts

Sources: `views/productform.blade.php` lines 516 to 537,
`public/viewjs/productform.js` lines 156 and 157,
`migrations/0252.sql` lines 31 to 34, `views/stockoverview.blade.php` lines
199 to 233, `public/viewjs/stockoverview.js` lines 128 to 200,
`public/viewjs/consume.js` lines 107 to 109.

- `quick_consume_amount` and `quick_open_amount` are stored in the stock
  unit. The product form shows the stock unit name next to them. The hint
  says "related to quantity unit stock".
- The server never reads them. Only the browser does.
- The stock overview shows them in the consume unit:
  `quick_consume_amount / qu_factor_consume_to_stock`. It sends the stored
  stock unit value to the API.
- The quick consume button sends `amount`, `spoiled`, and
  `allow_subproduct_substitution: true`. It is disabled when the aggregated
  stock is below the quick consume amount, or for a tare weight product.
- The quick open button sends `amount` and
  `allow_subproduct_substitution: true`. It is disabled when the aggregated
  stock is below the quick open amount, when all stock is open, for a tare
  weight product, or for `disable_open = 1`.
- The consume form uses `quick_consume_amount` as its default amount only
  when the user setting
  `stock_default_consume_amount_use_quick_consume_amount` is on.
- The stock entries page has its own buttons. Consume sends the whole stock
  entry amount with `location_id`, `stock_entry_id`, and `exact_amount:
  true`. Open sends the whole stock entry amount with `stock_entry_id`
  (stockentries.js lines 75 to 79 and 121 to 125).

## 6. Undo of these bookings

Source: service lines 1486 to 1684. The earlier research gives the general
rules. These facts are new.

### The dependent booking check

The check at line 1506 counts later bookings with the same `stock_id` and
`undone = 0` only when this condition is true:
`(correlation_id IS NOT NULL OR correlation_id != :3)`. For a later booking
with a null `correlation_id`, both parts are false or null in SQL. So the
check counts only later bookings with a `correlation_id`. Only transfer
bookings have one.

- A later consume or open does not block an undo.
- A later transfer, or a move on open, blocks an undo of an older booking of
  the same `stock_id`.

### Undo of a consume

- Grocy creates a new stock entry from the stock log row (lines 1524 to
  1547). `open` is true when the row has an `opened_date`.
- The restored due date is the due date of the stock entry at the time of
  the consume. After an open with due days after open, that is the shortened
  due date.
- The undo of a consume does not touch the open booking before it. The
  restored stock entry stays open.

### Undo of an open

Source: lines 1607 to 1622.

- Grocy looks for one stock entry with the same `stock_id`, the same amount
  as the stock log row, and the same purchase date. It sets `open = 0`,
  `opened_date = null`, and the due date from the stock log row (the due
  date before the open).
- After a partial consume, the amount no longer matches. No stock entry
  changes. Grocy still marks the booking undone. No error is returned.
- After a partial open, the sealed rest stays a separate stock entry with
  its own `stock_id`. Undo does not merge them.
- The open booking has no `correlation_id`. The move on open transfer rows
  have one. So an undo of the open booking by its booking id is blocked:
  `400` `"Booking has subsequent dependent bookings, undo not possible"`.
  An undo of the whole transaction works, because it undoes the newest rows
  first.

### Undo of a transfer

Source: lines 1548 to 1606.

- An undo of one transfer booking by booking id undoes both rows with the
  same `correlation_id`, newest first.
- `transfer_to`: Grocy finds the first stock entry with the `stock_id` at the
  to location. It subtracts the amount. At 0 it deletes the stock entry. It
  does not restore the old due date on a remaining stock entry.
- `transfer_from`: Grocy finds the stock entry with the `stock_id` at the
  from location and adds the amount back. When none exists, it creates one.
  The new stock entry has no `location_id` and no `open` value. The trigger
  `set_products_default_location_if_empty_stock` then sets the default
  location of the product (`migrations/0095.sql` lines 1 to 7). So an undo
  of a whole stock entry transfer puts it at the product default location,
  not at the from location. It also comes back sealed, with its
  `opened_date` kept.

### Database transactions

`beginTransaction` appears only in `MergeProducts` and
`CompactStockEntries` (service lines 1703 and 1794). Consume, open,
transfer, and undo write row by row. A failure in the middle leaves the rows
written before it.

## 7. Corrections to the earlier research

| Earlier statement | Code fact | Source |
| --- | --- | --- |
| Stock workflows file: "The freezer due date rules apply on the next purchase, not on the transfer." | The transfer code sets the new due date by the freezer and thaw rules. | Service lines 1326 to 1349. |
| Review queue file: "Example: a consume after a purchase blocks the undo of the purchase." | Only later bookings with a `correlation_id` block. A consume has none. | Service line 1506. |
| Review queue file: "an open with 'move on open' writes one" `correlation_id`. | The open row has none. The transfer rows of the move have one each. | Service lines 1070 to 1084 and 1370. |
| Review queue file: "The API does not check `no_own_stock`. A purchase on a parent product with `no_own_stock = 1` is accepted." | The trigger `prevent_adding_no_own_stock_products_to_stock` aborts any insert into `stock` for such a product with `no_own_stock = 1 products can't be added to stock`. | `migrations/0254.sql` lines 121 to 130. |
| Stock workflows file: consume takes "whole stock entries until the amount is used". | True, but with a location or a stock entry filter, the call can end with less than the amount, and still return `200`. | Service lines 419 to 423 and 430 to 513. |
