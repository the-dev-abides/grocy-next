import type {
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';

import type { StoredPendingScan } from '../storage/stored-pending-scan.ts';
import type { LookupOptions } from './lookup-options.ts';
import type { LookupHit, LookupProvider } from './lookup-provider.ts';

import { storedNutritionFactsSchema } from '../storage/stored-nutrition-facts.ts';
import { storedPendingScanSchema } from '../storage/stored-pending-scan.ts';
import { now } from '../storage/timestamp.ts';
import { lookupCodeOf } from './lookup-code.ts';
import { LOOKUP_OPTIONS } from './lookup-options.ts';
import { LOOKUP_PROVIDER, RateLimitError } from './lookup-provider.ts';

const MINUTE_MS = 60_000;

// The pending scan that gets a lookup: no product, no write-in name, and a code
// of 8, 12, 13, or 14 digits.
function requiresLookup(row: StoredPendingScan): boolean {
  return (
    row.productId === null &&
    row.writeInName === null &&
    row.code !== null &&
    lookupCodeOf(row.code) !== null
  );
}

// The attempt sets the time of the lookup on the row in every case. A hit also
// stores the lookup result and writes one nutrition facts record, linked to the
// code and not yet to a product.
async function storeAttempt(
  manager: EntityManager,
  row: StoredPendingScan,
  hit: LookupHit | null,
  at: string,
): Promise<void> {
  await manager.update(
    storedPendingScanSchema,
    { id: row.id },
    hit === null
      ? { lastLookupAt: at, updatedAt: at }
      : { lastLookupAt: at, lookupResult: hit.lookupResult, updatedAt: at },
  );
  if (hit !== null && row.code !== null) {
    await manager.save(storedNutritionFactsSchema, {
      ...hit.nutritionFacts,
      code: row.code,
      createdAt: at,
      productBarcodeId: row.productBarcodeId,
      productId: null,
      updatedAt: at,
    });
  }
}

// The lookup worker of ADR 0011: an in-process worker with a plain timer. It
// holds a queue of pending scan ids, runs one lookup at a time, and runs no
// more than the rate budget of the provider in one clock minute. A lookup sets
// the time of the attempt on the row in every case. A hit stores the lookup
// result and writes one nutrition facts record. A miss, a timeout, a 429, or a
// network error leaves the row with no lookup result and no error.
@Injectable()
export class LookupWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(LookupWorker.name);
  // The queue: the ids from the cursor on wait for a lookup.
  private ids: number[] = [];
  private cursor = 0;
  private readonly stop = new AbortController();
  private timer: NodeJS.Timeout | undefined;
  private isBusy = false;
  private minute = -1;
  private lookupsInMinute = 0;

  constructor(
    @InjectRepository(storedPendingScanSchema)
    private readonly pendingScans: Repository<StoredPendingScan>,
    @Inject(LOOKUP_PROVIDER)
    private readonly provider: LookupProvider,
    @Inject(LOOKUP_OPTIONS)
    private readonly options: LookupOptions,
  ) {}

  // The timer fires at once while the budget of the clock minute lasts, and at
  // the start of the next clock minute after it.
  private schedule(): void {
    if (
      this.stop.signal.aborted ||
      this.isBusy ||
      this.timer !== undefined ||
      this.cursor === this.ids.length
    ) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.runNext();
    }, this.delayUntilBudget());
  }

  private delayUntilBudget(): number {
    const time = Date.now();
    const minute = Math.floor(time / MINUTE_MS);
    if (minute !== this.minute) {
      this.minute = minute;
      this.lookupsInMinute = 0;
    }
    return this.lookupsInMinute < this.provider.ratePerMinute
      ? 0
      : (minute + 1) * MINUTE_MS - time;
  }

  private takeNext(): number | undefined {
    const id = this.ids[this.cursor];
    this.cursor += 1;
    if (this.cursor === this.ids.length) {
      this.ids = [];
      this.cursor = 0;
    }
    return id;
  }

  private async runNext(): Promise<void> {
    const id = this.takeNext();
    if (id === undefined) {
      return;
    }
    this.isBusy = true;
    try {
      await this.lookUp(id);
    } catch (error) {
      this.logger.error(
        `The lookup of the pending scan ${String(id)} failed: ${String(error)}`,
      );
    } finally {
      this.isBusy = false;
      this.schedule();
    }
  }

  // The row is read again before the lookup. A row that went, or that got a
  // product or a write-in name in the meantime, gets no lookup.
  private async lookUp(id: number): Promise<void> {
    const row = await this.pendingScans.findOneBy({ id });
    const code = row === null || !requiresLookup(row) ? null : row.code;
    if (row === null || code === null) {
      return;
    }
    this.lookupsInMinute += 1;
    const hit = await this.attempt(lookupCodeOf(code) ?? code);
    if (this.stop.signal.aborted) {
      return;
    }
    const at = now();
    await this.pendingScans.manager.transaction((manager) =>
      storeAttempt(manager, row, hit, at),
    );
  }

  // A 429 spends the budget of the clock minute, so the next lookup waits for
  // the next clock minute. Every other failure is logged and counts as a miss.
  private async attempt(code: string): Promise<LookupHit | null> {
    try {
      return await this.provider.lookup(code, this.stop.signal);
    } catch (error) {
      if (error instanceof RateLimitError) {
        this.lookupsInMinute = this.provider.ratePerMinute;
        this.logger.warn(error.message);
      } else if (!this.stop.signal.aborted) {
        this.logger.warn(
          `The lookup of the code ${code} failed: ${String(error)}`,
        );
      }
      return null;
    }
  }

  // At start, the worker queues every open pending scan with no product and no
  // lookup attempt, oldest first.
  async onApplicationBootstrap(): Promise<void> {
    if (!this.options.isOn) {
      return;
    }
    const rows = await this.pendingScans.find({
      order: { id: 'ASC' },
      where: { lastLookupAt: IsNull(), productId: IsNull() },
    });
    for (const row of rows) {
      this.queue(row);
    }
  }

  onApplicationShutdown(): void {
    this.stop.abort();
    if (this.timer === undefined) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  // This method queues the lookup of a stored pending scan. With the lookup
  // off, the worker queues nothing. A row that needs no lookup is not queued.
  queue(row: StoredPendingScan): void {
    if (!this.options.isOn || !requiresLookup(row)) {
      return;
    }
    this.ids.push(row.id);
    this.schedule();
  }
}
