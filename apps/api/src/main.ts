import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.ts';
import { configureApp } from './app/configure-app.ts';

const PORT = 3000;

const app = configureApp(await NestFactory.create(AppModule));
await app.listen(PORT);
