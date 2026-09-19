import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Home, Scan, Clock, Heart, User } from 'lucide-react';
import { ScreenType } from '../types';

export const BottomNavigation: React.FC = () => {
  const { currentScreen, setScreen } = useAppStore();

  const hiddenScreens: ScreenType[] = ['SPLASH', 'ONBOARDING', 'AUTH', 'CAMERA', 'AI_PROCESSING'];
  if (hiddenScreens.includes(currentScreen)) return null;

  const navItems = [
    { id: 'DASHBOARD' as ScreenType, label: 'Home', icon: Home },
    { id: 'HISTORY' as ScreenType, label: 'History', icon: Clock },
    { id: 'SCAN_SELECTION' as ScreenType, label: 'Scan', icon: Scan, isScanBtn: true },
    { id: 'FAVORITES' as ScreenType, label: 'Saved', icon: Heart },
    { id: 'PROFILE' as ScreenType, label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-3 pt-1">
      <nav className="bg-white/95 backdrop-blur-2xl rounded-2xl px-3 py-1.5 flex items-center justify-around border border-slate-200 shadow-lg shadow-slate-900/5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          if (item.isScanBtn) {
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className="relative -top-5 flex flex-col items-center group"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 p-[2px] shadow-xl shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-200">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <Scan className="w-7 h-7 text-emerald-600 group-hover:rotate-12 transition-transform duration-300 stroke-[2.5]" />
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 mt-1 uppercase tracking-wider">Scan AI</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon size={20} className={isActive ? 'stroke-[2.5] text-emerald-600' : 'stroke-2'} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5 shadow-sm shadow-emerald-500" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
