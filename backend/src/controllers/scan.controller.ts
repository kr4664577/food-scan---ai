import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { runPackagedIntelligencePipeline } from '../services/packagedIntelligence.service';
import { runMealIntelligencePipeline } from '../services/mealIntelligence.service';
import { QualityInspectionEngineFactory } from '../services/qualityIntelligence.service';
import { prisma } from '../config/db';
import { timeScan } from '../middlewares/scanTiming';

export const scanBarcode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.body;
    const userId = req.user?.userId;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        error: 'Barcode string is required.'
      });
    }

    const analysis = await timeScan('analysis', () => runPackagedIntelligencePipeline({ barcode }));

    // Save scan to database if authenticated
    let savedScan = null;
    if (userId) {
      savedScan = await timeScan<{ id: string }>('database', () => prisma.scanHistory.create({
        data: {
          userId,
          scanType: 'PACKAGED',
          barcode,
          qualityAnalysis: JSON.stringify({ foodClassification: analysis.foodClassification, nutritionBasis: analysis.nutritionBasis, servingSize: analysis.servingSize, nutrition: analysis.nutrition }),
          productName: analysis.productName,
          brandName: analysis.brandName,
          calories: analysis.nutrition.calories,
          proteins: analysis.nutrition.proteins,
          carbs: analysis.nutrition.carbs,
          fats: analysis.nutrition.fats,
          sugar: analysis.nutrition.sugar,
          sodium: analysis.nutrition.sodium,
          saturatedFat: analysis.nutrition.saturatedFat,
          nutritionScore: analysis.nutritionScore,
          ingredients: JSON.stringify(analysis.ingredients),
          detectedAllergens: JSON.stringify(analysis.detectedAllergens),
          additives: JSON.stringify(analysis.additives),
          confidenceScore: analysis.confidence.overall
        }
      }));
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId: savedScan?.id,
        scanType: 'PACKAGED',
        analysis
      }
    });
  } catch (error) {
    next(error);
  }
};

export const scanPackagedImage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, mimeType, customItemName } = req.body;
    const userId = req.user?.userId;

    if (!imageBase64) {
      console.warn('[Scan Controller] Missing imageBase64 in packaged scan');
      return res.status(400).json({
        success: false,
        error: 'Base64 image data is required.'
      });
    }

    console.log('[Scan Controller] Received packaged image scan request:', {
      imageLength: imageBase64.length,
      mimeType,
    });

    const analysis = await timeScan('analysis', () => runPackagedIntelligencePipeline({ imageBase64, mimeType, customItemName }));

    let savedScan = null;
    if (userId) {
      try {
        savedScan = await timeScan<{ id: string }>('database', () => prisma.scanHistory.create({
          data: {
            userId,
            scanType: 'PACKAGED',
            productName: analysis.productName,
            brandName: analysis.brandName,
            calories: analysis.nutrition.calories,
            proteins: analysis.nutrition.proteins,
            carbs: analysis.nutrition.carbs,
            fats: analysis.nutrition.fats,
            sugar: analysis.nutrition.sugar,
            sodium: analysis.nutrition.sodium,
            saturatedFat: analysis.nutrition.saturatedFat,
            rawOcrText: analysis.rawOcrText,
            ingredients: JSON.stringify(analysis.ingredients),
            detectedAllergens: JSON.stringify(analysis.detectedAllergens),
            additives: JSON.stringify(analysis.additives),
            confidenceScore: analysis.confidence.overall
          }
        }));
      } catch (dbErr: any) {
        console.warn('[Scan Controller] Non-fatal DB save error for packaged scan:', dbErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId: savedScan?.id,
        scanType: 'PACKAGED',
        analysis
      }
    });
  } catch (error: any) {
    next(error);
  }
};

export const scanMealImage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, mimeType, customDishName, foodCategory } = req.body;
    const userId = req.user?.userId;

    if (!imageBase64) {
      console.warn('[Scan Controller] Missing imageBase64 in meal scan');
      return res.status(400).json({
        success: false,
        error: 'Base64 image data is required.'
      });
    }

    console.log('[Scan Controller] Received meal image scan request:', {
      imageLength: imageBase64.length,
      mimeType,
      foodCategory,
    });

    const mealAnalysis = await timeScan('analysis', () => runMealIntelligencePipeline({ imageBase64, mimeType, customDishName, foodCategory }));

    let savedScan = null;
    if (userId) {
      try {
        savedScan = await timeScan<{ id: string }>('database', () => prisma.scanHistory.create({
          data: {
            userId,
            scanType: 'MEAL',
            productName: mealAnalysis.detectedDishName,
            calories: mealAnalysis.totalNutrition.calories,
            proteins: mealAnalysis.totalNutrition.protein,
            carbs: mealAnalysis.totalNutrition.carbs,
            fats: mealAnalysis.totalNutrition.fat,
            ingredients: JSON.stringify(mealAnalysis.likelyIngredients),
            confidenceScore: mealAnalysis.confidence.overall,
            qualityAnalysis: JSON.stringify({ items: mealAnalysis.items, summary: mealAnalysis.healthSummary })
          }
        }));
      } catch (dbErr: any) {
        console.warn('[Scan Controller] Non-fatal DB save error for meal scan:', dbErr?.message);
      }
    }

    console.log('[Scan Controller] Meal scan successfully completed:', {
      itemsCount: mealAnalysis.items?.length,
      calories: mealAnalysis.totalNutrition?.calories
    });

    return res.status(200).json({
      success: true,
      data: {
        scanId: savedScan?.id,
        scanType: 'MEAL',
        mealAnalysis,
        analysis: mealAnalysis
      }
    });
  } catch (error: any) {
    next(error);
  }
};

export const scanVisualQuality = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, mimeType } = req.body;
    const userId = req.user?.userId;

    if (!imageBase64) {
      console.warn('[Scan Controller] Missing imageBase64 in quality scan');
      return res.status(400).json({
        success: false,
        error: 'Base64 image data is required.'
      });
    }

    console.log('[Scan Controller] Received visual quality scan request:', {
      imageLength: imageBase64.length,
      mimeType,
    });

    const qualityResult = await QualityInspectionEngineFactory.getEngine().analyze(
      imageBase64,
      mimeType || 'image/jpeg'
    );

    let savedScan = null;
    if (userId) {
      try {
        savedScan = await timeScan<{ id: string }>('database', () => prisma.scanHistory.create({
          data: {
            userId,
            scanType: 'QUALITY_INSPECTION',
            productName: 'Visual Quality Inspection',
            confidenceScore: qualityResult.overallConfidence,
            qualityAnalysis: JSON.stringify(qualityResult)
          }
        }));
      } catch (dbErr: any) {
        console.warn('[Scan Controller] Non-fatal DB save error for quality scan:', dbErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId: savedScan?.id,
        scanType: 'QUALITY_INSPECTION',
        qualityResult
      }
    });
  } catch (error: any) {
    next(error);
  }
};
