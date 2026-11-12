import type { Named } from './named-unit';

import { unitNamed } from './named-unit';

// One entry of the package name list. It holds the words of a label quantity
// text or of a package shape that name the package, and the names of the
// household units for it. The last entry has no word. It is the package when
// the label and the package shapes name none.
interface PackageNames {
  names: readonly string[];
  words: readonly string[];
}

// The built-in package name list for the purchase unit, as ADR 0011 decided.
const PACKAGE_NAMES: readonly PackageNames[] = [
  { names: ['jar', 'glass'], words: ['jar', 'glass'] },
  { names: ['bottle'], words: ['bottle'] },
  { names: ['can', 'tin'], words: ['can', 'tin'] },
  { names: ['bag', 'sack', 'pouch'], words: ['bag', 'sack', 'pouch'] },
  { names: ['box', 'carton'], words: ['box', 'carton'] },
  { names: ['bar'], words: ['bar'] },
  { names: ['cup', 'pot', 'tub'], words: ['cup', 'pot', 'tub'] },
  { names: ['pack', 'package', 'packet', 'piece'], words: [] },
];

// The pack: the package when the label and the package shapes name none.
const PACK_NAMES = PACKAGE_NAMES.at(-1)?.names ?? [];

// The words of a text, in lower case and without a plural s.
function wordsOf(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z]+/u)
      .map((word) => word.replace(/s$/u, '')),
  );
}

// The entry of the package name list that one of the words names, if any.
function packageOf(words: Set<string>): PackageNames | undefined {
  return PACKAGE_NAMES.find((candidate) =>
    candidate.words.some((word) => words.has(word)),
  );
}

// The words of the package shapes of Open Food Facts. A shape is a taxonomy
// id with a language prefix, such as `en:bag`. The prefix is not a word.
function shapeWordsOf(packageShapes: readonly string[]): Set<string> {
  const shapes = packageShapes.map((shape) => shape.replace(/^[a-z]+:/u, ''));
  return wordsOf(shapes.join(' '));
}

// The household unit of the package that the package shapes name, if the
// household has one.
function shapeUnitOf(
  packageShapes: readonly string[],
  units: readonly Named[] | undefined,
): Named | undefined {
  const shapePackage = packageOf(shapeWordsOf(packageShapes));
  return shapePackage === undefined
    ? undefined
    : unitNamed(units, shapePackage.names);
}

// The purchase unit proposal: the household unit of the package that the
// label quantity text names. When the label names no package, it is the
// household unit of the package shape, if the household has one. Else it is
// the pack. No household unit of the package list gives no proposal.
export function proposePurchaseUnit(
  quantityText: null | string,
  packageShapes: readonly string[],
  units: readonly Named[] | undefined,
): null | number {
  const labelPackage = packageOf(wordsOf(quantityText ?? ''));
  const unit =
    labelPackage === undefined
      ? (shapeUnitOf(packageShapes, units) ?? unitNamed(units, PACK_NAMES))
      : unitNamed(units, labelPackage.names);
  return unit?.id ?? null;
}
