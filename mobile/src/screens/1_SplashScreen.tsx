import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Scan, ShieldCheck, Zap, Sparkles, ArrowRight } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const { setScreen } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/40 text-center relative overflow-hidden">
      {/* Background Decorative Orbs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 -right-24 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />

      <div className="flex-1 flex flex-col items-center justify-center my-auto z-10">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-1 shadow-2xl shadow-emerald-500/30 animate-pulse">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Scan className="w-12 h-12 text-emerald-400" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-1.5 rounded-xl shadow-md">
            <Sparkles size={16} />
          </div>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent mb-3">
          FoodScan AI
        </h1>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
          Real-World Multi-Modal Food Analysis, Barcode OCR, Portion Estimation & Visual Quality Inspection.
        </p>

        <div className="flex items-center gap-4 text-xs text-slate-400 border border-slate-800 rounded-2xl px-4 py-2 bg-slate-900/60 backdrop-blur-md mb-4">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck size={14} /> Medical Safety Guardrails
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="flex items-center gap-1.5 text-teal-400">
            <Zap size={14} /> Gemini 1.5/2.0
          </span>
        </div>
      </div>

      <div className="w-full space-y-3 z-10">
        <button
          onClick={() => setScreen('ONBOARDING')}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          Get Started <ArrowRight size={18} />
        </button>

        <button
          onClick={() => setScreen('AUTH')}
          className="w-full py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition"
        >
          I Already Have an Account
        </button>
      </div>
    </div>
  );
};
