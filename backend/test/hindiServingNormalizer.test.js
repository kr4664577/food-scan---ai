const assert = require('node:assert/strict');
const { normalizeServingText } = require('../dist/services/servingSizeNormalizer');

const cases = [
  ['2 roti', 40, 'COUNT', 2],
  ['1 katori dal', 180, 'CATALOG_PORTION', 1],
  ['2 katori dal', 180, 'COUNT', 2],
  ['aadha bowl rice', 180, 'FRACTION', 0.5],
  ['ek bowl dal', 180, 'CATALOG_PORTION', 1],
  ['do bowls rice', 180, 'COUNT', 2],
  ['3 idli', 50, 'COUNT', 3],
  ['150 ग्राम', 100, 'GRAMS', 1.5]
];

for (const [text, ref, basis, multiplier] of cases) {
  const result = normalizeServingText(text, ref);
  assert.equal(result.basis, basis, `${text}: basis mismatch`);
  assert.ok(Math.abs(result.multiplier - multiplier) < 1e-9, `${text}: multiplier mismatch`);
}

console.log(`Hindi/Hinglish serving tests passed: ${cases.length} cases`);
