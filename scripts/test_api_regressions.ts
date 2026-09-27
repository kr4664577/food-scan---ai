import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

// Isolated local accounts only. Never contact production or use real credentials.
const temp = await mkdtemp(join(tmpdir(), 'foodscan-regression-'));
process.env.FOODSCAN_STORAGE_FILE = join(temp, 'test-data.json');
process.env.JWT_SECRET = randomBytes(32).toString('hex');
delete process.env.DATABASE_URL;
const axios = createRequire(import.meta.url)('axios');
const realGet = axios.get;
const realFetch = globalThis.fetch;
delete process.env.GROK_API_KEY;
delete process.env.XAI_API_KEY;
const { default: app } = await import('../backend/src/app');
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
async function request(path: string, method = 'GET', body?: unknown, token?: string) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
try {
  assert.equal((await request('/health')).status, 200);
  const password = randomBytes(24).toString('base64url');
  const first = await request('/auth/register', 'POST', { email: 'first@example.invalid', fullName: 'Local fixture', password });
  assert.equal(first.status, 201);
  const second = await request('/auth/register', 'POST', { email: 'second@example.invalid', fullName: 'Other fixture', password });
  assert.equal(second.status, 201);
  const login = await request('/auth/login', 'POST', { email: 'first@example.invalid', password });
  assert.equal(login.status, 200);
  const token = login.body.data.token;
  assert.equal((await request('/auth/me', 'GET', undefined, token)).body.data.id, first.body.data.user.id);
  assert.equal((await request('/auth/me')).status, 401);
  assert.equal((await request('/auth/me', 'GET', undefined, 'invalid')).status, 401);
  assert.equal((await request('/history/scans', 'GET', undefined, token)).body.data.length, 0);
  assert.equal((await request('/auth/me', 'PUT', { dietaryGoals: 'Fitness' }, token)).status, 200);
  assert.equal((await request('/auth/me', 'GET', undefined, token)).body.data.dietaryGoals, 'Fitness');

  axios.get = async () => ({ data: { status: 1, product: { product_name: 'Local food fixture', categories_tags: ['en:snacks'], nutriments: { 'energy-kcal_100g': 450, proteins_100g: 8, carbohydrates_100g: 65, fat_100g: 17 } } } });
  const scan = await request('/scan/barcode', 'POST', { barcode: '3017620422003' }, token);
  assert.equal(scan.status, 200);
  assert.equal(scan.body.data.analysis.nutrition.calories, 450);
  assert.equal(scan.body.data.analysis.nutrition.sodium, null);
  const scanId = scan.body.data.scanId;
  const history = await request('/history/scans', 'GET', undefined, token);
  assert.equal(history.body.data.length, 1);
  assert.equal(history.body.data[0].userId, first.body.data.user.id);
  assert.equal(history.body.data[0].qualityAnalysis.foodClassification, 'food');
  assert.equal((await request('/history/scans', 'GET', undefined, second.body.data.token)).body.data.length, 0);
  assert.equal((await request('/history/favorites/toggle', 'POST', { scanId }, second.body.data.token)).status, 404);
  assert.equal((await request('/history/favorites/toggle', 'POST', { scanId }, token)).status, 200);
  assert.equal((await request('/history/favorites', 'GET', undefined, token)).body.data.length, 1);
  axios.get = async () => ({ data: { status: 1, product: { product_name: 'Laptop', categories_tags: ['en:electronics'], nutriments: { 'energy-kcal_100g': 900 } } } });
  const nonFood = await request('/scan/barcode', 'POST', { barcode: '3017620422003' }, token);
  assert.equal(nonFood.status, 422);
  assert.equal(nonFood.body.data, undefined);
  assert.match(nonFood.body.error.message, /does not appear to be a food product/);
  axios.get = async () => ({ data: { status: 0 } });
  assert.equal((await request('/scan/barcode', 'POST', { barcode: '0000000000000' }, token)).status, 404);
  assert.equal((await request('/history/scans', 'GET', undefined, token)).body.data.length, 1, 'Rejected scans must not be saved');
  // Exercise the real image route/SDK/parser/validator with an offline provider.
  // Only the isolated local server is reachable; unexpected external calls fail.
  let providerCalls = 0;
  let providerStatus = 200;
  let providerText = '';
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.startsWith(base + '/')) return realFetch(input, init);
    assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'), 'Unexpected external request');
    providerCalls++;
    const body = providerStatus >= 400 ? { error: { code: providerStatus, message: 'isolated provider failure' } }
      : { candidates: [{ content: { parts: [{ text: providerText }] } }] };
    return new Response(JSON.stringify(body), { status: providerStatus, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  const image = { imageBase64: 'AAAA', mimeType: 'image/jpeg' };
  const food = (name: string) => ({ foodClassification: 'food', classificationConfidence: 0.95, detectedDishName: name,
    items: [{ name, confidence: 0.95, estimatedPortion: '100 g', portionConfidence: 0.85, nutrition: { calories: 130, protein: 3, carbs: 28, fat: 1 } }],
    confidence: { overall: 0.8, itemsRecognition: 0.9, portionVolume: 0.8, totalNutrition: 0.8 } });
  for (const [status, text, code] of [[429, '', 'AI_QUOTA_EXCEEDED'], [503, '', 'AI_TEMPORARY_ERROR'], [200, 'not-json', 'AI_INVALID_RESPONSE'], [200, JSON.stringify({ ...food('Rice'), items: [{ ...food('Rice').items[0], nutrition: { calories: -1 } }] }), 'AI_INVALID_RESPONSE']] as const) {
    process.env.GEMINI_API_KEY = randomBytes(16).toString('hex'); // Offline fixture only; never sent externally.
    providerStatus = status; providerText = text; providerCalls = 0;
    const failed = await request('/scan/meal', 'POST', image, token);
    assert.equal(failed.body.success, false);
    assert.equal(failed.body.error.code, code);
    assert.equal(failed.body.data, undefined, 'Failed analysis cannot return stale/fabricated nutrition');
    assert.equal(providerCalls, status === 503 ? 3 : 1);
    assert.equal((await request('/history/scans', 'GET', undefined, token)).body.data.length, 1, 'Failed image scan must not write history');
  }
  process.env.GEMINI_API_KEY = randomBytes(16).toString('hex');
  providerStatus = 200; providerText = JSON.stringify(food('Rice'));
  const meal = await request('/scan/meal', 'POST', image, token);
  assert.equal(meal.status, 200);
  assert.equal(meal.body.data.mealAnalysis.detectedDishName, 'Rice');
  assert.equal(meal.body.data.mealAnalysis.totalNutrition.calories, 130);
  assert.equal(meal.body.data.mealAnalysis.totalNutrition.sodium, null);
  providerText = JSON.stringify(food('Oats'));
  const guest = await request('/scan/meal', 'POST', image);
  assert.equal(guest.status, 200);
  assert.equal(guest.body.data.mealAnalysis.detectedDishName, 'Oats', 'A new image response must not reuse the previous result');
  assert.equal(guest.body.data.scanId, undefined, 'Guest scans cannot write to a signed-in history');
  assert.equal((await request('/history/scans', 'GET', undefined, token)).body.data.length, 2);
  assert.equal((await request('/history/scans', 'GET', undefined, second.body.data.token)).body.data.length, 0);
  const saved = JSON.parse(await readFile(process.env.FOODSCAN_STORAGE_FILE, 'utf8'));
  assert.equal(saved.scanHistory.length, 2);
  assert.equal(saved.users.find((u: any) => u.id === first.body.data.user.id).dietaryGoals, 'Fitness');
  console.log('Local API regressions passed: signup/login/profile, persisted goal/history, barcode errors, no rejected-scan writes, and cross-user favorites/history protection.');
} finally {
  axios.get = realGet;
  globalThis.fetch = realFetch;
  await new Promise<void>(resolve => server.close(() => resolve()));
  await rm(temp, { recursive: true, force: true });
}
