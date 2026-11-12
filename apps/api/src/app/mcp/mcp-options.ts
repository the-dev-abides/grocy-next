// The MCP server reads this variable. `MCP_TOKEN` is the one bearer token of
// the MCP endpoint, as ADR 0012 decided. Unset or empty means that the MCP
// server is off.
export const MCP_TOKEN = 'MCP_TOKEN';

const MIN_TOKEN_LENGTH = 32;

export type EnvironmentVariables = Record<string, string | undefined>;

export interface McpOptions {
  token: string;
}

// This function reads the variable and builds the MCP options. It returns
// null when the variable is not set. It throws on a token that is too short,
// so the process exits with a clear message before the process listens. The
// message never holds the token. With no argument, it reads the process
// environment. This file is the one place that reads it.
export function readMcpOptions(
  variables: EnvironmentVariables = process.env,
): McpOptions | null {
  const token = variables[MCP_TOKEN];
  if (token === undefined || token === '') {
    return null;
  }
  if (token.length < MIN_TOKEN_LENGTH) {
    throw new Error(
      `${MCP_TOKEN} must have ${String(MIN_TOKEN_LENGTH)} characters or more. ` +
        `The value has ${String(token.length)} characters.`,
    );
  }
  return { token };
}
