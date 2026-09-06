import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Sparkles, RefreshCw, ArrowLeft, CheckCircle2, FileSearch, Utensils, Edit3, Home, Store, Package } from 'lucide-react';
import { FoodCategory, ScanMode } from '../types';

export const ImagePreviewScreen: React.FC = () => {
  const { capturedImage, scanMode, foodCategory, setFoodCategory, setScreen, processPackagedScan, processMealScan, processQualityScan, processBarcodeScan } = useAppStore();
  const [customDishName, setCustomDishName] = useState('');

  const categoryBadges: Record<FoodCategory, string[]> = {
    HOME_FOOD: [
      '🫓 Rotis & Bhaji',
      '🍚 Dal & Rice',
      '🥞 Homemade Dosa',
      '🫓 Stuffed Paratha',
      '🍲 Khichdi'
    ],
    RESTAURANT_FOOD: [
      '🧀 Paneer Butter Masala',
      '🍛 Hyderabadi Biryani',
      '🍕 Veggie Pizza',
      '🍝 Creamy Pasta',
      '🍔 Club Sandwich'
    ],
    OUTSIDE_PACKAGED: [
      '🍪 Whole Wheat Biscuits',
      '🍪 Cream Cookies (Oreo)',
      '🍟 Potato Chips / Snacks',
      '🍫 Chocolate Bar',
      '🥣 Oat Granola'
    ],
    FRUITS: [
      '🍎 Red Crisp Apples',
      '🍌 Sliced Bananas',
      '🍓 Fresh Berries',
      '🥭 Tropical Mango',
      '🍇 Fresh Grapes'
    ],
    VEGETABLES: [
      '🥒 Cucumber Slices',
      '🍅 Fresh Tomatoes',
      '🥕 Crunchy Carrots',
      '🥦 Roasted Broccoli',
      '🥗 Garden Green Salad'
    ]
  };

  const currentBadges = categoryBadges[foodCategory] || categoryBadges.HOME_FOOD;

  const modeLabels: Record<ScanMode, string> = {
    PACKAGED_BARCODE: 'Packaged Barcode',
    PACKAGED_PHOTO: 'Packaged Food Label OCR',
    MEAL_PHOTO: 'Meal Dish Analysis',
    QUALITY_CHECK: 'Freshness & Quality Check'
  };

  const handleConfirm = async () => {
    setScreen('AI_PROCESSING');

    if (!capturedImage) return;

    if (foodCategory === 'OUTSIDE_PACKAGED' || scanMode === 'PACKAGED_PHOTO') {
      await processPackagedScan(capturedImage, customDishName, foodCategory);
    } else if (scanMode === 'PACKAGED_BARCODE') {
      await processBarcodeScan('737628064502');
    } else if (scanMode === 'QUALITY_CHECK') {
      await processQualityScan(capturedImage);
    } else {
      await processMealScan(capturedImage, customDishName, foodCategory);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 space-y-4 max-w-md mx-auto min-h-screen flex flex-col justify-between bg-slate-50">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setScreen('CAMERA')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition"
          >
            <ArrowLeft size={16} /> Retake Photo
          </button>
          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-3.5 py-1 rounded-full border border-emerald-300/60 shadow-xs flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-600" /> Photo Ready
          </span>
        </div>

        {/* 1. Category Selection Bar */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-3">
          <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block px-1 mb-1.5">
            Select Food Category:
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setFoodCategory('HOME_FOOD')}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center gap-1 border whitespace-nowrap transition ${
                foodCategory === 'HOME_FOOD'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Home size={14} /> 🏡 Home Food
            </button>

            <button
              type="button"
              onClick={() => setFoodCategory('RESTAURANT_FOOD')}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center gap-1 border whitespace-nowrap transition ${
                foodCategory === 'RESTAURANT_FOOD'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Store size={14} /> 🍽️ Restaurant
            </button>

            <button
              type="button"
              onClick={() => setFoodCategory('OUTSIDE_PACKAGED')}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center gap-1 border whitespace-nowrap transition ${
                foodCategory === 'OUTSIDE_PACKAGED'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Package size={14} /> 🍪 Outside Food
            </button>

            <button
              type="button"
              onClick={() => setFoodCategory('FRUITS')}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center gap-1 border whitespace-nowrap transition ${
                foodCategory === 'FRUITS'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🍎 Fruits
            </button>

            <button
              type="button"
              onClick={() => setFoodCategory('VEGETABLES')}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center gap-1 border whitespace-nowrap transition ${
                foodCategory === 'VEGETABLES'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🥦 Vegetables
            </button>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-xl aspect-[4/3] bg-slate-900 mb-3 group">
          <img
            src={capturedImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
            alt="Preview Captured Food"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-950/85 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-xs shadow-lg flex items-center justify-between">
            <span className="text-emerald-400 font-extrabold flex items-center gap-1">
              <FileSearch size={14} /> Mode: {modeLabels[scanMode]}
            </span>
            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
              AI Vision Ready
            </span>
          </div>
        </div>

        {/* Custom Dish / Food Description Selector */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Utensils size={14} className="text-emerald-600" /> Food Name / Item Description (Optional):
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Improves AI precision</span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={customDishName}
              onChange={(e) => setCustomDishName(e.target.value)}
              placeholder={
                foodCategory === 'HOME_FOOD'
                  ? "e.g. Whole Wheat Rotis with Bhaji, Dal Tadka..."
                  : foodCategory === 'RESTAURANT_FOOD'
                  ? "e.g. Paneer Butter Masala, Hyderabadi Biryani..."
                  : "e.g. Whole Wheat Butter Biscuits, Chocolate Chips..."
              }
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            <Edit3 size={15} className="absolute left-3 top-3 text-slate-400" />
          </div>

          {/* Category Quick Badges */}
          <div className="flex gap-1.5 overflow-x-auto pt-1 no-scrollbar">
            {currentBadges.map((badge, idx) => {
              const cleanBadgeName = badge.replace(/^[^\s]+\s*/, '');
              const isSelected = customDishName.toLowerCase().includes(cleanBadgeName.toLowerCase());
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomDishName(cleanBadgeName)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-xl whitespace-nowrap border transition ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {badge}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <button
          onClick={handleConfirm}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          Generate AI Food Report <Sparkles size={20} className="text-amber-300" />
        </button>

        <button
          onClick={() => setScreen('CAMERA')}
          className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <RefreshCw size={16} /> Take Another Photo
        </button>
      </div>
    </div>
  );
};

