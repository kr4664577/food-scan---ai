import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Scan, Sparkles, ShieldCheck, Cpu, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export const AIProcessingScreen: React.FC = () => {
  const { isLoading, errorMessage, setScreen } = useAppStore();
  const [stage, setStage] = useState(0);

  const stages = [
    'Processing image with Gemini Vision AI...',
    'Extracting ingredients & OCR text...',
    'Cross-referencing allergen profiles & safety rules...',
    'Generating health highlights & simple explanations...'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 800);
    return () => clearInterval(timer);
  }, []);

  if (errorMessage && !isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-center relative overflow-hidden">
        <div className="absolute w-80 h-80 bg-rose-500/10 rounded-full blur-3xl" />

        <div className="w-20 h-20 rounded-3xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-6 shadow-2xl shadow-rose-900/40">
          <AlertTriangle size={36} />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
        <p className="text-sm text-rose-300 font-medium mb-8 max-w-xs leading-relaxed">
          {errorMessage}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => setScreen('IMAGE_PREVIEW')}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
          >
            <RefreshCw size={18} /> Try Again
          </button>
          <button
            onClick={() => setScreen('CAMERA')}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl border border-slate-800 flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft size={16} /> Take New Photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-center relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full border-4 border-emerald-500/30 p-2 relative flex items-center justify-center animate-spin-slow">
          <div className="w-full h-full rounded-full border-4 border-t-emerald-400 border-r-teal-400 border-b-transparent border-l-transparent animate-spin" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/30">
            <Cpu size={36} className="animate-pulse" />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-2">Analyzing Food Profile</h2>
      <p className="text-xs text-emerald-400 font-semibold mb-6 flex items-center gap-1.5 justify-center">
        <Sparkles size={14} /> {stages[stage]}
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-xs bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5 mb-8">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${((stage + 1) / stages.length) * 100}%` }}
        />
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-slate-800 max-w-xs text-left text-xs space-y-2">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <ShieldCheck size={16} className="text-emerald-400" /> Medical Safety Engine Active
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Evaluating nutritional balance, flag thresholds for high sugar/sodium, and explaining unfamiliar additives.
        </p>
      </div>
    </div>
  );
};
