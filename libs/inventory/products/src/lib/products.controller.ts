import {
  ApiProblemResponses,
  NoQuery,
  PROBLEM_TYPES,
  ProblemException,
} from '@grocy-next/shared-next-api';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';

import { GrocyClient } from './grocy/grocy-client.ts';
import { toProduct } from './product-details.ts';
import { Product, ProductId, ProductList } from './product.ts';

// The product operations of the Next API. The controller is a surface and
// holds no rules.
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

  // The read of one product. Grocy answers an unknown id and an inactive
  // product with one refusal, so both are the not-found problem.
  @Get(':id')
  @ApiOperation({ operationId: 'getProduct', summary: 'Read one product.' })
  @ApiOkResponse({ description: 'The product.', type: Product })
  @ApiProblemResponses(
    PROBLEM_TYPES.validation,
    PROBLEM_TYPES.notFound,
    PROBLEM_TYPES.grocyUnavailable,
  )
  @NoQuery()
  @ZodSerializerDto(Product)
  async read(@Param() parameters: ProductId): Promise<Product> {
    const details = await this.grocy.readProductDetails(parameters.id);
    if (details === null) {
      throw new ProblemException(
        PROBLEM_TYPES.notFound,
        `No product has the id ${String(parameters.id)}.`,
      );
    }
    return toProduct(details);
  }
}
