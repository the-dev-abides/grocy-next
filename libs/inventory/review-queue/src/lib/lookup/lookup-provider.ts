import type { LookupResult } from '../pending-scan.ts';
import type { NutritionFactsFromLookup } from '../storage/stored-nutrition-facts.ts';

// What a lookup returns for a code that the service holds. It returns the
// lookup result of ADR 0010, the nutrition facts of ADR 0011, and the URL of
// the front image.
export interface LookupHit {
  imageUrl: null | string;
  lookupResult: LookupResult;
  nutritionFacts: NutritionFactsFromLookup;
}

// The lookup provider interface of ADR 0011. A provider asks one online barcode
// service. It declares its rate budget per minute, its attribution text, and
// its user agent. One provider exists, the Open Facts family, chosen in code. A
// registry with an ordered list comes with the second provider.
export interface LookupProvider {
  readonly attribution: string;
  readonly ratePerMinute: number;
  readonly userAgent: string;
  // The hit, or null when the service holds no product with the code. The
  // signal stops a lookup when the process stops.
  lookup(code: string, signal: AbortSignal): Promise<LookupHit | null>;
}

// The service answered 429. The provider throws this error, so the worker tells
// a spent rate budget from a network error.
export class RateLimitError extends Error {
  constructor(service: string, options?: ErrorOptions) {
    super(
      `${service} answered 429. The rate budget of this clock minute is spent.`,
      options,
    );
    this.name = 'RateLimitError';
  }
}

// The injection token of the one lookup provider.
export const LOOKUP_PROVIDER = 'LOOKUP_PROVIDER';
