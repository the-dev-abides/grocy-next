import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

// Both APIs live under `/api`. The legacy API takes `/api` itself, from
// milestone 10. The Next API lives under `/api/v2`. The web app takes every
// path outside `/api`.
export const API_ROOT = 'api';
const API_PREFIX = `${API_ROOT}/v2`;

// The OpenAPI document is at `/api/v2/openapi.json`. The Swagger UI is at
// `/api/v2/docs`.
const DOCS_PATH = 'docs';
const OPENAPI_DOCUMENT_PATH = 'openapi.json';

// This function builds the OpenAPI document of the app. The schemas come
// from the Zod DTOs through `nestjs-zod`, which also cleans the document.
// The web app generates its API slice from this document.
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const documentBuilder = new DocumentBuilder();
  const openApiConfig = documentBuilder
    .setTitle('Grocy Next API')
    .setDescription('The Next API of Grocy Next.')
    .setVersion('0.0.1')
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, openApiConfig));
}

export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix(API_PREFIX);

  SwaggerModule.setup(DOCS_PATH, app, () => buildOpenApiDocument(app), {
    jsonDocumentUrl: OPENAPI_DOCUMENT_PATH,
    useGlobalPrefix: true,
  });

  return app;
}
