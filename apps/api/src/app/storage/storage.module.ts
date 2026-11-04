import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empty1793756181772 } from './migrations/1793756181772-empty.ts';
import { storageOptions, validateStorageVariables } from './storage-options.ts';

// The migrations are listed here. A new migration is added to this list.
const MIGRATIONS = [Empty1793756181772];

// The API owns a database through TypeORM with the Data Mapper pattern. One
// DataSource serves SQLite and PostgreSQL. The migrations run at every
// start, before the app listens.
@Module({
  imports: [
    ConfigModule.forRoot({ validate: validateStorageVariables }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...storageOptions((name) => config.get<string>(name)),
        entities: [],
        migrations: MIGRATIONS,
        migrationsRun: true,
        synchronize: false,
      }),
    }),
  ],
})
export class StorageModule {}
