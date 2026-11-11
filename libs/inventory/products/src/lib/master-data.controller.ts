import {
  ApiProblemResponses,
  NoQuery,
  PROBLEM_TYPES,
} from '@grocy-next/shared-next-api';
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';

import { GrocyClient } from './grocy/grocy-client.ts';
import {
  LocationList,
  ProductGroupList,
  QuantityUnitConversionList,
  QuantityUnitList,
  StoreList,
} from './master-data.ts';

// The master data list operations of the Next API. Each of the four lists
// holds the active rows of one Grocy table. The fifth list holds the
// household quantity unit conversions. The controller is a surface and holds no
// rules.
@Controller()
export class MasterDataController {
  constructor(private readonly grocy: GrocyClient) {}

  @Get('locations')
  @ApiOperation({
    operationId: 'listLocations',
    summary: 'List every active location.',
  })
  @ApiOkResponse({ description: 'Every active location.', type: LocationList })
  @ApiProblemResponses(PROBLEM_TYPES.validation, PROBLEM_TYPES.grocyUnavailable)
  @NoQuery()
  @ZodSerializerDto(LocationList)
  async listLocations(): Promise<LocationList> {
    return { items: await this.grocy.listLocations() };
  }

  @Get('stores')
  @ApiOperation({
    operationId: 'listStores',
    summary: 'List every active store.',
  })
  @ApiOkResponse({ description: 'Every active store.', type: StoreList })
  @ApiProblemResponses(PROBLEM_TYPES.validation, PROBLEM_TYPES.grocyUnavailable)
  @NoQuery()
  @ZodSerializerDto(StoreList)
  async listStores(): Promise<StoreList> {
    return { items: await this.grocy.listStores() };
  }

  @Get('product-groups')
  @ApiOperation({
    operationId: 'listProductGroups',
    summary: 'List every active product group.',
  })
  @ApiOkResponse({
    description: 'Every active product group.',
    type: ProductGroupList,
  })
  @ApiProblemResponses(PROBLEM_TYPES.validation, PROBLEM_TYPES.grocyUnavailable)
  @NoQuery()
  @ZodSerializerDto(ProductGroupList)
  async listProductGroups(): Promise<ProductGroupList> {
    return { items: await this.grocy.listProductGroups() };
  }

  @Get('quantity-units')
  @ApiOperation({
    operationId: 'listQuantityUnits',
    summary: 'List every active quantity unit.',
  })
  @ApiOkResponse({
    description: 'Every active quantity unit.',
    type: QuantityUnitList,
  })
  @ApiProblemResponses(PROBLEM_TYPES.validation, PROBLEM_TYPES.grocyUnavailable)
  @NoQuery()
  @ZodSerializerDto(QuantityUnitList)
  async listQuantityUnits(): Promise<QuantityUnitList> {
    return { items: await this.grocy.listQuantityUnits() };
  }

  @Get('quantity-unit-conversions')
  @ApiOperation({
    operationId: 'listQuantityUnitConversions',
    summary: 'List every household quantity unit conversion.',
  })
  @ApiOkResponse({
    description: 'Every household quantity unit conversion.',
    type: QuantityUnitConversionList,
  })
  @ApiProblemResponses(PROBLEM_TYPES.validation, PROBLEM_TYPES.grocyUnavailable)
  @NoQuery()
  @ZodSerializerDto(QuantityUnitConversionList)
  async listQuantityUnitConversions(): Promise<QuantityUnitConversionList> {
    return { items: await this.grocy.listHouseholdConversions() };
  }
}
