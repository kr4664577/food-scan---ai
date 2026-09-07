import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AlertTriangle, CheckCircle2, Heart, ShieldAlert, Sparkles, FileText, Camera, Star, ArrowRight, Info, AlertOctagon, Flame } from 'lucide-react';

export const PackagedReportScreen: React.FC = () => {
  const { activePackagedReport, setScreen } = useAppStore();
  const [showOcr, setShowOcr] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const report = activePackagedReport || {
    productName: "Britannia Good Day Butter Cookies",
    brandName: "Britannia Industries",
    nutrition: {
      calories: 480,
      proteins: 6.0,
      carbs: 66,
      fats: 22,
      sugar: 24,
      sodium: 260,
      saturatedFat: 11
    },
    truthRating: {
      score: 2.8,
      maxScore: 5.0,
      ratingLabel: "Ultra-Processed Warning",
      ratingColor: "text-amber-700 bg-amber-50 border-amber-300"
    },
    novaGroup: {
      level: 4,
      label: "NOVA 4: Ultra-Processed Food",
      description: "Industrial bakery item with refined wheat flour, added sugar, and palm oil.",
      badgeColor: "bg-rose-600 text-white"
    },
    trafficLight: {
      overallStatus: "RED",
      sugarStatus: "RED",
      sodiumStatus: "GREEN",
      fatStatus: "YELLOW"
    },
    healthierSwaps: [
      {
        name: "Organic Whole Grain Oats Cookies",
        brand: "NutriChoice Clean",
        calories: 320,
        rating: 4.6,
        reason: "70% less added sugar & zero palm oil."
      },
      {
        name: "Roasted Multigrain Makhana / Foxnuts",
        brand: "Farm Fresh",
        calories: 180,
        rating: 4.8,
        reason: "High protein & zero ultra-processed fats."
      }
    ],
    hiddenIngredientsAlert: {
      hiddenSugars: ["Invert Sugar Syrup", "Sugar"],
      cheapOils: ["Edible Vegetable Oil (Palm)"]
    },
    healthHighlights: [
      { type: "warning", label: "Added Sugar & Palm Oil", description: "Contains 24g sugar and refined palm oil." },
      { type: "info", label: "NOVA 4 Ultra-Processed", description: "Industrial formulated cookie item." }
    ],
    ingredients: ["Refined Wheat Flour (Maida)", "Sugar", "Edible Vegetable Oil (Palm)", "Butter (3%)", "Invert Sugar Syrup", "Milk Solids", "Raising Agents (E500ii, E503ii)", "Emulsifier (Soy Lecithin E322)", "Iodised Salt"],
    detectedAllergens: ["Wheat (Gluten)", "Milk / Dairy", "Soy"],
    additives: [
      { code: "E500ii", name: "Sodium Hydrogen Carbonate (Baking Soda)", safety: "Safe", explanation: "Baking soda used as a raising agent in baked goods." },
      { code: "E322", name: "Soy Lecithin", safety: "Safe", explanation: "Natural emulsifier maintaining consistent dough texture." }
    ],
    summary: "Britannia Good Day Butter Cookies. Truth Rating 2.8/5.0. Formulated with refined wheat flour, added sugar, and palm oil.",
    rawOcrText: "BRITANNIA GOOD DAY BUTTER COOKIES - INGREDIENTS: Refined Wheat Flour, Sugar, Palm Oil, Butter...",
    nutritionScore: "D"
  };

  const truthScore = report.truthRating?.score || 2.8;

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      {/* Product Overview Header Card */}
      <div className="food-card p-5 rounded-3xl relative overflow-hidden bg-white border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                {report.brandName || 'Brand Product'}
              </span>
              <span className="text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                Verified Product Name
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              {report.productName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition ${
                isSaved ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-900'
              }`}
            >
              <Heart size={18} className={isSaved ? 'fill-current' : ''} />
            </button>
          </div>
        </div>

        {/* TruthIn 0.0 to 5.0 Star Rating Banner */}
        <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
              TruthIn Rating System (TIRS)
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xl font-black text-white">{truthScore}</span>
              <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
              <div className="flex text-amber-400 ml-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    className={s <= Math.floor(truthScore) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                  />
                ))}
              </div>
            </div>
            <span className="text-[10px] text-slate-300 font-medium block mt-0.5">
              {report.truthRating?.ratingLabel || 'Product Intelligence Score'}
            </span>
          </div>

          {/* NOVA Classification Badge */}
          {report.novaGroup && (
            <div className={`px-3 py-1.5 rounded-xl font-black text-xs shadow text-center border border-white/20 ${report.novaGroup.badgeColor}`}>
              <span className="block text-[9px] opacity-90 uppercase">Processing</span>
              {report.novaGroup.label.split(':')[0]}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 mt-3">
          {report.summary}
        </p>
      </div>

      {/* TruthIn Feature 1: Personalized Traffic Light Safety Matrix */}
      {report.trafficLight && (
        <div className="food-card p-4 rounded-3xl bg-white border border-slate-200 space-y-2.5">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Personalized Traffic Light Matrix</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className={`p-2.5 rounded-2xl border font-bold text-xs ${
              report.trafficLight.sugarStatus === 'RED' ? 'bg-rose-50 border-rose-200 text-rose-800' : (report.trafficLight.sugarStatus === 'YELLOW' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
            }`}>
              <span className="text-[9px] block uppercase opacity-80">Added Sugar</span>
              <strong className="text-sm font-black">{report.nutrition.sugar}g</strong>
              <span className="text-[9px] block font-black mt-0.5">{report.trafficLight.sugarStatus === 'RED' ? '🔴 High Risk' : '🟢 Safe'}</span>
            </div>

            <div className={`p-2.5 rounded-2xl border font-bold text-xs ${
              report.trafficLight.fatStatus === 'RED' ? 'bg-rose-50 border-rose-200 text-rose-800' : (report.trafficLight.fatStatus === 'YELLOW' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
            }`}>
              <span className="text-[9px] block uppercase opacity-80">Sat. Fat</span>
              <strong className="text-sm font-black">{report.nutrition.saturatedFat}g</strong>
              <span className="text-[9px] block font-black mt-0.5">{report.trafficLight.fatStatus === 'YELLOW' ? '🟡 Moderate' : '🟢 Low'}</span>
            </div>

            <div className={`p-2.5 rounded-2xl border font-bold text-xs ${
              report.trafficLight.sodiumStatus === 'RED' ? 'bg-rose-50 border-rose-200 text-rose-800' : (report.trafficLight.sodiumStatus === 'YELLOW' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
            }`}>
              <span className="text-[9px] block uppercase opacity-80">Sodium</span>
              <strong className="text-sm font-black">{report.nutrition.sodium}mg</strong>
              <span className="text-[9px] block font-black mt-0.5">🟢 Normal</span>
            </div>
          </div>
        </div>
      )}

      {/* TruthIn Feature 2: Hidden Sugars & Palm Oil Unmasker */}
      {report.hiddenIngredientsAlert && (report.hiddenIngredientsAlert.hiddenSugars.length > 0 || report.hiddenIngredientsAlert.cheapOils.length > 0) && (
        <div className="p-4 rounded-3xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
          <div className="flex items-center gap-2">
            <AlertOctagon size={18} className="text-rose-600 shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-950">Hidden Sugar & Palm Oil Detector</h4>
          </div>

          {report.hiddenIngredientsAlert.hiddenSugars.length > 0 && (
            <div className="text-xs leading-relaxed">
              <strong className="font-extrabold text-rose-950">Hidden Sugars Detected:</strong>{' '}
              {report.hiddenIngredientsAlert.hiddenSugars.join(', ')}
            </div>
          )}

          {report.hiddenIngredientsAlert.cheapOils.length > 0 && (
            <div className="text-xs leading-relaxed">
              <strong className="font-extrabold text-rose-950">Refined Oils Detected:</strong>{' '}
              {report.hiddenIngredientsAlert.cheapOils.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* TruthIn Feature 3: Healthier Swaps / Clean Alternatives */}
      {report.healthierSwaps && report.healthierSwaps.length > 0 && (
        <div className="food-card p-4 rounded-3xl bg-white border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Healthier Swaps & Alternatives</h3>
            <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Clean Choice
            </span>
          </div>

          <div className="space-y-2">
            {report.healthierSwaps.map((swap, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900">{swap.name}</span>
                    <span className="text-[9px] font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                      ⭐ {swap.rating}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5 font-medium">{swap.brand} • {swap.reason}</p>
                </div>
                <ArrowRight size={16} className="text-emerald-700 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutrition Breakdown Grid */}
      <div className="food-card p-4.5 rounded-3xl space-y-3 bg-white border border-slate-200">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Nutrition Breakdown (per 100g)</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[9px] text-slate-500 block font-black uppercase">Calories</span>
            <span className="text-sm font-black text-slate-900">{report.nutrition.calories}</span>
            <span className="text-[9px] text-slate-400 block font-medium">kcal</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[9px] text-slate-500 block font-black uppercase">Protein</span>
            <span className="text-sm font-black text-emerald-600">{report.nutrition.proteins}g</span>
            <span className="text-[9px] text-slate-400 block font-medium">muscle</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[9px] text-slate-500 block font-black uppercase">Carbs</span>
            <span className="text-sm font-black text-teal-600">{report.nutrition.carbs}g</span>
            <span className="text-[9px] text-slate-400 block font-medium">energy</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-[9px] text-slate-500 block font-black uppercase">Sugar</span>
            <span className={`text-sm font-black ${report.nutrition.sugar > 15 ? 'text-amber-600' : 'text-slate-900'}`}>
              {report.nutrition.sugar}g
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">sweet</span>
          </div>
        </div>
      </div>

      {/* Ingredients & Additives Decoding */}
      <div className="food-card p-4.5 rounded-3xl space-y-3 bg-white border border-slate-200">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Ingredients List & Additive Decoder</h3>

        <div className="flex flex-wrap gap-1.5">
          {report.ingredients.map((ing, idx) => (
            <span key={idx} className="text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-xl font-semibold">
              {ing}
            </span>
          ))}
        </div>

        {report.additives && report.additives.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
              Explained E-Number Additives ({report.additives.length})
            </span>
            {report.additives.map((add, idx) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-emerald-800">{add.code}: {add.name}</span>
                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    {add.safety}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">{add.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action to Scan Another Item */}
      <button
        onClick={() => setScreen('CAMERA')}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
      >
        <Camera size={20} /> Scan Another Food Item
      </button>
    </div>
  );
};
