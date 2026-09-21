import React, { useState } from 'react';
import type { ScanItem } from '../types';
import { validFoodScans, averageCalories } from '../utils/historyStats';

export function ScanAnalytics({ history, userId }: { history: ScanItem[]; userId?: string }) {
  const [days, setDays] = useState(7);
  const end = new Date();
  const start = new Date(end); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - days + 1);
  const scans = validFoodScans(history, userId).filter(scan => {
    const time = new Date(scan.createdAt).getTime();
    return Number.isFinite(time) && time >= start.getTime() && time <= end.getTime();
  });
  const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(start); date.setDate(date.getDate() + index);
    return { date, count: scans.filter(scan => dayKey(new Date(scan.createdAt)) === dayKey(date)).length };
  });
  const max = Math.max(1, ...buckets.map(bucket => bucket.count));
  return <section className="bg-white rounded-3xl border p-5 space-y-3">
    <div className="flex justify-between items-center gap-2">
      <h2 className="font-bold text-slate-900">Scan history analytics</h2>
      <div className="flex gap-1" aria-label="Analytics date range">
        {[[7, '7D'], [30, '30D'], [90, '3M']] .map(([value, label]) => <button key={value} aria-pressed={days === value} onClick={() => setDays(Number(value))} className={`text-xs px-2 py-1 rounded-lg ${days === value ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}
      </div>
    </div>
    <p className="text-xs text-slate-500">Saved food scans, not meals consumed. The 3M filter covers the last 90 days.</p>
    <div className="flex justify-between text-sm">
      <p><strong>{scans.length}</strong> valid scans</p>
      <p><strong>{averageCalories(scans, userId).toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong> avg kcal / scan</p>
    </div>
    {scans.length < 2 ? <p className="text-sm text-slate-500 py-5">Scan a few more meals to see your nutrition trend.</p> : <>
      <svg viewBox="0 0 360 130" className="w-full h-36" role="img" aria-label={`Valid saved food scan counts per day over ${days} days. Highest daily count ${max}.`}>
        <line x1="0" y1="110" x2="360" y2="110" stroke="#cbd5e1" />
        {buckets.map((bucket, index) => <rect key={index} x={index * 360 / days + 1} y={110 - bucket.count / max * 95} width={Math.max(1, 360 / days - 2)} height={bucket.count / max * 95} fill="#047857" rx="1"><title>{`${bucket.date.toLocaleDateString()}: ${bucket.count} scans`}</title></rect>)}
        <text x="0" y="128" fill="#64748b" fontSize="10">{start.toLocaleDateString()}</text>
        <text x="360" y="128" textAnchor="end" fill="#64748b" fontSize="10">{end.toLocaleDateString()}</text>
      </svg>
      <details className="text-xs text-slate-600"><summary className="cursor-pointer">View daily counts</summary><ul className="mt-2 max-h-40 overflow-y-auto">{buckets.map((bucket, index) => <li key={index}>{bucket.date.toLocaleDateString()}: {bucket.count}</li>)}</ul></details>
    </>}
  </section>;
}
