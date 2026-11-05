# Research: barcode lookup services for an unknown barcode

Ticket: [#63](https://github.com/the-dev-abides/grocy-next/issues/63).
Date: 2026-11-05.
Live checks against the APIs ran on that date.

## Question

Which online services resolve a retail barcode to product data? The lookup
runs on the Grocy Next server when a scanned barcode matches no Grocy product.
The ticket asks for nine services: Open Food Facts, Open Beauty Facts, Open
Pet Food Facts, Open Products Facts, UPCitemdb, Barcode Lookup, Go-UPC,
EAN-Search, and the external lookup plugin interface of Grocy v4.7.1. For each
service: the terms of use for a self-hosted open source app, the need for an
API key, the rate limits, the price, the fields returned, the coverage for
products that are not food, the licence of the data, and the user agent or
attribution rules.

The ticket also asks which fields map to the short product form of the review
queue (name, stock unit, purchase unit, product group), and what a lookup
gives for the units.

This file records facts. It makes no decision.

## Summary

- The four Open Facts services share one server software, one API, and one
  licence set. They need no API key. They are free. A read of one product is
  limited to 15 requests per minute per IP address. The terms allow one API
  call per real scan by a user. They require a custom `User-Agent` header and
  attribution with a link in the app UI. The data is under the ODbL (Open
  Database License). Images are under CC BY-SA.
- Open Food Facts holds about 4.9 million food products. Open Beauty Facts
  holds cosmetics. Open Pet Food Facts holds about 15,700 pet food products.
  Open Products Facts holds about 48,700 other products. A v3 read with
  `product_type=all` on one host redirects to the host that holds the product.
- UPCitemdb has a free tier with no key: 100 requests per day per IP address,
  6 lookups per minute. Paid tiers start at $99 per month. The data is
  proprietary. The terms do not mention caching or redistribution.
- Barcode Lookup, Go-UPC, and EAN-Search need an API key on every tier. None
  has a free tier. Barcode Lookup starts at $99 per month. Go-UPC starts at
  74.95 per month. EAN-Search starts at 19 EUR per month. Barcode Lookup and
  Go-UPC forbid redistribution of the data and require deletion of cached data
  when the subscription ends.
- No commercial service requires attribution or a specific `User-Agent`.
- Only the Open Facts services return a parsed net quantity
  (`product_quantity` and `product_quantity_unit`, in g or ml). No service
  returns a stock unit, a purchase unit, or a conversion factor. No service
  returns a Grocy product group. Every service returns a name. Every service
  except EAN-Search returns a brand and at least one image URL.
- The Grocy v4.7.1 plugin is a PHP class in the Grocy process. It returns a
  Grocy product record with Grocy ids for the location and the two units. The
  built-in Open Food Facts plugin takes only the name and the image from Open
  Food Facts. It takes the units from the user presets, and sets the factor
  to 1.

## Findings

### 1. The Open Facts services

Open Food Facts, Open Beauty Facts, Open Pet Food Facts, and Open Products
Facts run the same server software. The sister projects "behave mostly like
Open Food Facts" and share the API reference.
([sister tutorial](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/scanning-cosmetics-pet-food-and-other-products/))
The facts in this section apply to all four, except where a service is named.

**Terms of use.** The data page says: "You are very welcome to use the API
for production cases, as long as 1 API call = 1 real scan by a user." It also
says: "Any attempt to scrape the database using the API will very likely be
blocked, as full daily exports are available on this very page."
([OFF data](https://world.openfoodfacts.org/data),
[OPFF data](https://world.openpetfoodfacts.org/data),
[OPF data](https://world.openproductsfacts.org/data))
The terms page says the licences "authorize the use and reproduction of the
content for all purposes, including commercial use", and "Derivative works
must be shared under the same conditions."
([OFF terms](https://world.openfoodfacts.org/terms-of-use))
The FAQ says: "the ODbL requires that the resulting database must be released
as open data as well" when an app combines the data with other data.
([OFF FAQ](https://world.openfoodfacts.org/faq#api-data-reuse))
The API introduction says: "If your requests originate from your users (e.g.
for a mobile app), then the rate limits apply per user."
([API intro](https://openfoodfacts.github.io/openfoodfacts-server/api/))
A self-hosted server sends every request from one IP address.

**API key.** None for reads. "READ operations (getting info about a product,
etc...) do not require authentication other than the custom User-Agent."
Writes need a user account.
([API intro](https://openfoodfacts.github.io/openfoodfacts-server/api/))

**Rate limits.** "15 req/min/IP address for all read product queries
(`GET /api/v*/product` requests or product page)." "10 req/min/IP address
for all search queries." Product writes have no limit. A site-wide global
limit also exists: "A HTTP 503 response (Service Not Available) will be
returned if these limits are exceeded." The project reserves "the right to
deny you access to the website and the API through IP address ban."
([API intro](https://openfoodfacts.github.io/openfoodfacts-server/api/))

**Price.** "We provide our database and API 100% free of charge and open to
all." The data page asks commercial users to donate or to become an API
sponsor.
([OFF data](https://world.openfoodfacts.org/data))

**Fields.** A live v2 read on 2026-11-05 of
`https://world.openfoodfacts.org/api/v2/product/3017624010701?fields=...`
returned these fields. The schema descriptions come from the OpenAPI files.

| Field | Type | Live value | Schema description |
| --- | --- | --- | --- |
| `product_name` | string | `"Nutella"` | "The name of the product in the main language of the product (lang field)" |
| `product_name_<lc>` | string | `product_name_en`, `product_name_de` | One field per language. |
| `generic_name` | string | `""` | The legal name. |
| `brands` | string | `"Ferrero"` | "Comma separated list of brands (not taxonomized)" |
| `brands_tags` | array | `["Ferrero"]` | "An array of indexed brands tag entries (for search)." |
| `quantity` | string | `"400.0 g"` | "The quantity of the product, with the corresponding number of portions or unit (g, ml, kg, l, cl, oz, lbs...)." |
| `product_quantity` | number | `400` | "The size in g or ml for the whole product." The schema says string. The live value is a number. |
| `product_quantity_unit` | string | `"g"` | "The unit (either g or ml) for the corresponding `product_quantity`." |
| `image_url`, `image_small_url` | string | URL | Front image, 400 px and 200 px. The schema says: "you should use `selected_images` field instead of this one." |
| `image_front_url`, `image_front_small_url` | string | URL | Same images. Pattern `image(_(front\|packaging\|ingredients\|nutrition))?(_(small\|thumb))?_url`. |
| `selected_images` | object | not requested | "URL for selected (important) images of the product." Keys `front`, `packaging`, `ingredients`, `nutrition`. |
| `categories` | string | `"Schoko- und Haselnussaufstriche, Other"` | "Comma separated list of categories (not taxonomized)". The schema says `brands` and `categories` are "mostly used for debugging and testing purposes. Do not use it for display purposes." |
| `categories_tags` | array | `["en:breakfasts", ..., "en:hazelnut-spreads", ...]` | "An array of indexed categories tag entries (for search)." |
| `categories_hierarchy` | array | same list | "An array of categories tag entries (for display and editing)." |
| `lang` | string | `"de"` | The main language of the product. |
| `product_type` | string | not requested | Enum `beauty`, `food`, `petfood`, `product`. |

([product_base.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/schemas/product_base.yaml),
[product_base_tags.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/schemas/product_base_tags.yaml),
[product_tags.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/schemas/product_tags.yaml),
[product_images.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/schemas/product_images.yaml),
[product_type.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/schemas/product_type.yaml))

The v2 envelope has `code`, `product`, `status`, and `status_verbose`. A
found product gives `"status": 1, "status_verbose": "product found"`. A live
read of an unknown code on 2026-11-05 gave HTTP 200 with
`{"code":"00000000","status":0,"status_verbose":"no code or invalid code"}`.
The v3 envelope has `code`, `errors`, `product`, `result`, `status`, and
`warnings`. `result.id` is `product_found` on success.
([api.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/api.yaml),
[api-v3.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/api-v3.yaml))

**Endpoints.** Production host `https://world.openfoodfacts.org`. Read:
`GET /api/v2/product/{code}` and `GET /api/v3/product/{code}`. A `.json`
suffix on the code is accepted. The `fields` query parameter limits the
response: `?fields=product_name,brands,nutriments`. In v3 the `fields` value
`all` is the default for reads. The API introduction lists v3 as "Current —
recommended for all new integrations" and v2 as "Deprecated — still
supported for backward compatibility". Structured search is v2 only:
`/api/v2/search`.
([API intro](https://openfoodfacts.github.io/openfoodfacts-server/api/),
[cheat sheet](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-cheatsheet/),
[api-v3.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/api-v3.yaml))

The sister hosts are `https://world.openbeautyfacts.org`,
`https://world.openpetfoodfacts.org`, and
`https://world.openproductsfacts.org`, with the same paths.
([OPFF data](https://world.openpetfoodfacts.org/data),
[OPF data](https://world.openproductsfacts.org/data),
[OBF data source file](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-web/main/lang/obf/en/texts/data.html))

**One lookup across the four databases.** The v3 read accepts a
`product_type` query parameter with the values `all`, `beauty`, `food`,
`petfood`, and `product`. The default is the type of the host queried. With
`product_type=all`, a product that exists on another host gives a HTTP 302
redirect to that host. A product on no host gives 404.
([requested_product_type.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/parameters/requested_product_type.yaml),
[sister tutorial](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/scanning-cosmetics-pet-food-and-other-products/))

**Staging.** `https://world.openfoodfacts.net`, with HTTP basic auth user
`off` and password `off`. "While testing your applications, make all API
requests to the staging environment." Staging and production have separate
account databases. Staging hosts for the three sister projects: not
confirmed.
([API intro](https://openfoodfacts.github.io/openfoodfacts-server/api/))

**Barcode normalisation.** The server pads codes of 7 digits or fewer (after
leading zeros are removed) to 8 digits. It pads codes of 9 to 12 digits to 13
digits. "The Open Food Facts API automatically normalizes the barcode passed
in the "code" field for both READ and WRITE requests." Example: a request for
the 12-digit `034000470693` returns the product stored as `0034000470693`.
The page gives no rule for 14-digit codes. A client can send the barcode as
scanned.
([barcode normalization](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-barcode-normalization/))

**Coverage.**

| Service | Coverage statement | Product count on 2026-11-05 |
| --- | --- | --- |
| Open Food Facts | "A collaborative, free and open database of food products from around the world." ([home](https://world.openfoodfacts.org/)) | 4,897,152 |
| Open Beauty Facts | "Open Beauty Facts is a cosmetics products database made by everyone, for everyone." ([index source file](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-web/main/lang/obf/en/texts/index.html)) | Not confirmed. The live site timed out. |
| Open Pet Food Facts | "A collaborative, free and open database of pet food products from around the world." ([home](https://world.openpetfoodfacts.org/)) | 15,714 |
| Open Products Facts | "Open Products Facts is a general products (BUT NOT food, cosmetics or pet food) database made by everyone, for everyone." ([home](https://world.openproductsfacts.org/)) | 48,705 |

**Data licence.** "The Open Food Facts database is available under the Open
Database License (ODbL)." "The individual contents of the database are
available under the Database Contents License (DbCL)." "Products images are
available under the Creative Commons Attribution ShareAlike licence
(CC-BY-SA)." Images "may contain graphical elements subject to copyright or
other rights". The sister data pages repeat the three sentences with their own
project name.
([OFF terms](https://world.openfoodfacts.org/terms-of-use),
[OFF data](https://world.openfoodfacts.org/data),
[OPFF data](https://world.openpetfoodfacts.org/data),
[OPF data](https://world.openproductsfacts.org/data))

**User-Agent.** "We ask you to always use a custom User-Agent to identify
your app (to not risk being identified as a bot)." "The User-Agent should be
in the form of `AppName/Version (ContactEmail)`." Example
`MyApp/1.0 (myapp@example.com)`. The OpenAPI file gives the form
`app_name/app_version (URL or contact info)` and says: "This is recommended
in all requests so that we can contact you if there are issues."
([API intro](https://openfoodfacts.github.io/openfoodfacts-server/api/),
[api.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/api.yaml))

**Attribution.** Re-users "have to mention the licence and to attribute the
authorship to Open Food Facts with a link to https://openfoodfacts.org, the
appropriate local version (e.g. https://en.openfoodfacts.org) or the product
page". The data page gives the example "Contains data from Open Food Facts,
available under the Open Database License" and says: "Clearly attribute Open
Food Facts in your app or website UI". The sister data pages give the same
example with their own name. The terms give no fixed attribution text. The
licence tutorial asks re-users to check that the app is not on the
non-compliance list and to contact `reuse@openfoodfacts.org`.
([OFF terms](https://world.openfoodfacts.org/terms-of-use),
[OFF data](https://world.openfoodfacts.org/data),
[licence tutorial](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/))

### 2. UPCitemdb

The UPCitemdb pages were fetched directly. The trial endpoint was called live
on 2026-11-05.

**Terms.** The licence is a "limited, non-exclusive, non-transferable and
terminable license to access and use the Service", "solely for Customer's
operations". Data "shall vest in and be the sole and exclusive property of
that Party or such third party". The terms say nothing about caching,
storing, or redistributing API data. They say nothing about open source or
multiple end users. UPCitemdb can "refuse connections/traffic without warning
at traffic volumes constantly above the sustainable rate". The docs say:
"The information is all provided as-is, with no guarantees on availability
or accuracy of the results."
([terms](https://devs.upcitemdb.com/termsofservice),
[developer home](https://devs.upcitemdb.com/))

**API key.** The FREE plan needs no key and no sign-up. The paid plans DEV
and PRO need two request headers: `user_key` and `key_type: 3scale`.
([plans](https://www.upcitemdb.com/wp/docs/main/development/plan/),
[getting started](https://www.upcitemdb.com/wp/docs/main/development/getting-started/))

**Rate limits.**

| Plan | Per day | Burst | Sustainable | Connections | Counted per |
| --- | --- | --- | --- | --- | --- |
| FREE | 100 combined, of which 20 search | 6 lookups per minute, 2 searches per 30 seconds | 1 request per 10 seconds | 1 | IP address |
| DEV | 20,000 lookups, 2,000 searches | 15 lookups and 5 searches per 30 seconds | 1 lookup per 2 seconds | 2 | application |
| PRO | 150,000 lookups, 20,000 searches | 12 lookups and 2 searches per second | 6 lookups per second | 6 | application |

Over the limit: HTTP 429 with code `EXCEED_LIMIT` (daily) or `TOO_FAST`
(burst). Requests during a burst block extend the block. Response headers:
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (Unix
time), `X-RateLimit-Current`. A live trial call returned
`X-RateLimit-Limit: 100`. The gateway closes idle connections after 5
minutes.
([plans](https://www.upcitemdb.com/wp/docs/main/development/plan/),
[rate limits](https://www.upcitemdb.com/wp/docs/main/development/api-rate-limits/),
[responses](https://www.upcitemdb.com/wp/docs/main/development/responses/))

**Price.** The currency sign is "$". The page does not name USD. EXPLORER
(FREE): $0, 100 combined requests per day, full database access. DEV: $99
per month. PRO: $699 per month. Overage: $0.04 per 100 lookup calls and
$0.03 per 10 search calls. Daily overage requests get HTTP 429 by default.
([developer home](https://devs.upcitemdb.com/))

**Fields.** Top level: `code`, `total`, `offset`, `items`. Each item: `ean`
(EAN-13, the unique key), `upc` (12 digits, only when the EAN starts with 0),
`gtin` (GTIN-14, optional), `title`, `description`, `brand`, `model`,
`color`, `size`, `dimension`, `weight`, `category` (Google product
taxonomy), `currency`, `lowest_recorded_price`, `highest_recorded_price`,
`images` (array of URLs), `offers` (array), `elid`, `user_data`. The `size`
field is for clothing and shoes. No net quantity field exists. A live trial
call for EAN 4002293401102 returned `title`, `brand`, `model`, `category`,
`dimension`, `weight`, and `offers`.
([responses](https://www.upcitemdb.com/wp/docs/main/development/responses/))

**Coverage.** The homepage states "766,654,942 unique UPC numbers" and "over
27 million unique ISBN numbers". The vendor publishes no category breakdown.
Amazon and eBay data are excluded from the API.
([home](https://www.upcitemdb.com/),
[developer home](https://devs.upcitemdb.com/))

**Data licence.** Proprietary. "All rights reserved." The licence sentence
above is the only grant.
([terms](https://devs.upcitemdb.com/termsofservice))

**Attribution and User-Agent.** No rule found on any page.

**Endpoint.** FREE:
`GET https://api.upcitemdb.com/prod/trial/lookup?upc=4002293401102`. Paid:
`GET https://api.upcitemdb.com/prod/v1/lookup?upc=...` with the two headers.
Search: `/prod/trial/search?s=...` and `/prod/v1/search?s=...`. Batch: FREE
allows 2 codes per request, comma separated. Paid allows 10.
([plans](https://www.upcitemdb.com/wp/docs/main/development/plan/))

**Formats.** "lookup function produces item's detail information for a given
UPC, EAN, GTIN or ISBN." The request parameter is always `upc`. Items are
keyed by EAN-13. The docs do not mention EAN-8. An invalid code returns HTTP
400 `INVALID_UPC`.
([developer home](https://devs.upcitemdb.com/),
[responses](https://www.upcitemdb.com/wp/docs/main/development/responses/))

### 3. Barcode Lookup

Every page fetch and the API endpoint returned HTTP 403 with a Cloudflare
challenge page. All facts in this section come from search engine snippets
of barcodelookup.com pages. The snippets are 3 to 5 years old. Every fact in
this section is not confirmed.

**Terms.** "Barcode Lookup grants you a non-exclusive, non-sublicensable,
non-assignable, revocable, limited subscription". After termination "you
shall delete all Product Data previously provided to you (including any
cached and backed up Product Data)". "Certain elements of Product Data, such
as product images and descriptions, are the property of third parties and
not Barcode Lookup." "API calls may not exceed 100 API calls per minute,
without Barcode Lookup's express written consent." No clause about open
source or multiple end users was found.
([terms](https://www.barcodelookup.com/terms-and-conditions))

**API key.** Required on all tiers. Sent as the `key` query parameter.
([API docs](https://www.barcodelookup.com/api-documentation))

**Rate limits.** 100 requests per minute. A monthly quota per plan. "The
monthly API quota is only deducted when data is returned from a request,
which will have a HTTP 200 status response code." Sample code treats HTTP
429 as the limit response. Usage endpoint:
`GET https://api.barcodelookup.com/v3/rate-limits?key=...`.
([API docs](https://www.barcodelookup.com/api-documentation))

**Price.** Currency sign "$". Starter $99 per month, 5,000 calls. Advanced
$249 per month, 25,000 calls. Professional $499 per month, 100,000 calls.
Enterprise $949 per month, 500,000 calls. No free API tier was found.
([API page](https://www.barcodelookup.com/api))

**Fields.** `barcode_number`, `barcode_formats`, `mpn`, `title`, `brand`,
`category` (Google product taxonomy), `size`, `images` (array of URLs).
Other fields exist and were not confirmed.
([API docs](https://www.barcodelookup.com/api-documentation))

**Coverage.** "millions of products sold worldwide". Barcode types: UPC, EAN
(EAN-8 and EAN-13), ISBN, JAN, ITF-14.
([symbology](https://www.barcodelookup.com/symbology),
[FAQ](https://www.barcodelookup.com/faq))

**Data licence.** The vendor claims ownership of Product Data. Third parties
own images and descriptions.

**Attribution and User-Agent.** No rule found.

**Endpoint.**
`GET https://api.barcodelookup.com/v3/products?barcode=9780140157376&formatted=y&key=<key>`.
"The API accepts a UPC, EAN, ISBN, or GTIN through its barcode parameter."
([API docs](https://www.barcodelookup.com/api-documentation))

### 4. Go-UPC

The Go-UPC pages were fetched directly. The API endpoint was called live
without a key on 2026-11-05.

**Terms.** Last updated March 19, 2025. Section 5 forbids: "Resell,
redistribute, or make publicly available the Services or Product Data
obtained through our services." "Go-UPC retains full ownership of the
Services and Product Data". "Upon termination, please delete all previously
received Product Data." No rule forbids caching during the subscription.
"These Terms and Conditions do not grant you permission to use Third Party
Content." Free accounts: "you may only create one unless we provide explicit
written consent otherwise", and "you're not allowed to use bots, spiders,
scripts, or other automated tools to access a free account." No clause about
open source or multiple end users.
([terms](https://go-upc.com/terms-and-conditions/))

**API key.** Required on all tiers, including the trial. A live call without
a key returned HTTP 401 with `{"message":"Access to the API requires an API
key. ..."}`. Two methods: `Authorization: Bearer <key>` header or `key=<key>`
query parameter.
([docs](https://go-upc.com/docs))

**Rate limits.** "a maximum of 2 requests per second." HTTP 429: "You have
exceeded your plan's quota or issued too many requests within a short period
of time." No rate limit headers are documented.
([docs](https://go-upc.com/docs),
[terms](https://go-upc.com/terms-and-conditions/))

**Price.** The currency is not named. Developer 74.95 per month, 5,000
requests. Startup 245 per month, 45,000 requests. Enterprise 795 per month,
450,000 requests. Trial key: 150 requests per month, manual approval, with a
form that asks for name, email, and company name or URL. Overage fees apply
above the quota.
([plans](https://go-upc.com/plans/api),
[trial](https://go-upc.com/plans/api/trial))

**Fields.** `code`, `codeType`, `barcodeUrl`, `inferred`, `product.name`,
`product.description`, `product.imageUrl` (one URL), `product.brand`,
`product.specs` (key-value pairs), `product.category` (Google Shopping
taxonomy), `product.categoryPath`, `product.ingredients.text`,
`product.upc`, `product.ean`. No quantity or size field. A size can appear
inside `product.specs`.
([docs](https://go-upc.com/docs))

**Coverage.** The API page says "Access to over 500-million products" and
"Coverage across all industries, including many niche sectors." The homepage
says "over 1-billion unique items, spanning six continents". The two pages
give different counts.
([API page](https://go-upc.com/api),
[home](https://go-upc.com/))

**Data licence.** Proprietary. Full ownership claimed. No redistribution.

**Attribution and User-Agent.** No rule found.

**Endpoint.** `GET https://go-upc.com/api/v1/code/{code}`. Example:
`curl --header "Authorization: Bearer <api_key>" https://go-upc.com/api/v1/code/781138811156`.
([docs](https://go-upc.com/docs))

**Formats.** "Any valid UPC (GTIN-12), EAN (GTIN-13), EAN-8 (GTIN-8) or
GTIN-14 code." `inferred` is true when the API filled in missing digits. The
example returns `"code": "0781138811156"` for the input `781138811156`. A bad
format returns HTTP 400.
([docs](https://go-upc.com/docs))

### 5. EAN-Search

The EAN-Search pages were fetched directly. The API endpoint was called live
without a token on 2026-11-05. The full API manual is only available inside
a paid account.

**Terms.** "You may not use bots, scrapers or any automated means to access
the website or collect data from it, except through the tools we provide to
registered users, such as our API and MCP server." "Most of the product data
on the website is supplied by third-party providers." The terms say nothing
about caching, storing, redistributing, open source, or multiple end users.
The API page lists "download selected parts of our database" as a feature.
([terms](https://www.ean-search.org/tos.html),
[API page](https://www.ean-search.org/ean-database-api.html))

**API key.** Required on all tiers. A live call without a token returned
HTTP 401 with `[{ "error" : "Invalid token" }]`. The token is the `token`
query parameter. No header method is documented.
([API intro](https://www.ean-search.org/ean-api-intro.html))

**Rate limits.** Monthly query quotas only. "no daily limit" for Pro and
higher. Per-second or per-minute limits: not confirmed. The status code on
quota exhaustion: not confirmed. The official Java library has a
`creditsRemaining` method.
([API page](https://www.ean-search.org/ean-database-api.html),
[java-eansearch](https://github.com/eansearch/java-eansearch))

**Price.** Currency EUR. Trial: 100 queries per month, 1 EUR the first
month, then 9 EUR per month, one trial per person. Pro: 5,000 queries per
month, 19 EUR. Bronze: 50,000, 39 EUR. Silver: 150,000, 99 EUR. Gold:
300,000, 149 EUR. 10 percent discount for yearly payment. No free tier.
([API page](https://www.ean-search.org/ean-database-api.html))

**Fields.** The barcode lookup returns an array with `ean`, `name`,
`categoryId`, `categoryName`, `googleCategoryId`, `issuingCountry`. No
brand, quantity, size, or image field.
([API intro](https://www.ean-search.org/ean-api-intro.html))

**Coverage.** "Currently the database includes 1.3 billion different EANs."
No category breakdown. The database is a name index.
([home](https://www.ean-search.org/))

**Data licence.** No licence statement. Data is "supplied by third-party
providers".

**Attribution and User-Agent.** No rule found.

**Endpoint.**
`GET https://api.ean-search.org/api?token=<token>&op=barcode-lookup&format=json&ean=5099750442227`.
Operations: `barcode-lookup`, `product-search`, `barcode-prefix-search`.
Parameters: `ean` (13 digits), `upc` (12 digits), `isbn` (10 digits),
`format`, `language`, `page`. EAN-8 and GTIN-14: not confirmed. A checksum
verify operation exists.
([API intro](https://www.ean-search.org/ean-api-intro.html))

### 6. The Grocy v4.7.1 external lookup plugin interface

The facts come from the Grocy source at the tag `v4.7.1`. The earlier
research on the Grocy stock workflows describes the user flow around the
plugin. This section records the interface. No Grocy source code is copied
here.

**What a plugin is.** A plugin is one PHP class in one file. The file name is
the class name. Grocy loads it with `require_once` into the Grocy process.
The setting `STOCK_BARCODE_LOOKUP_PLUGIN` in `config-dist.php` names the
file without `.php`. The default is `OpenFoodFactsBarcodeLookupPlugin`. An
empty value disables the feature. Grocy looks first in `data/plugins/` (user
plugins), then in `plugins/` (built-in plugins). A missing plugin or an
empty setting throws an exception.
([config-dist.php](https://github.com/grocy/grocy/blob/v4.7.1/config-dist.php),
[StockService.php](https://github.com/grocy/grocy/blob/v4.7.1/services/StockService.php),
[README](https://github.com/grocy/grocy/blob/v4.7.1/README.md))

**The contract.** The class extends `Grocy\Helpers\BaseBarcodeLookupPlugin`.
It must define the constant `PLUGIN_NAME`, and implement the protected
method `ExecuteLookup($barcode)`. The base class constructor is final and
receives three arrays: the active locations, the active quantity units, and
the user settings of the current user. The plugin reads them as
`$this->Locations`, `$this->QuantityUnits`, and `$this->UserSettings`.
([BaseBarcodeLookupPlugin.php](https://github.com/grocy/grocy/blob/v4.7.1/helpers/BaseBarcodeLookupPlugin.php),
[DemoBarcodeLookupPlugin.php](https://github.com/grocy/grocy/blob/v4.7.1/plugins/DemoBarcodeLookupPlugin.php))

`ExecuteLookup` returns `null` when nothing is found, or an associative array
of the Grocy product record. The base class checks the result. These keys are
required:

| Key | Meaning | Check |
| --- | --- | --- |
| `name` | The product name. | Present. |
| `location_id` | A Grocy location id. | Must match an active location. |
| `qu_id_purchase` | A Grocy quantity unit id for the purchase unit. | Must match an active quantity unit. |
| `qu_id_stock` | A Grocy quantity unit id for the stock unit. | Must match an active quantity unit. |
| `__qu_factor_purchase_to_stock` | The factor from the purchase unit to the stock unit. | Not empty and numeric. |
| `__barcode` | The barcode to store. "Can contain multiple barcodes separated by comma." | Present. |

The optional key `__image_url` holds an `http(s)` URL or a `data:image`
base64 URI. Any other key of the `products` table can be added. The keys with
two leading underscores are "virtual": Grocy strips them before it writes the
product row. A result that is not an associative array, or that lacks a
required key, or that references an unknown id, throws an exception. The
plugin can also throw an exception with its own message.
([BaseBarcodeLookupPlugin.php](https://github.com/grocy/grocy/blob/v4.7.1/helpers/BaseBarcodeLookupPlugin.php),
[DemoBarcodeLookupPlugin.php](https://github.com/grocy/grocy/blob/v4.7.1/plugins/DemoBarcodeLookupPlugin.php),
[OpenAPI schema](https://github.com/grocy/grocy/blob/v4.7.1/grocy.openapi.json))

**The API operation.** `GET /api/stock/barcodes/external-lookup/{barcode}`
with the optional query parameter `add` (boolean, default false). The caller
needs the permission `MASTER_DATA_EDIT`. The response is the plugin result
as JSON, or `null` when nothing is found. A plugin exception gives HTTP 400
with the message. With `add=true`, the server refuses when a product with
the same name exists. Otherwise it downloads the image with the User-Agent
`Grocy/<version> (https://grocy.info)`, saves it as `<barcode>.<ext>` in
the product pictures folder, creates the product row, creates the product
barcode row, creates a product conversion from the purchase unit to the
stock unit when the two unit ids differ, and adds the new product `id` to
the response. An image download error is ignored.
([StockApiController.php](https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/StockApiController.php),
[StockService.php](https://github.com/grocy/grocy/blob/v4.7.1/services/StockService.php),
[routes.php](https://github.com/grocy/grocy/blob/v4.7.1/routes.php),
[OpenAPI](https://github.com/grocy/grocy/blob/v4.7.1/grocy.openapi.json))

The OpenAPI schema `ExternalBarcodeLookupResponse` lists `name`,
`location_id`, `qu_id_purchase`, `qu_id_stock`, `qu_factor_purchase_to_stock`,
`barcode`, and `id`. The server returns the virtual keys with their two
leading underscores, so the live response keys differ from the schema names
for the factor and the barcode.
([OpenAPI](https://github.com/grocy/grocy/blob/v4.7.1/grocy.openapi.json),
[StockService.php](https://github.com/grocy/grocy/blob/v4.7.1/services/StockService.php))

**The UI.** The stock controller asks the service for `PLUGIN_NAME` and
passes it to the product picker. When a name is present, the unknown barcode
dialog shows the button "E External barcode lookup" with the plugin name as a
badge. The button calls the API with `add=true`. A `null` result shows the
toast "Nothing was found for the given barcode". A product result opens the
product edit form of the new product.
([StockController.php](https://github.com/grocy/grocy/blob/v4.7.1/controllers/StockController.php),
[productpicker.blade.php](https://github.com/grocy/grocy/blob/v4.7.1/views/components/productpicker.blade.php),
[productpicker.js](https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/components/productpicker.js))

**The built-in Open Food Facts plugin.** `PLUGIN_NAME` is "Open Food Facts".
It strips every non-digit from the barcode. It calls
`https://world.openfoodfacts.org/api/v2/product/<digits>?fields=product_name,image_url,product_name_<lc>`
where `<lc>` is the first two letters of `GROCY_LOCALE`. The User-Agent is
`GrocyOpenFoodFactsBarcodeLookupPlugin/1.0 (https://grocy.info)`. A HTTP 404
or `status != 1` gives `null`. The name is `product_name_<lc>` when present,
else `product_name`. The location is the user setting
`product_presets_location_id`, else the first active location. The purchase
unit and the stock unit are both the user setting `product_presets_qu_id`,
else the first active quantity unit. The factor is always 1. The image is
`image_url`. The plugin does not read `brands`, `quantity`,
`product_quantity`, or `categories`. It does not query the three sister
projects.
([OpenFoodFactsBarcodeLookupPlugin.php](https://github.com/grocy/grocy/blob/v4.7.1/plugins/OpenFoodFactsBarcodeLookupPlugin.php))

**Grocy Next and the plugin.** The legacy API serves the Grocy v4.7.1 paths
under `/api`. The external lookup operation is one of them. The interface is
a PHP class loaded into the PHP process. A Node process cannot load it. The
interface has no network form.
([grocy-openapi.json](../reference/grocy-openapi.json),
[architecture](../architecture.md))

### 7. The field map to the short product form

The map issue says: "A new product from the review is a short form filled
from the lookup result, with the barcode attached."
([#61](https://github.com/the-dev-abides/grocy-next/issues/61))
The ticket names the four fields of the short form: name, stock unit,
purchase unit, product group. This table records which lookup field can fill
each one.

| Short form field | Open Facts (all four) | UPCitemdb | Barcode Lookup | Go-UPC | EAN-Search | Grocy v4.7.1 plugin result |
| --- | --- | --- | --- | --- | --- | --- |
| Name | `product_name`, `product_name_<lc>` | `title` | `title` | `product.name` | `name` | `name` |
| Stock unit | None. `product_quantity_unit` gives `g` or `ml` for the package. | None. | None. | None. | None. | `qu_id_stock` (a Grocy id, from the user preset) |
| Purchase unit | None. See the units note below. | None. | None. | None. | None. | `qu_id_purchase` (a Grocy id, from the user preset) |
| Product group | None. `categories_tags` gives taxonomy tags such as `en:hazelnut-spreads`. | None. `category` is a Google product taxonomy path. | None. `category` is a Google product taxonomy path. | None. `product.category` and `product.categoryPath` are Google Shopping taxonomy. | None. `categoryName` and `googleCategoryId`. | None. |
| Barcode (attached) | `code`, normalised by the server | `ean`, `upc`, `gtin` | `barcode_number` | `code`, `product.upc`, `product.ean` | `ean` | `__barcode` |
| Extra: brand | `brands` | `brand` | `brand` | `product.brand` | None. | None. |
| Extra: image | `image_front_url`, `selected_images` | `images[]` | `images[]` | `product.imageUrl` | None. | `__image_url` |

**What a lookup gives for the units.** No service returns a stock unit, a
purchase unit, or a conversion factor. A Grocy product group is a household
category; no service knows the household's product groups.

- The Open Facts services return the package size as `quantity` (free text,
  for example `"400.0 g"`), and as `product_quantity` with
  `product_quantity_unit` (a number and `g` or `ml`). The size is the content
  of one package. It is not a count of packages.
  ([product_base.yaml](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/schemas/product_base.yaml))
- UPCitemdb returns `size` for clothing and shoes, and `weight` and
  `dimension` as free text.
  ([responses](https://www.upcitemdb.com/wp/docs/main/development/responses/))
- Barcode Lookup returns `size` (not confirmed).
- Go-UPC returns no size field. A size can appear as a key-value pair in
  `product.specs`.
  ([docs](https://go-upc.com/docs))
- EAN-Search returns no size field.
  ([API intro](https://www.ean-search.org/ean-api-intro.html))
- The Grocy plugin result carries Grocy unit ids. The built-in Open Food
  Facts plugin fills both with the user preset `product_presets_qu_id`, or
  the first active unit, and sets the factor to 1. It does not read the Open
  Food Facts quantity fields.
  ([OpenFoodFactsBarcodeLookupPlugin.php](https://github.com/grocy/grocy/blob/v4.7.1/plugins/OpenFoodFactsBarcodeLookupPlugin.php))

## Comparison table

| | Open Food Facts | Open Beauty Facts | Open Pet Food Facts | Open Products Facts | UPCitemdb | Barcode Lookup | Go-UPC | EAN-Search |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Terms for a self-hosted open source app | 1 API call = 1 real scan. Commercial use allowed. Share-alike on derivative databases. | Same (from source file) | Same | Same | Licence "solely for Customer's operations". Silent on caching, redistribution, open source. | Non-sublicensable. Delete cached data on termination. (not confirmed) | No redistribution, no public availability. Delete data on termination. | Silent on caching, redistribution, open source. |
| API key | No | No | No | No | FREE: no. DEV, PRO: `user_key` header. | Yes, `key` parameter (not confirmed) | Yes, Bearer header or `key` parameter | Yes, `token` parameter |
| Rate limit | 15 reads/min/IP, 10 searches/min/IP, HTTP 503 on global limit | Same | Same | Same | FREE: 100/day/IP, 6 lookups/min. DEV: 20,000/day. PRO: 150,000/day. HTTP 429. | 100/min, monthly quota, HTTP 429 (not confirmed) | 2/s, monthly quota, HTTP 429 | Monthly quota. Per-minute limit not confirmed. |
| Price | Free | Free (not confirmed) | Free | Free | FREE $0; DEV $99/month; PRO $699/month | $99 to $949/month (not confirmed) | 74.95 to 795/month; trial 150/month | 19 to 149 EUR/month; trial 1 EUR then 9 EUR |
| Name | `product_name` | same | same | same | `title` | `title` | `product.name` | `name` |
| Brand | `brands` | same | same | same | `brand` | `brand` | `product.brand` | None |
| Quantity | `quantity`, `product_quantity`, `product_quantity_unit` | same | same | same | `size` (clothing), `weight`, `dimension` | `size` | `product.specs` | None |
| Image | `image_front_url`, `selected_images` | same | same | same | `images[]` | `images[]` | `product.imageUrl` | None |
| Category | `categories_tags` (own taxonomy) | same | same | same | `category` (Google) | `category` (Google) | `product.category` (Google) | `categoryName`, `googleCategoryId` |
| Non-food coverage | Food only, 4.9 M | Cosmetics; count not confirmed | Pet food, 15.7 K | Other products, 48.7 K | "All" categories, 767 M UPC + 27 M ISBN | "All" categories, "millions" | "All industries", 500 M or 1 B | Name index, 1.3 B EANs |
| Data licence | ODbL, DbCL, images CC BY-SA | Same | Same | Same | Proprietary | Proprietary, third-party images | Proprietary | None stated, third-party data |
| User-Agent rule | Required: `AppName/Version (ContactEmail)` | Same | Same | Same | None | None | None | None |
| Attribution rule | Name, licence, and link in the app UI | Same | Same | Same | None | None | None | None |
| Barcode normalisation | Server pads to 8 or 13 digits | Same | Same | Same | Keyed by EAN-13 | Not confirmed | `inferred` flag, pads to 13 | `ean` 13, `upc` 12, `isbn` 10 |

## Sources

Open Facts:

- API introduction: <https://openfoodfacts.github.io/openfoodfacts-server/api/>
- Cheat sheet: <https://openfoodfacts.github.io/openfoodfacts-server/api/ref-cheatsheet/>
- Tutorial: <https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/>
- Barcode normalisation: <https://openfoodfacts.github.io/openfoodfacts-server/api/ref-barcode-normalization/>
- Sister projects tutorial: <https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/scanning-cosmetics-pet-food-and-other-products/>
- Licence tutorial: <https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/>
- OpenAPI v2: <https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/api.yaml>
- OpenAPI v3: <https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/api-v3.yaml>
- Schema files: <https://github.com/openfoodfacts/openfoodfacts-server/tree/main/docs/api/ref/schemas>
- Terms of use: <https://world.openfoodfacts.org/terms-of-use>
- Data and licence: <https://world.openfoodfacts.org/data>, <https://world.openpetfoodfacts.org/data>, <https://world.openproductsfacts.org/data>
- Open Beauty Facts data page source file: <https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-web/main/lang/obf/en/texts/data.html>
- FAQ: <https://world.openfoodfacts.org/faq>
- Homepages: <https://world.openfoodfacts.org/>, <https://world.openpetfoodfacts.org/>, <https://world.openproductsfacts.org/>

UPCitemdb:

- Developer home and prices: <https://devs.upcitemdb.com/>
- Terms: <https://devs.upcitemdb.com/termsofservice>
- Plans and endpoints: <https://www.upcitemdb.com/wp/docs/main/development/plan/>
- Getting started: <https://www.upcitemdb.com/wp/docs/main/development/getting-started/>
- Rate limits: <https://www.upcitemdb.com/wp/docs/main/development/api-rate-limits/>
- Responses: <https://www.upcitemdb.com/wp/docs/main/development/responses/>
- Homepage: <https://www.upcitemdb.com/>

Barcode Lookup (search snippets only; the site returned HTTP 403):

- API: <https://www.barcodelookup.com/api>
- API documentation: <https://www.barcodelookup.com/api-documentation>
- Terms: <https://www.barcodelookup.com/terms-and-conditions>
- Symbology: <https://www.barcodelookup.com/symbology>

Go-UPC:

- Docs: <https://go-upc.com/docs>
- Plans: <https://go-upc.com/plans/api>, <https://go-upc.com/plans/api/trial>
- Terms: <https://go-upc.com/terms-and-conditions/>
- API page and homepage: <https://go-upc.com/api>, <https://go-upc.com/>

EAN-Search:

- API page and prices: <https://www.ean-search.org/ean-database-api.html>
- API introduction: <https://www.ean-search.org/ean-api-intro.html>
- Terms: <https://www.ean-search.org/tos.html>
- Homepage: <https://www.ean-search.org/>
- Java library: <https://github.com/eansearch/java-eansearch>

Grocy v4.7.1:

- Plugin base class: <https://github.com/grocy/grocy/blob/v4.7.1/helpers/BaseBarcodeLookupPlugin.php>
- Demo plugin: <https://github.com/grocy/grocy/blob/v4.7.1/plugins/DemoBarcodeLookupPlugin.php>
- Open Food Facts plugin: <https://github.com/grocy/grocy/blob/v4.7.1/plugins/OpenFoodFactsBarcodeLookupPlugin.php>
- Stock service: <https://github.com/grocy/grocy/blob/v4.7.1/services/StockService.php>
- API controller: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/StockApiController.php>
- Stock controller: <https://github.com/grocy/grocy/blob/v4.7.1/controllers/StockController.php>
- Product picker: <https://github.com/grocy/grocy/blob/v4.7.1/public/viewjs/components/productpicker.js>, <https://github.com/grocy/grocy/blob/v4.7.1/views/components/productpicker.blade.php>
- Routes: <https://github.com/grocy/grocy/blob/v4.7.1/routes.php>
- Config: <https://github.com/grocy/grocy/blob/v4.7.1/config-dist.php>
- OpenAPI: <https://github.com/grocy/grocy/blob/v4.7.1/grocy.openapi.json>
- README: <https://github.com/grocy/grocy/blob/v4.7.1/README.md>
- Earlier research on the stock workflows and the barcode flow: branch `research/grocy-stock-workflows`, file `docs/research/grocy-stock-workflows.md`.
