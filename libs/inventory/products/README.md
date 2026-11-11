# inventory-products

The Products subdomain of the Inventory domain. The library holds the Grocy
API client, the product schemas, the product list, the product read, and the
product create of the Next API, and the four master data lists: the
locations, the stores, the product groups, and the quantity units. The
product read carries the fields of the list, the fields that the short
product form sets, the own stock of the product in the stock unit, and the
picture flag. The product create takes the body of the short product form,
checks its ids against the active master data rows, creates the product in
Grocy, and sets the factor from the purchase unit to the stock unit on the
conversion row that the Grocy trigger created. Each master data list holds
the id and the name of every active row of the Grocy table. The Grocy API
client also reads the resolved conversions of a product, books a purchase
for the accept of the review queue, and adds a product barcode, uploads a
product picture, and sets the picture name on a product for the update that
sets a product on a pending scan. The API app imports `ProductsModule`. The
operations follow the conventions of `shared-next-api`. The unit tests of
the pure rules run with `pnpm nx test inventory-products`.

The Grocy API client reads two variables at start:

- `GROCY_URL`: the address of the Grocy instance, for example
  `http://grocy:80`.
- `GROCY_API_KEY`: an API key from the Grocy "Manage API keys" page.

The process exits with a message that names the variable when one is missing.
