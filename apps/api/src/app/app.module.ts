import { Module } from '@nestjs/common';
import { WebAppModule } from '../web-app.module.ts';
import { HealthModule } from './health/health.module.ts';
import { StorageModule } from './storage/storage.module.ts';

@Module({
  imports: [StorageModule, HealthModule, WebAppModule],
})
export class AppModule {}
