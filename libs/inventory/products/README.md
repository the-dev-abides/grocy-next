# inventory-products

The Products subdomain of the Inventory domain. The library holds the Grocy
API client, the product schemas, the product list and the product read of
the Next API, and the four master data lists: the locations, the stores, the
product groups, and the quantity units. The product read carries the fields
of the list, the fields that the short product form sets, the own stock of
the product in the stock unit, and the picture flag. Each master data list
holds the id and the name of every active row of the Grocy table.
The Grocy API client also reads the resolved conversions of a product,
books a purchase for the accept of the review queue, and adds a product
barcode, uploads a product picture, and sets the picture name on a product
for the update that sets a product on a pending scan. The API app imports
`ProductsModule`. The operations follow the conventions of
`shared-next-api`.

The Grocy API client reads two variables at start:

- `GROCY_URL`: the address of the Grocy instance, for example
  `http://grocy:80`.
- `GROCY_API_KEY`: an API key from the Grocy "Manage API keys" page.

The process exits with a message that names the variable when one is missing.
