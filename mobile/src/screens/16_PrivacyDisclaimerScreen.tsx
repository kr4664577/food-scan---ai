import React from 'react';
import { ShieldAlert, ShieldCheck, Info, FileText, CheckCircle2 } from 'lucide-react';
import { SAFETY_DISCLAIMERS } from '../types';

export const PrivacyDisclaimerScreen: React.FC = () => {
  return (
    <div className="pb-24 pt-4 px-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="text-amber-400" size={24} />
        <h2 className="text-xl font-bold text-white">Safety Rules & Disclaimers</h2>
      </div>

      {/* 1. VISUAL FOOD QUALITY MANDATORY SAFETY RULE */}
      <div className="p-4 rounded-3xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-200 space-y-2 shadow-xl shadow-amber-500/10">
        <h3 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert size={18} /> Visual Inspection Limitation Rule
        </h3>
        <p className="text-xs leading-relaxed text-amber-100">
          FoodScan AI visual inspections evaluate <strong>only visible surface issues</strong> (e.g. mold growth, discoloration, foreign objects, packaging tears).
        </p>
        <p className="text-xs leading-relaxed font-semibold text-amber-300 border-t border-amber-500/30 pt-2">
          The application NEVER claims that food is definitely safe, hygienic, or free from invisible bacteria (Salmonella, E. coli), toxins, viruses, or chemical contamination based on images.
        </p>
      </div>

      {/* 2. ALLERGEN DISCLAIMER */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Info size={16} className="text-rose-400" /> Allergen Cross-Contamination Notice
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Allergen warnings are extracted from visible ingredient lists and packaging labels. AI cannot detect unlisted facility cross-contamination. Sufferers of severe anaphylactic allergies should verify official manufacturer declarations.
        </p>
      </div>

      {/* 3. NUTRITION & CALORIC ESTIMATIONS */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 size={16} className="text-emerald-400" /> Nutritional Estimation Terms
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Portion sizes, calories, and macronutrient values for cooked or restaurant meals are computer vision approximations. Values are provided for nutritional awareness and general guidance.
        </p>
      </div>

      {/* 4. PRIVACY & DATA CONSENT */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-teal-400" /> Privacy & Data Consent
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your food photos are processed securely via encrypted TLS connections. We do not sell your personal allergy parameters or nutritional history to third parties.
        </p>
      </div>
    </div>
  );
};
