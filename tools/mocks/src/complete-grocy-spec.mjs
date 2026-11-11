// Grocy writes five entity enums and the server address into its OpenAPI
// document when it serves the document. The copy in the reference folder
// refers to the five schemas, but does not hold them, so a validator cannot
// load the copy. This script writes the copy with the five schemas, the
// server path, and one body fix into the Grocy mock folder. The Grocy mock
// starts after this script. The Grocy source of the five schemas and the
// server path is the method `DocumentationSpec` in
// `controllers/Api/OpenApiController.php`. The script has no dependency. Run
// it with Node from any folder.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.join(import.meta.dirname, '..', '..', '..');
const REFERENCE_FILE = path.join(
  REPO_ROOT,
  'docs',
  'reference',
  'grocy-openapi.json',
);
const OUTPUT_FILE = path.join(
  import.meta.dirname,
  '..',
  'grocy',
  'grocy-openapi.json',
);

/**
@param {unknown} value
@returns {value is Record<string, unknown>}
*/
function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

/**
@param {unknown} value
@returns {value is string[]}
*/
function isStringList(value) {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

/**
The `enum` list of one string schema.
@param {Record<string, unknown>} schemas
@param {string} name
@returns {string[]}
*/
function enumOf(schemas, name) {
  const schema = schemas[name];
  if (!isRecord(schema) || !isStringList(schema['enum'])) {
    throw new Error(
      `The schema "${name}" with an enum list is missing in ${REFERENCE_FILE}.`,
    );
  }
  return schema['enum'];
}

/**
One string schema with a sorted enum list and no repeated member. Grocy
starts each list from the schema `StringEnumTemplate`, whose one member is
the empty string, so the empty string stays in every list.
@param {string[]} template
@param {string[]} members
@returns {{ type: 'string', enum: string[] }}
*/
function enumSchema(template, members) {
  const unique = new Set(template);
  for (const member of members) {
    unique.add(member);
  }
  const sortedMembers = [...unique];
  sortedMembers.sort((left, right) => left.localeCompare(right));
  return { enum: sortedMembers, type: 'string' };
}

/**
@param {unknown} document
@returns {Record<string, unknown>}
*/
function schemasOf(document) {
  if (
    !isRecord(document) ||
    !isRecord(document['components']) ||
    !isRecord(document['components']['schemas'])
  ) {
    throw new Error(`${REFERENCE_FILE} has no components.schemas object.`);
  }
  return document['components']['schemas'];
}

/**
Sets the server address to the Grocy API base path, as Grocy does. The
reference copy holds the placeholder `xxx`. The validator of the mock reads
the path of the server address, so a request to `/api/objects/products`
matches the path `/objects/products` of the document.
@param {unknown} document
@returns {void}
*/
function setServerPath(document) {
  if (!isRecord(document)) {
    throw new Error(`${REFERENCE_FILE} is not a JSON object.`);
  }
  document['servers'] = [{ url: '/api' }];
}

/**
Adds the five schemas as Grocy builds them. The fixture household has no user
entity, so the list with user entities equals the exposed entity list. Grocy
adds `stock` to the editable list with user entities by hand, because the
userfields of a stock entry are editable.
@param {Record<string, unknown>} schemas
@returns {void}
*/
function addEntitySchemas(schemas) {
  const template = enumOf(schemas, 'StringEnumTemplate');
  const exposed = enumOf(schemas, 'ExposedEntity');
  const notEditable = enumOf(schemas, 'ExposedEntityNoEdit');
  const notDeletable = enumOf(schemas, 'ExposedEntityNoDelete');
  const notListable = enumOf(schemas, 'ExposedEntityNoListing');
  const editable = exposed.filter((entity) => !notEditable.includes(entity));
  schemas['ExposedEntity_IncludingUserEntities'] = enumSchema(
    template,
    exposed,
  );
  schemas['ExposedEntity_NotIncludingNotEditable'] = enumSchema(
    template,
    editable,
  );
  schemas['ExposedEntity_IncludingUserEntities_NotIncludingNotEditable'] =
    enumSchema(template, [...editable, 'stock']);
  schemas['ExposedEntity_NotIncludingNotDeletable'] = enumSchema(
    template,
    exposed.filter((entity) => !notDeletable.includes(entity)),
  );
  schemas['ExposedEntity_NotIncludingNotListable'] = enumSchema(
    template,
    exposed.filter((entity) => !notListable.includes(entity)),
  );
}

/**
The JSON body schema of one operation, or null when the path or the method is missing.
@param {Record<string, unknown>} paths
@param {string} pathName
@param {string} method
@returns {Record<string, unknown> | null}
*/
function bodySchemaOf(paths, pathName, method) {
  const pathItem = paths[pathName];
  const operation = isRecord(pathItem) ? pathItem[method] : undefined;
  const requestBody = isRecord(operation)
    ? operation['requestBody']
    : undefined;
  const content = isRecord(requestBody) ? requestBody['content'] : undefined;
  const json = isRecord(content) ? content['application/json'] : undefined;
  const schema = isRecord(json) ? json['schema'] : undefined;
  return isRecord(schema) ? schema : null;
}

/**
Changes the `oneOf` of the generic object create body and the generic object
update body to an `anyOf`. No entity shape of the Grocy document names a
required field or forbids an unknown field. Thus every body matches all nine
shapes, and a `oneOf` can never pass. Grocy itself checks the body against
the one entity of the path. With the `anyOf`, the validator still checks
that the body is an object with the field types of the shapes.
@param {unknown} document
@returns {void}
*/
function relaxObjectBodies(document) {
  if (!isRecord(document) || !isRecord(document['paths'])) {
    throw new Error(`${REFERENCE_FILE} has no paths object.`);
  }
  const paths = document['paths'];
  const operations = [
    { method: 'post', pathName: '/objects/{entity}' },
    { method: 'put', pathName: '/objects/{entity}/{objectId}' },
  ];
  for (const { method, pathName } of operations) {
    const schema = bodySchemaOf(paths, pathName, method);
    if (schema === null || !Array.isArray(schema['oneOf'])) {
      throw new Error(
        `The ${method} body of ${pathName} with a oneOf list is missing in ${REFERENCE_FILE}.`,
      );
    }
    schema['anyOf'] = schema['oneOf'];
    delete schema['oneOf'];
  }
}

/**
@type {unknown}
*/
const document = JSON.parse(readFileSync(REFERENCE_FILE, 'utf8'));
addEntitySchemas(schemasOf(document));
setServerPath(document);
relaxObjectBodies(document);
writeFileSync(OUTPUT_FILE, `${JSON.stringify(document, null, 2)}\n`);
