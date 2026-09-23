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
    let body = error?.response?.data;
    if (!body && typeof error?.message === 'string') { try { body = JSON.parse(error.message); } catch {} }
    const details = body?.error?.details || body?.details;
    if (Array.isArray(details)) {
      const retry = details.find(d => d?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
      const delay = retry?.retryDelay;
      if (typeof delay === 'string' && /^\d+(\.\d+)?s$/.test(delay)) seconds = Number(delay.slice(0, -1));
      else if (delay && typeof delay === 'object') seconds = Number(delay.seconds || 0) + Number(delay.nanos || 0) / 1e9;
    }
  }
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 && seconds <= 604800 ? Math.ceil(seconds) : undefined;
}
