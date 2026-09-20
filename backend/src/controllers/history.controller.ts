import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/db';

export const getScanHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
    }

    const { scanType, search } = req.query;

    const whereClause: any = { userId };
    if (scanType && typeof scanType === 'string') {
      whereClause.scanType = scanType.toUpperCase();
    }
    if (search && typeof search === 'string') {
      whereClause.productName = { contains: search };
    }

    const scans = await prisma.scanHistory.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        favorites: {
          where: { userId }
        }
      }
    });

    const formattedScans = scans.map((scan: any) => {
      let ingredients = [];
      try {
        ingredients = typeof scan.ingredients === 'string' ? JSON.parse(scan.ingredients) : scan.ingredients || [];
      } catch {
        ingredients = [];
      }

      let detectedAllergens = [];
      try {
        detectedAllergens = typeof scan.detectedAllergens === 'string' ? JSON.parse(scan.detectedAllergens) : scan.detectedAllergens || [];
      } catch {
        detectedAllergens = [];
      }

      let additives = [];
      try {
        additives = typeof scan.additives === 'string' ? JSON.parse(scan.additives) : scan.additives || [];
      } catch {
        additives = [];
      }

      let qualityAnalysis = null;
      try {
        qualityAnalysis = typeof scan.qualityAnalysis === 'string' ? JSON.parse(scan.qualityAnalysis) : scan.qualityAnalysis;
      } catch {
        qualityAnalysis = null;
      }

      return {
        ...scan,
        ingredients,
        detectedAllergens,
        additives,
        qualityAnalysis,
        isFavorite: Boolean(scan.favorites && scan.favorites.length > 0)
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedScans
    });
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        scan: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedFavorites = favorites.filter((fav: any) => fav.scan?.userId === userId).map((fav: any) => {
      let ingredients = [];
      try {
        ingredients = typeof fav.scan?.ingredients === 'string' ? JSON.parse(fav.scan.ingredients) : fav.scan?.ingredients || [];
      } catch {
        ingredients = [];
      }

      let detectedAllergens = [];
      try {
        detectedAllergens = typeof fav.scan?.detectedAllergens === 'string' ? JSON.parse(fav.scan.detectedAllergens) : fav.scan?.detectedAllergens || [];
      } catch {
        detectedAllergens = [];
      }

      let additives = [];
      try {
        additives = typeof fav.scan?.additives === 'string' ? JSON.parse(fav.scan.additives) : fav.scan?.additives || [];
      } catch {
        additives = [];
      }

      let qualityAnalysis = null;
      try {
        qualityAnalysis = typeof fav.scan?.qualityAnalysis === 'string' ? JSON.parse(fav.scan.qualityAnalysis) : fav.scan?.qualityAnalysis;
      } catch {
        qualityAnalysis = null;
      }

      return {
        id: fav.id,
        favoriteId: fav.id,
        userId: fav.userId,
        scanId: fav.scanId,
        savedAt: fav.createdAt,
        createdAt: fav.createdAt,
        scan: {
          ...fav.scan,
          ingredients,
          detectedAllergens,
          additives,
          qualityAnalysis,
          isFavorite: true
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedFavorites
    });
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { scanId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
    }
    if (!scanId) {
      return res.status(400).json({ success: false, error: { message: 'scanId is required', statusCode: 400 } });
    }

    const scan = await prisma.scanHistory.findUnique({ where: { id: scanId } });
    if (!scan || scan.userId !== userId) {
      return res.status(404).json({ success: false, error: { message: 'Scan not found.', statusCode: 404 } });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_scanId: { userId, scanId }
      }
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return res.status(200).json({ success: true, isFavorite: false, message: 'Removed from favorites' });
    } else {
      await prisma.favorite.create({
        data: { userId, scanId }
      });
      return res.status(200).json({ success: true, isFavorite: true, message: 'Added to favorites' });
    }
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const scanId = req.params.scanId;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
    }
    if (!scanId) {
      return res.status(400).json({ success: false, error: { message: 'scanId is required', statusCode: 400 } });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_scanId: { userId, scanId }
      }
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
    }
    return res.status(200).json({ success: true, isFavorite: false, message: 'Removed from favorites' });
  } catch (error) {
    next(error);
  }
};
