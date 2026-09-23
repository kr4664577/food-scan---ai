import assert from 'node:assert/strict';
import { apiClient } from '../src/api/client';

let calls = 0;
const realNow = Date.now;
let now = realNow();
Date.now = () => now;
apiClient.defaults.adapter = async config => {
  calls++;
  if (calls === 1) throw Object.assign(new Error('Quota fixture'), { config, response: { status: 429, headers: { 'retry-after': '30' }, data: { error: { message: 'Try later', retryAfterSeconds: 30 } } } });
  return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true } };
};
try {
  await assert.rejects(apiClient.post('/scan/meal', {}));
  await assert.rejects(apiClient.post('/scan/meal', {}), (e: any) => /wait 30 seconds/.test(e.response?.data?.error?.message));
  assert.equal(calls, 1, 'Cooldown must not send another scan request');
  await apiClient.get('/auth/me');
  assert.equal(calls, 2, 'Session restoration must not be blocked by scan cooldown');
  now += 31000;
  await apiClient.post('/scan/meal', {});
  assert.equal(calls, 3);
  console.log('Scan Retry-After cooldown passed: no duplicate request, auth unaffected, manual retry after wait.');
} finally { Date.now = realNow; }
