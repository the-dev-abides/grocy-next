import type { CanActivate, ExecutionContext } from '@nestjs/common';

import { Injectable } from '@nestjs/common';

import type { HttpRequest } from './request.ts';

import { PROBLEM_TYPES, ProblemException } from './problems.ts';
import { hasBody, mediaTypeOf } from './request.ts';

const JSON_MEDIA_TYPE = 'application/json';

// A request body of the Next API is JSON. A body with another content type,
// or with none, is refused with a 415 problem before any handler runs. A
// request without a body passes. The guard checks HTTP requests only. An MCP
// tool call has no HTTP body of its own: the guard has already checked the
// request to the MCP endpoint.
@Injectable()
export class JsonBodyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }
    const request = context.switchToHttp().getRequest<HttpRequest>();
    if (hasBody(request) && mediaTypeOf(request) !== JSON_MEDIA_TYPE) {
      throw new ProblemException(
        PROBLEM_TYPES.notJson,
        `The body must be JSON with the content type ${JSON_MEDIA_TYPE}.`,
      );
    }
    return true;
  }
}
