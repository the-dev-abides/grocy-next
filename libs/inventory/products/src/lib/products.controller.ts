import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

import { GrocyClient } from './grocy/grocy-client.ts';
import { Product } from './product.ts';

// The product list operation of the Next API. The controller is a surface
// and holds no rules.
@Controller('products')
export class ProductsController {
  constructor(private readonly grocy: GrocyClient) {}

  // A full list has no cut-off. The operation returns every product.
  @Get()
  @ApiOperation({ summary: 'List every product.' })
  @ApiOkResponse({ isArray: true, type: Product })
  list(): Promise<Product[]> {
    return this.grocy.listProducts();
  }
}
