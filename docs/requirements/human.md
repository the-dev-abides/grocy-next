# Human user requirements

This is the wishlist of the household users. It lists what they want from the
tool. It does not say how the tool is built.

## General

- The main goal is fewer clicks.
- The design is responsive. It works on a phone and on a tablet.
- The design uses the space on a large screen.
- Bulk edit: the user selects rows with checkboxes, then edits them in one
  dialog.
- Inline edit in tables.
- A full MCP (Model Context Protocol) server.

## Technology

- Support SQLite or PostgreSQL.
- Support Docker, Compose, Portainer, and k3s or Kubernetes deployment with no
  extra setup.

## Inventory and product management

- Barcode scanning with a hardware scanner and with the phone camera.
- Stock workflows: Purchase, Consume, Transfer, and Inventory.
  - The user scans one product after another without a stop.
  - Each scan becomes a pending scan in the review queue.
  - An AI can read the review queue through the MCP.
  - The tool finds the product from the barcode.
  - Feature request: a fallback lookup source. When the Open Facts databases
    do not hold a barcode, the tool asks a second source, such as UPCitemdb.
    The second source gives only a name suggestion in the short product form.
    The tool does not store its data as open data.
  - Feature request: submit a missing product to Open Facts. When no Open
    Facts database holds a barcode, the user can send the product to the
    correct database. A deodorant goes to Open Beauty Facts, for example.
    The user confirms each submit. The data comes from the package, not from
    the fallback source, because Open Facts does not accept copied data.
  - When the barcode is not found, the tool alerts the user at once with a
    sound, a vibration, and an onscreen alert. The scan continues.
  - Smart scale support over Bluetooth and Wi-Fi.
  - Consume supports tare weight. The tool follows Grocy's tare setting for
    the product.
- Grocy is the primary source of truth for units, products, and locations.
- Mealie is the secondary source of truth, mainly for recipes.
- The "I made this" action in Mealie consumes stock.
- I want to be able to select a bunch of products; and with that list, print a "re-order sheet" that includes QR codes and names. Scanning one of the codes adds it to my default shopping list.

## Grocy gaps and bugs

All four are in Grocy's `services/StockService.php`.

1. **Bug: a consume through a parent ignores sub-product stock in the amount
   check.** In `ConsumeProduct`, the stock entries to consume include
   sub-products when "allow sub-product substitution" is on. The total-stock
   check after that step sums only the parent's own stock. A parent with no
   own stock always fails with "Amount to be consumed cannot be > current
   unopened stock amount". The check must sum the same entries that it is
   about to consume.
2. **Bug: the same check in `OpenProduct`.** The unopened-stock check counts
   only the parent's own sealed stock. An open through a parent with
   substitution fails in the same way.
3. **Gap: the parent's own "disable open" blocks an open through the
   parent.** `OpenProduct` refuses when the parent has `disable_open` set,
   also when the open acts on sub-products. With substitution on, the
   sub-product's setting must decide.
4. **Feature request: auto-open on a partial consume.** A consume of part of a
   sealed stock entry leaves the entry marked sealed. An optional per-product
   setting, "mark as opened on first consume", covers bags, jars, and bottles.
5. **Feature request: receipt scanner.** A tool to scan in a receipt from a
   shopping trip, that allows an AI agent to help review purchases.
