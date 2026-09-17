import { prisma } from '../config/db';

export interface FeedbackLearningStats {
  total: number;
  byType: Record<string, number>;
  corrections: Array<{
    feedbackId: string;
    scanId: string;
    originalName: string;
    correctedName: string | null;
    originalBrand: string | null;
    correctedBrand: string | null;
    feedbackType: string;
    createdAt: Date;
  }>;
}

/**
 * Turns user corrections into reviewable learning data.
 * Feedback is intentionally not applied directly to the production model/catalog:
 * a single user correction must not silently change facts for other users.
 */
export async function getFeedbackLearningStats(limit = 100): Promise<FeedbackLearningStats> {
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 100, 1), 500);
  const [total, rows] = await Promise.all([
    prisma.scanFeedback.count(),
    prisma.scanFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      include: { scan: { select: { productName: true, brandName: true } } }
    })
  ]);

  const byType: Record<string, number> = {};
  for (const row of rows) byType[row.feedbackType] = (byType[row.feedbackType] || 0) + 1;

  return {
    total,
    byType,
    corrections: rows.map(row => ({
      feedbackId: row.id,
      scanId: row.scanId,
      originalName: row.scan.productName,
      correctedName: row.correctedName,
      originalBrand: row.scan.brandName,
      correctedBrand: row.correctedBrand,
      feedbackType: row.feedbackType,
      createdAt: row.createdAt
    }))
  };
}
