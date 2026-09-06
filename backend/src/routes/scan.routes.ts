import { Router } from 'express';
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
    return authenticateJWT(req, res, next);
  }
  next();
};

router.post('/barcode', optionalAuth, scanBarcode);
router.post('/packaged', optionalAuth, scanPackagedImage);
router.post('/meal', optionalAuth, scanMealImage);
router.post('/quality', optionalAuth, scanVisualQuality);

export default router;
