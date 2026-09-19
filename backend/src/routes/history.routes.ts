import { Router } from 'express';
import { getScanHistory, getFavorites, toggleFavorite, removeFavorite } from '../controllers/history.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);

// Both /api/history and /api/history/scans are supported
router.get('/', getScanHistory);
router.get('', getScanHistory);
router.get('/scans', getScanHistory);

// Favorites endpoints
router.get('/favorites', getFavorites);
router.post('/favorite', toggleFavorite);
router.post('/favorites', toggleFavorite);
router.post('/favorites/toggle', toggleFavorite);
router.delete('/favorite/:scanId', removeFavorite);
router.delete('/favorites/:scanId', removeFavorite);

export default router;
