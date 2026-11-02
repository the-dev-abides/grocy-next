# Reference

This directory holds the Grocy OpenAPI spec. It holds no Grocy source code.

## grocy-openapi.json

A copy of `grocy.openapi.json` from the Grocy repo at tag `v4.7.1`. Grocy is
MIT. The copyright notice is in the Grocy repo.

The `info.version` field says `xxx`. Grocy writes the real version into this
field at build time. The file in the Grocy repo keeps the placeholder.

To refresh the copy, run this command from the repo root:

```sh
curl -sSfL -o docs/reference/grocy-openapi.json \
  https://raw.githubusercontent.com/grocy/grocy/v4.7.1/grocy.openapi.json
```
