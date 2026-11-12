import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory with the MCP server on. The MCP module
// reads the token when the imports load, so this block runs first. The Grocy
// variables point at the Grocy mock that the Vitest global setup starts.
const TOKEN = '0123456789abcdef0123456789abcdef';

vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
  process.env['MCP_TOKEN'] = '0123456789abcdef0123456789abcdef';
});

// The tools of the product read, the product create, and the master data
// lists.
const PRODUCT_TOOLS = [
  'get_product',
  'create_product',
  'list_locations',
  'list_stores',
  'list_product_groups',
  'list_quantity_units',
  'list_quantity_unit_conversions',
];

// The product tools and the master data tools at the MCP endpoint. Each tool
// returns the body of the Next API operation that it mirrors.
describe('the product tools and the master data tools of the MCP server', () => {
  let app: INestApplication;
  let client: Client;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    const endpoint = new URL('/api/v2/mcp', await app.getUrl());
    client = new Client({ name: 'mcp-test', version: '0.0.1' });
    await client.connect(
      new StreamableHTTPClientTransport(endpoint, {
        requestInit: { headers: { authorization: `Bearer ${TOKEN}` } },
      }),
    );
  });

  afterAll(async () => {
    await client.close();
    await app.close();
    delete process.env['MCP_TOKEN'];
  });

  it('lists the product tools and the master data tools with a description and an input schema each', async () => {
    const { tools } = await client.listTools();

    const listed = tools.filter((tool) => PRODUCT_TOOLS.includes(tool.name));
    expect(listed.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(PRODUCT_TOOLS),
    );
    expect(listed).toHaveLength(PRODUCT_TOOLS.length);
    for (const tool of listed) {
      expect(tool.description).toEqual(expect.any(String));
      expect(tool.inputSchema).toMatchObject({ type: 'object' });
    }
  });

  // Product 3 is the Nutella Biscuits in the Pantry, with the Pack as both
  // units and the conversion 1 Box = 6 Packs. The body is the body of the
  // product read of the Next API.
  it('reads one product with its stock and its stock entries', async () => {
    const result = await client.callTool({
      arguments: { id: 3 },
      name: 'get_product',
    });

    const product = {
      conversions: [
        { factor: 1, fromQuantityUnitId: 2, toQuantityUnitId: 2 },
        { factor: 6, fromQuantityUnitId: 3, toQuantityUnitId: 2 },
        { factor: 1 / 6, fromQuantityUnitId: 2, toQuantityUnitId: 3 },
        { factor: 1, fromQuantityUnitId: 3, toQuantityUnitId: 3 },
      ],
      defaultDueDays: 0,
      description: null,
      hasPicture: false,
      id: 3,
      isParent: false,
      locationId: 2,
      minStockAmount: 0,
      name: 'Nutella Biscuits 304 g',
      productGroupId: 2,
      purchaseToStockFactor: 1,
      purchaseUnitId: 2,
      stockAmount: 1,
      stockEntries: [
        {
          amount: 1,
          dueDate: '2027-01-15',
          id: 17,
          locationId: 2,
          open: false,
          purchasedDate: '2026-01-10',
        },
      ],
      stockUnitId: 2,
      tareWeight: null,
    };
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(product);
    expect(result.content).toEqual([
      { text: JSON.stringify(product), type: 'text' },
    ]);
  });

  it('answers a read of an unknown id with the not-found problem', async () => {
    const result = await client.callTool({
      arguments: { id: 999 },
      name: 'get_product',
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        text: expect.any(String),
        type: 'text',
      },
    ]);
    const [content] = result.content as { text: string }[];
    expect(JSON.parse(content?.text ?? '')).toEqual({
      detail: 'No product has the id 999.',
      instance: '/api/v2/mcp',
      status: 404,
      title: 'Not found',
      type: '/problems/not-found',
    });
  });
});
