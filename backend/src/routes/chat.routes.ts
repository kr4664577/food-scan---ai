import { Router } from 'express';
import { handleNutritionChat } from '../controllers/chat.controller';

const router = Router();

router.post('/', handleNutritionChat);

export default router;
