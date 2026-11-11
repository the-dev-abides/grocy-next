import type { GrocyRefusal } from '@grocy-next/shared-next-api';
import type { AxiosResponse } from 'axios';
import type { Observable } from 'rxjs';

import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import type { ProductConversion } from '../product-conversion.ts';
import type { ProductDetails } from '../product-details.ts';
import type { ProductListItem } from '../product.ts';
import type {
  CreatedObjectResult,
  GrocyAnswer,
  GrocyWritableTable,
} from './grocy-answers.ts';
import type {
  GrocyMasterDataTable,
  MasterDataRow,
} from './grocy-master-data.ts';
import type { GrocyProductBody } from './grocy-product-body.ts';
import type { GrocyProductConversionBody } from './grocy-product-conversions.ts';
import type { GrocyProduct } from './grocy-product.ts';

import { toBase64 } from './base64.ts';
import {
  createdIdOf,
  dataOf,
  grocyErrorSchema,
  resultOf,
} from './grocy-answers.ts';
import {
  grocyMasterDataRowsSchema,
  toMasterDataRows,
} from './grocy-master-data.ts';
import {
  grocyProductConversionsSchema,
  toProductConversions,
} from './grocy-product-conversions.ts';
import {
  grocyProductDetailsSchema,
  toProductDetails,
} from './grocy-product-details.ts';

// The status and the message of a Grocy refusal, for the `grocy` field of
// the grocy-refused problem. A refusal body with no message gives the
// status text of the response.
function grocyRefusalOf(error: unknown): GrocyRefusal | null {
  if (
    !isAxiosError(error) ||
    error.response?.status !== HttpStatus.BAD_REQUEST
  ) {
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
// Grocy address and the API key header on every request. This file is the
// one file that maps the axios errors, so every Grocy call goes through its
// `send`. The stock bookings are in the Grocy stock client, which calls
// through this client. The client is temporary. Grocy owns the data until
// API parity.
@Injectable()
export class GrocyClient {
  constructor(private readonly http: HttpService) {}

  // One Grocy call. A 400 comes back as the refusal. Every other failure is
  // the grocy-unavailable problem.
  private async send(
    request: Observable<AxiosResponse<unknown>>,
  ): Promise<GrocyAnswer> {
    try {
      const { data } = await firstValueFrom(request);
      return { data, grocy: null };
    } catch (error) {
      const grocy = grocyRefusalOf(error);
      if (grocy === null) {
        throw grocyUnavailable(error);
      }
      return { data: null, grocy };
    }
  }

  // The active rows of one master data table. The Grocy objects endpoint
  // returns every row in one response and filters with `query[]=active=1`.
  private async listActiveRows(
    table: GrocyMasterDataTable,
  ): Promise<MasterDataRow[]> {
    const data = await this.query(table, 'active=1');
    return toMasterDataRows(grocyMasterDataRowsSchema.parse(data));
  }

  // The product details, or null on a refusal. The refusal means no match: an
  // unknown barcode, a Grocycode of another type, or an unknown or inactive
  // product.
  private async readDetails(path: string): Promise<null | ProductDetails> {
    const answer = await this.send(this.http.get<unknown>(path));
    return answer.grocy === null
      ? toProductDetails(grocyProductDetailsSchema.parse(answer.data))
      : null;
  }

  // One row into one Grocy table through the Grocy objects endpoint. Grocy
  // answers the id of the new row, or 400 with the reason when Grocy refuses
  // the row, for example when a unique column has the value already.
  private async createObject(
    table: GrocyWritableTable,
    body: unknown,
  ): Promise<CreatedObjectResult> {
    const answer = await this.post(`/api/objects/${table}`, body);
    return resultOf(answer, createdIdOf);
  }

  // One Grocy update. Grocy answers 204 and no body.
  private async put(path: string, body: unknown, headers = {}): Promise<void> {
    dataOf(await this.send(this.http.put(path, body, { headers })));
  }

  // One Grocy read. The stock client reads the stock entries through it.
  async get(path: string, query = {}): Promise<unknown> {
    return dataOf(
      await this.send(this.http.get<unknown>(path, { params: query })),
    );
  }

  // One Grocy objects read with a `query[]` filter. The stock client reads
  // the resolved conversions through it.
  query(table: string, filter: string): Promise<unknown> {
    return this.get(`/api/objects/${table}`, { 'query[]': filter });
  }

  // One Grocy write with a body. The answer carries the refusal when Grocy
  // answered 400, so the caller stores the reason. The stock client books
  // through it.
  post(path: string, body: unknown): Promise<GrocyAnswer> {
    return this.send(this.http.post<unknown>(path, body));
  }

  // This method creates one product. Grocy answers the id of the new row, or
  // 400 with the reason when Grocy refuses it, for example when another
  // product has the name. Grocy does not check that the ids of the body name
  // a row, so the caller checks them first.
  createProduct(body: GrocyProductBody): Promise<CreatedObjectResult> {
    return this.createObject('products', body);
  }

  // This method adds a code as a product barcode of one product. Grocy
  // refuses it, for example, when another product has the code.
  createProductBarcode(
    productId: number,
    barcode: string,
  ): Promise<CreatedObjectResult> {
    return this.createObject('product_barcodes', {
      barcode,
      product_id: productId,
    });
  }

  // This method adds one conversion row of one product. Grocy refuses it,
  // for example, when the product has a row for the pair of units already.
  createProductConversion(
    body: GrocyProductConversionBody,
  ): Promise<CreatedObjectResult> {
    return this.createObject('quantity_unit_conversions', body);
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

  // The conversion rows of one product in the Grocy table
  // `quantity_unit_conversions`: the rows that the Grocy trigger created for
  // the product and the rows that the household added. Grocy answers an
  // empty list for an unknown product.
  async readProductConversions(
    productId: number,
  ): Promise<ProductConversion[]> {
    const data = await this.query(
      'quantity_unit_conversions',
      `product_id=${String(productId)}`,
    );
    return toProductConversions(grocyProductConversionsSchema.parse(data));
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

  // This method sets the factor of one conversion row.
  setConversionFactor(id: number, factor: number): Promise<void> {
    return this.put(`/api/objects/quantity_unit_conversions/${String(id)}`, {
      factor,
    });
  }

  // This method sets the picture of one product to a file that the product
  // picture upload stored.
  setProductPicture(productId: number, fileName: string): Promise<void> {
    return this.put(`/api/objects/products/${String(productId)}`, {
      picture_file_name: fileName,
    });
  }

  // This method uploads one file as a product picture through the Grocy file
  // API. The file name, with its extension, goes BASE64 encoded in the path.
  uploadProductPicture(fileName: string, bytes: Uint8Array): Promise<void> {
    const encodedName = toBase64(fileName);
    return this.put(
      `/api/files/productpictures/${encodeURIComponent(encodedName)}`,
      Buffer.from(bytes),
      { 'content-type': 'application/octet-stream' },
    );
  }
}
