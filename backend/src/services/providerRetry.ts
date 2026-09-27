// Only allow numeric retry metadata out of provider errors; never forward details.
export function retryAfterSeconds(error: any, now = Date.now()): number | undefined {
  const headers = error?.response?.headers || error?.headers;
  const raw = headers?.get?.('retry-after') ?? headers?.['retry-after'];
  let seconds: number | undefined;
  if (typeof raw === 'string' || typeof raw === 'number') {
    const text = String(raw).trim();
    seconds = /^\d+(\.\d+)?$/.test(text) ? Number(text) : (Date.parse(text) - now) / 1000;
  }
  // Google SDK ApiError preserves its structured error body in message.
  if (!Number.isFinite(seconds)) {
    let body = error?.response?.data || (error?.error || error?.details ? error : undefined);
    if (!body && typeof error?.message === 'string') { try { body = JSON.parse(error.message); } catch {} }
    const details = body?.error?.details || body?.details;
    if (Array.isArray(details)) {
      const retry = details.find(d => d?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
      const delay = retry?.retryDelay;
      if (typeof delay === 'string' && /^\d+(\.\d+)?s$/.test(delay)) seconds = Number(delay.slice(0, -1));
      else if (delay && typeof delay === 'object') seconds = Number(delay.seconds || 0) + Number(delay.nanos || 0) / 1e9;
    }
  }
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? Math.min(604800, Math.ceil(seconds)) : undefined;
}

export const VISION_DEADLINE_MS = 25000;
export const VISION_ATTEMPT_TIMEOUT_MS = 20000;
export const MAX_PROVIDER_CALLS = 5;
export const MAX_TRANSIENT_RETRIES = 2;

export function providerRetryDelay(retryIndex: number, random = Math.random): number {
  return Math.min(3000, 500 * 2 ** Math.max(0, retryIndex)) + Math.floor(random() * 250);
}

function timeoutError(): Error {
  return Object.assign(new Error('Provider request timeout.'), { name: 'TimeoutError' });
}

// The abort signal reaches the actual fetch/axios transport, not just a detached
// Promise.race. Clear timers/listeners after every success and failure.
export async function runProviderAttempt<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: { deadlineAt: number; attemptTimeoutMs?: number; signal?: AbortSignal },
): Promise<T> {
  const remaining = Math.min(options.deadlineAt - Date.now(), options.attemptTimeoutMs ?? VISION_ATTEMPT_TIMEOUT_MS);
  if (remaining <= 0 || options.signal?.aborted) throw timeoutError();
  const controller = new AbortController();
  const abort = () => controller.abort(timeoutError());
  const timer = setTimeout(abort, remaining);
  options.signal?.addEventListener('abort', abort, { once: true });
  let rejectAborted: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAborted = () => reject(timeoutError());
    controller.signal.addEventListener('abort', rejectAborted, { once: true });
  });
  try {
    const result = await Promise.race([operation(controller.signal), aborted]);
    if (controller.signal.aborted) throw timeoutError();
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw timeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
    if (rejectAborted) controller.signal.removeEventListener('abort', rejectAborted);
    options.signal?.removeEventListener('abort', abort);
  }
}

export async function waitForProviderRetry(delay: number, deadlineAt: number, signal?: AbortSignal): Promise<void> {
  // Leave enough budget to begin a meaningful next attempt.
  if (Date.now() + delay + 1000 >= deadlineAt || signal?.aborted) throw timeoutError();
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(timeoutError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, delay);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
