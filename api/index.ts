import app from '../backend/src/app';

/**
 * Vercel Serverless Function entry point.
 * Wraps Express app and handles URL reconstruction when Vercel rewrites
 * routes into /api/index.ts.
 */
export default function handler(req: any, res: any) {
  // Capture matched path from Vercel edge routing headers
  const matchedPath =
    req.headers?.['x-matched-path'] ||
    req.headers?.['x-forwarded-uri'] ||
    req.headers?.['x-vercel-matched-path'];

  // If Vercel rewrote req.url to /api/index.ts or /api or /
  if (
    matchedPath &&
    typeof matchedPath === 'string' &&
    (req.url === '/api/index.ts' ||
      req.url === '/api/index' ||
      req.url === '/api' ||
      req.url === '/api/' ||
      req.url === '/' ||
      req.url?.startsWith('/api/index.ts?') ||
      req.url?.startsWith('/api?'))
  ) {
    const queryIndex = req.url.indexOf('?');
    const queryString = queryIndex !== -1 ? req.url.slice(queryIndex) : '';
    const restoredUrl = matchedPath.includes('?') ? matchedPath : `${matchedPath}${queryString}`;
    req.url = restoredUrl;
  }

  // Production-safe diagnostic log for Vercel executions
  console.log(`[Vercel Serverless API] ${req.method} ${req.url} (matched: ${matchedPath || 'direct'})`);

  return app(req, res);
}

