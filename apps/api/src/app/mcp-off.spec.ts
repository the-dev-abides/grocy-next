import type { LoggerService } from '@nestjs/common';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.ts';
import { configureApp } from './configure-app.ts';

// The test runs on SQLite in memory with no MCP token. The MCP module reads
// the token when the imports load, so this block runs first.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
  delete process.env['MCP_TOKEN'];
});

// This logger keeps the lines of the start, so the test can read the startup
// log.
class StartupLog implements LoggerService {
  readonly lines: string[] = [];

  error(message: unknown): void {
    this.lines.push(String(message));
  }
  log(message: unknown): void {
    this.lines.push(String(message));
  }
  warn(message: unknown): void {
    this.lines.push(String(message));
  }
}

describe('the MCP server with MCP_TOKEN not set', () => {
  let app: INestApplication;
  let baseUrl: string;
  const startupLog = new StartupLog();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .setLogger(startupLog)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers the MCP endpoint like any unknown path under /api', async () => {
    const response = await fetch(`${baseUrl}/api/v2/mcp`, {
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'tools/list' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      instance: '/api/v2/mcp',
      type: '/problems/not-found',
    });
  });

  it('says in the startup log that the MCP server is off', () => {
    expect(startupLog.lines).toContain(
      'The MCP server is off. Set MCP_TOKEN to turn it on.',
    );
  });
});
