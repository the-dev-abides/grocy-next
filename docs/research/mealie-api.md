# Research: the Mealie API for foods, units, and cooked recipes

Ticket: [#8](https://github.com/the-dev-abides/grocy-next/issues/8)

## Question

What does the current Mealie API offer for foods, units, recipe ingredients,
and the "I made this" action? How does HarmEllis/grocy-mealie-sync link
Grocy and Mealie today? Where does Mealie break requirements 3.5 and 3.6 of
`docs/requirements/assistant.md`?

## Summary

Mealie v3.30.0 (released 2026-10-31) serves one REST API under `/api`. A
long-lived API token goes in the `Authorization: Bearer` header. Foods and
units are group-wide records with a name, a plural name, a description,
aliases, and a free-form `extras` map. Foods also have a label, substitutions,
a recipe count, and the list of households that have the food "in possession".
Both foods and units have a merge endpoint. A recipe returns its full
ingredient list with food, unit, quantity, and note. Two routes list the
recipes that use a food: the `foods` query parameter on `GET /api/recipes`,
and the `queryFilter` string `recipe_ingredient.food.id IN [...]`.

The "I made this" button is a frontend action. It creates a recipe timeline
event of type `comment` with the subject "{user} made this", and then it
patches the recipe's `last-made` timestamp. Mealie has no event type for a
cooked recipe. The only event it publishes is `recipe_updated`, and that event
does not say that the recipe was cooked. Mealie webhooks are for scheduled meal
plans only. A Recipe Action of type `post` is the one feature that sends the
full recipe JSON, with ingredient quantities, to an external URL on a user
click.

The sync tool stores its links in its own SQLite tables. One link joins one
Mealie food UUID to one Grocy product id, with an optional unit link. It
matches by lowercase name at startup. When a user links a food to a product
with a different name, the tool renames the Grocy product to the Mealie food
name. The tool does not read recipes for foods, does not merge foods, and does
not detect broken links.

Mealie itself breaks none of the requirements in 3.5 and 3.6. The gaps marked
"Missing" in those sections are gaps in the sync tool, not in the Mealie API.

## Findings

### 1. API version and authentication

- Mealie has one API, mounted at `/api`. The code has no version segment in
  the path ([routes/__init__.py][r-init]).
- The latest release is v3.30.0, published 2026-10-31
  ([release page][rel]). The `mealie-next` branch at commit `b3241483`
  declares `version = "3.30.0"` in `pyproject.toml` ([pyproject][pyproject]).
- `GET /api/app/about` returns the running version in the `version` field
  ([app_about.py][about]).
- Interactive OpenAPI docs are at `/docs` when `API_DOCS` is on
  ([settings.py][settings], [api-usage.md][api-usage]).
- A user creates a long-lived token at `/user/profile/api-tokens`, or with
  `POST /api/users/api-tokens`. The token is a JWT with `long_token: true`
  and a five-year life ([api_tokens.py][tokens]).
- The server reads the token from the `Authorization: Bearer <token>` header,
  or from the `mealie.access_token` cookie ([dependencies.py][deps]). The
  sync tool uses the header ([sync mealie/index.ts][sync-mealie-index]).
- Write routes on foods and units require the `group:organize` permission,
  which maps to the user's `can_organize` flag ([permissions.py][perm]).

### 2. The food model

Source: [recipe_ingredient.py][ri].

| Field | Type | Note |
|---|---|---|
| `id` | UUID4 | |
| `name` | str | required |
| `plural_name` | str or null | |
| `description` | str | default `""` |
| `extras` | dict or null | free-form map, default `{}` |
| `label_id` | UUID4 or null | points to a group label |
| `label` | label summary or null | read-only expansion |
| `aliases` | list of `{name}` | |
| `substitutions` | list | other foods that can replace this one |
| `households_with_ingredient_food` | list of household slugs | the "in possession" flag |
| `recipe_count` | int | read-only, number of recipes that use the food |
| `created_at`, `updated_at` | datetime | read-only |

Routes ([foods.py][foods]):

| Method and path | Purpose |
|---|---|
| `GET /api/foods` | paged list, with `search`, `queryFilter`, `orderBy`, `perPage` |
| `POST /api/foods` | create |
| `GET /api/foods/empty` | foods that no recipe and no shopping list item uses |
| `PUT /api/foods/merge` | body `{from_food, to_food}` |
| `GET /api/foods/{id}` | one food |
| `PUT /api/foods/{id}` | full replace, body is the create model |
| `DELETE /api/foods/{id}` | delete |

- `perPage=-1` returns every row in one page ([repository_generic.py][generic]).
- The merge moves every recipe ingredient, every substitution, and every
  shopping list item from the source food to the target food. Then it deletes
  the source ([repository_foods.py][repo-foods]).
- The "in possession" flag has no field of its own. A client writes it by
  sending the household slug in `households_with_ingredient_food` on
  `PUT /api/foods/{id}`. When the request body omits that field, the model
  sets the list to empty ([ingredient.py][ing-model], [sync note][sync-poss]).
- The `PUT` is a full replace. The request model is `CreateIngredientFood`,
  so a client must send every field that it wants to keep ([foods.py][foods]).

### 3. The unit model

Source: [recipe_ingredient.py][ri].

| Field | Type | Note |
|---|---|---|
| `id` | UUID4 | |
| `name` | str | required |
| `plural_name` | str or null | |
| `description` | str | default `""` |
| `extras` | dict or null | default `{}` |
| `fraction` | bool | default true, show amounts as fractions |
| `abbreviation` | str | default `""` |
| `plural_abbreviation` | str or null | |
| `use_abbreviation` | bool | default false |
| `aliases` | list of `{name}` | |
| `standard_quantity` | float or null | factor to a standard unit |
| `standard_unit` | str or null | name of the standard unit |

Routes ([units.py][units]): the same set as foods, without `/empty`. The merge
body is `{from_unit, to_unit}`. The merge moves recipe ingredients and
shopping list items to the target unit, then deletes the source
([repository_units.py][repo-units]).

Mealie has no conversion table between units. The `standard_quantity` and
`standard_unit` fields are the only conversion data on a unit.

### 4. Recipe ingredients and the recipes that use a food

- `GET /api/recipes/{slug}` returns the full recipe. The `recipe_ingredient`
  list holds one entry per ingredient ([recipe.py][recipe]). Each entry has
  `quantity`, `unit`, `food`, `note`, `display`, `original_text`, `title`,
  `referenced_recipe`, `substitutions`, and `reference_id`
  ([recipe_ingredient.py][ri]).
- `GET /api/recipes` returns summaries, not ingredients. Two filters find the
  recipes that use a food ([recipe_crud_routes.py][recipes-get]):
  1. The `foods` query parameter, repeated per food UUID. The flag
     `requireAllFoods` switches between any and all. The repository matches a
     recipe when an ingredient calls for the food or lists it as a substitute
     ([repository_recipes.py][repo-recipes]).
  2. The `queryFilter` string, for example
     `recipe_ingredient.food.id IN ["<uuid>"]`. The Mealie recipe finder page
     uses this path ([finder/index.vue][finder]). A unit test covers the nested
     attribute path ([test_query_filter_builder.py][qf-test]).
- The food record's `recipe_count` gives the count without a recipe query
  ([repository_foods.py][repo-foods]).

### 5. The "I made this" action

Source: [RecipeLastMade.vue][last-made-vue].

The button opens a dialog. On submit the frontend does two calls:

1. `POST /api/recipes/timeline/events` with `recipe_id`, `event_type:
   "comment"`, `subject: "{user} made this"`, an optional message, an optional
   image, and a `timestamp` ([timeline_events.py][timeline]). The route
   publishes a `recipe_updated` event with a `recipe_timeline_event` document.
2. `PATCH /api/recipes/{slug}/last-made` with `{timestamp}`, when the new
   timestamp is later than the stored one ([recipe_crud_routes.py][last-made]).
   The value is stored per household in `HouseholdToRecipe.last_made`
   ([household.py][household]). This route also publishes `recipe_updated`.

The frontend repeats both calls for each child recipe that the recipe
references. The subject text is the translated string `recipe.user-made-this`
([en-US.json][i18n]). A client cannot filter timeline events by a "cooked"
type. The type `comment` is the same type that a plain user comment gets
([recipe_timeline_events.py][timeline-schema]).

### 6. Webhooks and events for a cooked recipe

Mealie has three outbound mechanisms. None of them is a "recipe cooked" event.

| Mechanism | Trigger | Payload | Fit for "I made this" |
|---|---|---|---|
| Notifier (Apprise) | an event type such as `recipe_updated` | title, body, and for `json://`, `jsons://`, `form://`, `xml://` URLs also `event_type`, `document_data`, `event_id`, `timestamp` as query parameters | partial |
| Webhook | a scheduled time on a meal plan day | the meal plan data | none |
| Recipe Action, type `post` | a user click on the recipe page | `{action, content: <full recipe JSON>, recipe_scale}` | good, but manual |

- The event type list has `recipe_created`, `recipe_updated`,
  `recipe_deleted`, and types for meal plans, shopping lists, cookbooks, tags,
  categories, and labels. It has no type for a timeline event or a cooked
  recipe ([event_types.py][events]). The `document_data` of a
  `recipe_updated` event from the timeline route holds `recipe_slug` and
  `recipe_timeline_event_id`. A consumer must then fetch the timeline event
  and parse the subject text to know that it was an "I made this" event
  ([event_bus_listeners.py][listeners]).
- The webhook type enum has one value, `mealplan`
  ([webhook.py][webhook-schema], [features.md][features]).
- A Recipe Action of type `post` sends the full recipe, with the ingredient
  list, to the action URL as JSON, with a 15 second timeout. The target host
  must pass the `HTTP_ALLOW_LIST` and `HTTP_DISALLOW_LIST` checks
  ([controller_group_recipe_actions.py][actions], [features.md][features]).
  The action appears on every recipe page. A user must click it. It does not
  run when the user clicks "I made this".

### 7. How grocy-mealie-sync links the two apps

Source repo at commit `e35dd6a2` on `main`, `package.json` version
`1.19.0-rc.19`. The latest stable release is v1.18.0 (2026-10-06)
([releases][sync-rel]). The README states tests against Mealie v3.12.0 and
Grocy 4.x ([README][sync-readme]).

- **Link storage.** Two SQLite tables, managed with Drizzle
  ([schema.ts][sync-schema]):
  - `product_mappings`: `mealie_food_id` (UUID text), `mealie_food_name`,
    `grocy_product_id` (integer), `grocy_product_name`, optional
    `unit_mapping_id`. Both id columns have a unique index, so one food links
    to one product.
  - `unit_mappings`: `mealie_unit_id`, `mealie_unit_name`,
    `mealie_unit_abbreviation`, `grocy_unit_id`, `grocy_unit_name`,
    `conversion_factor`. Both id columns have a unique index.
  - The tool writes nothing into Mealie's `extras` map or Grocy's userfields
    to mark a link. The link exists only in the tool's database.
- **Matching.** At startup the tool matches a Mealie food to a Grocy product
  when the lowercase names are equal. It matches a unit when the Grocy unit
  name equals the Mealie unit name or abbreviation, lowercase. Unmatched
  Mealie records are created in Grocy only when auto-create is on, default
  off ([product-sync.ts][sync-product-sync], [README][sync-readme]).
- **Rename on link.** When a user links a food and a product with different
  names, the tool updates the Grocy product name to the Mealie food name. The
  same happens to a Grocy unit on a unit link
  ([mappings/manage.ts][sync-mappings]). This is the defect in requirement
  3.1.4 and 3.6.4.
- **Normalization.** A separate step capitalizes the first letter of names
  in both apps ([normalize.ts][sync-normalize]).
- **Food writes.** A food update sends name, plural name, and aliases. It
  copies description, label, and extras from the current record. It does not
  send `households_with_ingredient_food`
  ([products/manage.ts][sync-products]). See section 2 for the effect.
- **In possession.** The tool reads `householdsWithIngredientFood` and
  writes the user's household slug into it. It tracks the desired state in its
  own `sync_state` row, because Mealie's `updatedAt` does not change on this
  toggle ([mealie-in-possession.md][sync-poss]).
- **Stock flow.** Grocy stock below minimum adds a Mealie shopping list
  row. A checked Mealie row books a Grocy purchase in the stock unit, through
  the unit link and Grocy conversions ([README][sync-readme]).
- **Recipes.** The tool reads recipes in one place: before a unit delete,
  it fetches every recipe and scans the ingredients for the unit
  ([units/manage.ts][sync-units]). It has no code for timeline events,
  `last_made`, or a recipe consume. The "I made this" action in requirement
  `human.md` has no implementation in the tool.
- **MCP tools.** The connected server exposes `products_*`, `mappings_*`,
  `units_*`, `inventory_*`, `shopping_*`, `catalog_*`, `conversions_*`,
  `history_*`, `conflicts_list`, and `diagnostics_explain_product_state`
  ([src/mcp/tools][sync-mcp]).

### 8. Where the requirements break

Requirement numbers refer to `docs/requirements/assistant.md`.

| Requirement | Mealie API | Sync tool | Gap owner |
|---|---|---|---|
| 3.5.1 create, rename, delete foods; plural names, aliases | yes | yes | none |
| 3.5.2 set label and description | yes, `label_id` and `description` on `PUT /api/foods/{id}` | no, copies current values | sync tool |
| 3.5.3 list the recipes that use a food | yes, `foods` parameter or `queryFilter`, plus `recipe_count` | no | sync tool |
| 3.5.4 merge one food into another | yes, `PUT /api/foods/merge` | no | sync tool |
| 3.5.5 read recipe ingredient lists | yes, `GET /api/recipes/{slug}` | no | sync tool |
| 3.6.1 list, create, update, remove links | not a Mealie concern | yes, own tables | none |
| 3.6.2 list unlinked, suggest links | not a Mealie concern | yes | none |
| 3.6.3 find broken links | not a Mealie concern | no | sync tool |
| 3.6.4 a link must not rename either side | not a Mealie concern | renames the Grocy product and unit | sync tool |

Mealie breaks none of 3.5 and 3.6. One Mealie limit affects 3.1.3 (change one
field, keep the others): `PUT /api/foods/{id}` is a full replace, and a body
that omits `households_with_ingredient_food` clears the "in possession"
flag. A client must read the food, then send the full record back.

A second Mealie limit affects the `human.md` wish that "I made this" consumes
stock: no event or webhook carries that action. Section 9 lists the options.

### 9. Options for the "I made this" trigger

| Option | How | Cost | Benefit |
|---|---|---|---|
| A. Recipe Action `post` | Grocy Next registers one action per household. The user clicks it on the recipe page. Mealie posts the full recipe with ingredient quantities and the scale. | A second button next to "I made this". The target host must be in Mealie's allow list. | The payload has everything a consume needs. No polling. Mealie supports it on purpose. |
| B. Notifier `json://` on `recipe_updated` | Grocy Next receives every recipe update. On a `recipe_timeline_event` document it fetches the event and matches the subject text. | Fires on every edit. Subject text is translated per user locale. Needs a fetch per event. | Fires on the real "I made this" click. |
| C. Poll `last_made` | Grocy Next polls `GET /api/recipes` with `orderBy=last_made` and compares with its stored value. | Polling. No scale. No user. | No Mealie configuration. Works on any Mealie version with `last_made`. |

## Recommendation

Proposal, for the maintainer to decide: build the Mealie link store in Grocy
Next on the same shape as the sync tool, one row per food UUID and product id
plus a unit link row with a factor, and drop the rename on link. For the
"I made this" consume, use option A, a Recipe Action of type `post`, as the
first implementation. It is the only Mealie hook that delivers the ingredient
quantities and the scale in one request. Add option C later as a check that
catches a missed click. Do not build on option B. Its payload needs a second
fetch and a text match on a translated string.

## Sources

- Mealie `mealie-next` branch, commit `b3241483ee18a8df3156dd7701624633016bdb27`, 2026-11-02.
- grocy-mealie-sync `main` branch, commit `e35dd6a25e1da3f791303881e329dc6e2fb27b21`, 2026-10-27.

[rel]: https://github.com/mealie-recipes/mealie/releases/tag/v3.30.0
[pyproject]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/pyproject.toml
[r-init]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/__init__.py
[about]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/app/app_about.py
[settings]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/core/settings/settings.py
[api-usage]: https://mealie.io/documentation/getting-started/api-usage/
[tokens]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/users/api_tokens.py
[deps]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/core/dependencies/dependencies.py
[perm]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/_base/permissions.py
[ri]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/schema/recipe/recipe_ingredient.py
[foods]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/unit_and_foods/foods.py
[units]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/unit_and_foods/units.py
[generic]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/repos/repository_generic.py
[repo-foods]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/repos/repository_foods.py
[repo-units]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/repos/repository_units.py
[ing-model]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/db/models/recipe/ingredient.py
[recipe]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/schema/recipe/recipe.py
[recipes-get]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/recipe/recipe_crud_routes.py
[repo-recipes]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/repos/repository_recipes.py
[finder]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/frontend/app/pages/g/%5BgroupSlug%5D/recipes/finder/index.vue
[qf-test]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/tests/unit_tests/repository_tests/test_query_filter_builder.py
[last-made-vue]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/frontend/app/components/Domain/Recipe/RecipeLastMade.vue
[timeline]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/recipe/timeline_events.py
[timeline-schema]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/schema/recipe/recipe_timeline_events.py
[last-made]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/recipe/recipe_crud_routes.py
[household]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/schema/household/household.py
[i18n]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/frontend/app/lang/messages/en-US.json
[events]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/services/event_bus_service/event_types.py
[listeners]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/services/event_bus_service/event_bus_listeners.py
[webhook-schema]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/schema/household/webhook.py
[features]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/docs/docs/documentation/getting-started/features.md
[actions]: https://github.com/mealie-recipes/mealie/blob/b3241483ee18a8df3156dd7701624633016bdb27/mealie/routes/households/controller_group_recipe_actions.py
[sync-rel]: https://github.com/HarmEllis/grocy-mealie-sync/releases
[sync-readme]: https://github.com/HarmEllis/grocy-mealie-sync/blob/e35dd6a25e1da3f791303881e329dc6e2fb27b21/README.md
[sync-schema]: https://github.com/HarmEllis/grocy-mealie-sync/blob/e35dd6a25e1da3f791303881e329dc6e2fb27b21/src/lib/db/schema.ts
[sync-mealie-index]: https://github.com/HarmEllis/grocy-mealie-sync/blob/e35dd6a25e1da3f791303881e329dc6e2fb27b21/src/lib/mealie/index.ts
[sync-product-sync]: https://github.com/HarmEllis/grocy-mealie-sync/blob/e35dd6a25e1da3f791303881e329dc6e2fb27b21/src/lib/sync/product-sync.ts
[sync-mappings]: https://github.com/HarmEllis/grocy-mealie-sync/blob/e35dd6a25e1da3f791303881e329dc6e2fb27b21/src/lib/use-cases/mappings/manage.ts
[sync-normalize]: https://github.com/HarmEllis/grocy-mealie-sync/blob/e35dd6a25e1da3f791303881e329dc6e2fb27b21/src/lib/sync/normalize.ts
[sync-products]: https://github.com/HarmEllis/grocy-mealie-sync/blob/e35dd6a25e1da3f791303881e329dc6e2fb27b21/src/lib/use-cases/products/manage.ts
[sync-units]: https://github.com/HarmEllis/grocy-mealie-sync/blob/e35dd6a25e1da3f791303881e329dc6e2fb27b21/src/lib/use-cases/units/manage.ts
[sync-poss]: https://github.com/HarmEllis/grocy-mealie-sync/blob/e35dd6a25e1da3f791303881e329dc6e2fb27b21/docs/mealie-in-possession.md
[sync-mcp]: https://github.com/HarmEllis/grocy-mealie-sync/tree/e35dd6a25e1da3f791303881e329dc6e2fb27b21/src/mcp/tools
