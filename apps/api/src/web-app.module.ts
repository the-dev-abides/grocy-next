import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { API_PREFIX } from './app/configure-app.ts';

// The web app build is at `apps/web/dist`. This file is at `apps/api/src`,
// and the API bundle is at `apps/api/dist`. Both folders are two levels
// under `apps`, so one relative path finds the web app build from the source
// and from the bundle. rspack keeps `import.meta.dirname` as a run-time
// value.
const WEB_APP_PATH = join(import.meta.dirname, '..', '..', 'web', 'dist');

// The API serves the web app as static files from the same process. The
// root path returns `index.html`, and so does every path that is not a file
// and not under the API prefix.
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: WEB_APP_PATH,
      exclude: [`/${API_PREFIX}/{*path}`],
    }),
  ],
})
export class WebAppModule {}
