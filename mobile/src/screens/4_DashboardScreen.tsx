import React, { useState, useEffect } from 'react';
import { averageCalories } from '../utils/historyStats';
import { MealSuggestions } from '../components/MealSuggestions';
import { ScanAnalytics } from '../components/ScanAnalytics';
import { useAppStore } from '../store/useAppStore';
import { QrCode, Utensils, Eye, ShieldAlert, Sparkles, ChevronRight, Activity, Flame, Search, Camera, ArrowRight, Zap, Info } from 'lucide-react';
import { ScanMode } from '../types';

export const DashboardScreen: React.FC = () => {
  const { user, token, setScreen, setScanMode, history, historyStatus, fetchHistory } = useAppStore();
  useEffect(() => { void fetchHistory(); }, [user?.id, token, fetchHistory]);
  const avgCalories = averageCalories(history, user?.id);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleLaunchScan = (mode: ScanMode) => {
    setScanMode(mode);
    setScreen('CAMERA');
  };

  const categories = [
    { id: 'ALL', label: '🥗 All Scans' },
    { id: 'PACKAGED', label: '📦 Packaged Food' },
    { id: 'MEAL', label: '🍱 Meal & Dishes' },
    { id: 'QUALITY', label: '🛡️ Quality Check' },
    { id: 'BARCODE', label: '🏷️ Barcode Lookup' },
    { id: 'HEALTHY', label: '💚 Healthy Choices' },
  ];


  return (
    <div className="pb-28 pt-3 px-4 space-y-5 max-w-md mx-auto">
      {/* 1. Clean White Search & Scan Shortcut Bar */}
      <div className="relative">
        <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
          <Search size={18} className="text-emerald-600 ml-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 'Oats', 'Nutella', 'Salmon' or scan..."
            className="bg-transparent w-full py-2 px-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 pr-1">
            <button
              onClick={() => handleLaunchScan('PACKAGED_BARCODE')}
              className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition border border-emerald-100"
              title="Scan Barcode"
            >
              <QrCode size={16} />
            </button>
            <button
              onClick={() => handleLaunchScan('MEAL_PHOTO')}
              className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 hover:scale-105 transition"
              title="Snap Meal Photo"
            >
              <Camera size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Category Filter Horizontal Scroll Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 scale-105'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Hero Banner Card */}
      <div className="relative rounded-3xl overflow-hidden border border-emerald-500/20 shadow-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 text-white">
        <img
          src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80"
          alt="Healthy Food Banner"
          className="w-full h-44 object-cover opacity-25 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-5 flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow">
              AI Food Intelligence
            </span>
            <span className="text-[10px] text-teal-200 font-semibold flex items-center gap-1">
              <Zap size={12} className="text-teal-300 fill-teal-300" /> Instant OCR & Macros
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-white leading-tight drop-shadow">
            Understand Your Food 🥑
          </h2>
          <p className="text-xs text-slate-200 mt-1 max-w-[280px]">
            Detect ingredients, allergens, E-number additives & calorie distribution automatically.
          </p>

          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setScreen('SCAN_SELECTION')}
              className="bg-white text-emerald-800 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg hover:bg-slate-100 transition"
            >
              Start AI Scan <ArrowRight size={14} />
            </button>
            <span className="text-[10px] text-slate-200 font-medium">
              Nutrition with context
            </span>
          </div>
        </div>
      </div>

      {/* 4. Active User Allergy Alert Banner */}
      {user?.allergies && user.allergies.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-900">Active Allergy Shield Enabled</h4>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {user.allergies.map((allergy, i) => (
                <span key={i} className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full">
                  ⚠️ {allergy}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Primary Food Category Services */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Food Categories</h3>
          <span className="text-[10px] text-emerald-600 font-bold">Select Category</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. Home Food */}
          <div
            onClick={() => {
              useAppStore.getState().setFoodCategory('HOME_FOOD');
              handleLaunchScan('MEAL_PHOTO');
            }}
            className="food-card p-3 rounded-2xl cursor-pointer flex flex-col justify-between h-28 group bg-white border border-slate-200 hover:border-emerald-500 transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <span className="text-base">🏡</span>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition">Home Food</h4>
                <p className="text-[9px] text-slate-500 leading-tight">Rotis, Bhaji, Dal & Sabzi</p>
              </div>
            </div>
          </div>

          {/* 2. Restaurant Food */}
          <div
            onClick={() => {
              useAppStore.getState().setFoodCategory('RESTAURANT_FOOD');
              handleLaunchScan('MEAL_PHOTO');
            }}
            className="food-card p-3 rounded-2xl cursor-pointer flex flex-col justify-between h-28 group bg-white border border-slate-200 hover:border-teal-500 transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                <span className="text-base">🍽️</span>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-teal-600 transition">Restaurant</h4>
                <p className="text-[9px] text-slate-500 leading-tight">Paneer, Biryani & Naan</p>
              </div>
            </div>
          </div>

          {/* 3. Outside Packaged */}
          <div
            onClick={() => {
              useAppStore.getState().setFoodCategory('OUTSIDE_PACKAGED');
              handleLaunchScan('PACKAGED_PHOTO');
            }}
            className="food-card p-3 rounded-2xl cursor-pointer flex flex-col justify-between h-28 group bg-white border border-slate-200 hover:border-amber-500 transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <span className="text-base">🍪</span>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-amber-600 transition">Outside Food</h4>
                <p className="text-[9px] text-slate-500 leading-tight">Biscuits & Packaged Snacks</p>
              </div>
            </div>
          </div>

          {/* 4. Fresh Fruits */}
          <div
            onClick={() => {
              useAppStore.getState().setFoodCategory('FRUITS');
              handleLaunchScan('MEAL_PHOTO');
            }}
            className="food-card p-3 rounded-2xl cursor-pointer flex flex-col justify-between h-28 group bg-white border border-slate-200 hover:border-rose-500 transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                <span className="text-base">🍎</span>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-rose-600 transition">Fresh Fruits</h4>
                <p className="text-[9px] text-slate-500 leading-tight">Apples, Bananas & Berries</p>
              </div>
            </div>
          </div>

          {/* 5. Fresh Vegetables */}
          <div
            onClick={() => {
              useAppStore.getState().setFoodCategory('VEGETABLES');
              handleLaunchScan('MEAL_PHOTO');
            }}
            className="food-card p-3 rounded-2xl cursor-pointer flex flex-col justify-between h-28 group bg-white border border-slate-200 hover:border-emerald-500 transition shadow-sm col-span-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shrink-0">
                <span className="text-base">🥦</span>
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition">Fresh Vegetables & Salads</h4>
                <p className="text-[9px] text-slate-500 leading-tight">Cucumber, Tomato, Carrots & Greens</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Quick Daily Health Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="food-card p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <Flame size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">AVG CALORIES</span>
            <span className="text-base font-extrabold text-slate-900">{historyStatus === 'ready' ? `${avgCalories.toLocaleString(undefined, { maximumFractionDigits: 1 })} kcal` : historyStatus === 'error' ? 'Unavailable' : 'Loading…'}</span>
            <span className="text-[9px] block text-slate-500">Per valid saved food scan, not daily intake</span>
          </div>
        </div>

        <div className="food-card p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Scans</span>
            <span className="text-base font-extrabold text-slate-900">{historyStatus === 'ready' ? `${history.length} Saved` : '—'}</span>
          </div>
        </div>
      </div>

      {historyStatus === 'ready' && <ScanAnalytics history={history} userId={user?.id} />}
      <MealSuggestions goal={user?.dietaryGoals} allergies={user?.allergies} />

      {/* 8. Recent Scans Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Your Recent Scans</h3>
          <button
            onClick={() => setScreen('HISTORY')}
            className="text-xs text-emerald-600 font-extrabold hover:underline"
          >
            Full History
          </button>
        </div>

        {historyStatus === 'error' ? <button className="text-sm text-rose-700 underline" onClick={() => void fetchHistory()}>History could not be loaded. Retry</button> : history.length === 0 ? (
          <div className="food-card p-5 rounded-2xl text-center space-y-2">
            <Info size={24} className="mx-auto text-slate-400" />
            <p className="text-xs text-slate-500 font-medium">No previous food scans found.</p>
            <button
              onClick={() => setScreen('SCAN_SELECTION')}
              className="text-xs text-emerald-600 font-extrabold underline"
            >
              Take your first scan now
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="food-card p-3 rounded-xl flex items-center justify-between cursor-pointer"
                onClick={() => setScreen('HISTORY')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-sm font-bold">
                    {item.scanType === 'PACKAGED' ? '📦' : item.scanType === 'MEAL' ? '🥗' : '🛡️'}
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900">{item.productName}</h5>
                    <p className="text-[10px] text-slate-500">{item.scanType} • {new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {item.calories && (
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {item.calories} kcal
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 9. Safety Disclaimer Box */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <ShieldAlert size={20} className="shrink-0 text-amber-600 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-extrabold text-amber-950 block mb-0.5">SAFETY NOTICE:</strong>
          AI vision analysis evaluates surface optical indicators only. It CANNOT test for invisible bacteria (Salmonella, E. coli), toxins, or chemical pathogens. Always observe standard food hygiene safety.
        </div>
      </div>
    </div>
  );
};
