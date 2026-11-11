import {
  ApiProblemResponses,
  NoQuery,
  PROBLEM_TYPES,
} from '@grocy-next/shared-next-api';
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';

import { GrocyClient } from './grocy/grocy-client.ts';
import { ProductList } from './product.ts';

// The product list operation of the Next API. The controller is a surface
// and holds no rules.
@Controller('products')
export class ProductsController {
  constructor(private readonly grocy: GrocyClient) {}

  // A full list has no cut-off. The operation returns every product in the
  // `items` envelope and takes no query field.
  @Get()
  @ApiOperation({ operationId: 'listProducts', summary: 'List every product.' })
  @ApiOkResponse({ description: 'Every product.', type: ProductList })
  @ApiProblemResponses(PROBLEM_TYPES.validation)
  @NoQuery()
  @ZodSerializerDto(ProductList)
  async list(): Promise<ProductList> {
    return { items: await this.grocy.listProducts() };
  }
}
