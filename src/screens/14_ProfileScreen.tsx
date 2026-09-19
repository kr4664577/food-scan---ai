import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { LogOut, ShieldCheck, User } from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAppStore();

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      {/* Profile Header Card */}
      <div className="food-card p-5 rounded-3xl text-center relative overflow-hidden bg-white shadow-sm border border-slate-200">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 mx-auto mb-3 shadow-md shadow-emerald-500/20">
          <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center text-emerald-700 font-extrabold text-2xl">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-slate-900">{user?.fullName || 'Alex Morgan'}</h2>
        <p className="text-xs text-slate-500 mb-3">{user?.email || 'alex.foodie@foodscan.ai'}</p>

        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Account Info Card */}
      <div className="food-card p-5 rounded-3xl space-y-3 bg-white border border-slate-200 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <User size={16} className="text-emerald-600" /> Account Overview
        </h3>
        <div className="flex justify-between items-center py-2.5 border-b border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">Member Status</span>
          <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Pro Active</span>
        </div>
        <div className="flex justify-between items-center py-2.5 text-xs">
          <span className="text-slate-500 font-medium">AI Intelligence Pipeline</span>
          <span className="text-slate-800 font-bold flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" /> FoodScan v2.5 Ready
          </span>
        </div>
      </div>
    </div>
  );
};

