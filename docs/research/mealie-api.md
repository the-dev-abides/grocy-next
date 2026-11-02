# Mealie API capabilities for the assistant requirements

Research ticket: GitHub issue #29. Parent map: issue #1.

This document answers one question. What does the Mealie API offer for the items in sections 3.5, 3.6, and 3.7 of `docs/requirements/assistant.md`?

## Sources

All facts come from the Mealie source at the current stable release. Secondary write-ups were not used.

| Source | Where |
|---|---|
| Release | Mealie `v3.30.0`, published 2026-10-31. <https://github.com/mealie-recipes/mealie/releases/tag/v3.30.0> |
| Source tree | <https://github.com/mealie-recipes/mealie/tree/v3.30.0>. File paths below are relative to this tree. |
| API usage guide | `docs/docs/documentation/getting-started/api-usage.md` |
| Live OpenAPI document | Each Mealie server serves it at `/docs` (Swagger UI) and `/openapi.json`. The public demo is <https://demo.mealie.io/docs>. Source: `mealie/core/settings/settings.py`, property `DOCS_URL`. |

Every endpoint below has the prefix `/api`. Source: `mealie/routes/__init__.py`.

Mealie uses camelCase in JSON. This document uses the JSON names.

## 1. Summary

| Requirement | Mealie API | Status |
|---|---|---|
| 3.5.1 Create, rename, delete foods; plural names; aliases | `POST /foods`, `PUT /foods/{id}`, `DELETE /foods/{id}` | Supported |
| 3.5.2 Set a food's label, description | `PUT /foods/{id}` with `labelId`, `description`; labels at `/groups/labels` | Supported |
| 3.5.3 List the recipes that use a food | `GET /recipes?foods={id}`; `recipeCount` on each food; `GET /foods/empty` | Supported |
| 3.5.4 Merge one food into another | `PUT /foods/merge` | Supported |
| 3.5.5 Read recipe ingredients: food, amount, unit | `GET /recipes/{slug}` returns `recipeIngredient[]` | Supported |
| 3.6.1 Links between products and foods, and between units | No link concept in Mealie. Food `extras` can hold a Grocy id. Units have no `extras`. | Not supported (partial storage only) |
| 3.6.2 List unlinked, suggest links | `GET /foods?perPage=-1`, `GET /units?perPage=-1` give the full lists. Matching is the client's job. | Not supported (lists only) |
| 3.6.3 Find broken links | `GET /foods/{id}` and `GET /units/{id}` return 404 for a missing id | Supported (by existence check) |
| 3.6.4 Create a link without a rename | Not a Mealie API question. No Mealie read endpoint changes data. | Not applicable |
| 3.7.1 Units: name, plural, abbreviation, aliases | `POST /units`, `PUT /units/{id}`, `DELETE /units/{id}`, `PUT /units/merge` | Supported |
| 3.7.2 General conversions (1 kg = 1000 g) | No endpoint. Each unit maps to one of eight fixed standard units. Conversion is built in through the `pint` library. No standard-library import endpoint. | Not supported |
| 3.7.3 Product-specific conversions | None | Not supported |
| 3.7.4 Resolved conversions for a product | None | Not supported |

Other facts that matter for the design:

- The "I made this" action is two calls from the web client: `POST /recipes/timeline/events`, then `PATCH /recipes/{slug}/last-made`. Both fire the internal event `recipe_updated`.
- Mealie "webhooks" fire only on a schedule for the meal plan. They do not fire on recipe, food, or unit changes.
- Event notifications (Apprise) can push `recipe_updated` to a JSON URL. The payload gives the recipe slug and the timeline event id. It does not say "made".
- Food and unit changes fire no event. There is no event type for foods or units.
- A Recipe Action of type `post` sends the full recipe JSON, with ingredient quantities, to an external URL. The user starts it by hand from the recipe menu.
- Bulk endpoints exist for recipes only. Foods and units have no bulk create, update, or delete.

## 2. Foods

Route file: `mealie/routes/unit_and_foods/foods.py`. Schema: `mealie/schema/recipe/recipe_ingredient.py`.

| Method and path | Purpose | Notes |
|---|---|---|
| `GET /foods` | List foods, paginated | Query `search`, `queryFilter`, `orderBy`, `page`, `perPage`. `perPage=-1` returns all. |
| `POST /foods` | Create one food | Returns 201 and the food. |
| `GET /foods/empty` | Foods that no recipe ingredient and no shopping list item uses | Source: `mealie/repos/repository_foods.py`, `get_empty`. |
| `PUT /foods/merge` | Merge one food into another | Body `{"fromFood": "<id>", "toFood": "<id>"}`. Returns a success message, not the food. |
| `GET /foods/{id}` | Read one food | 404 when the id does not exist. |
| `PUT /foods/{id}` | Replace one food | Body is the full food. Fields that are not sent return to their defaults. |
| `DELETE /foods/{id}` | Delete one food | Returns the deleted food. |

Food fields (`CreateIngredientFood`):

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required. |
| `pluralName` | string or null | |
| `description` | string | |
| `extras` | object | Free key/value pairs. API only. The API usage guide names this the place for third-party ids. |
| `labelId` | UUID or null | One label per food. |
| `aliases` | list of `{"name": string}` | |
| `substitutions` | list | Other foods or a note that can replace this food. |
| `householdsWithIngredientFood` | list of household slugs | "On hand" flag per household. |

Read-only fields on the response (`IngredientFood`): `id`, `label` (object with `name`, `color`), `recipeCount`, `createdAt`, `updatedAt`.

Rename: send `PUT /foods/{id}` with the new `name`. Mealie has no separate rename endpoint.

Delete: the recipe ingredient keeps its row. The relationship from food to ingredients has no delete cascade, so the ingredient's `foodId` becomes null. Source: `mealie/db/models/recipe/ingredient.py`, `IngredientFoodModel.ingredients`.

Merge: `PUT /foods/merge` moves every recipe ingredient, every substitution, and every shopping list item from `fromFood` to `toFood`. Then it deletes `fromFood`. Substitutions that would point a food at itself are dropped. Source: `mealie/repos/repository_foods.py`, `merge`.

Permission: `POST`, `PUT`, and `DELETE` need the `group:organize` permission (`user.canOrganize`). Source: `mealie/routes/_base/permissions.py`.

### Labels

Route file: `mealie/routes/groups/controller_labels.py`. Schema: `mealie/schema/labels/multi_purpose_label.py`.

| Method and path | Purpose |
|---|---|
| `GET /groups/labels` | List labels |
| `POST /groups/labels` | Create a label. Fields `name`, `color`. |
| `GET /groups/labels/empty` | Labels that nothing uses |
| `POST /groups/labels/merge` | Merge. Body `{"fromId", "toId"}`. |
| `PUT /groups/labels/{id}` | Update |
| `DELETE /groups/labels/{id}` | Delete |

## 3. Recipe ingredients

Route file: `mealie/routes/recipe/recipe_crud_routes.py`. Schema: `mealie/schema/recipe/recipe.py` and `recipe_ingredient.py`.

`GET /recipes/{slug}` accepts a slug or an id. It returns the full recipe with `recipeIngredient[]`. Each ingredient has:

| Field | Type | Notes |
|---|---|---|
| `quantity` | number or null | Rounded to 3 decimals. |
| `unit` | unit object or null | Full `IngredientUnit`. |
| `food` | food object or null | Full `IngredientFood`. |
| `note` | string | Free text. |
| `display` | string | Mealie builds this text from the other fields. |
| `originalText` | string or null | The text before parsing. |
| `title` | string or null | A section heading. |
| `referenceId` | UUID | Client-side row id. |
| `substitutions` | list | Per-ingredient substitutions. |

The list endpoint `GET /recipes` returns `RecipeSummary`. That object has no `recipeIngredient`. One call per recipe is needed to read ingredients.

To change ingredients, send `PUT /recipes/{slug}` or `PATCH /recipes/{slug}` with the full `recipeIngredient` list. There is no endpoint for one ingredient.

## 4. The recipes that use a food

Four ways:

1. `GET /recipes?foods={foodId}`. Repeat `foods` for several ids. `requireAllFoods=true` demands every food. The filter matches a recipe that calls for the food or offers the food as a substitution. Source: `mealie/repos/repository_recipes.py`, `_recipes_using_foods`.
2. `GET /recipes?queryFilter=recipe_ingredient.food.id IN ["<id>"]`. The filter builder walks the ingredient relationship. Source: `tests/unit_tests/repository_tests/test_query_filter_builder.py`, which tests `recipe_ingredient.food.label_id`.
3. `recipeCount` on each food from `GET /foods`. It counts distinct recipes. Source: `mealie/repos/repository_foods.py`, `_query`.
4. `GET /foods/empty` lists the foods with no recipe and no shopping list item.

`GET /recipes/suggestions?foods={id}` also exists. It ranks recipes by the foods a household has on hand. It is not a plain usage list.

## 5. Units

Route file: `mealie/routes/unit_and_foods/units.py`.

| Method and path | Purpose |
|---|---|
| `GET /units` | List units, paginated. Same query parameters as foods. |
| `POST /units` | Create |
| `PUT /units/merge` | Merge. Body `{"fromUnit", "toUnit"}`. Moves recipe ingredients and shopping list items, then deletes `fromUnit`. Source: `mealie/repos/repository_units.py`, `merge`. |
| `GET /units/{id}` | Read |
| `PUT /units/{id}` | Replace |
| `DELETE /units/{id}` | Delete. The ingredient's `unitId` becomes null. |

Unit fields (`CreateIngredientUnit`):

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required. |
| `pluralName` | string or null | |
| `abbreviation` | string | |
| `pluralAbbreviation` | string or null | |
| `useAbbreviation` | boolean | |
| `fraction` | boolean | Show the quantity as a fraction. |
| `description` | string | |
| `aliases` | list of `{"name": string}` | |
| `standardQuantity` | number or null | See section 6. |
| `standardUnit` | string or null | See section 6. |
| `extras` | object | The schema accepts it. The unit database model has no extras table, so the value is not stored. Source: `mealie/db/models/recipe/ingredient.py`, `IngredientUnitModel`. |

Permission: writes need `group:organize`.

## 6. Conversions

Mealie has no user-defined conversion. It has one fixed mechanism:

- A unit can map to one standard unit with a quantity. Example: `tablespoon` = `15 milliliter`. The standard units are `fluid_ounce`, `cup`, `ounce`, `pound`, `milliliter`, `liter`, `gram`, `kilogram`. Source: `StandardizedUnitType` in `mealie/schema/recipe/recipe_ingredient.py`. The fields were added on 2026-02-21. Source: `mealie/alembic/versions/2026-02-21-17.59.01_a39c7f1826e3_add_unit_standardization_fields.py`.
- Conversion between standard units comes from the `pint` library. Source: `mealie/services/parser_services/parser_utils/unit_utils.py`, class `UnitConverter`.
- Mealie uses this only when it merges two shopping list items. Source: `mealie/services/household_services/shopping_lists.py`.

So:

- 3.7.2, general conversions: no endpoint creates or deletes one. The fixed pairs (1 kg = 1000 g) live inside `pint`. The client can set `standardQuantity` and `standardUnit` on a unit through `PUT /units/{id}`. That is the only lever.
- 3.7.2, standard-library import: `POST /groups/seeders/units` with `{"locale": "en-US"}` seeds the default unit list for a locale. The repository fills `standardQuantity` and `standardUnit` for known names on create. Source: `mealie/routes/groups/controller_seeder.py` and `mealie/repos/repository_units.py`, `_add_standardized_unit`. This is a seed, not a conversion import. `POST /groups/seeders/foods` seeds foods the same way.
- 3.7.3, product-specific conversions: nothing. Foods have no density or package size fields.
- 3.7.4, resolved conversions: nothing.

## 7. The "I made this" action

Client file: `frontend/app/components/Domain/Recipe/RecipeLastMade.vue`, function `createTimelineEvent`.

The client makes these calls, in this order:

1. `POST /recipes/timeline/events`. Body: `{"recipeId", "subject": "<user> made this", "eventType": "comment", "eventMessage", "timestamp"}`. The timestamp is the chosen date at 23:59:59 local time. Source for the route: `mealie/routes/recipe/timeline_events.py`.
2. `PATCH /recipes/{slug}/last-made`. Body: `{"timestamp"}`. Only when the new timestamp is later than the stored one.
3. The same two calls for each selected child recipe.
4. `PUT /recipes/timeline/events/{id}/image` when the user adds a photo.

`lastMade` is stored per household, not on the recipe. Read it with `GET /households/self/recipes/{slug}`. Source: `mealie/services/recipe/recipe_service.py`, `update_last_made`, and `mealie/routes/households/controller_household_self_service.py`.

The timeline event is a plain row. Nothing in it marks it as "made" other than the subject text. `eventType` is one of `system`, `info`, `comment`. Source: `TimelineEventType` in `mealie/schema/recipe/recipe_timeline_events.py`.

Timeline events can be listed: `GET /recipes/timeline/events?queryFilter=recipe.slug = "<slug>"`. The event has `recipeId`, `userId`, `subject`, `eventType`, `eventMessage`, `timestamp`, `createdAt`.

### Events that the action fires

Mealie has an internal event bus. Source: `mealie/services/event_bus_service/event_types.py`.

| Call | Event type | Document data |
|---|---|---|
| `POST /recipes/timeline/events` | `recipe_updated` | `{"documentType": "recipe_timeline_event", "operation": "create", "recipeSlug", "recipeTimelineEventId"}` |
| `PATCH /recipes/{slug}/last-made` | `recipe_updated` | `{"documentType": "recipe", "operation": "update", "recipeSlug"}` |

Both events are the same type as every other recipe edit. A listener must read `documentType` and then fetch the timeline event to know that a cook happened.

Two subscriber mechanisms exist:

1. Event notifications. Routes: `/households/events/notifications` (`GET`, `POST`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/test`). Each notifier has an Apprise URL and a set of boolean options, one per event type, for example `recipeUpdated`. Source: `mealie/routes/households/controller_group_notifications.py` and `mealie/schema/household/group_events.py`. For Apprise URLs with scheme `json`, `jsons`, `form`, `forms`, `xml`, or `xmls`, Mealie adds `event_type`, `integration_id`, `document_data` (JSON string), `event_id`, and `timestamp` as custom fields in the payload. Source: `AppriseEventListener.update_urls_with_event_data` in `mealie/services/event_bus_service/event_bus_listeners.py`. A `json://host/path` URL is a plain HTTP POST with a JSON body. This is the only push path for recipe changes.
2. Webhooks. Routes: `/households/webhooks`. The only `webhookType` is `mealplan`. A webhook has a `scheduledTime` and fires once a day with the meal plan for that day. It does not fire on recipe, timeline, food, or unit changes. Source: `mealie/schema/household/webhook.py` and `WebhookEventListener` in `event_bus_listeners.py`.

No event type exists for foods or units. Labels have `label_created`, `label_updated`, `label_deleted`. Food and unit writes fire nothing. A client that mirrors foods must poll `GET /foods` and compare `updatedAt`.

Both routes need the `household:manage` permission.

### Recipe Actions: a manual push of the full recipe

Routes: `/households/recipe-actions` (`GET`, `POST`, `PUT /{id}`, `DELETE /{id}`) and `POST /households/recipe-actions/{id}/trigger/{recipeSlug}` with body `{"recipeScale": 1}`. Source: `mealie/routes/households/controller_group_recipe_actions.py` and `mealie/schema/household/group_recipe_action.py`.

A recipe action has `actionType` (`link` or `post`), `title`, and `url`. For `post`, the trigger sends an HTTP POST to `url` in the background. The body is `{"action": <the action>, "content": <the full recipe JSON with ingredients>, "recipeScale": <number>}`. The user starts it from the recipe menu. It does not run on "I made this". It is the one Mealie feature that sends ingredient quantities to an external URL.

## 8. Bulk operations

Recipes. Source: `mealie/routes/recipe/recipe_crud_routes.py` and `mealie/routes/recipe/bulk_actions.py`.

| Method and path | Purpose | All or nothing? |
|---|---|---|
| `PUT /recipes` | Replace many recipes. Body: list of recipes with `id`. | No. The server updates one recipe at a time and commits each one. |
| `PATCH /recipes` | Patch many recipes. | No. Same loop. |
| `POST /recipes/bulk-actions/tag` | Add tags to many recipes | |
| `POST /recipes/bulk-actions/categorize` | Add categories to many recipes | |
| `POST /recipes/bulk-actions/settings` | Set recipe settings on many recipes | |
| `POST /recipes/bulk-actions/delete` | Delete many recipes by slug | |
| `POST /recipes/bulk-actions/export` | Export many recipes to a zip | |
| `POST /recipes/create/url/bulk` | Import many recipes from URLs | Runs in the background. |

Foods, units, and labels: no bulk create, update, or delete. Merge takes one pair per call. The seeders (`POST /groups/seeders/foods`, `/units`, `/labels`) add a fixed default list for a locale.

Reads are bulk through pagination: `perPage=-1` returns every row.

## 9. Filtering

The `queryFilter` parameter works on most list endpoints, including `/foods`, `/units`, `/recipes`, and `/recipes/timeline/events`. It supports `=`, `<>`, `<`, `>`, `LIKE`, `IN`, `IS NULL`, `CONTAINS ALL`, `AND`, `OR`, parentheses, nested properties (`label.name`), and the placeholder `$NOW`. Source: `docs/docs/documentation/getting-started/api-usage.md`, section "Filtering".

Examples that matter here:

- Foods changed since a time: `GET /foods?queryFilter=updatedAt > "2026-11-01T00:00:00Z"`
- Foods without a label: `GET /foods?queryFilter=labelId IS NULL`
- Recipes not made in 30 days: `GET /recipes?queryFilter=lastMade <= "$NOW-30d"`

## 10. Requirement by requirement

### 3.5 Mealie foods

| Item | Status | How |
|---|---|---|
| 3.5.1 Create, rename, delete foods; set plural names and aliases | Supported | `POST /foods`, `PUT /foods/{id}` with `name`, `pluralName`, `aliases`; `DELETE /foods/{id}` |
| 3.5.2 Set other fields (label, description) | Supported | `PUT /foods/{id}` with `labelId`, `description`, `extras`. Labels: `/groups/labels`. |
| 3.5.3 List the recipes that use a food | Supported | `GET /recipes?foods={id}`. Also `recipeCount` on the food and `GET /foods/empty`. Ingredient detail needs `GET /recipes/{slug}` per recipe. |
| 3.5.4 Merge one food into another | Supported | `PUT /foods/merge` with `fromFood`, `toFood`. Repoints ingredients, substitutions, and shopping list items. Deletes the source. |
| 3.5.5 Read recipe ingredient lists | Supported | `GET /recipes/{slug}` returns `recipeIngredient[]` with `quantity`, `unit`, `food`, `note`. |

### 3.6 Links between Grocy and Mealie

| Item | Status | How |
|---|---|---|
| 3.6.1 List, create, update, remove links | Not supported | Mealie has no link entity. Food `extras` can store a Grocy product id (`PUT /foods/{id}`). Units cannot store an id. The link store belongs to Grocy Next. |
| 3.6.2 List unlinked; suggest links | Not supported | Mealie gives the full lists (`GET /foods?perPage=-1`, `GET /units?perPage=-1`) with names, plurals, and aliases. The comparison is the client's job. |
| 3.6.3 Find broken links | Supported | `GET /foods/{id}` and `GET /units/{id}` return 404 for a missing id. Or fetch the full list and compare ids. |
| 3.6.4 Creating a link must not rename either side | Not applicable | A Mealie read changes nothing. Only `PUT /foods/{id}` renames, and only when the client sends a new `name`. |

### 3.7 Units and conversions

| Item | Status | How |
|---|---|---|
| 3.7.1 List, create, edit, delete units: name, plural, abbreviation, aliases | Supported | `GET /units`, `POST /units`, `PUT /units/{id}`, `DELETE /units/{id}`. Fields `name`, `pluralName`, `abbreviation`, `pluralAbbreviation`, `aliases`. Also `PUT /units/merge`. |
| 3.7.2 Create and delete general conversions | Not supported | No conversion endpoint. A unit can map to one standard unit through `standardQuantity` and `standardUnit`. Fixed pairs come from `pint`. |
| 3.7.2 Standard-library import | Not supported | `POST /groups/seeders/units` seeds default units for a locale. It does not import conversions. |
| 3.7.3 Product-specific conversions | Not supported | No field and no endpoint. |
| 3.7.4 View resolved conversions for a product | Not supported | No endpoint. |

## 11. Consequences for the design

- Grocy Next owns the links and the conversions. Mealie can hold a Grocy product id in food `extras` as a backup pointer. Unit links need a store in Grocy Next only.
- A cook in Mealie reaches Grocy Next through an Apprise `json://` notifier on `recipeUpdated`. The handler must fetch the timeline event or the household recipe `lastMade` to confirm a cook. Every other recipe edit arrives on the same event.
- Food and unit changes in Mealie fire no event. A sync must poll with `queryFilter=updatedAt > "<last run>"`.
- Mealie has no all-or-nothing write for several foods or units. A bulk food change is many single calls. The client must handle a partial failure.
- Food deletes do not fail when recipes use the food. The ingredient loses its food. Check `recipeCount` or `GET /recipes?foods={id}` before a delete.
