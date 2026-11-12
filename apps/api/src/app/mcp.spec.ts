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
// The same token with the last character changed.
const TOKEN_OFF_BY_ONE = '0123456789abcdef0123456789abcdee';

// A tools/list request of the 2025 era, which needs no handshake.
const LIST_TOOLS_REQUEST = JSON.stringify({
  id: 1,
  jsonrpc: '2.0',
  method: 'tools/list',
});

const REFUSED_HEADERS: { case: string; headers: Record<string, string> }[] = [
  { case: 'no header', headers: {} },
  { case: 'a wrong header', headers: { authorization: 'Basic dXNlcjpwYXNz' } },
  {
    case: 'a token that is different by one character',
    headers: { authorization: `Bearer ${TOKEN_OFF_BY_ONE}` },
  },
];

vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
  process.env['MCP_TOKEN'] = '0123456789abcdef0123456789abcdef';
});

describe('the MCP server at its HTTP boundary', () => {
  let app: INestApplication;
  let endpoint: URL;
  let client: Client;

  function transportWith(headers: Record<string, string>) {
    return new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    endpoint = new URL('/api/v2/mcp', await app.getUrl());
    client = new Client({ name: 'mcp-test', version: '0.0.1' });
    await client.connect(transportWith({ authorization: `Bearer ${TOKEN}` }));
  });

  afterAll(async () => {
    await client.close();
    await app.close();
    delete process.env['MCP_TOKEN'];
  });

  it('lists list_products with a description and an input schema', async () => {
    const { tools } = await client.listTools();

    const listProducts = tools.find((tool) => tool.name === 'list_products');
    expect(listProducts?.description).toEqual(expect.any(String));
    expect(listProducts?.inputSchema).toMatchObject({ type: 'object' });
  });

  // The list is the body of the Next API product list: the six active
  // products of the fixture household in the `items` envelope. The text
  // content carries the same body as JSON.
  it('returns the product list of the Grocy mock as structured content', async () => {
    const result = await client.callTool({
      arguments: {},
      name: 'list_products',
    });

    const productList = {
      items: [
        { description: null, id: 1, name: 'Coca-Cola Original 330 ml' },
        { description: null, id: 2, name: 'Philadelphia Original 150 g' },
        { description: null, id: 3, name: 'Nutella Biscuits 304 g' },
        { description: null, id: 5, name: 'Yoghurt' },
        { description: null, id: 6, name: 'Yoghurt Strawberry 150 g' },
        { description: null, id: 7, name: 'Rice jar' },
      ],
    };
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(productList);
    expect(result.content).toEqual([
      { text: JSON.stringify(productList), type: 'text' },
    ]);
  });

  it.each(REFUSED_HEADERS)(
    'answers a request with $case with an unauthorized problem',
    async ({ headers }) => {
      const response = await fetch(endpoint, {
        body: LIST_TOOLS_REQUEST,
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
          ...headers,
        },
        method: 'POST',
      });

      expect(response.status).toBe(401);
      expect(response.headers.get('content-type')).toBe(
        'application/problem+json',
      );
      expect(await response.json()).toMatchObject({
        instance: '/api/v2/mcp',
        status: 401,
        type: '/problems/unauthorized',
      });
    },
  );

  it.each(REFUSED_HEADERS)(
    'does not let a client with $case list the tools',
    async ({ headers }) => {
      const refusedClient = new Client({ name: 'mcp-test', version: '0.0.1' });

      await expect(
        (async () => {
          await refusedClient.connect(transportWith(headers));
          return refusedClient.listTools();
        })(),
      ).rejects.toThrow();
      await refusedClient.close();
    },
  );

  // The endpoint is not a Next API operation, so the OpenAPI document leaves
  // it out.
  it('leaves the MCP endpoint out of the OpenAPI document', async () => {
    const response = await fetch(new URL('/api/v2/openapi.json', endpoint));

    const document = (await response.json()) as { paths: object };
    expect(Object.keys(document.paths)).not.toContain('/api/v2/mcp');
  });
});
