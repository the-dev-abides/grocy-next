// The lookup worker reads these variables. `BARCODE_LOOKUP` turns the online
// barcode lookup on or off. Unset means `on`. Off means the worker queues
// nothing, so a household with no internet access runs the app.
// `OPEN_FACTS_URL` is the base URL of the Open Facts service. Unset means the
// real Open Food Facts host. The tests point it at the Imposter mock.
const BARCODE_LOOKUP = 'BARCODE_LOOKUP';
const OPEN_FACTS_URL = 'OPEN_FACTS_URL';

const SWITCH_VALUES = ['on', 'off'] as const;
type SwitchValue = (typeof SWITCH_VALUES)[number];

const DEFAULT_SWITCH: SwitchValue = 'on';
const DEFAULT_OPEN_FACTS_URL = 'https://world.openfoodfacts.org';

export type EnvironmentVariables = Record<string, string | undefined>;

export interface LookupOptions {
  isOn: boolean;
  openFactsUrl: string;
}

// This function reads the variables and builds the lookup options. It throws on
// a wrong value, so the process exits with a clear message before the process
// listens. With no argument, it reads the process environment. This file is the
// one place that reads it.
export function readLookupOptions(
  variables: EnvironmentVariables = process.env,
): LookupOptions {
  const lookup = valueOf(variables, BARCODE_LOOKUP, DEFAULT_SWITCH);
  if (!isSwitchValue(lookup)) {
    throw new Error(
      `${BARCODE_LOOKUP} must be "on" or "off". The value is "${lookup}".`,
    );
  }
  const openFactsUrl = valueOf(
    variables,
    OPEN_FACTS_URL,
    DEFAULT_OPEN_FACTS_URL,
  );
  if (!URL.canParse(openFactsUrl)) {
    throw new Error(
      `${OPEN_FACTS_URL} must be a URL. The value is "${openFactsUrl}".`,
    );
  }
  return { isOn: lookup === 'on', openFactsUrl };
}

// An unset variable and an empty variable both mean the default.
function valueOf(
  variables: EnvironmentVariables,
  name: string,
  fallback: string,
): string {
  const value = variables[name];
  return value === undefined || value === '' ? fallback : value;
}

function isSwitchValue(value: string): value is SwitchValue {
  return SWITCH_VALUES.some((item) => item === value);
}

// The injection token of the lookup options.
export const LOOKUP_OPTIONS = 'LOOKUP_OPTIONS';
