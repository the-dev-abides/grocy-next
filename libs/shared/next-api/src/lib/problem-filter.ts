import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { ServerResponse } from 'node:http';

import {
  BadRequestException,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { Problem, ProblemBody } from './problems.ts';
import type { HttpRequest } from './request.ts';

import { PROBLEM_TYPES, ProblemException } from './problems.ts';
import { hasBody, pathOf } from './request.ts';

const PROBLEM_CONTENT_TYPE = 'application/problem+json';
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

function send(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: unknown,
): void {
  response.statusCode = status;
  response.setHeader('Content-Type', contentType);
  response.end(JSON.stringify(body));
}

// The problem of an exception, or undefined when the exception is not a
// Next API error. The router throws `NotFoundException` for an unknown
// path. NestJS maps the body parser error for a body that is not valid
// JSON to a plain `BadRequestException` with the parser message. No Next
// API code throws a plain `BadRequestException`, so one with a body is the
// parser, and one without a body is a request line that Express refused.
function problemOf(
  exception: unknown,
  request: HttpRequest,
): ProblemBody | undefined {
  if (exception instanceof ProblemException) {
    return exception.problem;
  }
  if (exception instanceof NotFoundException) {
    const notFound = new ProblemException(
      PROBLEM_TYPES.notFound,
      exception.message,
    );
    return notFound.problem;
  }
  if (exception instanceof BadRequestException) {
    const problemType = hasBody(request)
      ? PROBLEM_TYPES.notJson
      : PROBLEM_TYPES.validation;
    const badRequest = new ProblemException(problemType, exception.message);
    return badRequest.problem;
  }
  return undefined;
}

// The one exception filter of the API. A Next API error becomes RFC 9457
// Problem Details with the content type `application/problem+json` and the
// request path as `instance`. Every other `HttpException` keeps its own
// body, so the health checks answer as Terminus writes them. Every other
// error is logged and answered with a 500.
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<ServerResponse>();

    const problem = problemOf(exception, request);
    if (problem !== undefined) {
      const body: Problem = { ...problem, instance: pathOf(request) };
      send(response, body.status, PROBLEM_CONTENT_TYPE, body);
      return;
    }
    if (exception instanceof HttpException) {
      send(
        response,
        exception.getStatus(),
        JSON_CONTENT_TYPE,
        exception.getResponse(),
      );
      return;
    }
    this.logger.error(exception);
    send(response, HttpStatus.INTERNAL_SERVER_ERROR, JSON_CONTENT_TYPE, {
      message: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
