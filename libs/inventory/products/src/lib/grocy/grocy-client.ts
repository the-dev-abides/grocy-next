import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Product } from '../product.ts';
import { GrocyProduct } from './grocy-product.ts';

// The Grocy API client. It reads and writes a running Grocy instance through
// the Grocy API and returns the Next API shapes. The HTTP module carries the
// Grocy address and the API key header on every request. The client is
// temporary. Grocy owns the data until API parity.
@Injectable()
export class GrocyClient {
  constructor(private readonly http: HttpService) {}

  // The objects endpoint returns every product in one response. Grocy has no
  // page size, so the list has no cut-off.
  async listProducts(): Promise<Product[]> {
    const response = await firstValueFrom(
      this.http.get<GrocyProduct[]>('/api/objects/products'),
    );
    return response.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
    }));
  }
}
