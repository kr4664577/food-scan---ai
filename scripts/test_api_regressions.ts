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
const { default: app } = await import('../backend/src/app');
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
async function request(path: string, method = 'GET', body?: unknown, token?: string) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
try {
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
  axios.get = async () => ({ data: { status: 1, product: { product_name: 'Laptop', categories_tags: ['en:electronics'], nutriments: { 'energy-kcal_100g': 900 } } } });
  const nonFood = await request('/scan/barcode', 'POST', { barcode: '3017620422003' }, token);
  assert.equal(nonFood.status, 422);
  assert.equal(nonFood.body.data, undefined);
  assert.match(nonFood.body.error.message, /does not appear to be a food product/);
  axios.get = async () => ({ data: { status: 0 } });
  assert.equal((await request('/scan/barcode', 'POST', { barcode: '0000000000000' }, token)).status, 404);
  assert.equal((await request('/history/scans', 'GET', undefined, token)).body.data.length, 1, 'Rejected scans must not be saved');
  const saved = JSON.parse(await readFile(process.env.FOODSCAN_STORAGE_FILE, 'utf8'));
  assert.equal(saved.scanHistory.length, 1);
  assert.equal(saved.users.find((u: any) => u.id === first.body.data.user.id).dietaryGoals, 'Fitness');
  console.log('Local API regressions passed: signup/login/profile, persisted goal/history, barcode errors, no rejected-scan writes, and cross-user favorites/history protection.');
} finally {
  axios.get = realGet;
  await new Promise<void>(resolve => server.close(() => resolve()));
  await rm(temp, { recursive: true, force: true });
}
