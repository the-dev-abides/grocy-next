import { GrocyClient } from '@grocy-next/inventory-products';
import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type {
  CreatePendingScan,
  PendingScan,
  PendingScanList,
  UpdatePendingScan,
} from './pending-scan.ts';
import type { RepeatRule } from './repeat-scan.ts';
import type { StoredPendingScan } from './storage/stored-pending-scan.ts';

import { pendingScanToStore } from './pending-scan-to-store.ts';
import { updatedPendingScan } from './pending-scan-update.ts';
import { findRepeatTarget, mergedPendingScan } from './repeat-scan.ts';
import { resolveCode } from './resolve-code.ts';
import { storedPendingScanSchema } from './storage/stored-pending-scan.ts';

// The result of a create. The pending scan is the new row, or the open row
// that a repeat scan added to.
export interface CreateResult {
  isMerged: boolean;
  pendingScan: PendingScan;
}

// The time of a change as RFC 3339 text in UTC with milliseconds, the
// precision that both storage engines keep.
function now(): string {
  return Temporal.Now.instant().toString({ fractionalSecondDigits: 3 });
}

// The pending scan operations of the Next API. The controller and, in a
// later spec, the MCP tool call these methods. The rules live here.
@Injectable()
export class PendingScansService {
  constructor(
    @InjectRepository(storedPendingScanSchema)
    private readonly pendingScans: Repository<StoredPendingScan>,
    private readonly grocy: GrocyClient,
  ) {}

  // The create call of ADR 0010: the Grocy reads first, then one database
  // transaction over the Grocy Next storage. The repeat rule runs inside the
  // transaction, before the write. The lookup queue of a later ticket takes
  // the stored row after it.
  async create(
    body: CreatePendingScan,
    repeatRule: RepeatRule,
  ): Promise<CreateResult> {
    const match =
      body.code === undefined ? null : await resolveCode(this.grocy, body.code);
    const row = pendingScanToStore(body, match, now());
    return this.pendingScans.manager.transaction(async (manager) => {
      const target =
        repeatRule === 'merge' ? await findRepeatTarget(manager, row) : null;
      if (target === null) {
        const pendingScan = await manager.save(storedPendingScanSchema, row);
        return { isMerged: false, pendingScan };
      }
      const pendingScan = await manager.save(
        storedPendingScanSchema,
        mergedPendingScan(target, match, row.scannedAt),
      );
      return { isMerged: true, pendingScan };
    });
  }

  // The full list, no cut-off, most recent scan first. Two rows with one
  // scan time keep the order of their creation.
  async list(): Promise<PendingScanList> {
    const items = await this.pendingScans
      .createQueryBuilder('pendingScan')
      .orderBy('pendingScan.scannedAt', 'DESC')
      .addOrderBy('pendingScan.id', 'DESC')
      .getMany();
    return { items };
  }

  async read(id: number): Promise<PendingScan> {
    const row = await this.pendingScans.findOneBy({ id });
    if (row === null) {
      throw new ProblemException(
        PROBLEM_TYPES.notFound,
        `No pending scan has the id ${String(id)}.`,
      );
    }
    return row;
  }

  // The update of ADR 0014: a JSON merge patch on the writable fields. The
  // response is the row as stored.
  async update(id: number, body: UpdatePendingScan): Promise<PendingScan> {
    const row = await this.read(id);
    return this.pendingScans.save(updatedPendingScan(row, body, now()));
  }

  // The reject of ADR 0010. The response is the row as it was before the
  // delete, as ADR 0014 decided. The queue keeps no history.
  async delete(id: number): Promise<PendingScan> {
    const row = await this.read(id);
    await this.pendingScans.delete({ id });
    return row;
  }
}
