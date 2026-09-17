const assert = require('node:assert/strict');
const { identityScore, relativeError, scoreNutrition, scoreCase } = require('./accuracyScoring');

assert.equal(identityScore('Dal Tadka', 'Dal Tadka'), 1);
assert.ok(identityScore('Dal Tadka', 'Rajma Curry') < 0.8);
assert.equal(relativeError(100, 100), 0);
assert.equal(relativeError(110, 100), 0.1);
assert.equal(relativeError(0, 0), 0);

const nutrition = scoreNutrition(
  { calories: 105, protein: 9, carbs: 19, fat: 5, fiber: 4, sugar: 2, sodium: 330 },
  { calories: 100, protein: 10, carbs: 20, fat: 5, fiber: 4, sugar: 2, sodium: 300 }
);
assert.equal(nutrition.total, 7);
assert.ok(nutrition.accuracy >= 0.7);

const good = scoreCase(
  { productName: 'Cooked Basmati Rice', nutrition: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1 } },
  { productName: 'Cooked Basmati Rice', nutrition: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1 } }
);
assert.equal(good.pass, true);

const bad = scoreCase(
  { productName: 'Rajma Curry', nutrition: { calories: 500, protein: 2, carbs: 60, fat: 30, fiber: 1, sugar: 10, sodium: 1000 } },
  { productName: 'Cooked Basmati Rice', nutrition: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1 } }
);
assert.equal(bad.pass, false);

console.log('Accuracy scoring tests passed');
