# Survey of Grocy Mealie Sync and grocy-mcp

This file answers GitHub issue #36. It describes what the two tools do today.
Grocy Next replaces both. The grilling ticket "Break Grocy Next into
subdomains" (issue #30) uses this file to decide what the Mealie link
subdomain owns.

This file contains no source code from either tool. It describes only.

## Sources

| Tool | Version surveyed | Why this version |
| --- | --- | --- |
| Grocy Mealie Sync, <https://github.com/HarmEllis/grocy-mealie-sync> | Tag `v1.18.0`, released 2026-10-06 | GitHub marks it "Latest". The newer tags `v1.19.0-rc.1` to `v1.19.0-rc.23` are pre-releases. |
| grocy-mcp, <https://github.com/thijserven/grocy-mcp> | Branch `main`, commit `9070240`, pushed 2026-08-15 | The repo has no release and no tag. |
| Grocy, <https://github.com/grocy/grocy> | Tag `v4.7.1` | The version that `docs/reference/grocy-openapi.json` and `docs/research/grocy-survey.md` describe. Used to check the defects. |

Files read in Grocy Mealie Sync: `README.md`, `CHANGELOG.md`, `docs/SPEC.md`,
`docs/MCP-SPEC.md`, `docs/mealie-in-possession.md`, `src/lib/db/schema.ts`,
`src/lib/sync/*.ts`, `src/lib/settings.ts`, `src/lib/config.ts`,
`src/lib/grocy/types.ts`, `src/lib/mapping-conflicts*.ts`,
`src/lib/history-types.ts`, `src/lib/use-cases/**/*.ts`, `src/mcp/**/*.ts`,
`src/app/api/**/route.ts`, `src/lib/api-endpoints.ts`.

Files read in grocy-mcp: `README.md`, `docs/tool-catalog.md`,
`docs/reference-architecture.md`, `src/tools/definitions.ts`,
`src/server.ts`, `src/api/client.ts`, `scripts/generate-tools.mjs`,
`openapi/grocy.openapi.json`.

Files read in Grocy: `controllers/Api/StockApiController.php`,
`controllers/Api/GenericEntityApiController.php`,
`controllers/Api/BaseApiController.php`, `services/StockService.php`,
`services/DatabaseService.php`, `views/productform.blade.php`.

The glossary terms apply. A "link" in this file is what the sync tool calls a
"mapping": one record that connects a Grocy product to a Mealie food, or a
Grocy quantity unit to a Mealie unit.

---

## Part 1: Grocy Mealie Sync v1.18.0

### What it is

A Next.js 16 server. It runs in one Docker container. It has:

- A scheduler that polls Grocy and Mealie.
- A web UI (dashboard, mapping wizard, units and conversions, history, settings).
- A REST API (17 endpoints, see below).
- An MCP endpoint at `/api/mcp` (off by default, `MCP_ENABLED=true` turns it on). It uses Streamable HTTP with sessions.
- A device API under `/api/device/v1` for the barcode scanner project `grocy-mealie-scanner`.
- One SQLite database (default `./data/sync.db`).

It talks to Grocy with a client generated from the Grocy 4.6.0 OpenAPI spec
(86 operations). It talks to Mealie with a client generated from the Mealie
v3.14.0 OpenAPI spec. The README says it is tested with Grocy 4.x and Mealie
v3.12.0. The conversion library needs Mealie 3.13 or newer.

### Grocy API operations it calls

`GET/POST/PUT/DELETE /objects/{entity}` for the entities `products`,
`quantity_units`, `quantity_unit_conversions`, `locations`, `product_groups`,
`product_barcodes`, `shopping_list`; `GET /stock`; `GET /stock/volatile`;
`GET /stock/products/{productId}`; `GET /stock/products/{productId}/entries`;
`GET /stock/locations/{locationId}/entries`; `GET /stock/entry/{entryId}`;
`PUT /stock/entry/{entryId}`; `POST /stock/products/{productId}/add`,
`/consume`, `/inventory`, `/open`; `GET /stock/transactions/{transactionId}`;
`GET /stock/products/by-barcode/{barcode}`.

It calls no other Grocy operation. It does not use undo, transfer, merge,
price history, recipes, chores, tasks, batteries, or the shopping list
"add missing" operations.

### Mealie API operations it calls

Foods (list, get one, create, update, delete), units (list, get one, create,
update, delete), household shopping list items (list, create, update,
delete), `GET /api/users/self` (for the household slug), recipes (list and get
one, only to check if a unit is still in use before a delete), and
`GET /api/app/about` (version check for the conversion library).

It does not read Mealie recipe ingredients for any other purpose. It does not
read Mealie meal plans or timeline events.

### Sync run types

The scheduler runs four cycle types. Each cycle has one or more steps.

| Cycle | When | Steps, in order |
| --- | --- | --- |
| `initial` | Once at start-up, before the timers start | `product_sync`, `conflict_check` |
| `poll` | Every `POLL_INTERVAL_SECONDS` (default 60) | `mealie_to_grocy`, `grocy_to_mealie`, `conflict_check` |
| `product_sync` | Every `PRODUCT_SYNC_INTERVAL_HOURS` (default 6) | `product_sync`, `conflict_check` |
| `cleanup` | Every 24 hours | `shopping_cleanup` |

What each step does:

| Step | What it does |
| --- | --- |
| `product_sync` | Lists all Mealie units and all Mealie foods. For each one with no link: finds a Grocy quantity unit or product with the same name (case-insensitive; for units also the Mealie abbreviation). Creates the link. If no match exists and `AUTO_CREATE_UNITS` or `AUTO_CREATE_PRODUCTS` is on, creates the Grocy unit or product first. A new Grocy product gets `min_stock_amount` 0, the configured default unit as purchase and stock unit, and the first Grocy location in the list. Then fills the unit link of product links that have none. Mealie is the source. Grocy products with no Mealie food are not created in Mealie. |
| `mealie_to_grocy` | Reads all items on the configured Mealie shopping list. For each item that changed from unchecked to checked since the last poll: adds stock in Grocy with a purchase booking for the item quantity (quantity 0 or empty counts as 1), then deletes the matching rows from Grocy's shopping list. The first poll after start only records the checked state. Unchecking an item does nothing. Items without a food are skipped. |
| `grocy_to_mealie` | Reads `GET /stock/volatile` and compares the `missing_products` list with the list from the last poll. Newly missing: adds a Mealie shopping list item (or raises the quantity of the open item). Deficit changed: adjusts the quantity by the delta. No longer missing: subtracts the previous deficit from the item, and deletes the item at zero. Optional sub-product handling folds sub-products into the parent product's item. Then runs the "In possession" delta sync (see below). |
| `conflict_check` | Compares every link with the current Grocy and Mealie records. Opens a conflict when the Grocy product, Grocy unit, Mealie food, or Mealie unit of a link no longer exists, or when a product link points to a unit link that no longer exists. Resolves a conflict when the problem is gone. |
| `shopping_cleanup` | Deletes Mealie shopping list items that have been checked for more than `CLEANUP_CHECKED_ITEMS_AFTER_HOURS`. Mode `all` or `synced_only`. Off by default (-1). |

The "In possession" sync (`SYNC_MEALIE_IN_POSSESSION`, off by default) sets the
Mealie food flag "In possession" from Grocy stock. A product counts as in
possession when the Grocy stock is above 0, or above `min_stock_amount` when
`MEALIE_IN_POSSESSION_ONLY_ABOVE_MIN_STOCK` is on. Opened stock is subtracted
when the Grocy product has `treat_opened_as_out_of_stock`. Mealie has no
field for this flag; the sync writes the household slug into the food's
`householdsWithIngredientFood` list.

Manual triggers run the same steps on demand:

| REST endpoint | Runs |
| --- | --- |
| `POST /api/sync/products` | `product_sync` |
| `POST /api/sync/grocy-to-mealie` | `grocy_to_mealie` |
| `POST /api/sync/grocy-to-mealie/ensure` | `grocy_to_mealie` with a presence check: every mapped below-minimum product must have an unchecked Mealie item; missing items are recreated. The setting `ENSURE_LOW_STOCK_ON_MEALIE_LIST` makes every poll do this. |
| `POST /api/sync/grocy-to-mealie/in-possession` | Full "In possession" reconcile of every mapped product, also when the setting is off. |
| `POST /api/sync/mealie-to-grocy` | `mealie_to_grocy` |
| `POST /api/sync/shopping-cleanup` | `shopping_cleanup`, also when it already ran today |
| `POST /api/sync/unlock` | Clears the scheduler lock and the sync lock |

The history table records these run actions: `scheduler_cycle`,
`product_sync`, `grocy_to_mealie`, `ensure_low_stock`,
`reconcile_in_possession`, `mealie_to_grocy`, `conflict_check`,
`clear_sync_locks`, `settings_update`, `shopping_cleanup`, `conflict_remap`,
`conversion_import`, plus one action per manual write (mapping, product,
unit, catalog, inventory, shopping, conversion). The triggers are
`scheduler`, `manual`, and `scanner`.

### Where it stores the links

In its own SQLite database, not in Grocy and not in Mealie.

| Table | Columns | Rules |
| --- | --- | --- |
| `product_mappings` | `id` (UUID), `mealie_food_id`, `mealie_food_name`, `grocy_product_id`, `grocy_product_name`, `unit_mapping_id` (nullable), `created_at`, `updated_at` | `mealie_food_id` is unique. `grocy_product_id` is unique. So one Grocy product links to at most one Mealie food, and one Mealie food to at most one Grocy product. The two names are cached copies. |
| `unit_mappings` | `id` (UUID), `mealie_unit_id`, `mealie_unit_name`, `mealie_unit_abbreviation`, `grocy_unit_id`, `grocy_unit_name`, `conversion_factor`, `created_at`, `updated_at` | Both ids are unique. `conversion_factor` is always written as 1. No code reads it for a calculation. |

The link from a product to its unit (`unit_mapping_id`) is a hint only. When
the sync adds a Mealie shopping list item, it first looks up the Grocy
product's current purchase unit (`qu_id_purchase`) and finds the unit link for
that Grocy unit. It uses `unit_mapping_id` only as a fallback.

Grocy and Mealie hold no reference to each other. Neither side has a field
that names the other side's record.

### Which side wins a conflict

The tool has no general conflict rule. Each flow has a fixed direction.

| Data | Winner | How |
| --- | --- | --- |
| Product name and unit name | Mealie | When a user links a Mealie food to a Grocy product (MCP `mappings.upsert_product`, the mapping wizard, or a conflict remap), the tool renames the Grocy product to the Mealie food name when the names differ. The same applies to units: the Grocy unit name and plural name are set from the Mealie unit. Product sync creates new Grocy records with the Mealie name. The tool never renames a Mealie record from a Grocy name. |
| Stock amount | Grocy | Mealie has no stock. Grocy stock drives the Mealie "In possession" flag and the Mealie shopping list. |
| Shopping list | Both, one direction each | Grocy low stock creates and adjusts Mealie items. A checked Mealie item adds Grocy stock and deletes the Grocy shopping list rows for that product. The tool never checks or unchecks a Mealie item during sync (only the MCP tool `shopping.set_checked` does, on request). |
| A Grocy product that two Mealie foods want | First link | The unique index refuses the second link. Product sync skips the food and logs a warning. The manual tools return an error that names the existing link. |
| A link whose Grocy or Mealie record is gone | Nobody | The conflict check opens a conflict record. A user resolves it in the UI (remap or unmap). Sync skips the link. |
| Name case | The tool | The wizard's "normalize" action and MCP `units.normalize` rewrite names on both sides: products get a capital first letter, units become lower case. This is a house rule built into the tool. |

### How it detects a change

No webhooks. Both sides are polled. The tool compares each poll with state it
saved from the previous poll.

| Side | What it reads | What it compares with | Note |
| --- | --- | --- | --- |
| Grocy, low stock | `GET /stock/volatile`, field `missing_products` (product id and `amount_missing`) | `grocyBelowMinStock` in its own sync state: product id to deficit from the last poll | A product that enters, changes, or leaves the list is a change. |
| Grocy, "In possession" | `GET /stock` (amount, opened amount) and `GET /objects/products` | `mealieInPossessionByGrocyProduct` in its own sync state: the last desired flag per product | The tool does not trust Mealie's `updatedAt` for this flag. It reads the Mealie food only when the desired flag differs from its own last value. |
| Grocy, parent own stock | `GET /stock` | `grocyParentOwnStockDeficit` in its own sync state | Optional. Grocy reports a parent as missing from the aggregate only. |
| Mealie, shopping list | All items of the configured list (paginated) | `mealieCheckedItems` in its own sync state: item id to checked flag | Unchecked to checked is the only change that acts. |
| Mealie, foods and units | Full list, up to 10000 foods and 1000 units per request | The ids in `product_mappings` and `unit_mappings` | A new Mealie record is one with no link. A rename in Mealie is not detected; the cached name in the link stays stale until a conflict check or manual action rewrites it. |
| Links | `product_mappings`, `unit_mappings` | Current Grocy and Mealie records | A deleted record on either side opens a conflict. |

It does not read `GET /system/db-changed-time`. It does not read the Grocy
stock journal or any booking.

### The "I made this" action

The tool has no "I made this" action. The string does not occur in the code,
the docs, or the changelog of `v1.18.0`, and not in the release notes of
`v1.19.0-rc.23`. "I made this" is a Mealie recipe action. In the Mealie API
it writes a recipe timeline event (`POST /api/recipes/timeline/events`) and
the recipe's last-made date (`PATCH /api/recipes/{slug}/last-made`). The sync
tool reads no timeline events and no last-made dates. So the Mealie "I made
this" action changes nothing in Grocy stock through this tool. Grocy stock
goes down only through Grocy itself, the scanner device API (`consume`), or
the MCP tools `inventory.consume_stock`, `inventory.set_stock`, and
`inventory.delete_entry`.

### State it keeps outside Grocy and Mealie

In its SQLite database:

| Table | Content |
| --- | --- |
| `product_mappings` | Product links (above). |
| `unit_mappings` | Unit links (above). |
| `sync_state`, row `singleton` | One JSON blob: last Grocy poll time, last Mealie poll time, `grocyBelowMinStock`, `mealieCheckedItems`, `mealieInPossessionByGrocyProduct`, `syncRestockedProducts` (products the sync restocked, so the next Grocy poll does not remove them from the Mealie list), `mealieCheckedAt`, `mealieItemsSyncedToGrocy`, `lastCleanupRun`, `grocyEffectiveParentByOriginalId`, `mealieSubRestockProgress` (retry progress per Mealie item), `grocyParentOwnStockDeficit`, `grocySkippedRestockAmounts`. |
| `sync_state`, row `settings` | The 13 app settings: default unit link, Mealie shopping list id, auto-create products, auto-create units, ensure low stock on list, sync "In possession", only above minimum, wizard minimum stock step, only restock products with a minimum, cleanup hours, cleanup mode, sync sub-products, sync parent own stock. An environment variable overrides and locks a setting. |
| `runtime_locks` | Two leases: `scheduler-startup` (one active scheduler per database) and `sync-operation` (one sync or write at a time, TTL twice the poll interval, minimum 15 s). |
| `mapping_conflicts` | Open and resolved conflicts with type, severity, both ids and names, first and last seen, occurrences. |
| `history_runs` | One row per run: trigger, action, status, message, summary JSON, start, end. |
| `history_events` | Events per run: mutation, issue, or diagnostic; product name, source, target, reason, details JSON. Retention `HISTORY_RETENTION_DAYS` (default 7). |

In memory only: MCP sessions (TTL 15 min, max 100), the scheduler status,
the set of already-reported scheduler issues, and the cached id of the first
Grocy location.

Inside Mealie records: with sub-product sync on, the tool writes three keys
into the `extras` of a Mealie shopping list item (`grocy_sync_subproducts`,
`grocy_sync_subproducts_note`, `grocy_sync_subproduct_items`) and a managed
segment into the item note. The "In possession" sync writes the household
slug into the food. Nothing else of its own is stored in Mealie.

Inside Grocy records: nothing of its own. New products and units get Mealie
names and the defaults above.

### MCP tools (66)

Tool names use dots. All tools return one JSON envelope with `ok`, `status`
(`ok`, `partial`, `skipped`, `busy`, `error`), `message`, and `data`. Every
write tool takes the sync lock first and waits up to 10 s for it. Every write
is recorded in history.

| Group | Tool | What it does |
| --- | --- | --- |
| Products | `products.list` | Lists Grocy products with stock, minimum, location, group, and link. Filters: scope (mapped or all), stock greater than, has minimum, below minimum, location, group, no own stock, should not be frozen. No page limit. |
| | `products.search` | Searches Grocy, Mealie, and the links by name. |
| | `products.get_overview` | One product across Grocy, Mealie, and the link. |
| | `products.check_duplicates` | Likely duplicates in both apps before a create. |
| | `products.create_grocy` | Creates a Grocy product (name, unit, minimum, location, group). |
| | `products.create_mealie` | Creates a Mealie food. |
| | `products.create_in_both` | Creates both and the link. |
| | `products.update_basic` | Grocy name; Mealie name, plural name, aliases. |
| | `products.update_grocy_stock_settings` | `min_stock_amount`, `treat_opened_as_out_of_stock`, the four `default_best_before_days*` fields, `due_type`, `should_not_be_frozen`, `product_group_id`, `location_id`, `move_on_open`, `default_consume_location_id`. |
| | `products.update_units` | `qu_id_purchase` and `qu_id_stock` only. |
| | `products.delete` | Deletes an unlinked product from Grocy or Mealie. Refuses a linked product. |
| Links | `mappings.list_products`, `mappings.list_units` | The link tables. |
| | `mappings.list_unmapped` | Grocy and Mealie records with no link. |
| | `mappings.suggest_products`, `mappings.suggest_units` | Fuzzy-match suggestions for unlinked Mealie records. |
| | `mappings.upsert_product` | Creates or changes a product link. Renames the Grocy product to the Mealie name when they differ. |
| | `mappings.remove_product` | Deletes a product link. |
| | `mappings.upsert_unit` | Creates or changes a unit link. Renames the Grocy unit to the Mealie name when they differ. |
| | `mappings.remove_unit` | Deletes a unit link. |
| Units | `units.list_catalog` | Grocy and Mealie units with link references. |
| | `units.compare` | One Mealie unit against one Grocy unit. |
| | `units.create_grocy`, `units.create_mealie` | Creates a unit; skips an exact duplicate name. |
| | `units.update_grocy` | Name, plural name, plural forms. |
| | `units.update_mealie` | Names, abbreviations, aliases, standard quantity and unit. |
| | `units.delete_grocy` | Refuses when links, products, or conversions use the unit. |
| | `units.delete_mealie` | Refuses when links, shopping items, or recipe ingredients use the unit. |
| | `units.normalize` | Rewrites mapped unit names to lower case on both sides. |
| Conversions | `conversions.list`, `conversions.create`, `conversions.delete` | Grocy general and product conversions. |
| | `conversions.library.list`, `conversions.library.preview`, `conversions.library.import` | Metric and US customary presets. Preview returns a fingerprint; import needs it. |
| Catalog | `catalog.list_locations`, `catalog.create_location`, `catalog.update_location`, `catalog.delete_location` | Grocy locations. Delete refuses when products or stock entries use it. |
| | `catalog.list_product_groups`, `catalog.create_product_group`, `catalog.update_product_group`, `catalog.delete_product_group` | Grocy product groups. Delete refuses when products use it. |
| Stock | `inventory.get_stock` | Stock state of one product. |
| | `inventory.list_entries`, `inventory.get_entry` | Stock entries of one product; one entry. |
| | `inventory.list_low_stock` | Mapped products below minimum. |
| | `inventory.add_stock` | Purchase booking: amount, due date, note, opened amount. No price, no store, no location. |
| | `inventory.create_entry` | Purchase booking with location and purchased date. |
| | `inventory.consume_stock` | Consume booking by amount. |
| | `inventory.delete_entry` | Consumes one whole stock entry. Integer amounts only. |
| | `inventory.set_stock` | Inventory booking to a target amount, optional opened amount. |
| | `inventory.mark_opened` | Open booking. |
| | `inventory.update_entry` | `PUT /stock/entry/{entryId}` with the given fields only. See defect 3.1.3. |
| Shopping (Mealie) | `shopping.list_items`, `shopping.check_product` | Items on the configured list; is a product on it. |
| | `shopping.add_item` | By food id or name; merges duplicates; splits "vanille kwark" into food "kwark" plus note "vanille". |
| | `shopping.remove_item`, `shopping.set_checked`, `shopping.update_quantity`, `shopping.update_unit` | One item. |
| | `shopping.merge_duplicates` | Merges unchecked duplicates of one food. |
| Diagnostics | `diagnostics.explain_product_state` | Explains link, sync, and stock state of one product. |
| | `conflicts.list` | Open link conflicts. |
| | `history.list_runs`, `history.get_run` | History runs and their events. |

The MCP server also exposes 14 read-only resources (`gms://status`,
`gms://mappings/products`, `gms://mappings/units`, `gms://products/unmapped`,
`gms://units/unmapped`, `gms://units/catalog`, `gms://conflicts/open`,
`gms://shopping/items`, `gms://inventory/low-stock`, `gms://history/recent`,
`gms://history/runs/{runId}`, `gms://products/{productRef}`,
`gms://catalog/locations`, `gms://catalog/product-groups`) and 5 prompts
(`create-new-product`, `review-unmapped-items`, `diagnose-product-state`,
`process-shopping-fix`, `apply-stock-correction`).

The MCP surface has no sync trigger, no settings tool, no bulk tool, no
undo, no transfer, no merge, no barcode tool, no stores, no price history,
no product conversions view, no Mealie food label or description, and no
recipe reading.

### REST endpoints (17)

`GET /api/health`, `GET /api/status`, `GET /api/mappings/products`,
`GET /api/mappings/units`, `GET /api/conversions`, `POST /api/conversions`,
`DELETE /api/conversions/[id]`, `GET /api/conversions/library`,
`POST /api/conversions/preview`, `POST /api/conversions/import`, and the
seven `POST /api/sync/*` triggers listed above. The web UI uses more
routes under `/api/mapping-wizard/*` and `/api/settings`; the tool does not
document them as public.

### Device API

`/api/device/v1/*` for the scanner. Actions on a product: `purchase`,
`open`, `consume`, `add_to_shopping_list`. Also product lookup by barcode,
product create, and barcode link. Its own tokens (`DEVICE_API_TOKENS`).

### Check of the defects in `docs/requirements/assistant.md`

| Requirement | Claim | Result |
| --- | --- | --- |
| 3.1 item 1 | Grocy (grocy-mcp) returns nothing after a change. | **Confirmed.** Grocy's `PUT /objects/{entity}/{objectId}` returns HTTP 204 with no body. grocy-mcp converts an empty body to `null` and returns the text `null`. The stock operations (`add`, `consume`, `inventory`, `open`, `PUT /stock/entry`) do return the bookings; grocy-mcp passes those through. |
| 3.1 item 2 | Grocy drops unknown fields without warning. | **Corrected: the drop happens in grocy-mcp, not in Grocy.** The `body` input of `grocy_put_objects_by_entity_by_objectid` and `grocy_post_objects_by_entity` is a Zod union of nine object schemas generated from the vendored spec, all keys optional, `Product` first. Zod 4 `z.object` removes unknown keys, and a union returns the first member that parses. An object with all-optional keys always parses. The MCP SDK gives the handler the parsed value. So every field that is not in the spec's `Product` schema is removed before the request leaves grocy-mcp, for every entity. A test of this schema shape with Zod 4.6.7 removed `qu_id_consume` from a product body, `name_plural` from a unit body, and `amount`, `note`, `product_id` from a shopping list body. Grocy itself passes every field of the body to the database row; an unknown column gives an SQL error and an HTTP 400. (I did not run the grocy-mcp code; the test used the same schema shape.) |
| 3.1 item 3, 3.9 item 5 | Editing a stock entry through the sync tool wipes its note and demands the amount and dates again. | **Confirmed, and wider.** The sync tool sends only the given fields to `PUT /stock/entry/{entryId}`. Grocy's `EditStockEntry` requires `amount` ("An amount is required"), and writes `best_before_date`, `price`, `location_id`, `shopping_location_id`, `open`, `purchased_date`, and `note` from the body, with `null` for each one not present. The sync tool never sends `note`. So one call that changes one field clears every other one of these fields. The MCP schema marks `amount` optional, so a call without it fails in Grocy. grocy-mcp has the same behaviour, because Grocy's operation is a full replace. |
| 3.1 item 4, 3.6 item 4 | Linking a Mealie food to a Grocy product can rename the Grocy product. | **Confirmed.** `mappings.upsert_product` renames the Grocy product to the Mealie food name when the two names differ, and returns `renamedGrocyProduct: true`. The mapping wizard "sync" route and the conflict remap route do the same. `mappings.upsert_unit` renames the Grocy unit and its plural name the same way. There is no option to keep the Grocy name. |
| 3.1 item 7 | Simultaneous changes sometimes fail with "database is locked". | **Not confirmable from code; plausible.** "database is locked" is SQLite's busy error. Grocy stores its data in SQLite and sets no busy timeout of its own in `DatabaseService.php`. The sync tool serializes its own writes with the `sync-operation` lease and waits up to 10 s. grocy-mcp has no lock. So a grocy-mcp write and a sync tool write, or two grocy-mcp writes, can hit Grocy at the same time. The sync tool's own SQLite is a second possible source. |
| 3.3 item 1 | A full product list (about 180 items) is truncated. | **Not in the tool code.** `products.list` applies no limit and no page. It returns every product in one JSON text block. `GET /objects/products` is called without `limit`. The cut must happen in the MCP client or transport that shows the result. |
| 3.4 item 2 | Consume and price units cannot be changed by either tool. | **Confirmed for both, with cause.** Sync tool: `products.update_units` accepts `qu_id_purchase` and `qu_id_stock` only, and the tool's list of editable product fields has no `qu_id_consume` and no `qu_id_price`. grocy-mcp: the spec `Product` schema has no `qu_id_consume` and no `qu_id_price`, so the Zod schema removes them (3.1 item 2). Grocy's product form has both fields. The same removal hits `parent_product_id`, `active`, `due_type`, `default_best_before_days_after_freezing`, `default_best_before_days_after_thawing`, `cumulate_min_stock_amount_of_sub_products`, `hide_on_stock_overview`, `disable_open`, `default_stock_label_type`, and `default_purchase_price_type`. The sync tool can set `due_type` and the freezing and thawing days through `products.update_grocy_stock_settings`. |

Other requirement tags checked against the code:

- 3.4 item 1 "[Grocy] create a product with every field in one request": not true for grocy-mcp. Only `Product` schema fields pass (3.1 item 2).
- 3.7 item 3 "product conversions [Grocy], not in sync tool": the sync tool has them. `conversions.create` takes an optional `product_id`; the Grocy `quantity_unit_conversions` entity is in its editable list.
- 3.8 item 1 "[Both] locations and product groups": true for the sync tool since the `catalog.*` tools. grocy-mcp edits of a location lose every field except `name` and `description` (3.1 item 2).
- 3.10 item 1 "[Both] shopping list": grocy-mcp `PUT /objects/shopping_list/{id}` loses `amount`, `note`, `product_id`, and `shopping_list_id` (3.1 item 2). `POST /stock/shoppinglist/add-product` and `remove-product` work, because their body schema is their own.
- 3.11 item 3 "[Sync] (sync-run history only)": since 1.17.0 the history records each manual write with product, amount, source, and reason. It does not record old and new values for every field.

---

## Part 2: grocy-mcp (main, commit 9070240)

### What it is

A Node.js 22 MCP server with 87 tools. Every tool is one Grocy API
operation. The tools are generated from a vendored copy of the Grocy OpenAPI
spec (`info.version` "xxx", 86 operations, the same set as Grocy 4.6.0) plus
one hand-written tool for `GET /openapi/specification`. It runs on stdio or on
Streamable HTTP with one bearer token. It keeps no state. It has no lock, no
retry, and no cache.

Each tool call builds the URL from the path parameters, puts every other
input key into the query string, sends `body` as JSON, and returns the Grocy
response as pretty JSON text. An empty response becomes `null`. A non-2xx
response becomes an MCP error with the HTTP status and Grocy's
`error_message`. Tool names follow `grocy_<method>_<path>`.

### Tool to operation map

All 87 tools. Grouped by the spec tag that `docs/research/grocy-survey.md`
uses. The path omits the `/api` prefix.

**Stock (23)**

| Tool | Operation |
| --- | --- |
| `grocy_get_stock` | `GET /stock` |
| `grocy_get_stock_volatile` | `GET /stock/volatile` |
| `grocy_get_stock_entry_by_entryid` | `GET /stock/entry/{entryId}` |
| `grocy_put_stock_entry_by_entryid` | `PUT /stock/entry/{entryId}` |
| `grocy_get_stock_entry_by_entryid_printlabel` | `GET /stock/entry/{entryId}/printlabel` |
| `grocy_get_stock_products_by_productid` | `GET /stock/products/{productId}` |
| `grocy_get_stock_products_by_productid_entries` | `GET /stock/products/{productId}/entries` |
| `grocy_get_stock_products_by_productid_locations` | `GET /stock/products/{productId}/locations` |
| `grocy_get_stock_products_by_productid_price_history` | `GET /stock/products/{productId}/price-history` |
| `grocy_get_stock_products_by_productid_printlabel` | `GET /stock/products/{productId}/printlabel` |
| `grocy_post_stock_products_by_productid_add` | `POST /stock/products/{productId}/add` |
| `grocy_post_stock_products_by_productid_consume` | `POST /stock/products/{productId}/consume` |
| `grocy_post_stock_products_by_productid_transfer` | `POST /stock/products/{productId}/transfer` |
| `grocy_post_stock_products_by_productid_inventory` | `POST /stock/products/{productId}/inventory` |
| `grocy_post_stock_products_by_productid_open` | `POST /stock/products/{productId}/open` |
| `grocy_post_stock_products_by_productidtokeep_merge_by_productidtoremove` | `POST /stock/products/{productIdToKeep}/merge/{productIdToRemove}` |
| `grocy_get_stock_locations_by_locationid_entries` | `GET /stock/locations/{locationId}/entries` |
| `grocy_get_stock_bookings_by_bookingid` | `GET /stock/bookings/{bookingId}` |
| `grocy_post_stock_bookings_by_bookingid_undo` | `POST /stock/bookings/{bookingId}/undo` |
| `grocy_get_stock_transactions_by_transactionid` | `GET /stock/transactions/{transactionId}` |
| `grocy_post_stock_transactions_by_transactionid_undo` | `POST /stock/transactions/{transactionId}/undo` |
| `grocy_get_stock_barcodes_external_lookup_by_barcode` | `GET /stock/barcodes/external-lookup/{barcode}` |
| none | `POST /stock/products/{productId}/copy` |

**Stock "by-barcode" (6)**

| Tool | Operation |
| --- | --- |
| `grocy_get_stock_products_by_barcode_by_barcode` | `GET /stock/products/by-barcode/{barcode}` |
| `grocy_post_stock_products_by_barcode_by_barcode_add` | `POST /stock/products/by-barcode/{barcode}/add` |
| `grocy_post_stock_products_by_barcode_by_barcode_consume` | `POST /stock/products/by-barcode/{barcode}/consume` |
| `grocy_post_stock_products_by_barcode_by_barcode_transfer` | `POST /stock/products/by-barcode/{barcode}/transfer` |
| `grocy_post_stock_products_by_barcode_by_barcode_inventory` | `POST /stock/products/by-barcode/{barcode}/inventory` |
| `grocy_post_stock_products_by_barcode_by_barcode_open` | `POST /stock/products/by-barcode/{barcode}/open` |

**Shopping list, tag Stock (6)**

| Tool | Operation |
| --- | --- |
| `grocy_post_stock_shoppinglist_add_missing_products` | `POST /stock/shoppinglist/add-missing-products` |
| `grocy_post_stock_shoppinglist_add_overdue_products` | `POST /stock/shoppinglist/add-overdue-products` |
| `grocy_post_stock_shoppinglist_add_expired_products` | `POST /stock/shoppinglist/add-expired-products` |
| `grocy_post_stock_shoppinglist_add_product` | `POST /stock/shoppinglist/add-product` |
| `grocy_post_stock_shoppinglist_remove_product` | `POST /stock/shoppinglist/remove-product` |
| `grocy_post_stock_shoppinglist_clear` | `POST /stock/shoppinglist/clear` |

**Generic entity interactions (7)**

| Tool | Operation |
| --- | --- |
| `grocy_get_objects_by_entity` | `GET /objects/{entity}` |
| `grocy_post_objects_by_entity` | `POST /objects/{entity}` |
| `grocy_get_objects_by_entity_by_objectid` | `GET /objects/{entity}/{objectId}` |
| `grocy_put_objects_by_entity_by_objectid` | `PUT /objects/{entity}/{objectId}` |
| `grocy_delete_objects_by_entity_by_objectid` | `DELETE /objects/{entity}/{objectId}` |
| `grocy_get_userfields_by_entity_by_objectid` | `GET /userfields/{entity}/{objectId}` |
| `grocy_put_userfields_by_entity_by_objectid` | `PUT /userfields/{entity}/{objectId}` |

Products, quantity units, conversions, locations, product groups, stores,
barcodes, shopping lists, recipes, meal plan, equipment, and user entities
all go through these seven tools with the `entity` parameter.

**Recipes (6)**

| Tool | Operation |
| --- | --- |
| `grocy_get_recipes_fulfillment` | `GET /recipes/fulfillment` |
| `grocy_get_recipes_by_recipeid_fulfillment` | `GET /recipes/{recipeId}/fulfillment` |
| `grocy_post_recipes_by_recipeid_add_not_fulfilled_products_to_shoppinglist` | `POST /recipes/{recipeId}/add-not-fulfilled-products-to-shoppinglist` |
| `grocy_post_recipes_by_recipeid_consume` | `POST /recipes/{recipeId}/consume` |
| `grocy_post_recipes_by_recipeid_copy` | `POST /recipes/{recipeId}/copy` |
| `grocy_get_recipes_by_recipeid_printlabel` | `GET /recipes/{recipeId}/printlabel` |

**Chores (7)**

| Tool | Operation |
| --- | --- |
| `grocy_get_chores` | `GET /chores` |
| `grocy_get_chores_by_choreid` | `GET /chores/{choreId}` |
| `grocy_post_chores_by_choreid_execute` | `POST /chores/{choreId}/execute` |
| `grocy_post_chores_executions_by_executionid_undo` | `POST /chores/executions/{executionId}/undo` |
| `grocy_post_chores_executions_calculate_next_assignments` | `POST /chores/executions/calculate-next-assignments` |
| `grocy_post_chores_by_choreidtokeep_merge_by_choreidtoremove` | `POST /chores/{choreIdToKeep}/merge/{choreIdToRemove}` |
| `grocy_get_chores_by_choreid_printlabel` | `GET /chores/{choreId}/printlabel` |

**Batteries (5)**

| Tool | Operation |
| --- | --- |
| `grocy_get_batteries` | `GET /batteries` |
| `grocy_get_batteries_by_batteryid` | `GET /batteries/{batteryId}` |
| `grocy_post_batteries_by_batteryid_charge` | `POST /batteries/{batteryId}/charge` |
| `grocy_post_batteries_charge_cycles_by_chargecycleid_undo` | `POST /batteries/charge-cycles/{chargeCycleId}/undo` |
| `grocy_get_batteries_by_batteryid_printlabel` | `GET /batteries/{batteryId}/printlabel` |

**Tasks (3)**

| Tool | Operation |
| --- | --- |
| `grocy_get_tasks` | `GET /tasks` |
| `grocy_post_tasks_by_taskid_complete` | `POST /tasks/{taskId}/complete` |
| `grocy_post_tasks_by_taskid_undo` | `POST /tasks/{taskId}/undo` |

**Calendar (2)**

| Tool | Operation |
| --- | --- |
| `grocy_get_calendar_ical` | `GET /calendar/ical` |
| `grocy_get_calendar_ical_sharing_link` | `GET /calendar/ical/sharing-link` |

**User management (7)**

| Tool | Operation |
| --- | --- |
| `grocy_get_users` | `GET /users` |
| `grocy_post_users` | `POST /users` |
| `grocy_put_users_by_userid` | `PUT /users/{userId}` |
| `grocy_delete_users_by_userid` | `DELETE /users/{userId}` |
| `grocy_get_users_by_userid_permissions` | `GET /users/{userId}/permissions` |
| `grocy_post_users_by_userid_permissions` | `POST /users/{userId}/permissions` |
| `grocy_put_users_by_userid_permissions` | `PUT /users/{userId}/permissions` |

**Current user (5)**

| Tool | Operation |
| --- | --- |
| `grocy_get_user` | `GET /user` |
| `grocy_get_user_settings` | `GET /user/settings` |
| `grocy_get_user_settings_by_settingkey` | `GET /user/settings/{settingKey}` |
| `grocy_put_user_settings_by_settingkey` | `PUT /user/settings/{settingKey}` |
| `grocy_delete_user_settings_by_settingkey` | `DELETE /user/settings/{settingKey}` |

**Files (3)**

| Tool | Operation |
| --- | --- |
| `grocy_get_files_by_group_by_filename` | `GET /files/{group}/{fileName}` |
| `grocy_put_files_by_group_by_filename` | `PUT /files/{group}/{fileName}` |
| `grocy_delete_files_by_group_by_filename` | `DELETE /files/{group}/{fileName}` |

**Print (1)**

| Tool | Operation |
| --- | --- |
| `grocy_get_print_shoppinglist_thermal` | `GET /print/shoppinglist/thermal` |

**System (6)**

| Tool | Operation |
| --- | --- |
| `grocy_get_system_info` | `GET /system/info` |
| `grocy_get_system_db_changed_time` | `GET /system/db-changed-time` |
| `grocy_get_system_config` | `GET /system/config` |
| `grocy_get_system_time` | `GET /system/time` |
| `grocy_get_system_localization_strings` | `GET /system/localization-strings` |
| `grocy_post_system_log_missing_localization` | `POST /system/log-missing-localization` |

**Not in the spec (1)**

| Tool | Operation |
| --- | --- |
| `grocy_get_openapi_specification` | `GET /openapi/specification` |

### Grocy API operations with no tool

One of the 87 operations in the Grocy v4.7.1 spec has no tool:
`POST /stock/products/{productId}/copy`. The vendored spec in grocy-mcp
predates it. Every other operation in `docs/reference/grocy-openapi.json`
has exactly one tool.

### Behaviour notes

- Edits return no confirmation. Grocy's generic edit and delete return 204; grocy-mcp returns `null`. The caller must read the object again.
- Fields outside the spec's `Product` schema never reach Grocy for the generic create and edit tools (see 3.1 item 2 above). This affects every entity, not only products.
- Nine list tools declare a query parameter named `query[]`. The claude.ai MCP connector rejected these nine tools in this session, because the key contains brackets: `grocy_get_objects_by_entity`, `grocy_get_stock_products_by_productid_entries`, `grocy_get_stock_products_by_productid_locations`, `grocy_get_stock_locations_by_locationid_entries`, `grocy_get_recipes_fulfillment`, `grocy_get_chores`, `grocy_get_tasks`, `grocy_get_batteries`, `grocy_get_users`. Other MCP clients may accept them. This is an observation from one client, not a finding from the code.
- No tool checks for stock, links, or references before a delete. Grocy's own foreign key rules decide.
- No lock. Two calls can reach Grocy at the same time.

---

## Part 3: Facts for the subdomain grilling (issue #30)

These are facts from the two tools. They are not decisions.

1. The link between a Grocy product and a Mealie food lives in the sync tool's database only. Neither Grocy nor Mealie knows about it. A replacement must own this table or move it into one of the two apps.
2. The link is one-to-one on both sides, enforced by unique indexes.
3. The unit link carries a conversion factor that is always 1 and never used. Real conversions live in Grocy's `quantity_unit_conversions` and in Mealie's native standard quantity and unit.
4. The sync tool's only Grocy change detection is a poll of `GET /stock/volatile` and `GET /stock`, compared with its own last snapshot. It never reads the stock journal.
5. The sync tool's only Mealie change detection is a poll of the shopping list items, compared with its own last snapshot of the checked flag.
6. The Mealie-side writes are: shopping list items (create, update quantity, delete), the "In possession" household flag on foods, and food and unit records through the manual tools. Nothing else.
7. The Grocy-side writes from sync are: purchase bookings for checked Mealie items, deletes of Grocy shopping list rows, and creates and renames of products and units. The manual MCP tools add consume, inventory, open, stock entry edit, locations, groups, and conversions.
8. "I made this" in Mealie reaches neither tool.
9. The sync tool enforces three house rules: Mealie names win, product names get a capital first letter, unit names are lower case. The requirements call for a policy-neutral tool.
10. Both tools fail the "no silent drop" requirement, each in its own way: grocy-mcp drops fields in its input schema; the sync tool's stock entry edit lets Grocy clear the fields it does not send.
