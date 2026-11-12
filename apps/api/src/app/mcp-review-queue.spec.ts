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

interface PendingScanBody {
  id: number;
  [field: string]: unknown;
}

// The review queue tools at the MCP endpoint. Each tool returns the body of
// the Next API operation that it mirrors.
describe('the review queue tools of the MCP server', () => {
  let app: INestApplication;
  let baseUrl: string;
  let client: Client;

  // A row that the Next API creates, for a test that needs a row first.
  async function createWithApi(body: unknown): Promise<PendingScanBody> {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    return (await response.json()) as PendingScanBody;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    baseUrl = await app.getUrl();
    client = new Client({ name: 'mcp-test', version: '0.0.1' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL('/api/v2/mcp', baseUrl), {
        requestInit: { headers: { authorization: `Bearer ${TOKEN}` } },
      }),
    );
  });

  // Every test starts with an empty queue, so a row of one test never
  // shows in the result of another test.
  beforeEach(async () => {
    const response = await fetch(`${baseUrl}/api/v2/pending-scans`);
    const { items } = (await response.json()) as { items: PendingScanBody[] };
    for (const item of items) {
      await fetch(`${baseUrl}/api/v2/pending-scans/${String(item.id)}`, {
        method: 'DELETE',
      });
    }
  });

  afterAll(async () => {
    await client.close();
    await app.close();
    delete process.env['MCP_TOKEN'];
  });

  it('lists the pending scans as structured content with an items list', async () => {
    const created = await createWithApi({
      bookingType: 'purchase',
      productId: 1,
    });

    const result = await client.callTool({
      arguments: {},
      name: 'list_pending_scans',
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ items: [created] });
    expect(result.content).toEqual([
      { text: JSON.stringify({ items: [created] }), type: 'text' },
    ]);
  });
});
