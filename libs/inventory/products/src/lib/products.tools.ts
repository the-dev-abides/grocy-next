import {
  NoToolInput,
  ToolInput,
  toolInputOf,
} from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';
import { Tool } from '@nestjs/mcp';

import { GrocyClient } from './grocy/grocy-client.ts';
import { CreateProduct, Product, ProductId, ProductList } from './product.ts';
import { ProductsService } from './products.service.ts';

// The MCP tools of the product operations, as ADR 0012 decided. A tool is a
// surface and holds no rules. It takes the schema of the controller as its
// input schema and the response schema as its output schema. It calls the
// same method as the controller with the same arguments. The library exports
// this provider, and the API app registers it with the MCP module.
@Injectable()
export class ProductsTools {
  constructor(
    private readonly grocy: GrocyClient,
    private readonly products: ProductsService,
  ) {}

  @Tool({
    description:
      'Read one product by its id. The result is the product with its units, its stock amount, its stock entries, and its conversions.',
    inputSchema: toolInputOf(ProductId),
    name: 'get_product',
    outputSchema: Product.schema,
  })
  async getProduct(input: ProductId): Promise<Product> {
    return this.products.read(input.id);
  }

  @Tool({
    description:
      'Create a product with the short product form. The result is the new product as Grocy stores it.',
    inputSchema: toolInputOf(CreateProduct),
    name: 'create_product',
    outputSchema: Product.schema,
  })
  async createProduct(input: CreateProduct): Promise<Product> {
    return this.products.create(input);
  }

  @Tool({
    description:
      'List every product. The result is an `items` list of the id, the name, and the description of each product.',
    inputSchema: toolInputOf(NoToolInput),
    name: 'list_products',
    outputSchema: ProductList.schema,
  })
  @ToolInput(NoToolInput)
  async listProducts(): Promise<ProductList> {
    return { items: await this.grocy.listProducts() };
  }
}
