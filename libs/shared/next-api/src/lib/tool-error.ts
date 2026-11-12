import type { CallToolResult } from '@modelcontextprotocol/server';

import type { Problem } from './problems.ts';

import { PROBLEM_TYPES } from './problems.ts';

// The error result of an MCP tool, as ADR 0012 decided: `isError` and the
// Next API problem body as JSON text, the `grocy` field included. The MCP
// server adds nothing and hides nothing. The success result needs no helper:
// the MCP adapter puts the return value of the tool method in
// `structuredContent` and the same value as JSON text in `content`.
export function toolErrorOf(
  problem: Omit<Problem, 'detail'> | Problem,
): CallToolResult {
  return {
    content: [{ text: JSON.stringify(problem), type: 'text' }],
    isError: true,
  };
}

// The body of an error that is not a Next API error. The body has no
// `detail`, so the tool result tells the client nothing of the cause. The
// filter logs the error.
export function internalProblemAt(instance: string): Omit<Problem, 'detail'> {
  const { status, title, type } = PROBLEM_TYPES.internal;
  return { instance, status, title, type };
}
