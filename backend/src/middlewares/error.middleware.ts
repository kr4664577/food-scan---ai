import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';

  // Sanitize message: never expose internal keys or credentials
  if (message.includes('GEMINI_API_KEY') || message.includes('DATABASE_URL') || message.includes('JWT_SECRET')) {
    message = 'Configuration error encountered. Please contact administrator.';
  }

  // Safe backend logging without leaking sensitive payloads
  console.error(`[API Error] ${req.method} ${req.originalUrl || req.url} - Status ${statusCode}:`, message);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode
    }
  });
};
