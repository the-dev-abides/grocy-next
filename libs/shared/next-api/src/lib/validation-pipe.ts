import type { ArgumentMetadata } from '@nestjs/common';

import { createZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';

import { validationProblemOf } from './validation.ts';

// `nestjs-zod` calls this function with the error that the Zod parse threw.
function toException(error: unknown): Error {
  if (error instanceof z.ZodError) {
    return validationProblemOf(error);
  }
  return new Error('The Zod parse threw an error that is not a Zod error.', {
    cause: error,
  });
}

type ValidationPipeClass = ReturnType<typeof createZodValidationPipe>;

const validationPipeClass: ValidationPipeClass = createZodValidationPipe({
  createValidationException: toException,
  strictSchemaDeclaration: true,
});

// The validation pipe of the Next API. It validates every body, query, and
// path parameter against its Zod DTO. A failure is a validation problem. A
// parameter without a Zod DTO is a programming error, so the pipe refuses
// it with a 500 instead of letting the value through unchecked. The pipe
// lets two kinds of parameter through. A custom parameter carries no request
// data. A parameter that the method does not declare has no type, and the
// method does not read it. An MCP tool method gets its input as a body
// parameter and its context as a custom parameter. A tool method that reads
// its input types it with a Zod DTO.
export class NextApiValidationPipe extends validationPipeClass {
  override transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const isUnchecked =
      metadata.type === 'custom' || metadata.metatype === undefined;
    return isUnchecked ? value : super.transform(value, metadata);
  }
}
