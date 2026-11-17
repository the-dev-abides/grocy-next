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

// The tools of the review queue operations.
const REVIEW_QUEUE_TOOLS = [
  'list_pending_scans',
  'get_pending_scan',
  'create_pending_scan',
  'update_pending_scan',
  'delete_pending_scan',
  'create_booking',
];

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

  it('lists the review queue tools with a description and an input schema each', async () => {
    const { tools } = await client.listTools();

    const listed = tools.filter((tool) =>
      REVIEW_QUEUE_TOOLS.includes(tool.name),
    );
    expect(listed.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(REVIEW_QUEUE_TOOLS),
    );
    expect(listed).toHaveLength(REVIEW_QUEUE_TOOLS.length);
    for (const tool of listed) {
      expect(tool.description).toEqual(expect.any(String));
      expect(tool.inputSchema).toMatchObject({ type: 'object' });
    }
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

  // The Consume of a product with no code takes the defaults of the Grocy
  // consume form. Product 1 has the Fridge as its default consume location.
  // A second identical call makes a second row.
  it('creates a Consume pending scan with the defaults of the Grocy consume form', async () => {
    const call = {
      arguments: { bookingType: 'consume', productId: 1 },
      name: 'create_pending_scan',
    };

    const first = await client.callTool(call);
    const second = await client.callTool(call);

    expect(first.isError).not.toBe(true);
    const created = first.structuredContent as PendingScanBody;
    expect(created).toMatchObject({
      amount: 1,
      bookingType: 'consume',
      locationId: 1,
      productId: 1,
      quantityUnitId: null,
      spoiled: false,
      stockEntryId: null,
      toLocationId: null,
    });
    expect(await readWithApi(created.id)).toEqual(created);
    expect((second.structuredContent as PendingScanBody).id).not.toBe(
      created.id,
    );
  });

  // The Transfer of a product with no code takes the defaults of the Grocy
  // transfer form: the amount one, the empty unit, and the default location
  // of the product, the Fridge, where product 1 has stock.
  it('creates a Transfer pending scan with the defaults of the Grocy transfer form', async () => {
    const result = await client.callTool({
      arguments: { bookingType: 'transfer', productId: 1, toLocationId: 2 },
      name: 'create_pending_scan',
    });

    expect(result.isError).not.toBe(true);
    const created = result.structuredContent as PendingScanBody;
    expect(created).toMatchObject({
      amount: 1,
      bookingType: 'transfer',
      locationId: 1,
      productId: 1,
      quantityUnitId: null,
      toLocationId: 2,
    });
    expect(await readWithApi(created.id)).toEqual(created);
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

  // The stock entry 69131a2b3c84c is the open can of product 1 at the
  // Pantry. The update sets it, and a later update clears it with null.
  it('sets and clears the stock entry of a Consume pending scan with update_pending_scan', async () => {
    const created = await createWithApi({
      bookingType: 'consume',
      locationId: 2,
      productId: 1,
    });

    const set = await client.callTool({
      arguments: { id: created.id, stockEntryId: '69131a2b3c84c' },
      name: 'update_pending_scan',
    });

    expect(set.isError).not.toBe(true);
    expect(set.structuredContent).toMatchObject({
      id: created.id,
      stockEntryId: '69131a2b3c84c',
    });
    expect(await readWithApi(created.id)).toEqual(set.structuredContent);

    const cleared = await client.callTool({
      arguments: { id: created.id, stockEntryId: null },
      name: 'update_pending_scan',
    });

    expect(cleared.structuredContent).toMatchObject({ stockEntryId: null });
  });

  // The code is in no product barcode of the fixture household, so the row
  // has no product.
  it('refuses the accept of a pending scan with no product with the no-product problem', async () => {
    const created = await createWithApi({
      bookingType: 'purchase',
      code: '4006381333931',
      writeInName: 'Pasta',
    });

    const result = await client.callTool({
      arguments: { pendingScanId: created.id },
      name: 'create_booking',
    });

    expect(result.isError).toBe(true);
    expect(problemOf(result)).toEqual({
      detail: 'The pending scan has no product. Set a product first.',
      instance: '/api/v2/mcp',
      status: 409,
      title: 'The pending scan has no product',
      type: '/problems/no-product',
    });
  });

  // The scan of the can carries the product barcode defaults: one can and
  // the last price 0.85 as a unit price. The Grocy mock returns one stock log
  // row with the product of the path and the amount and the price of the
  // request. The other fields have fixed values.
  it('accepts a Purchase pending scan with a product and returns the booking with the stock log row', async () => {
    const created = await createWithApi({
      bookingType: 'purchase',
      code: '5449000000996',
    });

    const result = await client.callTool({
      arguments: { pendingScanId: created.id },
      name: 'create_booking',
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      bookingType: 'purchase',
      bookings: [
        {
          amount: 1,
          dueDate: '2027-01-01',
          id: 101,
          locationId: 1,
          note: null,
          price: 0.85,
          purchasedDate: '2026-11-10',
          stockEntryId: null,
          storeId: null,
          transactionType: 'purchase',
        },
      ],
      pendingScanId: created.id,
      productId: 1,
      transactionId: '69131a2b3c4e6',
    });
  });

  // The consume takes 1 of the 2 cans of the sealed stock entry 11 at the
  // Fridge, so the accept also opens the rest of it, as ADR 0017 decided. The
  // result lists the consume row, then the open row. The transaction id is
  // the transaction of the consume.
  it('accepts a Consume pending scan and returns the consume and open bookings', async () => {
    const created = await createWithApi({
      amount: 1,
      bookingType: 'consume',
      locationId: 1,
      productId: 1,
    });

    const result = await client.callTool({
      arguments: { pendingScanId: created.id },
      name: 'create_booking',
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      bookings: [
        { amount: -1, stockEntryId: 11, transactionType: 'consume' },
        { amount: 1, stockEntryId: 11, transactionType: 'product-opened' },
      ],
      bookingType: 'consume',
      pendingScanId: created.id,
      productId: 1,
      transactionId: '69131a2b3cf01',
    });
  });

  // The Grocy mock answers the transfer of product 1 with a transfer_from row
  // at the Fridge and a transfer_to row at the Pantry.
  it('accepts a Transfer pending scan and returns the transfer bookings', async () => {
    const created = await createWithApi({
      amount: 1,
      bookingType: 'transfer',
      locationId: 1,
      productId: 1,
      toLocationId: 2,
    });

    const result = await client.callTool({
      arguments: { pendingScanId: created.id },
      name: 'create_booking',
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      bookings: [
        { amount: -1, locationId: 1, transactionType: 'transfer_from' },
        { amount: 1, locationId: 2, transactionType: 'transfer_to' },
      ],
      bookingType: 'transfer',
      pendingScanId: created.id,
      productId: 1,
      transactionId: '69131a2b3cf23',
    });
  });

  // An unknown field gets the validation problem of the Next API, with one
  // entry that names the field.
  it('refuses an unknown field of create_pending_scan with the validation problem', async () => {
    const result = await client.callTool({
      arguments: { bookingType: 'purchase', productId: 1, shop: 'Aldi' },
      name: 'create_pending_scan',
    });

    expect(result.isError).toBe(true);
    const [content] = result.content as { text: string }[];
    expect(JSON.parse(content?.text ?? '')).toEqual({
      detail: 'The body, the query, or the path fails the schema.',
      errors: [{ message: 'unknown field', path: 'shop' }],
      instance: '/api/v2/mcp',
      status: 400,
      title: 'The request fails the schema',
      type: '/problems/validation',
    });
  });
});
