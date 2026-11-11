import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { GrocyClient } from './grocy/grocy-client.ts';
import { readGrocyOptions } from './grocy/grocy-options.ts';
import { MasterDataController } from './master-data.controller.ts';
import { ProductsController } from './products.controller.ts';

// The Products subdomain of the Inventory domain. It holds the Grocy API
// client, the product list operation, and the four master data lists. The
// module exports the client, so the review queue resolves a code against the
// product barcodes in Grocy. The HTTP module factory reads the Grocy
// variables at start, so a missing variable stops the process before it
// listens.
@Module({
  controllers: [ProductsController, MasterDataController],
  exports: [GrocyClient],
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
