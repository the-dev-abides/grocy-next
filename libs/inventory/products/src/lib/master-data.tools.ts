import {
  NoToolInput,
  ToolInput,
  toolInputOf,
} from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';
import { Tool } from '@nestjs/mcp';

import { GrocyClient } from './grocy/grocy-client.ts';
import {
  LocationList,
  ProductGroupList,
  QuantityUnitConversionList,
  QuantityUnitList,
  StoreList,
} from './master-data.ts';

// The MCP tools of the master data list operations, as ADR 0012 decided.
@Injectable()
export class MasterDataTools {
  constructor(private readonly grocy: GrocyClient) {}

  @Tool({
    description:
      'List every active location. The result is an `items` list of the id and the name of each location.',
    inputSchema: toolInputOf(NoToolInput),
    name: 'list_locations',
    outputSchema: LocationList.schema,
  })
  @ToolInput(NoToolInput)
  async listLocations(): Promise<LocationList> {
    return { items: await this.grocy.listLocations() };
  }

  @Tool({
    description:
      'List every active product group. The result is an `items` list of the id and the name of each product group.',
    inputSchema: toolInputOf(NoToolInput),
    name: 'list_product_groups',
    outputSchema: ProductGroupList.schema,
  })
  @ToolInput(NoToolInput)
  async listProductGroups(): Promise<ProductGroupList> {
    return { items: await this.grocy.listProductGroups() };
  }

  @Tool({
    description:
      'List every household quantity unit conversion, which is a conversion with no product. The result is an `items` list of the from unit id, the to unit id, and the factor of each conversion.',
    inputSchema: toolInputOf(NoToolInput),
    name: 'list_quantity_unit_conversions',
    outputSchema: QuantityUnitConversionList.schema,
  })
  @ToolInput(NoToolInput)
  async listQuantityUnitConversions(): Promise<QuantityUnitConversionList> {
    return { items: await this.grocy.listHouseholdConversions() };
  }

  @Tool({
    description:
      'List every active quantity unit. The result is an `items` list of the id and the name of each quantity unit.',
    inputSchema: toolInputOf(NoToolInput),
    name: 'list_quantity_units',
    outputSchema: QuantityUnitList.schema,
  })
  @ToolInput(NoToolInput)
  async listQuantityUnits(): Promise<QuantityUnitList> {
    return { items: await this.grocy.listQuantityUnits() };
  }

  @Tool({
    description:
      'List every active store. The result is an `items` list of the id and the name of each store.',
    inputSchema: toolInputOf(NoToolInput),
    name: 'list_stores',
    outputSchema: StoreList.schema,
  })
  @ToolInput(NoToolInput)
  async listStores(): Promise<StoreList> {
    return { items: await this.grocy.listStores() };
  }
}
