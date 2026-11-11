import type { ChildProcess } from 'node:child_process';

import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

import { findImposterCli } from './imposter-options.ts';

// The Vitest global setup starts the two Imposter mocks of ADR 0015 before
// the API tests and stops them after the tests. The mocks are the two mocks
// of the end-to-end tests, with the same response files. The ports differ
// from the end-to-end ports, so both test runs can run at one time. The
// Imposter CLI is on the PATH. The development documentation names it.
const WORKSPACE_ROOT = path.join(import.meta.dirname, '..', '..');
const MOCKS = path.join(WORKSPACE_ROOT, 'tools', 'mocks');
const SPEC_SCRIPT = path.join(MOCKS, 'src', 'complete-grocy-spec.mjs');

export const GROCY_MOCK_URL = 'http://localhost:18082';
export const OPEN_FACTS_MOCK_URL = 'http://localhost:18083';

const START_TIMEOUT_MS = 60_000;
const POLL_MS = 250;

interface Mock {
  child: ChildProcess;
  hasStopped: boolean;
  output: string[];
  url: string;
}

const mocks: Mock[] = [];

function startMock(imposterCli: string, folder: string, url: string): Mock {
  const { port } = new URL(url);
  const child = spawn(
    imposterCli,
    [
      'up',
      path.join(MOCKS, folder),
      '--port',
      port,
      '--auto-restart=false',
      '--log-level',
      'info',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const mock: Mock = { child, hasStopped: false, output: [], url };
  const keep = (chunk: Buffer): void => {
    mock.output.push(chunk.toString());
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  child.on('error', (error) => {
    mock.output.push(error.message);
    mock.hasStopped = true;
  });
  child.on('exit', () => {
    mock.hasStopped = true;
  });
  return mock;
}

async function isUp(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/system/status`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitUntilUp(mock: Mock): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (mock.hasStopped) {
      throw new Error(
        `The mock at ${mock.url} stopped.\n${mock.output.join('')}`,
      );
    }
    if (await isUp(mock.url)) {
      return;
    }
    await wait(POLL_MS);
  }
  throw new Error(
    `The mock at ${mock.url} did not answer within ${String(START_TIMEOUT_MS)} ms.\n${mock.output.join('')}`,
  );
}

function stopMock(mock: Mock): Promise<void> {
  return new Promise((resolve) => {
    if (mock.hasStopped) {
      resolve();
      return;
    }
    mock.child.once('exit', () => {
      resolve();
    });
    mock.child.kill('SIGTERM');
  });
}

// The mocks start one after the other. On a new machine, the first start
// downloads the native engine. Two starts at one time write and run the
// same engine file, and the operating system then refuses to run it with
// "text file busy". The second start finds the downloaded engine.
async function startMocksOneByOne(imposterCli: string): Promise<void> {
  for (const [folder, url] of [
    ['grocy', GROCY_MOCK_URL],
    ['open-food-facts', OPEN_FACTS_MOCK_URL],
  ] as const) {
    const mock = startMock(imposterCli, folder, url);
    mocks.push(mock);
    await waitUntilUp(mock);
  }
}

export async function setup(): Promise<void> {
  const imposterCli = findImposterCli();
  execFileSync(process.execPath, [SPEC_SCRIPT], { stdio: 'inherit' });
  try {
    await startMocksOneByOne(imposterCli);
  } catch (error) {
    await teardown();
    throw error;
  }
}

export async function teardown(): Promise<void> {
  await Promise.all(mocks.map((mock) => stopMock(mock)));
}
