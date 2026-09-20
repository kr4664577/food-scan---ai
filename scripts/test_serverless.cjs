// Run against the actual emitted Vercel function, not the separate server.cjs bundle:
// node scripts/test_serverless.cjs /absolute/path/to/function/api/index.js
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { once } = require('node:events');

async function main() {
  assert.ok(process.argv[2], 'Pass the emitted Vercel API entrypoint');
  const exported = require(path.resolve(process.argv[2]));
  const handler = exported.default || exported;
  assert.equal(typeof handler, 'function', 'The serverless module must load as a handler');
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    // No accounts, credentials, Gemini calls, or database mutations are used.
    for (const [route, method, expectedStatus] of [
      ['/api/health', 'GET', 200],
      ['/api/auth/register', 'POST', 400],
      ['/api/auth/login', 'POST', 400],
      ['/api/auth/me', 'GET', 401],
      ['/api/scan/meal', 'POST', 400],
      ['/api/scan/packaged', 'POST', 400],
      ['/api/scan/quality', 'POST', 400]
    ]) {
      const response = await fetch(`${base}${route}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: '{}' } : {})
      });
      assert.equal(response.status, expectedStatus, route);
      assert.match(response.headers.get('content-type'), /application\/json/, route);
      const body = await response.json();
      if (expectedStatus === 200) assert.equal(body.status, 'OK');
      else {
        assert.equal(body.success, false, route);
        assert.ok(typeof body.error === 'string' || typeof body.error?.message === 'string', route);
      }
      console.log(`PASS ${method} ${route}: ${expectedStatus}`);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
