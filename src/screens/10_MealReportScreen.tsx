import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AlertTriangle, Bot, Camera, Edit3, Plus, Trash2 } from 'lucide-react';
import { AIChatbotModal } from '../components/AIChatbotModal';
import { MacroBreakdown, NutritionRating } from '../components/NutritionVisuals';
import { contextualMealIdeas, emptyMealNutrition, formatNutrient, NUTRIENT_KEYS } from '../utils/mealNutrition';
import type { MealNutrition } from '../types';

const labels: Record<keyof MealNutrition, string> = { calories: 'Calories (kcal)', protein: 'Protein (g)', carbs: 'Carbohydrates (g)', fat: 'Fat (g)', fiber: 'Fiber (g)', sugar: 'Total sugar (g)', sodium: 'Sodium (mg)', saturatedFat: 'Saturated fat (g)' };
export const MealReportScreen: React.FC = () => {
  const { activeMealReport: report, user, capturedImage, setScreen, updateMealDishName, processMealScan, scaleMealPortion, addMealItem, removeMealItem } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [dish, setDish] = useState('');
  const [scale, setScale] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [portion, setPortion] = useState('');
  const [values, setValues] = useState<Partial<Record<keyof MealNutrition, string>>>({});
  const [chat, setChat] = useState(false);
  if (!report) return <div className="p-6 text-center space-y-4"><h1 className="font-bold">No active meal report</h1><p>Scan a food photo to see available nutrition.</p><button className="rounded-xl bg-emerald-700 text-white p-3" onClick={() => setScreen('CAMERA')}>Open scanner</button></div>;
  const totals = report.totalNutrition || emptyMealNutrition();
  const confidence = report.confidence?.overall;
  const uncertain = typeof confidence !== 'number' || confidence <= 0 || confidence < 0.85;
  const ideas = contextualMealIdeas(report, user?.dietaryGoals);
  const addItem = (event: React.FormEvent) => {
    event.preventDefault(); if (!name.trim()) return;
    const nutrition = emptyMealNutrition();
    for (const key of NUTRIENT_KEYS) { const input = values[key]?.trim(); nutrition[key] = input && Number.isFinite(Number(input)) && Number(input) >= 0 ? Number(input) : null; }
    addMealItem(name.trim(), portion.trim() || null, nutrition);
    setName(''); setPortion(''); setValues({}); setShowAdd(false);
  };
  return <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
    {uncertain && <aside className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2" role="status"><h2 className="flex gap-2 font-bold text-amber-950"><AlertTriangle size={18} /> Please check this identification</h2><p className="text-sm text-amber-900">The image does not support a confident assessment. Check the foods and portions; retake a clearer photo when needed. Missing nutrition is not filled in.</p></aside>}
    <section className="rounded-3xl border bg-white p-5 space-y-3">
      <p className="text-xs font-bold text-emerald-700 uppercase">Food photo · estimated analysis</p>
      <div className="flex items-start justify-between gap-3"><h1 className="text-2xl font-bold text-slate-900">{report.detectedDishName || 'Food identification unavailable'}</h1><button aria-label="Correct dish name" className="p-2 bg-slate-100 rounded-full" onClick={() => setEditing(!editing)}><Edit3 size={18} /></button></div>
      <p className="text-xs text-slate-500">{report.items.length} identified components. {typeof confidence === 'number' && confidence > 0 ? `Model-reported confidence: ${Math.round(Math.min(confidence, 0.99) * 100)}% (not a measured accuracy guarantee).` : 'Confidence unavailable.'}</p>
      <p className="text-sm text-slate-600">{report.estimationDisclaimer || 'Visual food and portion estimates can be wrong. Confirm with a food label or measured ingredients when precision matters.'}</p>
      {report.uncertaintyWarnings?.map(warning => <p key={warning} className="text-xs text-amber-900">{warning}</p>)}
      {editing && <form className="space-y-2 border-t pt-3" onSubmit={event => { event.preventDefault(); if (!dish.trim()) return; updateMealDishName(dish.trim()); setEditing(false); }}><label className="text-xs font-bold" htmlFor="dish-correction">Correct food name</label><input id="dish-correction" required value={dish} onChange={event => setDish(event.target.value)} placeholder={report.detectedDishName} className="block w-full border rounded-xl p-2" /><p className="text-xs text-slate-500">Changing the identification clears previous nutrients. Reanalyze the photo or enter known nutrients; renaming cannot calculate nutrition.</p><button className="bg-emerald-700 text-white rounded-xl px-4 py-2">Apply correction</button></form>}
      {!report.items.length && capturedImage && <button className="text-sm text-emerald-700 underline" onClick={() => { setScreen('AI_PROCESSING'); processMealScan(capturedImage, report.detectedDishName); }}>Reanalyze photo with corrected name</button>}
    </section>
    <section className="rounded-3xl border bg-white p-5 space-y-3">
      <h2 className="font-bold text-slate-900">Nutrition for the displayed portion</h2><p className="text-3xl font-bold text-emerald-800">{formatNutrient(totals.calories, 'kcal')}</p>
      <p className="text-xs text-slate-500">Estimated from the identified food and visible portion, or nutrients you enter. No daily calorie target is assumed.</p>
      <div className="grid grid-cols-2 gap-2">{NUTRIENT_KEYS.filter(key => key !== 'calories').map(key => <div key={key} className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">{labels[key]}</p><strong className="text-sm text-slate-800">{formatNutrient(totals[key], key === 'sodium' ? 'mg' : 'g')}</strong></div>)}</div>
      <fieldset className="border-t pt-3"><legend className="text-sm font-bold">Adjust visible portion</legend><div className="grid grid-cols-4 gap-2 mt-2">{[0.5, 1, 1.5, 2].map(next => <button key={next} aria-pressed={scale === next} onClick={() => { scaleMealPortion(next / scale); setScale(next); }} className={`p-2 rounded-xl text-sm ${scale === next ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{next}×</button>)}</div></fieldset>
      <p className="text-xs text-slate-500">A multiplier of the initial estimate, not a measured serving. Missing values stay unavailable. Edits apply to this report only; they do not rewrite saved history or log consumption.</p>
    </section>
    <MacroBreakdown nutrition={totals} /><NutritionRating nutrition={totals} estimated />
    <section className="rounded-3xl border bg-white p-5 space-y-3">
      <div className="flex items-center justify-between gap-2"><h2 className="font-bold">Identified foods</h2><button className="text-emerald-700 text-xs font-bold flex gap-1 items-center" onClick={() => setShowAdd(!showAdd)}><Plus size={16} /> Add item</button></div>
      {showAdd && <form onSubmit={addItem} className="p-3 rounded-2xl bg-slate-50 space-y-3"><p className="text-xs text-slate-600">Enter nutrients only when you know them for this portion. Leave unknowns blank; zero means a known zero.</p><label className="text-xs block">Food name<input required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full p-2 border rounded-lg" /></label><label className="text-xs block">Your portion (optional)<input value={portion} onChange={e => setPortion(e.target.value)} placeholder="Measured amount, if known" className="mt-1 block w-full p-2 border rounded-lg" /></label><div className="grid grid-cols-2 gap-2">{NUTRIENT_KEYS.map(key => <label className="text-xs" key={key}>{labels[key]}<input type="number" min="0" step="any" value={values[key] || ''} onChange={e => setValues(previous => ({ ...previous, [key]: e.target.value }))} className="block w-full mt-1 p-2 border rounded-lg" placeholder="Unknown" /></label>)}</div><div className="flex gap-3"><button type="submit" className="bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm">Add known data</button><button type="button" onClick={() => setShowAdd(false)} className="text-sm">Cancel</button></div></form>}
      {report.items.map((item, index) => <article key={index} className="rounded-2xl bg-slate-50 border p-3 space-y-2"><div className="flex justify-between gap-2"><h3 className="font-bold text-sm">{item.name}</h3><button aria-label={`Remove ${item.name}`} className="text-rose-700 p-1" onClick={() => removeMealItem(index)}><Trash2 size={16} /></button></div><p className="text-xs text-slate-600">{item.isEstimated ? 'Estimated portion' : 'Entered portion'}: {item.estimatedPortion || 'Unavailable'}{item.portionMultiplier && item.portionMultiplier !== 1 ? ` × ${item.portionMultiplier}` : ''}</p><p className="font-bold text-emerald-800">{formatNutrient(item.nutrition?.calories, 'kcal')}</p><div className="grid grid-cols-2 gap-1 text-xs text-slate-600"><p>Protein: {formatNutrient(item.nutrition?.protein)}</p><p>Carbs: {formatNutrient(item.nutrition?.carbs)}</p><p>Fat: {formatNutrient(item.nutrition?.fat)}</p><p>Fiber: {formatNutrient(item.nutrition?.fiber)}</p></div><p className="text-xs text-slate-500">Source: {item.dataSource || 'Unspecified'}</p></article>)}
      {!report.items.length && <p className="text-sm text-slate-500">No identified components. Add known information or take another photo.</p>}
    </section>
    {report.likelyIngredients.length > 0 && <section className="rounded-3xl border bg-white p-5 space-y-2"><h2 className="font-bold">Visible / declared ingredients</h2><p className="text-sm text-slate-600">{report.likelyIngredients.join(', ')}</p><p className="text-xs text-slate-500">Not a complete recipe or allergen check. Hidden ingredients cannot be verified from a photo.</p></section>}
    {ideas.length > 0 && <section className="rounded-3xl border bg-white p-5 space-y-3"><h2 className="font-bold">Ideas for your next meal</h2>{ideas.map(idea => <div key={idea.title}><h3 className="text-sm font-bold text-emerald-800">{idea.title}</h3><p className="text-xs text-slate-600 mt-1">{idea.text}</p></div>)}<p className="text-xs text-slate-500">Qualitative ideas, not nutrient-verified alternatives. Check allergies and preferences. No calorie savings or nutrient amounts are assumed.</p></section>}
    <button onClick={() => setChat(true)} className="w-full p-3 rounded-2xl bg-teal-800 text-white flex items-center justify-center gap-2"><Bot size={18} /> Ask the food assistant</button><button onClick={() => setScreen('CAMERA')} className="w-full p-4 rounded-2xl bg-emerald-700 text-white font-bold flex items-center justify-center gap-2"><Camera size={18} /> Scan another food</button><AIChatbotModal isOpen={chat} onClose={() => setChat(false)} contextFood={report} />
  </div>;
};
