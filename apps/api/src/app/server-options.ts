// The HTTP server reads this variable. `PORT` is the port that the process
// listens on. Unset means 3000. The end-to-end tests set another port, so a
// test never touches the API of a developer.
const PORT = 'PORT';

const DEFAULT_PORT = 3000;

export type EnvironmentVariables = Record<string, string | undefined>;

export interface ServerOptions {
  port: number;
}

// This function reads the variable and builds the server options. It throws
// on a wrong value, so the process exits with a clear message before the
// process listens. With no argument, it reads the process environment. This
// file is the one place that reads it.
export function readServerOptions(
  variables: EnvironmentVariables = process.env,
): ServerOptions {
  const port = variables[PORT];
  if (port === undefined || port === '') {
    return { port: DEFAULT_PORT };
  }
  if (!/^\d+$/.test(port)) {
    throw new Error(`${PORT} must be a number. The value is "${port}".`);
  }
  return { port: Number(port) };
}
