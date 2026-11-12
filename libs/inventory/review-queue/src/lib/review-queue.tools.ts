import {
  NoToolInput,
  ToolInput,
  toolInputOf,
} from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';
import { Tool } from '@nestjs/mcp';

import { Booking, CreateBooking } from './booking.ts';
import { BookingsService } from './bookings.service.ts';
import {
  CreatePendingScan,
  PendingScan,
  PendingScanId,
  PendingScanList,
  UpdatePendingScanToolInput,
} from './pending-scan.ts';
import { PendingScansService } from './pending-scans.service.ts';

// The MCP tools of the review queue operations, as ADR 0012 decided. A tool
// is a surface and holds no rules. It takes the schema of the controller as
// its input schema and the response schema as its output schema. It calls
// the same method as the controller with the same arguments. The library
// exports this provider, and the API app registers it with the MCP module.
@Injectable()
export class ReviewQueueTools {
  constructor(
    private readonly bookings: BookingsService,
    private readonly pendingScans: PendingScansService,
  ) {}

  @Tool({
    description:
      'Accept one pending scan as a booking. The accept writes a purchase or an inventory in Grocy and removes the pending scan. The result is the booking with the stock log rows that Grocy stored.',
    inputSchema: toolInputOf(CreateBooking),
    name: 'create_booking',
    outputSchema: Booking.schema,
  })
  async createBooking(input: CreateBooking): Promise<Booking> {
    return this.bookings.create(input);
  }

  // A pending scan from the MCP server never merges into an open row, as ADR
  // 0010 decided. The result is the new row.
  @Tool({
    description:
      'Create a pending scan. The row goes into the review queue for the user to accept. A row with a product and no code is the way to enter a receipt line. The result is the stored pending scan.',
    inputSchema: toolInputOf(CreatePendingScan),
    name: 'create_pending_scan',
    outputSchema: PendingScan.schema,
  })
  async createPendingScan(input: CreatePendingScan): Promise<PendingScan> {
    const { pendingScan } = await this.pendingScans.create(input, 'no merge');
    return pendingScan;
  }

  @Tool({
    description:
      'Read one pending scan by its id. The result is the pending scan.',
    inputSchema: toolInputOf(PendingScanId),
    name: 'get_pending_scan',
    outputSchema: PendingScan.schema,
  })
  async getPendingScan(input: PendingScanId): Promise<PendingScan> {
    return this.pendingScans.read(input.id);
  }

  // The tool takes the id and the merge patch fields in one input. It gives
  // them to the service as two arguments, as the controller does.
  @Tool({
    description:
      'Update one pending scan by its id with a JSON merge patch: an absent field stays as it is, and a field set to null clears it. An update that sets a product also adds the code of the row to that product in Grocy. The result is the pending scan after the update.',
    inputSchema: toolInputOf(UpdatePendingScanToolInput),
    name: 'update_pending_scan',
    outputSchema: PendingScan.schema,
  })
  async updatePendingScan(
    input: UpdatePendingScanToolInput,
  ): Promise<PendingScan> {
    const { id, ...body } = input;
    return this.pendingScans.update(id, body);
  }

  @Tool({
    description:
      'Delete one pending scan by its id. A delete is a reject: the row is gone from the review queue with no history. The result is the pending scan as it was before the delete.',
    inputSchema: toolInputOf(PendingScanId),
    name: 'delete_pending_scan',
    outputSchema: PendingScan.schema,
  })
  async deletePendingScan(input: PendingScanId): Promise<PendingScan> {
    return this.pendingScans.delete(input.id);
  }

  @Tool({
    description:
      'List every pending scan in the review queue, most recent first. The result is an object with an `items` list of the pending scans.',
    inputSchema: toolInputOf(NoToolInput),
    name: 'list_pending_scans',
    outputSchema: PendingScanList.schema,
  })
  @ToolInput(NoToolInput)
  async listPendingScans(): Promise<PendingScanList> {
    return this.pendingScans.list();
  }
}
