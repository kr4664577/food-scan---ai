import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Scan, Mail, Lock, User, Sparkles, ArrowRight } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { setScreen, setUser } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('alex.foodie@foodscan.ai');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Alex Morgan');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser(
      {
        id: 'user-demo-1',
        email,
        fullName: isLogin ? 'Alex Morgan' : fullName,
        dietaryGoals: 'Low Sodium, High Protein',
        allergies: ['Peanuts', 'Gluten']
      },
      'demo_jwt_token_foodscan_2026'
    );
    setScreen('DASHBOARD');
  };

  const handleDemoFill = () => {
    setEmail('alex.foodie@foodscan.ai');
    setPassword('password123');
    setFullName('Alex Morgan');
    setUser(
      {
        id: 'user-demo-1',
        email: 'alex.foodie@foodscan.ai',
        fullName: 'Alex Morgan',
        dietaryGoals: 'Low Sodium, High Protein',
        allergies: ['Peanuts', 'Gluten']
      },
      'demo_jwt_token_foodscan_2026'
    );
    setScreen('DASHBOARD');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-slate-950">
      <div className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            <Scan size={22} />
          </div>
          <span className="text-xl font-bold text-white">FoodScan AI</span>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-2xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              isLogin ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              !isLogin ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isLogin ? 'Welcome Back!' : 'Create Your Account'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {isLogin ? 'Sign in to access your scan history and allergy profile.' : 'Set up your allergen parameters and personalized nutrition goals.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="Alex Morgan"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm shadow-lg hover:bg-emerald-400 transition flex items-center justify-center gap-2 mt-2"
          >
            {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} />
          </button>
        </form>
      </div>

      <div className="pt-6 border-t border-slate-900">
        <button
          type="button"
          onClick={handleDemoFill}
          className="w-full py-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/10 transition flex items-center justify-center gap-2"
        >
          <Sparkles size={14} /> Quick Demo One-Click Sign In
        </button>
      </div>
    </div>
  );
};
