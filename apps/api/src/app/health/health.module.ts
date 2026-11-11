import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller.ts';
import { MigrationsHealthIndicator } from './migrations.health.ts';

@Module({
  controllers: [HealthController],
  imports: [TerminusModule],
  providers: [MigrationsHealthIndicator],
})
export class HealthModule {}
