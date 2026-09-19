import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  scanBarcode,
  scanPackagedImage,
  scanMealImage,
  scanVisualQuality
} from '../controllers/scan.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Allow authenticated or anonymous scans (optional auth token check)
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && token !== 'null' && token !== 'undefined') {
      const secret = process.env.JWT_SECRET || 'fallback_jwt_secret';
      try {
        const decoded = (jwt as any).verify(token, secret);
        req.user = decoded;
      } catch {
        // Fall back gracefully to guest so scanning never breaks with 401
        req.user = undefined;
      }
    }
  }
  next();
};

router.post('/barcode', optionalAuth, scanBarcode);
router.post('/packaged', optionalAuth, scanPackagedImage);
router.post('/packaged-image', optionalAuth, scanPackagedImage);
router.post('/meal', optionalAuth, scanMealImage);
router.post('/meal-image', optionalAuth, scanMealImage);
router.post('/quality', optionalAuth, scanVisualQuality);

export default router;
