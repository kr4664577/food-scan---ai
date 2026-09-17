import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { runPackagedIntelligencePipeline } from '../services/packagedIntelligence.service';
import { runMealIntelligencePipeline } from '../services/mealIntelligence.service';
import { QualityInspectionEngineFactory } from '../services/qualityIntelligence.service';
import { assertDailyScanQuota, logScanUsage } from '../services/usage.service';
import { prisma } from '../config/db';

const getImageBytes = (imageBase64?: string): number | undefined => {
  if (!imageBase64 || typeof imageBase64 !== 'string') return undefined;
  const comma = imageBase64.indexOf(',');
  const clean = comma >= 0 ? imageBase64.slice(comma + 1) : imageBase64;
  return Math.floor((clean.replace(/\s+/g, '').length * 3) / 4);
};

const getErrorCode = (error: any): string => {
  if (error?.statusCode === 429) return 'DAILY_SCAN_LIMIT';
  const message = String(error?.message || 'UNKNOWN_ERROR');
  if (message.includes('503') || message.toLowerCase().includes('high demand')) return 'AI_PROVIDER_BUSY';
  if (message.toLowerCase().includes('api key')) return 'AI_API_KEY_MISSING';
  return 'SCAN_FAILED';
};

export const scanBarcode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const userId = req.user?.userId;
  try {
    const { barcode } = req.body;
    if (!barcode) return res.status(400).json({ success: false, error: 'Barcode string is required.' });
    await assertDailyScanQuota(userId);
    const analysis = await runPackagedIntelligencePipeline({ barcode });

    let savedScan = null;
    if (userId) {
      savedScan = await prisma.scanHistory.create({
        data: { userId, scanType: 'PACKAGED', barcode, productName: analysis.productName, brandName: analysis.brandName,
          calories: analysis.nutrition.calories, proteins: analysis.nutrition.proteins, carbs: analysis.nutrition.carbs,
          fats: analysis.nutrition.fats, sugar: analysis.nutrition.sugar, sodium: analysis.nutrition.sodium,
          saturatedFat: analysis.nutrition.saturatedFat, nutritionScore: analysis.nutritionScore,
          ingredients: JSON.stringify(analysis.ingredients), detectedAllergens: JSON.stringify(analysis.detectedAllergens),
          additives: JSON.stringify(analysis.additives), confidenceScore: analysis.confidence.overall }
      });
    }
    await logScanUsage({ userId, scanType: 'PACKAGED', startedAt, cacheHit: true }, { status: 'SUCCESS' });
    return res.status(200).json({ success: true, data: { scanId: savedScan?.id, scanType: 'PACKAGED', analysis } });
  } catch (error) {
    await logScanUsage({ userId, scanType: 'PACKAGED', startedAt }, { status: 'ERROR', errorCode: getErrorCode(error) });
    next(error);
  }
};

export const scanPackagedImage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const userId = req.user?.userId;
  try {
    const { imageBase64, mimeType, customItemName } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: 'Base64 image data is required.' });
    await assertDailyScanQuota(userId);
    const analysis = await runPackagedIntelligencePipeline({ imageBase64, mimeType, customItemName });

    let savedScan = null;
    if (userId) {
      savedScan = await prisma.scanHistory.create({
        data: { userId, scanType: 'PACKAGED', productName: analysis.productName, brandName: analysis.brandName,
          calories: analysis.nutrition.calories, proteins: analysis.nutrition.proteins, carbs: analysis.nutrition.carbs,
          fats: analysis.nutrition.fats, sugar: analysis.nutrition.sugar, sodium: analysis.nutrition.sodium,
          saturatedFat: analysis.nutrition.saturatedFat, rawOcrText: analysis.rawOcrText,
          ingredients: JSON.stringify(analysis.ingredients), detectedAllergens: JSON.stringify(analysis.detectedAllergens),
          additives: JSON.stringify(analysis.additives), confidenceScore: analysis.confidence.overall }
      });
    }
    await logScanUsage({ userId, scanType: 'PACKAGED', startedAt, imageBytes: getImageBytes(imageBase64) }, { status: 'SUCCESS' });
    return res.status(200).json({ success: true, data: { scanId: savedScan?.id, scanType: 'PACKAGED', analysis } });
  } catch (error: any) {
    await logScanUsage({ userId, scanType: 'PACKAGED', startedAt, imageBytes: getImageBytes(req.body?.imageBase64) }, { status: 'ERROR', errorCode: getErrorCode(error) });
    const rawError = error?.message || String(error);
    if (error?.statusCode === 429) return res.status(429).json({ success: false, error: rawError });
    console.warn('[Safe Debug] Packaged scan failed:', rawError);
    return res.status(422).json({ success: false, error: 'Food image analysis failed. Please try again.' });
  }
};

export const scanMealImage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const userId = req.user?.userId;
  try {
    const { imageBase64, mimeType, customDishName, foodCategory } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: 'Base64 image data is required.' });
    await assertDailyScanQuota(userId);
    const mealAnalysis = await runMealIntelligencePipeline({ imageBase64, mimeType, customDishName, foodCategory });

    let savedScan = null;
    if (userId) {
      savedScan = await prisma.scanHistory.create({
        data: { userId, scanType: 'MEAL', productName: mealAnalysis.detectedDishName,
          calories: mealAnalysis.totalNutrition.calories, proteins: mealAnalysis.totalNutrition.protein,
          carbs: mealAnalysis.totalNutrition.carbs, fats: mealAnalysis.totalNutrition.fat,
          ingredients: JSON.stringify(mealAnalysis.likelyIngredients), confidenceScore: mealAnalysis.confidence.overall,
          qualityAnalysis: JSON.stringify({ items: mealAnalysis.items, summary: mealAnalysis.healthSummary }) }
      });
    }
    await logScanUsage({ userId, scanType: 'MEAL', startedAt, imageBytes: getImageBytes(imageBase64) }, { status: 'SUCCESS' });
    return res.status(200).json({ success: true, data: { scanId: savedScan?.id, scanType: 'MEAL', mealAnalysis } });
  } catch (error: any) {
    await logScanUsage({ userId, scanType: 'MEAL', startedAt, imageBytes: getImageBytes(req.body?.imageBase64) }, { status: 'ERROR', errorCode: getErrorCode(error) });
    const rawError = error?.message || String(error);
    if (error?.statusCode === 429) return res.status(429).json({ success: false, error: rawError });
    console.warn('[Safe Debug] Meal scan failed:', rawError);
    return res.status(422).json({ success: false, error: 'Food image analysis failed. Please try again.' });
  }
};

export const scanVisualQuality = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const userId = req.user?.userId;
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: 'Base64 image data is required.' });
    await assertDailyScanQuota(userId);
    const qualityResult = await QualityInspectionEngineFactory.getEngine().analyze(imageBase64, mimeType || 'image/jpeg');

    let savedScan = null;
    if (userId) {
      savedScan = await prisma.scanHistory.create({
        data: { userId, scanType: 'QUALITY_INSPECTION', productName: 'Visual Quality Inspection',
          confidenceScore: qualityResult.overallConfidence, qualityAnalysis: JSON.stringify(qualityResult) }
      });
    }
    await logScanUsage({ userId, scanType: 'QUALITY_INSPECTION', startedAt, imageBytes: getImageBytes(imageBase64) }, { status: 'SUCCESS' });
    return res.status(200).json({ success: true, data: { scanId: savedScan?.id, scanType: 'QUALITY_INSPECTION', qualityResult } });
  } catch (error: any) {
    await logScanUsage({ userId, scanType: 'QUALITY_INSPECTION', startedAt, imageBytes: getImageBytes(req.body?.imageBase64) }, { status: 'ERROR', errorCode: getErrorCode(error) });
    const rawError = error?.message || String(error);
    if (error?.statusCode === 429) return res.status(429).json({ success: false, error: rawError });
    console.warn('[Safe Debug] Quality scan failed:', rawError);
    return res.status(422).json({ success: false, error: 'Food image analysis failed. Please try again.' });
  }
};
