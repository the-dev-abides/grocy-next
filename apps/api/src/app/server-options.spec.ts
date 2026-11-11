import { readServerOptions } from './server-options.ts';

describe('the server options', () => {
  it('listens on port 3000 when PORT is not set', () => {
    expect(readServerOptions({})).toEqual({ port: 3000 });
  });

  it('listens on the port in PORT', () => {
    expect(readServerOptions({ PORT: '13000' })).toEqual({ port: 13_000 });
  });

  it('rejects a PORT that is not a number', () => {
    expect(() => readServerOptions({ PORT: 'http' })).toThrow(
      'PORT must be a number. The value is "http".',
    );
  });
});
