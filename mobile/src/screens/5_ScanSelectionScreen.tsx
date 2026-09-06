import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Home, Store, Package, QrCode, ArrowRight, Sparkles, Utensils } from 'lucide-react';
import { FoodCategory, ScanMode } from '../types';

export const ScanSelectionScreen: React.FC = () => {
  const { setScreen, setScanMode, setFoodCategory } = useAppStore();

  const handleSelectCategory = (category: FoodCategory, mode: ScanMode) => {
    setFoodCategory(category);
    setScanMode(mode);
    setScreen('CAMERA');
  };

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider mb-2">
          <Sparkles size={12} /> FoodScan AI Category Selector
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Select Food Category</h2>
        <p className="text-xs text-slate-500 mt-0.5">Choose your food type for precise item recognition & accurate macros</p>
      </div>

      <div className="space-y-3.5">
        {/* Category 1: Home Food */}
        <div
          onClick={() => handleSelectCategory('HOME_FOOD', 'MEAL_PHOTO')}
          className="food-card p-5 rounded-3xl cursor-pointer group relative overflow-hidden bg-white border border-slate-200 hover:border-emerald-500 transition shadow-sm"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Home size={26} />
            </div>
            <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
              🏡 Home Food
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition mb-1">
            Homemade Meal / Home-Cooked Food
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Rotis & Bhaji/Sabzi, Dal Rice, Parathas, Khichdi, Idli, Dosa & home kitchen dishes.
          </p>
          <div className="flex items-center text-xs font-extrabold text-emerald-600 group-hover:translate-x-1.5 transition-transform">
            Scan Home Meal <ArrowRight size={14} className="ml-1.5" />
          </div>
        </div>

        {/* Category 2: Restaurant Food */}
        <div
          onClick={() => handleSelectCategory('RESTAURANT_FOOD', 'MEAL_PHOTO')}
          className="food-card p-5 rounded-3xl cursor-pointer group relative overflow-hidden bg-white border border-slate-200 hover:border-teal-500 transition shadow-sm"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
              <Store size={26} />
            </div>
            <span className="text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-wider">
              🍽️ Restaurant
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-teal-600 transition mb-1">
            Restaurant / Dine-In / Takeout Food
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Paneer Butter Masala, Naan, Hyderabadi Biryani, Gourmet Pizzas, Pasta & restaurant curries.
          </p>
          <div className="flex items-center text-xs font-extrabold text-teal-600 group-hover:translate-x-1.5 transition-transform">
            Scan Restaurant Dish <ArrowRight size={14} className="ml-1.5" />
          </div>
        </div>

        {/* Category 3: Outside / Packaged Snacks */}
        <div
          onClick={() => handleSelectCategory('OUTSIDE_PACKAGED', 'PACKAGED_PHOTO')}
          className="food-card p-5 rounded-3xl cursor-pointer group relative overflow-hidden bg-white border border-slate-200 hover:border-cyan-500 transition shadow-sm"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
              <Package size={26} />
            </div>
            <span className="text-[10px] font-extrabold bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full uppercase tracking-wider">
              🍪 Outside / Packaged
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-cyan-600 transition mb-1">
            Outside / Store-Bought Packaged Snacks
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Whole Wheat Biscuits, Cookies, Wafers, Chips, Chocolates, Granola & packaged labels.
          </p>
          <div className="flex items-center text-xs font-extrabold text-cyan-600 group-hover:translate-x-1.5 transition-transform">
            Scan Packaged Item <ArrowRight size={14} className="ml-1.5" />
          </div>
        </div>

        {/* Category 4: Fresh Fruits */}
        <div
          onClick={() => handleSelectCategory('FRUITS', 'MEAL_PHOTO')}
          className="food-card p-5 rounded-3xl cursor-pointer group relative overflow-hidden bg-white border border-slate-200 hover:border-rose-500 transition shadow-sm"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform text-2xl">
              🍎
            </div>
            <span className="text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full uppercase tracking-wider">
              🍎 Fresh Fruits
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-rose-600 transition mb-1">
            Fresh Whole Fruits & Fruit Bowls
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Apples, Bananas, Oranges, Strawberries, Mangoes, Papayas & Fresh Fruit Platters.
          </p>
          <div className="flex items-center text-xs font-extrabold text-rose-600 group-hover:translate-x-1.5 transition-transform">
            Scan Fresh Fruits <ArrowRight size={14} className="ml-1.5" />
          </div>
        </div>

        {/* Category 5: Fresh Vegetables */}
        <div
          onClick={() => handleSelectCategory('VEGETABLES', 'MEAL_PHOTO')}
          className="food-card p-5 rounded-3xl cursor-pointer group relative overflow-hidden bg-white border border-slate-200 hover:border-emerald-500 transition shadow-sm"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform text-2xl">
              🥦
            </div>
            <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
              🥦 Fresh Vegetables
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition mb-1">
            Garden Fresh Vegetables & Salads
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Cucumbers, Tomatoes, Carrots, Broccoli, Spinach, Salad Platters & Raw Greens.
          </p>
          <div className="flex items-center text-xs font-extrabold text-emerald-600 group-hover:translate-x-1.5 transition-transform">
            Scan Fresh Vegetables <ArrowRight size={14} className="ml-1.5" />
          </div>
        </div>

        {/* Category 4: Barcode Scanner */}
        <div
          onClick={() => handleSelectCategory('OUTSIDE_PACKAGED', 'PACKAGED_BARCODE')}
          className="food-card p-4 rounded-3xl cursor-pointer group relative overflow-hidden bg-white border border-slate-200 hover:border-amber-500 transition shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <QrCode size={20} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900">Instant Barcode Scanner</h4>
                <p className="text-[11px] text-slate-500">Scan UPC/EAN product barcodes</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-amber-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

