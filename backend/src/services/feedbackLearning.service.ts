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

export interface VerifiedCorrection {
  correctedName: string;
  correctedBrand: string | null;
  feedbackCount: number;
  uniqueUsers: number;
  confidence: number;
}

export async function getFeedbackLearningStats(limit = 100): Promise<FeedbackLearningStats> {
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 100, 1), 500);
  const [total, rows] = await Promise.all([
    prisma.scanFeedback.count(),
    prisma.scanFeedback.findMany({
      orderBy: { createdAt: 'desc' }, take: safeLimit,
      include: { scan: { select: { productName: true, brandName: true } } }
    })
  ]);
  const byType: Record<string, number> = {};
  for (const row of rows) byType[row.feedbackType] = (byType[row.feedbackType] || 0) + 1;
  return { total, byType, corrections: rows.map(row => ({ feedbackId: row.id, scanId: row.scanId, originalName: row.scan.productName, correctedName: row.correctedName, originalBrand: row.scan.brandName, correctedBrand: row.correctedBrand, feedbackType: row.feedbackType, createdAt: row.createdAt })) };
}

/** Repeated corrections become a review candidate; they are never auto-applied to production data. */
export async function getVerifiedCorrections(minVotes = 3): Promise<VerifiedCorrection[]> {
  const rows = await prisma.scanFeedback.findMany({
    where: { correctedName: { not: null } },
    select: { userId: true, correctedName: true, correctedBrand: true }
  });
  const groups = new Map<string, { name: string; brand: string | null; users: Set<string>; count: number }>();
  for (const row of rows) {
    const name = row.correctedName?.trim(); if (!name) continue;
    const brand = row.correctedBrand?.trim() || null;
    const key = `${name.toLowerCase()}|${(brand || '').toLowerCase()}`;
    const g = groups.get(key) || { name, brand, users: new Set<string>(), count: 0 };
    g.count++; g.users.add(row.userId); groups.set(key, g);
  }
  return [...groups.values()].filter(g => g.count >= minVotes && g.users.size >= 2).map(g => ({
    correctedName: g.name, correctedBrand: g.brand, feedbackCount: g.count, uniqueUsers: g.users.size,
    confidence: Math.min(0.99, 0.5 + g.users.size * 0.1 + Math.min(g.count, 10) * 0.03)
  })).sort((a, b) => b.feedbackCount - a.feedbackCount);
}
