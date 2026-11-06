# Implied requirements

The human requirements and the assistant requirements list improvements over
Grocy. This document lists the implied requirements: the functions that Grocy
Next must have, that the other two documents do not list.

1. **Parity.** Grocy Next does every function that Grocy v4.7.1 exposes in its
   OpenAPI spec and its UI. The spec is in `docs/reference/grocy-openapi.json`.
2. **Data migration.** A household moves its data from a running Grocy v4.7.1
   instance into Grocy Next with no loss. After the migration, Grocy can be
   switched off.
3. **Legacy API.** Grocy Next serves the Grocy v4.7.1 API at the same paths,
   for backwards compatibility.
4. **Theme.** One visual theme that every screen of Grocy Next uses. No
   requirements document asks for it, and no screen exists without it. The
   first milestone that has screens builds it.
