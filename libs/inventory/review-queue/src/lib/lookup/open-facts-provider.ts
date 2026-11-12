import type { LookupHit, LookupProvider } from './lookup-provider.ts';

import { now } from '../storage/timestamp.ts';
import { RateLimitError } from './lookup-provider.ts';
import {
  OPEN_FACTS_FIELDS,
  openFactsAnswerSchema,
  toLookupHit,
} from './open-facts-product.ts';

// Open Facts counts product reads per clock minute and per IP address.
const RATE_PER_MINUTE = 15;
// A read that takes longer than this is a failed lookup.
const TIMEOUT_MS = 10_000;
// The statuses that the lookup tells apart: the product on no host, and the
// rate budget of the clock minute spent.
const NOT_FOUND = 404;
const TOO_MANY_REQUESTS = 429;
// The attribution that Open Facts asks for. The screens show it with the name
// of the service that held the product.
const ATTRIBUTION =
  'Contains data from Open Food Facts, available under the Open Database License';
// Open Facts asks for a user agent that names the app and a contact. The
// contact is the project page.
const PROJECT_URL = 'https://github.com/the-dev-abides/grocy-next';

// The service names of the Open Facts family, by the host that holds the
// product. A v3 read with `product_type=all` redirects to that host. Any other
// host, such as the mock of the tests, counts as Open Food Facts.
function serviceOf(host: string): string {
  if (host.includes('openbeautyfacts')) {
    return 'Open Beauty Facts';
  }
  if (host.includes('openpetfoodfacts')) {
    return 'Open Pet Food Facts';
  }
  if (host.includes('openproductsfacts')) {
    return 'Open Products Facts';
  }
  return 'Open Food Facts';
}

// The one lookup provider: the Open Facts family, as ADR 0011 decided. It sends
// one v3 read to the Open Facts base URL with `product_type=all` and the fields
// it needs. It follows the redirect to the host that holds the product. It
// names the service after the final host.
export class OpenFactsProvider implements LookupProvider {
  readonly attribution = ATTRIBUTION;
  readonly ratePerMinute = RATE_PER_MINUTE;
  readonly userAgent: string;

  constructor(
    private readonly baseUrl: string,
    apiVersion: string,
  ) {
    this.userAgent = `GrocyNext/${apiVersion} (${PROJECT_URL})`;
  }

  // The hit, or null on a miss. A 429 is a `RateLimitError`. A timeout, a
  // network error, and any other status are errors that the worker logs.
  async lookup(code: string, signal: AbortSignal): Promise<LookupHit | null> {
    const url = new URL(
      `/api/v3/product/${encodeURIComponent(code)}`,
      this.baseUrl,
    );
    url.searchParams.set('product_type', 'all');
    url.searchParams.set('fields', OPEN_FACTS_FIELDS.join(','));
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': this.userAgent },
      redirect: 'follow',
      signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
    });
    const { host, origin } = new URL(response.url);
    const service = serviceOf(host);
    if (response.status === TOO_MANY_REQUESTS) {
      throw new RateLimitError(service);
    }
    if (response.status === NOT_FOUND) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`${service} answered ${String(response.status)}.`);
    }
    const answer = openFactsAnswerSchema.parse(await response.json());
    // A 12-digit UPC-A code gets `success_with_warnings`: Open Food Facts
    // stores the product under the 13-digit form with a leading zero.
    if (!answer.status.startsWith('success') || answer.product === undefined) {
      return null;
    }
    return toLookupHit(answer.product, {
      fetchedAt: now(),
      service,
      sourceUrl: `${origin}/product/${encodeURIComponent(code)}`,
    });
  }
}
