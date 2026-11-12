import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.ts';

// The test runs on SQLite in memory with a token of 31 characters, one less
// than the minimum. The MCP module reads the token when the imports load, so
// this block runs first.
vi.hoisted(() => {
  process.env['DB_FILE'] = ':memory:';
  process.env['MCP_TOKEN'] = '0123456789abcdef0123456789abcde';
});

describe('the MCP server with a token of 31 characters', () => {
  afterAll(() => {
    delete process.env['MCP_TOKEN'];
  });

  it('stops the start with a message that names the variable and the minimum', async () => {
    const start = Test.createTestingModule({ imports: [AppModule] }).compile();

    await expect(start).rejects.toThrow(
      'MCP_TOKEN must have 32 characters or more. The value has 31 characters.',
    );
  });
});
