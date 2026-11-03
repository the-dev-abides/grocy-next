import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  // Liveness: the process answers. No indicator runs.
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }
}
