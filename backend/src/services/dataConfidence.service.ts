export type EvidenceSource = 'BARCODE_DATABASE' | 'PACKAGE_OCR' | 'AI_ESTIMATE' | 'CATALOG';

export interface Evidence<T> {
  value: T | null | undefined;
  source: EvidenceSource;
  confidence: number;
}

export interface ReliableField<T> {
  value: T | null;
  source: EvidenceSource | null;
  confidence: number;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function sourcePriority(source: EvidenceSource): number {
  switch (source) {
    case 'BARCODE_DATABASE': return 4;
    case 'PACKAGE_OCR': return 3;
    case 'CATALOG': return 2;
    case 'AI_ESTIMATE': return 1;
    default: return 0;
  }
}

/** Higher-trust evidence wins; estimates never silently replace verified data. */
export function selectReliableField<T>(evidence: Evidence<T>[]): ReliableField<T> {
  const usable = evidence
    .filter(item => item.value !== null && item.value !== undefined)
    .map(item => ({ ...item, confidence: clamp01(item.confidence) }))
    .sort((a, b) => {
      const rank = sourcePriority(b.source) - sourcePriority(a.source);
      return rank !== 0 ? rank : b.confidence - a.confidence;
    });

  const winner = usable[0];
  return winner
    ? { value: winner.value as T, source: winner.source, confidence: winner.confidence }
    : { value: null, source: null, confidence: 0 };
}

/** Catalog data requires explicit product evidence before it can be reused. */
export function canReuseCatalogData(params: {
  hasBarcodeMatch: boolean;
  productNameConfidence: number;
  catalogMatchConfidence: number;
}): boolean {
  if (params.hasBarcodeMatch) return true;
  return clamp01(params.productNameConfidence) >= 0.9 &&
    clamp01(params.catalogMatchConfidence) >= 0.9;
}

export function validateNutrition(values: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const field of ['calories', 'proteins', 'carbs', 'fats', 'sugar', 'sodium', 'saturatedFat']) {
    const value = values[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) missing.push(field);
  }
  return missing;
}
