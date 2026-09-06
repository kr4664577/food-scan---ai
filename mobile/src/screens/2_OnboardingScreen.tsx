import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { QrCode, Utensils, Eye, ArrowRight, Check } from 'lucide-react';

export const OnboardingScreen: React.FC = () => {
  const { setScreen } = useAppStore();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: QrCode,
      title: 'Packaged Food & OCR',
      subtitle: 'Scan barcodes or snap packaging photos to instantly analyze nutrition facts, ingredients, high sugar/salt flags, and unknown additives.',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: Utensils,
      title: 'Cooked Meals & Portions',
      subtitle: 'Photograph restaurant or homemade dishes. Get instant estimates for calories, protein, carbs, fats, and constituent ingredient lists.',
      color: 'from-teal-500 to-cyan-500'
    },
    {
      icon: Eye,
      title: 'Visual Quality Check',
      subtitle: 'Inspect visible freshness indicators like discoloration, packaging tears, or visible mold with strict safety disclaimer guardrails.',
      color: 'from-cyan-500 to-emerald-500'
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setScreen('DASHBOARD');
    }
  };

  const Icon = slides[currentSlide].icon;

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-slate-950 text-center relative">
      <div className="flex justify-between items-center pt-2">
        <span className="text-xs font-semibold text-emerald-400">Step {currentSlide + 1} of {slides.length}</span>
        <button
          onClick={() => setScreen('DASHBOARD')}
          className="text-xs text-slate-400 hover:text-white"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-auto">
        <div className={`w-28 h-28 rounded-3xl bg-gradient-to-tr ${slides[currentSlide].color} p-1 shadow-2xl mb-8 flex items-center justify-center`}>
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Icon size={44} className="text-emerald-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          {slides[currentSlide].title}
        </h2>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
          {slides[currentSlide].subtitle}
        </p>
      </div>

      <div className="w-full space-y-6">
        <div className="flex justify-center gap-2">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-800'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-base shadow-lg hover:bg-emerald-400 transition flex items-center justify-center gap-2"
        >
          {currentSlide === slides.length - 1 ? 'Start Scanning' : 'Continue'} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
