import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Search, Heart, Clock } from 'lucide-react';

export const HistoryScreen: React.FC = () => {
  const { history, toggleFavorite } = useAppStore();
  const [filterType, setFilterType] = useState<'ALL' | 'PACKAGED' | 'MEAL' | 'QUALITY_INSPECTION'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(item => {
    const matchesType = filterType === 'ALL' || item.scanType === filterType;
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      {/* Search Input */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-3.5 text-emerald-600" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search scan history..."
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(['ALL', 'PACKAGED', 'MEAL', 'QUALITY_INSPECTION'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition whitespace-nowrap border ${
              filterType === type
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Scans List */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="food-card p-8 rounded-3xl text-center text-slate-500 space-y-2">
            <Clock size={36} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-extrabold text-slate-900">No Food Scans Found</p>
            <p className="text-xs text-slate-500">Scan packaged food or dish plates to build your nutritional history.</p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="food-card p-4 rounded-2xl flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-base font-bold shadow-sm">
                  {item.scanType === 'PACKAGED' ? '📦' : item.scanType === 'MEAL' ? '🥗' : '🛡️'}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">{item.productName}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {item.scanType} • {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {item.calories && (
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    {item.calories} kcal
                  </span>
                )}
                <button
                  onClick={() => toggleFavorite(item.id)}
                  className={`p-2 rounded-full transition ${
                    item.isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Heart size={18} className={item.isFavorite ? 'fill-current' : ''} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
