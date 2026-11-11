import type { DynamicModule } from '@nestjs/common';

import { ProductsModule } from '@grocy-next/inventory-products';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { LookupOptions } from './lookup/lookup-options.ts';

import { BookingsController } from './bookings.controller.ts';
import { BookingsService } from './bookings.service.ts';
import { LOOKUP_OPTIONS, readLookupOptions } from './lookup/lookup-options.ts';
import { LOOKUP_PROVIDER } from './lookup/lookup-provider.ts';
import { LookupWorker } from './lookup/lookup-worker.ts';
import { OpenFactsProvider } from './lookup/open-facts-provider.ts';
import { PendingScansController } from './pending-scans.controller.ts';
import { PendingScansService } from './pending-scans.service.ts';
import { storedNutritionFactsSchema } from './storage/stored-nutrition-facts.ts';
import { storedPendingScanSchema } from './storage/stored-pending-scan.ts';

// What the API app gives the review queue. The user agent of the lookup
// provider carries the version of the API package.
export interface ReviewQueueOptions {
  apiVersion: string;
}

// The review queue subdomain of the Inventory domain. It holds the pending
// scans and their operations, the accept, the lookup worker, and the
// nutrition facts. The Products module gives it the Grocy API client for the
// code resolution and the booking. The
// lookup options factory reads the two lookup variables at start, so a wrong
// value stops the process before it listens.
@Module({})
export class ReviewQueueModule {
  static forRoot(options: ReviewQueueOptions): DynamicModule {
    return {
      controllers: [PendingScansController, BookingsController],
      imports: [
        ProductsModule,
        TypeOrmModule.forFeature([
          storedPendingScanSchema,
          storedNutritionFactsSchema,
        ]),
      ],
      module: this,
      providers: [
        PendingScansService,
        BookingsService,
        LookupWorker,
        { provide: LOOKUP_OPTIONS, useFactory: () => readLookupOptions() },
        {
          inject: [LOOKUP_OPTIONS],
          provide: LOOKUP_PROVIDER,
          useFactory: (lookup: LookupOptions) =>
            new OpenFactsProvider(lookup.openFactsUrl, options.apiVersion),
        },
      ],
    };
  }
}
