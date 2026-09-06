import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { runPackagedIntelligencePipeline } from '../services/packagedIntelligence.service';
import { runMealIntelligencePipeline } from '../services/mealIntelligence.service';
import { QualityInspectionEngineFactory } from '../services/qualityIntelligence.service';
import { prisma } from '../config/db';

export const scanBarcode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.body;
    const userId = req.user?.userId;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        error: { message: 'Barcode string is required.', statusCode: 400 }
      });
    }

    const analysis = await runPackagedIntelligencePipeline({ barcode });

    // Save scan to database if authenticated
    let savedScan = null;
    if (userId) {
      savedScan = await prisma.scanHistory.create({
        data: {
          userId,
          scanType: 'PACKAGED',
          barcode,
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
      });
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
      return res.status(400).json({
        success: false,
        error: { message: 'Base64 image data is required.', statusCode: 400 }
      });
    }

    const analysis = await runPackagedIntelligencePipeline({ imageBase64, mimeType, customItemName });

    let savedScan = null;
    if (userId) {
      savedScan = await prisma.scanHistory.create({
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
      });
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

export const scanMealImage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, mimeType, customDishName, foodCategory } = req.body;
    const userId = req.user?.userId;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: { message: 'Base64 image data is required.', statusCode: 400 }
      });
    }

    const mealAnalysis = await runMealIntelligencePipeline({ imageBase64, mimeType, customDishName, foodCategory });

    let savedScan = null;
    if (userId) {
      savedScan = await prisma.scanHistory.create({
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
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId: savedScan?.id,
        scanType: 'MEAL',
        mealAnalysis
      }
    });
  } catch (error) {
    next(error);
  }
};

export const scanVisualQuality = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, mimeType } = req.body;
    const userId = req.user?.userId;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: { message: 'Base64 image data is required.', statusCode: 400 }
      });
    }

    const qualityResult = await QualityInspectionEngineFactory.getEngine().analyze(
      imageBase64,
      mimeType || 'image/jpeg'
    );

    let savedScan = null;
    if (userId) {
      savedScan = await prisma.scanHistory.create({
        data: {
          userId,
          scanType: 'QUALITY_INSPECTION',
          productName: 'Visual Quality Inspection',
          confidenceScore: qualityResult.overallConfidence,
          qualityAnalysis: JSON.stringify(qualityResult)
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId: savedScan?.id,
        scanType: 'QUALITY_INSPECTION',
        qualityResult
      }
    });
  } catch (error) {
    next(error);
  }
};
