# inventory-review-queue

The review queue subdomain of the Inventory domain. The library holds the
pending scan entity, the nutrition facts entity, the two migrations that
create their tables, the pending scan and booking schemas, the pending scan
operations of the Next API: the create, the list, the read, the update, and
the delete, and the accept as the creation of a booking. The accept of a
Purchase converts the amount and the price to the stock unit with the
resolved conversions of the product, books the purchase in Grocy, deletes the
row, and returns the stock log rows of the transaction. A Grocy refusal
stays on the row as its error. An update that sets a product on a row adds
the code to the product in Grocy, sets the lookup image as the product
picture when the product has none, and links the nutrition facts of the
code to the product. The create applies the repeat rule of ADR 0010 when the caller
asks for a merge, and queues the online barcode lookup of ADR 0011 for a new
row with no product, no write-in name, and a code of 8, 12, 13, or 14
digits. The lookup worker runs the lookups in the process with a plain
timer, one at a time and within the rate budget of the provider. The one
lookup provider is the Open Facts family. The API app imports
`ReviewQueueModule.forRoot` with the version of the API package and lists
the entities and the migrations in its storage module. The operations follow
the conventions of `shared-next-api`. The library imports the Products
library for the Grocy API client.

The library reads two environment variables in `lookup-options.ts`:
`BARCODE_LOOKUP` (`on` or `off`, unset means `on`) and `OPEN_FACTS_URL`
(unset means `https://world.openfoodfacts.org`).
