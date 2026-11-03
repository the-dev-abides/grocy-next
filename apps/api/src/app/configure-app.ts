import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// The Next API lives under `/api`. The web app takes the root path.
export const API_PREFIX = 'api';

// The OpenAPI document is at `/api/openapi.json`. The Swagger UI is at
// `/api/docs`.
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
