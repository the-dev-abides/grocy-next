import { ProductsModule } from '@grocy-next/inventory-products';
import { NextApiModule } from '@grocy-next/shared-next-api';
import { Module } from '@nestjs/common';

import { WebAppModule } from '../web-app.module.ts';
import { HealthModule } from './health/health.module.ts';
import { StorageModule } from './storage/storage.module.ts';

@Module({
  imports: [
    StorageModule,
    NextApiModule,
    HealthModule,
    ProductsModule,
    WebAppModule,
  ],
})
export class AppModule {}
