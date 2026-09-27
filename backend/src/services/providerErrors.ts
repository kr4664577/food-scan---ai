import { retryAfterSeconds } from './providerRetry';

export type AIErrorCode = 'AI_QUOTA_EXCEEDED' | 'AI_TEMPORARY_ERROR' | 'AI_NETWORK_ERROR' | 'AI_TIMEOUT' | 'AI_INVALID_RESPONSE' | 'AI_UNKNOWN_ERROR';

const errors = {
  AI_QUOTA_EXCEEDED: { category: 'RATE_LIMIT', statusCode: 429, retryable: false, message: 'AI scanning is temporarily unavailable because the AI service has reached its usage limit. Please try again later.' },
  AI_TEMPORARY_ERROR: { category: 'TEMPORARY_PROVIDER_ERROR', statusCode: 503, retryable: true, message: 'The AI service is temporarily busy. Please try again in a moment.' },
  AI_NETWORK_ERROR: { category: 'NETWORK_ERROR', statusCode: 502, retryable: true, message: 'Unable to connect to the AI service. Check your connection and try again.' },
  AI_TIMEOUT: { category: 'TIMEOUT', statusCode: 504, retryable: true, message: 'The scan took too long to complete. Please try again.' },
  AI_INVALID_RESPONSE: { category: 'INVALID_RESPONSE', statusCode: 502, retryable: false, message: "I couldn't confidently identify this food. Try a clearer photo with the food fully visible." },
  AI_UNKNOWN_ERROR: { category: 'UNKNOWN_PROVIDER_ERROR', statusCode: 502, retryable: false, message: 'AI scanning is temporarily unavailable. Please try again later.' },
} as const;

// Only these public, application-owned fields may leave the provider boundary.
// Never retain the SDK error as a cause: it can include a key, prompt, or photo.
export class AIProviderError extends Error {
  readonly category: string;
  readonly statusCode: number;
  readonly publicMessage: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;
  constructor(readonly code: AIErrorCode, options: { retryAfterSeconds?: number } = {}) {
    const details = errors[code];
    super(details.message);
    this.name = 'AIProviderError';
    this.category = details.category;
    this.statusCode = details.statusCode;
    this.publicMessage = details.message;
    this.retryable = details.retryable;
    const cooldown = options.retryAfterSeconds;
    this.retryAfterSeconds = typeof cooldown === 'number' && Number.isFinite(cooldown) && cooldown > 0
      ? Math.min(604800, Math.ceil(cooldown)) : code === 'AI_QUOTA_EXCEEDED' ? 60 : undefined;
  }
}

function providerBody(error: any): any {
  if (error?.response?.data) return error.response.data;
  if (error?.error) return error;
  if (typeof error?.message === 'string') {
    try { return JSON.parse(error.message); } catch { /* The SDK also uses plain messages. */ }
  }
  return undefined;
}

export function providerHttpStatus(error: any): number | undefined {
  const body = providerBody(error);
  const candidates = [error?.response?.status, error?.status, error?.statusCode, error?.code, body?.error?.code, body?.code];
  for (const value of candidates) {
    if ((typeof value === 'number' || typeof value === 'string') && /^\d{3}$/.test(String(value))) {
      const status = Number(value);
      if (status >= 100 && status <= 599) return status;
    }
  }
  return undefined;
}

function providerText(error: any): string {
  const body = providerBody(error);
  // Inspect error text for classification only. It is never returned or logged.
  return [error?.name, error?.code, error?.status, error?.message, body?.error?.status, body?.error?.message, body?.status, body?.message]
    .filter(value => typeof value === 'string').join(' ').toLowerCase();
}

export function classifyProviderError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error;
  const status = providerHttpStatus(error);
  const text = providerText(error);
  const cooldown = retryAfterSeconds(error);
  if (status === 429 || /resource[_ ]exhausted|quota|rate[ _-]?limit|too many requests|usage limit/.test(text)) {
    return new AIProviderError('AI_QUOTA_EXCEEDED', { retryAfterSeconds: cooldown });
  }
  // A numeric 5xx response is a provider failure, not a transport/network failure.
  if ([500, 502, 503].includes(status || 0)) return new AIProviderError('AI_TEMPORARY_ERROR', { retryAfterSeconds: cooldown });
  if (status === 504 || /aborterror|timeouterror|timed? ?out|timeout|etimedout|econnaborted|err_canceled/.test(text)) {
    return new AIProviderError('AI_TIMEOUT');
  }
  if (/overloaded|unavailable|temporary server|temporarily busy/.test(text)) {
    return new AIProviderError('AI_TEMPORARY_ERROR', { retryAfterSeconds: cooldown });
  }
  if (/network|fetch failed|econnreset|econnrefused|enotfound|eai_again|socket hang up/.test(text)) return new AIProviderError('AI_NETWORK_ERROR');
  if (error instanceof SyntaxError || /invalid json|empty response|invalid response/.test(text)) {
    return new AIProviderError('AI_INVALID_RESPONSE');
  }
  return new AIProviderError('AI_UNKNOWN_ERROR');
}

// Only model availability errors may change models. Invalid output, auth errors,
// quota, and exhausted transient retries must never cause a fallback storm.
export function isModelUnavailable(error: unknown): boolean {
  const status = providerHttpStatus(error);
  if (status === 404) return true;
  return status === 400 && /model[^\n]*(?:not found|not supported|unsupported|does not exist|not available)/.test(providerText(error));
}
