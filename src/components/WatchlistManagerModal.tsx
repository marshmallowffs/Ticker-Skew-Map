import React, { useState } from 'react';
import { X, Plus, Trash2, Bookmark } from 'lucide-react';

interface WatchlistManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: Set<string>;
  onAddTicker: (ticker: string) => void;
  onRemoveTicker: (ticker: string) => void;
  onClearWatchlist: () => void;
  availableTickers: string[];
}

const QUICK_SUGGESTIONS = [
  { ticker: 'IONQ', label: 'Quantum Computing' },
  { ticker: 'LUNR', label: 'Space Systems' },
  { ticker: 'RDW', label: 'Space Infrastructure' },
  { ticker: 'ACHR', label: 'eVTOL Aviation' },
  { ticker: 'ONDS', label: 'Autonomous Drones' },
  { ticker: 'RGTI', label: 'Quantum Computing' },
  { ticker: 'PLTR', label: 'Enterprise AI & Defense' },
  { ticker: 'SMCI', label: 'AI Server Infrastructure' },
  { ticker: 'NVDA', label: 'Semiconductors' },
  { ticker: 'TSLA', label: 'Electric Vehicles' },
  { ticker: 'MSTR', label: 'Bitcoin Treasury' },
  { ticker: 'COIN', label: 'Crypto Exchange' },
];

export const WatchlistManagerModal: React.FC<WatchlistManagerModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  onAddTicker,
  onRemoveTicker,
  onClearWatchlist,
}) => {
  const [newTickerInput, setNewTickerInput] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTickerInput.trim()) return;

    const tokens = newTickerInput
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length > 0);

    tokens.forEach((t) => onAddTicker(t));
    setNewTickerInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-500 fill-amber-400" />
            <h3 className="text-base font-bold text-slate-900">Manage Custom Watchlist</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Explainer */}
          <p className="text-xs text-slate-500 leading-relaxed">
            Watchlist names are highlighted as <strong>larger amber circles (#F59E0B)</strong> with permanent labels on the radar chart. Only stocks you explicitly add are kept, saved locally across sessions.
          </p>

          {/* Add Form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter ticker (e.g. IONQ, NVDA, AAPL)..."
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white font-mono uppercase"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Ticker</span>
            </button>
          </form>

          {/* Current Watchlist Tickers List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                My Active Watchlist ({watchlist.size} {watchlist.size === 1 ? 'ticker' : 'tickers'})
              </span>
              {watchlist.size > 0 && (
                <button
                  type="button"
                  onClick={onClearWatchlist}
                  className="text-[11px] text-rose-600 hover:text-rose-800 inline-flex items-center gap-1 font-medium transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[90px] flex flex-wrap gap-2 items-center">
              {watchlist.size === 0 ? (
                <div className="w-full flex flex-col items-center justify-center py-5 text-center text-slate-400">
                  <Bookmark className="w-5 h-5 text-slate-300 mb-1" />
                  <p className="text-xs font-medium text-slate-600">No tickers in your watchlist</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                    Click the star icon next to any stock in the table or enter a ticker symbol above to pin it to your custom radar.
                  </p>
                </div>
              ) : (
                Array.from(watchlist).map((ticker) => (
                  <span
                    key={ticker}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono font-bold rounded-md shadow-xs"
                  >
                    <span>{ticker}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveTicker(ticker)}
                      title={`Remove ${ticker}`}
                      className="text-amber-500 hover:text-amber-800 transition-colors p-0.5 rounded hover:bg-amber-200/50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Quick Suggestions */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Quick Suggestions (Optional)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((item) => {
                const isAdded = watchlist.has(item.ticker);
                return (
                  <button
                    key={item.ticker}
                    type="button"
                    onClick={() => (isAdded ? onRemoveTicker(item.ticker) : onAddTicker(item.ticker))}
                    className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-all inline-flex items-center gap-1.5 ${
                      isAdded
                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.ticker}</span>
                    <span className="text-[10px] text-slate-400 font-sans">({item.label})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
