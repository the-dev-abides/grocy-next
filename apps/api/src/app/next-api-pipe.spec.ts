import type { ExecutionContext, INestApplication } from '@nestjs/common';
import type { IncomingMessage as HttpRequest } from 'node:http';

import { NextApiModule } from '@grocy-next/shared-next-api';
import { Body, Controller, createParamDecorator, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// A custom parameter decorator that carries request data, as a later
// ticket can add one.
const requestHeader = createParamDecorator(
  (name: string, context: ExecutionContext) =>
    context.switchToHttp().getRequest<HttpRequest>().headers[name],
);

// A controller with parameters that have no Zod DTO. Each one is a
// programming error that the validation pipe refuses with a 500.
@Controller('untyped')
class UntypedController {
  @Post('body')
  body(@Body() body: unknown): unknown {
    return body;
  }

  @Post('custom')
  custom(@requestHeader('content-type') contentType: string): string {
    return contentType;
  }
}

describe('the Next API validation pipe at the HTTP boundary', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UntypedController],
      imports: [NextApiModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['body', 'custom'])(
    'answers 500 for a %s parameter with no Zod DTO',
    async (kind) => {
      const response = await fetch(`${baseUrl}/untyped/${kind}`, {
        body: '{}',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });

      expect(response.status).toBe(500);
    },
  );
});
