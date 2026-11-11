import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  ApiProblemResponses,
  LOCATION_HEADER,
  locationOf,
  NoQuery,
  PROBLEM_TYPES,
} from '@grocy-next/shared-next-api';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
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
  UpdatePendingScan,
} from './pending-scan.ts';
import { PendingScansService } from './pending-scans.service.ts';

// The pending scan operations of the Next API. The controller is a surface
// and holds no rules.
@Controller('pending-scans')
export class PendingScansController {
  constructor(private readonly pendingScans: PendingScansService) {}

  // A create from the scan screen applies the repeat rule. A repeat scan of a
  // code adds to the open row and answers 200 in place of 201.
  @Post()
  @ApiOperation({
    operationId: 'createPendingScan',
    summary: 'Create a pending scan.',
  })
  @ApiOkResponse({
    description: 'The open pending scan that the repeat scan added to.',
    type: PendingScan,
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
    PROBLEM_TYPES.unknownId,
    PROBLEM_TYPES.grocyUnavailable,
  )
  @NoQuery()
  @ZodSerializerDto(PendingScan)
  async create(
    @Body() body: CreatePendingScan,
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<PendingScan> {
    const { isMerged, pendingScan } = await this.pendingScans.create(
      body,
      'merge',
    );
    if (isMerged) {
      response.statusCode = HttpStatus.OK;
    } else {
      response.setHeader(LOCATION_HEADER, locationOf(request, pendingScan.id));
    }
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

  // The update is a JSON merge patch on the writable fields. An absent field
  // stays as it is. A field set to null clears it. An update that sets a
  // product writes to Grocy, so it can fail with the Grocy problems.
  @Patch(':id')
  @ApiOperation({
    operationId: 'updatePendingScan',
    summary: 'Update one pending scan.',
  })
  @ApiOkResponse({
    description: 'The pending scan after the update.',
    type: PendingScan,
  })
  @ApiProblemResponses(
    PROBLEM_TYPES.validation,
    PROBLEM_TYPES.notJson,
    PROBLEM_TYPES.notFound,
    PROBLEM_TYPES.bookingTypeFixed,
    PROBLEM_TYPES.unknownId,
    PROBLEM_TYPES.grocyRefused,
    PROBLEM_TYPES.grocyUnavailable,
  )
  @NoQuery()
  @ZodSerializerDto(PendingScan)
  update(
    @Param() parameters: PendingScanId,
    @Body() body: UpdatePendingScan,
  ): Promise<PendingScan> {
    return this.pendingScans.update(parameters.id, body);
  }

  // The reject. The response is the row as it was before the delete.
  @Delete(':id')
  @ApiOperation({
    operationId: 'deletePendingScan',
    summary: 'Delete one pending scan.',
  })
  @ApiOkResponse({
    description: 'The pending scan as it was before the delete.',
    type: PendingScan,
  })
  @ApiProblemResponses(PROBLEM_TYPES.validation, PROBLEM_TYPES.notFound)
  @NoQuery()
  @ZodSerializerDto(PendingScan)
  delete(@Param() parameters: PendingScanId): Promise<PendingScan> {
    return this.pendingScans.delete(parameters.id);
  }
}
