import {
  ApiProblemResponses,
  NoQuery,
  PROBLEM_TYPES,
} from '@grocy-next/shared-next-api';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';

import { Booking, CreateBooking } from './booking.ts';
import { BookingsService } from './bookings.service.ts';

// The booking operation of the Next API: the accept of a pending scan. The
// controller is a surface and holds no rules.
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // The accept answers 200 with the booking, as ADR 0014 decided, because
  // the response carries the values that Grocy stored and no new Next API
  // resource has a path.
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'createBooking',
    summary: 'Accept a pending scan as a booking.',
  })
  @ApiOkResponse({
    description: 'The booking with the values that Grocy stored.',
    type: Booking,
  })
  @ApiProblemResponses(
    PROBLEM_TYPES.validation,
    PROBLEM_TYPES.notFound,
    PROBLEM_TYPES.noProduct,
    PROBLEM_TYPES.noAmount,
    PROBLEM_TYPES.notJson,
    PROBLEM_TYPES.unknownId,
    PROBLEM_TYPES.noConversion,
    PROBLEM_TYPES.grocyRefused,
    PROBLEM_TYPES.grocyUnavailable,
  )
  @NoQuery()
  @ZodSerializerDto(Booking)
  create(@Body() body: CreateBooking): Promise<Booking> {
    return this.bookings.create(body);
  }
}
