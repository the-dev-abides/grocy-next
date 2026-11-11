import type { HttpRequest } from './request.ts';

import { pathOf } from './request.ts';

// The `Location` header of a create names the path of the new resource, as
// ADR 0014 decided. The path of the request is the path of the collection,
// so the path of the new resource is the request path and the id.
export const LOCATION_HEADER = 'Location';

export function locationOf(request: HttpRequest, id: number): string {
  return `${pathOf(request)}/${String(id)}`;
}
