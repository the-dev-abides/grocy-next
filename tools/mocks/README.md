# The Imposter mocks

This folder holds the two Imposter mocks of ADR 0015: the Grocy mock and the
Open Food Facts mock. Imposter is the one stand-in for every external
service. The end-to-end tests and the API tests start the two mocks from this
folder. No test needs a real Grocy and no test needs the network.

## The Imposter CLI

The Imposter CLI starts a mock. The file `imposter-project.yaml` in each mock
folder pins the engine version and the CLI version. The engine is the native
engine, one binary with no runtime. The CLI downloads the engine on the first
start into `~/.imposter`. The development documentation names how to install
the CLI. CI downloads the pinned CLI with `.github/actions/install-imposter`
and checks its checksum.

To start one mock by hand, run this command from the repo root:

```sh
node tools/mocks/src/complete-grocy-spec.mjs
imposter up tools/mocks/grocy --port 18080
```

Stop it with `Ctrl+C`. The Open Food Facts mock starts the same way from
`tools/mocks/open-food-facts` and needs no script.

## The Grocy mock

The specification is the Grocy OpenAPI file in `docs/reference`. Grocy writes
five entity enums and the server path into the file when it serves it. The
copy in the reference folder refers to the five enums but does not hold them,
so a validator cannot load the copy. The script
`src/complete-grocy-spec.mjs` writes the copy with the five enums and the
server path to `grocy/grocy-openapi.json`. Git ignores that file. The test
setups run the script before the mock starts.

Request validation is on for every request. A request that does not match
the specification gets status 400 with the validation errors in the body. The
comment at the top of `grocy/grocy-config.yaml` lists the four places where
the specification differs from the Grocy code, and why none of them fails the
validation. It also names the one place that fails the validation: the body
of the generic object create and the generic object update is a `oneOf` over
nine entity shapes with no required field, so the script changes it to an
`anyOf` in the copy.

Each Grocy call has one static response file under `grocy/responses`, matched
on the path, the query, or a value in the body. The mock holds no state. A
purchase returns one stock log row with the product of the path, the amount
of the request, and the price of the request when the request has one. The
other fields of the row are fixed. The two purchase files are templates, not
JSON files, because the placeholders are not JSON. A purchase with the
inactive location 4 and no due date gets the Grocy error `Location does not
exist`, as Grocy answers it. An inventory with a new amount equal to the
fixture stock of the product gets the Grocy error `The new amount cannot
equal the current stock amount`, as Grocy answers it, so a test of the
no-change accept sees that the Next API did not call Grocy. For the tare
weight product 7 the fixture stock is the own stock 500 plus the tare weight
250, so the new amount 750 gets that Grocy error. An inventory with
the inactive location 4 and no due date gets the same Grocy error as a
purchase. The mock holds no stock, so it cannot book the difference. An
inventory of product 1 returns a decrease: two stock log rows with negative
amounts, as Grocy answers a count of 3 on the stock 6. An inventory of every
other product returns an increase of 3, as Grocy answers a count of 4 on the
stock 1 of product 3: one stock log row with the product of the path and,
when the request has all of the due date, the location, the price, the
store, and the note, those values of the request. A request without one of
them gets the Grocy defaults of product 3. A product barcode create answers the id 5 for every
code except 5000112637922, which gets the Grocy error of a code that
another product already has. A product picture upload and a product update
answer 204. The product details never show the new product barcode or the
picture, because the mock holds no state.

A product create answers the id 4 for every name except the name of product
1, which gets the Grocy error of a name that another product already has.
The create captures the name, the location, the two units, the minimum
stock amount, and the default due days of the request into the Imposter
store `product`, and sets the factor in that store to 1. The product
conversions of product 4 hold the one row that the Grocy trigger creates,
from the purchase unit to the stock unit, with the id 7. An update of a
conversion row captures the factor into the store. The details read of
product 4 is a template that reads the store, so a test sees the fields of
the create and the factor of the update. The description and the product
group are not captured, because a field that the request left out renders
as `<nil>`, so the details of product 4 answer null for both.

The resolved conversions of product 4 hold one row, from the purchase unit
to the stock unit with the factor of the store. When the two units are
equal, that row is the row from the stock unit to itself with factor 1. The
template cannot leave a row out, so the product has no other row.

The stock entries of a product come from the Grocy view `stock_next_use`,
which sorts them in the consume order: the stock entries at the default
consume location of the product first, then the open stock entries, then
the earliest due date, then the earliest purchase date. Each stock entries
file holds its rows in that order. Product 1 has five stock entries in two
locations, and the Fridge is its default consume location, so each rule of
the order moves one row. The first two rows are the two stock entries that
the inventory decrease of product 1 takes from. An unknown product gets an
empty list, as Grocy answers it.

A request that no resource matches gets the example from the specification,
not an error. A response that shows Grocy demo data, such as the product
"Cookies", means that the resource is missing.

### The fixture household

| Entity         | Rows                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Locations      | 1 Fridge, 2 Pantry, 3 Freezer, 4 Garage (inactive)                                                                                      |
| Store          | 1 Supermarket                                                                                                                           |
| Product groups | 1 Dairy, 2 Snacks                                                                                                                       |
| Quantity units | 1 Can, 2 Pack, 3 Box, 4 Gram                                                                                                            |
| Products       | 1 Coca-Cola Original 330 ml, 2 Philadelphia Original 150 g, 3 Nutella Biscuits 304 g, 5 Yoghurt, 6 Yoghurt Strawberry 150 g, 7 Rice jar |

| Product | Product barcode | Stock unit | Stock | Location | Product group | Note                                                  |
| ------- | --------------- | ---------- | ----- | -------- | ------------- | ----------------------------------------------------- |
| 1       | 5449000000996   | Can        | 6     | Fridge   | none          | The default consume location is the Fridge.           |
| 2       | 7622300441937   | Pack       | 2     | Fridge   | Dairy         |                                                       |
| 3       | 8000500310427   | Pack       | 1     | Pantry   | Snacks        |                                                       |
| 5       | none            | Pack       | 0     | Fridge   | Dairy         | The parent product of product 6. No own stock.        |
| 6       | none            | Pack       | 3     | Fridge   | Dairy         | The child of product 5.                               |
| 7       | none            | Gram       | 500   | Pantry   | none          | Tare weight handling is on. The tare weight is 250 g. |

Product 4 is the product that the product create answers. It is not in the
product list, because the mock holds no state.

The product barcode 5449000000996 has the last price 0.85. The product
barcode 8000500310427 has the amount 2, so a scan of it carries a product
barcode amount. Product 1 has a
second product barcode, 0049000006346: the UPC-A code 049000006346 of the
can in its 13-digit form with a leading zero. A typed 12-digit code against
that product barcode tests the code forms rule of ADR 0011.

The stock entries of each product, in the Grocy consume order:

| Product | Stock entry | Amount | Location | Open | Due date   | Purchase date |
| ------- | ----------- | ------ | -------- | ---- | ---------- | ------------- |
| 1       | 11          | 2      | Fridge   | no   | 2026-12-15 | 2026-10-20    |
| 1       | 12          | 1      | Fridge   | no   | 2027-01-01 | 2026-11-01    |
| 1       | 14          | 1      | Pantry   | yes  | 2027-02-01 | 2026-11-05    |
| 1       | 13          | 1      | Pantry   | no   | 2026-12-01 | 2026-10-01    |
| 1       | 15          | 1      | Pantry   | no   | 2026-12-01 | 2026-10-25    |
| 2       | 16          | 2      | Fridge   | no   | 2026-12-01 | 2026-01-10    |
| 3       | 17          | 1      | Pantry   | no   | 2027-01-15 | 2026-01-10    |
| 6       | 20          | 3      | Fridge   | no   | 2026-11-25 | 2026-11-08    |
| 7       | 21          | 500    | Pantry   | no   | 2027-06-30 | 2026-10-15    |

Products 4 and 5 have no stock entry.

The unknown code is 3017620422003, Nutella 400 g. No product barcode has it.

Each product has the resolved conversion from its stock unit to itself with
factor 1. Product 3 also has the conversion 1 Box = 6 Packs, so a Purchase of
it in Boxes converts to the stock unit. Product 1 has no conversion from the
Pack to the Can, so a Purchase of it in Packs has no path to the stock unit.

The Garage is the one inactive row of the fixture household. The master data
lists of the Next API filter with `query[]=active=1`, so the location list
with the filter holds three rows and the list without it holds four.

### To add a Grocy call

1. Write the response file under `grocy/responses`. Copy the shape from a
   real Grocy 4.7.1 answer. Grocy returns numbers as JSON numbers.
2. Add one resource to `grocy/grocy-config.yaml` with the path, the method,
   and the query or the path parameter value that selects the file.
   When a later read must show a value of the request, add a `capture` block
   to the resource that stores the value, and read it in a template with
   `${stores.<store>.<key>}`. The product create shows the form.
3. Start the mock by hand and call the resource with `curl`. Send the header
   `GROCY-API-KEY` and, for a body, `Content-Type: application/json`.

## The Open Food Facts mock

The mock answers `GET /api/v3/product/{code}` for the four fixture codes with
the live records of Open Food Facts, stored one time under
`open-food-facts/responses`. Every other code gets the failure answer of Open
Food Facts with status 404. The match is on the path only.

The mock also serves one small JPEG at the image path of the unknown code,
`/images/products/301/762/042/2003/front_en.879.400.jpg`, and answers 500 at
`/images/products/301/762/042/2003/front_en.failing.400.jpg`. The image URL
in each record names the real image host, so a test that needs the image
points the image URL of the row at the mock.

To refresh one record, run this command from the repo root and format the
file with `pnpm nx format:write`:

```sh
curl -sSfL -o tools/mocks/open-food-facts/responses/product-3017620422003.json \
  'https://world.openfoodfacts.org/api/v3/product/3017620422003?product_type=all&fields=code,product_name,brands,quantity,product_quantity,product_quantity_unit,image_front_url,image_front_small_url,nutriments,nutrition_data_per,serving_size,serving_quantity,serving_quantity_unit,nutriscore_grade,nova_group,ecoscore_grade,ecoscore_score,nutrient_levels,ingredients_text,allergens_tags,traces_tags,additives_tags,ingredients_analysis_tags'
```

## The ports

| Process              | End-to-end tests | API tests   |
| -------------------- | ---------------- | ----------- |
| Grocy mock           | 18080            | 18082       |
| Open Food Facts mock | 18081            | 18083       |
| API                  | 13000            | a free port |
| Web app              | 14200            | none        |

No test port is a development port. The API listens on port 3000 and the web
dev server on port 4200 in development. A test never touches them.
