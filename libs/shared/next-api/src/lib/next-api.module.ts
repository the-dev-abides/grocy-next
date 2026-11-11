import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor } from 'nestjs-zod';

import { JsonBodyGuard } from './json-body.guard.ts';
import { ProblemFilter } from './problem-filter.ts';
import { NextApiValidationPipe } from './validation-pipe.ts';

// The conventions of ADR 0014 as one module. The API app imports it one
// time, and every controller of every domain library gets the JSON body
// check, the Zod validation, the Zod response serialization, and the
// Problem Details error body.
@Module({
  providers: [
    { provide: APP_GUARD, useClass: JsonBodyGuard },
    { provide: APP_PIPE, useClass: NextApiValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: ProblemFilter },
  ],
})
export class NextApiModule {}
