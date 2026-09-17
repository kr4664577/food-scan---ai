import { Router } from 'express';
import { getScanUsageDashboard } from '../controllers/admin.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';

const router = Router();

router.get('/usage', authenticateJWT, requireAdmin, getScanUsageDashboard);

export default router;
