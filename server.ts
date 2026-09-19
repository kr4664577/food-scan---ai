import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import backendApp from './backend/src/app';
import { seedFoodDatabase } from './backend/src/db/seedFoods';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = 3000;
  const app = (backendApp as any).default || backendApp;

  try {
    await seedFoodDatabase();
  } catch (err) {
    console.warn('[DB Seed Notice]', err);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FoodScan AI full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
