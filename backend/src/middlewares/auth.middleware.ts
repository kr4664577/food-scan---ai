import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. No token provided.', statusCode: 401 }
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const secret = process.env.JWT_SECRET;

  // Never run authenticated endpoints with a predictable fallback secret.
  if (!secret || secret.length < 32) {
    console.error('JWT_SECRET is missing or too short for production.');
    return res.status(503).json({
      success: false,
      error: { message: 'Authentication service is not configured.', statusCode: 503 }
    });
  }

  try {
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    if (!decoded?.userId || !decoded?.email) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token payload.', statusCode: 401 }
      });
    }
    req.user = decoded;
    next();
  } catch (_error) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token.', statusCode: 401 }
    });
  }
};
