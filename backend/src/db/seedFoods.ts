import { prisma } from '../config/db';
import { FOOD_MASTER_CATALOG } from './foodCatalog';

export const seedFoodDatabase = async () => {
  try {
    console.log('🔄 Checking & Seeding Food Master Database...');
    const count = await prisma.foodMasterItem.count();

    if (count < FOOD_MASTER_CATALOG.length) {
      for (const item of FOOD_MASTER_CATALOG) {
        await prisma.foodMasterItem.upsert({
          where: { name: item.name },
          update: {
            category: item.category,
            brandName: item.brandName || null,
            barcode: item.barcode || null,
            keywords: item.keywords.join(','),
            portion: item.portion,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            fiber: item.fiber,
            sugar: item.sugar,
            sodium: item.sodium,
            saturatedFat: item.saturatedFat,
            truthScore: item.truthScore,
            novaLevel: item.novaLevel,
            ratingCategory: item.ratingCategory,
            healthySwaps: JSON.stringify(item.healthySwaps),
            ingredients: JSON.stringify(item.ingredients),
            allergens: JSON.stringify(item.allergens),
            healthSummary: item.healthSummary
          },
          create: {
            category: item.category,
            name: item.name,
            brandName: item.brandName || null,
            barcode: item.barcode || null,
            keywords: item.keywords.join(','),
            portion: item.portion,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            fiber: item.fiber,
            sugar: item.sugar,
            sodium: item.sodium,
            saturatedFat: item.saturatedFat,
            truthScore: item.truthScore,
            novaLevel: item.novaLevel,
            ratingCategory: item.ratingCategory,
            healthySwaps: JSON.stringify(item.healthySwaps),
            ingredients: JSON.stringify(item.ingredients),
            allergens: JSON.stringify(item.allergens),
            healthSummary: item.healthSummary
          }
        });
      }
      console.log(`✅ Successfully seeded ${FOOD_MASTER_CATALOG.length} verified food items into database!`);
    } else {
      console.log(`✅ Food Master Database already contains ${count} verified items.`);
    }
  } catch (err) {
    console.warn('Food database seed notice:', err);
  }
};
