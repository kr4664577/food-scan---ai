import { runUnifiedVisionAnalysis } from './aiVision.service';
import { findFoodInCatalog } from '../db/foodCatalog';

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

  if (imageBase64) {
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
      "dataSource": "Computer Vision Volume + USDA Reference",
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
  "primaryDataSource": "AI Vision Engine (Grok / Gemini)",
  "estimationDisclaimer": "${MANDATORY_MEAL_DISCLAIMER}",
  "likelyIngredients": ["ingredient 1", "ingredient 2"],
  "healthSummary": "High protein meal rich in omega-3 fatty acids."
}`;

    const visionResult = await runUnifiedVisionAnalysis({ prompt, imageBase64, mimeType, scanType: 'MEAL' });
    if (visionResult) {
      if (!visionResult.detectedDishName) {
        visionResult.detectedDishName = visionResult.productName || visionResult.items?.[0]?.name || 'Nutritious Meal Dish';
      }
      if (visionResult.detectedDishName) {
        return visionResult;
      }
    }
    throw new Error('Food image analysis failed. Please try again.');
  }

  throw new Error('Food image analysis failed. Please try again.');
};

export const analyzeFoodFromImage = (_imageBase64: string, _customDishName?: string, _foodCategory?: string): MealIntelligenceResult => {
  // Do not preserve fake fallback nutrition data because it creates unsafe and misleading results.
  throw new Error('Food image analysis failed. Please try again.');
};
