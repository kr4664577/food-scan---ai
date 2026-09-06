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

    const formattedScans = scans.map(scan => ({
      ...scan,
      ingredients: scan.ingredients ? JSON.parse(scan.ingredients) : [],
      detectedAllergens: scan.detectedAllergens ? JSON.parse(scan.detectedAllergens) : [],
      additives: scan.additives ? JSON.parse(scan.additives) : [],
      qualityAnalysis: scan.qualityAnalysis ? JSON.parse(scan.qualityAnalysis) : null,
      isFavorite: scan.favorites.length > 0
    }));

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

    const formattedFavorites = favorites.map(fav => ({
      favoriteId: fav.id,
      savedAt: fav.createdAt,
      scan: {
        ...fav.scan,
        ingredients: fav.scan.ingredients ? JSON.parse(fav.scan.ingredients) : [],
        detectedAllergens: fav.scan.detectedAllergens ? JSON.parse(fav.scan.detectedAllergens) : [],
        additives: fav.scan.additives ? JSON.parse(fav.scan.additives) : [],
        qualityAnalysis: fav.scan.qualityAnalysis ? JSON.parse(fav.scan.qualityAnalysis) : null,
        isFavorite: true
      }
    }));

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
