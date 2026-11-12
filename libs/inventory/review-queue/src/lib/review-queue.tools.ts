import { noQuerySchema } from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';
import { Tool } from '@nestjs/mcp';

import { PendingScanList } from './pending-scan.ts';
import { PendingScansService } from './pending-scans.service.ts';

// The MCP tools of the review queue operations, as ADR 0012 decided. A tool
// is a surface and holds no rules. It takes the schema of the controller as
// its input schema and the response schema as its output schema. It calls
// the same method as the controller with the same arguments. The library
// exports this provider, and the API app registers it with the MCP module.
@Injectable()
export class ReviewQueueTools {
  constructor(private readonly pendingScans: PendingScansService) {}

  @Tool({
    description:
      'List every pending scan in the review queue, most recent first. The result is an object with an `items` list of the pending scans.',
    inputSchema: noQuerySchema,
    name: 'list_pending_scans',
    outputSchema: PendingScanList.schema,
  })
  async listPendingScans(): Promise<PendingScanList> {
    return this.pendingScans.list();
  }
}
