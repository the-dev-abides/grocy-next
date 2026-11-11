# inventory-review-queue

The review queue subdomain of the Inventory domain. The library holds the
pending scan entity, the migration that creates its table, the pending scan
schemas, and the pending scan operations of the Next API: the create, the
list, and the read. The API app imports `ReviewQueueModule` and lists the
entity and the migration in its storage module. The operations follow the
conventions of `shared-next-api`. The library imports the Products library
for the Grocy API client.

The library reads no environment variable.
