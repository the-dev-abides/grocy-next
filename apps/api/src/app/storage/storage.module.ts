import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empty1793756181772 } from './migrations/1793756181772-empty.ts';
import { EnvironmentVariables, readStorageOptions } from './storage-options.ts';

// This list holds the migrations. Add a new migration here.
const MIGRATIONS = [Empty1793756181772];

// The config module reads the `.env` file into the process environment and
// checks the storage variables at start.
function validateStorageVariables(
  variables: EnvironmentVariables,
): EnvironmentVariables {
  readStorageOptions(variables);
  return variables;
}

// The API owns a database through TypeORM with the Data Mapper pattern. One
// DataSource serves SQLite and PostgreSQL. The migrations run at every
// start, before the process listens.
@Module({
  imports: [
    ConfigModule.forRoot({ validate: validateStorageVariables }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...readStorageOptions(process.env),
        entities: [],
        migrations: MIGRATIONS,
        migrationsRun: true,
        synchronize: false,
      }),
    }),
  ],
})
export class StorageModule {}
