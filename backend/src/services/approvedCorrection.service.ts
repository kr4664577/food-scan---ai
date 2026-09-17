import { prisma } from '../config/db';

export interface ApprovedCorrection {
  originalName: string;
  originalBrand: string | null;
  correctedName: string;
  correctedBrand: string | null;
  reviewNote: string | null;
}

const tokens = (value?: string | null) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(t => t.length >= 3);

const similarity = (a?: string | null, b?: string | null) => {
  const x = new Set(tokens(a));
  const y = new Set(tokens(b));
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const token of x) if (y.has(token)) shared++;
  return shared / Math.max(1, Math.min(x.size, y.size));
};

/**
 * Uses only administrator-approved feedback as a conservative alias signal.
 * Nutrition, ingredients and allergens are never copied from the correction.
 */
export async function findApprovedCorrection(productName?: string, brandName?: string): Promise<ApprovedCorrection | null> {
  if (!productName) return null;
  const rows = await prisma.scanFeedback.findMany({
    where: { reviewStatus: 'APPROVED', correctedName: { not: null } },
    orderBy: { reviewedAt: 'desc' },
    take: 100,
    include: { scan: { select: { productName: true, brandName: true } } }
  });

  const candidates = rows
    .map(row => ({
      originalName: row.scan.productName,
      originalBrand: row.scan.brandName,
      correctedName: row.correctedName!.trim(),
      correctedBrand: row.correctedBrand?.trim() || null,
      reviewNote: row.reviewNote,
      score: similarity(productName, row.scan.productName) + (brandName && row.scan.brandName ? similarity(brandName, row.scan.brandName) * 0.5 : 0)
    }))
    .filter(candidate => similarity(productName, candidate.originalName) >= 0.9)
    .sort((a, b) => b.score - a.score);

  return candidates[0] ? {
    originalName: candidates[0].originalName,
    originalBrand: candidates[0].originalBrand,
    correctedName: candidates[0].correctedName,
    correctedBrand: candidates[0].correctedBrand,
    reviewNote: candidates[0].reviewNote
  } : null;
}
