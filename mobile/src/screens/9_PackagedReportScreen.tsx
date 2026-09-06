import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AlertTriangle, CheckCircle2, Heart, ShieldAlert, Sparkles, FileText, Camera } from 'lucide-react';

export const PackagedReportScreen: React.FC = () => {
  const { activePackagedReport, user, setScreen } = useAppStore();
  const [showOcr, setShowOcr] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const report = activePackagedReport || {
    productName: "Organic Oat & Honey Granola",
    brandName: "Nature's Harvest",
    nutrition: {
      calories: 380,
      proteins: 9.5,
      carbs: 64,
      fats: 11,
      sugar: 18,
      sodium: 140,
      saturatedFat: 2.1
    },
    healthHighlights: [
      { type: "warning", label: "High Sugar Content", description: "Contains 18g sugar per serving, which is 36% of daily recommended value." },
      { type: "good", label: "Good Source of Fiber", description: "Contains whole grain oats providing sustainable energy release." }
    ],
    ingredients: ["Whole Grain Rolled Oats", "Honey", "Cane Sugar", "Sunflower Oil", "Sea Salt", "Tocopherols (E307)"],
    detectedAllergens: ["Oats (Gluten)", "Tree Nuts Trace"],
    additives: [
      {
        code: "E307",
        name: "Alpha-Tocopherol (Vitamin E)",
        safety: "Safe",
        explanation: "A natural antioxidant used to protect oils in food from oxidation and rancidity."
      }
    ],
    summary: "Nutritious whole grain granola with high sugar content. Great as an occasional breakfast or yogurt topper.",
    rawOcrText: "NATURE'S HARVEST ORGANIC OAT & HONEY GRANOLA - INGREDIENTS: Whole grain rolled oats, honey, cane sugar...",
    nutritionScore: "B"
  };



  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      {/* Product Overview Card */}
      <div className="food-card p-5 rounded-3xl relative overflow-hidden bg-white">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                {report.brandName || 'Packaged Product'}
              </span>
              {report.sources?.productName && (
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                  report.sources.productName === 'PACKAGE_OCR'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : report.sources.productName === 'EXTERNAL_DATABASE'
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {report.sources.productName === 'PACKAGE_OCR' ? '📷 Package OCR' : report.sources.productName === 'EXTERNAL_DATABASE' ? '🗄️ Open Food Facts DB' : '🤖 AI Heuristic'}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight mb-1">
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-500/20">
              {report.nutritionScore || 'B'}
            </div>
          </div>
        </div>

        {/* Confidence Bar */}
        {report.confidence && (
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 my-2 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Sparkles size={14} className="text-emerald-600" /> AI Confidence:
            </span>
            <div className="flex items-center gap-1.5 font-extrabold">
              <span className="text-emerald-700">{Math.round((report.confidence.overall || 0.90) * 100)}%</span>
              <span className="text-[9px] text-slate-400">
                (Name: {Math.round((report.confidence.productName || 0.95) * 100)}% • Ing: {Math.round((report.confidence.ingredients || 0.90) * 100)}%)
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
          {report.summary}
        </p>
      </div>

      {/* OCR Quality Warnings */}
      {report.uncertaintyWarnings && report.uncertaintyWarnings.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1 text-xs">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <AlertTriangle size={16} /> OCR Quality Alert
          </div>
          {report.uncertaintyWarnings.map((warn, i) => (
            <p key={i} className="text-[11px] leading-relaxed opacity-90">• {warn}</p>
          ))}
        </div>
      )}



      {/* Health Flags */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider px-1">Health Flags & Rating</h3>
        <div className="space-y-2">
          {report.healthHighlights.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                item.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : item.type === 'good'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-900'
              }`}
            >
              {item.type === 'warning' ? (
                <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
              ) : (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
              )}
              <div>
                <h5 className="text-xs font-bold mb-0.5">{item.label}</h5>
                <p className="text-[11px] leading-relaxed opacity-90">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Nutrition Facts */}
      <div className="food-card p-4.5 rounded-3xl space-y-3">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Nutrition Breakdown (per 100g)</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold uppercase">Calories</span>
            <span className="text-sm font-extrabold text-slate-900">{report.nutrition.calories}</span>
            <span className="text-[9px] text-slate-400 block font-medium">kcal</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold uppercase">Protein</span>
            <span className="text-sm font-extrabold text-emerald-600">{report.nutrition.proteins}g</span>
            <span className="text-[9px] text-slate-400 block font-medium">muscle</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold uppercase">Carbs</span>
            <span className="text-sm font-extrabold text-teal-600">{report.nutrition.carbs}g</span>
            <span className="text-[9px] text-slate-400 block font-medium">energy</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-bold uppercase">Sugar</span>
            <span className={`text-sm font-extrabold ${report.nutrition.sugar > 15 ? 'text-amber-600' : 'text-slate-900'}`}>
              {report.nutrition.sugar}g
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">sweet</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-semibold">Total Fats</span>
            <strong className="text-slate-900 font-extrabold">{report.nutrition.fats}g</strong>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-semibold">Sat. Fat</span>
            <strong className="text-slate-900 font-extrabold">{report.nutrition.saturatedFat}g</strong>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-semibold">Sodium</span>
            <strong className="text-slate-900 font-extrabold">{report.nutrition.sodium}mg</strong>
          </div>
        </div>
      </div>

      {/* Ingredients & Additives Decoding */}
      <div className="food-card p-4.5 rounded-3xl space-y-3">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ingredients & Additive Decoding</h3>

        <div className="flex flex-wrap gap-1.5">
          {report.ingredients.map((ing, idx) => (
            <span key={idx} className="text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-xl font-medium">
              {ing}
            </span>
          ))}
        </div>

        {report.additives && report.additives.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block">
              Explained Additives ({report.additives.length})
            </span>
            {report.additives.map((add, idx) => (
              <div key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-emerald-700">{add.code}: {add.name}</span>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    {add.safety}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">{add.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw OCR Text Toggle */}
      <div className="pt-1">
        <button
          onClick={() => setShowOcr(!showOcr)}
          className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-extrabold hover:text-slate-900 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <FileText size={16} className="text-emerald-600" /> {showOcr ? 'Hide Raw OCR Text' : 'View Extracted Raw OCR Text'}
        </button>

        {showOcr && (
          <div className="mt-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[10px] font-mono text-slate-600 leading-relaxed overflow-x-auto">
            {report.rawOcrText || 'No raw text available.'}
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
