import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { updateApiBaseUrl, getApiBaseUrl, testBackendConnection, ConnectionTestResult } from '../api/client';
import { Settings, Server, Check, Wifi, AlertTriangle, Sparkles, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { setScreen } = useAppStore();
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const handleSaveSettings = () => {
    const normalized = updateApiBaseUrl(apiUrl);
    setApiUrl(normalized);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const normalizedUrl = updateApiBaseUrl(apiUrl);
    setApiUrl(normalizedUrl);
    setTestResult(null);

    const result = await testBackendConnection(normalizedUrl);
    setTestResult(result);
    setIsTesting(false);
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

      {/* How Identification Works Card */}
      <div className="food-card p-4.5 rounded-3xl border border-amber-200 bg-amber-50 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs">
          <Sparkles size={18} className="text-amber-600" /> How Food Identification Works
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          The app uses a <strong>Master Food Database</strong> + <strong>Google Gemini Multi-Modal Vision</strong>.
          <br /><br />
          • For <strong>exact detection</strong>, ensure the phone is connected to your backend server over Wi-Fi (URL below).
          <br />
          • <strong>Health check endpoint:</strong> <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">{apiUrl.replace(/\/+$/, '')}/health</code>
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
            Cloud & Wi-Fi
          </span>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 block mb-1">Server Endpoint URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://vetbx-2409-40c2-1235-2032-b5be-1223-3766-faf2.run.pinggy-free.link/api"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition flex items-center justify-center gap-1.5 border border-slate-200"
          >
            <Wifi size={14} className={isTesting ? 'animate-pulse text-emerald-600' : ''} />
            {isTesting ? 'Testing Health...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSaveSettings}
            className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isSaved ? <Check size={14} /> : null}
            {isSaved ? 'Saved!' : 'Save URL'}
          </button>
        </div>

        {/* Live Diagnostics Card */}
        {isTesting && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1 text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Activity size={14} className="animate-spin text-emerald-600" />
              <span>Sending GET request to {apiUrl.replace(/\/+$/, '')}/health ...</span>
            </div>
          </div>
        )}

        {testResult && !isTesting && (
          <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
            testResult.success 
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' 
              : 'bg-rose-50/90 border-rose-300 text-rose-950'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-extrabold text-[12px]">
                {testResult.success ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <XCircle size={16} className="text-rose-600 shrink-0" />
                )}
                <span>{testResult.success ? 'Backend Connection Succeeded' : `Connection Failed (${testResult.type})`}</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/70 border border-black/10">
                {testResult.elapsedMs}ms
              </span>
            </div>

            <div className="text-[11px] font-medium leading-relaxed">
              {testResult.message}
            </div>

            {/* Technical Request & Response Details */}
            <div className="pt-2 border-t border-black/10 text-[10px] font-mono space-y-1">
              <div>
                <span className="font-bold">Request:</span> {testResult.method} {testResult.url}
              </div>
              <div>
                <span className="font-bold">Status:</span> {testResult.status !== null ? `HTTP ${testResult.status} ${testResult.statusText || ''}` : 'No HTTP response received'}
              </div>
              {testResult.data && (
                <div>
                  <span className="font-bold">Response Body:</span>
                  <pre className="mt-0.5 p-1.5 rounded bg-black/5 text-[10px] overflow-x-auto whitespace-pre-wrap break-all">
                    {typeof testResult.data === 'object' ? JSON.stringify(testResult.data, null, 2) : String(testResult.data)}
                  </pre>
                </div>
              )}
              {testResult.rawError && (
                <div>
                  <span className="font-bold text-rose-700">Exception:</span>
                  <div className="mt-0.5 p-1.5 rounded bg-rose-100/70 text-rose-900 font-mono text-[10px] break-all">
                    {testResult.exceptionType}: {testResult.rawError}
                  </div>
                </div>
              )}
            </div>
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
