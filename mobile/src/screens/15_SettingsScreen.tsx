import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { updateApiBaseUrl } from '../api/client';
import { Settings, ShieldCheck, Server, Check } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { setScreen } = useAppStore();
  const [apiUrl, setApiUrl] = useState('http://localhost:5001/api');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveSettings = () => {
    updateApiBaseUrl(apiUrl);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="text-emerald-600" size={24} />
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">App Settings & Security</h2>
          <p className="text-xs text-slate-500">Manage backend endpoints & security controls</p>
        </div>
      </div>

      {/* Security Architecture Protection Notice */}
      <div className="food-card p-4.5 rounded-3xl border border-emerald-200 bg-emerald-50 space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
          <ShieldCheck size={18} /> API Key Protection Architecture
        </div>
        <p className="text-xs text-emerald-900 leading-relaxed">
          Zero API keys are stored or exposed on the mobile client. All requests are proxied securely through the Express backend using JWT authentication.
        </p>
      </div>

      {/* Backend API Configuration */}
      <div className="food-card p-4.5 rounded-3xl space-y-3">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-emerald-600" />
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Backend API Endpoint</h3>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 block mb-1">Server Target URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <button
          onClick={handleSaveSettings}
          className="w-full py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 hover:bg-emerald-600 hover:text-white transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          {isSaved ? <Check size={16} /> : null}
          {isSaved ? 'API Config Updated!' : 'Save API Configuration'}
        </button>
      </div>

      {/* External Data Sources Info */}
      <div className="food-card p-4.5 rounded-3xl space-y-2">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Configured Data Integrations</h3>

        <div className="space-y-2 text-xs font-semibold">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-700">Google Gemini Vision API</span>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">Active</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-700">Open Food Facts Database</span>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">Active</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-700">USDA FoodData Central</span>
            <span className="text-[10px] font-extrabold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200">Fallback</span>
          </div>
        </div>
      </div>
    </div>
  );
};
