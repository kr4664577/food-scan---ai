import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const configuredAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const email = req.user?.email?.toLowerCase();

  if (!email || configuredAdmins.length === 0 || !configuredAdmins.includes(email)) {
    return res.status(403).json({
      success: false,
      error: { message: 'Admin access required.', statusCode: 403 }
    });
  }

  next();
};
