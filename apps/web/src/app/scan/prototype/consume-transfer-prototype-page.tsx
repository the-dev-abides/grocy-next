// PROTOTYPE. Three variants of the Consume and Transfer scan screen, on the
// route `/scan/consume-transfer`, with the search parameter `?variant=`. The
// session lives above the variants, so the rows stay when the variant
// changes. The camera is the real one. The data is a stand-in.
import { useNavigate } from 'react-router';

import { useScanner } from '../use-scanner';
import { PrototypeSwitcher, useVariant } from './prototype-switcher';
import { usePrototypeFeedback } from './use-prototype-feedback';
import { usePrototypeSession } from './use-prototype-session';
import { VariantA } from './variant-a';
import { VariantB } from './variant-b';
import { VariantC } from './variant-c';

export function ConsumeTransferPrototypePage() {
  const navigate = useNavigate();
  const variant = useVariant();
  const session = usePrototypeSession(variant.policy);
  const feedback = usePrototypeFeedback(variant.typeSound);
  const addCode = (code: string) => {
    const added = session.addCode(code);
    feedback.show(added.row, added.kind);
  };
  const scanner = useScanner(addCode);
  const properties = {
    feedback,
    onCode: addCode,
    onDone: () => {
      void navigate('/review-queue');
    },
    scanner,
    session,
  };
  return (
    <>
      {variant.key === 'A' && <VariantA {...properties} />}
      {variant.key === 'B' && <VariantB {...properties} />}
      {variant.key === 'C' && <VariantC {...properties} />}
      <PrototypeSwitcher session={session} onCode={addCode} />
    </>
  );
}
