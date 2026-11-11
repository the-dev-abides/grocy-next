import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  ApiProblemResponses,
  NoQuery,
  PROBLEM_TYPES,
} from '@grocy-next/shared-next-api';
import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';

import {
  CreatePendingScan,
  PendingScan,
  PendingScanId,
  PendingScanList,
} from './pending-scan.ts';
import { PendingScansService } from './pending-scans.service.ts';

// The `Location` header of a create names the path of the new resource. The
// path of the request is the path of the collection.
const LOCATION_HEADER = 'Location';

function locationOf(request: IncomingMessage, id: number): string {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  return `${pathname}/${String(id)}`;
}

// The pending scan operations of the Next API. The controller is a surface
// and holds no rules.
@Controller('pending-scans')
export class PendingScansController {
  constructor(private readonly pendingScans: PendingScansService) {}

  @Post()
  @ApiOperation({
    operationId: 'createPendingScan',
    summary: 'Create a pending scan.',
  })
  @ApiCreatedResponse({
    description: 'The stored pending scan.',
    headers: {
      [LOCATION_HEADER]: {
        description: 'The path of the new pending scan.',
        schema: { type: 'string' },
      },
    },
    type: PendingScan,
  })
  @ApiProblemResponses(
    PROBLEM_TYPES.validation,
    PROBLEM_TYPES.notJson,
    PROBLEM_TYPES.grocyUnavailable,
  )
  @NoQuery()
  @ZodSerializerDto(PendingScan)
  async create(
    @Body() body: CreatePendingScan,
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<PendingScan> {
    const pendingScan = await this.pendingScans.create(body);
    response.setHeader(LOCATION_HEADER, locationOf(request, pendingScan.id));
    return pendingScan;
  }

  // A full list has no cut-off. The operation returns every pending scan in
  // the `items` envelope, most recent first, and takes no query field.
  @Get()
  @ApiOperation({
    operationId: 'listPendingScans',
    summary: 'List every pending scan.',
  })
  @ApiOkResponse({
    description: 'Every pending scan, most recent first.',
    type: PendingScanList,
  })
  @ApiProblemResponses(PROBLEM_TYPES.validation)
  @NoQuery()
  @ZodSerializerDto(PendingScanList)
  list(): Promise<PendingScanList> {
    return this.pendingScans.list();
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getPendingScan',
    summary: 'Read one pending scan.',
  })
  @ApiOkResponse({ description: 'The pending scan.', type: PendingScan })
  @ApiProblemResponses(PROBLEM_TYPES.validation, PROBLEM_TYPES.notFound)
  @NoQuery()
  @ZodSerializerDto(PendingScan)
  read(@Param() parameters: PendingScanId): Promise<PendingScan> {
    return this.pendingScans.read(parameters.id);
  }
}
