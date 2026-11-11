import type { MigrationInterface } from 'typeorm';

// Milestone 1 has no entity. This migration changes nothing. It proves that
// the migrations run at every start on both engines.
export class Empty1793756181772 implements MigrationInterface {
  // TypeORM reads the timestamp from the name. The name is explicit, so a
  // bundler that renames the class does not change it.
  name = 'Empty1793756181772';

  async up(): Promise<void> {
    // Nothing to do.
  }

  async down(): Promise<void> {
    // Nothing to do.
  }
}
