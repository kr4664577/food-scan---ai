import axios from 'axios';
import { timeScan } from '../middlewares/scanTiming';

export class BarcodeError extends Error {
  public publicMessage: string;
  constructor(message: string, public statusCode = 422) { super(message); this.publicMessage = message; }
}
export const NON_FOOD_MESSAGE = 'This barcode does not appear to be a food product. Nutrition information is unavailable.';
export const UNKNOWN_MESSAGE = 'This barcode could not be verified as food. Check the digits, retry, or upload a clear photo of the food label.';

const FOOD_CATEGORIES = new Set([
  'en:breakfasts', 'en:spreads', 'en:sweet-spreads', 'en:confectionary-based-spreads',
  'en:beverages', 'en:plant-based-foods-and-beverages', 'en:plant-based-foods',
  'en:snacks', 'en:sweet-snacks', 'en:salty-snacks', 'en:meals', 'en:prepared-meals',
  'en:dairies', 'en:milk-and-dairy-products', 'en:fermented-foods', 'en:fermented-milk-products',
  'en:meats', 'en:seafood', 'en:fishes', 'en:eggs', 'en:cereals-and-potatoes',
  'en:fruits-and-vegetables-based-foods', 'en:fruits', 'en:vegetables', 'en:breads',
  'en:legumes-and-their-products', 'en:nuts-and-their-products', 'en:condiments', 'en:sauces',
  'en:fats', 'en:desserts', 'en:biscuits-and-cakes', 'en:chocolates', 'en:breakfast-cereals',
  'en:waters', 'en:fruit-juices', 'en:coffees', 'en:teas', 'en:cheeses', 'en:yogurts'
]);
const NON_FOOD = /\b(electronics?|laptops?|macbooks?|computers?|smartphones?|phones?|tablets?|headphones?|chargers?|batteries|cosmetics?|shampoos?|soaps?|detergents?|cleaning|cleaners?|disinfectants?|bleach|clothing|apparel|shoes|t-shirts?|toothpaste|perfumes?|skin-care|pet-food|animal-feed)\b/i;
const tags = (value: unknown): string[] => Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
export function classifyBarcodeProduct(product: any): 'food' | 'non-food' | 'unknown' {
  if (!product || typeof product !== 'object') return 'unknown';
  const categories = [...tags(product.categories_tags), ...tags(product.categories_hierarchy)].map(x => x.toLowerCase());
  const identity = [product.product_name, product.product_name_en, product.categories, ...categories].filter(x => typeof x === 'string').join(' ');
  if (NON_FOOD.test(identity)) return 'non-food'; // Non-food evidence always overrides food tags.
  return categories.some(tag => FOOD_CATEGORIES.has(tag)) ? 'food' : 'unknown';
}
const nutrient = (value: unknown, maximum: number): number | null => {
  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) value = Number(value);
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum ? value : null;
};
export interface BarcodeProductResult {
  barcode: string; productName: string; brandName?: string;
  calories: number | null; proteins: number | null; carbs: number | null; fats: number | null;
  fiber: number | null; sugar: number | null; sodium: number | null; saturatedFat: number | null;
  nutritionScore?: string; ingredientsText?: string; ingredientsList: string[]; detectedAllergens: string[];
  additives: Array<{ code: string; name: string; safety: string; explanation: string }>;
  imageUrl?: string; servingSize: string | null; nutritionBasis: string;
}

export function parseBarcodeProduct(barcode: string, product: any): BarcodeProductResult {
  const classification = classifyBarcodeProduct(product);
  if (classification === 'non-food') throw new BarcodeError(NON_FOOD_MESSAGE);
  if (classification !== 'food') throw new BarcodeError(UNKNOWN_MESSAGE);
  const productName = [product.product_name, product.product_name_en].find(v => typeof v === 'string' && v.trim());
  if (!productName) throw new BarcodeError(UNKNOWN_MESSAGE);
  const n = product.no_nutrition_data === 'on' ? {} : product.nutriments || {};
  const sodiumGrams = nutrient(n.sodium_100g, 100);
  const saltGrams = nutrient(n.salt_100g, 100);
  const fat = nutrient(n.fat_100g, 100), carbs = nutrient(n.carbohydrates_100g, 100);
  const sugar = nutrient(n.sugars_100g, 100), saturated = nutrient(n['saturated-fat_100g'], 100);
  return {
    barcode, productName: productName.trim(), brandName: typeof product.brands === 'string' ? product.brands : undefined,
    calories: nutrient(n['energy-kcal_100g'], 1000),
    proteins: nutrient(n.proteins_100g, 100), carbs, fats: fat,
    fiber: nutrient(n.fiber_100g, 100),
    sugar: sugar !== null && carbs !== null && sugar > carbs + 1 ? null : sugar,
    saturatedFat: saturated !== null && fat !== null && saturated > fat + 1 ? null : saturated,
    sodium: sodiumGrams !== null ? sodiumGrams * 1000 : saltGrams !== null ? saltGrams / 2.5 * 1000 : null,
    nutritionScore: /^[a-e]$/i.test(product.nutriscore_grade || '') ? product.nutriscore_grade.toUpperCase() : undefined,
    nutritionBasis: 'Per 100 g / 100 ml as listed by Open Food Facts; check the package for the applicable unit.',
    servingSize: typeof product.serving_size === 'string' && product.serving_size.trim() ? product.serving_size.trim() : null,
    ingredientsText: typeof product.ingredients_text === 'string' ? product.ingredients_text : '',
    ingredientsList: typeof product.ingredients_text === 'string' ? product.ingredients_text.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    detectedAllergens: tags(product.allergens_tags).map(tag => tag.replace(/^en:/, '').replace(/-/g, ' ')),
    additives: [], // No inferred additive identities or safety claims.
  };
}
export const fetchBarcodeData = async (barcode: string): Promise<BarcodeProductResult> => {
  if (typeof barcode !== 'string' || !/^(?:\d{8}|\d{12,14})$/.test(barcode)) throw new BarcodeError('Enter an 8, 12, 13, or 14 digit product barcode.', 400);
  try {
    const url = `${process.env.OFF_API_URL || 'https://world.openfoodfacts.org/api/v2/product'}/${barcode}.json`;
    const response = await timeScan('lookup', () => axios.get(url, {
      timeout: 7000,
      headers: { 'User-Agent': 'FoodScanAI/1.0 (food barcode lookup)' },
      params: { fields: 'code,product_name,product_name_en,brands,categories,categories_tags,categories_hierarchy,nutriments,no_nutrition_data,nutriscore_grade,serving_size,ingredients_text,allergens_tags' }
    }));
    if (response.data?.status !== 1 || !response.data.product) throw new BarcodeError(UNKNOWN_MESSAGE, 404);
    return parseBarcodeProduct(barcode, response.data.product);
  } catch (error: any) {
    if (error instanceof BarcodeError) throw error;
    if (error.response?.status === 404) throw new BarcodeError(UNKNOWN_MESSAGE, 404);
    throw new BarcodeError('Product lookup is temporarily unavailable. Please try again later.', 503);
  }
};
