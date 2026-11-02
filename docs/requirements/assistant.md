# Kitchen Inventory Tool — Requirements Wishlist

## 1. Purpose

An AI assistant manages the household's food inventory in **Grocy** and its recipe ingredients in **Mealie**, and keeps the two in sync. This document is the assistant's wishlist: what its tooling must let it do in both apps.

It describes **capabilities only**:

- **Not covered: how it's built.** Whether this is one tool or several is an implementation decision.
- **Not covered: house rules.** Naming, units, spelling, where things are stored and so on are the assistant's job to apply. The tool must be **policy-neutral**: it stores and returns whatever it is given and enforces no preferences of its own.

## 2. Tools in use today

| Tool                  |                                                                               | What it is                                                                                                                                                                                                             |
|-----------------------|-------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Grocy**             | thijserven/grocy-mcp                                                          | Direct access to Grocy's own API. Broad coverage of Grocy: any object type, stock actions, barcodes, shopping list, recipes, undo. Edits return no confirmation, and fields it doesn't recognise are silently dropped. |
| **Grocy Mealie Sync** | [HarmEllis/grocy-mealie-sync](https://github.com/HarmEllis/grocy-mealie-sync) | Checked, confirmed operations on both Grocy and Mealie, plus the links between them. It is currently the **only** way to reach Mealie.                                                                                 |

Coverage tags used below:

- **[Grocy]** or **[Sync]**: provided today by that tool.
- **[Both]**: both tools provide it (see section 4).
- **[Missing]**: neither tool provides it.
- **[Defect]**: provided, but broken or unsafe.

## 3. Requirements

### 3.1 General behaviour (applies to everything)

1. Every change returns a **confirmation of what was actually changed**, showing the stored values afterwards. **[Sync]**; *[Defect] in Grocy, which returns nothing.*
2. A field that cannot be set must cause a **clear error**, never be silently ignored. **[Missing]**; *Grocy drops unknown fields without warning.*
3. Changing one field must **leave every other field untouched**. *[Defect]: editing a stock entry through the sync tool wipes its note and demands the amount and dates again.*
4. A change must have **no hidden side effects**. Where one is unavoidable, it is stated before it happens. *[Defect]: linking a Mealie food to a Grocy product can rename the Grocy product.*
5. Text is stored and returned **exactly as given**, accents included (e.g. jalapeño). **[Both]**
6. Errors say **what failed and why**, including what blocks a delete. **[Sync]** (partial)
7. Several changes made at the same time must all succeed or each report its own failure. *[Defect]: simultaneous changes sometimes fail with "database is locked".*

### 3.2 Bulk operations

1. Create, update or delete **many items in one request** (products, foods, stock entries, links, units, locations, groups), with a **result per item**. **[Missing]**
2. **All-or-nothing option**: if any item fails, nothing is applied. **[Missing]**
3. **Preview**: show what a bulk request would change without applying it. **[Missing]**
4. **Bulk stock purchases**: record many purchases in one request, each with its own amount, unit, price, date, store, location and best-before date. **[Missing]**

### 3.3 Reading and searching

1. List **everything** of any type, at any size, without results being cut off. *[Defect]: a full product list (~180 items) is truncated.*
2. Filter lists by any attribute (location, group, unit, stock level, linked or not, has stock or not) and return only the fields requested. **[Sync]** (partial filters; no field selection)
3. Search products and foods by name, alias, alternate name or barcode. **[Both]** (partial; no alternate-name search)
4. View the full record of any single item, every field included. **[Grocy]**
5. View one item's combined state across both apps. **[Sync]**

### 3.4 Grocy products

1. Create a product with **every field in one request**. **[Grocy]** (sync tool sets only basic fields)
2. Edit **any** product field, including:
   - name, description, product group, default location, default store
   - minimum stock
   - shelf-life defaults: best-before, after opening, after freezing, after thawing
   - freezing rules, behaviour on open
   - **purchase, stock, consume and price units** *([Defect]: consume and price units cannot be changed by either tool)*
   - **tare weight handling and container empty weight** **[Grocy]**
   - parent product
   - active or hidden flags
3. Store **alternate names** per product and per store (e.g. receipt abbreviations), and search by them. **[Missing]**
4. Manage a product's **barcodes**. **[Grocy]**
5. **Merge** one product into another, moving its stock, history, barcodes and links to the survivor. **[Grocy]** (sync tool cannot)
6. Delete a product, refusing if it has stock or links unless told otherwise, and saying why. **[Both]**

### 3.5 Mealie foods

1. Create, rename and delete foods; set plural names and aliases. **[Sync]**
2. Set a food's other fields (label or category, description). **[Missing]**
3. **List the recipes that use a food**, before it is changed or deleted. **[Missing]**
4. **Merge** one food into another, repointing every recipe ingredient to the survivor. **[Missing]**
5. Read recipe ingredient lists: food, amount, unit. **[Missing]**

### 3.6 Links between Grocy and Mealie

1. List, create, update and remove links between products and foods, and between units. **[Sync]**
2. List everything unlinked on either side, and suggest likely links. **[Sync]**
3. Find **broken links** that point at something that no longer exists. **[Missing]**
4. Creating a link must not rename either side unless asked. *[Defect]*

### 3.7 Units and conversions

1. List, create, edit and delete units in both apps: name, plural, abbreviation, aliases. **[Both]** for Grocy; **[Sync]** for Mealie.
2. Create and delete **general conversions** (e.g. 1 kg = 1000 g). **[Both]**; standard-library import **[Sync]**
3. Create and delete **product-specific conversions** (e.g. 1 can of chickpeas = 540 mL). **[Grocy]**; not in sync tool
4. View the **resolved conversions** that apply to a product. **[Grocy]**

### 3.8 Catalogue

1. List, create, rename and delete **storage locations** and **product groups**. **[Both]**
2. List, create, rename and delete **stores** (shopping locations). **[Grocy]**; not in sync tool
3. Deleting anything still in use is refused, with what is using it. **[Sync]**

### 3.9 Stock

1. View current stock per product, per location and per individual entry. **[Both]**
2. Record a purchase with amount, unit, price, purchase date, store, location, best-before date and note. **[Both]** (store and price handling incomplete in sync tool)
3. Consume, open, and set stock to a counted amount. **[Both]**
4. **Move stock between locations**. **[Grocy]**; not in sync tool
5. Edit any single field of a stock entry. *[Defect], see 3.1 item 3.*
6. Record stock by **gross weight** (container included), with the empty weight subtracted using the product's tare. **[Grocy]** (via Grocy's own tare handling)
7. Act on stock by **barcode**. **[Grocy]**
8. List low, expiring, overdue and expired stock. **[Both]** (partial)
9. View a product's **price history**. **[Grocy]**

### 3.10 Shopping list

1. View, add, remove, check off, and change the quantity and unit of items. **[Both]**
2. Merge duplicate lines. **[Sync]**
3. Add all missing, expired or overdue products in one step. **[Grocy]**

### 3.11 Undo and history

1. **Undo** a stock transaction or booking. **[Grocy]**; not in sync tool
2. Undo any other change made by the assistant (rename, delete, unit change, link). **[Missing]**
3. A **log of every change** the assistant made: what changed, old value, new value, when. **[Sync]** (sync-run history only)
4. View sync conflicts between the two apps. **[Sync]**

## 4. Overlap: preference where both tools can do it

| Capability                                          | Preference                                                                          | Why                                                                                                           |
|-----------------------------------------------------|-------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
| Rename products; set location, group, minimum stock | **Grocy Mealie Sync**                                                               | Confirms what changed and keeps the linked Mealie food consistent. Grocy only for fields the sync tool lacks. |
| Set units on a product                              | **Grocy Mealie Sync**                                                               | Confirms the change. Neither can set consume and price units today.                                           |
| Tare weight                                         | **Grocy**                                                                           | Only Grocy can set it.                                                                                        |
| Purchase, consume, open, set stock                  | **Grocy Mealie Sync**                                                               | Structured results. Grocy for barcode actions and moving stock, which only it has.                            |
| Edit a stock entry                                  | **Neither, as is**                                                                  | The sync tool wipes fields; Grocy gives no confirmation. This needs fixing (3.1 item 3).                      |
| Delete products, locations, groups                  | **Grocy Mealie Sync**                                                               | Refuses unsafe deletes and says why. Grocy deletes blindly.                                                   |
| Units and conversions                               | **Grocy Mealie Sync** for general units; **Grocy** for product-specific conversions | The sync tool covers both apps and confirms changes, but only Grocy can create product-specific conversions.  |
| Locations and groups                                | **Grocy Mealie Sync**                                                               | Confirms changes and checks usage before deleting.                                                            |
| Shopping list                                       | **Grocy Mealie Sync**                                                               | Item-level control and duplicate merge. Grocy for bulk "add missing" and similar.                             |
| Merge products                                      | **Grocy**                                                                           | Only Grocy can, and only on the Grocy side.                                                                   |
| Reading full records                                | **Grocy**                                                                           | Returns every field. The sync tool returns a summary.                                                         |

## 5. Out of scope

- How the tooling is built, split, hosted or secured.
- Preferences and house rules (naming, units, spelling, storage). These belong to the assistant, not the tool.
- Meal planning, recipe authoring and budgeting, beyond reading which recipes use a food.