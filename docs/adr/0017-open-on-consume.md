---
status: accepted
---

# The open on consume

A person cannot consume from a sealed pack and leave it sealed. Grocy makes
the open a separate action with its own form. The user then does two actions
for one event. We decided that a consume through Grocy Next also makes the
open. The user sees one consume and does one accept. Grocy Next adds no rule
of its own for the choice of the stock entries.

## The decision

- Grocy Next calls the Grocy consume for the amount. Grocy picks the stock
  entries in its consume order.
- When the consume leaves a sealed stock entry partly in stock, Grocy Next
  calls the Grocy open for the rest of that stock entry. The open call names
  the stock entry.
- A stock entry that the consume takes fully gets no open.
- A product with the Grocy setting "cannot be opened" gets no open. A tare
  weight product gets no open. Grocy refuses the open for both.
- Grocy does the move on open and sets the due date after the open. Grocy
  Next does not repeat these rules.
- A spoiled consume follows the same steps.
- An Inventory decrease makes no open. Grocy consumes the difference inside
  Grocy, as ADR 0010 records.
- When the consume fails, nothing is booked. The pending scan keeps the
  Grocy error.
- When the open fails after the consume, the consume stays booked and the
  accept succeeds. The consume is what the user asked for.
- The Next API response holds the bookings of the consume and of the open.
- The user interface shows one consume. It has no Open scan screen and no
  `open` booking type.
- The Grocy undo of a consume does not undo the open. Milestone 4 builds
  the undo and decides what Grocy Next does about this.

## Considered options

- Open before the consume, with an amount that Grocy Next calculates from
  the opened stock and the quick open amount of the product. Rejected: the
  quick open amount is only the default of a button in the Grocy browser
  page, and the rule made a choice for the user that Grocy does not make.
- A calculation in Grocy Next of the stock entries that the consume takes,
  with one Grocy call for each. Rejected: it copies the Grocy consume order
  into Grocy Next and solves cases that Grocy does not solve.
- An open amount that the user sets on the review queue row. Rejected: it
  keeps two decisions for one event.

## Consequences

- An accept of a consume makes one or two Grocy calls.
- Grocy has no database transaction across the two calls. A failed open
  leaves a sealed stock entry that is partly consumed, as Grocy does today.
- One stock entry can hold more than one pack. The open then marks the full
  rest of the stock entry as open.

## Sources

- The Grocy API research on branch `research/grocy-consume-open-transfer`.
- Ticket [#125](https://github.com/the-dev-abides/grocy-next/issues/125).
