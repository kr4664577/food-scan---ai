import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import type { RequestHandler } from 'express';

type Stage = 'body' | 'normalize' | 'gemini' | 'ai_parse' | 'lookup' | 'analysis' | 'nutrition' | 'database' | 'serialize';
const context = new AsyncLocalStorage<{ started: number; durations: Partial<Record<Stage, number>>; attempts: number }>();
export function recordScanDuration(stage: Stage, duration: number) {
  const trace = context.getStore();
  if (trace) trace.durations[stage] = (trace.durations[stage] || 0) + duration;
}

export async function timeScan<T>(stage: Stage, operation: () => Promise<T>): Promise<T> {
  const trace = context.getStore();
  const start = performance.now();
  if (trace && stage === 'gemini') trace.attempts++;
  try { return await operation(); }
  finally { if (trace) trace.durations[stage] = (trace.durations[stage] || 0) + performance.now() - start; }
}

// Mount before the JSON parser: body includes receipt/parsing, not time at the edge.
export const scanTiming: RequestHandler = (req, res, next) => {
  if (req.method !== 'POST' || !/^\/(api\/)?scan\//.test(req.path)) return next();
  const trace = { started: performance.now(), durations: {} as Partial<Record<Stage, number>>, attempts: 0 };
  context.run(trace, () => {
    let serializeStarted: number | undefined;
    const json = res.json;
    res.json = function (body) { serializeStarted = performance.now(); return json.call(this, body); };
    const send = res.send;
    res.send = function (body) {
      if (!res.headersSent) {
        if (serializeStarted !== undefined) trace.durations.serialize = performance.now() - serializeStarted;
        const total = performance.now() - trace.started;
        res.setHeader('Server-Timing', [...Object.entries(trace.durations).map(([key, ms]) => `${key};dur=${ms.toFixed(1)}`), `total;dur=${total.toFixed(1)}`].join(', '));
        res.setHeader('X-Scan-AI-Attempts', String(trace.attempts));
        if (process.env.NODE_ENV !== 'production' || process.env.SCAN_PERF_LOG === '1') {
          // Never log photos, prompts, results, user IDs, headers, URLs, or errors.
          console.info('[scan-perf]', JSON.stringify({ status: res.statusCode, ms: trace.durations, totalMs: Math.round(total), aiAttempts: trace.attempts }));
        }
      }
      return send.call(this, body);
    };
    next();
  });
};

export const bodyParsed: RequestHandler = (_req, _res, next) => {
  const trace = context.getStore();
  if (trace) trace.durations.body = performance.now() - trace.started;
  next();
};
