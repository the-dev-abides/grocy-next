// PROTOTYPE. Three variants of the review queue screen with the four booking
// types, on the route `/review-queue` with the search parameter `?variant=A`,
// `B`, or `C`. With no variant, the real review queue shows. The queue lives
// above the variants, so the rows stay when the variant changes. The data is
// a stand-in in memory. Nothing goes to the API.
import { Page } from '../../shell/page';
import { PrototypeSwitcher, type Variant } from './prototype-switcher';
import { usePrototypeQueue } from './use-prototype-queue';
import { VariantA } from './variant-a';
import { VariantB } from './variant-b';
import { VariantC } from './variant-c';

export function ReviewQueuePrototypePage({
  variant,
}: Readonly<{ variant: Variant }>) {
  const queue = usePrototypeQueue();
  return (
    <Page title="Review queue">
      {variant.key === 'A' && <VariantA queue={queue} />}
      {variant.key === 'B' && <VariantB queue={queue} />}
      {variant.key === 'C' && <VariantC queue={queue} />}
      <PrototypeSwitcher queue={queue} variant={variant} />
    </Page>
  );
}
