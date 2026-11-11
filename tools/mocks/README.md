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
validation.

Each Grocy call has one static response file under `grocy/responses`, matched
on the path and the query. A booking returns a fixed stock log row and
changes nothing. The mock holds no state.

A request that no resource matches gets the example from the specification,
not an error. A response that shows Grocy demo data, such as the product
"Cookies", means that the resource is missing.

### The fixture household

| Entity         | Rows                                                                                 |
| -------------- | ------------------------------------------------------------------------------------ |
| Locations      | 1 Fridge, 2 Pantry, 3 Freezer, 4 Garage (inactive)                                   |
| Store          | 1 Supermarket                                                                        |
| Product groups | 1 Dairy, 2 Snacks                                                                    |
| Quantity units | 1 Can, 2 Pack                                                                        |
| Products       | 1 Coca-Cola Original 330 ml, 2 Philadelphia Original 150 g, 3 Nutella Biscuits 304 g |

| Product | Product barcode | Stock unit | Stock | Location | Product group |
| ------- | --------------- | ---------- | ----- | -------- | ------------- |
| 1       | 5449000000996   | Can        | 6     | Fridge   | none          |
| 2       | 7622300441937   | Pack       | 2     | Fridge   | Dairy         |
| 3       | 8000500310427   | Pack       | 1     | Pantry   | Snacks        |

The product barcode 5449000000996 has the last price 0.85. The product
barcode 8000500310427 has the amount 2, so a scan of it carries a product
barcode amount. Product 1 has a
second product barcode, 0049000006346: the UPC-A code 049000006346 of the
can in its 13-digit form with a leading zero. A typed 12-digit code against
that product barcode tests the code forms rule of ADR 0011.

The unknown code is 3017620422003, Nutella 400 g. No product barcode has it.

The Garage is the one inactive row of the fixture household. The master data
lists of the Next API filter with `query[]=active=1`, so the location list
with the filter holds three rows and the list without it holds four.

### To add a Grocy call

1. Write the response file under `grocy/responses`. Copy the shape from a
   real Grocy 4.7.1 answer. Grocy returns numbers as JSON numbers.
2. Add one resource to `grocy/grocy-config.yaml` with the path, the method,
   and the query or the path parameter value that selects the file.
3. Start the mock by hand and call the resource with `curl`. Send the header
   `GROCY-API-KEY` and, for a body, `Content-Type: application/json`.

## The Open Food Facts mock

The mock answers `GET /api/v3/product/{code}` for the four fixture codes with
the live records of Open Food Facts, stored one time under
`open-food-facts/responses`. Every other code gets the failure answer of Open
Food Facts with status 404. The match is on the path only.

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
