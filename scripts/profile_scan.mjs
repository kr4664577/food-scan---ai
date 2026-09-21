// Explicit opt-in live benchmark. Uses a public image, never account credentials.
// node scripts/profile_scan.mjs https://your-app/api/scan/meal https://public-image.jpg
import { performance } from 'node:perf_hooks';
const [endpoint, imageUrl] = process.argv.slice(2);
if (!endpoint || !imageUrl) throw new Error('Supply a scan endpoint and a public image URL. This makes one real AI request.');
const started = performance.now();
const image = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
if (!image.ok) throw new Error(`Image download failed (${image.status}).`);
const bytes = Buffer.from(await image.arrayBuffer());
const ready = performance.now();
const response = await fetch(endpoint, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ imageBase64: bytes.toString('base64'), mimeType: image.headers.get('content-type')?.split(';')[0] || 'image/jpeg' }),
  signal: AbortSignal.timeout(65000),
});
const received = performance.now();
const body = await response.json();
const ended = performance.now();
const server = {};
for (const m of (response.headers.get('server-timing') || '').matchAll(/\b(body|normalize|gemini|ai_parse|lookup|analysis|nutrition|database|serialize|total);dur=([\d.]+)/g)) server[m[1]] = Number(m[2]);
console.log(JSON.stringify({ status: response.status, success: body.success === true, imageBytes: bytes.length, imageFetchMs: Math.round(ready - started), apiRoundTripMs: Math.round(received - ready), responseReadParseMs: Math.round(ended - received), serverMs: server, aiAttempts: Number(response.headers.get('x-scan-ai-attempts')) || null }, null, 2));
// Node fetch does not expose upload completion or browser paint. Use browser telemetry for those.
if (!response.ok || !body.success) process.exitCode = 1;
