const assert = require('node:assert/strict');
const { normalizeServingText } = require('../dist/services/servingSizeNormalizer');

const cases = [
  ['150 g', 100, 'GRAMS', 1.5],
  ['half bowl', 200, 'FRACTION', 0.5],
  ['1/2 cup', 200, 'FRACTION', 0.5],
  ['2 rotis', 40, 'COUNT', 2],
  ['3 idlis', 50, 'COUNT', 3],
  ['1 bowl', 180, 'CATALOG_PORTION', 1],
];

for (const [text, ref, basis, multiplier] of cases) {
  const result = normalizeServingText(text, ref);
  assert.equal(result.basis, basis, `${text}: unexpected basis`);
  assert.ok(Math.abs(result.multiplier - multiplier) < 1e-9, `${text}: unexpected multiplier`);
  assert.ok(result.grams === null || result.grams >= 0, `${text}: invalid grams`);
}

const unknown = normalizeServingText('a small plate', 0);
assert.equal(unknown.basis, 'UNKNOWN');
assert.equal(unknown.multiplier, 1);
assert.ok((unknown.confidence ?? 0) < 0.5);

console.log(`Serving normalizer tests passed: ${cases.length + 1} cases`);
