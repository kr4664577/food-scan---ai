import React from 'react';
import type { MealNutrition } from '../types';
import { foodRating, formatNutrient, macroEnergy } from '../utils/mealNutrition';

export function MacroBreakdown({ nutrition }: { nutrition: MealNutrition }) {
  const macros = macroEnergy(nutrition);
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
    <h3 className="font-bold text-slate-900">Macronutrient breakdown</h3>
    {macros ? <>
      <div className="flex rounded-full h-5 overflow-hidden" role="img" aria-label={macros.map(macro => `${macro.name} ${Math.round(macro.share)} percent of macro energy`).join(', ')}>
        {macros.map(macro => <div key={macro.name} style={{ width: `${macro.share}%`, backgroundColor: macro.color }} />)}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">{macros.map(macro => <p key={macro.name}><span className="block font-bold" style={{ color: macro.color }}>{macro.name}</span>{formatNutrient(macro.grams)} · {Math.round(macro.share)}%</p>)}</div>
      <p className="text-xs text-slate-500">Approximate share of macro energy using 4 kcal/g protein and carbohydrate, 9 kcal/g fat. May differ from listed calories; not a daily target.</p>
    </> : <p className="text-sm text-slate-500">A complete macro breakdown needs known protein, carbohydrate, and fat values. Missing values are not zero.</p>}
  </section>;
}

export function NutritionRating({ nutrition, estimated }: { nutrition: MealNutrition; estimated?: boolean }) {
  const rating = foodRating(nutrition);
  return <section className="p-5 rounded-3xl border border-emerald-200 bg-emerald-50 space-y-3">
    <div className="flex justify-between gap-3 items-center">
      <div><h3 className="font-bold text-emerald-950">Nutrition balance score</h3><p className="text-xs text-emerald-800">{rating.category}</p></div>
      <strong className="text-xl text-emerald-800">{rating.score === null ? 'Unavailable' : `${rating.score}/100`}</strong>
    </div>
    <p className="text-xs text-slate-600">{estimated ? 'Based on estimated nutrition. ' : ''}Experimental FoodScan meal-balance heuristic, not a validated health grade or medical advice. App-selected thresholds are not personal recommendations and can be unsuitable for individual foods or special diets.</p>
    {rating.missing.length > 0 && <p className="text-xs text-slate-600">Not available: {rating.missing.join(', ')}. The score is partial when optional nutrients are missing.</p>}
    {rating.score === null ? <p className="text-sm">Calories, protein, carbs, fat, and fiber must all be available, with calories above zero, before scoring.</p> : <details className="text-xs text-slate-700"><summary className="cursor-pointer font-semibold">Exactly how this score is calculated</summary><ul className="mt-2 space-y-2 list-disc pl-4">{rating.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></details>}
  </section>;
}
