import { NestFactory } from '@nestjs/core';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AppModule } from './app/app.module.ts';
import { buildOpenApiDocument, configureApp } from './app/configure-app.ts';

// This script writes the OpenAPI document of the API to `apps/api/openapi.json`
// without a running server. It creates the app on SQLite in memory with
// placeholder Grocy values, builds the document, and exits. The NX target
// `api:openapi` runs it. The web app generates its API slice from the file.
const OUTPUT_FILE = path.join(import.meta.dirname, '..', 'openapi.json');

const app = configureApp(
  await NestFactory.create(AppModule, { logger: false }),
);
await app.init();
const document = buildOpenApiDocument(app);
await app.close();
await writeFile(OUTPUT_FILE, `${JSON.stringify(document, null, 2)}\n`);
