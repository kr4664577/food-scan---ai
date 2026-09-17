import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/db';

const ALLOWED_TYPES = new Set(['WRONG_PRODUCT', 'WRONG_BRAND', 'WRONG_NUTRITION', 'WRONG_ALLERGEN', 'WRONG_INGREDIENTS', 'OTHER']);

export const submitScanFeedback = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { scanId, feedbackType, correctedName, correctedBrand, comment } = req.body || {};

    if (!userId) return res.status(401).json({ success: false, error: { message: 'Unauthorized', statusCode: 401 } });
    if (!scanId || typeof scanId !== 'string') return res.status(400).json({ success: false, error: { message: 'scanId is required', statusCode: 400 } });
    if (!feedbackType || typeof feedbackType !== 'string' || !ALLOWED_TYPES.has(feedbackType)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid feedbackType', statusCode: 400 } });
    }

    const scan = await prisma.scanHistory.findFirst({ where: { id: scanId, userId }, select: { id: true } });
    if (!scan) return res.status(404).json({ success: false, error: { message: 'Scan not found', statusCode: 404 } });

    const feedback = await prisma.scanFeedback.create({
      data: {
        userId,
        scanId,
        feedbackType,
        correctedName: typeof correctedName === 'string' ? correctedName.trim().slice(0, 180) || null : null,
        correctedBrand: typeof correctedBrand === 'string' ? correctedBrand.trim().slice(0, 180) || null : null,
        comment: typeof comment === 'string' ? comment.trim().slice(0, 1000) || null : null
      }
    });

    return res.status(201).json({ success: true, data: { id: feedback.id, feedbackType: feedback.feedbackType, createdAt: feedback.createdAt } });
  } catch (error) {
    next(error);
  }
};
