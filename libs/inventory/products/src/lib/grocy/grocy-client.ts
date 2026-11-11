import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import type { ProductDetails } from '../product-details.ts';
import type { ProductListItem } from '../product.ts';
import type {
  GrocyMasterDataTable,
  MasterDataRow,
} from './grocy-master-data.ts';
import type { GrocyProduct } from './grocy-product.ts';

import {
  grocyMasterDataRowsSchema,
  toMasterDataRows,
} from './grocy-master-data.ts';
import {
  grocyProductDetailsSchema,
  toProductDetails,
} from './grocy-product-details.ts';

// Grocy answers a handled refusal with 400 and `{"error_message": ...}`. On
// a product details read, the refusal means no match: an unknown barcode,
// a Grocycode of another type, or an unknown or inactive product.
function isGrocyRefusal(error: unknown): boolean {
  return (
    isAxiosError(error) && error.response?.status === HttpStatus.BAD_REQUEST
  );
}

// Grocy answered 500, or Grocy did not answer. The Next API answers 502, as
// ADR 0014 decided.
function grocyUnavailable(error: unknown): unknown {
  if (!isAxiosError(error)) {
    return error;
  }
  const detail =
    error.response === undefined
      ? 'Grocy did not answer.'
      : `Grocy answered ${String(error.response.status)}.`;
  return new ProblemException(PROBLEM_TYPES.grocyUnavailable, detail);
}

// The Grocy API client. It reads and writes a running Grocy instance through
// the Grocy API and returns the Next API shapes. The HTTP module carries the
// Grocy address and the API key header on every request. The client is
// temporary. Grocy owns the data until API parity.
@Injectable()
export class GrocyClient {
  constructor(private readonly http: HttpService) {}

  // The active rows of one master data table. The Grocy objects endpoint
  // returns every row in one response and filters with `query[]=active=1`.
  private async listActiveRows(
    table: GrocyMasterDataTable,
  ): Promise<MasterDataRow[]> {
    let data: unknown;
    try {
      ({ data } = await firstValueFrom(
        this.http.get<unknown>(`/api/objects/${table}`, {
          params: { 'query[]': 'active=1' },
        }),
      ));
    } catch (error) {
      throw grocyUnavailable(error);
    }
    return toMasterDataRows(grocyMasterDataRowsSchema.parse(data));
  }

  private async readDetails(path: string): Promise<null | ProductDetails> {
    let data: unknown;
    try {
      ({ data } = await firstValueFrom(this.http.get<unknown>(path)));
    } catch (error) {
      if (isGrocyRefusal(error)) {
        return null;
      }
      throw grocyUnavailable(error);
    }
    return toProductDetails(grocyProductDetailsSchema.parse(data));
  }

  listLocations(): Promise<MasterDataRow[]> {
    return this.listActiveRows('locations');
  }

  listProductGroups(): Promise<MasterDataRow[]> {
    return this.listActiveRows('product_groups');
  }

  listQuantityUnits(): Promise<MasterDataRow[]> {
    return this.listActiveRows('quantity_units');
  }

  // The store is `shopping_locations` in Grocy.
  listStores(): Promise<MasterDataRow[]> {
    return this.listActiveRows('shopping_locations');
  }

  // The objects endpoint returns every product in one response. Grocy has no
  // page size, so the list has no cut-off.
  async listProducts(): Promise<ProductListItem[]> {
    const response = await firstValueFrom(
      this.http.get<GrocyProduct[]>('/api/objects/products'),
    );
    return response.data.map((product) => {
      return {
        description: product.description,
        id: product.id,
        name: product.name,
      };
    });
  }

  // The product details by id, or null when no active product has the id.
  readProductDetails(productId: number): Promise<null | ProductDetails> {
    return this.readDetails(`/api/stock/products/${String(productId)}`);
  }

  // The product details by product barcode, or null when no product barcode
  // matches the code. Grocy ignores case on the match.
  readProductDetailsByBarcode(code: string): Promise<null | ProductDetails> {
    return this.readDetails(
      `/api/stock/products/by-barcode/${encodeURIComponent(code)}`,
    );
  }
}
