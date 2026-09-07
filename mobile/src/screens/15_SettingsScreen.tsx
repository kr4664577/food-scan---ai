import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { updateApiBaseUrl, getApiBaseUrl, apiClient } from '../api/client';
import { Settings, ShieldCheck, Server, Check, Wifi, AlertTriangle, Sparkles, Key } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { setScreen } = useAppStore();
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleSaveSettings = () => {
    updateApiBaseUrl(apiUrl);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection to ' + apiUrl + '...');
    try {
      updateApiBaseUrl(apiUrl);
      const res = await apiClient.post('/chat', { message: 'Ping' }, { timeout: 4000 });
      if (res.data?.success) {
        setTestStatus('success');
        setTestMessage('Connected successfully to FoodScan AI Server!');
      } else {
        setTestStatus('success');
        setTestMessage('Server reached and responding.');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestMessage('Cannot reach ' + apiUrl + '. Ensure phone & Mac are on same Wi-Fi.');
    }
  };

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="text-emerald-600" size={24} />
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">App Settings & AI Engine</h2>
          <p className="text-xs text-slate-500">Manage backend connection & AI Vision precision</p>
        </div>
      </div>

      {/* Why Identification Needs Connection Alert */}
      <div className="food-card p-4.5 rounded-3xl border border-amber-200 bg-amber-50 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs">
          <Sparkles size={18} className="text-amber-600" /> How Food Identification Works
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          The app uses a <strong>Master Food Database of 50+ items</strong> + <strong>Gemini 1.5 Multi-Modal Vision</strong>.
          <br /><br />
          • For <strong>exact detection</strong>, ensure the phone is connected to your backend server over Wi-Fi (URL below).
          <br />
          • You can also add a free <strong>Gemini API Key</strong> in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">backend/.env</code> for live photo computer vision on ANY food!
        </p>
      </div>

      {/* Backend API Configuration */}
      <div className="food-card p-4.5 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-emerald-600" />
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Backend Server URL</h3>
          </div>
          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            Wi-Fi Localhost
          </span>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 block mb-1">Server Endpoint URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://192.168.31.218:5001/api"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition flex items-center justify-center gap-1.5 border border-slate-200"
          >
            <Wifi size={14} className={testStatus === 'testing' ? 'animate-pulse text-emerald-600' : ''} />
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSaveSettings}
            className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isSaved ? <Check size={14} /> : null}
            {isSaved ? 'Saved!' : 'Save URL'}
          </button>
        </div>

        {testStatus === 'success' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] font-bold text-emerald-800 flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            {testMessage}
          </div>
        )}

        {testStatus === 'failed' && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] font-bold text-rose-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            {testMessage}
          </div>
        )}
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
