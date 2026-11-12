import type { CanActivate, ExecutionContext } from '@nestjs/common';

import { Injectable, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import type { HttpRequest } from './request.ts';

import { queryOf } from './request.ts';
import { validationProblemOf } from './validation.ts';

// The query schema of an operation that takes no query field.
const noQuerySchema = z.strictObject({});

@Injectable()
class NoQueryGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const result = noQuerySchema.safeParse(queryOf(request));
    if (!result.success) {
      throw validationProblemOf(result.error);
    }
    return true;
  }
}

// This decorator marks an operation that takes no query field. The
// validation pipe checks only a parameter with a Zod DTO, and an operation
// with no query parameter has none. The guard refuses every query field
// with a validation problem and the message "unknown field".
export function NoQuery(): ClassDecorator & MethodDecorator {
  return UseGuards(NoQueryGuard);
}
