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

// An error result carries the Problem Details body as the JSON text of its
// one content item.
function problemOf(result: { content?: unknown }): unknown {
  const [content] = result.content as { text: string }[];
  return JSON.parse(content?.text ?? '');
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

  async function readWithApi(id: number): Promise<PendingScanBody> {
    const response = await fetch(
      `${baseUrl}/api/v2/pending-scans/${String(id)}`,
    );
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

  // A receipt line: a row with a product and no code. The Next API read of
  // the id gives the stored row.
  it('creates a pending scan with a product and no code and returns the stored row', async () => {
    const result = await client.callTool({
      arguments: { amount: 2, bookingType: 'purchase', productId: 1 },
      name: 'create_pending_scan',
    });

    expect(result.isError).not.toBe(true);
    const created = result.structuredContent as PendingScanBody;
    expect(created).toMatchObject({ code: null, productId: 1 });
    expect(await readWithApi(created.id)).toEqual(created);
    expect(result.content).toEqual([
      { text: JSON.stringify(created), type: 'text' },
    ]);
  });

  // ADR 0010: a pending scan from the MCP server never merges. A row with no
  // code is never a merge target, so the call has a code. The code is the can
  // of product 1, which the scan screen merges into the open row.
  it('creates a second row with a new id for a second identical call', async () => {
    const call = {
      arguments: { bookingType: 'purchase', code: '5449000000996' },
      name: 'create_pending_scan',
    };

    const first = await client.callTool(call);
    const second = await client.callTool(call);

    const firstRow = first.structuredContent as PendingScanBody;
    const secondRow = second.structuredContent as PendingScanBody;
    expect(second.isError).not.toBe(true);
    expect(secondRow.id).not.toBe(firstRow.id);
    expect(secondRow).toMatchObject({ amount: 1 });
    expect(await readWithApi(firstRow.id)).toMatchObject({ amount: 1 });
  });

  it('reads one pending scan by its id', async () => {
    const created = await createWithApi({
      bookingType: 'purchase',
      productId: 1,
    });

    const result = await client.callTool({
      arguments: { id: created.id },
      name: 'get_pending_scan',
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(created);
  });

  // The delete is the reject. The result is the row as it was, and a read
  // of the id after the delete is the not-found problem.
  it('deletes a pending scan, returns the row as it was, and then reads no row', async () => {
    const created = await createWithApi({
      bookingType: 'purchase',
      productId: 1,
    });

    const deleted = await client.callTool({
      arguments: { id: created.id },
      name: 'delete_pending_scan',
    });
    const read = await client.callTool({
      arguments: { id: created.id },
      name: 'get_pending_scan',
    });

    expect(deleted.isError).not.toBe(true);
    expect(deleted.structuredContent).toEqual(created);
    expect(read.isError).toBe(true);
    expect(problemOf(read)).toEqual({
      detail: `No pending scan has the id ${String(created.id)}.`,
      instance: '/api/v2/mcp',
      status: 404,
      title: 'Not found',
      type: '/problems/not-found',
    });
  });

  // The code is in no product barcode of the fixture household, and the
  // write-in name keeps the lookup worker off the row. Product 2 has no
  // product barcode with the code, so the update adds one in Grocy. The
  // Grocy mock answers the id 5 for a new product barcode.
  it('updates a pending scan that sets a product and returns the row with the product barcode id', async () => {
    const created = await createWithApi({
      bookingType: 'purchase',
      code: '4006381333931',
      writeInName: 'Pasta',
    });

    const result = await client.callTool({
      arguments: { id: created.id, productId: 2 },
      name: 'update_pending_scan',
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      id: created.id,
      productBarcodeId: 5,
      productId: 2,
    });
    expect(await readWithApi(created.id)).toEqual(result.structuredContent);
  });
});
