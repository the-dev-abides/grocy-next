import type { GrocyRefusal } from '@grocy-next/shared-next-api';

import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

import type {
  ProductDetails,
  QuantityUnitConversion,
} from '../product-details.ts';
import type { ProductListItem } from '../product.ts';
import type { Purchase, PurchaseResult } from '../purchase.ts';
import type {
  GrocyMasterDataTable,
  MasterDataRow,
} from './grocy-master-data.ts';
import type { GrocyProduct } from './grocy-product.ts';

import { grocyConversionsSchema, toConversions } from './grocy-conversions.ts';
import {
  grocyMasterDataRowsSchema,
  toMasterDataRows,
} from './grocy-master-data.ts';
import {
  grocyProductDetailsSchema,
  toProductDetails,
} from './grocy-product-details.ts';
import { toGrocyPurchaseBody } from './grocy-purchase.ts';
import { grocyStockLogRowsSchema, toStockLogRows } from './grocy-stock-log.ts';

// The body of a Grocy refusal: 400 with the error message.
const grocyErrorSchema = z.looseObject({ error_message: z.string() });
// The answer of a Grocy object create: the id of the new row.
const grocyCreatedSchema = z.looseObject({
  created_object_id: z.coerce.number(),
});

// The result of a product barcode create: the id of the new product barcode,
// or the refusal that Grocy answered with 400.
export type ProductBarcodeResult =
  { grocy: GrocyRefusal; isRefused: true } | { id: number; isRefused: false };

// Grocy answers a handled refusal with 400 and `{"error_message": ...}`. On
// a product details read, the refusal means no match: an unknown barcode,
// a Grocycode of another type, or an unknown or inactive product.
function isGrocyRefusal(error: unknown): boolean {
  return (
    isAxiosError(error) && error.response?.status === HttpStatus.BAD_REQUEST
  );
}

// The status and the message of a Grocy refusal, for the `grocy` field of
// the grocy-refused problem. A refusal body with no message gives the
// status text of the response.
function grocyRefusalOf(error: unknown): GrocyRefusal | null {
  if (!isGrocyRefusal(error) || !isAxiosError(error) || !error.response) {
    return null;
  }
  const { status, statusText } = error.response;
  const data: unknown = error.response.data;
  const body = grocyErrorSchema.safeParse(data);
  return {
    message: body.success ? body.data.error_message : statusText,
    status,
  };
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

  // This method adds a code as a product barcode of one product. Grocy
  // answers the id of the new row, or 400 with the reason when Grocy refuses
  // it, for example when another product has the code.
  async createProductBarcode(
    productId: number,
    barcode: string,
  ): Promise<ProductBarcodeResult> {
    let data: unknown;
    try {
      ({ data } = await firstValueFrom(
        this.http.post<unknown>('/api/objects/product_barcodes', {
          barcode,
          product_id: productId,
        }),
      ));
    } catch (error) {
      const grocy = grocyRefusalOf(error);
      if (grocy !== null) {
        return { grocy, isRefused: true };
      }
      throw grocyUnavailable(error);
    }
    return {
      id: grocyCreatedSchema.parse(data).created_object_id,
      isRefused: false,
    };
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

  // This method books a purchase of one product. Grocy answers the stock log
  // rows of the new transaction, or 400 with the reason when Grocy refuses
  // the purchase. The caller stores the reason on the pending scan.
  async purchase(
    productId: number,
    purchase: Purchase,
  ): Promise<PurchaseResult> {
    let data: unknown;
    try {
      ({ data } = await firstValueFrom(
        this.http.post<unknown>(
          `/api/stock/products/${String(productId)}/add`,
          toGrocyPurchaseBody(purchase),
        ),
      ));
    } catch (error) {
      const grocy = grocyRefusalOf(error);
      if (grocy !== null) {
        return { grocy, isRefused: true };
      }
      throw grocyUnavailable(error);
    }
    return {
      isRefused: false,
      rows: toStockLogRows(grocyStockLogRowsSchema.parse(data)),
    };
  }

  // The product details by id, or null when no active product has the id.
  readProductDetails(productId: number): Promise<null | ProductDetails> {
    return this.readDetails(`/api/stock/products/${String(productId)}`);
  }

  // The resolved conversions of one product: every pair of quantity units
  // with a path between them and the factor of the path. Grocy answers an
  // empty list for an unknown product.
  async readResolvedConversions(
    productId: number,
  ): Promise<QuantityUnitConversion[]> {
    let data: unknown;
    try {
      ({ data } = await firstValueFrom(
        this.http.get<unknown>(
          '/api/objects/quantity_unit_conversions_resolved',
          { params: { 'query[]': `product_id=${String(productId)}` } },
        ),
      ));
    } catch (error) {
      throw grocyUnavailable(error);
    }
    return toConversions(grocyConversionsSchema.parse(data));
  }

  // The product details by product barcode, or null when no product barcode
  // matches the code. Grocy ignores case on the match.
  readProductDetailsByBarcode(code: string): Promise<null | ProductDetails> {
    return this.readDetails(
      `/api/stock/products/by-barcode/${encodeURIComponent(code)}`,
    );
  }
}
