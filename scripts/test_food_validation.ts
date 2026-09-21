import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
// Backend is CommonJS under the Vercel API boundary; patch that exact transport.
const axios = createRequire(import.meta.url)('axios') as typeof import('axios').default;
import { parseBarcodeProduct, classifyBarcodeProduct, fetchBarcodeData, NON_FOOD_MESSAGE, UNKNOWN_MESSAGE } from '../backend/src/services/barcode.service';
import { runPackagedIntelligencePipeline } from '../backend/src/services/packagedIntelligence.service';
import { averageCalories } from '../src/utils/historyStats';
import { mealIdeas, USER_GOALS } from '../src/utils/mealIdeas';
import type { ScanItem } from '../src/types';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScanAnalytics } from '../src/components/ScanAnalytics';

const code = '3017620422003';
const food = { product_name: 'Food fixture', categories_tags: ['en:snacks'], nutriments: { 'energy-kcal_100g': 450, proteins_100g: 8, carbohydrates_100g: 65, fat_100g: 17, sugars_100g: 0, sodium_100g: 0 } };
const parsed = parseBarcodeProduct(code, food);
assert.equal(parsed.calories, 450);
assert.equal(parsed.sugar, 0);
assert.equal(parsed.sodium, 0);
assert.equal(parsed.fiber, null);
assert.equal(parsed.servingSize, null);
assert.equal(parsed.nutritionScore, undefined);
assert.equal(classifyBarcodeProduct({ product_name: 'Water', categories_tags: ['en:beverages'] }), 'food');
assert.equal(parseBarcodeProduct(code, { product_name: 'Water', categories_tags: ['en:waters'], nutriments: { 'energy-kcal_100g': 0 } }).calories, 0);
assert.equal(parseBarcodeProduct(code, { ...food, nutriments: { 'energy-kcal_serving': 999 } }).calories, null, 'Serving data must not be mistaken for per-100g data');
for (const name of ['Laptop', 'Electronics', 'Phone', 'Cosmetics', 'Cleaning detergent', 'Clothing', 'Chocolate shampoo']) {
  assert.throws(() => parseBarcodeProduct(code, { ...food, product_name: name }), { message: NON_FOOD_MESSAGE });
}
assert.throws(() => parseBarcodeProduct(code, { product_name: 'Unknown object', nutriments: food.nutriments }), { message: UNKNOWN_MESSAGE });
const inconsistent = parseBarcodeProduct(code, { ...food, nutriments: { ...food.nutriments, sugars_100g: 80, fiber_100g: -1, 'saturated-fat_100g': 90 } });
assert.equal(inconsistent.sugar, null); assert.equal(inconsistent.fiber, null); assert.equal(inconsistent.saturatedFat, null);

const realGet = axios.get;
try {
  let requests = 0;
  axios.get = (async () => { requests++; return { data: { status: 1, product: food } }; }) as any;
  const report = await runPackagedIntelligencePipeline({ barcode: code });
  assert.equal(requests, 1);
  assert.equal(report.foodClassification, 'food');
  assert.equal(report.nutrition.fiber, null);
  assert.equal(report.nutrition.sugar, 0);
  assert.equal(report.truthRating, undefined);
  assert.deepEqual(report.healthierSwaps, []);
  assert.equal(report.servingSize, null);
  axios.get = (async () => ({ data: { status: 0 } })) as any;
  await assert.rejects(runPackagedIntelligencePipeline({ barcode: code }), { message: UNKNOWN_MESSAGE });
  await assert.rejects(fetchBarcodeData('../not-a-barcode'), /digit product barcode/);
  axios.get = (async () => { throw new Error('private transport details'); }) as any;
  await assert.rejects(fetchBarcodeData(code), /temporarily unavailable/);
} finally { axios.get = realGet; }

const scan = (calories: number, fields: Partial<ScanItem> = {}): ScanItem => ({ id: crypto.randomUUID(), userId: 'owner', productName: 'Saved food', createdAt: new Date().toISOString(), scanType: 'MEAL', calories, ...fields });
assert.equal(averageCalories([], 'owner'), 0);
assert.equal(averageCalories([scan(450)], 'owner'), 450);
assert.equal(averageCalories([scan(450), scan(550)], 'owner'), 500);
assert.equal(averageCalories([scan(400), scan(500), scan(600)], 'owner'), 500);
assert.equal(averageCalories([scan(0), scan(500)], 'owner'), 250);
const invalid = [scan(-1), scan(NaN), scan(Infinity), scan(10, { calories: undefined }), scan(10, { userId: 'other' }), scan(10, { scanType: 'QUALITY_INSPECTION' }), scan(10, { isFood: false }), scan(10, { status: 'FAILED' }), scan(10, { barcode: code }), scan(10, { id: '' })];
assert.equal(averageCalories([scan(450), ...invalid], 'owner'), 450);
assert.equal(averageCalories([scan(450)], undefined), 0);
assert.equal(averageCalories(JSON.parse(JSON.stringify([scan(450), scan(550)])), 'owner'), 500, 'Reloaded saved records retain the same arithmetic mean');
const emptyChart = renderToStaticMarkup(React.createElement(ScanAnalytics, { history: [], userId: 'owner' }));
assert.match(emptyChart, /Scan a few more meals/);
assert.doesNotMatch(emptyChart, /<rect/);
const populatedChart = renderToStaticMarkup(React.createElement(ScanAnalytics, { history: [scan(450), scan(550)], userId: 'owner' }));
assert.match(populatedChart, /Highest daily count 2/);
assert.match(populatedChart, /500/);
for (const goal of USER_GOALS) {
  assert.equal(mealIdeas(goal).length, 6);
  assert.ok(mealIdeas(goal).every(idea => !('calories' in idea)), 'Meal ideas must not invent nutrient values');
}
console.log('Food/beverage, non-food/unknown, missing/zero nutrients, single lookup, AVG CALORIES, account isolation, and goal idea tests passed.');
