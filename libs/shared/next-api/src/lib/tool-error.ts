import type { CallToolResult } from '@modelcontextprotocol/server';

import type { Problem } from './problems.ts';

import { PROBLEM_TYPES } from './problems.ts';

// The error result of an MCP tool, as ADR 0012 decided: `isError` and the
// error body as JSON text. For a Next API error, the body is the problem
// body, the `grocy` field included. For another `HttpException`, the body is
// the body that the HTTP surface sends. The MCP server adds nothing and hides
// nothing. The success result needs no helper: the MCP adapter puts the
// return value of the tool method in `structuredContent` and the same value
// as JSON text in `content`.
export function toolErrorOf(body: object | string): CallToolResult {
  return {
    content: [{ text: JSON.stringify(body), type: 'text' }],
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
