import { Request, Response, NextFunction } from 'express';
import { scanRequestId, logScanFailure } from './scanTiming';

export interface AppError extends Error {
  statusCode?: number;
  publicMessage?: string;
  retryAfterSeconds?: number;
  code?: string;
  category?: string;
  retryable?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const knownCodes = new Set(['AI_QUOTA_EXCEEDED', 'AI_TEMPORARY_ERROR', 'AI_NETWORK_ERROR', 'AI_TIMEOUT', 'AI_INVALID_RESPONSE', 'AI_UNKNOWN_ERROR', 'FOOD_NOT_IDENTIFIED', 'NON_FOOD_IMAGE', 'INVALID_IMAGE']);
  const code = err.code && knownCodes.has(err.code) ? err.code : statusCode === 429 ? 'APP_RATE_LIMITED' : statusCode === 413 ? 'IMAGE_TOO_LARGE' : 'APP_REQUEST_FAILED';
  let message = err.publicMessage || (statusCode === 429 ? 'Too many requests or AI quota exhausted. Please try again later.' : statusCode === 413 ? 'This image is too large. Please choose a smaller photo.' : 'Unable to complete this request. Please try again.');

  // Sanitize message: never expose internal keys or credentials
  if (message.includes('GEMINI_API_KEY') || message.includes('DATABASE_URL') || message.includes('JWT_SECRET')) {
    message = 'Configuration error encountered. Please contact administrator.';
  }

  // Safe backend logging without leaking sensitive payloads
  logScanFailure({ category: knownCodes.has(code) ? err.category || code : code, httpStatus: statusCode });
  if (res.headersSent || res.destroyed) return;
  const retryAfter = typeof err.retryAfterSeconds === 'number' && Number.isFinite(err.retryAfterSeconds) && err.retryAfterSeconds > 0 ? Math.ceil(err.retryAfterSeconds) : undefined;
  if (retryAfter) res.setHeader('Retry-After', String(retryAfter));

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      retryable: knownCodes.has(code) ? err.retryable === true : statusCode >= 500 || statusCode === 429,
      statusCode,
      ...(scanRequestId() ? { requestId: scanRequestId() } : {}),
      ...(retryAfter ? { retryAfterSeconds: retryAfter } : {})
    }
  });
};
