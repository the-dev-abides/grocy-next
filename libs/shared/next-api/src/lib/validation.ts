import { z } from 'zod';

import type { FieldError } from './problems.ts';

import { PROBLEM_TYPES, ProblemException } from './problems.ts';

const UNKNOWN_FIELD = 'unknown field';

function pathOf(path: readonly PropertyKey[]): string {
  return path.map(String).join('.');
}

function unknownFieldAt(path: readonly PropertyKey[]): FieldError {
  return { message: UNKNOWN_FIELD, path: pathOf(path) };
}

// One `{path, message}` entry per failure. A strict object reports every
// unknown key in one issue, and each key becomes one entry of its own.
function fieldErrorsOf(error: z.ZodError): FieldError[] {
  return error.issues.flatMap((issue): FieldError[] => {
    return issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => unknownFieldAt([...issue.path, key]))
      : [{ message: issue.message, path: pathOf(issue.path) }];
  });
}

// The validation problem of a Zod error. The pipe and the query guard both
// build their problem here, so every validation failure has one shape.
export function validationProblemOf(error: z.ZodError): ProblemException {
  return new ProblemException(
    PROBLEM_TYPES.validation,
    'The body, the query, or the path fails the schema.',
    fieldErrorsOf(error),
  );
}
