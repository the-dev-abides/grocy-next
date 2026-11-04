import { Module } from '@nestjs/common';
import { WebAppModule } from '../web-app.module.ts';
import { HealthModule } from './health/health.module.ts';

@Module({
  imports: [HealthModule, WebAppModule],
})
export class AppModule {}
