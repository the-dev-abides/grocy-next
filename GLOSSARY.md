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

## Grocy Next terms

**Domain**:
One area of the household that Grocy Next builds, with the subdomains that
belong to it. The architecture overview lists the domains.
_Avoid_: module, bounded context, area (an area is a Grocy menu group), part

**Subdomain**:
One cluster of data and rules inside a domain. Other subdomains point at it
by id only. A milestone map designs a subdomain.
_Avoid_: module, service, component, cluster (a cluster is the Grocy table
grouping in the research)

**Review queue**:
The list of pending scans that wait for the user's decision. The user accepts
or rejects them in bulk or one by one. An ordinary edit does not pass through
the review queue.
_Avoid_: approval queue, inbox, staging area

**Pending scan**:
One scanned item, or one item that an assistant read from a receipt, that
waits in the review queue. An accepted pending scan becomes a booking.
_Avoid_: pending item, draft, proposal

**Legacy API**:
The Grocy v4.7.1 API, served by Grocy Next at the same paths, for third-party
tools that were built for Grocy.
_Avoid_: compatibility API, Grocy API (when you mean the one Grocy Next serves)

**Next API**:
The API that Grocy Next designs for its own clients. It never mixes with the
legacy API.
_Avoid_: v2 API, new API, native API

**Companion app**:
The first milestone. Grocy Next runs beside Grocy. Grocy stays the source of
truth. Grocy Next adds the functions that Grocy lacks.
_Avoid_: sidecar, add-on, plugin, phase one

**Milestone**:
One step of the roadmap, with a scope and an exit condition. Each milestone
gets its own wayfinder map.
_Avoid_: phase, stage, release, version

**Implied requirement**:
A function that Grocy Next must have, that no requirements document lists.
Parity, the data migration from a running Grocy instance, and the legacy API
are implied requirements.
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
