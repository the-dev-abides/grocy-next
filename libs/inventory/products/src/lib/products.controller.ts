import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  ApiProblemResponses,
  LOCATION_HEADER,
  locationOf,
  NoQuery,
  PROBLEM_TYPES,
  ProblemException,
} from '@grocy-next/shared-next-api';
import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';

import { GrocyClient } from './grocy/grocy-client.ts';
import { toProduct } from './product-details.ts';
import { CreateProduct, Product, ProductId, ProductList } from './product.ts';
import { ProductsService } from './products.service.ts';

// The product operations of the Next API. The controller is a surface and
// holds no rules.
@Controller('products')
export class ProductsController {
  constructor(
    private readonly grocy: GrocyClient,
    private readonly products: ProductsService,
  ) {}

  // The create of the short product form. The response is the product as
  // Grocy stores it, with the path of the new product in the `Location`
  // header. The create writes to Grocy, so it can fail with the Grocy
  // problems.
  @Post()
  @ApiOperation({
    operationId: 'createProduct',
    summary: 'Create a product.',
  })
  @ApiCreatedResponse({
    description: 'The product as Grocy stores it.',
    headers: {
      [LOCATION_HEADER]: {
        description: 'The path of the new product.',
        schema: { type: 'string' },
      },
    },
    type: Product,
  })
  @ApiProblemResponses(
    PROBLEM_TYPES.validation,
    PROBLEM_TYPES.notJson,
    PROBLEM_TYPES.unknownId,
    PROBLEM_TYPES.grocyRefused,
    PROBLEM_TYPES.grocyUnavailable,
  )
  @NoQuery()
  @ZodSerializerDto(Product)
  async create(
    @Body() body: CreateProduct,
    @Req() request: IncomingMessage,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<Product> {
    const product = await this.products.create(body);
    response.setHeader(LOCATION_HEADER, locationOf(request, product.id));
    return product;
  }

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
