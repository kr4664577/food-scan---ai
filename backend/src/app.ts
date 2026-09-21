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
import { getScanHistory } from './controllers/history.controller';
import { authenticateJWT } from './middlewares/auth.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { seedFoodDatabase } from './db/seedFoods';
import { scanTiming, bodyParsed } from './middlewares/scanTiming';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security Middlewares
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like native mobile apps, curl, Capacitor native HTTP requests)
      if (!origin) return callback(null, true);

      // Pre-approved local and capacitor origins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow Google Cloud Run domains (*.run.app) and Vercel domains (*.vercel.app)
      if (/^https:\/\/.*\.run\.app$/.test(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Default safe allow for preview/sandbox environments
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Server-Timing', 'X-Scan-AI-Attempts']
  })
);

app.use(scanTiming);
app.use(express.json({ limit: '15mb' }));
app.use(bodyParsed);

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

// API Routes (Mounted under both /api/... and direct path to ensure compatibility across all serverless, proxy, and container configurations)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/scan', '/scan'], scanRoutes);
app.get(['/api/history', '/history'], authenticateJWT, getScanHistory);
app.use(['/api/history', '/history'], historyRoutes);
app.use(['/api/upload', '/upload'], uploadRoutes);
app.use(['/api/chat', '/chat'], chatRoutes);

// Explicit 404 for unmatched API routes so they never fall through to HTML/Vite
app.all(['/api/*', '/api', '/scan/*', '/scan', '/auth/*', '/history/*', '/upload/*', '/chat/*'], (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
      statusCode: 404
    }
  });
});

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

if (process.env.STANDALONE_BACKEND === 'true') {
  app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`🚀 FoodScan AI Backend API running on http://0.0.0.0:${PORT}`);
    try {
      await seedFoodDatabase();
    } catch (e) {
      console.warn('Seed database notice:', e);
    }
  });
}

export default app;
