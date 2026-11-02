# Research: the Grocy v4.7.1 API surface and its third-party clients

Ticket: [#6](https://github.com/the-dev-abides/grocy-next/issues/6).
Date: 2026-11-01.

## Question

What is the shape of the Grocy v4.7.1 API that the legacy API must
reproduce? The ticket asks for: the endpoint count by module, the
authentication scheme, the generic entity endpoints and the entity list, the
userfield and user entity mechanisms, the undocumented behaviour that clients
depend on, the subset that the M1 companion app needs, and the third-party
clients to protect.

## Sources

The primary sources are the spec copy at `docs/reference/grocy-openapi.json`
and the Grocy source at tag `v4.7.1` (commit `7d15c46`, released
2026-09-04). The file `version.json` at that tag says `4.7.1`. Each claim
below names its source file. The full URL list is in the Sources section at
the end.

## Summary

- The spec defines 74 paths and 87 operations in 13 tags. The router adds one
  more route, `GET /api/openapi/specification`, that the spec does not list.
  All API routes sit under the prefix `/api`.
- Authentication is an API key in the header `GROCY-API-KEY`. The same key
  also works as a query parameter of the same name. A browser session cookie
  also works. The iCal route accepts a special key in the `secret` query
  parameter. A failed API request gets status 401 with an empty body.
- The generic entity endpoints cover 36 entity names. The spec lists them in
  the `ExposedEntity` enum. Four more enums limit listing, edit, and delete.
  The code reads these enums from the spec file at run time.
- Userfields attach key-value data to any exposed entity, to `users`, and to
  user-defined entities. The code builds the userfield entity list at run
  time and injects it into the served spec. The static spec file has
  dangling `$ref` targets for these enums.
- Sixteen behaviours are not in the spec but clients depend on them. The most
  important: the response of `GET /user` is an array, not an object; the
  request body must have `Content-Type: application/json` exactly; every
  string in a request body passes through an HTML purifier; the
  `transaction_type` field of a consume is ignored because of a typo; and
  by-barcode routes accept a Grocycode.
- The M1 companion app needs 27 operations: the by-barcode stock
  actions, the product-id stock actions, undo, the current and volatile
  stock, product details, the external barcode lookup, the generic entity
  endpoints for 8 entities, the shopping list actions, and 4 system routes.
- Four of the five third-party clients together call 54 of the 87
  operations. The fifth, the Grocy MCP, exposes all 87. All five send the
  key in the header. Three read the version from
  `GET /system/info`. Barcode Buddy refuses a server below 4.0.3. Three use
  `query[]` filters. Two read `created_object_id`. Two fetch pictures
  through `/files`.

## Findings

### 1. Endpoint count by module

Source: `docs/reference/grocy-openapi.json` (tags on each operation) and
`routes.php` at v4.7.1.

| Tag in the spec              | Operations |
|------------------------------|-----------:|
| Stock                        | 29         |
| Generic entity interactions  | 7          |
| User management              | 7          |
| Chores                       | 7          |
| System                       | 6          |
| Stock "by-barcode"           | 6          |
| Recipes                      | 6          |
| Current user                 | 5          |
| Batteries                    | 5          |
| Files                        | 3          |
| Tasks                        | 3          |
| Calendar                     | 2          |
| Print                        | 1          |
| **Total**                    | **87**     |

The 87 operations sit on 74 paths. The router in `routes.php` registers 88
routes under `/api`. The one route not in the spec is
`GET /api/openapi/specification`. It serves the spec with run-time values
filled in (see section 4). The router also registers 84 HTML page routes
outside `/api`. Those are the Grocy UI and are not part of the API.

The spec has 47 schemas. Eight of them are string enums that the code reads
at run time: `ExposedEntity`, `ExposedEntityNoListing`,
`ExposedEntityNoEdit`, `ExposedEntityNoDelete`,
`ExposedEntityEditRequiresAdmin`, `StockTransactionType`, `FileGroups`, and
`StringEnumTemplate`. The code in `GenericEntityApiController.php`,
`FilesApiController.php`, and `UserfieldsService.php` opens
`grocy.openapi.json` and reads these enums. The spec file is therefore part
of the Grocy program, not only documentation.

Feature flags do not remove API routes. The router registers every route
without a check of `GROCY_FEATURE_FLAG_*`. The flags only change the UI and
some service behaviour.

### 2. Authentication

Source: `app.php`, `middleware/Auth/BaseAuthMiddleware.php`,
`middleware/Auth/ApiKeyAuthMiddleware.php`,
`middleware/Auth/DefaultAuthMiddleware.php`,
`middleware/Auth/SessionAuthMiddleware.php`,
`middleware/Auth/ReverseProxyAuthMiddleware.php`, `services/ApiKeyService.php`,
`services/SessionService.php`, `controllers/Users/User.php`.

**Header.** The container sets the header name to `GROCY-API-KEY` in
`app.php`. The spec `securitySchemes` names the same header as `ApiKeyAuth`.

**Order of checks for an API route** (`DefaultAuthMiddleware`):

1. Session cookie `grocy_session_access_token`. If it is not valid, the code
   removes it and tries `grocy_session_remember_me_token`. A valid
   remember-me token creates a new access token.
2. API key in the header `GROCY-API-KEY`.
3. API key in the query parameter `GROCY-API-KEY`. The code comment says
   this is "not recommended".
4. Only for the route named `calendar-ical`: the query parameter `secret`
   with a key of type `special-purpose-calendar-ical`.

**API key format.** `ApiKeyService::CreateApiKey` makes 24 random bytes and
hex-encodes them: 48 hex characters. The default expiry is
`2999-12-31 23:59:59`. A key has a `key_type` of `default` or
`special-purpose-calendar-ical`. Only `default` keys pass the normal check.
Each valid use updates `last_used` and then restores the database file
modification time, so `GET /system/db-changed-time` does not change.

**Key creation.** No API route creates a key. The UI route
`/manageapikeys/new` creates one. The entity `api_keys` is in
`ExposedEntityNoListing` and `ExposedEntityNoEdit`, so the generic API can
only delete a key (`DELETE /objects/api_keys/{id}`).

**Failure.** When no check passes, the API gets status 401 and an empty
body. A UI route gets a 302 to `/login`.

**No-auth modes.** When `GROCY_MODE` is `dev`, `demo`, or `prerelease`,
when `GROCY_DISABLE_AUTH` is true, or in an embedded install, every request
runs as the default user. The default user is the user with the lowest `id`
(`SessionService::GetDefaultUser`).

**Other middleware.** `ReverseProxyAuthMiddleware` first tries the API key
for API routes, then reads the username from a header or an environment
variable, and creates the user when it does not exist. `LdapAuthMiddleware`
exists for UI login. `GROCY_AUTH_CLASS` selects the middleware.

**Permissions.** `controllers/Users/User.php` defines 30 permission names,
for example `ADMIN`, `MASTER_DATA_EDIT`, `STOCK_PURCHASE`, `STOCK_CONSUME`,
`STOCK_EDIT`, `SHOPPINGLIST_ITEMS_ADD`, `USERS_READ`. The permissions form
a tree in the `permission_hierarchy` table; `user_permissions_resolved`
expands it. A new user gets `GROCY_DEFAULT_PERMISSIONS`, which is
`['ADMIN']` by default. A missing permission throws
`PermissionMissingException`, a subclass of Slim `HttpForbiddenException`.
Outside a `try` block this gives status 403 with
`{"error_message": "Permission missing: <NAME>"}`. Inside a `try` block
that catches `\Exception` (for example `TrackChoreExecution`), the same
failure gives status 400.

**Sessions.** An access token lives 10 days, a remember-me token 180 days.
The server stores a SHA-256 hash of the token in the `sessions` table.

**CORS.** `CorsMiddleware` adds `Access-Control-Allow-Origin: *` to every
API response. An `OPTIONS` request to any `/api/...` path gets 204 with
`Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS` and
`Access-Control-Allow-Headers: *`.

### 3. The generic entity endpoints and the entity list

Source: `controllers/Api/GenericEntityApiController.php`,
`controllers/Api/BaseApiController.php`, the spec enums.

**Routes.**

| Route                                  | Success | Body on success          |
|----------------------------------------|---------|--------------------------|
| `GET /objects/{entity}`                | 200     | array of rows            |
| `GET /objects/{entity}/{id}`           | 200     | one row                  |
| `POST /objects/{entity}`               | 200     | `{"created_object_id"}`  |
| `PUT /objects/{entity}/{id}`           | 204     | empty                    |
| `DELETE /objects/{entity}/{id}`        | 204     | empty                    |
| `GET /userfields/{entity}/{id}`        | 200     | key-value object         |
| `PUT /userfields/{entity}/{id}`        | 204     | empty                    |

**The 36 entity names** (`ExposedEntity`): `products`, `chores`,
`product_barcodes`, `batteries`, `locations`, `quantity_units`,
`quantity_unit_conversions`, `shopping_list`, `shopping_lists`,
`shopping_locations`, `recipes`, `recipes_pos`, `recipes_nestings`,
`tasks`, `task_categories`, `product_groups`, `equipment`, `api_keys`,
`userfields`, `userentities`, `userobjects`, `meal_plan`, `stock_log`,
`stock`, `stock_current_locations`, `chores_log`, `meal_plan_sections`,
`products_last_purchased`, `products_average_price`,
`quantity_unit_conversions_resolved`, `recipes_pos_resolved`,
`battery_charge_cycles`, `product_barcodes_view`, `permission_hierarchy`,
`uihelper_shopping_list`, `sessions`.

Each name is a SQLite table or view. The code calls
`$this->DB->{$entity}()` with the name as the table name, so the entity
name and the table name are the same.

**Limits on the entities.**

| Enum                              | Members                                                                                                                                                                                                                                                                      |
|-----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ExposedEntityNoListing` (2)      | `api_keys`, `sessions`                                                                                                                                                                                                                                                       |
| `ExposedEntityNoEdit` (14)        | `stock_log`, `api_keys`, `stock`, `stock_current_locations`, `chores_log`, `products_last_purchased`, `products_average_price`, `quantity_unit_conversions_resolved`, `recipes_pos_resolved`, `battery_charge_cycles`, `product_barcodes_view`, `permission_hierarchy`, `uihelper_shopping_list`, `sessions` |
| `ExposedEntityNoDelete` (12)      | the `NoEdit` list without `api_keys` and `sessions`                                                                                                                                                                                                                          |
| `ExposedEntityEditRequiresAdmin`  | empty                                                                                                                                                                                                                                                                        |

The served spec adds four derived enums: `ExposedEntity_NotIncludingNotListable`,
`ExposedEntity_NotIncludingNotEditable`, `ExposedEntity_NotIncludingNotDeletable`,
and `ExposedEntity_IncludingUserEntities`. `OpenApiController::DocumentationSpec`
computes them. The static file references them with `$ref` but does not
define them. A tool that validates the static file will report broken
references. The run-time route `GET /api/openapi/specification` serves a
complete file.

**Permission per entity for POST, PUT, DELETE.**

| Entity                                         | Permission                                            |
|------------------------------------------------|-------------------------------------------------------|
| `shopping_list`, `shopping_lists`              | `SHOPPINGLIST_ITEMS_ADD` (POST, PUT), `SHOPPINGLIST_ITEMS_DELETE` (DELETE) |
| `recipes`, `recipes_pos`, `recipes_nestings`   | `RECIPES`                                             |
| `meal_plan`                                    | `RECIPES_MEALPLAN`                                    |
| `equipment`                                    | `EQUIPMENT`                                           |
| `api_keys` (DELETE only)                       | none                                                  |
| all other entities                             | `MASTER_DATA_EDIT`                                    |

GET has no permission check.

**Query parameters on `GET /objects/{entity}`.** `BaseApiController::QueryData`
applies them in this order: `query[]`, then `limit` and `offset`, then
`order`.

- `query[]` is repeatable. Each value is `<field><op><value>`. The field
  pattern is `[A-Za-z_][A-Za-z0-9_]+`. The operators are `=`, `!=`, `~`
  (SQL `LIKE %value%`), `!~`, `<`, `>`, `<=`, `>=`, and `§` (regular
  expression, through a custom SQLite `REGEXP` function that uses
  `mb_ereg`). The value pattern is `[A-Za-z\p{L}\p{M}0-9*_.$#^| -\\]+`.
- When the value is the word `null` (any case), the code adds
  `OR <field> IS NULL` for `=` and `!=`.
- A value that does not match the pattern throws `Invalid query`. `GetObjects`
  has no `try` block, so the client gets status 500 with
  `{"error_message": "Invalid query"}`. A field that does not exist gives a
  SQLite error, also status 500. The spec documents the 500.
- `order` is `<field>` or `<field>:asc` or `<field>:desc`.
- `limit` without `offset` works. `offset` without `limit` sets the limit
  to -1 (no limit).

The same `QueryData` applies to `GET /users`, `GET /chores`,
`GET /batteries`, `GET /tasks`, `GET /recipes/fulfillment`,
`GET /stock/products/{id}/entries`, `GET /stock/products/{id}/locations`,
and `GET /stock/locations/{id}/entries`. It does not apply to `GET /stock`.

**Write behaviour.**

- `POST` passes the parsed body to `createRow` and `save`. The insert names
  every key in the body as a column. A key that is not a column makes
  SQLite fail, and the client gets status 400 with the SQLite message. Grocy
  does not drop unknown fields. (The claim in `docs/requirements/assistant.md`
  that unknown fields are "silently dropped" describes the Grocy MCP client,
  not Grocy.)
- `PUT` calls `update` with the body. Only the given keys change. `PUT` on a
  missing id gives status 400 `Object not found`. `GET` on a missing id
  gives status 404 `Object not found`. `DELETE` on a missing id gives status
  400 `Object not found`.
- `POST` or `PUT` on `products` has a side effect. When the user setting
  `shopping_list_auto_add_below_min_stock_amount` is true, the code adds
  missing products to the shopping list named by
  `shopping_list_auto_add_below_min_stock_amount_list_id`.
- A `DELETE` does not check references. The SQLite schema does the checks
  through triggers and foreign keys. The error text is the SQLite message.

**Userfields in responses.** `GET /objects/{entity}/{id}` always adds a
`userfields` key. The value is `null` when the entity has no userfields.
`GET /objects/{entity}` adds the `userfields` key to each row only when the
entity has at least one userfield. For the entity `stock`, the userfield
object id is the row's `stock_id`, not `id`.

### 4. Userfields and user entities

Source: `services/UserfieldsService.php`,
`controllers/Api/GenericEntityApiController.php`,
`controllers/Api/OpenApiController.php`, spec schema `Userfield`.

**Userfield definition.** A row in the table `userfields` with: `entity`,
`name`, `caption`, `type`, `show_as_column_in_tables`, `config`,
`sort_number`, `input_required`, `default_value`. The client manages
definitions through `/objects/userfields`. The 14 types are: `checkbox`,
`date`, `datetime`, `number-integral`, `number-decimal`, `number-currency`,
`file`, `image`, `link`, `link-with-title`, `preset-checklist`,
`preset-list`, `text-single-line`, `text-multi-line`.

**Valid entity names for userfields.** `UserfieldsService::GetEntities`
returns the 36 `ExposedEntity` names, plus `users`, plus one name
`userentity-<name>` for each row in `userentities`. The route parameter
`objectId` is a string for userfield routes.

**Values.** The table `userfield_values` stores `field_id`, `object_id`,
`value`. Every value is text. `GET /userfields/{entity}/{id}` returns one
key per defined field. A field with no stored value returns `null`.
`PUT /userfields/{entity}/{id}` needs `MASTER_DATA_EDIT`. It updates or
inserts each given key. A key that is not a defined field gives status 400
with `Field <key> is not a valid userfield of the given entity`. The code
does not validate the value against the field type.

**User entities.** A row in `userentities` defines a custom entity with
`name`, `caption`, `description`, `show_in_sidebar_menu`, `icon_css_class`.
A row in `userobjects` is one object of a user entity and has a
`userentity_id`. The userobject itself has no data columns. All its data
lives in userfields with the entity name `userentity-<name>`. The generic
routes `/objects/userentities` and `/objects/userobjects` manage the rows.

**Served spec.** `DocumentationSpec` builds
`ExposedEntity_IncludingUserEntities` from `GetEntities` at request time.
It also builds `ExposedEntity_IncludingUserEntities_NotIncludingNotEditable`
and adds `stock` to it by hand, because stock rows are not editable but
their userfields are. The served spec also sets `info.version` from
`version.json` and `servers[0].url` to `<base url>/api`.

**Users.** `GET /users` returns rows of the view `users_dto`: `id`,
`username`, `first_name`, `last_name`, `display_name`,
`picture_file_name`, `row_created_timestamp`. The password is not
included. `POST /users` returns 204 and no id. The body accepts `password`
or `password_base64`. `PUT /users/{id}` replaces `username`, `first_name`,
`last_name`, `picture_file_name`, and the password when one is given. The
check is `USERS_EDIT_SELF` for the own id and `USERS_EDIT` for others.
`GET /users/{id}/permissions` returns `user_permissions` rows with
`user_id` and `permission_id`. `POST` adds `{"permission_id": n}`. `PUT`
replaces all with `{"permissions": [n, ...]}`. These three need `ADMIN`.

**Current user.** `GET /user` runs a filtered query on `users_dto`. The
result is a JSON array with one element, not an object. The spec says
object. `GET /user/settings` returns the defaults from `config-dist.php`
merged with the stored rows. `GET /user/settings/{key}` returns
`{"value": ...}` and gives `null` for an unknown key. `PUT` takes
`{"value": ...}`. `DELETE` removes the row.

### 5. Undocumented behaviour that clients depend on

Each item names the source file.

1. **Content type of the request.** `BaseApiController::GetParsedAndFilteredRequestBody`
   requires the header `Content-Type` to be exactly `application/json`. A
   charset suffix fails. The failure is a Slim `HttpException` with code
   400 and the message `Bad Content-Type`. Routes that read the body with
   `getParsedBody` directly (`PUT /users/{id}/permissions`) do not have this
   check.
2. **HTML purifier on the body.** The same function runs every string value
   of the body through HTMLPurifier with an allow-list of tags. Booleans and
   arrays pass unchanged. After the purifier it restores `&`, `<`, `>`. A
   string such as `<script>` disappears. A nested object counts as an array
   and is not purified.
3. **Response content type.** `JsonMiddleware` sets
   `Content-Type: application/json` on every API response unless the
   response has a `Content-Disposition` header. The 204 responses also carry
   this header. The iCal route and the file route set `Content-Disposition`.
4. **Error body.** Every handled error is `{"error_message": "<text>"}`.
   Controllers catch `\Exception` and return 400. Uncaught errors go to
   `ExceptionController`, which returns 500, or the HTTP code when the
   exception is a Slim `HttpException`. In `dev` mode the body also has
   `error_details` with a stack trace.
5. **Stock action responses.** `add`, `consume`, `transfer`, `inventory`,
   `open`, and `PUT /stock/entry/{id}` return status 200 and the array of
   `stock_log` rows with the new `transaction_id`. The undo routes, the
   merge route, and the shopping list routes return 204.
6. **The `transaction_type` typo on consume.** `ConsumeProduct` checks
   `array_key_exists('transaction_type')` but reads
   `$requestBody['transactiontype']`. The second key is never present, so
   the type is always `consume`. The spec documents the field. A client
   cannot set a different type through this route.
7. **Grocycode in the barcode routes.** `GetProductIdFromBarcode` first
   tests the barcode as a Grocycode: `grcy:p:<product id>` with optional
   extra fields separated by `:`. The types are `p` product, `b` battery,
   `c` chore, `r` recipe. When the barcode is a Grocycode of another type,
   the error is `Invalid Grocycode`. For `consume`, `open`, and `transfer`
   by barcode, a Grocycode with a stock id (`grcy:p:<id>:<stock_id>`) sets
   `stock_entry_id` in the body. `add` and `inventory` by barcode ignore the
   extra field. A plain barcode matches `product_barcodes.barcode` with
   `COLLATE NOCASE`.
8. **Numbers, nulls, and dates.** `DatabaseService` sets
   `PDO::ATTR_ORACLE_NULLS` to `NULL_EMPTY_STRING`, so an empty string in the
   database comes back as `null`. Grocy requires PHP 8.5. Since PHP 8.1 the
   SQLite driver returns integers and floats as native JSON numbers, not
   strings. Booleans are integers 0 and 1 in SQLite. Dates are `Y-m-d`.
   Timestamps are `Y-m-d H:i:s` in server local time with no zone. The
   `row_created_timestamp` default is `datetime('now', 'localtime')`.
9. **`db-changed-time`.** `GET /system/db-changed-time` returns the
   modification time of the SQLite file. API key and session validation
   restore the time after they write `last_used`, so a read does not change
   it. Clients poll this route to detect changes.
10. **`system/info` and `system/config`.** `GET /system/info` returns
    `grocy_version` (an object with `Version` and `ReleaseDate`),
    `php_version`, `sqlite_version`, `db_version` (the highest row in the
    `migrations` table), `os`, and `client` (the caller's user agent). The
    spec omits the last three. `GET /system/config` returns every
    `GROCY_*` constant without the `GROCY_` prefix, minus 14 secret or
    internal names. Clients read `FEATURE_FLAG_*` and `CURRENCY` from it.
11. **Defaults in stock actions.** `add` defaults `transaction_type` to
    `purchase`, `purchased_date` to today, and `stock_label_type` to 0.
    `add` accepts `purchased_date`, which the spec omits. `consume` and
    `open` use the string `default` as the sentinel for "no specific stock
    entry". `GET /stock/volatile` takes `due_soon_days` (default 5).
    `GET /stock/products/{id}/entries` and `/locations` take
    `include_sub_products`. `GET /stock/barcodes/external-lookup/{barcode}`
    takes `add=true` to create the product and needs `MASTER_DATA_EDIT`.
12. **Files.** The `{fileName}` path segment is the base64 of the real file
    name. `GET` also accepts `<base64 stored name>_<base64 output name>`.
    The query parameters `force_serve_as=picture`, `best_fit_height`, and
    `best_fit_width` return a downscaled copy. The file groups are
    `equipmentmanuals`, `recipepictures`, `productpictures`, `userfiles`,
    `userpictures`. `PUT` writes the raw body and fails when the file
    exists. A missing file gives 404.
13. **Caching headers.** `GET /system/localization-strings` and the file
    route send `Cache-Control: max-age=2592000`.
14. **Locale from the request.** `LocaleMiddleware` picks the locale from
    the user setting `locale`, then from `Accept-Language`, then from
    `GROCY_DEFAULT_LOCALE`. This affects `localization-strings` and the
    `due_date` label text in the print-label responses.
15. **`GET /stock` has no filter.** `CurrentStock` ignores query
    parameters and returns every row of the view `stock_current` with a
    nested `product` object.
16. **`GET /stock/products/{id}`** fails with status 400
    `Product does not exist or is inactive` for an inactive product. The
    response has 28 keys; the spec lists 23. The extra keys are
    `stock_value`, `stock_amount_aggregated`,
    `stock_amount_opened_aggregated`, `default_shopping_location_id`,
    `is_aggregated_amount`, and `default_consume_location`. The spec lists
    `default_location`, which the code does not return.

### 6. The subset that the M1 companion app needs

The M1 milestone is "Fast workflows": the user scans one item after another,
each scan becomes a pending scan, and the review queue turns accepted scans
into bookings (`docs/requirements/human.md`, `GLOSSARY.md`). The app owns the
review queue and calls Grocy for everything else. This list follows from
those requirements. It is a proposal, not a decision.

**Must call** (27 operations):

| Purpose                              | Operations                                                                                                                                                 |
|--------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Find the product from a scan         | `GET /stock/products/by-barcode/{barcode}`, `GET /stock/barcodes/external-lookup/{barcode}`                                                                 |
| Book an accepted scan                | `POST /stock/products/{id}/add`, `/consume`, `/inventory`, `/open`, `/transfer`                                                                            |
| Undo a booking                       | `POST /stock/transactions/{id}/undo`, `GET /stock/transactions/{id}`                                                                                         |
| Show stock                           | `GET /stock`, `GET /stock/volatile`, `GET /stock/products/{id}`, `GET /stock/products/{id}/entries`, `GET /stock/entry/{id}`, `PUT /stock/entry/{id}`       |
| Create a product for an unknown code | `POST /objects/products`, `POST /objects/product_barcodes`, `GET /objects/{entity}` and `GET /objects/{entity}/{id}` for `products`, `product_barcodes`, `locations`, `quantity_units`, `quantity_unit_conversions_resolved`, `product_groups`, `shopping_locations` |
| Shopping list                        | `POST /stock/shoppinglist/add-product`, `/remove-product`, `/add-missing-products`, `GET /objects/shopping_list`                                              |
| Connection and change detection      | `GET /system/info`, `GET /system/db-changed-time`, `GET /system/config`, `GET /user`                                                                        |

**Behaviours from section 5 that this subset touches:** items 1, 2, 5, 6, 7,
8, 9, 10, 11, 15, 16.

**Not needed in M1:** chores, batteries, tasks, recipes, meal plan, files,
users and permissions, user settings, calendar, print, equipment. These are
parity work (M4).

### 7. Third-party clients to protect

A parallel survey read each client's source on 2026-11-01. The release data
comes from `gh release view`. The URL list is in the Sources section.

| Client                      | Latest release        | Grocy version it declares                 | Auth header     | Reads `system/info` version | Uses `query[]` | Uses userfields                 | Reads `created_object_id` | Uses `/files` |
|-----------------------------|-----------------------|-------------------------------------------|-----------------|-----------------------------|----------------|---------------------------------|---------------------------|---------------|
| Grocy Android               | v3.8.3, 2026-01-02    | none in README; code gates on 3.2 to 4.0  | `GROCY-API-KEY` | yes, login fails without it | yes, all 9 ops | `/objects/userfields` only      | yes                       | yes, GET      |
| Home Assistant + pygrocy2   | 2025.7.0, 2025-07-16  | "3.2 and above"                           | `GROCY-API-KEY` | yes, credential test only   | yes            | library only, integration no    | no                        | yes, GET, PUT |
| Barcode Buddy               | v1.9.0.1, 2026-09-25  | minimum `4.0.3`, enforced                 | `GROCY-API-KEY` | yes, rejects below 4.0.3    | no             | no                              | no                        | no            |
| Grocy MCP                   | none; package 0.1.0   | none; vendored spec says `xxx`            | `GROCY-API-KEY` | pass-through                | pass-through   | pass-through                    | no                        | pass-through  |
| Grocy Mealie Sync           | v1.18.0, 2026-10-06   | "tested with Grocy 4.x"; vendored 4.6.0   | `GROCY-API-KEY` | no                          | yes, `=`, `~`  | no                              | yes                       | no            |

No client sends the key as a query parameter. No client reads the HTML pages.

**Grocy Android** (`app/src/main/java/xyz/zedler/patrick/grocy/api/GrocyApi.java`).
It builds `baseUrl + "/api" + path`. It calls:

- `GET /objects/{entity}`, `GET /objects/{entity}/{id}`, and filtered lists
  for 20 entities: `products`, `locations`, `shopping_locations`,
  `quantity_units`, `quantity_unit_conversions`,
  `quantity_unit_conversions_resolved`, `product_barcodes`, `shopping_list`,
  `shopping_lists`, `recipes`, `recipes_pos`, `recipes_pos_resolved`,
  `recipes_nestings`, `product_groups`, `meal_plan`, `meal_plan_sections`,
  `tasks`, `task_categories`, `chores`, `userfields`, `stock_log`.
- `GET /system/info`, `/system/config`, `/system/db-changed-time`.
- `GET /users`, `/user`, `/user/settings`, `/user/settings/{key}`.
- `GET /stock`, `/stock/volatile`, `/stock/products/{id}`,
  `/stock/products/{id}/locations`, `/stock/products/{id}/entries`,
  `/stock/products/{id}/price-history`, `/stock/products/by-barcode/{barcode}`.
- `POST /stock/products/{id}/add`, `/consume`, `/transfer`, `/inventory`,
  `/open`; `POST /stock/transactions/{id}/undo`.
- `POST /stock/shoppinglist/add-missing-products`, `/clear`.
- `POST /tasks/{id}/complete`, `/undo`.
- `GET /chores`, `/chores/{id}`; `POST /chores/{id}/execute`.
- `GET /recipes/fulfillment`; `POST /recipes/{id}/consume`,
  `/add-not-fulfilled-products-to-shoppinglist`, `/copy`.
- `GET /files/recipepictures/{base64}` and `/files/productpictures/{base64}`
  with `force_serve_as=picture`, `best_fit_height`, `best_fit_width`.

It reads `grocy_version.Version` from `GET /system/info` and gates features
on server versions 3.2.0, 3.3.0, 3.3.1, and 4.0.0 (`util/VersionUtil.java`,
`util/ConfigUtil.java`). Login fails when the response has no
`grocy_version`. It uses all nine `query[]` operators, including `§`. It
reads `created_object_id` after `POST /objects`. It can also send HTTP
Basic credentials from the URL and a Home Assistant ingress cookie.

**Home Assistant integration.** The `manifest.json` requires
`pygrocy2==2.4.1`, not the original pygrocy. pygrocy2 is a fork at
`iamkarlson/pygrocy2` (release v2.7.1, 2026-02-07) and its README says it
moved to `iamkarlson/grocy-py`. The survey did not verify `grocy-py`. The
original pygrocy (`SebRut/pygrocy`, v2.1.0, 2024-04-23) client file
`pygrocy/grocy_api_client.py` calls:

- `GET stock`, `stock/volatile`, `stock/products/{id}`,
  `stock/products/by-barcode/{barcode}`.
- `GET chores`, `chores/{id}`; `POST chores/{id}/execute`.
- `POST stock/products/{id}/add`, `/consume`, `/open`, `/inventory`;
  `POST stock/products/by-barcode/{barcode}/add`, `/consume`, `/inventory`.
- `POST recipes/{id}/consume`.
- `GET objects/shopping_list`, `objects/product_groups`, `objects/meal_plan`,
  `objects/recipes/{id}`, `objects/tasks/{id}`,
  `objects/meal_plan_sections?query[]=id={id}`.
- `POST stock/shoppinglist/add-missing-products`, `/add-product`, `/clear`,
  `/remove-product`.
- `PUT files/productpictures/{base64}`; `PUT objects/products/{id}`.
- `GET` and `PUT userfields/{entity}/{objectId}`.
- `GET system/db-changed-time`, `/info`, `/time`, `/config`.
- `GET tasks`; `POST tasks/{id}/complete`.
- `GET batteries`, `batteries/{id}`; `POST batteries/{id}/charge`.
- Generic `POST objects/{entity}`, `PUT` and `DELETE objects/{entity}/{id}`,
  `GET objects/{entity}` with `query[]`.
- `GET users`.

pygrocy2 adds `GET objects/{entity}/{objectId}` and `objects/equipment`.
The integration validates credentials with `GET /system/info` and does not
compare the version. It proxies pictures through
`GET /api/files/{group}/{file}?force_serve_as=picture&best_fit_width=N`.
It sends `accept: application/json` with the key header.

**Barcode Buddy** (`incl/api.inc.php`, `incl/curl.inc.php`). It calls
`GET objects/products`, `GET` and `POST objects/product_barcodes`,
`PUT objects/product_barcodes/{id}`, `GET stock/products/{id}`,
`GET stock/products/{id}/locations`, `POST stock/products/{id}/open`,
`/add`, `/consume`, `GET stock/products/by-barcode/{barcode}`, `GET stock`,
`POST stock/shoppinglist/add-product`, `/remove-product`,
`GET objects/chores`, `GET objects/chores/{id}`, `POST chores/{id}/execute`,
`GET system/info`, and `GET system/time?offset=N`. It defines
`MIN_GROCY_VERSION = "4.0.3"` and rejects a server whose
`grocy_version.Version` is missing or lower. The `offset` parameter on
`system/time` is in the code but the spec lists it under a different
parameter name.

**Grocy MCP** (`thijserven/grocy-mcp`). It generates one tool per
operation from a vendored copy of the spec (73 paths, 86 operations) and
adds one hand-written tool for `GET /openapi/specification`. It passes
every request through without interpretation. Repeated query keys work, so
`query[]` works. It sends `GROCY-API-KEY`, `Accept: application/json`, and
a `User-Agent`. The vendored spec version is `xxx`, so the Grocy version it
targets is not verified.

**Grocy Mealie Sync** (`src/lib/grocy/init.ts`, `src/lib/grocy/types.ts`).
It uses a generated client with base `grocyUrl + '/api'`. It calls
`GET` and `POST /objects/{entity}`, `GET`, `PUT`, and
`DELETE /objects/{entity}/{objectId}` for `products`, `quantity_units`,
`quantity_unit_conversions`, `shopping_list`, `shopping_lists`,
`shopping_locations`, `locations`, `product_groups`, `product_barcodes`,
and `stock_log`; `GET /stock`, `/stock/volatile`,
`/stock/products/{productId}`, `/stock/products/{productId}/entries`,
`/stock/locations/{locationId}/entries`, `/stock/entry/{entryId}`;
`PUT /stock/entry/{entryId}`; `GET /stock/transactions/{transactionId}`;
`POST /stock/transactions/{transactionId}/undo`;
`POST /stock/products/{productId}/add`, `/consume`, `/open`, `/inventory`;
`GET /stock/products/by-barcode/{barcode}`. It reads `created_object_id`
in at least eight files. It filters `stock_log` with
`query[]=product_id=N` and `query[]=note~text`, so it needs the `~`
operator. It does not call `system/info`.

**Union of the clients.** The Grocy MCP exposes all 87 operations as
pass-through tools. The other four clients together call 54 of the 87
operations. The 33 operations that none of the four calls are: the five
print-label routes, the two calendar routes, the thermal print route, the
two by-barcode routes `transfer` and `open`, the shopping list routes
`add-overdue-products` and `add-expired-products`, the two stock booking
routes, the product `copy` and `merge` routes, the external barcode lookup,
the recipe fulfillment-by-id route, the chore undo, merge, and
calculate-next-assignments routes, the battery undo route, the six user
create, edit, delete, and permission routes, the two user setting write
routes, the file delete route, and the two localization routes. The M1 app
in section 6 adds the external barcode lookup to this set.

## Recommendation

Treat the run-time served spec, not the static file, as the contract for the
legacy API. Add the 16 behaviours in section 5 as written contract items. Make
the union of the five clients' calls (section 7) plus the M1 subset
(section 6) the first conformance target, and the remaining 32 operations
the second. The reason: the static file has broken `$ref` targets and omits
fields that the clients read, so a contract test generated from it alone
would pass against a server that breaks the Grocy Android app or Barcode
Buddy. The version field in `GET /system/info` must report a Grocy version
of at least `4.0.3`, or Barcode Buddy refuses to connect.

The maintainer decides.

## Sources

- Spec copy: `docs/reference/grocy-openapi.json` in this repo, a copy of
  <https://raw.githubusercontent.com/grocy/grocy/v4.7.1/grocy.openapi.json>.
- Release: <https://github.com/grocy/grocy/releases/tag/v4.7.1>
  (published 2026-09-04, commit `7d15c46bbdc35d4958cae99209ba170667dc1d64`).
- `version.json`: <https://github.com/grocy/grocy/blob/v4.7.1/version.json>
- `routes.php`: <https://github.com/grocy/grocy/blob/v4.7.1/routes.php>
- `app.php`: <https://github.com/grocy/grocy/blob/v4.7.1/app.php>
- `config-dist.php`: <https://github.com/grocy/grocy/blob/v4.7.1/config-dist.php>
- `BaseApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/BaseApiController.php>
- `GenericEntityApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/GenericEntityApiController.php>
- `StockApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/StockApiController.php>
- `UsersApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/UsersApiController.php>
- `SystemApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/SystemApiController.php>
- `FilesApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/FilesApiController.php>
- `OpenApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/OpenApiController.php>
- `CalendarApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/CalendarApiController.php>
- `ChoresApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/ChoresApiController.php>
- `RecipesApiController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/RecipesApiController.php>
- `ExceptionController.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/ExceptionController.php>
- `User.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Users/User.php>
- `PermissionMissingException.php`: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Users/PermissionMissingException.php>
- `BaseAuthMiddleware.php`: <https://github.com/grocy/grocy/blob/v4.7.1/middleware/Auth/BaseAuthMiddleware.php>
- `ApiKeyAuthMiddleware.php`: <https://github.com/grocy/grocy/blob/v4.7.1/middleware/Auth/ApiKeyAuthMiddleware.php>
- `DefaultAuthMiddleware.php`: <https://github.com/grocy/grocy/blob/v4.7.1/middleware/Auth/DefaultAuthMiddleware.php>
- `SessionAuthMiddleware.php`: <https://github.com/grocy/grocy/blob/v4.7.1/middleware/Auth/SessionAuthMiddleware.php>
- `ReverseProxyAuthMiddleware.php`: <https://github.com/grocy/grocy/blob/v4.7.1/middleware/Auth/ReverseProxyAuthMiddleware.php>
- `CorsMiddleware.php`: <https://github.com/grocy/grocy/blob/v4.7.1/middleware/CorsMiddleware.php>
- `JsonMiddleware.php`: <https://github.com/grocy/grocy/blob/v4.7.1/middleware/JsonMiddleware.php>
- `LocaleMiddleware.php`: <https://github.com/grocy/grocy/blob/v4.7.1/middleware/LocaleMiddleware.php>
- `ApiKeyService.php`: <https://github.com/grocy/grocy/blob/v4.7.1/services/ApiKeyService.php>
- `SessionService.php`: <https://github.com/grocy/grocy/blob/v4.7.1/services/SessionService.php>
- `UserfieldsService.php`: <https://github.com/grocy/grocy/blob/v4.7.1/services/UserfieldsService.php>
- `UsersService.php`: <https://github.com/grocy/grocy/blob/v4.7.1/services/UsersService.php>
- `StockService.php`: <https://github.com/grocy/grocy/blob/v4.7.1/services/StockService.php>
- `DatabaseService.php`: <https://github.com/grocy/grocy/blob/v4.7.1/services/DatabaseService.php>
- `ApplicationService.php`: <https://github.com/grocy/grocy/blob/v4.7.1/services/ApplicationService.php>
- `DatabaseMigrationService.php`: <https://github.com/grocy/grocy/blob/v4.7.1/services/DatabaseMigrationService.php>
- `Grocycode.php`: <https://github.com/grocy/grocy/blob/v4.7.1/helpers/Grocycode.php>
- `extensions.php`: <https://github.com/grocy/grocy/blob/v4.7.1/helpers/extensions.php>
- `composer.json` (PHP 8.5 requirement): <https://github.com/grocy/grocy/blob/v4.7.1/composer.json>
- LessQL fork (`Result::jsonSerialize`, `Row::save`): <https://github.com/berrnd/lessql/blob/master/src/LessQL/Result.php>, <https://github.com/berrnd/lessql/blob/master/src/LessQL/Row.php>, <https://github.com/berrnd/lessql/blob/master/src/LessQL/Database.php>
- PHP 8.1 PDO SQLite native types: <https://www.php.net/manual/en/migration81.incompatible.php>

Third-party clients (read on 2026-11-01, default branch unless noted):

- Grocy Android: <https://github.com/patzly/grocy-android>; release <https://github.com/patzly/grocy-android/releases/tag/v3.8.3>; `GrocyApi.java` <https://github.com/patzly/grocy-android/blob/master/app/src/main/java/xyz/zedler/patrick/grocy/api/GrocyApi.java>; `RequestHeaders.java` <https://github.com/patzly/grocy-android/blob/master/app/src/main/java/xyz/zedler/patrick/grocy/web/RequestHeaders.java>; `VersionUtil.java` <https://github.com/patzly/grocy-android/blob/master/app/src/main/java/xyz/zedler/patrick/grocy/util/VersionUtil.java>; `ConfigUtil.java` <https://github.com/patzly/grocy-android/blob/master/app/src/main/java/xyz/zedler/patrick/grocy/util/ConfigUtil.java>.
- Home Assistant integration: <https://github.com/custom-components/grocy>; release <https://github.com/custom-components/grocy/releases/tag/2025.7.0>; `manifest.json` <https://github.com/custom-components/grocy/blob/master/custom_components/grocy/manifest.json>; `grocy_data.py` <https://github.com/custom-components/grocy/blob/master/custom_components/grocy/grocy_data.py>; `config_flow.py` <https://github.com/custom-components/grocy/blob/master/custom_components/grocy/config_flow.py>.
- pygrocy: <https://github.com/SebRut/pygrocy>; release <https://github.com/SebRut/pygrocy/releases/tag/v2.1.0>; `grocy_api_client.py` <https://github.com/SebRut/pygrocy/blob/develop/pygrocy/grocy_api_client.py>.
- pygrocy2: <https://github.com/iamkarlson/pygrocy2>; `grocy_api_client.py` <https://github.com/iamkarlson/pygrocy2/blob/main/pygrocy2/grocy_api_client.py>.
- Barcode Buddy: <https://github.com/Forceu/barcodebuddy>; release <https://github.com/Forceu/barcodebuddy/releases/tag/v1.9.0.1>; `api.inc.php` <https://github.com/Forceu/barcodebuddy/blob/master/incl/api.inc.php>; `curl.inc.php` <https://github.com/Forceu/barcodebuddy/blob/master/incl/curl.inc.php>.
- Grocy MCP: <https://github.com/thijserven/grocy-mcp>; `client.ts` <https://github.com/thijserven/grocy-mcp/blob/main/src/api/client.ts>; `generate-tools.mjs` <https://github.com/thijserven/grocy-mcp/blob/main/scripts/generate-tools.mjs>; tool catalog <https://github.com/thijserven/grocy-mcp/blob/main/docs/tool-catalog.md>.
- Grocy Mealie Sync: <https://github.com/HarmEllis/grocy-mealie-sync>; release <https://github.com/HarmEllis/grocy-mealie-sync/releases/tag/v1.18.0>; `init.ts` <https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/lib/grocy/init.ts>; `types.ts` <https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/lib/grocy/types.ts>; `product-sync.ts` <https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/lib/sync/product-sync.ts>.
