import assert from 'node:assert/strict';
import { apiClient } from '../src/api/client';

let calls = 0;
const realNow = Date.now;
let now = realNow();
Date.now = () => now;
let nextFailure: { status: number; code: string; seconds?: number } | undefined = { status: 429, code: 'AI_QUOTA_EXCEEDED', seconds: 30 };
apiClient.defaults.adapter = async config => {
  calls++;
  if (nextFailure) {
    const failure = nextFailure; nextFailure = undefined;
    throw Object.assign(new Error('Offline failure fixture'), { config, response: { status: failure.status, headers: failure.seconds ? { 'retry-after': String(failure.seconds) } : {}, data: { error: { code: failure.code, retryAfterSeconds: failure.seconds } } } });
  }
  return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true } };
};
try {
  await assert.rejects(apiClient.post('/scan/meal', {}));
  await assert.rejects(apiClient.post('/scan/meal', {}), (e: any) => e.scanCooldown === true && e.response?.data?.error?.retryAfterSeconds === 30);
  assert.equal(calls, 1, 'Cooldown must not send another scan request');
  now += 10000;
  await assert.rejects(apiClient.post('/scan/quality', {}), (e: any) => e.response?.data?.error?.retryAfterSeconds === 20);
  assert.equal(calls, 1, 'Locally blocked requests cannot extend a provider cooldown');
  await apiClient.get('/auth/me');
  assert.equal(calls, 2, 'Session restoration must not be blocked by scan cooldown');
  await apiClient.post('/scan/barcode', {});
  assert.equal(calls, 3, 'Gemini quota must not block the independent barcode provider');
  await apiClient.post('/scan/meal', {}, { baseURL: 'https://different-offline-api.test/api' });
  assert.equal(calls, 4, 'A provider cooldown belongs to its configured backend');
  now += 21000;
  await apiClient.post('/scan/meal', {});
  assert.equal(calls, 5);
  nextFailure = { status: 429, code: 'AI_QUOTA_EXCEEDED' };
  await assert.rejects(apiClient.post('/scan/meal', {}));
  await assert.rejects(apiClient.post('/scan/packaged', {}), (e: any) => e.response?.data?.error?.retryAfterSeconds === 60);
  assert.equal(calls, 6, 'Quota without Retry-After defaults to a 60-second cooldown');
  now += 61000;
  nextFailure = { status: 503, code: 'AI_TEMPORARY_ERROR', seconds: 15 };
  await assert.rejects(apiClient.post('/scan/meal', {}));
  await assert.rejects(apiClient.post('/scan/meal', {}), (e: any) => e.response?.data?.error?.code === 'AI_TEMPORARY_ERROR' && e.response?.data?.error?.retryAfterSeconds === 15);
  assert.equal(calls, 7, '503 Retry-After consistently uses temporary-provider cooldown');
  console.log('Scan cooldown passed: backend/provider scope, default quota cooldown, no extension, auth/barcode unaffected, and bounded manual retry.');
} finally { Date.now = realNow; }
