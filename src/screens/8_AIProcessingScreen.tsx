import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useAppStore } from '../store/useAppStore';
import { subscribeScan, scanPhase } from '../utils/scanPerformance';
import { Loader2, AlertTriangle } from 'lucide-react';

export const AIProcessingScreen: React.FC = () => {
  const { isLoading, errorMessage, scanMode, setScreen } = useAppStore();
  const phase = useSyncExternalStore(subscribeScan, scanPhase, scanPhase);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => setSeconds(Math.floor((performance.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  const label = phase === 'rendering' || phase === 'done' ? 'Preparing your report…'
    : phase === 'uploading' ? 'Uploading your photo…'
    : scanMode === 'PACKAGED_BARCODE' ? 'Looking up your product…'
    : phase === 'preparing' ? 'Preparing your photo…' : 'Analyzing food…';

  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-slate-50" aria-live="polite" aria-busy={isLoading}>
      {errorMessage && !isLoading ? <>
        <AlertTriangle className="text-rose-600 mb-4" size={36} />
        <h2 className="text-xl font-bold text-slate-900">We couldn’t finish this scan</h2>
        <p className="mt-3 text-sm text-slate-600">{errorMessage}</p>
        <button className="mt-6 bg-emerald-700 text-white px-5 py-3 rounded-xl" onClick={() => setScreen('IMAGE_PREVIEW')}>Try again</button>
      </> : <>
        <div className="p-7 rounded-full bg-emerald-100 mb-6"><Loader2 size={42} className="text-emerald-700 animate-spin" /></div>
        <h2 role="status" className="text-xl font-bold text-slate-900">{label}</h2>
        <p className="mt-3 text-sm text-slate-600 max-w-xs">
          {scanMode === 'MEAL_PHOTO'
            ? 'Identifying foods, estimating portions, and calculating nutrition in one analysis.'
            : 'Reading the available details carefully before preparing your result.'}
        </p>
        <p className="mt-4 text-sm text-slate-500" aria-live="off">{seconds}s elapsed</p>
        {seconds >= 12 && <p className="mt-5 text-sm text-slate-600 max-w-xs">The analysis is taking longer than usual. You don’t need to submit the photo again.</p>}
        <p className="mt-8 text-xs text-slate-500 max-w-xs">Photo-based nutrition is an estimate. Processing time depends on your connection and the AI service.</p>
      </>}
    </section>
  );
};
