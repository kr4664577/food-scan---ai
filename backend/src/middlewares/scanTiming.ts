import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

type Stage = 'body' | 'normalize' | 'gemini' | 'ai_parse' | 'lookup' | 'analysis' | 'nutrition' | 'database' | 'serialize';
const context = new AsyncLocalStorage<{ requestId: string; signal: AbortSignal; started: number; durations: Partial<Record<Stage, number>>; attempts: number; provider?: string; model?: string }>();
export const scanRequestId = () => context.getStore()?.requestId;
export const scanAbortSignal = () => context.getStore()?.signal;
export function logScanFailure(details: { category: string; httpStatus: number; provider?: string; model?: string; durationMs?: number; retryCount?: number }) {
  const trace = context.getStore();
  if (trace) { trace.provider = details.provider || trace.provider; trace.model = details.model || trace.model; }
  const safeLabel = (value: string | undefined) => value && /^[a-zA-Z0-9_.-]{1,80}$/.test(value) ? value : undefined;
  console.warn('[scan-failure]', JSON.stringify({ timestamp: new Date().toISOString(), requestId: trace?.requestId || randomUUID(), category: safeLabel(details.category), httpStatus: Number.isInteger(details.httpStatus) ? details.httpStatus : 500, provider: safeLabel(details.provider || trace?.provider), model: safeLabel(details.model || trace?.model), durationMs: Math.round(Math.max(0, details.durationMs ?? (trace ? performance.now() - trace.started : 0))), retryCount: Math.max(0, details.retryCount ?? (trace ? trace.attempts - 1 : 0)) }));
}
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
  const controller = new AbortController();
  const abort = () => { if (!res.writableEnded) controller.abort(); };
  req.once('aborted', abort);
  res.once('close', abort);
  res.once('finish', () => { req.off('aborted', abort); res.off('close', abort); });
  const trace = { requestId: randomUUID(), signal: controller.signal, started: performance.now(), durations: {} as Partial<Record<Stage, number>>, attempts: 0 };
  res.setHeader('X-Request-ID', trace.requestId);
  context.run(trace, () => {
    let serializeStarted: number | undefined;
    const json = res.json;
    res.json = function (body) { serializeStarted = performance.now(); return json.call(this, body); };
    // Serverless adapters may implement json() without Express's send().
    // end() is shared by both paths; preserve the adapter's serialization.
    const end = res.end;
    res.end = function (this: typeof res, ...args: any[]) {
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
      return (end as any).apply(this, args);
    } as typeof res.end;
    next();
  });
};

export const bodyParsed: RequestHandler = (_req, _res, next) => {
  const trace = context.getStore();
  if (trace) trace.durations.body = performance.now() - trace.started;
  next();
};
