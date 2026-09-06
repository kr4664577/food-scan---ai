import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Info,
  Flame,
  Sparkles,
  Camera,
  Edit3,
  Plus,
  Trash2,
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

export const MealReportScreen: React.FC = () => {
  const {
    activeMealReport,
    foodCategory,
    setScreen,
    updateMealDishName,
    scaleMealPortion,
    addMealItem,
    removeMealItem
  } = useAppStore();

  const [isEditingDish, setIsEditingDish] = useState(false);
  const [customDishInput, setCustomDishInput] = useState('');
  const [activePortionScale, setActivePortionScale] = useState<number>(1.0);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPortion, setNewItemPortion] = useState('1 Serving (~100g)');
  const [newItemCalories, setNewItemCalories] = useState(120);

  const report = activeMealReport || {
    detectedDishName: "Whole Wheat Rotis with Spiced Vegetable Bhaji",
    items: [
      {
        name: "Whole Wheat Rotis (Chapatis)",
        estimatedPortion: "2 Rotis (~70g)",
        confidence: 0.96,
        isEstimated: true,
        dataSource: "Visual Texture & User Input Match",
        nutrition: { calories: 160, protein: 6, carbs: 30, fat: 2, fiber: 4, sugar: 0, sodium: 120 }
      },
      {
        name: "Mixed Vegetable Bhaji / Sabzi Gravy",
        estimatedPortion: "1 Bowl (~150g)",
        confidence: 0.94,
        isEstimated: true,
        dataSource: "Color Spectrum Engine",
        nutrition: { calories: 180, protein: 5, carbs: 18, fat: 10, fiber: 5, sugar: 4, sodium: 380 }
      }
    ],
    totalNutrition: {
      calories: 340,
      protein: 11,
      carbs: 48,
      fat: 12,
      fiber: 9,
      sugar: 4,
      sodium: 500
    },
    confidence: {
      itemsRecognition: 0.95,
      portionVolume: 0.90,
      totalNutrition: 0.92,
      overall: 0.92
    },
    isEstimated: true,
    primaryDataSource: "FoodScan AI Multi-Item Engine",
    estimationDisclaimer: "All caloric, portion, and nutrient values are visual AI estimations based on computer vision volume heuristics and food database references.",
    likelyIngredients: ["Whole Wheat Flour (Atta)", "Potatoes & Mixed Veggies", "Tomatoes", "Onions", "Sunflower Oil / Ghee"],
    healthSummary: "Wholesome traditional meal combining complex carbohydrates from whole wheat rotis with vital vitamins from vegetable bhaji."
  };

  const dishTitle = report.detectedDishName || "Scanned Meal";
  const totals = report.totalNutrition || { calories: 340, protein: 11, carbs: 48, fat: 12, fiber: 9, sugar: 4, sodium: 500 };
  const overallConfidence = report.confidence?.overall || 0.92;
  const isLowConfidence = overallConfidence < 0.85;

  const quickDishSuggestions = [
    "Whole Wheat Rotis & Bhaji",
    "Paneer Butter Masala & Naan",
    "Hyderabadi Spiced Biryani",
    "Whole Wheat Butter Biscuits",
    "Crispy Masala Dosa",
    "Margherita Pizza"
  ];

  const handleApplyCustomDish = (nameToUse?: string) => {
    const finalName = nameToUse || customDishInput;
    if (!finalName.trim()) return;
    updateMealDishName(finalName.trim());
    setIsEditingDish(false);
    setCustomDishInput('');
  };

  const handlePortionSelect = (scale: number) => {
    const factor = scale / activePortionScale;
    setActivePortionScale(scale);
    scaleMealPortion(factor);
  };

  const handleAddNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    addMealItem(
      newItemName.trim(),
      newItemPortion,
      Number(newItemCalories) || 100,
      Math.round((newItemCalories * 0.08) * 10) / 10,
      Math.round((newItemCalories * 0.12) * 10) / 10,
      Math.round((newItemCalories * 0.04) * 10) / 10
    );
    setShowAddItemModal(false);
    setNewItemName('');
  };

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      {/* Solution 5: AI Unsure / Low Confidence Guidance Banner */}
      {isLowConfidence ? (
        <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-lg space-y-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="shrink-0 animate-bounce" />
            <h4 className="text-xs font-black uppercase tracking-wider">AI Unsure • Please Verify Dish Name</h4>
          </div>
          <p className="text-[11px] opacity-90 leading-snug">
            The photo has ambiguous visual lighting or non-standard layout. Please confirm your exact dish name below or tap an option.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickDishSuggestions.slice(0, 3).map((dish, i) => (
              <button
                key={i}
                onClick={() => handleApplyCustomDish(dish)}
                className="bg-white/20 hover:bg-white text-white hover:text-amber-950 px-2.5 py-1 rounded-lg text-[10px] font-bold transition border border-white/30"
              >
                {dish}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setIsEditingDish(true)}
              className="flex-1 bg-white text-amber-950 py-1.5 rounded-xl text-xs font-black text-center shadow"
            >
              ✏️ Type Correct Dish Name
            </button>
            <button
              onClick={() => setScreen('CAMERA')}
              className="px-3 bg-amber-950/40 hover:bg-amber-950 text-white py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <RefreshCw size={12} /> Retake
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Category: <strong className="uppercase font-black text-emerald-700">{foodCategory?.replace('_', ' ') || 'HOME FOOD'}</strong>
          </span>
          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-extrabold shadow-sm">
            Sub-Second AI Match
          </span>
        </div>
      )}

      {/* Solution 1: Identification & Dish Correction Header Card */}
      <div className="food-card p-5 rounded-3xl relative overflow-hidden bg-white shadow-sm border border-slate-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {Math.round(overallConfidence * 100)}% Visual Match Confidence
              </span>
              <span className="text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {report.items?.length || 1} Sub-Items
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                {dishTitle}
              </h2>
              <button
                onClick={() => setIsEditingDish(!isEditingDish)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 flex items-center justify-center transition shrink-0"
                title="Edit / Re-classify Dish"
              >
                <Edit3 size={14} />
              </button>
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col items-center justify-center text-emerald-800 shrink-0">
            <span className="text-[9px] uppercase font-black text-emerald-600">Match</span>
            <span className="text-xs font-black text-slate-900">{Math.round(overallConfidence * 100)}%</span>
          </div>
        </div>

        {/* Inline Dish Name Editing Modal/Dropdown */}
        {isEditingDish && (
          <div className="mt-3 p-3 bg-slate-50 border border-emerald-200 rounded-2xl space-y-2 animate-fadeIn">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
              Identify / Correct Dish Name:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customDishInput}
                onChange={(e) => setCustomDishInput(e.target.value)}
                placeholder="e.g. Roti and Bhaji, Paneer Tikka..."
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs w-full text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold"
              />
              <button
                onClick={() => handleApplyCustomDish()}
                className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-black hover:bg-emerald-700 transition"
              >
                Apply
              </button>
            </div>

            {/* Quick Dish Selection Chips */}
            <div className="pt-1">
              <span className="text-[9px] font-bold text-slate-400 block mb-1">Quick Select Popular Dishes:</span>
              <div className="flex flex-wrap gap-1">
                {quickDishSuggestions.map((dish, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyCustomDish(dish)}
                    className="text-[9px] font-bold bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 px-2 py-1 rounded-lg transition"
                  >
                    {dish}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 mt-3">
          {report.healthSummary}
        </p>
      </div>

      {/* Solution 2: Reasonably Estimated Calories & Dynamic Portion Scaler */}
      <div className="food-card p-4.5 rounded-3xl space-y-3 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Estimated Total Nutrition</h3>
            <span className="text-[10px] text-slate-400 font-bold">Range: ±30 kcal based on USDA data</span>
          </div>
          <span className="text-sm font-black text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
            <Flame size={16} className="text-orange-500 fill-orange-500" /> ~{totals.calories} kcal
          </span>
        </div>

        {/* Portion Scaler Selector */}
        <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pl-2">Portion Size:</span>
          <div className="flex items-center gap-1">
            {[
              { label: '0.5x Small', scale: 0.5 },
              { label: '1.0x Regular', scale: 1.0 },
              { label: '1.5x Large', scale: 1.5 },
              { label: '2.0x Double', scale: 2.0 }
            ].map((p) => (
              <button
                key={p.scale}
                onClick={() => handlePortionSelect(p.scale)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
                  activePortionScale === p.scale
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Macros Breakdown Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-emerald-200">
            <span className="text-[9px] text-slate-500 block font-black uppercase">Protein</span>
            <span className="text-sm font-black text-emerald-600">{totals.protein}g</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-teal-200">
            <span className="text-[9px] text-slate-500 block font-black uppercase">Carbs</span>
            <span className="text-sm font-black text-teal-600">{totals.carbs}g</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-cyan-200">
            <span className="text-[9px] text-slate-500 block font-black uppercase">Fats</span>
            <span className="text-sm font-black text-cyan-600">{totals.fat}g</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-indigo-200">
            <span className="text-[9px] text-slate-500 block font-black uppercase">Fiber</span>
            <span className="text-sm font-black text-indigo-600">{totals.fiber}g</span>
          </div>
        </div>
      </div>

      {/* Solution 3: Multi-Item Meal Breakdown with Add/Remove */}
      <div className="food-card p-4.5 rounded-3xl space-y-3 bg-white border border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Detected Meal Components ({report.items?.length || 0})
          </h3>
          <button
            onClick={() => setShowAddItemModal(true)}
            className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded-xl flex items-center gap-1 transition shadow-sm"
          >
            <Plus size={12} /> Add Extra Item
          </button>
        </div>

        {/* Modal for adding custom extra item */}
        {showAddItemModal && (
          <form onSubmit={handleAddNewItemSubmit} className="p-3 bg-slate-50 border border-emerald-200 rounded-2xl space-y-2 animate-fadeIn">
            <h4 className="text-xs font-black text-slate-800">Add Extra Item to Meal:</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Item name (e.g. Curd, Salad)"
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                required
              />
              <input
                type="number"
                value={newItemCalories}
                onChange={(e) => setNewItemCalories(Number(e.target.value))}
                placeholder="Est. Calories"
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="text-xs font-bold px-3 py-1 text-slate-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs font-black bg-emerald-600 text-white px-3 py-1 rounded-xl"
              >
                Add Item
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2.5">
          {report.items?.map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 group hover:border-emerald-300 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 text-xs font-black">
                    {idx + 1}
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-900">{item.name}</h5>
                    <span className="text-[10px] text-emerald-700 font-bold">Portion: {item.estimatedPortion}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-700 block">~{item.nutrition?.calories || 0} kcal</span>
                    <span className="text-[9px] text-slate-400 font-semibold">{Math.round((item.confidence || 0.90) * 100)}% Conf.</span>
                  </div>
                  <button
                    onClick={() => removeMealItem(idx)}
                    className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition"
                    title="Remove item"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {item.nutrition && (
                <div className="grid grid-cols-4 gap-1 text-center bg-white p-2 rounded-xl text-[10px] border border-slate-200 font-bold">
                  <span className="text-emerald-700">P: {item.nutrition.protein}g</span>
                  <span className="text-teal-700">C: {item.nutrition.carbs}g</span>
                  <span className="text-cyan-700">F: {item.nutrition.fat}g</span>
                  <span className="text-indigo-700">Fib: {item.nutrition.fiber}g</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Likely Ingredients */}
      <div className="food-card p-4.5 rounded-3xl space-y-2 bg-white border border-slate-200">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Likely Constituent Ingredients</h3>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {report.likelyIngredients?.map((ing, idx) => (
            <span key={idx} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-xl font-semibold">
              {ing}
            </span>
          ))}
        </div>
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
