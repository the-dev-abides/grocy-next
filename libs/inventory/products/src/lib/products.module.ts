import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { GrocyClient } from './grocy/grocy-client.ts';
import { readGrocyOptions } from './grocy/grocy-options.ts';
import { ProductsController } from './products.controller.ts';

// The Products subdomain of the Inventory domain. In milestone 1 it holds the
// Grocy API client and the product list operation. The HTTP module factory
// reads the Grocy variables at start, so a missing variable stops the
// process before it listens.
@Module({
  controllers: [ProductsController],
  imports: [
    HttpModule.registerAsync({
      useFactory: () => {
        const options = readGrocyOptions();
        return {
          baseURL: options.url,
          headers: { 'GROCY-API-KEY': options.apiKey },
        };
      },
    }),
  ],
  providers: [GrocyClient],
})
export class ProductsModule {}
