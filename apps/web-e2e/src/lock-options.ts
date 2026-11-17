import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// The folder of the file lock of `fixtures.ts`. The variable carries it from
// the Playwright runner to the workers.
const LOCK_FOLDER_VARIABLE = 'E2E_LOCK_FOLDER';

// The Playwright configuration calls this function. The runner loads the
// configuration first and makes a new folder. The workers load it again and
// keep the folder of the runner, because they get its environment.
export function shareLockFolder(): void {
  process.env[LOCK_FOLDER_VARIABLE] ??= mkdtempSync(
    path.join(tmpdir(), 'grocy-next-e2e-locks-'),
  );
}

export function lockFolder(): string {
  const folder = process.env[LOCK_FOLDER_VARIABLE];
  if (folder === undefined || folder === '') {
    throw new Error('The Playwright configuration sets no lock folder.');
  }
  return folder;
}
