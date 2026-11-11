import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// The package file of the API is at `apps/api/package.json`. This file is at
// `apps/api/src`, and the API bundle is at `apps/api/dist`. Both folders are
// one level under `apps/api`, in the workspace and in the container image, so
// one relative path finds the package file from the source and from the bundle.
// rspack keeps `import.meta.dirname` as a run-time value.
const PACKAGE_FILE = path.join(import.meta.dirname, '..', 'package.json');

const packageSchema = z.looseObject({ version: z.string() });

// This function reads the version of the API package. The user agent of the
// lookup provider carries it, as ADR 0011 decided.
export function readApiVersion(): string {
  const text = readFileSync(PACKAGE_FILE, 'utf8');
  return packageSchema.parse(JSON.parse(text)).version;
}
