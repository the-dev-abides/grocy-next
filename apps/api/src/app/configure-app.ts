import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Both APIs live under `/api`. The legacy API takes `/api` itself, from
// milestone 10. The Next API lives under `/api/v2`. The web app takes every
// path outside `/api`.
export const API_ROOT = 'api';
export const API_PREFIX = `${API_ROOT}/v2`;

// The OpenAPI document is at `/api/v2/openapi.json`. The Swagger UI is at
// `/api/v2/docs`.
const DOCS_PATH = 'docs';
const OPENAPI_DOCUMENT_PATH = 'openapi.json';

export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix(API_PREFIX);

  const openApiConfig = new DocumentBuilder()
    .setTitle('Grocy Next API')
    .setDescription('The Next API of Grocy Next.')
    .setVersion('0.0.1')
    .build();
  SwaggerModule.setup(
    DOCS_PATH,
    app,
    () => SwaggerModule.createDocument(app, openApiConfig),
    {
      useGlobalPrefix: true,
      jsonDocumentUrl: OPENAPI_DOCUMENT_PATH,
    },
  );

  return app;
}
