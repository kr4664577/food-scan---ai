import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import scanRoutes from './routes/scan.routes';
import historyRoutes from './routes/history.routes';
import uploadRoutes from './routes/upload.routes';
import chatRoutes from './routes/chat.routes';
import adminRoutes from './routes/admin.routes';
import feedbackRoutes from './routes/feedback.routes';
import { errorHandler } from './middlewares/error.middleware';
import { seedFoodDatabase } from './db/seedFoods';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet());

const configuredOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://food-scan-6odbmulzi-krishna-project.vercel.app'
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin?.replace(/\/$/, '');
    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true
}));

app.use(express.json({ limit: '15mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please try again later.', statusCode: 429 } }
});
app.use('/api', limiter);

const healthHandler = (req: any, res: any) => {
  res.status(200).json({
    status: 'OK',
    service: 'FoodScan AI Backend API',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
};
app.get('/health', healthHandler);
app.get('/api', healthHandler);
app.get('/api/health', healthHandler);

app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

import path from 'path';
import fs from 'fs';
const frontendDist = path.join(__dirname, '../../mobile/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`🚀 FoodScan AI Backend API running on port ${PORT}`);
    try {
      await seedFoodDatabase();
    } catch (e) {
      console.warn('Seed database notice:', e);
    }
  });
}

export default app;
