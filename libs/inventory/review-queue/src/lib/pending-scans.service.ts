import type { ProductDetails } from '@grocy-next/inventory-products';

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

import { LookupWorker } from './lookup/lookup-worker.ts';
import { pendingScanToStore } from './pending-scan-to-store.ts';
import { updatedPendingScan } from './pending-scan-update.ts';
import { ProductPictures } from './product-picture.ts';
import { readActiveProduct } from './read-product.ts';
import { findRepeatTarget, mergedPendingScan } from './repeat-scan.ts';
import { resolveCode } from './resolve-code.ts';
import {
  changedProductIdOf,
  hasBarcode,
  linkNutritionFacts,
  withProduct,
} from './set-product.ts';
import { storedPendingScanSchema } from './storage/stored-pending-scan.ts';
import { now } from './storage/timestamp.ts';

// The result of a create. The pending scan is the new row, or the open row
// that a repeat scan added to.
export interface CreateResult {
  isMerged: boolean;
  pendingScan: PendingScan;
}

// The pending scan operations of the Next API. The controller and, in a
// later spec, the MCP tool call these methods. The rules live here.
@Injectable()
export class PendingScansService {
  constructor(
    @InjectRepository(storedPendingScanSchema)
    private readonly pendingScans: Repository<StoredPendingScan>,
    private readonly grocy: GrocyClient,
    private readonly lookups: LookupWorker,
    private readonly pictures: ProductPictures,
  ) {}

  // The update that sets a product, as the spec decided: the Grocy writes
  // first, in order, and the update stops on the first failure with the
  // Grocy problem. Then one transaction links the nutrition facts records
  // of the code to the product and stores the row with the rules of the
  // product set.
  private async setProduct(
    updated: StoredPendingScan,
    productId: number,
  ): Promise<PendingScan> {
    const product = await readActiveProduct(this.grocy, productId);
    const productBarcodeId = await this.addBarcode(product, updated.code);
    await this.pictures.setFromLookup(product, updated.lookupResult);
    const row = withProduct(updated, product, productBarcodeId);
    return this.pendingScans.manager.transaction(async (manager) => {
      await linkNutritionFacts(manager, row);
      return manager.save(storedPendingScanSchema, row);
    });
  }

  // The code goes to the product as a product barcode when the row has a
  // code and the product has no product barcode with that code. The result
  // is the id of the new product barcode, or null when none was added. A
  // Grocy refusal is the grocy-refused problem of ADR 0014.
  private async addBarcode(
    product: ProductDetails,
    code: null | string,
  ): Promise<null | number> {
    if (code === null || hasBarcode(product, code)) {
      return null;
    }
    const result = await this.grocy.createProductBarcode(product.id, code);
    if (result.isRefused) {
      throw new ProblemException(
        PROBLEM_TYPES.grocyRefused,
        result.grocy.message,
        { grocy: result.grocy },
      );
    }
    return result.id;
  }

  // The create call of ADR 0010: the Grocy reads first, then one database
  // transaction over the Grocy Next storage. The repeat rule runs inside the
  // transaction, before the write. The lookup worker takes a new row after
  // the transaction, so the worker reads a stored row. A repeat scan adds to
  // a row that the worker already took. A repeat Inventory scan writes
  // nothing and returns the open row. A lookup result is never in the
  // create response.
  async create(
    body: CreatePendingScan,
    repeatRule: RepeatRule,
  ): Promise<CreateResult> {
    const match =
      body.code === undefined ? null : await resolveCode(this.grocy, body.code);
    const row = pendingScanToStore(body, match, now());
    const result = await this.pendingScans.manager.transaction(
      async (manager) => {
        const target =
          repeatRule === 'merge' ? await findRepeatTarget(manager, row) : null;
        if (target === null) {
          const pendingScan = await manager.save(storedPendingScanSchema, row);
          return { isMerged: false, pendingScan };
        }
        const merged = mergedPendingScan(target, match, row.scannedAt);
        const pendingScan =
          merged === null
            ? target
            : await manager.save(storedPendingScanSchema, merged);
        return { isMerged: true, pendingScan };
      },
    );
    if (!result.isMerged) {
      this.lookups.queue(result.pendingScan);
    }
    return result;
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
  // response is the row as stored. An update that sets a product on a row
  // that had none, or changes it, also writes to Grocy.
  async update(id: number, body: UpdatePendingScan): Promise<PendingScan> {
    const row = await this.read(id);
    const updated = updatedPendingScan(row, body, now());
    const productId = changedProductIdOf(row, updated);
    return productId === null
      ? this.pendingScans.save(updated)
      : this.setProduct(updated, productId);
  }

  // The reject of ADR 0010. The response is the row as it was before the
  // delete, as ADR 0014 decided. The queue keeps no history.
  async delete(id: number): Promise<PendingScan> {
    const row = await this.read(id);
    await this.pendingScans.delete({ id });
    return row;
  }
}
