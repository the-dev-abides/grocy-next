# Grocy v4.7.1 API calls behind the review queue

This file answers GitHub issue #64. It records the Grocy v4.7.1 API calls
that an accepted pending scan needs. For each call it gives the path, the
required fields, the optional fields, the defaults that Grocy applies, the
response body, and the error responses.

This file records facts, not decisions. It contains no Grocy source code.

The UI side of the same workflows is in `docs/research/grocy-stock-workflows.md`
on the branch `research/grocy-stock-workflows`. This file does not repeat it.

## Question

Which Grocy v4.7.1 API calls sit behind the review queue, and what do they
need? What does the Grocy API return after each booking, so that the Next API
can confirm the stored values?

## Summary

- Seven calls cover the review queue: resolve a barcode, book a purchase,
  book an inventory, add a product barcode, create a product, read the four
  master data lists, and undo a booking or a transaction.
- Every booking call returns the stock log rows of the new transaction. Each
  row holds the stored amount, due date, purchase date, price, location,
  store, note, `stock_id`, and `transaction_id`. The Next API can read the
  stored values from this response.
- All amounts in the API are in the stock unit of the product. The API has no
  unit field on a purchase or an inventory. The client converts the amount
  before it calls the API.
- The barcode lookup returns all product barcodes of the product. The client
  picks the matching row to get the amount and the unit that the barcode
  carries.
- The OpenAPI file differs from the code in four places: the purchase due date
  default, the `stock_label_type` values, the `purchased_date` field, and the
  store default on an inventory. The sections below give each difference.

## Rules that all calls share

Sources: `BaseApiController.php` lines 34 and 158, `ExceptionController.php`,
`PermissionMissingException.php`, `app.php` line 121.

- The base path is `/api`.
- A call with a body needs the header `Content-Type: application/json`,
  with this exact value. Any other value gives `400` with
  `{"error_message": "Bad Content-Type"}`.
- Grocy passes every string value in the body through an HTML filter. It
  keeps booleans and arrays as they are. It restores `&`, `<`, and `>`.
- A handled error gives `400` with `{"error_message": "<text>"}`.
- A missing permission gives `403` with
  `{"error_message": "Permission missing: <PERMISSION_NAME>"}`.
- An unhandled error gives `500` with `error_message` and `error_details`
  (`stack_trace`, `file`, `line`). Grocy turns on error details.
- The examples in the OpenAPI file show numbers as JSON strings, for example
  `"stock_amount": "2"` and `"id": "1"`. A client cannot rely on a JSON
  number type.

## Response after a booking

Sources: `StockApiController.php` line 792 (`StockTransactions`),
`migrations/0157.sql` lines 13 to 35, `migrations/0178.sql` lines 4 and 5,
`StockLogEntry` in `grocy-openapi.json`.

Each booking call (purchase, inventory) ends with the same step. Grocy reads
all stock log rows with the new `transaction_id` and returns them as a JSON
array with status `200`. One stock log row is one booking.

A stock log row has these fields: `id`, `product_id`, `amount`,
`best_before_date`, `purchased_date`, `used_date`, `spoiled`, `stock_id`,
`transaction_type`, `price`, `undone`, `undone_timestamp`, `opened_date`,
`location_id`, `recipe_id`, `correlation_id`, `transaction_id`,
`stock_row_id`, `shopping_location_id`, `user_id`, `note`,
`row_created_timestamp`. The OpenAPI schema `StockLogEntry` lists only twelve
of them. It omits `location_id`, `shopping_location_id`, `price`,
`opened_date`, `user_id`, `undone`, `undone_timestamp`, `correlation_id`,
`stock_row_id`, and `recipe_id`.

Facts about the row values:

- `amount` is in the stock unit. A purchase has a positive amount. A consume
  has a negative amount. An inventory has a positive or a negative amount.
- `stock_id` is the text id of the stock entry (`uniqid()` in PHP). It is not
  the row id of the stock entry. The stock entry Grocycode uses this value.
- `transaction_id` is also a `uniqid()` text. All bookings of one action share
  it.
- When the request has no `location_id`, a database trigger writes the
  default location of the product into the stock log row and into the stock
  entry (`migrations/0095.sql` line 1, `migrations/0157.sql` line 44).
- The row id of the stock entry is not in the response. `GET
  /stock/products/{productId}/entries` or `GET
  /objects/stock?query[]=stock_id=<stock_id>` gives it.

## 1. Resolve a barcode to a product

Path: `GET /stock/products/by-barcode/{barcode}`. No body. No permission
check beyond login.

Sources: `StockApiController.php` line 618, `StockService.php` lines 757 and
823, `Grocycode.php`, `migrations/0170.sql`, `migrations/0238.sql`.

### How Grocy resolves the barcode

1. Grocy tests the text as a Grocycode. A Grocycode has three or more parts
   with `:` between them. Part one is `grcy`. Part two is the type: `p`
   product, `b` battery, `c` chore, `r` recipe. Part three is the object id.
   Further parts are extra data. A product Grocycode is `grcy:p:<product
   id>`. A stock entry Grocycode is `grcy:p:<product id>:<stock_id>`.
2. When the text is a Grocycode with type `p`, part three is the product id.
   The extra data is ignored on this call.
3. When the text is a Grocycode with another type, Grocy returns `400`
   `"Invalid Grocycode"`.
4. When the text is not a Grocycode, Grocy looks for one row in
   `product_barcodes` with the same `barcode`. The comparison ignores case.
   No match gives `400` `"No product with barcode <text> found"`.
5. When the product does not exist or has `active = 0`, Grocy returns `400`
   `"Product does not exist or is inactive"`.

### Response body

A `ProductDetailsResponse` object. The code returns these fields:

| Field | Content |
| --- | --- |
| `product` | The product row with all columns (see section 5). |
| `product_barcodes` | All product barcodes of the product. Each row: `id`, `product_id`, `barcode`, `qu_id`, `amount`, `shopping_location_id`, `last_price`, `note`, `row_created_timestamp`. |
| `quantity_unit_stock`, `default_quantity_unit_purchase`, `default_quantity_unit_consume`, `quantity_unit_price` | One quantity unit row each. |
| `stock_amount` | The own stock of the product, in the stock unit. For a parent product this excludes sub-products. |
| `stock_amount_aggregated` | Own stock plus sub-product stock, converted to the stock unit of the parent. |
| `stock_amount_opened`, `stock_amount_opened_aggregated`, `stock_value` | As the names say. |
| `is_aggregated_amount` | `1` when sub-product stock counts in. |
| `has_childs` | `true` when the product is a parent product. |
| `last_purchased`, `last_used`, `next_due_date` | Dates, or null. |
| `last_price`, `avg_price`, `current_price`, `oldest_price` | Prices per stock unit, or null. `oldest_price` is deprecated and equals `current_price`. |
| `last_shopping_location_id`, `default_shopping_location_id` | Store ids, or null. |
| `location`, `default_consume_location` | Location rows, or null. |
| `qu_conversion_factor_purchase_to_stock`, `qu_conversion_factor_price_to_stock` | Factors from the purchase unit and the price unit to the stock unit. `1.0` when no conversion exists. |
| `average_shelf_life_days`, `spoil_rate_percent` | Statistics. |

The OpenAPI schema omits `stock_value`, `stock_amount_aggregated`,
`stock_amount_opened_aggregated`, `default_shopping_location_id`,
`is_aggregated_amount`, and `default_consume_location`.

### The amount and the unit that a barcode carries

- The response holds all barcodes of the product, not only the scanned one.
  The client finds the row whose `barcode` equals the scanned text, with
  case ignored.
- `amount` is the default amount for the scan, in the unit `qu_id`. It can be
  null.
- `qu_id` is never null for a stored row. A database trigger sets it to the
  stock unit of the product when a client leaves it empty
  (`migrations/0170.sql`).
- The API applies neither `amount` nor `qu_id` to any booking. The client
  converts the amount to the stock unit and sends the result.
- A product Grocycode has no product barcode row. The view
  `product_barcodes_view` (`GET /objects/product_barcodes_view`) adds one
  virtual row per product with `barcode = grcy:p:<id>`, `qu_id` = stock unit,
  and null amount (`migrations/0238.sql`).

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `Invalid Grocycode` | Grocycode with type `b`, `c`, or `r`. |
| 400 | `No product with barcode <text> found` | No product barcode matches. |
| 400 | `Product does not exist or is inactive` | Product id unknown, or `active = 0`. |

## 2. Book a purchase

Paths: `POST /stock/products/{productId}/add` and
`POST /stock/products/by-barcode/{barcode}/add`. The by-barcode path resolves
the product as in section 1, then runs the same code. Extra data in a stock
entry Grocycode is ignored on a purchase.

Permission: `STOCK_PURCHASE`.

Sources: `StockApiController.php` lines 85 and 162, `StockService.php` lines
112 to 306 (`AddProduct`), 1781 (`CompactStockEntries`), 1856 and 1862,
`migrations/0178.sql` lines 63 to 91 (`stock_splits`),
`public/viewjs/components/productamountpicker.js` lines 42 to 44 and 107 to
128, `public/viewjs/purchase.js` lines 30 to 78.

### Fields

| Field | Required | Type | Default | Note |
| --- | --- | --- | --- | --- |
| `amount` | yes | number | none | In the stock unit. Must be more than 0. The key must exist, or Grocy returns `400` `"An amount is required"`. |
| `best_before_date` | no | `YYYY-MM-DD` | computed, see below | A value in another format is ignored without error, and the default applies. |
| `purchased_date` | no | `YYYY-MM-DD` | today | Not in the OpenAPI file for this call. The code accepts it. |
| `price` | no | number | null | Per stock unit. A non-numeric value is ignored. |
| `location_id` | no | integer | null, see below | A non-numeric value is ignored. |
| `shopping_location_id` | no | integer | null | The store. A non-numeric value is ignored. |
| `transaction_type` | no | string | `purchase` | Accepted: `purchase`, `inventory-correction`, `self-production`. Any other value gives `400` `"Transaction type <value> is not valid (StockService.AddProduct)"`. |
| `stock_label_type` | no | integer | `0` | `0` = no label, `1` = single label, `2` = label per unit. The OpenAPI file says `1`, `2`, `3`. The code and the product form use `0`, `1`, `2`. |
| `note` | no | string | null | Stored on the stock entry and the stock log row. |

The call has no field for the quantity unit and no field for the conversion.

### The unit and the conversion

- The API takes `amount` in the stock unit. The Grocy purchase form converts
  the entered amount to the stock unit before it calls the API.
- The form reads the resolved conversions of the product:
  `GET /objects/quantity_unit_conversions_resolved?query[]=product_id=<id>`.
  Each row has `product_id`, `from_qu_id`, `from_qu_name`,
  `from_qu_name_plural`, `to_qu_id`, `to_qu_name`, `to_qu_name_plural`,
  `factor`, and `path`. The form keeps the rows with `from_qu_id` = the
  stock unit. Each such row is one unit in the dropdown, with its `factor`
  from the stock unit to that unit. The stock amount is the entered amount
  divided by that factor.
- The barcode lookup returns the factor for the purchase unit in the other
  direction, as `qu_conversion_factor_purchase_to_stock`. The stock amount is
  the entered amount multiplied by that factor.
- `price` is per stock unit. The form multiplies the entered unit price by
  the factor from the stock unit to the chosen unit. For a total price, the
  form divides the entered price by the entered amount, minus the tare weight
  for a tare weight product, and then multiplies by the same factor.

### Defaults that Grocy applies

- Due date, when `best_before_date` is absent or not a valid date:
  - When `location_id` is given, the location is a freezer, and the feature
    flag `FEATURE_FLAG_STOCK_PRODUCT_FREEZING` is on (default on): the
    product field `default_best_before_days_after_freezing` applies. `-1`
    gives `2999-12-31`. Any other value gives today plus that many days.
  - Else `default_best_before_days` of the product applies. `-1` gives
    `2999-12-31`. A value above 0 gives today plus that many days. `0` gives
    today.
  - The OpenAPI file says "when omitted, the current date is used". That is
    true only when the product has `default_best_before_days = 0`.
- Location, when `location_id` is absent: the stock entry and the stock log
  row get the default location of the product through a database trigger.
- Store, when `shopping_location_id` is absent: null. No store is stored.
- Purchase date, when absent: today.

### Checks

- The product must exist and have `active = 1`. Else `400` `"Product does not
  exist or is inactive"`.
- `amount` must be more than 0. Else `400` `"Amount can't be <= 0"`.
- When `best_before_date` is absent and `location_id` is given, the location
  must exist and have `active = 1`. Else `400` `"Location does not exist"`.
  When `best_before_date` is given, Grocy does not check the location. An
  unknown location id is then stored as given.
- The API does not check `no_own_stock`. A purchase on a parent product with
  `no_own_stock = 1` is accepted.
- Tare weight: when the product has `enable_tare_weight_handling = 1`, the
  amount is the gross weight on the scale, container included. It must be
  more than `tare_weight` plus the current `stock_amount`. Else `400` `"The
  amount cannot be lower or equal than the defined tare weight + current
  stock amount"`. The booked amount is the gross amount minus the current
  stock amount minus the tare weight.

### What Grocy writes

1. One new `transaction_id`.
2. With `stock_label_type` `0` or `1`: one stock log row and one stock entry
   with the full amount. The `stock_id` is a `uniqid()` text.
3. With `stock_label_type` `2`: one stock log row and one stock entry per
   whole unit, each with amount 1 and its own `stock_id` that starts with
   `x`. Each gets its own label webhook when the label printer is on.
4. Grocy then merges stock entries of the product that are equal in due
   date, purchase date, price, open state, opened date, location, store, and
   note. The merged entry keeps the lowest `stock_id` and the highest row id.
   Grocy rewrites the `stock_id` of the merged stock log rows to the kept
   `stock_id`. Stock entries with a `stock_id` that starts with `x` and stock
   entries with userfield values are never merged.

### Response

`200` with the stock log rows of the transaction. One row for label type `0`
or `1`. One row per unit for label type `2`. The `stock_id` in the response
is the kept `stock_id` after the merge. The `amount` in each row is the
booked amount, not the merged total.

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `Bad Content-Type` | Header is not exactly `application/json`. |
| 400 | `Request body could not be parsed (probably invalid JSON format or missing/wrong Content-Type header)` | Body is not valid JSON. |
| 400 | `An amount is required` | No `amount` key. |
| 400 | `Amount can't be <= 0` | Zero or negative amount. |
| 400 | `Product does not exist or is inactive` | Unknown or inactive product. |
| 400 | `Location does not exist` | Unknown or inactive location, only when no due date is given. |
| 400 | `Transaction type <value> is not valid (StockService.AddProduct)` | Bad `transaction_type`. |
| 400 | `The amount cannot be lower or equal than the defined tare weight + current stock amount` | Tare weight product, gross amount too low. |
| 400 | `No product with barcode <text> found`, `Invalid Grocycode` | By-barcode path, see section 1. |
| 403 | `Permission missing: STOCK_PURCHASE` | |

## 3. Book an inventory

Paths: `POST /stock/products/{productId}/inventory` and
`POST /stock/products/by-barcode/{barcode}/inventory`. The by-barcode path
resolves the product as in section 1. Extra data in a stock entry Grocycode is
ignored.

Permission: `STOCK_INVENTORY`.

Sources: `StockApiController.php` lines 457 and 527, `StockService.php` lines
917 to 979 (`InventoryProduct`), 365 to 527 (`ConsumeProduct`), 868
(`GetProductStockEntries`), `migrations/0200.sql` (`stock_next_use`),
`migrations/0233.sql` (`stock_current`), `migrations/0106.sql`
(`products_resolved`).

### Fields

| Field | Required | Type | Default | Applies to |
| --- | --- | --- | --- | --- |
| `new_amount` | yes | number | none | The new total own stock, in the stock unit, across all locations. The key must exist, or Grocy returns `400` `"An new amount is required"`. |
| `best_before_date` | no | `YYYY-MM-DD` | as a purchase (section 2) | Added stock only. |
| `purchased_date` | no | `YYYY-MM-DD` | today | Added stock only. Not in the OpenAPI file. |
| `location_id` | no | integer | null, then the product default by trigger | Added stock only. |
| `price` | no | number | `last_price` of the product | Added stock only. |
| `shopping_location_id` | no | integer | `last_shopping_location_id` of the product | Added stock only. The OpenAPI file says "no store will be affected". The code uses the last store. |
| `stock_label_type` | no | integer | `0` | Added stock only. Values as in section 2. |
| `note` | no | string | null | Added stock only. |

The call has no field for the quantity unit, no field for a location filter
on removed stock, and no field for a specific stock entry.

### What Grocy does

Grocy compares `new_amount` with `stock_amount`, the own stock of the
product.

- Equal: `400` `"The new amount cannot equal the current stock amount"`.
  Nothing is written.
- Higher: Grocy books a purchase of the difference with `transaction_type =
  inventory-correction`. All rules of section 2 apply: due date default,
  location default, tare weight, merge. The existing stock entries keep their
  due dates.
- Lower: Grocy books a consume of the difference with `transaction_type =
  inventory-correction`, `spoiled = false`, from any location, with no
  specific stock entry, and without sub-product substitution. The request
  fields `best_before_date`, `location_id`, `price`,
  `shopping_location_id`, `stock_label_type`, and `note` are not used.

### More than one stock entry with different due dates

- On an increase, Grocy creates one new stock entry with the given or
  computed due date. The other stock entries are not changed. When the new
  stock entry equals an existing one in all merge fields, Grocy merges them.
- On a decrease, Grocy removes stock in this order: stock entries at the
  default consume location of the product first, then open stock entries
  first, then the earliest due date first, then the earliest purchase date
  first. Grocy removes whole stock entries until the difference is used. It
  reduces the amount of the last stock entry. Each removed or reduced stock
  entry is one stock log row with a negative amount. All rows share one
  `transaction_id`.

### New amount lower than the current amount

See "Lower" above. A decrease never fails for lack of stock, because the
difference is at most the own stock. When the user setting
`shopping_list_auto_add_below_min_stock_amount` is on, Grocy also adds
products below their minimum stock to the shopping list.

### Product with a tare weight

When the product has `enable_tare_weight_handling = 1`:

- `new_amount` is the gross weight on the scale, container included.
- Grocy compares `new_amount` with `stock_amount` plus `tare_weight`.
- Equal: `400` `"The new amount cannot equal the current stock amount"`.
- Higher: Grocy passes the gross amount to the purchase code. The purchase
  code books gross minus stock minus tare weight.
- Lower: Grocy passes the gross amount to the consume code. The consume code
  books the absolute value of gross minus stock minus tare weight. When the
  gross amount is lower than `tare_weight`, Grocy returns `400` `"The amount
  cannot be lower than the defined tare weight"`.

### Parent product with sub-products

- `stock_amount` of a parent product is the own stock of the parent only.
  Sub-product stock is in `stock_amount_aggregated`.
- An inventory on a parent product compares `new_amount` with the own stock
  of the parent. It books on the parent only. Sub-product stock is not
  counted and not changed.
- The API does not check `no_own_stock`. An inventory on a parent product
  with `no_own_stock = 1` and own stock 0 books own stock on the parent.
- An inventory on a sub-product works as on any product.
- `has_childs` in the product details tells the client that the product is a
  parent product.

### Response

`200` with the stock log rows of the transaction. One row on an increase
(one per unit with label type `2`). One row per removed or reduced stock
entry on a decrease. Each row has `transaction_type = inventory-correction`.
The sign of `amount` shows the direction. On a decrease, each row carries the
`stock_id`, due date, purchase date, price, location, and store of the stock
entry it took from.

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `An new amount is required` | No `new_amount` key. |
| 400 | `The new amount cannot equal the current stock amount` | No change. |
| 400 | `Product does not exist or is inactive` | Unknown or inactive product. |
| 400 | `Location does not exist` | Increase, no due date given, unknown location. |
| 400 | `The amount cannot be lower than the defined tare weight` | Tare weight product, decrease below the container weight. |
| 400 | `The amount cannot be lower or equal than the defined tare weight + current stock amount` | Tare weight product, increase; not reachable through a normal inventory. |
| 400 | `Bad Content-Type`, body parse error | As in section 2. |
| 400 | `No product with barcode <text> found`, `Invalid Grocycode` | By-barcode path. |
| 403 | `Permission missing: STOCK_INVENTORY` | |

## 4. Add a barcode to an existing product

Path: `POST /objects/product_barcodes`. Permission: `MASTER_DATA_EDIT`.

Sources: `GenericEntityApiController.php` line 14 (`AddObject`),
`migrations/0103.sql` lines 12 to 21, `migrations/0123.sql`,
`migrations/0128.sql`, `migrations/0170.sql`, `migrations/0254.sql` lines 149
to 156, `views/productbarcodeform.blade.php`,
`public/viewjs/productbarcodeform.js` line 24.

### Fields

| Field | Required | Type | Default | Note |
| --- | --- | --- | --- | --- |
| `product_id` | yes | integer | none | Must reference an existing product. A trigger aborts otherwise. |
| `barcode` | yes | string | none | Unique across all products. |
| `qu_id` | no | integer | the stock unit of the product | A trigger fills it when empty or 0. |
| `amount` | no | number | null | The default amount for a scan, in `qu_id`. |
| `shopping_location_id` | no | integer | null | The default store for a scan. |
| `last_price` | no | number | null | The last price paid with this barcode. |
| `note` | no | string | null | The default note for a scan. |

Grocy writes the body as one row. An unknown key gives a database error.

### Checks

- The unique index `ix_product_barcodes` on `barcode` is case-sensitive.
  The lookup in section 1 ignores case. Two rows `abc` and `ABC` can exist;
  a lookup for either returns the first match.
- Grocy does not check that `qu_id` has a conversion to the stock unit of
  the product.
- Grocy does not check `shopping_location_id`.

### Response

`200` with `{"created_object_id": <id>}`.

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `Entity does not exist or is not exposed` | Wrong entity name. |
| 400 | database error text that contains `UNIQUE constraint failed: product_barcodes.barcode` | Barcode exists. |
| 400 | database error text that contains `NOT NULL constraint failed: product_barcodes.barcode` | No barcode. |
| 400 | database error text that contains `product_id doesn't reference a existing product` | Unknown product. |
| 400 | database error text that contains `has no column named <key>` | Unknown key in the body. |
| 400 | `Bad Content-Type`, body parse error | As in section 2. |
| 403 | `Permission missing: MASTER_DATA_EDIT` | |

## 5. Create a product

Path: `POST /objects/products`. Permission: `MASTER_DATA_EDIT`.

Sources: `GenericEntityApiController.php` line 14, `migrations/0207.sql`
lines 52 to 84 (the table), `0210.sql`, `0212.sql`, `0214.sql`, `0219.sql`,
`0248.sql`, `0255.sql` lines 1 to 34, `0257.sql`, `0082.sql` lines 10 to 28,
`config-dist.php` lines 185 to 190, `views/productform.blade.php`,
`public/viewjs/productform.js` lines 355 to 420.

### Required fields

The table has four columns that are `NOT NULL` without a default:

| Field | Type | Note |
| --- | --- | --- |
| `name` | string | Unique across all products. |
| `location_id` | integer | The default location. Grocy does not check that it exists. |
| `qu_id_purchase` | integer | The purchase unit. Grocy does not check that it exists. |
| `qu_id_stock` | integer | The stock unit. Grocy does not check that it exists. |

The Grocy product form also requires `qu_id_consume` and `qu_id_price`. The
API does not. Triggers fill them (see below). The table has no foreign key
clauses.

### Quantity unit fields and their defaults

| Field | Default | How |
| --- | --- | --- |
| `qu_id_stock` | none, required | |
| `qu_id_purchase` | none, required | |
| `qu_id_consume` | `qu_id_stock` | Trigger `default_qu_id_consume` after insert, when the value is empty or 0. |
| `qu_id_price` | `qu_id_purchase` | Trigger `default_qu_id_price` after insert, when the value is empty or 0. |

After the insert, the trigger `products_default_qu_conversions_INS` creates a
product conversion with factor 1 for each of these cases: purchase unit
differs from the stock unit, consume unit differs from the stock unit, price
unit differs from the stock unit. It skips a case when a conversion between
the two units already resolves for the product, for example a general
conversion. The created row is in `quantity_unit_conversions` with
`from_qu_id` = the other unit, `to_qu_id` = the stock unit, `factor = 1`,
`product_id` = the new product.

A client that needs another factor changes that row with
`PUT /objects/quantity_unit_conversions/{id}`. A second
`POST /objects/quantity_unit_conversions` with the same `from_qu_id`,
`to_qu_id`, and `product_id` fails with `Unique constraint violation`.

### Other defaults

| Field | Default | Meaning |
| --- | --- | --- |
| `active` | `1` | |
| `description`, `product_group_id`, `shopping_location_id`, `picture_file_name`, `parent_product_id`, `calories`, `default_consume_location_id` | null | An empty string for `parent_product_id` becomes null by trigger. A product cannot be its own parent. |
| `min_stock_amount` | `0` | |
| `default_best_before_days` | `0` | See "Default due days". |
| `default_best_before_days_after_open` | `0` | |
| `default_best_before_days_after_freezing` | `0` | |
| `default_best_before_days_after_thawing` | `0` | |
| `enable_tare_weight_handling` | `0` | |
| `tare_weight` | `0` | |
| `not_check_stock_fulfillment_for_recipes` | `0` | |
| `cumulate_min_stock_amount_of_sub_products` | `0` | |
| `due_type` | `1` | `1` = best before date, `2` = expiration date. |
| `quick_consume_amount` | `1` | |
| `quick_open_amount` | `1` | |
| `hide_on_stock_overview` | `0` | |
| `default_stock_label_type` | `0` | `0` no label, `1` single label, `2` label per unit. |
| `should_not_be_frozen` | `0` | |
| `treat_opened_as_out_of_stock` | `1` | |
| `no_own_stock` | `0` | |
| `move_on_open` | `0` | |
| `auto_reprint_stock_label` | `0` | |
| `disable_open` | `0` | |
| `default_purchase_price_type` | `1` | `1` unspecified, `2` unit price, `3` total price. |
| `row_created_timestamp` | now | |

The user settings `product_presets_location_id`,
`product_presets_product_group_id`, `product_presets_qu_id`,
`product_presets_default_due_days`, `product_presets_treat_opened_as_out_of_stock`,
and `product_presets_default_stock_label_type` prefill the Grocy product
form in the browser. The API does not apply them.

### Default due days

`default_best_before_days` sets the due date of a purchase without a due
date (section 2). `0` means the due date is the purchase day. `-1` means
never overdue (`2999-12-31`). A value above 0 means that many days after the
purchase day. The OpenAPI schema gives a minimum of 0. The code accepts `-1`.

When the user setting `shopping_list_auto_add_below_min_stock_amount` is on,
Grocy runs the "add missing products to the shopping list" step after each
product create.

### What the product needs before a purchase

- `active = 1`. An inactive product gives `400` on a purchase.
- Nothing else. The purchase computes the due date from
  `default_best_before_days`. It takes the location from `location_id`. It
  stores a null price when none is given.
- A conversion is needed only when the client books in a unit other than
  the stock unit. The client does the conversion.

### Response

`200` with `{"created_object_id": <id>}`. `GET /objects/products/{id}` or
`GET /stock/products/{id}` reads the stored row.

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `Entity does not exist or is not exposed` | Wrong entity name. |
| 400 | database error text that contains `UNIQUE constraint failed: products.name` | Name exists. |
| 400 | database error text that contains `NOT NULL constraint failed: products.<column>` | A required field is missing. |
| 400 | database error text that contains `has no column named <key>` | Unknown key, for example `userfields`. Userfields go through `PUT /userfields/products/{id}`. |
| 400 | database error text that contains `A product cannot reference itself as a parent product` | `parent_product_id` equals the own id. |
| 400 | `Bad Content-Type`, body parse error | As in section 2. |
| 403 | `Permission missing: MASTER_DATA_EDIT` | |

## 6. Read the lists for the scan screens and the short product form

Path: `GET /objects/{entity}` with `entity` = `locations`,
`shopping_locations`, `product_groups`, or `quantity_units`. No permission
check beyond login.

Sources: `GenericEntityApiController.php` line 223 (`GetObjects`),
`BaseApiController.php` lines 49 and 88, `migrations/0002.sql`, `0099.sql`,
`0037.sql`, `0003.sql`, `0030.sql`, `0067.sql`, `0218.sql`,
`StockController.php` lines 49 to 58 and 317 to 326, the `query`, `order`,
`limit`, and `offset` parameters in `grocy-openapi.json`.

### Fields

| Entity | Fields |
| --- | --- |
| `locations` | `id`, `name`, `description`, `active`, `row_created_timestamp`, `userfields` |
| `shopping_locations` | `id`, `name`, `description`, `active`, `row_created_timestamp`, `userfields` |
| `product_groups` | `id`, `name`, `description`, `active`, `row_created_timestamp`, `userfields` |
| `quantity_units` | `id`, `name`, `name_plural`, `plural_forms`, `description`, `active`, `row_created_timestamp`, `userfields` |

`name` is unique and not null in each table. `active` is `0` or `1`, default
`1`. `userfields` is present only when the household has defined userfields
for the entity. It is then an object of name and value pairs, or null.
`locations` also has `is_freezer` (`migrations/0097.sql`).

### Query parameters

- `query[]=<field><op><value>`, repeatable. Operators: `=`, `!=`, `~`
  (contains), `!~`, `<`, `>`, `<=`, `>=`, `§` (regular expression). The
  value `null` also matches rows where the field is null. Example:
  `query[]=active=1`.
- `order=<field>` or `order=<field>:asc` or `order=<field>:desc`. The sort
  uses the default database collation, which is case-sensitive. The Grocy
  pages sort case-insensitive in the server code.
- `limit=<n>` and `offset=<n>`.

The Grocy purchase and inventory pages list locations, stores, and units with
`active = 1`. The product form lists locations, stores, and product groups
with `active = 1`.

### Conversions for the amount picker

`GET /objects/quantity_unit_conversions_resolved?query[]=product_id=<id>`
lists, per product, each pair of units that resolves to a factor. Fields:
`product_id`, `from_qu_id`, `from_qu_name`, `from_qu_name_plural`,
`to_qu_id`, `to_qu_name`, `to_qu_name_plural`, `factor`, `path`.

### Barcodes for a local lookup

`GET /objects/product_barcodes_view` lists every product barcode plus one
virtual row per product for its Grocycode (section 1).

### Response

`200` with a JSON array of rows. An empty table gives `[]`.

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `Entity does not exist or is not exposed` | Wrong entity name, or `api_keys` or `sessions`. |
| 500 | `Invalid query` | A `query[]` value does not match `<field><op><value>`. The code throws outside the handler, so the status is 500. |
| 500 | `Invalid sort order <value>` | `order` suffix is not `asc` or `desc`. |

## 7. Undo a booking

Paths: `POST /stock/bookings/{bookingId}/undo` for one booking, and
`POST /stock/transactions/{transactionId}/undo` for all bookings of one
transaction. No body. Permission: `STOCK_EDIT` for both.

Sources: `StockApiController.php` lines 768, 792, 880, 895,
`StockService.php` lines 1486 to 1684 (`UndoBooking`, `UndoTransaction`).

### Which id to use

The booking response (sections 2 and 3) gives both ids. `id` of a row is the
`bookingId`. `transaction_id` of a row is the `transactionId`. A purchase
with label type `2` and a decrease over several stock entries each create
more than one booking in one transaction. The transaction undo covers them
all.

### Undo of one booking

1. The booking must exist and have `undone = 0`. Else `400` `"Booking does
   not exist or was already undone"`.
2. When the booking has a `correlation_id` (an open with "move on open"
   writes one), Grocy undoes all bookings with that `correlation_id`, newest
   first, and stops.
3. When a later booking with the same `stock_id` exists and is not undone,
   Grocy returns `400` `"Booking has subsequent dependent bookings, undo not
   possible"`. Example: a consume after a purchase blocks the undo of the
   purchase.
4. Purchase, or inventory correction with a positive amount: Grocy deletes
   every stock entry with the `stock_id` of the booking. After a merge
   (section 2), two purchase bookings share one `stock_id` and one stock
   entry. The older booking is then blocked by rule 3. An undo of the newer
   booking deletes the merged stock entry, with the amount of both bookings.
5. Consume, or inventory correction with a negative amount: Grocy creates a
   new stock entry with the values of the booking: amount (made positive),
   due date, purchase date, `stock_id`, price, opened date, open state,
   location, note, store.
6. Grocy sets `undone = 1` and `undone_timestamp` on the booking.
7. Grocy does not merge stock entries after an undo.

### Undo of a transaction

1. Grocy reads all bookings with the `transaction_id` and `undone = 0`,
   newest first. None gives `400` `"This transaction was not found or
   already undone"`.
2. Grocy undoes each booking with the rules above, without the correlation
   step.
3. The loop runs without a database transaction. When one booking fails,
   Grocy returns `400` with that message. The bookings undone before it stay
   undone.

### Response

`204` with no body on success.

To confirm: `GET /stock/transactions/{transactionId}` returns the rows with
`undone = 1` and `undone_timestamp`. `GET /stock/bookings/{bookingId}`
returns one row, or `400` `"Stock booking does not exist"`.
`GET /stock/transactions/{transactionId}` gives `400` `"No transaction was
found by the given transaction id"` for an unknown id.

### Errors

| Status | `error_message` | Cause |
| --- | --- | --- |
| 400 | `Booking does not exist or was already undone` | Unknown or undone booking. |
| 400 | `Booking has subsequent dependent bookings, undo not possible` | A later booking uses the same stock entry. |
| 400 | `This transaction was not found or already undone` | Unknown or undone transaction. |
| 400 | `This booking cannot be undone` | A transaction type with no undo rule. |
| 403 | `Permission missing: STOCK_EDIT` | |

## Sources

OpenAPI: `docs/reference/grocy-openapi.json` in this repo, a copy of
`grocy.openapi.json` at tag `v4.7.1`.

Grocy source at tag `v4.7.1`, <https://github.com/grocy/grocy/tree/v4.7.1>:

| Path | What it gives |
| --- | --- |
| [`controllers/Api/StockApiController.php`](https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/StockApiController.php) | Field parsing and defaults for add, inventory, by-barcode, undo; the transaction response. |
| [`controllers/Api/GenericEntityApiController.php`](https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/GenericEntityApiController.php) | `POST /objects/{entity}` and `GET /objects/{entity}`. |
| [`controllers/Api/BaseApiController.php`](https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/BaseApiController.php) | Content type check, HTML filter, error shape, query filters. |
| [`controllers/ExceptionController.php`](https://github.com/grocy/grocy/blob/v4.7.1/controllers/ExceptionController.php) | Status codes for unhandled errors and permissions. |
| [`controllers/Users/PermissionMissingException.php`](https://github.com/grocy/grocy/blob/v4.7.1/controllers/Users/PermissionMissingException.php) | The 403 message. |
| [`controllers/StockController.php`](https://github.com/grocy/grocy/blob/v4.7.1/controllers/StockController.php) | Which lists the purchase, inventory, and product pages load. |
| [`services/StockService.php`](https://github.com/grocy/grocy/blob/v4.7.1/services/StockService.php) | Due date default, tare weight, consume order, merge, undo, barcode lookup, product details. |
| [`helpers/Grocycode.php`](https://github.com/grocy/grocy/blob/v4.7.1/helpers/Grocycode.php) | The Grocycode format. |
| [`helpers/extensions.php`](https://github.com/grocy/grocy/blob/v4.7.1/helpers/extensions.php) | The `YYYY-MM-DD` date check. |
| [`config-dist.php`](https://github.com/grocy/grocy/blob/v4.7.1/config-dist.php) | Feature flags and the product preset user settings. |
| [`migrations/0207.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0207.sql), [`0210.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0210.sql), [`0212.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0212.sql), [`0214.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0214.sql), [`0219.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0219.sql), [`0248.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0248.sql), [`0255.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0255.sql), [`0257.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0257.sql) | The `products` table, its defaults, and its triggers. |
| [`migrations/0103.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0103.sql), [`0123.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0123.sql), [`0128.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0128.sql), [`0170.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0170.sql), [`0254.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0254.sql), [`0238.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0238.sql) | The `product_barcodes` table, its unique index, its triggers, and `product_barcodes_view`. |
| [`migrations/0002.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0002.sql), [`0003.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0003.sql), [`0030.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0030.sql), [`0037.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0037.sql), [`0067.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0067.sql), [`0097.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0097.sql), [`0099.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0099.sql), [`0218.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0218.sql) | The `locations`, `quantity_units`, `product_groups`, and `shopping_locations` tables. |
| [`migrations/0049.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0049.sql), [`0095.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0095.sql), [`0157.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0157.sql), [`0178.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0178.sql) | The `stock` and `stock_log` tables, the default location triggers, and the `stock_splits` merge view. |
| [`migrations/0082.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0082.sql), [`0188.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0188.sql) | The `quantity_unit_conversions` table and its unique rule. |
| [`migrations/0106.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0106.sql), [`0200.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0200.sql), [`0233.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0233.sql), [`0234.sql`](https://github.com/grocy/grocy/blob/v4.7.1/migrations/0234.sql) | The `products_resolved`, `stock_next_use` (consume order), `stock_current` (own and aggregated stock), and `uihelper_product_details` views. |
| [`views/productform.blade.php`](https://github.com/grocy/grocy/blob/v4.7.1/views/productform.blade.php), [`public/viewjs/productform.js`](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/productform.js) | The required fields of the product form and the preset user settings. |
| [`views/productbarcodeform.blade.php`](https://github.com/grocy/grocy/blob/v4.7.1/views/productbarcodeform.blade.php), [`public/viewjs/productbarcodeform.js`](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/productbarcodeform.js) | The product barcode form and its API call. |
| [`public/viewjs/purchase.js`](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/purchase.js), [`public/viewjs/components/productamountpicker.js`](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/components/productamountpicker.js) | The client side conversion of the amount and the price to the stock unit. |
