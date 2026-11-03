import { INestApplication } from '@nestjs/common';

// The Next API lives under `/api`. The web app takes the root path.
export const API_PREFIX = 'api';

export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix(API_PREFIX);
  return app;
}
