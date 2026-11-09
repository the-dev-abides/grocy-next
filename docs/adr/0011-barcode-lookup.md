---
status: accepted
---

# The barcode lookup

A scanned code that no product barcode matches goes to an online barcode
lookup. The lookup fills the pending scan, the short product form, and a new
nutrition facts record. We decided on the Open Facts family as the one
source, behind a lookup provider interface, with a server-side queue that
respects the Open Facts rate limit. The data that the lookup returns is open
data, and the app shows the attribution that Open Facts asks for.

## The decision

- Resolution order for a code: a Grocycode, then a product barcode in Grocy
  with a case-insensitive match, then the online lookup, then the bare code.
- The online lookup runs only for a code of 8, 12, 13, or 14 digits. A typed
  produce code, a Code 128 value, and a QR or Data Matrix value that is not a
  Grocycode skip it. For the lookup only, the server expands a UPC-E code to
  its 12-digit UPC-A form. The product barcode keeps the code as scanned.
- Amended by the purchase scan screen prototype: ZXing returns a UPC-A as a
  13-digit EAN with a leading zero, and Grocy stores the 12 digits that its
  own scanner gave. The product barcode match treats a 12-digit code and
  its 13-digit form with a leading zero as one code. The repeat rule of ADR
  0010 does the same.
- The source is the Open Facts family: Open Food Facts, Open Beauty Facts,
  Open Pet Food Facts, and Open Products Facts. The server sends one v3 read
  to Open Food Facts with `product_type=all` and follows the redirect to the
  host that holds the product. No commercial service is used.
- The source sits behind a lookup provider interface. A provider has a lookup
  by code that returns the lookup result, the nutrition facts, and the image
  URL, or nothing. A provider declares its rate budget, its attribution text,
  and its user agent. One provider exists, chosen in code. A registry with an
  ordered list of providers, and a setting for that order, come with the
  second provider.
- One environment variable turns the online lookup off. The default is on.
- The create call of a pending scan stores the row and queues the lookup. An
  in-process worker runs the lookups within the budget of the provider, 15
  reads per minute for Open Facts, and updates the row with the result. The
  pending scan records the time of its last lookup attempt. At start, the
  worker re-queues every open pending scan with no product and no attempt. A
  miss, a timeout, or a network error leaves the row with no lookup result
  and no error.
- The lookup result keeps the fields of ADR 0010. The name is `product_name`,
  the name in the main language of the product. The image URL is the front
  image at 400 px height. The browser loads the image from the Open Facts
  host. The server does not proxy it.
- The nutrition facts record is one row per lookup, in Grocy Next storage,
  linked to the product barcode and to the product. It holds typed columns
  for the standard nutrient set per 100 g or 100 ml and per serving: energy in
  kJ and kcal, fat, saturated fat, carbohydrates, sugars, fiber, proteins,
  salt, and sodium. It holds the data basis, the serving size text, the
  serving quantity and its unit, the Nutri-Score grade, the NOVA group, the
  Eco-Score grade and score, the nutrient levels, the ingredients text, and
  the allergen, trace, additive, and analysis tags. It holds the source: the
  service name, the source URL, the licence, the image source URL, and the
  fetch time. It holds the raw `nutriments` object as one JSON column. No
  record is written for a code that a product barcode matches.
- The record links to the product in two ways. The short product form creates
  the product and links the record. An update that sets an existing product
  on the pending scan adds the product barcode in Grocy, links the record,
  and sets the product picture when the product has none.
- The short product form proposes values from the lookup. The name is
  `product_name`. The description holds the brand and the label quantity
  text. The stock unit is the household quantity unit whose name matches g or
  ml from a built-in name list, or a household unit with a conversion to a
  matching name, with the amount converted. The purchase unit is a household
  unit whose name is in a built-in package name list. The factor from the
  purchase unit to the stock unit is the net quantity in the stock unit. When
  the stock unit has no match, or the lookup has no net quantity, the form
  proposes no units and shows the label text beside the unit fields. The user
  can change every proposal. The product group, the location, the due days,
  and the minimum stock do not come from the lookup.
- The server downloads the front image at 400 px height and uploads it to
  Grocy as the product picture of the new product.
- The user agent is `GrocyNext/<version> (https://github.com/the-dev-abides/grocy-next)`.
  The version comes from the app package.
- Attribution: each pending scan with a lookup result shows the service name
  as a link to the product page. The review queue screen and the short
  product form show one line: "Contains data from Open Food Facts, available
  under the Open Database License", with the name of the service that held
  the product and a link to it. The nutrition facts record stores the source
  URL and the licence, so a later screen shows the same attribution.
- Grocy Next does not use the Grocy external lookup plugin. The plugin stays
  in Grocy for the Grocy UI. The legacy API operation
  `GET /api/stock/barcodes/external-lookup/{barcode}` keeps the milestone 1
  behaviour.

## Considered options

- UPCitemdb as a second source for products that Open Facts does not hold.
  Rejected: proprietary data, terms that are silent on caching, and a quota
  of 100 reads per day per IP address that the whole household shares.
- Barcode Lookup, Go-UPC, and EAN-Search. Rejected: a paid key on every tier,
  proprietary data, and deletion of cached data at the end of the
  subscription.
- The lookup in the create request, with a wait on HTTP 429. Rejected: Open
  Facts counts reads per clock minute and sends no `Retry-After` header, so
  the wait is up to 60 seconds inside the scan loop.
- BullMQ with the PostgreSQL backend as the queue. Rejected for now: BullMQ
  6.7.1 has no SQLite backend, and ADR 0008 serves SQLite and PostgreSQL.
  It is the choice when the project drops SQLite or adds Redis.
- A registry of providers with a configurable order now. Rejected: the
  registry and the per-provider budget cost the same now or later, and the
  setting has no second provider to choose.
- No unit proposal from the net quantity. Rejected by the maintainer in
  favour of a proposal that the user can change.
- No copy of the image. Rejected by the maintainer. The Grocy plugin copies
  the image, and a new product with a picture is the expected result.
- The brand in the product name. Rejected: a longer name in every recipe and
  shopping list text. The description holds the brand.

## Consequences

- ADR 0010 is amended: the create call queues the lookup, the response can
  lack the lookup result, and the pending scan has a last lookup attempt
  time.
- The scan screens and the review queue must see a pending scan change after
  the create call. A poll or a server push is a decision of the Next API
  conventions.
- The household data stays internal. Section 4.5c of the ODbL says that use
  of a derivative database inside an organisation is not public use, so the
  share-alike clause does not apply. The attribution in the UI meets the
  Open Facts request.
- A backfill of nutrition facts for existing products, and a screen that
  shows nutrition facts, are not in milestone 2.
- Whether the camera decoder returns UPC-E as 8 digits or as 12 digits is a
  fact that the build checks. The purchase scan screen prototype checked
  UPC-A: ZXing returns 13 digits with a leading zero.
- The built-in name lists for units and packages can be wrong for a
  household. The form always lets the user change the proposal.

## Sources

- The barcode lookup research on branch `research/barcode-lookup-services`.
- The Grocy API research on branch `research/grocy-api-review-queue`.
- The Open Facts server source, `lib/ProductOpener/Routing.pm` and
  `lib/ProductOpener/Display.pm`: the rate limit counts per clock minute and
  returns HTTP 429 with no `Retry-After` header.
- The Open Facts schema files `product_nutrition.yaml`,
  `product_ingredients.yaml`, and `product_misc.yaml`.
- The BullMQ PostgreSQL guide and the NestJS queues documentation.
- The ODbL 1.0 text, section 4.5c.
- Ticket [#69](https://github.com/the-dev-abides/grocy-next/issues/69).
