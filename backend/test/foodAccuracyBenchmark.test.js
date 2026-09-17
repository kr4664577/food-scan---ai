const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeServingText } = require('../dist/services/servingSizeNormalizer');

const fixturePath = path.join(__dirname, 'foodAccuracyBenchmark.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

for (const testCase of fixture.normalizationCases) {
  const result = normalizeServingText(testCase.input, testCase.referenceGrams);
  assert.equal(result.basis, testCase.basis, `${testCase.input}: basis mismatch`);
  assert.ok(Math.abs(result.multiplier - testCase.multiplier) < 1e-9, `${testCase.input}: multiplier mismatch`);
  assert.ok(result.grams === null || result.grams >= 0, `${testCase.input}: invalid grams`);
}

for (const invariant of fixture.nutritionInvariants) {
  assert.equal(typeof invariant, 'string');
}

for (const safetyRule of fixture.identitySafety) {
  assert.equal(typeof safetyRule, 'string');
}

assert.equal(fixture.mealCases.length, 5);
for (const meal of fixture.mealCases) {
  assert.ok(meal.id && meal.input);
  assert.equal(meal.expectedItems.length, meal.servings.length);
  assert.ok(meal.expectedItems.length >= 2, `${meal.id}: expected multiple food items`);
  for (const serving of meal.servings) assert.ok(serving > 0, `${meal.id}: invalid serving`);
}

console.log(`Food accuracy benchmark fixtures validated: ${fixture.mealCases.length} meal cases, ${fixture.normalizationCases.length} normalization cases`);
