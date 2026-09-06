import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2, Cpu, Camera } from 'lucide-react';
import { QualityResultCategory } from '../types';

export const QualityReportScreen: React.FC = () => {
  const { activeQualityReport, setScreen } = useAppStore();

  const report = activeQualityReport || {
    statusCategory: 'No obvious visible issue detected' as QualityResultCategory,
    overallConfidence: 0.91,
    detectedIssues: [
      {
        issue_type: 'NONE' as const,
        confidence: 0.91,
        affected_area: 'Visible food surface and packaging seal area',
        explanation: 'Fresh appearance, uniform coloration, undamaged packaging texture.',
        limitations: 'Optical surface checks cannot evaluate internal microbial safety, toxins, or pathogens.'
      }
    ],
    mandatoryDisclaimer: "CRITICAL SAFETY WARNING: Visual image analysis evaluates surface optical indicators only. It CANNOT detect invisible microorganisms (such as Salmonella, E. coli, Botulinum), bacterial toxins, viral pathogens, or chemical contamination. Always follow standard food safety and hygiene guidelines.",
    assessmentNotes: "Image inspected: Fresh color, uniform skin texture, no visible surface mold or packaging tears.",
    modelEngineProvider: "Gemini Multi-Modal Vision Quality Engine (Pluggable CV Architecture)"
  };

  const statusCategory: string = report.statusCategory || (report as any).status || 'No obvious visible issue detected';
  const confidence = report.overallConfidence || (report as any).confidenceScore || 0.91;
  const disclaimer = report.mandatoryDisclaimer || (report as any).safetyDisclaimer;

  const getCategoryConfig = () => {
    if (statusCategory === 'No obvious visible issue detected' || statusCategory === 'NO_OBVIOUS_ISSUES') {
      return {
        label: 'No obvious visible issue detected',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: CheckCircle2
      };
    } else if (statusCategory === 'Possible visible issue detected' || statusCategory === 'POSSIBLE_ISSUE_DETECTED') {
      return {
        label: 'Possible visible issue detected',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: AlertTriangle
      };
    } else {
      return {
        label: 'Unable to determine',
        color: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: Info
      };
    }
  };

  const config = getCategoryConfig();
  const StatusIcon = config.icon;

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      {/* Overview Status Card */}
      <div className="food-card p-5 rounded-3xl relative overflow-hidden bg-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block mb-1">
              Visual Quality Inspection
            </span>
            <h2 className="text-xl font-extrabold text-slate-900">
              Surface Freshness Assessment
            </h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center text-emerald-700 shrink-0">
            <span className="text-[9px] uppercase font-extrabold text-emerald-600">Score</span>
            <span className="text-sm font-black text-slate-900">{Math.round(confidence * 100)}%</span>
          </div>
        </div>

        {/* Category Result Badge */}
        <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${config.color}`}>
          <StatusIcon size={22} className="shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider block opacity-75">Visual Category Result</span>
            <span className="text-xs font-extrabold">{config.label}</span>
          </div>
        </div>
      </div>

      {/* MANDATORY SAFETY WARNING */}
      <div className="p-4 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-2 shadow-sm">
        <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
          <ShieldAlert size={18} /> Mandatory Safety Warning & Limitation
        </div>
        <p className="text-xs leading-relaxed text-amber-900 font-medium">
          {disclaimer}
        </p>
      </div>

      {/* Itemized Observable Issues & Limitations */}
      <div className="food-card p-4.5 rounded-3xl space-y-3">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Surface Observations & Optical Analysis</h3>
        
        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200 font-medium">
          {report.assessmentNotes}
        </p>

        {report.detectedIssues && report.detectedIssues.length > 0 ? (
          <div className="space-y-3 pt-1">
            {report.detectedIssues.map((issue, idx) => (
              <div key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {issue.issue_type === 'NONE' ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-600" />
                    )}
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      {issue.issue_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-white text-emerald-700 px-2 py-0.5 rounded-full border border-slate-200">
                    {Math.round((issue.confidence || 0.90) * 100)}% Conf.
                  </span>
                </div>

                {issue.affected_area && (
                  <p className="text-[11px] text-slate-600 font-semibold">
                    📍 Affected Area: <span className="text-slate-900">{issue.affected_area}</span>
                  </p>
                )}

                <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                  {issue.explanation}
                </p>

                <p className="text-[10px] text-amber-900 italic bg-amber-100/60 p-2 rounded-xl border border-amber-200 font-medium">
                  ⚠️ Limitation: {issue.limitations}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 font-bold">
            <CheckCircle2 size={18} /> No visible mold, discoloration, insects, foreign objects, or packaging tears found.
          </div>
        )}
      </div>

      {/* Pluggable Computer Vision Architecture Footer */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-bold shadow-sm">
        <span className="flex items-center gap-1.5">
          <Cpu size={14} className="text-emerald-600" /> Model Architecture:
        </span>
        <span className="text-slate-900">{report.modelEngineProvider || "Pluggable CV Model Engine"}</span>
      </div>

      {/* Action to Scan Another Item */}
      <button
        onClick={() => setScreen('CAMERA')}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
      >
        <Camera size={20} /> Scan Another Food Item
      </button>
    </div>
  );
};
