import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/db';

export const getScanUsageDashboard = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [total, successful, providerCalls, errors, users, recent] = await Promise.all([
      prisma.scanUsageLog.count(),
      prisma.scanUsageLog.count({ where: { status: 'SUCCESS' } }),
      prisma.scanUsageLog.count({ where: { status: 'PROVIDER_SUCCESS' } }),
      prisma.scanUsageLog.count({ where: { status: { in: ['ERROR', 'PROVIDER_ERROR'] } } }),
      prisma.user.count(),
      prisma.scanUsageLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          userId: true,
          scanType: true,
          status: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          estimatedCostUsd: true,
          imageBytes: true,
          processingTimeMs: true,
          cacheHit: true,
          errorCode: true,
          createdAt: true
        }
      })
    ]);

    const costRows = recent.filter((row) => row.estimatedCostUsd != null);
    const recentCostUsd = costRows.reduce((sum, row) => sum + (row.estimatedCostUsd || 0), 0);
    const recentInputTokens = recent.reduce((sum, row) => sum + (row.inputTokens || 0), 0);
    const recentOutputTokens = recent.reduce((sum, row) => sum + (row.outputTokens || 0), 0);
    const recentImageBytes = recent.reduce((sum, row) => sum + (row.imageBytes || 0), 0);
    const recentProcessingMs = recent.reduce((sum, row) => sum + (row.processingTimeMs || 0), 0);

    return res.json({
      success: true,
      data: {
        totals: {
          usageLogRows: total,
          successfulScans: successful,
          providerCalls,
          errors,
          registeredUsers: users
        },
        recent50: {
          estimatedCostUsd: Number(recentCostUsd.toFixed(8)),
          inputTokens: recentInputTokens,
          outputTokens: recentOutputTokens,
          imageBytes: recentImageBytes,
          processingTimeMs: recentProcessingMs,
          rowsWithProviderCost: costRows.length
        },
        recent
      }
    });
  } catch (error) {
    next(error);
  }
};
