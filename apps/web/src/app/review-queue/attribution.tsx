// The service that holds the lookup results, and its home page for the
// attribution link.
const SERVICE_NAME = 'Open Food Facts';
const SERVICE_URL = 'https://world.openfoodfacts.org/';

// The attribution line that the Open Database License asks for, as ADR 0011
// decided. The review queue and the short product form show it.
export function Attribution() {
  return (
    <p className="text-xs text-muted-foreground">
      Contains data from{' '}
      <a
        href={SERVICE_URL}
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        {SERVICE_NAME}
      </a>
      , available under the Open Database License.
    </p>
  );
}
