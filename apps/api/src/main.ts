import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module.ts';
import { configureApp } from './app/configure-app.ts';
import { readServerOptions } from './app/server-options.ts';

// The config module in the storage module reads the `.env` file into the
// process environment when the app module is created, so the port is read
// after it.
const app = configureApp(await NestFactory.create(AppModule));
await app.listen(readServerOptions().port);
