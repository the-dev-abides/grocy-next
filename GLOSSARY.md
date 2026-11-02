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
