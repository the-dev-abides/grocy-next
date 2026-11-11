import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

import { MigrationsHealthIndicator } from './migrations.health.ts';

// The three Kubernetes probes. No probe calls Grocy, so a Grocy outage does
// not stop the app.
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly migrations: MigrationsHealthIndicator,
  ) {}

  // Liveness: the process answers. No indicator runs.
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  // Startup: the migrations have run.
  @Get('startup')
  @HealthCheck()
  startup() {
    return this.health.check([() => this.migrations.check('migrations')]);
  }

  // Readiness: the database connection answers.
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.database.pingCheck('database')]);
  }
}
