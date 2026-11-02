# Survey of the Grocy v4.7.1 application

This file answers GitHub issue #28. It lists what Grocy v4.7.1 consists of:
the UI pages and their routes, the API operations, and the entity types. It
groups them by area. It uses the area names that Grocy uses. The grilling
ticket "Break Grocy Next into domain areas" (issue #30) uses this list.

This file contains no Grocy source code. It lists and describes only.

## Sources

| Source | Location | What it gives |
| --- | --- | --- |
| Routes | `routes.php` in the Grocy repo at tag `v4.7.1` | Every UI route and every API route, with the controller that serves it. The comments in the file name the areas. |
| OpenAPI spec | `docs/reference/grocy-openapi.json` in this repo (a copy of `grocy.openapi.json` at tag `v4.7.1`; the two files are identical) | Every API operation, its tag, and the `ExposedEntity` enum. |
| Controllers | `controllers/` and `controllers/Api/` at tag `v4.7.1` | Which data a server-rendered page reads. |
| Views | `views/` at tag `v4.7.1` | The 74 page templates. `views/layout/default.blade.php` holds the sidebar menu. |
| Browser code | `public/js/grocy.js` and `public/viewjs/` at tag `v4.7.1` | Which API operations the UI calls. |
| Config | `config-dist.php` at tag `v4.7.1` | The `FEATURE_FLAG_*` switches. These name the areas a user can switch off. |

Repo URL: <https://github.com/grocy/grocy/tree/v4.7.1>

## Counts

| Item | Count | Source |
| --- | --- | --- |
| UI routes (the first route group in `routes.php`) | 84 | `routes.php` |
| Page templates (`.blade.php` files in `views/`, not in sub-folders) | 74 | `views/` |
| API paths in the spec | 74 | spec `paths` |
| API operations in the spec | 87 | spec `paths` x methods |
| API routes in `routes.php` | 88 | `routes.php`. The extra route is `GET /api/openapi/specification`. The spec does not list it. |
| API tags | 13 | spec `tags` on operations |
| Entity types in `ExposedEntity` | 36 | spec `components.schemas.ExposedEntity` |
| Feature flags | 21 | `config-dist.php` |

## How Grocy names the areas

Grocy names its areas in four places. The names agree with each other.

| Area | `routes.php` comment | Spec tag | Sidebar menu | Feature flag |
| --- | --- | --- | --- | --- |
| Stock | "Stock master data routes", "Stock handling routes", "Stock price tracking" | `Stock`, `Stock "by-barcode"` | Stock overview, Purchase, Consume, Transfer, Inventory, Manage master data | `FEATURE_FLAG_STOCK` and seven sub-flags |
| Shopping list | "Shopping list routes" | part of `Stock` | Shopping list | `FEATURE_FLAG_SHOPPINGLIST`, `..._MULTIPLE_LISTS` |
| Recipes | "Recipe routes" | `Recipes` | Recipes | `FEATURE_FLAG_RECIPES` |
| Meal plan | "Meal plan routes" | none (generic entities) | Meal plan | `FEATURE_FLAG_RECIPES_MEALPLAN` |
| Chores | "Chore routes" | `Chores` | Chores overview, Chore tracking | `FEATURE_FLAG_CHORES`, `..._ASSIGNMENTS` |
| Tasks | "Task routes" | `Tasks` | Tasks | `FEATURE_FLAG_TASKS` |
| Batteries | "Battery routes" | `Batteries` | Batteries overview, Battery tracking | `FEATURE_FLAG_BATTERIES` |
| Equipment | "Equipment routes" | none (generic entities) | Equipment | `FEATURE_FLAG_EQUIPMENT` |
| Calendar | "Calendar routes" | `Calendar` | Calendar | `FEATURE_FLAG_CALENDAR` |
| Users | "User routes", "Users", "User" | `User management`, `Current user` | Manage users, User settings | none |
| Generic entity interaction | "Generic entity interaction" | `Generic entity interactions` | Userfields, Userentities | none |
| Files | "Files" | `Files` | none | none |
| Print | "Printing" | `Print` | none | `FEATURE_FLAG_LABEL_PRINTER`, `FEATURE_FLAG_THERMAL_PRINTER` |
| System | "System routes", "Login routes", "System" | `System` | About Grocy, Barcode scanner testing | `FEATURE_FLAG_AUTO_TORCH_ON_WITH_CAMERA`, `FEATURE_FLAG_DISABLE_BROWSER_BARCODE_CAMERA_SCANNING` |
| OpenAPI | "OpenAPI routes", "OpenAPI" | none | Manage API keys, REST API browser | none |

The sections below use these fifteen areas.

Every UI route is a `GET` unless the table says otherwise. Every UI route
serves an HTML page unless the table says otherwise. The API routes all
start with `/api`. The tables omit that prefix.

## Area: Stock

Grocy splits this area into "Stock master data", "Stock handling", and
"Stock price tracking" in `routes.php`. The spec puts all of it under the
tag `Stock`, plus the tag `Stock "by-barcode"`.

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/stockoverview` | `StockController::Overview` | Stock overview. Lists the products in stock and their next due dates. |
| `/stockentries` | `StockController::Stockentries` | Stock entries. Lists each stock entry (one row per purchase lot). |
| `/purchase` | `StockController::Purchase` | Purchase form. Adds stock. |
| `/consume` | `StockController::Consume` | Consume form. Removes stock. |
| `/transfer` | `StockController::Transfer` | Transfer form. Moves stock between locations. |
| `/inventory` | `StockController::Inventory` | Inventory form. Sets the stock amount to a counted value. |
| `/stockentry/{entryId}` | `StockController::StockEntryEditForm` | Edit one stock entry. |
| `/stockentry/{entryId}/grocycode` | `StockController::StockEntryGrocycodeImage` | Returns a Grocycode barcode image for one stock entry. Not an HTML page. |
| `/stockentry/{entryId}/label` | `StockController::StockEntryGrocycodeLabel` | Renders a printable label for one stock entry. |
| `/stocksettings` | `StockController::StockSettings` | Stock settings. |
| `/stockjournal` | `StockController::Journal` | Stock journal. Lists every stock booking and lets the user undo one. |
| `/stockjournal/summary` | `StockController::JournalSummary` | Stock journal summary. Groups the bookings by product, user, and type. |
| `/locationcontentsheet` | `StockController::LocationContentSheet` | Location content sheet. A printable list of what is in each location. |
| `/stockreports/spendings` | `StockReportsController::Spendings` | Spendings report. Sums the purchase prices by product, product group, or store. |
| `/quantityunitpluraltesting` | `StockController::QuantityUnitPluralFormTesting` | Test page for plural forms of quantity units. |
| `/quantityunitconversionsresolved` | `StockController::QuantityUnitConversionsResolved` | Lists every resolved quantity unit conversion. |
| `/products` | `StockController::ProductsList` | Products list (master data). |
| `/product/{productId}` | `StockController::ProductEditForm` | Edit one product. |
| `/product/{productId}/grocycode` | `StockController::ProductGrocycodeImage` | Returns a Grocycode barcode image for one product. Not an HTML page. |
| `/productbarcodes/{productBarcodeId}` | `StockController::ProductBarcodesEditForm` | Edit one product barcode. |
| `/quantityunits` | `StockController::QuantityUnitsList` | Quantity units list (master data). |
| `/quantityunit/{quantityunitId}` | `StockController::QuantityUnitEditForm` | Edit one quantity unit. |
| `/quantityunitconversion/{quConversionId}` | `StockController::QuantityUnitConversionEditForm` | Edit one quantity unit conversion. |
| `/productgroups` | `StockController::ProductGroupsList` | Product groups list (master data). |
| `/productgroup/{productGroupId}` | `StockController::ProductGroupEditForm` | Edit one product group. |
| `/locations` | `StockController::LocationsList` | Locations list (master data). |
| `/location/{locationId}` | `StockController::LocationEditForm` | Edit one location. |
| `/shoppinglocations` | `StockController::ShoppingLocationsList` | Stores list (master data). Grocy calls the entity `shopping_locations` and the menu item "Stores". |
| `/shoppinglocation/{shoppingLocationId}` | `StockController::ShoppingLocationEditForm` | Edit one store. |

### API operations, tag `Stock`

| Operation | Purpose |
| --- | --- |
| `GET /stock` | Returns the products in stock with the next due date. |
| `GET /stock/volatile` | Returns the products that are due soon, overdue, expired, or missing. |
| `GET /stock/entry/{entryId}` | Returns one stock entry. |
| `PUT /stock/entry/{entryId}` | Edits one stock entry. |
| `GET /stock/entry/{entryId}/printlabel` | Prints the label of one stock entry on the label printer. |
| `GET /stock/products/{productId}` | Returns the details of one product. |
| `GET /stock/products/{productId}/entries` | Returns the stock entries of one product in the order of next use. |
| `GET /stock/products/{productId}/locations` | Returns the locations where one product has stock. |
| `GET /stock/products/{productId}/price-history` | Returns the price history of one product. |
| `GET /stock/products/{productId}/printlabel` | Prints the Grocycode label of one product. |
| `POST /stock/products/{productId}/add` | Adds an amount to stock (purchase). |
| `POST /stock/products/{productId}/consume` | Removes an amount from stock. |
| `POST /stock/products/{productId}/transfer` | Moves an amount between locations. |
| `POST /stock/products/{productId}/inventory` | Sets the stock amount to a new value. |
| `POST /stock/products/{productId}/open` | Marks an amount as opened. |
| `POST /stock/products/{productIdToKeep}/merge/{productIdToRemove}` | Merges two products. |
| `POST /stock/products/{productId}/copy` | Copies a product. |
| `GET /stock/locations/{locationId}/entries` | Returns the stock entries in one location. |
| `GET /stock/bookings/{bookingId}` | Returns one stock booking. |
| `POST /stock/bookings/{bookingId}/undo` | Undoes one stock booking. |
| `GET /stock/transactions/{transactionId}` | Returns all bookings of one transaction. |
| `POST /stock/transactions/{transactionId}/undo` | Undoes one transaction. |
| `GET /stock/barcodes/external-lookup/{barcode}` | Looks up a barcode with the configured plugin. |

### API operations, tag `Stock "by-barcode"`

| Operation | Purpose |
| --- | --- |
| `GET /stock/products/by-barcode/{barcode}` | Returns the product details for a barcode. |
| `POST /stock/products/by-barcode/{barcode}/add` | Adds stock by barcode. |
| `POST /stock/products/by-barcode/{barcode}/consume` | Consumes stock by barcode. |
| `POST /stock/products/by-barcode/{barcode}/transfer` | Transfers stock by barcode. |
| `POST /stock/products/by-barcode/{barcode}/inventory` | Inventories stock by barcode. |
| `POST /stock/products/by-barcode/{barcode}/open` | Opens stock by barcode. |

### Entity types (14)

| Entity | Kind | Notes |
| --- | --- | --- |
| `products` | editable | Product master data. |
| `product_barcodes` | editable | Barcodes of a product. |
| `product_barcodes_view` | read-only view | Barcodes with the product data joined. |
| `product_groups` | editable | Product groups. |
| `locations` | editable | Storage locations. |
| `shopping_locations` | editable | Stores. |
| `quantity_units` | editable | Quantity units. |
| `quantity_unit_conversions` | editable | Conversion factors between units. |
| `quantity_unit_conversions_resolved` | read-only view | All conversions, with the transitive ones computed. |
| `stock` | read-only view | The current stock entries. |
| `stock_log` | read-only view | The stock journal. |
| `stock_current_locations` | read-only view | Where each product has stock now. |
| `products_last_purchased` | read-only view | The last purchase of each product. |
| `products_average_price` | read-only view | The average price of each product. |

"Read-only view" means the entity is in `ExposedEntityNoEdit` and
`ExposedEntityNoDelete` in the spec. The API lists and reads it but does not
write it.

## Area: Shopping list

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/shoppinglist` | `StockController::ShoppingList` | Shopping list. Shows one list, with the "add missing", "add overdue", "add expired", "clear", and "print" actions. |
| `/shoppinglistitem/{itemId}` | `StockController::ShoppingListItemEditForm` | Edit one shopping list item. |
| `/shoppinglist/{listId}` | `StockController::ShoppingListEditForm` | Edit one shopping list (the list itself). |
| `/shoppinglistsettings` | `StockController::ShoppingListSettings` | Shopping list settings. |

### API operations

The spec puts these under the tag `Stock`. `routes.php` puts them under the
comment "Shopping list".

| Operation | Purpose |
| --- | --- |
| `POST /stock/shoppinglist/add-missing-products` | Adds the products below the minimum stock amount. |
| `POST /stock/shoppinglist/add-overdue-products` | Adds the overdue products. |
| `POST /stock/shoppinglist/add-expired-products` | Adds the expired products. |
| `POST /stock/shoppinglist/add-product` | Adds one product with an amount. |
| `POST /stock/shoppinglist/remove-product` | Removes an amount of one product. |
| `POST /stock/shoppinglist/clear` | Removes all items from one list. |

### Entity types (3)

| Entity | Kind | Notes |
| --- | --- | --- |
| `shopping_lists` | editable | The lists. |
| `shopping_list` | editable | The items on the lists. |
| `uihelper_shopping_list` | read-only view | The items with product data joined, for the UI. |

## Area: Recipes

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/recipes` | `RecipesController::Overview` | Recipes. Lists the recipes and shows one, with the stock fulfillment of its ingredients. |
| `/recipe/{recipeId}` | `RecipesController::RecipeEditForm` | Edit one recipe. |
| `/recipe/{recipeId}/pos/{recipePosId}` | `RecipesController::RecipePosEditForm` | Edit one ingredient of a recipe. |
| `/recipe/{recipeId}/grocycode` | `RecipesController::RecipeGrocycodeImage` | Returns a Grocycode barcode image for one recipe. Not an HTML page. |
| `/recipessettings` | `RecipesController::RecipesSettings` | Recipes settings. |

### API operations, tag `Recipes`

| Operation | Purpose |
| --- | --- |
| `GET /recipes/fulfillment` | Returns the stock fulfillment of all recipes. |
| `GET /recipes/{recipeId}/fulfillment` | Returns the stock fulfillment of one recipe. |
| `POST /recipes/{recipeId}/add-not-fulfilled-products-to-shoppinglist` | Adds the missing ingredients to the shopping list. |
| `POST /recipes/{recipeId}/consume` | Consumes the ingredients that are in stock. |
| `POST /recipes/{recipeId}/copy` | Copies a recipe. |
| `GET /recipes/{recipeId}/printlabel` | Prints the Grocycode label of one recipe. |

### Entity types (4)

| Entity | Kind | Notes |
| --- | --- | --- |
| `recipes` | editable | The recipes. |
| `recipes_pos` | editable | The ingredients. "Pos" means position (line) in the recipe. |
| `recipes_nestings` | editable | A recipe that includes another recipe. |
| `recipes_pos_resolved` | read-only view | The ingredients with the stock fulfillment computed. |

## Area: Meal plan

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/mealplan` | `RecipesController::MealPlan` | Meal plan. A week calendar of recipes, products, and notes. |
| `/mealplansections` | `RecipesController::MealPlanSectionsList` | Meal plan sections list (master data; for example "Breakfast"). |
| `/mealplansection/{sectionId}` | `RecipesController::MealPlanSectionEditForm` | Edit one section. |

### API operations

None with a dedicated route. The UI reads and writes the meal plan through
the generic entity operations on `meal_plan` and `meal_plan_sections`.

### Entity types (2)

| Entity | Kind |
| --- | --- |
| `meal_plan` | editable |
| `meal_plan_sections` | editable |

## Area: Chores

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/choresoverview` | `ChoresController::Overview` | Chores overview. Lists the chores with their next due time and the assigned user. |
| `/choretracking` | `ChoresController::TrackChoreExecution` | Chore tracking form. Records that a chore was done. |
| `/choresjournal` | `ChoresController::Journal` | Chores journal. Lists every execution and lets the user undo one. |
| `/chores` | `ChoresController::ChoresList` | Chores list (master data). |
| `/chore/{choreId}` | `ChoresController::ChoreEditForm` | Edit one chore. |
| `/chore/{choreId}/grocycode` | `ChoresController::ChoreGrocycodeImage` | Returns a Grocycode barcode image for one chore. Not an HTML page. |
| `/choressettings` | `ChoresController::ChoresSettings` | Chores settings. |

### API operations, tag `Chores`

| Operation | Purpose |
| --- | --- |
| `GET /chores` | Returns all chores with the next estimated execution time. |
| `GET /chores/{choreId}` | Returns the details of one chore. |
| `POST /chores/{choreId}/execute` | Records one execution. |
| `POST /chores/executions/{executionId}/undo` | Undoes one execution. |
| `POST /chores/executions/calculate-next-assignments` | Recomputes the next assigned user of every chore. |
| `POST /chores/{choreIdToKeep}/merge/{choreIdToRemove}` | Merges two chores. |
| `GET /chores/{choreId}/printlabel` | Prints the Grocycode label of one chore. |

### Entity types (2)

| Entity | Kind |
| --- | --- |
| `chores` | editable |
| `chores_log` | read-only view |

## Area: Tasks

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/tasks` | `TasksController::Overview` | Tasks. Lists the open tasks and lets the user complete one. |
| `/task/{taskId}` | `TasksController::TaskEditForm` | Edit one task. |
| `/taskcategories` | `TasksController::TaskCategoriesList` | Task categories list (master data). |
| `/taskcategory/{categoryId}` | `TasksController::TaskCategoryEditForm` | Edit one category. |
| `/taskssettings` | `TasksController::TasksSettings` | Tasks settings. |

### API operations, tag `Tasks`

| Operation | Purpose |
| --- | --- |
| `GET /tasks` | Returns the tasks that are not done. |
| `POST /tasks/{taskId}/complete` | Marks one task as done. |
| `POST /tasks/{taskId}/undo` | Marks one task as not done. |

### Entity types (2)

| Entity | Kind |
| --- | --- |
| `tasks` | editable |
| `task_categories` | editable |

## Area: Batteries

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/batteriesoverview` | `BatteriesController::Overview` | Batteries overview. Lists the batteries with the next charge time. |
| `/batterytracking` | `BatteriesController::TrackChargeCycle` | Battery tracking form. Records a charge cycle. |
| `/batteriesjournal` | `BatteriesController::Journal` | Batteries journal. Lists every charge cycle and lets the user undo one. |
| `/batteries` | `BatteriesController::BatteriesList` | Batteries list (master data). |
| `/battery/{batteryId}` | `BatteriesController::BatteryEditForm` | Edit one battery. |
| `/battery/{batteryId}/grocycode` | `BatteriesController::BatteryGrocycodeImage` | Returns a Grocycode barcode image for one battery. Not an HTML page. |
| `/batteriessettings` | `BatteriesController::BatteriesSettings` | Batteries settings. |

### API operations, tag `Batteries`

| Operation | Purpose |
| --- | --- |
| `GET /batteries` | Returns all batteries with the next estimated charge time. |
| `GET /batteries/{batteryId}` | Returns the details of one battery. |
| `POST /batteries/{batteryId}/charge` | Records one charge cycle. |
| `POST /batteries/charge-cycles/{chargeCycleId}/undo` | Undoes one charge cycle. |
| `GET /batteries/{batteryId}/printlabel` | Prints the Grocycode label of one battery. |

### Entity types (2)

| Entity | Kind |
| --- | --- |
| `batteries` | editable |
| `battery_charge_cycles` | read-only view |

## Area: Equipment

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/equipment` | `EquipmentController::Overview` | Equipment. Lists the equipment and shows the instruction manual of one item. |
| `/equipment/{equipmentId}` | `EquipmentController::EditForm` | Edit one equipment item. |

### API operations

None with a dedicated route. The UI uses the generic entity operations on
`equipment` and the file operations on the file group `equipmentmanuals`.

### Entity types (1)

| Entity | Kind |
| --- | --- |
| `equipment` | editable |

## Area: Calendar

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/calendar` | `CalendarController::Overview` | Calendar. Shows the due dates of stock, chores, tasks, batteries, and meal plan entries in one month view. The server computes the events with `CalendarService::GetEvents`. |

### API operations, tag `Calendar`

| Operation | Purpose |
| --- | --- |
| `GET /calendar/ical` | Returns the calendar as an iCal feed. |
| `GET /calendar/ical/sharing-link` | Returns a public link to the iCal feed. |

### Entity types

None.

## Area: Users

`routes.php` names three groups: "User routes" (UI), "Users" (API, user
management), and "User" (API, the current user). The spec has the tags
`User management` and `Current user`.

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/users` | `UsersController::UsersList` | Manage users. |
| `/user/{userId}` | `UsersController::UserEditForm` | Edit one user. Also changes the password. |
| `/user/{userId}/permissions` | `UsersController::PermissionList` | Set the permissions of one user. |
| `/user/{userId}/sessions` | `UsersController::SessionList` | List and end the sessions of one user. |
| `/usersettings` | `UsersController::UserSettings` | User settings (per-user options). |

### API operations, tag `User management`

| Operation | Purpose |
| --- | --- |
| `GET /users` | Returns all users. |
| `POST /users` | Creates a user. |
| `PUT /users/{userId}` | Edits a user. |
| `DELETE /users/{userId}` | Deletes a user. |
| `GET /users/{userId}/permissions` | Returns the permissions of a user. |
| `POST /users/{userId}/permissions` | Adds one permission to a user. |
| `PUT /users/{userId}/permissions` | Replaces the permissions of a user. |

### API operations, tag `Current user`

| Operation | Purpose |
| --- | --- |
| `GET /user` | Returns the authenticated user. |
| `GET /user/settings` | Returns all settings of the authenticated user. |
| `GET /user/settings/{settingKey}` | Returns one setting. |
| `PUT /user/settings/{settingKey}` | Sets one setting. |
| `DELETE /user/settings/{settingKey}` | Deletes one setting. |

### Entity types (3)

| Entity | Kind | Notes |
| --- | --- | --- |
| `sessions` | read-only, no listing | Login sessions. The API can read one by id and delete one. It cannot list them. |
| `api_keys` | read-only, no listing | API keys. The API can read one by id and delete one. It cannot list or create them. |
| `permission_hierarchy` | read-only view | The permission tree. |

The `users` table is not an exposed entity. The `User management` operations
cover it.

## Area: Generic entity interaction

This area holds the generic CRUD (create, read, update, delete) operations
and the user-defined fields, entities, and objects.

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/userfields` | `GenericEntityController::UserfieldsList` | Userfields. Custom fields added to any entity. |
| `/userfield/{userfieldId}` | `GenericEntityController::UserfieldEditForm` | Edit one userfield. |
| `/userentities` | `GenericEntityController::UserentitiesList` | Userentities. Custom entity types. |
| `/userentity/{userentityId}` | `GenericEntityController::UserentityEditForm` | Edit one userentity. |
| `/userobjects/{userentityName}` | `GenericEntityController::UserobjectsList` | The objects of one userentity. |
| `/userobject/{userentityName}/{userobjectId}` | `GenericEntityController::UserobjectEditForm` | Edit one userobject. |

### API operations, tag `Generic entity interactions`

| Operation | Purpose |
| --- | --- |
| `GET /objects/{entity}` | Lists the objects of an entity. Supports `query[]`, `order`, `limit`, `offset`. |
| `GET /objects/{entity}/{objectId}` | Returns one object. |
| `POST /objects/{entity}` | Creates one object. |
| `PUT /objects/{entity}/{objectId}` | Edits one object. |
| `DELETE /objects/{entity}/{objectId}` | Deletes one object. |
| `GET /userfields/{entity}/{objectId}` | Returns the userfield values of one object. |
| `PUT /userfields/{entity}/{objectId}` | Sets the userfield values of one object. |

`{entity}` must be one of the 36 values in `ExposedEntity`. The controller
checks the name against the enum in the spec at run time. The spec also
has three lists that limit the generic operations: `ExposedEntityNoListing`
(2 entities), `ExposedEntityNoEdit` (14 entities), and
`ExposedEntityNoDelete` (12 entities). `ExposedEntityEditRequiresAdmin` is
empty.

### Entity types (3)

| Entity | Kind |
| --- | --- |
| `userfields` | editable |
| `userentities` | editable |
| `userobjects` | editable |

## Area: Files

### UI pages

None. The UI uploads and deletes files from the product, recipe, user, and
equipment forms, and from the userfield type "file".

### API operations, tag `Files`

| Operation | Purpose |
| --- | --- |
| `PUT /files/{group}/{fileName}` | Uploads one file. |
| `GET /files/{group}/{fileName}` | Serves one file. |
| `DELETE /files/{group}/{fileName}` | Deletes one file. |

The UI uses five file groups: `productpictures`, `recipepictures`,
`userpictures`, `equipmentmanuals`, and `userfiles`. The file name is
base64-encoded in the URL.

### Entity types

None.

## Area: Print

### UI pages

None. The print actions are buttons on the stock, shopping list, recipe,
chore, and battery pages.

### API operations

| Operation | Tag | Purpose |
| --- | --- | --- |
| `GET /print/shoppinglist/thermal` | `Print` | Prints the shopping list on a thermal printer. |
| `GET /stock/products/{productId}/printlabel` | `Stock` | Prints a Grocycode label. |
| `GET /stock/entry/{entryId}/printlabel` | `Stock` | Prints a Grocycode label. |
| `GET /recipes/{recipeId}/printlabel` | `Recipes` | Prints a Grocycode label. |
| `GET /chores/{choreId}/printlabel` | `Chores` | Prints a Grocycode label. |
| `GET /batteries/{batteryId}/printlabel` | `Batteries` | Prints a Grocycode label. |

The five `printlabel` operations are listed in their own areas above. This
table collects them because they share one feature flag,
`FEATURE_FLAG_LABEL_PRINTER`.

### Entity types

None.

## Area: System

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/` | `SystemController::Root` | Redirects to the stock overview, or to the first enabled area. |
| `/about` | `SystemController::About` | About Grocy. Shows the version. |
| `/manifest` | `SystemController::Manifest` | Returns the web app manifest. Not an HTML page. |
| `/barcodescannertesting` | `SystemController::BarcodeScannerTesting` | Test page for the camera barcode scanner. |
| `/login` | `LoginController::LoginPage` | Login form. |
| `POST /login` | `LoginController::ProcessLogin` | Processes the login form. Sets a session cookie. |
| `/logout` | `LoginController::Logout` | Ends the session. Redirects to `/`. |

### API operations, tag `System`

| Operation | Purpose |
| --- | --- |
| `GET /system/info` | Returns the Grocy version, PHP version, and OS. |
| `GET /system/time` | Returns the server time. |
| `GET /system/db-changed-time` | Returns when the database last changed. |
| `GET /system/config` | Returns the config settings. |
| `GET /system/localization-strings` | Returns the translated strings for the user's language. |
| `POST /system/log-missing-localization` | Logs a string that has no translation. |

### Entity types

None.

## Area: OpenAPI

### UI pages

| Route | Controller method | Page |
| --- | --- | --- |
| `/api` | `OpenApiController::DocumentationUi` | REST API browser (Swagger UI). |
| `/manageapikeys` | `OpenApiController::ApiKeysList` | Manage API keys. |
| `/manageapikeys/new` | `OpenApiController::CreateNewApiKey` | Creates one API key and redirects to the list. Not an HTML page. |

### API operations

| Operation | Purpose |
| --- | --- |
| `GET /openapi/specification` | Returns the OpenAPI spec. This route is in `routes.php`. The spec does not list it. |

### Entity types

`api_keys` is listed under Users above.

## UI functions with no API operation

These UI functions have no API operation that does the same work. An API
client (grocy-mcp or Grocy Next) cannot do them through the API.

| UI function | Route | What the server does | Closest API operation |
| --- | --- | --- | --- |
| Login and logout | `POST /login`, `/logout` | Checks the password and sets a session cookie. | None. The API authenticates with an API key only. |
| Create an API key | `/manageapikeys/new` | Creates a key with `ApiKeyService`. | None. `api_keys` is in `ExposedEntityNoEdit`. |
| List API keys | `/manageapikeys` | Reads the `api_keys` table. | None. `api_keys` is in `ExposedEntityNoListing`. |
| List the sessions of a user | `/user/{userId}/sessions` | Reads the `sessions` table. | None. `sessions` is in `ExposedEntityNoListing`. |
| Grocycode barcode image | `/product/{id}/grocycode`, `/stockentry/{id}/grocycode`, `/recipe/{id}/grocycode`, `/chore/{id}/grocycode`, `/battery/{id}/grocycode` | Renders a barcode image. | The `printlabel` operations send the label to a printer. No operation returns the image. |
| Stock entry label page | `/stockentry/{entryId}/label` | Renders a printable HTML label. | `GET /stock/entry/{entryId}/printlabel` prints it. No operation returns the label. |
| Stock journal summary | `/stockjournal/summary` | Reads the database view `uihelper_stock_journal_summary`. | None. The view is not an exposed entity. A client can read `stock_log` and sum it. |
| Spendings report | `/stockreports/spendings` | Runs a SQL query in `StockReportsController::Spendings`. | None. A client can read `stock_log` and sum it. |
| Location content sheet | `/locationcontentsheet` | Calls `StockService::GetCurrentStockLocationContent`. | `GET /stock/locations/{locationId}/entries` per location, or the `stock_current_locations` entity. |
| Calendar month view | `/calendar` | Calls `CalendarService::GetEvents` and renders the events. | `GET /calendar/ical` returns the same events as iCal text. |
| Quantity unit plural testing | `/quantityunitpluraltesting` | Renders the plural forms. | None. Test page only. |
| Barcode scanner testing | `/barcodescannertesting` | Renders a camera test. | None. Test page only. |
| About page | `/about` | Shows the version. | `GET /system/info`. |
| Web app manifest | `/manifest` | Returns the manifest. | None. |

The server renders every overview page with data from the database. For the
other overview pages (stock overview, recipes, meal plan, chores, tasks,
batteries, equipment, and every master data list) an API operation or an
exposed entity returns the same data.

## API operations the UI does not use

These operations exist in the API. The browser code in `public/js/` and
`public/viewjs/` never calls them. The server-rendered page gets the same
data another way, or no page needs it.

| Operation | Why the UI does not need it |
| --- | --- |
| `GET /stock/products/by-barcode/{barcode}` and the five `POST .../by-barcode/{barcode}/...` operations (6 in total) | The UI resolves a barcode to a product id in the product picker and then calls the `{productId}` operations. The by-barcode operations exist for external clients and scanners. |
| `GET /stock/locations/{locationId}/entries` | The location content sheet is server-rendered. |
| `POST /stock/shoppinglist/remove-product` | The UI deletes or edits a `shopping_list` object with the generic operations. |
| `GET /recipes/fulfillment`, `GET /recipes/{recipeId}/fulfillment` | The recipes page and the meal plan page get the fulfillment server-side. |
| `GET /users` | The users list is server-rendered. |
| `GET /users/{userId}/permissions`, `POST /users/{userId}/permissions` | The permissions page is server-rendered and saves with `PUT`. |
| `GET /user`, `GET /user/settings`, `GET /user/settings/{settingKey}` | The layout embeds the user and the settings in the page. The UI calls only `PUT` and `DELETE`. |
| `GET /system/info`, `GET /system/time`, `GET /system/config`, `GET /system/localization-strings` | The layout embeds this data in the page. The UI calls only `GET /system/db-changed-time` (auto reload) and `POST /system/log-missing-localization`. |
| `GET /calendar/ical` | The calendar page and the API keys page link to it. The browser code does not fetch it. |

That is 21 operations out of 87. The UI calls the other 66, plus
`GET /openapi/specification` from the REST API browser.

## Entity types with no dedicated UI page

Every editable entity has a list page and an edit form in the UI. The
read-only views appear inside other pages. Two entities have no page of
their own: `permission_hierarchy` (used inside the permissions page) and
`uihelper_shopping_list` (used inside the shopping list page).

## Summary for the domain areas ticket

| Area | UI routes | API operations | Entity types |
| --- | --- | --- | --- |
| Stock | 29 | 29 | 14 |
| Shopping list | 4 | 6 | 3 |
| Recipes | 5 | 6 | 4 |
| Meal plan | 3 | 0 | 2 |
| Chores | 7 | 7 | 2 |
| Tasks | 5 | 3 | 2 |
| Batteries | 7 | 5 | 2 |
| Equipment | 2 | 0 | 1 |
| Calendar | 1 | 2 | 0 |
| Users | 5 | 12 | 3 |
| Generic entity interaction | 6 | 7 | 3 |
| Files | 0 | 3 | 0 |
| Print | 0 | 1 (plus 5 counted in other areas) | 0 |
| System | 7 | 6 | 0 |
| OpenAPI | 3 | 1 (not in the spec) | 0 |
| Total | 84 | 87 in the spec, 88 in `routes.php` | 36 |

The Stock area is the largest. It holds a third of the UI routes, a third of
the API operations, and 14 of the 36 entity types. Shopping list, Recipes,
and Meal plan depend on Stock entities. Chores, Tasks, Batteries, and
Equipment stand alone. Calendar reads from Stock, Chores, Tasks, Batteries,
and Meal plan.
