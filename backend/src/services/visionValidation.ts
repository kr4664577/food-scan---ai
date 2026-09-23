export const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'saturatedFat'] as const;
export type NutrientKey = typeof NUTRIENT_KEYS[number];
export type NullableNutrition = Record<NutrientKey, number | null>;
export const MANDATORY_MEAL_DISCLAIMER = 'Food identification, portions and nutrition are visual AI estimates, not measurements or medical advice. Hidden ingredients and preparation can change nutrition. Unavailable values are not zero.';
export const NON_FOOD_IMAGE_MESSAGE = "This doesn't appear to be a food or beverage. Please upload a food item.";
export const UNCLEAR_FOOD_MESSAGE = 'The food could not be identified confidently. Please take a clearer food photo or provide more detail; nutrition information is unavailable.';

export class FoodValidationError extends Error {
  statusCode = 422;
  publicMessage: string;
  constructor(message: string) { super(message); this.publicMessage = message; }
}

export interface ValidatedFoodItem {
  name: string; estimatedPortion: string | null; portionConfidence: number;
  confidence: number; isEstimated: boolean; dataSource: string; nutrition: NullableNutrition;
}
export interface ValidatedMealResult {
  foodClassification: 'food'; classificationConfidence: number;
  detectedDishName: string; items: ValidatedFoodItem[]; totalNutrition: NullableNutrition;
  confidence: { itemsRecognition: number; portionVolume: number; totalNutrition: number; overall: number };
  isEstimated: boolean; primaryDataSource: string; estimationDisclaimer: string;
  likelyIngredients: string[]; healthSummary: string; uncertaintyWarnings: string[];
}

const object = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : null;
const texts = (value: unknown): string[] => Array.isArray(value) ? value.map(text).filter((item): item is string => !!item).slice(0, 20) : [];
const confidence = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(0.99, value)) : 0;
export const emptyNutrition = (): NullableNutrition => Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null])) as NullableNutrition;

// Defense in depth against contradictory output, not a replacement for visual
// classification. Unknown or low-confidence classification always fails closed.
const NON_FOOD = /\b(laptop|macbook|computer|electronics?|smartphone|phone|tablet|keyboard|mouse|mice|headphones?|charger|batter(?:y|ies)|television|monitor|cosmetics?|shampoo|conditioner|detergent|bleach|cleaning (?:product|fluid)|soap|lipstick|mascara|perfume|clothing|shirt|trousers|shoes?|chair|desk|furniture|books?|notebook|person|people|empty (?:bottle|container)|plastic bottle|household (?:object|product))\b/i;
const UNKNOWN_NAME = /^(?:unknown|unidentified|unclear|food|food item|meal|dish|bottle|container)(?: food| item| meal| dish)?$/i;

export const requireFoodClassification = (raw: unknown, names: unknown[] = []): number => {
  const input = object(raw);
  if (['non-food', 'non_food'].includes(input.foodClassification) || names.some(name => typeof name === 'string' && NON_FOOD.test(name))) throw new FoodValidationError(NON_FOOD_IMAGE_MESSAGE);
  const certainty = confidence(input.classificationConfidence);
  if (input.foodClassification !== 'food' || certainty < 0.8) throw new FoodValidationError(UNCLEAR_FOOD_MESSAGE);
  return certainty;
};

const MAX_VALUE: Record<NutrientKey, number> = { calories: 10000, protein: 1000, carbs: 1500, fat: 1000, fiber: 500, sugar: 1000, sodium: 30000, saturatedFat: 1000 };
export const validateNutrition = (raw: unknown, warnings: string[], name: string, portion: string): NullableNutrition => {
  const input = object(raw), result = emptyNutrition();
  for (const key of NUTRIENT_KEYS) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_VALUE[key]) result[key] = value;
    else if (value != null) warnings.push(`${name}: invalid ${key} was left unavailable.`);
  }
  for (const [part, whole] of [['sugar', 'carbs'], ['fiber', 'carbs'], ['saturatedFat', 'fat']] as const) {
    if (result[part] !== null && result[whole] !== null && result[part]! > result[whole]! + 1) {
      result[part] = null;
      warnings.push(`${name}: inconsistent ${part} was left unavailable.`);
    }
  }
  if ([result.protein, result.carbs, result.fat, result.calories].every(value => value !== null)) {
    const energy = result.protein! * 4 + result.carbs! * 4 + result.fat! * 9;
    // Broad tolerance allows rounding/fiber; this catches major contradictions.
    if (Math.abs(result.calories! - energy) > Math.max(80, energy * 0.4)) {
      warnings.push(`${name}: inconsistent energy/macronutrients; nutrition is unavailable.`);
      return emptyNutrition();
    }
  }
  const mass = portion.match(/(\d+(?:\.\d+)?)\s*(kg|g|grams?)\b/i);
  if (mass) {
    const grams = Number(mass[1]) * (mass[2].toLowerCase() === 'kg' ? 1000 : 1);
    const macros = [result.protein, result.carbs, result.fat].filter((value): value is number => value !== null).reduce((sum, value) => sum + value, 0);
    if (grams <= 0 || macros > grams * 1.3 + 5 || (result.calories !== null && result.calories > grams * 9.5 + 20)) {
      warnings.push(`${name}: nutrients did not fit the estimated portion and were left unavailable.`);
      return emptyNutrition();
    }
  }
  return result;
};

export const validateMealVisionResult = (raw: unknown): ValidatedMealResult => {
  const input = object(raw);
  const inputs: unknown[] = Array.isArray(input.items) ? input.items : [];
  const classificationConfidence = requireFoodClassification(input, [input.detectedDishName, ...inputs.map(item => object(item).name)]);
  if (!inputs.length || inputs.length > 30) throw new FoodValidationError(UNCLEAR_FOOD_MESSAGE);
  const warnings = texts(input.uncertaintyWarnings);
  const items: ValidatedFoodItem[] = inputs.map(rawItem => {
    const item = object(rawItem), name = text(item.name);
    if (!name || UNKNOWN_NAME.test(name)) throw new FoodValidationError(UNCLEAR_FOOD_MESSAGE);
    const certainty = Math.min(classificationConfidence, confidence(item.confidence));
    if (certainty < 0.65) throw new FoodValidationError(UNCLEAR_FOOD_MESSAGE);
    const portionConfidence = confidence(item.portionConfidence), rawPortion = text(item.estimatedPortion);
    const hasQuantity = rawPortion && /(?:\b[1-9]\d*(?:\.\d+)?|\b0\.\d*[1-9]|\b(?:one|two|half|quarter))\s*(?:g\b|kg\b|ml\b|grams?\b|milliliters?\b|cups?\b|pieces?\b|slices?\b|servings?\b|portions?\b|medium\b|small\b|large\b|tablespoons?\b|teaspoons?\b|fillets?\b|filets?\b)/i.test(rawPortion);
    const estimatedPortion = hasQuantity && portionConfidence >= 0.6 ? rawPortion : null;
    let nutrition = estimatedPortion ? validateNutrition(item.nutrition, warnings, name, estimatedPortion) : emptyNutrition();
    if (!estimatedPortion) warnings.push(`${name}: portion could not be estimated reliably; nutrition is unavailable.`);
    if (certainty < 0.8) {
      nutrition = emptyNutrition();
      warnings.push(`${name}: identification is uncertain; confirm the food before using nutrition estimates.`);
    }
    return { name, estimatedPortion, portionConfidence: estimatedPortion ? portionConfidence : 0, confidence: certainty, isEstimated: true, dataSource: 'AI visual estimate; not a measured portion or verified recipe', nutrition };
  });
  const totalNutrition = emptyNutrition();
  for (const key of NUTRIENT_KEYS) {
    // Do not turn an unknown component into zero in a complete-meal total.
    if (items.every(item => item.nutrition[key] !== null)) totalNutrition[key] = Math.round(items.reduce((sum, item) => sum + item.nutrition[key]!, 0) * 10) / 10;
  }
  const reported = object(input.confidence), identity = Math.min(...items.map(item => item.confidence)), portion = Math.min(...items.map(item => item.portionConfidence));
  const complete = (['calories', 'protein', 'carbs', 'fat'] as const).every(key => totalNutrition[key] !== null);
  const nutritionCertainty = complete ? Math.min(identity, portion, confidence(reported.totalNutrition)) : 0;
  if (!complete) warnings.push('Some nutrition data is unavailable. Missing values are not zero.');
  warnings.push('Hidden ingredients, preparation and image scale can change the estimate.');
  return {
    foodClassification: 'food', classificationConfidence,
    detectedDishName: text(input.detectedDishName) || items.map(item => item.name).join(', '), items, totalNutrition,
    confidence: { itemsRecognition: Math.min(identity, confidence(reported.itemsRecognition)), portionVolume: Math.min(portion, confidence(reported.portionVolume)), totalNutrition: nutritionCertainty, overall: Math.min(identity, portion, nutritionCertainty, confidence(reported.overall)) },
    isEstimated: true, primaryDataSource: 'AI vision estimate', estimationDisclaimer: MANDATORY_MEAL_DISCLAIMER,
    likelyIngredients: texts(input.visibleIngredients),
    healthSummary: complete ? 'Nutrition is estimated for the visible portions. Review the food identification and adjust the amount consumed.' : 'Food was identified, but some portion or nutrition information could not be estimated reliably.',
    uncertaintyWarnings: [...new Set(warnings)],
  };
};
