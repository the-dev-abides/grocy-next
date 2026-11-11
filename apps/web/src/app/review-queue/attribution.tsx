import type { LookupResult } from '../api/next-api';

// The service that holds the lookup results, and its home page for the
// attribution link.
const SERVICE_NAME = 'Open Food Facts';
const SERVICE_URL = 'https://world.openfoodfacts.org/';

// The attribution line that the Open Database License asks for, as ADR 0011
// decided. The review queue shows it with the home page of the service. The
// short product form shows it with the name of the service that held the
// product as a link to the product page.
export function Attribution({
  lookupResult,
}: Readonly<{
  lookupResult?: Pick<LookupResult, 'service' | 'sourceUrl'>;
}>) {
  return (
    <p className="text-xs text-muted-foreground">
      Contains data from{' '}
      <a
        href={lookupResult?.sourceUrl ?? SERVICE_URL}
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        {lookupResult?.service ?? SERVICE_NAME}
      </a>
      , available under the Open Database License.
    </p>
  );
}
