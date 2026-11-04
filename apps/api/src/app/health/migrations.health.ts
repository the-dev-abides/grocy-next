import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

// The startup check. The migrations have run when the migrations table
// holds every listed migration.
@Injectable()
export class MigrationsHealthIndicator {
  constructor(
    private readonly dataSource: DataSource,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  check(key: string) {
    return this.healthIndicatorService.check(key).attempt(async () => {
      const pending = await this.dataSource.showMigrations();
      if (pending) {
        throw new Error('One or more migrations have not run.');
      }
    });
  }
}
