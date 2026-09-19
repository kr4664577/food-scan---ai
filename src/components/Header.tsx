import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { MapPin, ShieldAlert, Settings as SettingsIcon, ChevronLeft, User as UserIcon, Sparkles, Scan } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentScreen, goBack, setScreen, user } = useAppStore();

  const showBackButton = ![
    'SPLASH',
    'ONBOARDING',
    'AUTH',
    'DASHBOARD'
  ].includes(currentScreen);

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'DASHBOARD': return 'FoodScan AI';
      case 'SCAN_SELECTION': return 'Select Scan Mode';
      case 'CAMERA': return 'Scanner Camera';
      case 'IMAGE_PREVIEW': return 'Confirm Photo';
      case 'AI_PROCESSING': return 'AI Vision Analysis';
      case 'PACKAGED_REPORT': return 'Packaged Food Report';
      case 'MEAL_REPORT': return 'Meal Nutrition Breakdown';
      case 'QUALITY_REPORT': return 'Visual Quality Report';
      case 'HISTORY': return 'Scan History';
      case 'FAVORITES': return 'Saved Foods';
      case 'PROFILE': return 'User Profile';
      case 'SETTINGS': return 'Settings & API Keys';
      case 'PRIVACY': return 'Safety & Privacy';
      default: return 'FoodScan AI';
    }
  };

  if (['SPLASH', 'ONBOARDING'].includes(currentScreen)) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left Section: Back Button or Location Header */}
        <div className="flex items-center gap-3 overflow-hidden">
          {showBackButton ? (
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => setScreen('PROFILE')}>
              <img
                src="/foodscan_logo.png"
                alt="FoodScan AI"
                className="w-9 h-9 rounded-xl object-cover shadow-sm border border-emerald-500/30 group-hover:scale-105 transition shrink-0"
              />
              <div className="truncate">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-600 transition flex items-center gap-1">
                    FoodScan AI <span className="text-[10px] text-emerald-600">v2.0</span>
                  </span>
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-700 font-bold px-1.5 py-0.2 rounded uppercase">Verified</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
                  {user?.fullName ? `${user.fullName}'s Profile` : 'Live Health & Safety Scan'}
                </p>
              </div>
            </div>
          )}

          {showBackButton && (
            <div className="truncate">
              <h1 className="text-base font-extrabold text-slate-900 truncate">
                {getScreenTitle()}
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold tracking-wide flex items-center gap-1">
                <Sparkles size={10} className="text-emerald-600 animate-spin" />
                AI Health Engine Active
              </p>
            </div>
          )}
        </div>

        {/* Right Section: Clean Icon Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setScreen('PRIVACY')}
            className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 hover:bg-amber-100 transition"
            title="Safety Rules"
          >
            <ShieldAlert size={18} />
          </button>

          <button
            onClick={() => setScreen('SETTINGS')}
            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition"
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>

          <button
            onClick={() => setScreen('PROFILE')}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 p-[1.5px] shadow-sm hover:scale-105 transition-transform"
            title="User Profile"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-emerald-700 font-extrabold text-xs">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon size={16} />}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
