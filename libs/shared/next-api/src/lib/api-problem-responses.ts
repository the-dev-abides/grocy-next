import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

import type { ProblemType } from './problems.ts';

import { Problem } from './problems.ts';

const PROBLEM_CONTENT_TYPE = 'application/problem+json';

// This decorator declares the error responses of one operation in the
// OpenAPI document. Each problem type becomes one response with its status,
// its title as the description, and the `Problem` schema under the content
// type `application/problem+json`.
export function ApiProblemResponses(
  ...problemTypes: readonly ProblemType[]
): ClassDecorator & MethodDecorator {
  return applyDecorators(
    ApiExtraModels(Problem),
    ...problemTypes.map((problemType) => {
      return ApiResponse({
        content: {
          [PROBLEM_CONTENT_TYPE]: {
            schema: { $ref: getSchemaPath(Problem) },
          },
        },
        description: problemType.title,
        status: problemType.status,
      });
    }),
  );
}
