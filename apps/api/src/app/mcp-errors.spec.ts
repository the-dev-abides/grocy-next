import type { INestApplication } from '@nestjs/common';

import { NextApiModule } from '@grocy-next/shared-next-api';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { McpModule, Tool } from '@nestjs/mcp';
import { Test } from '@nestjs/testing';

// Two tools that throw an error that is not a Next API problem. The
// `ForbiddenException` body is the NestJS body that the HTTP surface sends.
@Injectable()
class FailingTools {
  @Tool({ description: 'Throw a NestJS 403.', name: 'throw_forbidden' })
  throwForbidden(): never {
    throw new ForbiddenException();
  }

  @Tool({ description: 'Throw a plain error.', name: 'throw_plain_error' })
  throwPlainError(): never {
    throw new Error('A plain error.');
  }
}

describe('the error result of an MCP tool', () => {
  let app: INestApplication;
  let client: Client;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        NextApiModule,
        McpModule.forRoot({ name: 'mcp-errors', path: 'mcp', version: '0' }),
      ],
      providers: [FailingTools],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.listen(0);
    client = new Client({ name: 'mcp-test', version: '0.0.1' });
    const endpoint = new URL('/mcp', await app.getUrl());
    await client.connect(new StreamableHTTPClientTransport(endpoint));
  });

  afterAll(async () => {
    await client.close();
    await app.close();
  });

  it('carries the HTTP body of an HttpException that is not a Next API problem', async () => {
    const result = await client.callTool({
      arguments: {},
      name: 'throw_forbidden',
    });

    expect(result).toEqual({
      content: [
        {
          text: JSON.stringify({ message: 'Forbidden', statusCode: 403 }),
          type: 'text',
        },
      ],
      isError: true,
    });
  });

  it('carries the internal problem for an error that is not an HttpException', async () => {
    const result = await client.callTool({
      arguments: {},
      name: 'throw_plain_error',
    });

    expect(result).toEqual({
      content: [
        {
          text: JSON.stringify({
            instance: '/mcp',
            status: 500,
            title: 'Internal server error',
            type: '/problems/internal',
          }),
          type: 'text',
        },
      ],
      isError: true,
    });
  });
});
