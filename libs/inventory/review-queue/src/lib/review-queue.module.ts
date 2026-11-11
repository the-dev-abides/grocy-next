import { ProductsModule } from '@grocy-next/inventory-products';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PendingScansController } from './pending-scans.controller.ts';
import { PendingScansService } from './pending-scans.service.ts';
import { storedPendingScanSchema } from './storage/stored-pending-scan.ts';

// The review queue subdomain of the Inventory domain. It holds the pending
// scans and their operations. The Products module gives it the Grocy API
// client for the code resolution.
@Module({
  controllers: [PendingScansController],
  imports: [
    ProductsModule,
    TypeOrmModule.forFeature([storedPendingScanSchema]),
  ],
  providers: [PendingScansService],
})
export class ReviewQueueModule {}
