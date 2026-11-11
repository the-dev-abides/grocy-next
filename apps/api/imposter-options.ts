import { accessSync, constants, statSync } from 'node:fs';
import path from 'node:path';

// The Vitest global setup reads this variable. `PATH` holds the folders that
// the shell searches for a command. The Imposter CLI binary `imposter` is in
// one of them. The development documentation names how to install it. This
// file is the one place in the API tests that reads the variable.
const PATH = 'PATH';
const IMPOSTER_CLI = 'imposter';

export type EnvironmentVariables = Record<string, string | undefined>;

// This function returns the full path of the Imposter CLI binary, so the
// global setup starts it by its full path. It throws when no folder of the
// search path holds the binary, so the test run stops with a clear message.
export function findImposterCli(
  variables: EnvironmentVariables = process.env,
): string {
  const folders = (variables[PATH] ?? '').split(path.delimiter);
  const binary = folders
    .map((folder) => path.join(folder, IMPOSTER_CLI))
    .find((candidate) => isExecutableFile(candidate));
  if (binary === undefined) {
    throw new Error(
      `The Imposter CLI "${IMPOSTER_CLI}" is not on the ${PATH}. ` +
        `The development documentation names how to install it.`,
    );
  }
  return binary;
}

function isExecutableFile(file: string): boolean {
  try {
    accessSync(file, constants.X_OK);
    return statSync(file).isFile();
  } catch {
    return false;
  }
}
