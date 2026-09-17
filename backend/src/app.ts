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
import { errorHandler } from './middlewares/error.middleware';
import { seedFoodDatabase } from './db/seedFoods';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: { message: 'Too many requests, please try again later.', statusCode: 429 } }
});
app.use('/api', limiter);

// Health check endpoints (supports /health, /api, and /api/health)
const healthHandler = (req: any, res: any) => {
  res.status(200).json({
    status: 'OK',
    service: 'FoodScan AI Backend API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
};
app.get('/health', healthHandler);
app.get('/api', healthHandler);
app.get('/api/health', healthHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Serve compiled mobile/web assets and APK downloads in production
import path from 'path';
import fs from 'fs';
const frontendDist = path.join(__dirname, '../../mobile/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global Error Handler (Adheres to KI Error Handling Guidelines)
app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`🚀 FoodScan AI Backend API running on http://0.0.0.0:${PORT} (LAN: http://192.168.31.218:${PORT})`);
    try {
      await seedFoodDatabase();
    } catch (e) {
      console.warn('Seed database notice:', e);
    }
  });
}

export default app;
