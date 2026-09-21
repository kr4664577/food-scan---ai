import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  publicMessage?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.publicMessage || (statusCode === 429 ? 'Too many requests or AI quota exhausted. Please try again later.' : statusCode === 413 ? 'This image is too large. Please choose a smaller photo.' : 'Unable to complete this request. Please try again.');

  // Sanitize message: never expose internal keys or credentials
  if (message.includes('GEMINI_API_KEY') || message.includes('DATABASE_URL') || message.includes('JWT_SECRET')) {
    message = 'Configuration error encountered. Please contact administrator.';
  }

  // Safe backend logging without leaking sensitive payloads
  console.error(`[API Error] Status ${statusCode}`);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode
    }
  });
};
