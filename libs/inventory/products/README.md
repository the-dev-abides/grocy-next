# inventory-products

The Products subdomain of the Inventory domain. In milestone 1 the library
holds the Grocy API client and the product list operation of the Next API.
The API app imports `ProductsModule`.

The Grocy API client reads two variables at start:

- `GROCY_URL`: the address of the Grocy instance, for example
  `http://grocy:80`.
- `GROCY_API_KEY`: an API key from the Grocy "Manage API keys" page.

The process exits with a message that names the variable when one is missing.
