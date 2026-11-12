import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';

import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { createHash, timingSafeEqual } from 'node:crypto';

const BEARER_PREFIX = 'Bearer ';

// The hash gives the two values one length, so the comparison takes the same
// time for a token of any length.
function digestOf(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

// The guard of the MCP endpoint. It compares the `Authorization: Bearer`
// header with the token in constant time. A missing header or a wrong token
// is the unauthorized problem with the status 401. The guard never logs the
// header or the token.
export class McpTokenGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(token: string) {
    this.expected = digestOf(`${BEARER_PREFIX}${token}`);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<IncomingMessage>();
    const header = request.headers.authorization ?? '';
    if (!timingSafeEqual(digestOf(header), this.expected)) {
      throw new ProblemException(
        PROBLEM_TYPES.unauthorized,
        'The request must carry the MCP token as a bearer token in the Authorization header.',
      );
    }
    return true;
  }
}
