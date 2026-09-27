// Only timings and byte counts are retained, in memory. No food/user/image data.
type Phase = 'idle' | 'preparing' | 'ready' | 'uploading' | 'analyzing' | 'rendering' | 'done' | 'failed';
type Trace = { requestId?: string; phase: Phase; started: number; ready?: number; submitted?: number; uploaded?: number; responded?: number; rendered?: number; imageBytes?: number; imageDecodeMs?: number; resizeEncodeMs?: number; server?: Record<string, number> };
let trace: Trace = { phase: 'idle', started: 0 };
let nextRequest = 0;
const listeners = new Set<() => void>();
const now = () => performance.now();
const publish = (values: Partial<Trace>) => { trace = { ...trace, ...values }; listeners.forEach(fn => fn()); };
export const subscribeScan = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const scanPhase = () => trace.phase;
export const beginCapture = () => { trace = { phase: 'preparing', started: now() }; publish({}); };
export const imageReady = (dataUrl: string) => publish({ phase: 'ready', ready: now(), imageBytes: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * .75) });
export const imagePreparationTiming = (imageDecodeMs: number, resizeEncodeMs: number) => publish({ imageDecodeMs: Math.round(imageDecodeMs), resizeEncodeMs: Math.round(resizeEncodeMs) });
export const beginScanRequest = (requestId = `scan-${++nextRequest}`) => {
  if (trace.requestId === requestId) return requestId;
  if (trace.phase !== 'ready') beginCapture();
  publish({ requestId, phase: 'uploading', submitted: now(), uploaded: undefined, responded: undefined, rendered: undefined, server: undefined });
  return requestId;
};
export const cancelScanTrace = (requestId?: string) => {
  if (requestId && trace.requestId !== requestId) return;
  trace = { phase: 'idle', started: 0 }; publish({});
};
export const scanRequestId = () => trace.requestId;
export const scanUploaded = (requestId = trace.requestId) => { if (requestId === trace.requestId && trace.phase === 'uploading') publish({ phase: 'analyzing', uploaded: now() }); };
export const scanResponse = (header: unknown, success: boolean, requestId = trace.requestId) => {
  if (!requestId || requestId !== trace.requestId) return;
  const server: Record<string, number> = {};
  // Accept only known metric names with numeric values. Never echo arbitrary headers.
  for (const match of String(header || '').matchAll(/\b(body|normalize|gemini|ai_parse|lookup|analysis|nutrition|database|serialize|total);dur=([\d.]+)/g)) server[match[1]] = Number(match[2]);
  publish({ phase: success ? 'rendering' : 'failed', responded: now(), server });
  if (!success) logTimings();
};
export function scanTimings() {
  const elapsed = (end?: number, start?: number) => end !== undefined && start !== undefined ? Math.round(end - start) : null;
  return {
    preparationMs: elapsed(trace.ready, trace.started),
    imageDecodeMs: trace.imageDecodeMs,
    resizeEncodeMs: trace.resizeEncodeMs,
    previewUserWaitMs: elapsed(trace.submitted, trace.ready),
    selectionToUploadMs: elapsed(trace.uploaded, trace.started),
    uploadMs: elapsed(trace.uploaded, trace.submitted),
    uploadToResponseMs: elapsed(trace.responded, trace.uploaded),
    apiRoundTripMs: elapsed(trace.responded, trace.submitted),
    responseToPaintMs: elapsed(trace.rendered, trace.responded),
    submitToPaintMs: elapsed(trace.rendered, trace.submitted),
    selectionToPaintMs: elapsed(trace.rendered, trace.started),
    imageBytes: trace.imageBytes, serverMs: trace.server,
  };
}
function logTimings() {
  if ((import.meta as any).env?.DEV || (import.meta as any).env?.VITE_SCAN_PERF === '1') console.info('[scan-perf]', scanTimings());
}
export const scanRendered = (requestId = trace.requestId) => {
  if (requestId !== trace.requestId || trace.phase !== 'rendering') return;
  publish({ phase: 'done', rendered: now() });
  logTimings();
};
