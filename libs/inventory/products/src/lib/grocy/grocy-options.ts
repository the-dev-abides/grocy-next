// The Grocy API client reads these variables. `GROCY_URL` is the address of
// the Grocy instance, for example `http://grocy:80`. `GROCY_API_KEY` is an
// API key from the Grocy "Manage API keys" page.
const GROCY_URL = 'GROCY_URL';
const GROCY_API_KEY = 'GROCY_API_KEY';

export type EnvironmentVariables = Record<string, string | undefined>;

export interface GrocyOptions {
  url: string;
  apiKey: string;
}

// This function reads the variables and builds the client options. It throws
// on a missing or wrong value, so the process exits with a clear message
// before the process listens. With no argument, it reads the process
// environment. This file is the one place that reads it.
export function readGrocyOptions(
  variables: EnvironmentVariables = process.env,
): GrocyOptions {
  const url = variables[GROCY_URL];
  if (!url) {
    throw new Error(
      `${GROCY_URL} must be set to the address of the Grocy instance, ` +
        `for example "http://grocy:80".`,
    );
  }
  if (!URL.canParse(url)) {
    throw new Error(`${GROCY_URL} must be a URL. The value is "${url}".`);
  }
  const apiKey = variables[GROCY_API_KEY];
  if (!apiKey) {
    throw new Error(
      `${GROCY_API_KEY} must be set to an API key of the Grocy instance.`,
    );
  }
  return { apiKey, url };
}
