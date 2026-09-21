import React from 'react';
import { PackagedFoodAnalysis } from '../types';

export function BarcodeNutritionReport({ report, onScan }: { report: PackagedFoodAnalysis; onScan: () => void }) {
  const nutrients = [
    ['Calories', report.nutrition.calories, 'kcal'], ['Protein', report.nutrition.proteins, 'g'],
    ['Carbohydrates', report.nutrition.carbs, 'g'], ['Fat', report.nutrition.fats, 'g'],
    ['Fiber', report.nutrition.fiber, 'g'], ['Total sugar', report.nutrition.sugar, 'g'],
    ['Saturated fat', report.nutrition.saturatedFat, 'g'], ['Sodium', report.nutrition.sodium, 'mg'],
  ] as const;
  return <div className="p-4 pb-28 space-y-4">
    <section className="rounded-3xl bg-emerald-900 text-white p-6">
      <p className="text-xs text-emerald-200">Food barcode lookup</p>
      <h1 className="text-2xl font-bold mt-2">{report.productName}</h1>
      {report.brandName && <p className="mt-1 text-emerald-100">{report.brandName}</p>}
      <p className="text-xs mt-4">{report.summary}</p>
    </section>
    <section className="p-5 bg-white border rounded-2xl space-y-2">
      <h2 className="font-bold">Nutrition basis</h2>
      <p className="text-sm text-slate-600">{report.nutritionBasis}</p>
      <p className="text-sm">Label serving size: <strong>{report.servingSize || 'Not provided'}</strong></p>
      <p className="text-xs text-slate-500">A label serving is not your consumed portion. No consumed portion has been assumed or logged.</p>
    </section>
    <div className="grid grid-cols-2 gap-3">
      {nutrients.map(([name, value, unit]) => <div className="p-4 rounded-2xl border bg-white" key={name}>
        <p className="text-xs text-slate-500">{name}</p>
        <p className="mt-1 text-lg font-bold">{typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}` : 'Unavailable'}</p>
      </div>)}
    </div>
    {report.nutritionScore && <p className="text-sm">Source-provided Nutri-Score: <strong>{report.nutritionScore}</strong>. This is not a personalized health assessment.</p>}
    <section className="p-5 bg-white border rounded-2xl space-y-2">
      <h2 className="font-bold">Ingredients and allergens</h2>
      <p className="text-sm">{report.ingredients.length ? report.ingredients.join(', ') : 'Ingredients unavailable.'}</p>
      <p className="text-sm">Declared allergens: {report.detectedAllergens.length ? report.detectedAllergens.join(', ') : 'Not provided; this does not mean allergen-free.'}</p>
      <a className="text-sm text-emerald-700 underline" href={`https://world.openfoodfacts.org/product/${report.barcode}`} target="_blank" rel="noreferrer">Check source product information</a>
    </section>
    <button className="w-full rounded-xl bg-emerald-700 text-white p-4 font-bold" onClick={onScan}>Scan another food</button>
  </div>;
}
