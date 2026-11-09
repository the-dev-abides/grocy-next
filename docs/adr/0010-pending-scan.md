---
status: accepted
---

# The pending scan model

The review queue holds the pending scans that the scan screens and the MCP
server create. The model of a pending scan sets the shape of the review
queue, the Purchase and Inventory scan screens, and the review queue
operations of the Next API. We decided on one stored entity, the pending
scan, with no stored session, no state field, and no history. The Next API
exposes it as one REST resource, and the accept is the creation of a
booking.

## The decision

- No stored scan session. A scan session is the time between the open and
  the close of one scan screen. The screen holds the optional defaults:
  location, due date rule, product group, store, and price. The screen
  copies the defaults into each pending scan at scan time. The server knows
  no session.
- Every scan is stored at once. The scan screen sends one create call per
  scan with the code, the booking type, and the optional defaults. The
  server resolves the code against the product barcodes in Grocy. A match
  sets the product and copies the barcode defaults: amount, unit, store,
  last price, and note. No match queues the online lookup. The response is
  the stored row, with no lookup result yet. The lookup worker stores the
  lookup result on the row later, within the rate limit of the source. The
  row records the time of its last lookup attempt. ADR 0011 holds the lookup
  decision. Amended by ADR 0011: the first version ran the lookup in the
  create call.
- A code is a scanned barcode or a typed code, such as a four-digit produce
  code. A typed code goes through the same create call.
- The pending scan needs a code or a product. Both can be set. An assistant
  that reads a receipt creates a pending scan with a product and no code.
- No state field. A pending scan has a product or none, a lookup result or
  none, and an error or none. The error is the Grocy message of the last
  failed accept. An update of the row clears it. The screens derive the
  words that they show from these three facts.
- The booking type is `purchase` or `inventory`. The scan screen sets it.
  The review screen shows it and does not edit it.
- Repeat rule: a new scan with a code that an open pending scan of the same
  booking type already has adds to that row. The merge adds the barcode
  amount when the barcode has one, else one. The rule has no session limit.
  One product has at most one open Inventory pending scan, and its amount is
  the total count. A pending scan from the MCP server never merges.
- The amount is in the scanned unit. For Purchase the empty unit means the
  purchase unit of the product. For Inventory the empty unit means the stock
  unit. The server converts to the stock unit at accept, with the resolved
  conversions of the product. A missing conversion is an accept error on
  that row.
- The price is stored as entered, with a price type: unit price or total
  price. The default price type is unit price, or the product default price
  type when the product sets one. A barcode last price enters as a total
  price. The server converts to a price per stock unit at accept.
- The due date is a date or none. The screen turns its due date rule into a
  date at scan time: none, a fixed date, or a number of days from today.
  Grocy applies the product default when the date is none.
- The lookup result is a fixed set of fields, not the raw response: the
  service name, the product name, the brand, the quantity text, the net
  quantity and its unit, one image URL, and the source URL for the
  attribution link.
- The accept of a pending scan with no product is refused. The row gets a
  product first: an update that sets an existing product, which also adds
  the code to that product in Grocy, or a product created with the short
  product form, which creates the product in Grocy, adds the code, and sets
  the product on the row.
- An accepted pending scan and a rejected pending scan both leave the queue.
  The accept response carries the booking with the values that Grocy stored.
  The queue keeps no history.
- The Inventory accept follows Grocy as it is: the count is the own stock of
  the product across all locations, a parent product counts own stock only,
  a tare weight product takes the gross weight, and a decrease consumes in
  the Grocy order. When the count equals the current stock, the server does
  not call Grocy; the accept removes the row and reports no change.
- Bulk accept and bulk reject are the client calling one operation per row.
  Each call is one result. No all-or-nothing option in this milestone.
- The Next API is standard REST on resources:
  - `GET /api/v2/pending-scans`, the full list, no cut-off.
  - `POST /api/v2/pending-scans`, create.
  - `GET /api/v2/pending-scans/{id}`, read one.
  - `PATCH /api/v2/pending-scans/{id}`, update any field, the product
    included.
  - `DELETE /api/v2/pending-scans/{id}`, reject.
  - `POST /api/v2/bookings`, accept. The body names one pending scan.
  - `POST /api/v2/products`, the short product form.
  Every operation is also an MCP tool in this milestone. The `products` and
  `bookings` resources are the Next API resources that milestone 4 widens
  and milestone 10 serves from Grocy Next storage.

## Considered options

- A stored scan session with a name, grouping, and a bulk accept per
  session. Rejected: a second entity, its operations, and an end rule, for
  a grouping that the sort by scan time gives.
- One `state` field: new, matched, unmatched, found, no result, accepted,
  failed, rejected. Rejected: it mixes three facts in one field and needs a
  transition table. Three optional facts have no invalid combination.
- An `accepted` state with the booking reference, as a history. Rejected:
  milestone 14 builds the change log for every change, and milestone 4
  builds the undo of a stock transaction.
- The stock unit amount stored at scan time. Rejected: the queue is where
  the user sets the amount, and the user counts in the unit on the shelf.
- The short product form and the accept as one call. Rejected: two writes
  behind one call, against the rule of no hidden side effect. The screen
  gives the same one click with two calls.
- All-or-nothing bulk accept. Rejected: Grocy has no transaction across
  calls, and an undo can be blocked by a later booking.
- Action operations: accept, reject, accept all, reject all, set product,
  create product. Rejected by the maintainer: standard REST on the
  resources covers every action.

## Consequences

- The scan screens and the MCP server share one create path. The Grocy
  logic for the code resolution lives in the server only.
- A pending scan changes after the create call when the lookup worker stores
  the lookup result. The scan screens and the review queue need a poll or a
  server push to see that change. That is a Next API conventions decision.
- A row with an error stays in the queue until the user edits it, accepts
  it again, or rejects it.
- The review queue needs the current stock, the parent product flag, and
  the tare weight flag at display time. It reads them from the product, not
  from the row.
- The Next API conventions that these operations need, the error shape, the
  id format, and the confirmation body, are a separate decision on the
  milestone 2 map.

## Sources

- The Grocy API research on branch `research/grocy-api-review-queue`.
- The barcode lookup research on branch `research/barcode-lookup-services`.
- Ticket [#68](https://github.com/the-dev-abides/grocy-next/issues/68).
