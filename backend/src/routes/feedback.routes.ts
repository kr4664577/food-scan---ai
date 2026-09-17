import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { submitScanFeedback } from '../controllers/feedback.controller';

const router = Router();

router.use(authenticateJWT);
router.post('/', submitScanFeedback);

export default router;
