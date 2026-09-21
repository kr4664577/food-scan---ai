import type { ScanItem } from '../types';

export function validFoodScans(scans: ScanItem[], userId?: string): ScanItem[] {
  if (!userId || userId === 'guest') return [];
  return scans.filter(scan => scan.userId === userId && Boolean(scan.id && scan.productName?.trim())
    && ['MEAL', 'PACKAGED'].includes(scan.scanType)
    && scan.isFood !== false && scan.isValid !== false && !['FAILED', 'INVALID', 'NON_FOOD', 'UNKNOWN'].includes(scan.status || '')
    && typeof scan.calories === 'number' && Number.isFinite(scan.calories) && scan.calories >= 0
    // Legacy barcode reports used synthetic defaults. Do not treat those as verified calories.
    && (!scan.barcode || scan.qualityAnalysis?.foodClassification === 'food'));
}

export function averageCalories(scans: ScanItem[], userId?: string): number {
  const valid = validFoodScans(scans, userId);
  return valid.length ? valid.reduce((sum, scan) => sum + scan.calories!, 0) / valid.length : 0;
}
