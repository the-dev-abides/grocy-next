import { ProductsModule } from '@grocy-next/inventory-products';
import { ReviewQueueModule } from '@grocy-next/inventory-review-queue';
import { NextApiModule } from '@grocy-next/shared-next-api';
import { Module } from '@nestjs/common';

import { readApiVersion } from '../api-version.ts';
import { WebAppModule } from '../web-app.module.ts';
import { HealthModule } from './health/health.module.ts';
import { McpServerModule } from './mcp/mcp-server.module.ts';
import { StorageModule } from './storage/storage.module.ts';

// The MCP module imports the same object, so NestJS builds one review queue
// module.
const reviewQueueModule = ReviewQueueModule.forRoot({
  apiVersion: readApiVersion(),
});

@Module({
  imports: [
    StorageModule,
    NextApiModule,
    HealthModule,
    McpServerModule.forRoot(reviewQueueModule),
    ProductsModule,
    reviewQueueModule,
    WebAppModule,
  ],
})
export class AppModule {}
