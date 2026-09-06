import { Router } from 'express';
import { getScanHistory, getFavorites, toggleFavorite } from '../controllers/history.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/scans', getScanHistory);
router.get('/favorites', getFavorites);
router.post('/favorites/toggle', toggleFavorite);

export default router;
