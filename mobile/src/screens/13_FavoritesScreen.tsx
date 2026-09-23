import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Heart, Trash2, ArrowRight } from 'lucide-react';

export const FavoritesScreen: React.FC = () => {
  const { history, historyStatus, token, user, fetchHistory, toggleFavorite, setScreen } = useAppStore();
  const authenticated = Boolean(token && user?.id && user.id !== 'guest');
  React.useEffect(() => { void fetchHistory(); }, [token, user?.id, fetchHistory]);
  const favoriteItems = authenticated ? history.filter(item => item.userId === user?.id && item.isFavorite) : [];
  const loading = historyStatus === 'idle' || historyStatus === 'loading';

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Saved Foods & Dishes</h2>
          <p className="text-xs text-slate-500">Your bookmarked healthy meals and products</p>
        </div>
        <span className="text-xs text-emerald-700 font-extrabold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          {authenticated && historyStatus !== 'ready' ? '—' : favoriteItems.length} Bookmarks
        </span>
      </div>

      {!authenticated ? (
        <div className="food-card p-8 rounded-3xl text-center space-y-3">
          <h3 className="text-base font-extrabold text-slate-900">Save your favorite foods</h3>
          <p className="text-xs text-slate-500">Sign in to view and save your own food scans.</p>
          <button className="text-sm font-bold text-emerald-700 underline" onClick={() => setScreen('AUTH')}>Sign in</button>
        </div>
      ) : loading ? (
        <p role="status" className="text-sm text-slate-600">Loading your saved foods…</p>
      ) : historyStatus === 'error' ? (
        <button className="text-sm text-rose-700 underline" onClick={() => void fetchHistory()}>Saved foods could not be loaded. Retry</button>
      ) : favoriteItems.length === 0 ? (
        <div className="food-card p-8 rounded-3xl text-center text-slate-500 space-y-3">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mx-auto shadow-sm">
            <Heart size={32} />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No Favorites Saved Yet</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Tap the heart icon on any food report to bookmark your daily meal staples for 1-click access.
          </p>
          <button
            onClick={() => setScreen('SCAN_SELECTION')}
            className="btn-primary-emerald py-3 px-5 rounded-2xl text-white font-extrabold text-xs inline-flex items-center gap-2"
          >
            Start Food Scan <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {favoriteItems.map((item) => (
            <div
              key={item.id}
              className="food-card p-4 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 text-sm font-bold shadow-sm">
                  <Heart size={20} className="fill-current" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">{item.productName}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {item.brandName || item.scanType} • {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {typeof item.calories === 'number' && Number.isFinite(item.calories) && (
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    {item.calories} kcal
                  </span>
                )}
                <button
                  onClick={() => toggleFavorite(item.id)}
                  className="p-2 rounded-full text-slate-400 hover:text-rose-600 transition"
                  title="Remove"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
