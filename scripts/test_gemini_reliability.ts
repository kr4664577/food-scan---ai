import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { AIProviderError, classifyProviderError } from '../backend/src/services/providerErrors';
import { VISION_DEADLINE_MS, MAX_TRANSIENT_RETRIES, providerRetryDelay, runProviderAttempt } from '../backend/src/services/providerRetry';
import { validateMealVisionResult, emptyNutrition } from '../backend/src/services/visionValidation';
import { errorHandler } from '../backend/src/middlewares/error.middleware';

// All provider calls, API calls and browser storage in this suite are isolated
// fixtures. No live credentials, production accounts or network are used.
const sensitiveFixture = 'private-provider-detail-that-must-not-be-returned';
const classificationCases: [unknown, string][] = [
  [{ status: 429 }, 'AI_QUOTA_EXCEEDED'],
  [{ status: 'RESOURCE_EXHAUSTED' }, 'AI_QUOTA_EXCEEDED'],
  [{ message: `quota exceeded: ${sensitiveFixture}` }, 'AI_QUOTA_EXCEEDED'],
  [{ status: 500 }, 'AI_TEMPORARY_ERROR'],
  [{ status: 502 }, 'AI_TEMPORARY_ERROR'],
  [{ status: 503, message: 'network unavailable' }, 'AI_TEMPORARY_ERROR'],
  [{ response: { status: 503 }, code: 'ECONNRESET' }, 'AI_TEMPORARY_ERROR'],
  [{ status: 503, name: 'TimeoutError' }, 'AI_TEMPORARY_ERROR'],
  [{ code: 'ETIMEDOUT' }, 'AI_TIMEOUT'],
  [{ name: 'AbortError' }, 'AI_TIMEOUT'],
  [{ code: 'ECONNRESET' }, 'AI_NETWORK_ERROR'],
  [new TypeError('fetch failed'), 'AI_NETWORK_ERROR'],
  [new SyntaxError(`invalid json ${sensitiveFixture}`), 'AI_INVALID_RESPONSE'],
  [{ message: sensitiveFixture }, 'AI_UNKNOWN_ERROR'],
];
for (const [input, code] of classificationCases) {
  const error = classifyProviderError(input);
  assert.equal(error.code, code);
  assert.equal(error.message.includes(sensitiveFixture), false);
  assert.equal('cause' in error, false, 'Raw provider errors must not be retained');
}
assert.equal(new AIProviderError('AI_QUOTA_EXCEEDED').retryAfterSeconds, 60);
assert.equal(VISION_DEADLINE_MS, 25000);
assert.equal(MAX_TRANSIENT_RETRIES, 2);
assert.equal(providerRetryDelay(0, () => 0), 500);
assert.equal(providerRetryDelay(1, () => 0), 1000);
assert.equal(providerRetryDelay(0, () => 0.5), 625, 'Retry includes bounded jitter');
let abortedTransport = false;
await assert.rejects(runProviderAttempt(signal => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => { abortedTransport = true; reject(signal.reason); }, { once: true });
}), { deadlineAt: Date.now() + 1000, attemptTimeoutMs: 10 }), { name: 'TimeoutError' });
assert.equal(abortedTransport, true, 'Deadline must abort the actual transport');

// Check the actual public error middleware without opening a network listener.
let body: any, publicStatus: number;
const publicHeaders = new Map<string, string>();
const response: any = {
  statusCode: 200,
  setHeader: (name: string, value: string) => publicHeaders.set(name, value),
  status(status: number) { publicStatus = status; return this; },
  json(value: unknown) { body = value; return this; },
};
errorHandler(classifyProviderError({ status: 429, message: sensitiveFixture }), {} as any, response, () => {});
assert.equal(publicStatus!, 429);
assert.equal(body.error.code, 'AI_QUOTA_EXCEEDED');
assert.equal(body.error.retryAfterSeconds, 60);
assert.equal(publicHeaders.get('Retry-After'), '60');
assert.equal(JSON.stringify(body).includes(sensitiveFixture), false);
assert.equal('stack' in body.error, false);

const providerEnv = ['GEMINI_API_KEY', 'GROK_API_KEY', 'XAI_API_KEY'];
const previousEnv = providerEnv.map(name => [name, process.env[name]] as const);
const previousFetch = globalThis.fetch;
const backendAxios = createRequire(import.meta.url)('axios');
const previousAxiosPost = backendAxios.post;
const previousLogs = { log: console.log, warn: console.warn, error: console.error };
const logs: string[] = [];
for (const name of ['log', 'warn', 'error'] as const) console[name] = (...args: unknown[]) => { logs.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')); };
let calls = 0, xaiCalls = 0, caseId = 0;
type ProviderFixture = { status?: number; text?: string; error?: unknown; throw?: Error; headers?: Record<string, string> };
let fixtures: ProviderFixture[] = [];
let lastFixture: ProviderFixture = {};
globalThis.fetch = (async (_input, init) => {
  calls++;
  assert.ok(init?.signal, 'Gemini transport must receive its abort signal');
  const fixture = fixtures.shift() || lastFixture;
  lastFixture = fixture;
  if (fixture.throw) throw fixture.throw;
  const status = fixture.status || 200;
  const payload = status >= 400 ? { error: fixture.error || { code: status, message: sensitiveFixture } }
    : { candidates: [{ content: { parts: [{ text: fixture.text ?? '{"fixture":true,"nutrition":null}' }] } }] };
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json', ...fixture.headers } });
}) as typeof fetch;
backendAxios.post = async () => { xaiCalls++; throw new Error('Unexpected xAI call in isolated Gemini fixture'); };
const startCase = (...next: ProviderFixture[]) => {
  process.env.GEMINI_API_KEY = `offline-reliability-fixture-${++caseId}`;
  delete process.env.GROK_API_KEY; delete process.env.XAI_API_KEY;
  calls = 0; xaiCalls = 0; fixtures = next; lastFixture = {};
};
try {
  const { runUnifiedVisionAnalysis } = await import('../backend/src/services/aiVision.service');
  const params = { prompt: 'offline fixture', imageBase64: 'AAAA', mimeType: 'image/jpeg' };
  startCase({});
  assert.deepEqual(await runUnifiedVisionAnalysis(params), { fixture: true, nutrition: null });
  assert.equal(calls, 1);

  for (const fixture of [
    { status: 429 },
    { status: 400, error: { status: 'RESOURCE_EXHAUSTED', message: sensitiveFixture } },
    { status: 400, error: { message: `Quota exceeded: ${sensitiveFixture}` } },
  ]) {
    startCase(fixture);
    process.env.GROK_API_KEY = 'offline-xai-fixture';
    await assert.rejects(runUnifiedVisionAnalysis(params), (error: any) => error.code === 'AI_QUOTA_EXCEEDED' && error.retryAfterSeconds === 60);
    await assert.rejects(runUnifiedVisionAnalysis(params), (error: any) => error.code === 'AI_QUOTA_EXCEEDED');
    assert.equal(calls, 1, 'Quota must not retry, change Gemini model, or bypass cooldown');
    assert.equal(xaiCalls, 0, 'Quota must not invoke another provider');
  }
  startCase({ status: 429, headers: { 'Retry-After': '12' } });
  await assert.rejects(runUnifiedVisionAnalysis(params), (error: any) => error.code === 'AI_QUOTA_EXCEEDED' && error.retryAfterSeconds === 12);
  assert.equal(calls, 1);

  for (const status of [500, 502, 503]) {
    startCase({ status });
    process.env.GROK_API_KEY = 'offline-xai-fixture';
    await assert.rejects(runUnifiedVisionAnalysis(params), (error: any) => error.code === 'AI_TEMPORARY_ERROR');
    assert.equal(calls, 3, `${status}: at most two retries; no nested SDK retries or model fallback`);
    assert.equal(xaiCalls, 0, 'Exhausted transient retries must not become a fallback storm');
    startCase({ status }, {});
    assert.deepEqual(await runUnifiedVisionAnalysis(params), { fixture: true, nutrition: null });
    assert.equal(calls, 2, 'A transient failure can recover on a bounded retry');
  }
  startCase({ status: 503, headers: { 'Retry-After': '30' } });
  await assert.rejects(runUnifiedVisionAnalysis(params), (error: any) => error.code === 'AI_TEMPORARY_ERROR' && error.retryAfterSeconds === 30);
  assert.equal(calls, 1, 'Provider-requested cooldown is not an immediate retry');

  startCase({ throw: Object.assign(new Error('transport fixture'), { code: 'ETIMEDOUT', name: 'TimeoutError' }) });
  await assert.rejects(runUnifiedVisionAnalysis(params), (error: any) => error.code === 'AI_TIMEOUT');
  assert.ok(calls >= 1 && calls <= 3);
  startCase({ throw: new TypeError('fetch failed') });
  await assert.rejects(runUnifiedVisionAnalysis(params), (error: any) => error.code === 'AI_NETWORK_ERROR');
  assert.ok(calls >= 1 && calls <= 3);
  startCase({});
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(runUnifiedVisionAnalysis({ ...params, signal: cancelled.signal }), (error: any) => error.code === 'AI_TIMEOUT');
  assert.equal(calls, 0, 'Already-aborted scans do not call the provider');

  for (const text of ['', 'not json', 'null', '[]']) {
    startCase({ text });
    await assert.rejects(runUnifiedVisionAnalysis(params), (error: any) => error.code === 'AI_INVALID_RESPONSE');
    assert.equal(calls, 1, 'Invalid output must not generate speculative fallback nutrition');
  }
  startCase({ status: 403 });
  await assert.rejects(runUnifiedVisionAnalysis(params), (error: any) => error.code === 'AI_UNKNOWN_ERROR');
  assert.equal(calls, 1, 'Configuration/auth failures must not churn providers');
  assert.equal(logs.some(log => log.includes(sensitiveFixture)), false, 'No raw provider details in application logs');
} finally {
  globalThis.fetch = previousFetch;
  backendAxios.post = previousAxiosPost;
  Object.assign(console, previousLogs);
  for (const [name, value] of previousEnv) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
}
console.log('Gemini provider reliability passed: structured errors, quota cooldown, bounded retries, aborts, safe output, and no quota fallback.');

const food = (name: string, calories = 130) => validateMealVisionResult({
  foodClassification: 'food', classificationConfidence: 0.95, detectedDishName: name,
  items: [{ name, estimatedPortion: 'approximately 100 g', confidence: 0.92, portionConfidence: 0.8,
    nutrition: { calories, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0, sugar: null, sodium: null, saturatedFat: null } }],
  confidence: { itemsRecognition: 0.92, portionVolume: 0.8, totalNutrition: 0.8, overall: 0.8 }, visibleIngredients: [name],
});
const noPortion = validateMealVisionResult({
  foodClassification: 'food', classificationConfidence: 0.95, detectedDishName: 'Rice',
  items: [{ name: 'Rice', estimatedPortion: null, confidence: 0.92, portionConfidence: 0.8, nutrition: { calories: 999 } }],
});
assert.deepEqual(noPortion.totalNutrition, emptyNutrition(), 'Missing portions must not yield invented nutrition');
const storage = new Map<string, string>();
const localStorage = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) };
Object.assign(globalThis, { localStorage, window: { localStorage, location: { protocol: 'https:', hostname: 'foodscan.test' } } });
const clientsAndStores = [
  ['web', (await import('../src/api/client')).apiClient, (await import('../src/store/useAppStore')).useAppStore],
  ['mobile', (await import('../mobile/src/api/client')).apiClient, (await import('../mobile/src/store/useAppStore')).useAppStore],
] as const;
for (const [label, apiClient, store] of clientsAndStores) {
  const originalPost = apiClient.post;
  type Pending = { resolve: (data: unknown) => void; reject: (error: unknown) => void; config: any };
  const pending: Pending[] = [];
  apiClient.post = ((_url: string, _payload: unknown, config: any) => new Promise((resolve, reject) => pending.push({ resolve, reject, config }))) as any;
  const profile = { id: 'isolated-owner-a', email: '', fullName: 'Offline fixture', allergies: [] };
  const allReportsCleared = () => {
    assert.equal(store.getState().activeMealReport, null);
    assert.equal(store.getState().activePackagedReport, null);
    assert.equal(store.getState().activeQualityReport, null);
  };
  const fixtureResponse = (data: unknown) => ({ data: { success: true, data }, status: 200 });
  const rejectFixture = { response: { status: 503, data: { error: { code: 'AI_TEMPORARY_ERROR', message: sensitiveFixture } } } };
  const cases = [
    ['processMealScan', 'activeMealReport', 'mealAnalysis', food('Rice')],
    ['processPackagedScan', 'activePackagedReport', 'analysis', { foodClassification: 'food', productName: 'Fixture oats', nutrition: { calories: null }, nutritionBasis: 'Source label' }],
    ['processQualityScan', 'activeQualityReport', 'qualityResult', { itemName: 'Fixture rice', productName: 'Fixture rice', foodClassification: 'food', summary: 'Visible condition only', statusCategory: 'No obvious visible issue detected', detectedIssues: [] }],
    ['processBarcodeScan', 'activePackagedReport', 'analysis', { foodClassification: 'food', productName: 'Fixture oats', barcode: '1234567890123', nutrition: { calories: null } }],
  ] as const;
  try {
    for (const [method, report, resultKey, result] of cases) {
      store.getState().logout();
      store.getState().setUser(profile, 'isolated-auth-fixture');
      pending.length = 0;
      const action = () => store.getState()[method]('offline-image-fixture');
      const a = action();
      const idA = store.getState().activeScanRequestId;
      assert.ok(idA, `${label}/${method}: unique active request id`);
      assert.equal(await action(), false, 'Repeated submit is ignored');
      assert.equal(await store.getState().processMealScan('other-mode-fixture'), false, 'Cross-mode repeated submit is ignored');
      assert.equal(pending.length, 1, 'Only one request is sent');
      assert.equal(pending[0].config.scanRequestId, idA);
      assert.ok(pending[0].config.signal);
      pending[0].resolve(fixtureResponse({ [resultKey]: result }));
      assert.equal(await a, true);
      assert.deepEqual(store.getState()[report], result, 'Store must use returned data, not hardcoded nutrition');
      assert.equal(store.getState().isLoading, false);

      // Start B after A succeeded. Clear A before B even completes; a failed B
      // must never render A's otherwise valid old nutrition.
      const b = action();
      assert.notEqual(store.getState().activeScanRequestId, idA);
      allReportsCleared();
      pending[1].reject(rejectFixture);
      assert.equal(await b, false);
      allReportsCleared();
      assert.equal(store.getState().currentScreen, 'IMAGE_PREVIEW');
      assert.equal(store.getState().isLoading, false);
      assert.equal(store.getState().activeScanRequestId, null);
      assert.match(store.getState().errorMessage!, /temporarily busy/i);
      assert.equal(store.getState().errorMessage!.includes(sensitiveFixture), false);

      const old = action(), oldPending = pending[2];
      const oldId = store.getState().activeScanRequestId;
      store.getState().setCapturedImage('new-photo-fixture');
      assert.equal(oldPending.config.signal.aborted, true, 'Replacing photo cancels its outstanding request');
      const newest = action(), newestId = store.getState().activeScanRequestId;
      assert.notEqual(newestId, oldId);
      oldPending.resolve(fixtureResponse({ [resultKey]: result }));
      assert.equal(await old, false);
      assert.equal(store.getState().activeScanRequestId, newestId);
      assert.equal(store.getState().isLoading, true, 'Old completion cannot clear new request loading');
      allReportsCleared();
      pending[3].resolve(fixtureResponse({ [resultKey]: result }));
      assert.equal(await newest, true);

      // A stale rejection is equally unable to erase a newer success.
      const staleFailure = action();
      store.getState().cancelScan();
      const latestSuccess = action();
      pending[5].resolve(fixtureResponse({ [resultKey]: result }));
      await latestSuccess;
      pending[4].reject(rejectFixture);
      assert.equal(await staleFailure, false);
      assert.deepEqual(store.getState()[report], result);
      assert.equal(store.getState().errorMessage, null);

      // A request from user A cannot populate reports belonging to user B.
      const previousUserRequest = action();
      store.getState().setUser({ ...profile, id: 'isolated-owner-b' }, 'different-auth-fixture');
      pending[6].resolve(fixtureResponse({ [resultKey]: result }));
      assert.equal(await previousUserRequest, false);
      allReportsCleared();
      assert.equal(store.getState().isLoading, false);
      assert.equal(store.getState().activeScanRequestId, null);
    }
  } finally { store.getState().logout(); apiClient.post = originalPost; }
  console.log(`${label} scan lifecycle passed: all four modes, duplicate prevention, cleared failures, stale success/failure, and user isolation.`);
}
console.log('Gemini reliability suite passed; all fixtures were offline.');
