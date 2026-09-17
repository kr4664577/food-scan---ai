import { Router } from 'express';
import { getScanUsageDashboard, getFeedbackLearningDashboard } from '../controllers/admin.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';

const router = Router();
router.get('/usage', authenticateJWT, requireAdmin, getScanUsageDashboard);
router.get('/feedback-learning', authenticateJWT, requireAdmin, getFeedbackLearningDashboard);
export default router;
