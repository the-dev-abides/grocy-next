import type { IncomingMessage } from 'node:http';

// The request as Express hands it to a guard and to a filter. Express adds
// `originalUrl`, the URL before any router cut a prefix from `url`.
export interface HttpRequest extends IncomingMessage {
  originalUrl?: string;
}

function urlOf(request: HttpRequest): string {
  return request.originalUrl ?? request.url ?? '/';
}

export function hasBody(request: HttpRequest): boolean {
  const length = request.headers['content-length'];
  return (
    (length !== undefined && length !== '0') ||
    request.headers['transfer-encoding'] !== undefined
  );
}

export function mediaTypeOf(request: HttpRequest): string {
  const contentType = request.headers['content-type'] ?? '';
  return contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

// The request path without the query, as the `instance` of a problem.
export function pathOf(request: HttpRequest): string {
  const { pathname } = new URL(urlOf(request), 'http://localhost');
  return pathname;
}

export function queryOf(request: HttpRequest): Record<string, string> {
  const { searchParams } = new URL(urlOf(request), 'http://localhost');
  return Object.fromEntries(searchParams);
}
