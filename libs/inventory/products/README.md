# inventory-products

The Products subdomain of the Inventory domain. The library holds the Grocy
API client, the product schemas, the product list, the product read, and the
product create of the Next API, the four master data lists: the
locations, the stores, the product groups, and the quantity units, and the
list of the household quantity unit conversions. The
product read carries the fields of the list, the fields that the short
product form sets, the own stock of the product in the stock unit, the
picture flag, the parent flag, the tare weight, the stock entries in the
Grocy consume order, and the resolved conversions. The product create takes the body of the short product form,
checks its ids against the active master data rows, creates the product in
Grocy, and sets the factor from the purchase unit to the stock unit on the
conversion row that the Grocy trigger created. Each master data list holds
the id and the name of every active row of the Grocy table. The list of the
household conversions holds the factor from one quantity unit to another of
every conversion with no product. The Grocy API
client also adds a product barcode, uploads a product picture, and sets the
picture name on a product for the update that sets a product on a pending
scan. The Grocy stock client books a purchase and an inventory for the
accept of the review queue and reads the stock entries and the resolved
conversions of a product.
Every call of the
stock client goes through the Grocy API client, which maps the Grocy errors
to the problems of ADR 0014. The API app imports `ProductsModule`. The
operations follow the conventions of `shared-next-api`. The unit tests of
the pure rules run with `pnpm nx test inventory-products`.

The Grocy API client reads two variables at start:

- `GROCY_URL`: the address of the Grocy instance, for example
  `http://grocy:80`.
- `GROCY_API_KEY`: an API key from the Grocy "Manage API keys" page.

The process exits with a message that names the variable when one is missing.
