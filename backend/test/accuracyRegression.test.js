const assert = require('node:assert/strict');

// Pure regression guards for the contracts used by the accuracy engine.
// These tests intentionally avoid provider/API calls and therefore run offline.
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const similarity = (a, b) => {
  const x = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const y = new Set(normalize(b).split(/\s+/).filter(Boolean));
  if (!x.size || !y.size) return 0;
  let common = 0;
  for (const token of x) if (y.has(token)) common++;
  return common / Math.max(1, Math.min(x.size, y.size));
};

const assertNutritionRules = (n) => {
  assert.ok(n.sugar <= n.carbs, 'sugar cannot exceed carbohydrates');
  assert.ok(n.saturatedFat <= n.fats, 'saturated fat cannot exceed total fat');
  assert.ok(n.calories >= 0 && n.protein >= 0 && n.carbs >= 0 && n.fats >= 0, 'macros must be non-negative');
};

assert.equal(normalize('Britannia  Milk Bikis'), 'britannia milk bikis');
assert.equal(similarity('Amul Taaza Milk', 'Amul Taaza Milk'), 1);
assert.ok(similarity('Amul Taaza Milk', 'Completely Different Biscuit') < 0.35);
assertNutritionRules({ calories: 250, protein: 10, carbs: 30, fats: 8, sugar: 12, saturatedFat: 4 });

assert.throws(() => assertNutritionRules({ calories: 100, protein: 2, carbs: 10, fats: 2, sugar: 11, saturatedFat: 1 }));
assert.throws(() => assertNutritionRules({ calories: 100, protein: 2, carbs: 10, fats: 2, sugar: 2, saturatedFat: 3 }));

console.log('Accuracy regression guards passed.');
