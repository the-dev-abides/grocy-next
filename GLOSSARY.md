# Grocy Next

Grocy Next is a replacement for Grocy. This glossary defines the Grocy terms
that Grocy Next keeps.

## Grocy terms

**Product**:
A thing that the household stocks. A product has a stock unit, a purchase
unit, a default location, and a minimum stock amount.
_Avoid_: item, article, SKU, food (a food is the Mealie side of a link)

**Stock entry**:
One amount of a product in stock, with its own due date, purchase date, price,
location, and open state. A purchase creates one stock entry.
_Avoid_: lot, batch, stock item, stock row

**Due date**:
The date after which a stock entry is overdue or expired. Grocy's API calls
this field `best_before_date`.
_Avoid_: best-before date, expiry date, expiration date

**Booking**:
One recorded change to stock: a purchase, a consume, an open, an inventory
correction, a transfer, a stock edit, or a self-production. A booking can be
undone.
_Avoid_: stock log entry, movement, journal entry

**Transaction**:
The group of bookings that one stock action creates. A transfer creates two
bookings in one transaction. An undo of a transaction undoes all its bookings.
_Avoid_: operation, batch, database transaction (use "database transaction" in
full when you mean the database)

**Quantity unit**:
A unit of measure for an amount, such as piece, gram, or litre. A product has
a stock unit, a purchase unit, a consume unit, and a price unit.
_Avoid_: unit of measure, UoM, QU

**Product barcode**:
One code that is linked to one product, with optional defaults for a scan: a
quantity unit, an amount, a store, a last price, and a note. A product can have
many product barcodes. A typed produce code is a product barcode too.
_Avoid_: barcode (when you mean the link), EAN, UPC, PLU (names of code
formats)

**Conversion**:
A factor from one quantity unit to another. A general conversion applies to
every product. A product conversion applies to one product and wins over the
general conversion.
_Avoid_: ratio, unit mapping

**Parent product**:
A product that groups sub-products. The stock of the sub-products counts
toward the parent, and a recipe that needs the parent can consume any
sub-product.
_Avoid_: product group (a product group is a Grocy category, not a parent),
variant, generic product

**Stock workflow**:
One of the four Grocy stock actions that a user does by scan: Purchase,
Consume, Transfer, and Inventory. Purchase and Inventory each have a scan
screen. Consume and Transfer share one scan screen. One review queue serves
all four.
_Avoid_: inventory workflow (Inventory is one of the four), stock action,
scan mode

**Purchase**:
The stock workflow that adds an amount of a product to stock as one new stock
entry, with a price, a store, a due date, and a location.
_Avoid_: stock (as a workflow name), shop, buy, add, receive

**Consume**:
The stock workflow that removes an amount of a product from stock. Grocy picks
the stock entries by the consume rule of the product.
_Avoid_: use, remove, deduct, eat

**Transfer**:
The stock workflow that moves an amount of a product from one location to
another. A transfer is one transaction with two bookings.
_Avoid_: move, relocate

**Inventory**:
The stock workflow that sets the stock amount of a product to a counted
amount. Grocy books the difference as one new stock entry or as a consume.
_Avoid_: audit, stocktake, count, correction (a correction is the Grocy name
of the booking, not of the workflow)

## Grocy Next terms

**Domain**:
One area of the household that Grocy Next builds, with the subdomains that
belong to it. The architecture overview lists the domains.
_Avoid_: module, bounded context, area (an area is a Grocy menu group), part

**Subdomain**:
One cluster of data and rules inside a domain. Other subdomains point at it
by id only.
_Avoid_: module, service, component, cluster (a cluster is the Grocy table
grouping in the research)

**Review queue**:
The list of pending scans that wait for the user's decision. The user accepts
or rejects them in bulk or one by one. An ordinary edit does not pass through
the review queue.
_Avoid_: approval queue, inbox, staging area

**Pending scan**:
One scanned or typed code, or one item that an assistant read from a receipt,
that waits in the review queue. An accepted pending scan becomes a booking.
_Avoid_: pending item, draft, proposal, scan row

**Scan session**:
The time between the open and the close of one scan screen, with the optional
defaults that the screen copies into each pending scan. A scan session is not
stored.
_Avoid_: session (alone), batch, scan run

**Hardware scanner**:
A device that reads a code and sends the code to the app as key presses, as a
keyboard does.
_Avoid_: scanner (alone), barcode gun, keyboard wedge

**Booking type**:
The field of a pending scan that says which booking the accept makes: a
purchase, an inventory, a consume, or a transfer. The scan screen sets it.
_Avoid_: workflow (as a field name), transaction type (the Grocy field), mode

**Write-in name**:
A product name that the user types on a scan screen for a pending scan that
no product barcode and no lookup result matched. The short product form
takes it as the product name.
_Avoid_: manual name, custom name, free text

**Lookup result**:
The data that an online barcode service returned for a code that no product
barcode matched: the service, the name, the brand, the quantity, one image,
and the source link.
_Avoid_: product data, external product, hit

**Lookup provider**:
The part of the server that asks one online barcode service for a code and
returns the lookup result, the nutrition facts, and the image. The Open Facts
family is the one lookup provider.
_Avoid_: lookup plugin (the Grocy term), lookup service (the online service
itself), adapter, source (alone)

**Nutrition facts**:
The record that a lookup stores for one product barcode and its product: the
nutrients per 100 g or 100 ml and per serving, the scores, the ingredients,
the allergens, and the source of the data.
_Avoid_: nutrition data, product facts, nutriments (the Open Facts field name)

**Legacy API**:
The Grocy v4.7.1 API, served by Grocy Next at the same paths, under `/api`,
for backwards compatibility.
_Avoid_: compatibility API, Grocy API (when you mean the one Grocy Next serves)

**Next API**:
The API that Grocy Next designs for its own clients, under `/api/v2`. It never
mixes with the legacy API.
_Avoid_: v2 API, new API, native API

**MCP server**:
The surface of Grocy Next that an AI assistant uses. It serves one MCP tool
for each Next API operation. MCP is the Model Context Protocol.
_Avoid_: assistant API, agent interface, grocy-mcp (that is the third-party
tool that the MCP server replaces)

**MCP tool**:
One operation of the MCP server. An MCP tool mirrors one Next API operation
and returns the same confirmation or the same error.
_Avoid_: function, action, command, endpoint (when you mean the tool)

**Companion app**:
The first milestone. Grocy Next runs beside Grocy. Grocy stays the source of
truth. Grocy Next adds the functions that Grocy lacks.
_Avoid_: sidecar, add-on, plugin, phase one

**Milestone**:
One step of the roadmap, with a scope and an exit condition.
_Avoid_: phase, stage, release, version

**Implied requirement**:
A function that Grocy Next must have, that no requirements document lists.
Parity, the data migration from a running Grocy instance, the legacy API, and
the theme are implied requirements.
_Avoid_: hidden requirement, assumption, non-functional requirement

**UI parity**:
The state in which Grocy Next does every function of the Grocy v4.7.1 UI. A
state, not a milestone. The roadmap reaches it across several milestones.
_Avoid_: UI complete, frontend parity

**API parity**:
The state in which Grocy Next serves every operation of the Grocy v4.7.1 API
as the legacy API. Data ownership moves from Grocy to Grocy Next at API parity.
A state, not a milestone.
_Avoid_: backend parity, API complete

**Parity**:
The state in which Grocy Next has reached UI parity and API parity, and Grocy
can be switched off.
_Avoid_: feature complete, 1.0

**Mealie link**:
The opt-in connection between Grocy Next and a Mealie instance. It holds the
links between products and foods and between quantity units. Mealie is the
source of truth for recipes. Grocy Next is the source of truth for products,
quantity units, and stock.
_Avoid_: sync, integration, Grocy Mealie Sync (that is the third-party tool
that the Mealie link replaces)

**Stretch**:
A group of consecutive milestones with one shared outcome. The roadmap has a
companion stretch, a UI parity stretch, and an API parity stretch.
_Avoid_: phase, epic, theme

**Shared service**:
A function that more than one domain uses and that no domain owns: Calendar,
Files, Print, Userfields, and System. A shared service is built in the first
milestone whose screens need it.
_Avoid_: cross-cutting concern, utility, infrastructure

**App shell**:
The parts of the web app that every screen shares: the top bar, the sidebar,
the page frame, and the install manifest. ADR 0013 defines it.
_Avoid_: layout (alone), frame, chrome, navigation (the sidebar is one part
of the shell)
