import React from 'react';
import { mealIdeas } from '../utils/mealIdeas';
export function MealSuggestions({ goal, allergies = [] }: { goal?: string; allergies?: string[] }) {
  return <section className="space-y-3">
    <h2 className="font-bold text-slate-900">Suggested meal ideas</h2>
    <p className="text-xs text-slate-500">For {goal || 'general healthy eating'}. Ideas, not measured meal plans. Portions and nutrition depend on the actual ingredients and preparation.</p>
    {allergies.length > 0 && <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl">These ideas have not been checked for your allergies. Verify every ingredient and label before choosing a meal.</p>}
    <div className="grid grid-cols-1 gap-3">
      {mealIdeas(goal).map(idea => <article key={idea.type} className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold text-emerald-700">{idea.type}</p>
        <h3 className="font-semibold text-sm mt-1">{idea.name}</h3>
        <p className="text-xs text-slate-600 mt-2">{idea.reason}</p>
        <p className="text-xs text-slate-400 mt-2">Portion and nutrition: not calculated</p>
      </article>)}
    </div>
  </section>;
}
