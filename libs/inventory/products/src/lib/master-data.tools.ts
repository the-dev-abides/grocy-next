import { NoInputTool } from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';

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

  @NoInputTool({
    description:
      'List every active location. The result is an `items` list of the id and the name of each location.',
    name: 'list_locations',
    outputSchema: LocationList.schema,
  })
  async listLocations(): Promise<LocationList> {
    return { items: await this.grocy.listLocations() };
  }

  @NoInputTool({
    description:
      'List every active product group. The result is an `items` list of the id and the name of each product group.',
    name: 'list_product_groups',
    outputSchema: ProductGroupList.schema,
  })
  async listProductGroups(): Promise<ProductGroupList> {
    return { items: await this.grocy.listProductGroups() };
  }

  @NoInputTool({
    description:
      'List every household quantity unit conversion, which is a conversion with no product. The result is an `items` list of the from unit id, the to unit id, and the factor of each conversion.',
    name: 'list_quantity_unit_conversions',
    outputSchema: QuantityUnitConversionList.schema,
  })
  async listQuantityUnitConversions(): Promise<QuantityUnitConversionList> {
    return { items: await this.grocy.listHouseholdConversions() };
  }

  @NoInputTool({
    description:
      'List every active quantity unit. The result is an `items` list of the id and the name of each quantity unit.',
    name: 'list_quantity_units',
    outputSchema: QuantityUnitList.schema,
  })
  async listQuantityUnits(): Promise<QuantityUnitList> {
    return { items: await this.grocy.listQuantityUnits() };
  }

  @NoInputTool({
    description:
      'List every active store. The result is an `items` list of the id and the name of each store.',
    name: 'list_stores',
    outputSchema: StoreList.schema,
  })
  async listStores(): Promise<StoreList> {
    return { items: await this.grocy.listStores() };
  }
}
