import axios from 'axios';

export interface BarcodeProductResult {
  barcode: string;
  productName: string;
  brandName?: string;
  calories?: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  nutritionScore?: string;
  ingredientsText?: string;
  ingredientsList: string[];
  detectedAllergens: string[];
  additives: Array<{ code: string; name: string; safety: string; explanation: string }>;
  imageUrl?: string;
}

export const fetchBarcodeData = async (barcode: string): Promise<BarcodeProductResult | null> => {
  try {
    const url = `${process.env.OFF_API_URL || 'https://world.openfoodfacts.org/api/v2/product'}/${barcode}.json`;
    const response = await axios.get(url, { timeout: 7000 });

    if (response.data && response.data.status === 1) {
      const product = response.data.product;
      const nutriments = product.nutriments || {};

      const ingredientsList = product.ingredients_tags 
        ? product.ingredients_tags.map((tag: string) => tag.replace('en:', '').replace(/-/g, ' '))
        : (product.ingredients_text ? product.ingredients_text.split(',').map((s: string) => s.trim()) : []);

      const allergens = product.allergens_tags 
        ? product.allergens_tags.map((tag: string) => tag.replace('en:', '').replace(/-/g, ' '))
        : [];

      const additivesTags = product.additives_tags || [];
      const additives = additivesTags.map((tag: string) => {
        const cleanTag = tag.replace('en:', '').toUpperCase();
        return {
          code: cleanTag,
          name: cleanTag,
          safety: 'Use in moderation',
          explanation: `Food additive ${cleanTag} commonly used for texture, preservation, or flavoring.`
        };
      });

      return {
        barcode,
        productName: product.product_name || product.product_name_en || 'Packaged Food Product',
        brandName: product.brands || 'Unknown Brand',
        calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
        proteins: nutriments.proteins_100g || nutriments.proteins || 0,
        carbs: nutriments.carbohydrates_100g || nutriments.carbohydrates || 0,
        fats: nutriments.fat_100g || nutriments.fat || 0,
        sugar: nutriments.sugars_100g || nutriments.sugars || 0,
        sodium: nutriments.sodium_100g ? nutriments.sodium_100g * 1000 : (nutriments.salt_100g ? (nutriments.salt_100g / 2.5) * 1000 : 0),
        saturatedFat: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || 0,
        nutritionScore: (product.nutriscore_grade || 'C').toUpperCase(),
        ingredientsText: product.ingredients_text || '',
        ingredientsList,
        detectedAllergens: allergens,
        additives,
        imageUrl: product.image_url || product.image_front_url || ''
      };
    }
  } catch (error) {
    console.warn(`Barcode lookup failed for ${barcode}:`, error);
  }
  return null;
};
