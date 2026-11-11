import { HttpException } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// The problem types of the Next API, as ADR 0014 decided. One stable
// relative URI per cause, with a fixed title and a fixed status. A later
// ticket adds a type when an operation needs one.
export const PROBLEM_TYPES = {
  bookingTypeFixed: {
    status: 409,
    title: 'The booking type is fixed',
    type: '/problems/booking-type-fixed',
  },
  grocyRefused: {
    status: 422,
    title: 'Grocy refused the change',
    type: '/problems/grocy-refused',
  },
  grocyUnavailable: {
    status: 502,
    title: 'Grocy is unavailable',
    type: '/problems/grocy-unavailable',
  },
  noAmount: {
    status: 409,
    title: 'The pending scan has no amount',
    type: '/problems/no-amount',
  },
  noConversion: {
    status: 422,
    title: 'The product has no conversion to the stock unit',
    type: '/problems/no-conversion',
  },
  noProduct: {
    status: 409,
    title: 'The pending scan has no product',
    type: '/problems/no-product',
  },
  notFound: {
    status: 404,
    title: 'Not found',
    type: '/problems/not-found',
  },
  notJson: {
    status: 415,
    title: 'The body is not JSON',
    type: '/problems/not-json',
  },
  unknownId: {
    status: 422,
    title: 'An id names nothing in Grocy',
    type: '/problems/unknown-id',
  },
  validation: {
    status: 400,
    title: 'The request fails the schema',
    type: '/problems/validation',
  },
} as const;

export type ProblemType = (typeof PROBLEM_TYPES)[keyof typeof PROBLEM_TYPES];

// One entry of the `errors` list of a validation problem. The path is the
// dotted path of the field in the body or the query, for example
// `items.0.name`. An unknown field has the message "unknown field".
const fieldErrorSchema = z
  .strictObject({
    message: z.string().meta({ description: 'What is wrong with the field.' }),
    path: z.string().meta({ description: 'The dotted path of the field.' }),
  })
  .meta({ id: 'FieldError' });

export type FieldError = z.infer<typeof fieldErrorSchema>;

// The status and the message that Grocy returned when Grocy refused the
// change. Grocy answers a handled refusal with 400 and an `error_message`.
const grocyRefusalSchema = z
  .strictObject({
    message: z
      .string()
      .meta({ description: 'The error message that Grocy returned.' }),
    status: z.int().meta({ description: 'The HTTP status that Grocy returned.' }),
  })
  .meta({ id: 'GrocyRefusal' });

export type GrocyRefusal = z.infer<typeof grocyRefusalSchema>;

// The error body of every Next API error: RFC 9457 Problem Details. The
// content type is `application/problem+json`. `instance` is the request
// path. `errors` is present on a validation problem only. `grocy` is present
// when Grocy refused the change.
const problemSchema = z.strictObject({
  detail: z
    .string()
    .meta({ description: 'What went wrong in this one request.' }),
  errors: z
    .array(fieldErrorSchema)
    .optional()
    .meta({ description: 'The field errors of a validation problem.' }),
  grocy: grocyRefusalSchema
    .optional()
    .meta({ description: 'The status and the message that Grocy returned.' }),
  instance: z.string().meta({ description: 'The request path.' }),
  status: z.int().meta({ description: 'The HTTP status of the response.' }),
  title: z.string().meta({ description: 'The fixed title of the type.' }),
  type: z.string().meta({ description: 'The stable URI of the cause.' }),
});

// The DTO carries the schema into the OpenAPI document as `Problem`.
export class Problem extends createZodDto(problemSchema) {}

// The body of a problem before the filter adds the request path.
export type ProblemBody = Omit<Problem, 'instance'>;

// The two extension fields of a problem. A validation problem carries the
// field errors. A refusal from Grocy carries the Grocy status and message.
export type ProblemExtensions = Pick<ProblemBody, 'errors' | 'grocy'>;

// Every Next API error is this exception. The body is the problem without
// the request path. The problem filter adds the path and sets the content
// type. An MCP tool carries the body as its error text, as ADR 0012 decided.
export class ProblemException extends HttpException {
  readonly problem: ProblemBody;

  constructor(
    problemType: ProblemType,
    detail: string,
    extensions: ProblemExtensions = {},
  ) {
    const problem: ProblemBody = {
      detail,
      status: problemType.status,
      title: problemType.title,
      type: problemType.type,
    };
    if (extensions.errors !== undefined) {
      problem.errors = extensions.errors;
    }
    if (extensions.grocy !== undefined) {
      problem.grocy = extensions.grocy;
    }
    super(problem, problemType.status);
    this.problem = problem;
  }
}
