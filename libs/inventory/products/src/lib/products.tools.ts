import { noQuerySchema } from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';
import { Tool } from '@nestjs/mcp';

import { GrocyClient } from './grocy/grocy-client.ts';
import { ProductList } from './product.ts';

// The MCP tools of the product operations, as ADR 0012 decided. A tool is a
// surface and holds no rules. It takes the schema of the controller as its
// input schema and the response schema as its output schema. It calls the
// same method as the controller with the same arguments. The library exports
// this provider, and the API app registers it with the MCP module.
@Injectable()
export class ProductsTools {
  constructor(private readonly grocy: GrocyClient) {}

  @Tool({
    description:
      'List every product. The result is the product list of the Next API: an object with an `items` list of the id, the name, and the description of each product.',
    inputSchema: noQuerySchema,
    name: 'list_products',
    outputSchema: ProductList.schema,
  })
  async listProducts(): Promise<ProductList> {
    return { items: await this.grocy.listProducts() };
  }
}
