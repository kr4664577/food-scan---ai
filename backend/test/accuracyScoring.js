const assert = require('node:assert/strict');

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenSet(value) {
  return new Set(normalize(value).split(/\s+/).filter(Boolean));
}

function identityScore(predicted, expected) {
  const p = tokenSet(predicted);
  const e = tokenSet(expected);
  if (!p.size || !e.size) return 0;
  let shared = 0;
  for (const token of p) if (e.has(token)) shared++;
  return shared / Math.max(p.size, e.size);
}

function relativeError(predicted, expected) {
  if (expected === 0) return predicted === 0 ? 0 : 1;
  return Math.abs(predicted - expected) / Math.abs(expected);
}

function scoreNutrition(predicted, expected, tolerance = 0.2) {
  const fields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
  const results = fields.map(field => ({
    field,
    error: relativeError(Number(predicted?.[field] || 0), Number(expected?.[field] || 0))
  }));
  const passed = results.filter(result => result.error <= tolerance).length;
  return { passed, total: fields.length, accuracy: fields.length ? passed / fields.length : 0, results };
}

function scoreCase(prediction, expected) {
  const identity = identityScore(prediction.productName, expected.productName);
  const nutrition = scoreNutrition(prediction.nutrition, expected.nutrition);
  return {
    identityScore: identity,
    identityPass: identity >= 0.8,
    nutrition,
    pass: identity >= 0.8 && nutrition.accuracy >= 0.7
  };
}

const sample = scoreCase(
  { productName: 'Dal Tadka', nutrition: { calories: 180, protein: 9, carbs: 25, fat: 5, fiber: 7, sugar: 2, sodium: 350 } },
  { productName: 'Dal Tadka', nutrition: { calories: 180, protein: 9, carbs: 25, fat: 5, fiber: 7, sugar: 2, sodium: 350 } }
);
assert.equal(sample.pass, true);
assert.equal(sample.identityScore, 1);
assert.equal(sample.nutrition.accuracy, 1);

module.exports = { normalize, identityScore, relativeError, scoreNutrition, scoreCase };
