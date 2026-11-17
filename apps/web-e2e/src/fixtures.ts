import { test as base } from '@playwright/test';
import { randomInt } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { lockFolder } from './lock-options.js';

// The test function of every spec file.
// It adds the file lock and the page error check.
//
// Page error check: an uncaught error on the page is a bug, also when the
// screen still looks right. Thus each uncaught page error fails the test. The
// failure message has the test title and the text of each error.
//
// All browser projects run against one API and one Grocy mock. A spec file owns
// its notes and its codes. The tests of one browser share them in the way that
// the file describes. The other browsers run the same file with the same notes
// and codes. Two browsers can run a test of one file at the same time. Then
// each test removes, filters, or merges into the rows of the other. Thus a test
// waits while a test of the same file runs in another browser. The tests of one
// browser still run in parallel.

// The time between two looks at the lock folder of the file.
const RETRY_MS = 50;

// A test can wait for some tests of the other browsers. The wait has a time
// limit of its own, so it does not use the time of the test.
const LOCK_TIMEOUT_MS = 300_000;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// The marks of the tests of the other browsers that hold the file now.
function otherMarks(folder: string, browser: string): string[] {
  return readdirSync(folder).filter((mark) => !mark.startsWith(`${browser}.`));
}

// A test puts its mark in the folder of the file. Then it looks for the mark of
// another browser. Two tests can put their marks at the same time. Then both
// see the other mark, take their marks back, and try again after a random
// time. Thus never two browsers hold one file.
async function lockFile(folder: string, mark: string, browser: string) {
  for (;;) {
    if (otherMarks(folder, browser).length === 0) {
      writeFileSync(path.join(folder, mark), '');
      if (otherMarks(folder, browser).length === 0) {
        return;
      }
      rmSync(path.join(folder, mark));
    }
    await pause(RETRY_MS + randomInt(RETRY_MS));
  }
}

export const test = base.extend<{ fileLock: string }>({
  // The value of the fixture is the mark of the test: the browser and the
  // test id.
  fileLock: [
    async ({ browserName }, use, testInfo) => {
      const file = path.relative(testInfo.project.testDir, testInfo.file);
      const folder = path.join(lockFolder(), file.replaceAll(path.sep, '__'));
      mkdirSync(folder, { recursive: true });
      const mark = `${browserName}.${testInfo.testId}`;
      await lockFile(folder, mark, browserName);
      await use(mark);
      rmSync(path.join(folder, mark), { force: true });
    },
    { auto: true, timeout: LOCK_TIMEOUT_MS },
  ],
  page: async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.stack ?? error.message);
    });
    await use(page);
    if (errors.length > 0) {
      throw new Error(
        `The page of the test "${testInfo.title}" had ${String(errors.length)} uncaught errors:\n${errors.join('\n---\n')}`,
      );
    }
  },
});

export { expect } from '@playwright/test';
