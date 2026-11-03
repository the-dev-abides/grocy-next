# Roadmap

This roadmap is a living document. It is a starting point for the planning of
the work, not a plan that is settled. It orders the work on Grocy Next into
milestones. A milestone has one paragraph of scope and one exit condition.
The roadmap sets no process. Jeff decides how each milestone is designed and
built. The roadmap has no end. It lists the milestones known on 2026-11-03. A
later effort appends more.

## Rules

- Nothing on this roadmap is final. Jeff can change the order, the scope, or
  the exit condition of any milestone at any time, also during a build.
- Grocy Next is a drop-in replacement for Grocy. Every Grocy v4.7.1 area,
  screen, and API operation lands in a milestone. There is no parity
  exception.
- Grocy owns its data until API parity. Until then, Grocy Next reads and
  writes Grocy through the Grocy API. The data import at API parity is
  API-based.
- Every milestone ends with user documentation. The team writes it after Jeff
  signs off the requirements of the milestone. The documentation names every
  function that the team could not test on a real device or a real path.
- Every milestone ships as one container image for Docker, Compose,
  Portainer, and k3s, with SQLite or PostgreSQL as the storage for the data
  that Grocy Next owns.
- Every screen is responsive and works on a phone, on a tablet, and on a
  large screen. Fewer clicks is the design goal of every screen.
- Every operation that a milestone adds to the Next API is also an MCP tool
  in the same milestone. The MCP server is complete when the Next API is
  complete.
- Every change through the Next API or the MCP server returns a confirmation
  of the stored values. An unknown field is an error. A change touches no
  other field and has no hidden side effect.
- A shared service (Calendar, Files, Print, Userfields, System) is built in
  the first milestone whose screens need it. There is no shared services
  milestone.

## Domains

The roadmap groups the work by domain. The domain list is a working list, not
a decision. The build of each milestone settles its domains and subdomains.
The working list is: Inventory (Products, Stock,
Shopping list, Review queue), Recipes (Recipes, Meal plan), Household (Chores,
Tasks, Batteries, Equipment), Users, and the Mealie link.

## Milestones

1. Scaffold and deployment
2. Scan to stock
3. Shop, consume, audit
4. Assistant tools
5. Mealie link
6. Inventory UI
7. Recipes UI
8. Household UI
9. Users and System UI
10. Inventory storage and legacy API
11. Recipes storage and legacy API
12. Household storage and legacy API
13. Users and System storage, legacy API, and the switch
14. Change log and undo
15. Authentication and multi-user
16. Smart scale

## Companion stretch

Grocy Next runs beside Grocy. Grocy is the source of truth for units,
products, locations, and stock. Grocy Next adds what Grocy lacks and replaces
the two assistant tools, grocy-mcp and Grocy Mealie Sync.

### 1. Scaffold and deployment

The NX workspace with the empty NestJS app and the empty React app, on the
stack of ADR 8. The container image, the Compose file, the Portainer stack,
and the k3s manifests. SQLite and PostgreSQL for the data that Grocy Next
owns. The Grocy API client. The CI pipeline: lint, unit tests, image build.
This milestone makes the stack decisions real.

Exit condition: the empty app runs on Jeff's k3s cluster and lists the
products of his Grocy instance.

### 2. Scan to stock

The stock workflow only. The user scans one product after another with the
phone camera, with no stop. Each scan becomes a pending scan in the review
queue, and the user accepts or rejects pending scans in bulk or one by one. An
accepted pending scan becomes a purchase booking in Grocy. An unknown barcode
alerts the user at once with a sound, a vibration, and an onscreen alert, and
the user types a name and continues.

Exit condition: Jeff enters one weekly shop with the phone camera, with no
stop, and accepts the pending scans in Grocy Next.

### 3. Shop, consume, audit

The three other inventory workflows through the same scanner and the same
review queue. Consume follows the Grocy tare setting of the product. The
hardware scanner is built as best effort, with no device to test. An
assistant reads the review queue and creates pending scans through the MCP
server.

Exit condition: Jeff consumes by scan, and the assistant reads the review
queue through the MCP server.

### 4. Assistant tools

The Next API and the MCP server cover Products, Stock, Shopping list, quantity
units, conversions, locations, stores, and product groups. Every call passes
through to Grocy. The scope is sections 3.1, 3.2, 3.3, 3.4, 3.7, 3.8, 3.9,
and 3.10 of the assistant requirements, and the undo of a stock transaction
from section 3.11: full lists with no cut-off, filters and field selection,
search by name, alias, alternate name, and barcode, every product field,
product merge, safe delete with the reason, bulk operations with a result for
each item, the all-or-nothing option, the preview, and bulk purchases.
Alternate names for each product and each store are a Grocy Next attribute,
because Grocy has no field for them. Where Grocy Next stores them is decided
in this milestone.

Exit condition: Jeff removes grocy-mcp from the assistant's configuration.

### 5. Mealie link

The opt-in link to a Mealie instance. The scope floor is: the links between
products and foods and between units, the unlinked lists and the link
suggestions, the broken-link check, the Mealie food operations of section 3.5
of the assistant requirements, the sync conflict view, and the "I made this"
consume. The open candidates are: which Mealie recipes the household can cook
from the current stock, what is missing for one recipe, recipe costing, and
the Mealie meal plan to the shopping list. Jeff settles the full scope at the
start of this milestone.

Exit condition: Jeff switches off Grocy Mealie Sync.

## UI parity stretch

Grocy Next replaces the Grocy screens, one domain at a time. Grocy stays the
data owner. Each milestone builds the screens of one domain and the shared
services that those screens need. UI parity is reached at the end of
milestone 9.

### 6. Inventory UI

Every function of the Grocy Stock, Shopping list, and master data screens:
products, barcodes, quantity units, conversions, locations, stores, and
product groups. Bulk edit with checkboxes and one dialog, and inline edit in
tables. The shared services that these screens need: Calendar for due dates,
Files for product pictures, Print for stock labels and the thermal shopping
list, and Userfields. The translation mechanism, with the Grocy translations
as the source, so that every later screen uses it from the start.

Exit condition: every function of the Grocy Stock, Shopping list, and master
data screens is in Grocy Next, and Jeff's household uses Grocy Next for them.

### 7. Recipes UI

Every function of the Grocy Recipes and Meal plan screens: recipes,
ingredients, nested recipes, fulfillment against stock, consume a recipe, add
the missing products to the shopping list, the meal plan, and meal plan
sections. Shared services as needed: Files for recipe pictures, Print for
recipe labels, Calendar for the meal plan.

Exit condition: every function of the Grocy Recipes and Meal plan screens is
in Grocy Next.

### 8. Household UI

Every function of the Grocy Chores, Tasks, Batteries, Equipment, and Calendar
screens. Shared services as needed: Files for equipment documents, Print for
chore and battery labels.

Exit condition: every function of the Grocy Chores, Tasks, Batteries,
Equipment, and Calendar screens is in Grocy Next.

### 9. Users and System UI

Every function of the Grocy Users, permissions, user settings, and System
screens, and the generic entity screens that no earlier milestone built. This
milestone reaches UI parity.

Exit condition: Jeff's household does every function of the Grocy v4.7.1 UI
in Grocy Next and opens the Grocy UI for nothing.

## API parity stretch

Grocy Next builds its own storage and serves the legacy API, one domain at a
time. Grocy stays the data owner through milestones 10 to 12, and each of
those milestones tests its legacy API against an imported copy of the
household data. Milestone 13 does the import and the switch. API parity is
reached at the end of milestone 13.

### 10. Inventory storage and legacy API

The Grocy Next storage and the Next API for Products, Stock, Shopping list,
and Review queue, on the Grocy Next entity model, and every Inventory
operation of the legacy API. The Grocy Next stock logic fixes the four Grocy
stock service defects: the consume amount check through a parent counts the
sub-product stock, the open check does the same, the sub-product's "disable
open" setting decides on an open through a parent, and an optional
per-product setting marks a stock entry as opened on the first partial
consume. Tare weight is a Grocy Next rule from this milestone on.

Exit condition: every Inventory operation of the legacy API responds from
Grocy Next storage on an imported copy of the household data.

### 11. Recipes storage and legacy API

The Grocy Next storage and the Next API for Recipes and Meal plan, and every
Recipes and Meal plan operation of the legacy API.

Exit condition: every Recipes and Meal plan operation of the legacy API
responds from Grocy Next storage on an imported copy of the household data.

### 12. Household storage and legacy API

The Grocy Next storage and the Next API for Chores, Tasks, Batteries, and
Equipment, and every Household operation of the legacy API.

Exit condition: every Household operation of the legacy API responds from
Grocy Next storage on an imported copy of the household data.

### 13. Users and System storage, legacy API, and the switch

The Grocy Next storage and the Next API for Users, permissions, user settings,
and the shared services that still read Grocy. The remaining legacy API
operations: System, Files, Calendar, Print, OpenAPI, and the generic entity
operations. The API-based data migration from a running Grocy v4.7.1
instance, with no loss. This milestone reaches API parity, and so parity.

Exit condition: the household data is imported from the running Grocy, every
operation of the Grocy v4.7.1 API responds from Grocy Next, and Grocy is
switched off.

## After parity

These milestones need data and logic that Grocy Next owns.

### 14. Change log and undo

A log of every change made through the Next API or the MCP server: what
changed, the old value, the new value, who, and when. Undo of any change, not
only a stock transaction: a rename, a delete, a unit change, a link.

Exit condition: every change through the Next API or the MCP server appears
in the log with its old and new values, and Jeff undoes one of each change
type from the log.

### 15. Authentication and multi-user

Grocy Next reaches API parity with the Grocy user model and the Grocy
permission set. This milestone decides what multi-user means beyond that.
Jeff settles the scope at its start.

Exit condition: open. Jeff sets it at the start of the milestone.

### 16. Smart scale

Smart scale support over Bluetooth and Wi-Fi from the web app. The tool
records stock by gross weight and subtracts the tare of the product.

Exit condition: Jeff records one purchase and one consume from the scale with
no typed amount.

## Not planned

- House rules and preferences: naming, units, spelling, and storage choices.
  The assistant applies them. Grocy Next stores what it is given (assistant
  requirements, section 5).
- Native mobile apps. The third-party Grocy mobile app works through the
  legacy API after API parity.
- Upstream fixes to Grocy. The four stock service defects are Grocy Next
  requirements in milestone 10.

## Where each requirement lands

| Requirement                                                                                             | Milestone                               |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Human: fewer clicks, responsive, large screen                                                           | Rule, every milestone                   |
| Human: bulk edit, inline edit                                                                           | 6                                       |
| Human: full MCP server                                                                                  | Rule, every milestone; complete at 13   |
| Human: SQLite or PostgreSQL                                                                             | Rule, from 1                            |
| Human: Docker, Compose, Portainer, k3s                                                                  | Rule, from 1                            |
| Human: barcode scanning, four workflows, review queue, unknown-barcode alert, AI reads the review queue | 2 and 3                                 |
| Human: hardware scanner                                                                                 | 3, best effort                          |
| Human: smart scale                                                                                      | 16                                      |
| Human: tare weight on consume                                                                           | 3 through Grocy; 10 as a Grocy Next rule |
| Human: Grocy is the primary source of truth                                                             | Companion stretch, until 13             |
| Human: Mealie is the secondary source of truth, "I made this"                                           | 5                                       |
| Human: the four stock service defects                                                                   | 10                                      |
| Assistant 3.1 general behaviour                                                                         | Rule, from 4                            |
| Assistant 3.2 bulk operations                                                                           | 4                                       |
| Assistant 3.3 reading and searching                                                                     | 4                                       |
| Assistant 3.4 Grocy products, alternate names included                                                  | 4                                       |
| Assistant 3.5 Mealie foods                                                                              | 5                                       |
| Assistant 3.6 links                                                                                     | 5                                       |
| Assistant 3.7 units and conversions                                                                     | 4                                       |
| Assistant 3.8 catalogue                                                                                 | 4                                       |
| Assistant 3.9 stock                                                                                     | 4                                       |
| Assistant 3.10 shopping list                                                                            | 4                                       |
| Assistant 3.11 undo a stock transaction                                                                 | 4                                       |
| Assistant 3.11 undo any change, log of every change                                                     | 14                                      |
| Assistant 3.11 sync conflicts                                                                           | 5                                       |
| Assistant section 5                                                                                     | Not planned                             |
| Implied: parity                                                                                         | 6 to 13                                 |
| Implied: data migration                                                                                 | 13                                      |
| Implied: legacy API                                                                                     | 10 to 13                                |
| Grocy Recipes and Meal plan areas                                                                       | 7 and 11                                |
| Localization                                                                                            | 6, mechanism and the Grocy translations |
| Authentication and multi-user                                                                           | 15                                      |
