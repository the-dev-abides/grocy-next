import { ProductsModule } from '@grocy-next/inventory-products';
import { ReviewQueueModule } from '@grocy-next/inventory-review-queue';
import { NextApiModule } from '@grocy-next/shared-next-api';
import { Module } from '@nestjs/common';

import { readApiVersion } from '../api-version.ts';
import { WebAppModule } from '../web-app.module.ts';
import { HealthModule } from './health/health.module.ts';
import { StorageModule } from './storage/storage.module.ts';

@Module({
  imports: [
    StorageModule,
    NextApiModule,
    HealthModule,
    ProductsModule,
    ReviewQueueModule.forRoot({ apiVersion: readApiVersion() }),
    WebAppModule,
  ],
})
export class AppModule {}
