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
      const isPending = await this.dataSource.showMigrations();
      if (isPending) {
        throw new Error('One or more migrations have not run.');
      }
    });
  }
}
