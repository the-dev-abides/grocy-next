# shared-next-api

The conventions of the Next API, as ADR 0014 decided. The library holds the
problem types, the `ProblemException` that every Next API error throws, the
exception filter that writes RFC 9457 Problem Details with the content type
`application/problem+json`, the Zod validation pipe with the "unknown field"
message, the `NoQuery` decorator for an operation that takes no query field,
the JSON body guard that answers `415`, and the OpenAPI decorator for the
error responses. The API app imports `NextApiModule` one time. A
domain library imports the problem types and the decorator.

The library reads no environment variable.
