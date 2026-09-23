import assert from 'node:assert/strict';
import { validateMealVisionResult, emptyNutrition, NON_FOOD_IMAGE_MESSAGE, UNCLEAR_FOOD_MESSAGE } from '../backend/src/services/visionValidation';

const food = (name = 'Cooked rice', calories = 130, carbs = 28) => ({
  foodClassification: 'food', classificationConfidence: 0.95, detectedDishName: name,
  items: [{ name, estimatedPortion: 'approximately 100 g', confidence: 0.92, portionConfidence: 0.8, nutrition: { calories, protein: 2.7, carbs, fat: 0.3, fiber: 0, sugar: null, sodium: null, saturatedFat: null } }],
  confidence: { itemsRecognition: 0.92, portionVolume: 0.8, totalNutrition: 0.8, overall: 0.8 }, visibleIngredients: [name],
});
const simple = validateMealVisionResult(food());
assert.equal(simple.items[0].estimatedPortion, 'approximately 100 g');
assert.equal(simple.totalNutrition.calories, 130);
assert.equal(simple.totalNutrition.fiber, 0, 'Supported zero must not become a default value');
assert.equal(simple.totalNutrition.sodium, null);
const other = validateMealVisionResult(food('Boiled potato', 87, 20));
assert.notEqual(simple.detectedDishName, other.detectedDishName);
assert.notEqual(simple.totalNutrition.calories, other.totalNutrition.calories);
const mixed = food('Rice and potato'); mixed.items.push(food('Boiled potato', 87, 20).items[0]);
mixed.items[1].nutrition.fiber = null as unknown as number;
const mixture = validateMealVisionResult(mixed);
assert.equal(mixture.items.length, 2);
assert.equal(mixture.totalNutrition.calories, 217);
assert.equal(mixture.totalNutrition.fiber, null, 'Unknown item nutrient makes that meal total unavailable');
for (const name of ['Laptop', 'Phone', 'Keyboard', 'Mouse', 'Shoes', 'Book', 'Chair', 'Person', 'Empty bottle', 'Household product']) {
  assert.throws(() => validateMealVisionResult({ ...food(name), foodClassification: 'non-food' }), { message: NON_FOOD_IMAGE_MESSAGE });
  assert.throws(() => validateMealVisionResult(food(name)), { message: NON_FOOD_IMAGE_MESSAGE }, 'Contradictory food classification must not produce nutrition');
}
for (const patch of [{ foodClassification: 'unknown' }, { foodClassification: undefined }, { classificationConfidence: 0.3 }, { items: [] }]) {
  assert.throws(() => validateMealVisionResult({ ...food(), ...patch }), { message: UNCLEAR_FOOD_MESSAGE });
}
const noPortion: any = food(); noPortion.items[0].estimatedPortion = null;
assert.deepEqual(validateMealVisionResult(noPortion).totalNutrition, emptyNutrition());
assert.equal(validateMealVisionResult(noPortion).items[0].estimatedPortion, null);
const noConfidence: any = food(); delete noConfidence.items[0].confidence;
assert.throws(() => validateMealVisionResult(noConfidence), { message: UNCLEAR_FOOD_MESSAGE });
const uncertain = food(); uncertain.items[0].confidence = 0.7;
assert.deepEqual(validateMealVisionResult(uncertain).totalNutrition, emptyNutrition());
const bad = food(); bad.items[0].nutrition.calories = 3000;
assert.deepEqual(validateMealVisionResult(bad).totalNutrition, emptyNutrition());
const missing: any = food(); missing.items[0].nutrition = { calories: 130, protein: '2.7', fat: -1 };
const missingResult = validateMealVisionResult(missing);
assert.equal(missingResult.totalNutrition.protein, null);
assert.equal(missingResult.totalNutrition.fat, null);
assert.equal(missingResult.totalNutrition.carbs, null);
const inconsistent: any = food(); inconsistent.items[0].nutrition.sugar = 50;
assert.equal(validateMealVisionResult(inconsistent).totalNutrition.sugar, null);
const tiny = food(); tiny.items[0].estimatedPortion = '1 g';
assert.deepEqual(validateMealVisionResult(tiny).totalNutrition, emptyNutrition());
const fullConfidence = food(); fullConfidence.classificationConfidence = 1;
fullConfidence.items[0].confidence = 1; fullConfidence.items[0].portionConfidence = 1;
fullConfidence.confidence = { itemsRecognition: 1, portionVolume: 1, totalNutrition: 1, overall: 1 };
assert.equal(validateMealVisionResult(fullConfidence).confidence.overall, 0.99);

// Full service path uses one mocked provider response, never a live provider.
const savedFetch = globalThis.fetch;
const savedEnv = Object.fromEntries(['GEMINI_API_KEY', 'GROK_API_KEY', 'XAI_API_KEY'].map(key => [key, process.env[key]]));
process.env.GEMINI_API_KEY = 'offline-fixture-only'; delete process.env.GROK_API_KEY; delete process.env.XAI_API_KEY;
let calls = 0, response: any = food();
globalThis.fetch = (async () => {
  calls++;
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(response) }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;
try {
  const { runMealIntelligencePipeline } = await import('../backend/src/services/mealIntelligence.service');
  assert.equal((await runMealIntelligencePipeline({ imageBase64: 'AAAA' })).totalNutrition.calories, 130);
  assert.equal(calls, 1, 'Successful recognition must not require a second classification request');
  response = { ...food('Laptop'), foodClassification: 'non-food' };
  await assert.rejects(runMealIntelligencePipeline({ imageBase64: 'AAAA', customDishName: 'rice' }), { message: NON_FOOD_IMAGE_MESSAGE });
  assert.equal(calls, 2, 'Rejected non-food must not trigger nutrition or validation provider calls');
} finally {
  globalThis.fetch = savedFetch;
  for (const [key, value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
}
console.log('Photo validation regressions passed: simple/different/mixed food, non-food/unknown rejection, null nutrients/portions, zero preservation, consistency, and one provider call.');
