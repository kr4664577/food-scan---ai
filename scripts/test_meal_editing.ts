import assert from 'node:assert/strict';
import { useAppStore as store } from '../src/store/useAppStore';
import { emptyMealNutrition } from '../src/utils/mealNutrition';

const nutrition = { ...emptyMealNutrition(), calories: 100, protein: 5, carbs: 15, fat: 2, fiber: 0 };
store.setState({ activeMealReport: {
  foodClassification: 'food', detectedDishName: 'Fixture food', items: [{ name: 'Fixture food', estimatedPortion: '100 g estimated', isEstimated: true, confidence: 0.8, dataSource: 'Offline fixture', nutrition }],
  totalNutrition: nutrition, confidence: { overall: 0.8, itemsRecognition: 0.8, totalNutrition: 0.7, portionVolume: 0.7 }, isEstimated: true, primaryDataSource: 'Offline fixture', estimationDisclaimer: 'Estimate', likelyIngredients: [], healthSummary: '',
} });
store.getState().scaleMealPortion(2);
assert.equal(store.getState().activeMealReport?.totalNutrition.calories, 200);
assert.equal(store.getState().activeMealReport?.totalNutrition.sodium, null);
assert.equal(store.getState().activeMealReport?.totalNutrition.fiber, 0);
assert.equal(store.getState().activeMealReport?.items[0].portionMultiplier, 2);
store.getState().addMealItem('Manual item', null, { ...emptyMealNutrition(), calories: 50 });
assert.equal(store.getState().activeMealReport?.totalNutrition.calories, 250);
assert.equal(store.getState().activeMealReport?.totalNutrition.protein, null, 'An incomplete item must not yield complete-looking totals');
store.getState().removeMealItem(1);
assert.equal(store.getState().activeMealReport?.totalNutrition.protein, 10);
store.getState().scaleMealPortion(NaN);
assert.equal(store.getState().activeMealReport?.totalNutrition.calories, 200);
store.getState().updateMealDishName('Different food');
assert.equal(store.getState().activeMealReport?.totalNutrition.calories, null, 'Changing identity must invalidate old nutrition');
assert.deepEqual(store.getState().activeMealReport?.likelyIngredients, []);
console.log('Meal editing passed: null/zero preservation, portion scaling, manual additions/removals, identity correction invalidation.');
