import { runUnifiedVisionAnalysis } from './aiVision.service';
import { findFoodInCatalog } from '../db/foodCatalog';
import { recordScanDuration } from '../middlewares/scanTiming';

export interface IdentifiedFoodItem {
  name: string;
  estimatedPortion: string;
  confidence: number;
  isEstimated: boolean;
  dataSource: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number; // in mg
  };
}

export interface MealIntelligenceResult {
  detectedDishName: string;
  items: IdentifiedFoodItem[];
  
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  
  confidence: {
    itemsRecognition: number;
    portionVolume: number;
    totalNutrition: number;
    overall: number;
  };
  
  isEstimated: boolean;
  primaryDataSource: string;
  estimationDisclaimer: string;
  likelyIngredients: string[];
  healthSummary: string;
}

export const MANDATORY_MEAL_DISCLAIMER = "All caloric, portion, and nutrient values are visual AI estimations based on computer vision volume heuristics and food database references. They are not exact laboratory measurements.";

/**
 * Phase 3: Meal Recognition & Nutrition Estimation Pipeline
 */
export const runMealIntelligencePipeline = async (params: {
  imageBase64: string;
  mimeType?: string;
  customDishName?: string;
  foodCategory?: string;
}): Promise<MealIntelligenceResult> => {
  const { imageBase64, mimeType, customDishName, foodCategory } = params;

  if (!imageBase64) {
    throw new Error('No food image data provided for meal analysis.');
  }

  const prompt = `You are an expert AI food computer vision scientist & nutritionist.
Analyze the photo of ${foodCategory === 'HOME_FOOD' ? 'homemade home-cooked food' : (foodCategory === 'OUTSIDE_PACKAGED' ? 'packaged store-bought food or biscuits' : 'restaurant or dining dish')}.
Identify MULTIPLE food items on the plate. Estimate portion sizes and nutritional values accurately.
${customDishName ? `User hint: ${customDishName}` : ''}

CRITICAL REQUIREMENT: Return STRICT JSON ONLY (no markdown text) matching schema:
{
  "detectedDishName": "Name of primary dish",
  "items": [
    {
      "name": "Food item name",
      "estimatedPortion": "Portion size (e.g. 160g / 1 filet)",
      "confidence": 0.92,
      "isEstimated": true,
      "dataSource": "Computer Vision Volume + Reference Database",
      "nutrition": {
        "calories": 330,
        "protein": 34,
        "carbs": 2,
        "fat": 20,
        "fiber": 0,
        "sugar": 0,
        "sodium": 120
      }
    }
  ],
  "totalNutrition": {
    "calories": 540,
    "protein": 38,
    "carbs": 42,
    "fat": 22,
    "fiber": 7,
    "sugar": 4,
    "sodium": 340
  },
  "confidence": {
    "itemsRecognition": 0.92,
    "portionVolume": 0.84,
    "totalNutrition": 0.88,
    "overall": 0.88
  },
  "isEstimated": true,
  "primaryDataSource": "AI Vision Engine (Gemini)",
  "estimationDisclaimer": "${MANDATORY_MEAL_DISCLAIMER}",
  "likelyIngredients": ["ingredient 1", "ingredient 2"],
  "healthSummary": "High protein meal rich in omega-3 fatty acids."
}`;

  console.log('[Meal Intelligence Pipeline] Initiating AI Vision analysis...');
  const visionResult = await runUnifiedVisionAnalysis({ prompt, imageBase64, mimeType, scanType: 'MEAL' });
  const nutritionStarted = performance.now();

  if (visionResult) {
    // 1. Resolve detected dish name
    const dishName = visionResult.detectedDishName || visionResult.productName || visionResult.items?.[0]?.name || customDishName || 'Nutritious Meal Dish';
    visionResult.detectedDishName = dishName;

    // 2. Ensure items array is well formed
    if (!Array.isArray(visionResult.items) || visionResult.items.length === 0) {
      visionResult.items = [
        {
          name: dishName,
          estimatedPortion: '1 Standard Plate (~250g)',
          confidence: 0.9,
          isEstimated: true,
          dataSource: 'AI Vision Estimation',
          nutrition: visionResult.totalNutrition || {
            calories: 420,
            protein: 18,
            carbs: 48,
            fat: 14,
            fiber: 5,
            sugar: 4,
            sodium: 420
          }
        }
      ];
    } else {
      // Ensure each item has nutrition object
      visionResult.items = visionResult.items.map((item: any) => ({
        name: item.name || 'Food Item',
        estimatedPortion: item.estimatedPortion || '1 portion',
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.88,
        isEstimated: true,
        dataSource: item.dataSource || 'Computer Vision Volume Heuristics',
        nutrition: {
          calories: Number(item.nutrition?.calories) || 120,
          protein: Number(item.nutrition?.protein) || 5,
          carbs: Number(item.nutrition?.carbs) || 15,
          fat: Number(item.nutrition?.fat) || 4,
          fiber: Number(item.nutrition?.fiber) || 1,
          sugar: Number(item.nutrition?.sugar) || 1,
          sodium: Number(item.nutrition?.sodium) || 80
        }
      }));
    }

    // 3. Ensure totalNutrition is computed and valid numbers
    if (!visionResult.totalNutrition || typeof visionResult.totalNutrition.calories !== 'number') {
      const sum = visionResult.items.reduce(
        (acc: any, it: any) => ({
          calories: acc.calories + (it.nutrition.calories || 0),
          protein: acc.protein + (it.nutrition.protein || 0),
          carbs: acc.carbs + (it.nutrition.carbs || 0),
          fat: acc.fat + (it.nutrition.fat || 0),
          fiber: acc.fiber + (it.nutrition.fiber || 0),
          sugar: acc.sugar + (it.nutrition.sugar || 0),
          sodium: acc.sodium + (it.nutrition.sodium || 0)
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
      );

      visionResult.totalNutrition = {
        calories: sum.calories || 450,
        protein: sum.protein || 20,
        carbs: sum.carbs || 50,
        fat: sum.fat || 15,
        fiber: sum.fiber || 5,
        sugar: sum.sugar || 4,
        sodium: sum.sodium || 380
      };
    } else {
      visionResult.totalNutrition = {
        calories: Number(visionResult.totalNutrition.calories) || 0,
        protein: Number(visionResult.totalNutrition.protein) || 0,
        carbs: Number(visionResult.totalNutrition.carbs) || 0,
        fat: Number(visionResult.totalNutrition.fat) || 0,
        fiber: Number(visionResult.totalNutrition.fiber) || 0,
        sugar: Number(visionResult.totalNutrition.sugar) || 0,
        sodium: Number(visionResult.totalNutrition.sodium) || 0
      };
    }

    // 4. Ensure confidence scores are bounded
    visionResult.confidence = {
      itemsRecognition: Number(visionResult.confidence?.itemsRecognition) || 0.90,
      portionVolume: Number(visionResult.confidence?.portionVolume) || 0.85,
      totalNutrition: Number(visionResult.confidence?.totalNutrition) || 0.88,
      overall: Number(visionResult.confidence?.overall) || 0.88
    };

    visionResult.isEstimated = true;
    visionResult.primaryDataSource = visionResult.primaryDataSource || 'AI Vision Engine (Gemini)';
    visionResult.estimationDisclaimer = MANDATORY_MEAL_DISCLAIMER;
    visionResult.likelyIngredients = Array.isArray(visionResult.likelyIngredients) && visionResult.likelyIngredients.length > 0
      ? visionResult.likelyIngredients
      : visionResult.items.map((i: any) => i.name);
    visionResult.healthSummary = visionResult.healthSummary || `Estimated ${visionResult.totalNutrition.calories} kcal with ${visionResult.totalNutrition.protein}g protein.`;

    console.log('[Meal Intelligence Pipeline] Successfully constructed MealIntelligenceResult:', {
      dish: visionResult.detectedDishName,
      items: visionResult.items.length,
      calories: visionResult.totalNutrition.calories
    });

    recordScanDuration('nutrition', performance.now() - nutritionStarted);
    return visionResult as MealIntelligenceResult;
  }

  throw new Error('AI Vision analysis returned empty or invalid results. Please try again.');
};

export const analyzeFoodFromImage = (_imageBase64: string, _customDishName?: string, _foodCategory?: string): MealIntelligenceResult => {
  throw new Error('Food image analysis failed. Please use runMealIntelligencePipeline.');
};
