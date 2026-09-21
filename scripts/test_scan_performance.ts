import assert from 'node:assert/strict';
import express from 'express';
import { scanTiming, bodyParsed, timeScan } from '../backend/src/middlewares/scanTiming';
import { fitImage, imageOptions } from '../src/utils/imageUtils';
import { beginCapture, imageReady, beginScanRequest, scanUploaded, scanResponse, scanRendered, scanTimings, scanPhase } from '../src/utils/scanPerformance';

assert.deepEqual(fitImage(4032, 3024, 1280), { width: 1280, height: 960 });
assert.deepEqual(fitImage(600, 400, 1280), { width: 600, height: 400 });
assert.deepEqual(fitImage(3024, 4032, 1600), { width: 1200, height: 1600 });
assert.throws(() => fitImage(0, 100, 1280));
assert.ok(imageOptions('PACKAGED_PHOTO').maxDimension > imageOptions('MEAL_PHOTO').maxDimension);
beginCapture(); imageReady('data:image/jpeg;base64,AAAA'); beginScanRequest(); scanUploaded();
assert.equal(scanPhase(), 'analyzing');
scanResponse('gemini;dur=10.5, secret;desc="never retain", total;dur=12.5', true);
scanRendered();
assert.equal(scanPhase(), 'done');
assert.deepEqual(scanTimings().serverMs, { gemini: 10.5, total: 12.5 });
assert.ok(scanTimings().submitToPaintMs! >= 0);

const app = express();
app.use(scanTiming, express.json(), bodyParsed);
app.post('/api/scan/meal', async (req, res) => {
  for (let i = 0; i < req.body.attempts; i++) await timeScan('gemini', async () => null);
  await timeScan('database', async () => null);
  res.json({ success: true });
});
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const port = (server.address() as any).port;
try {
  const replies = await Promise.all([1, 2].map(attempts => fetch(`http://127.0.0.1:${port}/api/scan/meal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attempts }) })));
  assert.deepEqual(replies.map(r => r.headers.get('x-scan-ai-attempts')), ['1', '2'], 'Concurrent traces must be isolated');
  for (const r of replies) {
    const timings = r.headers.get('server-timing')!;
    for (const name of ['body', 'gemini', 'database', 'serialize', 'total']) assert.match(timings, new RegExp(`${name};dur=\\d`));
    assert.deepEqual(await r.json(), { success: true }, 'Instrumentation must not change the response');
  }
} finally { server.close(); }

// Offline SDK transport: exercises retry policy without sending images/credentials anywhere.
const realFetch = globalThis.fetch;
process.env.GEMINI_API_KEY = 'offline-test-only';
delete process.env.GROK_API_KEY; delete process.env.XAI_API_KEY;
let calls = 0;
let failures: number[] = [];
globalThis.fetch = (async () => {
  calls++;
  const status = failures.shift();
  return new Response(JSON.stringify(status ? { error: { code: status, status: 'UNAVAILABLE', message: 'offline failure' } } : { candidates: [{ content: { parts: [{ text: '{"verifiedFixture":true}' }] } }] }), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;
try {
  const { runUnifiedVisionAnalysis } = await import('../backend/src/services/aiVision.service');
  const params = { prompt: 'offline transport test', imageBase64: 'AAAA', mimeType: 'image/jpeg' };
  assert.deepEqual(await runUnifiedVisionAnalysis(params), { verifiedFixture: true });
  assert.equal(calls, 1, 'One healthy request must make exactly one provider call');
  calls = 0; failures = [503];
  await runUnifiedVisionAnalysis(params);
  assert.equal(calls, 2, 'SDK and application retries must not multiply');
  calls = 0; failures = [429];
  await assert.rejects(runUnifiedVisionAnalysis(params), /quota/);
  assert.equal(calls, 1, 'Do not repeatedly spend quota on a rejected request');
  calls = 0; failures = [404, 404, 404, 404];
  await assert.rejects(runUnifiedVisionAnalysis(params), /analysis failed/);
  assert.equal(calls, 4, 'Try each existing model once without hidden SDK retries');
  calls = 0; failures = [503, 503, 503, 503, 503, 503];
  await assert.rejects(runUnifiedVisionAnalysis(params), /analysis failed/);
  assert.equal(calls, 5, 'At most one transient retry across the fallback chain');
} finally { globalThis.fetch = realFetch; delete process.env.GEMINI_API_KEY; }
console.log('Scan performance regressions passed: image sizing, safe metrics, request isolation, response preservation, bounded retries.');
