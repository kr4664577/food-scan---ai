import type { IdentifiedFoodItem, MealFoodAnalysis, MealNutrition } from '../types';

export const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'saturatedFat'] as const;
export const knownNutrient = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function emptyMealNutrition(): MealNutrition {
  return { calories: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null, sodium: null, saturatedFat: null };
}
export function sumMealNutrition(items: Pick<IdentifiedFoodItem, 'nutrition'>[]): MealNutrition {
  const total = emptyMealNutrition();
  for (const key of NUTRIENT_KEYS) {
    const values = items.map(item => item.nutrition[key]);
    total[key] = values.length && values.every(knownNutrient) ? Math.round(values.reduce((sum, value) => sum + value, 0) * 10) / 10 : null;
  }
  return total;
}
export function scaleMealNutrition(nutrition: MealNutrition, multiplier: number): MealNutrition {
  if (!Number.isFinite(multiplier) || multiplier <= 0) return { ...nutrition };
  const result = emptyMealNutrition();
  for (const key of NUTRIENT_KEYS) result[key] = knownNutrient(nutrition[key]) ? Math.round(nutrition[key]! * multiplier * 10) / 10 : null;
  return result;
}
export function formatNutrient(value: unknown, unit = 'g'): string {
  return knownNutrient(value) ? `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}` : 'Unavailable';
}
export function macroEnergy(nutrition: MealNutrition) {
  if (![nutrition.protein, nutrition.carbs, nutrition.fat].every(knownNutrient)) return null;
  const entries = [
    { name: 'Protein', grams: nutrition.protein!, energy: nutrition.protein! * 4, color: '#047857' },
    { name: 'Carbohydrate', grams: nutrition.carbs!, energy: nutrition.carbs! * 4, color: '#0891b2' },
    { name: 'Fat', grams: nutrition.fat!, energy: nutrition.fat! * 9, color: '#d97706' },
  ];
  const sum = entries.reduce((total, entry) => total + entry.energy, 0);
  return sum > 0 ? entries.map(entry => ({ ...entry, share: entry.energy / sum * 100 })) : null;
}

/** Deliberately an explainable app heuristic, not a clinical/nutrient-profile standard. */
export function foodRating(nutrition: MealNutrition) {
  const required = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const;
  const missing = NUTRIENT_KEYS.filter(key => !knownNutrient(nutrition[key]));
  if (required.some(key => !knownNutrient(nutrition[key])) || !nutrition.calories) return { score: null, category: 'Not enough data', reasons: [], missing };
  const proteinEnergyShare = nutrition.protein! * 4 / nutrition.calories;
  const fiberDensity = nutrition.fiber! * 100 / nutrition.calories;
  // Density avoids treating a double portion as automatically better or worse.
  let score = 50;
  const reasons = ['Starts at 50 points. This is an experimental meal-balance heuristic, not a validated health score.'];
  if (proteinEnergyShare >= 0.10) { score += 15; reasons.push('+15: protein contributes at least 10% of listed energy.'); }
  else reasons.push('+0: protein contributes less than 10% of listed energy.');
  if (fiberDensity >= 1.4) { score += 15; reasons.push('+15: at least 1.4 g fiber per 100 kcal.'); }
  else reasons.push('+0: less than 1.4 g fiber per 100 kcal.');
  if (knownNutrient(nutrition.saturatedFat)) {
    const limited = nutrition.saturatedFat * 9 / nutrition.calories > 0.10;
    score += limited ? -10 : 10;
    reasons.push(`${limited ? '−10' : '+10'}: saturated fat supplies ${limited ? 'more than' : 'no more than'} 10% of listed energy.`);
  }
  if (knownNutrient(nutrition.sodium)) {
    const limited = nutrition.sodium / nutrition.calories > 1;
    score += limited ? -10 : 10;
    reasons.push(`${limited ? '−10' : '+10'}: sodium is ${limited ? 'above' : 'at or below'} 1 mg per kcal.`);
  }
  reasons.push('Sugar is displayed separately, not scored: total sugar does not identify added sugar. Missing fields are not treated as zero.');
  return { score, category: score >= 80 ? 'Higher balance' : score >= 60 ? 'Moderate balance' : 'Lower balance', reasons, missing };
}

export function contextualMealIdeas(report: MealFoodAnalysis, goal?: string) {
  if (!report.items?.length || report.foodClassification !== 'food') return [];
  const names = report.items.map(item => item.name).filter(Boolean).join(', ') || report.detectedDishName;
  const fitness = /fitness|muscle|gym/i.test(goal || '');
  const ideas = [{ title: 'Build on this meal', text: `Starting from ${names}, consider adding a vegetable or fruit you enjoy if one is missing. The photo cannot verify every ingredient.` }];
  if (fitness || (knownNutrient(report.totalNutrition.protein) && report.totalNutrition.protein < 15)) ideas.push({ title: 'Protein-focused option', text: 'Consider beans, tofu, eggs, yogurt, fish, or another protein-containing food that fits your preferences. The exact nutrition depends on your recipe and portion.' });
  if (knownNutrient(report.totalNutrition.fiber) && report.totalNutrition.fiber < 5) ideas.push({ title: 'More variety', text: 'Consider lentils, vegetables, or a whole grain alongside the identified foods. Check actual portions and ingredients before comparing nutrients.' });
  if (/weight/i.test(goal || '')) ideas.push({ title: 'Portion awareness', text: 'Compare a measured portion with the visible estimate. Choose an amount that suits your needs; no calorie saving is assumed.' });
  return ideas;
}
