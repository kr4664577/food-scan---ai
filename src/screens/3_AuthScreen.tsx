import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { apiClient, apiErrorMessage } from '../api/client';
import { Mail, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { setScreen, setUser } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const res = await apiClient.post('/auth/login', {
          email: email.trim(),
          password
        });
        if (res.data?.success && res.data?.data) {
          const { user, token } = res.data.data;
          setUser(user, token);
          localStorage.setItem('foodscan_auth_token', token);
          localStorage.setItem('foodscan_user', JSON.stringify(user));
          setScreen('DASHBOARD');
        } else {
          setErrorMsg(res.data?.error?.message || 'Invalid email or password.');
        }
      } else {
        const res = await apiClient.post('/auth/register', {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          dietaryGoals: 'Balanced, Low Ultra-Processed',
          allergies: []
        });
        if (res.data?.success && res.data?.data) {
          const { user, token } = res.data.data;
          setUser(user, token);
          localStorage.setItem('foodscan_auth_token', token);
          localStorage.setItem('foodscan_user', JSON.stringify(user));
          setScreen('DASHBOARD');
        } else {
          setErrorMsg(res.data?.error?.message || 'Registration failed. Try again.');
        }
      }
    } catch (err: any) {
      // Axios errors contain the request body and headers; never log auth payloads.
      console.warn('[Auth Error]', { httpStatus: err.response?.status });
      const serverMsg = apiErrorMessage(err.response?.data?.error, '');
      if (serverMsg) {
        setErrorMsg(serverMsg);
      } else if (err.message?.includes('Network Error') || !err.response) {
        setErrorMsg('Network error connecting to backend API. Please check your connection.');
      } else {
        setErrorMsg('Authentication error. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueAsGuest = () => {
    setUser(
      {
        id: 'guest',
        email: 'guest@foodscan.ai',
        fullName: 'Guest User',
        dietaryGoals: '',
        allergies: []
      },
      null // explicit null token for guest
    );
    localStorage.removeItem('foodscan_auth_token');
    setScreen('DASHBOARD');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-slate-950">
      <div className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          <img
            src="/foodscan_logo.png"
            alt="FoodScan AI"
            className="w-10 h-10 rounded-2xl object-cover shadow-md border border-emerald-500/40"
          />
          <span className="text-xl font-bold text-white">FoodScan AI</span>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-2xl mb-6 border border-slate-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setIsLogin(true);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              isLogin ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setIsLogin(false);
              setErrorMsg(null);
            }}
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

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-2 text-red-300 text-xs animate-shake">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

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
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm shadow-lg hover:bg-emerald-400 disabled:opacity-60 transition flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Processing...
              </>
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="pt-6 border-t border-slate-900 space-y-2.5">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleContinueAsGuest}
          className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:text-white transition text-center flex items-center justify-center gap-2"
        >
          Skip & Continue as Guest
        </button>
      </div>
    </div>
  );
};
