import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.ts';
import { buildOpenApiDocument, configureApp } from './configure-app.ts';

// The test runs on SQLite in memory with the MCP server on. The MCP module
// reads the token when the imports load, so this block runs first.
const TOKEN = '0123456789abcdef0123456789abcdef';

vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
  process.env['MCP_TOKEN'] = '0123456789abcdef0123456789abcdef';
});

// The health paths have no tool. This list is the one exclusion.
const HEALTH_PATHS = new Set([
  '/api/v2/health/live',
  '/api/v2/health/ready',
  '/api/v2/health/startup',
]);

// The Next API operation of each tool, as the method and the path. Add a row
// here when you add a tool.
const TOOL_OPERATIONS = new Map([
  ['create_booking', 'POST /api/v2/bookings'],
  ['create_pending_scan', 'POST /api/v2/pending-scans'],
  ['create_product', 'POST /api/v2/products'],
  ['delete_pending_scan', 'DELETE /api/v2/pending-scans/{id}'],
  ['get_pending_scan', 'GET /api/v2/pending-scans/{id}'],
  ['get_product', 'GET /api/v2/products/{id}'],
  ['list_locations', 'GET /api/v2/locations'],
  ['list_pending_scans', 'GET /api/v2/pending-scans'],
  ['list_product_groups', 'GET /api/v2/product-groups'],
  ['list_products', 'GET /api/v2/products'],
  ['list_quantity_unit_conversions', 'GET /api/v2/quantity-unit-conversions'],
  ['list_quantity_units', 'GET /api/v2/quantity-units'],
  ['list_stores', 'GET /api/v2/stores'],
  ['update_pending_scan', 'PATCH /api/v2/pending-scans/{id}'],
]);

// The operations of one path item, as the method and the path.
function operationsOf(path: string, pathItem: object): string[] {
  return Object.keys(pathItem).map(
    (method) => `${method.toUpperCase()} ${path}`,
  );
}

// The roadmap rule: every Next API operation has an MCP tool. The test
// covers the whole OpenAPI document, not the operations of one milestone.
describe('the MCP tools and the Next API operations', () => {
  let app: INestApplication;
  let client: Client;
  let operations: string[];
  let toolNames: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);

    // The running app builds the document with the same function.
    const document = buildOpenApiDocument(app);
    const paths = Object.entries(document.paths).filter(
      ([path]) => !HEALTH_PATHS.has(path),
    );
    operations = paths.flatMap(([path, pathItem]) =>
      operationsOf(path, pathItem),
    );

    const endpoint = new URL('/api/v2/mcp', await app.getUrl());
    client = new Client({ name: 'mcp-test', version: '0.0.1' });
    await client.connect(
      new StreamableHTTPClientTransport(endpoint, {
        requestInit: { headers: { authorization: `Bearer ${TOKEN}` } },
      }),
    );
    const { tools } = await client.listTools();
    toolNames = tools.map((tool) => tool.name);
  });

  afterAll(async () => {
    await client.close();
    await app.close();
    delete process.env['MCP_TOKEN'];
  });

  // The result lists the operations with no registered tool.
  it('has a tool for every operation', () => {
    const covered = new Set(
      toolNames.flatMap((name) => TOOL_OPERATIONS.get(name) ?? []),
    );

    const missing = operations.filter((operation) => !covered.has(operation));

    expect(missing).toEqual([]);
  });

  // The result lists the tools with no operation in the document.
  it('has an operation for every tool', () => {
    const documented = new Set(operations);

    const extra = toolNames.filter((name) => {
      const operation = TOOL_OPERATIONS.get(name);
      return operation === undefined || !documented.has(operation);
    });

    expect(extra).toEqual([]);
  });
});
