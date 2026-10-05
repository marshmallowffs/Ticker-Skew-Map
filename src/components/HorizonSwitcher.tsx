import React from 'react';
import { Horizon, UniverseCategory } from '../types/radar';
import { Layers, ShieldCheck, Zap, Sparkles, Filter, Bookmark } from 'lucide-react';

interface HorizonSwitcherProps {
  currentHorizon: Horizon;
  onSelectHorizon: (h: Horizon) => void;
  universeCategory: UniverseCategory;
  onSelectUniverseCategory: (cat: UniverseCategory) => void;
  hideThin: boolean;
  onToggleHideThin: () => void;
  selectedQuadrantFilter: string;
  onSelectQuadrantFilter: (q: string) => void;
  thinCount: number;
  totalCount: number;
  institutionalCount: number;
  sp500Count: number;
  smallMidCount: number;
  etfCount: number;
  watchlistCount: number;
}

export const HorizonSwitcher: React.FC<HorizonSwitcherProps> = ({
  currentHorizon,
  onSelectHorizon,
  universeCategory,
  onSelectUniverseCategory,
  hideThin,
  onToggleHideThin,
  selectedQuadrantFilter,
  onSelectQuadrantFilter,
  thinCount,
  totalCount,
  institutionalCount,
  sp500Count,
  smallMidCount,
  etfCount,
  watchlistCount,
}) => {
  return (
    <div className="flex flex-col gap-3 py-3 border-b border-slate-200">
      {/* Top Row: Universe Scope & Return Horizon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Universe Scope Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Universe Scope:
          </span>
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            {/* 1. Institutional Core (Clean 250-300 Liquid Names: ADV >= $50M, MCap >= $2B, OI >= 100) */}
            <button
              type="button"
              onClick={() => onSelectUniverseCategory('INSTITUTIONAL')}
              className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 ${
                universeCategory === 'INSTITUTIONAL'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
              title="Institutional Core: ADV >= $50M, MCap >= $2B, Min Option OI >= 100 & Vol >= 20"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>Institutional Core ({institutionalCount})</span>
            </button>

            {/* 2. S&P 500 */}
            <button
              type="button"
              onClick={() => onSelectUniverseCategory('SP500')}
              className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 ${
                universeCategory === 'SP500'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>S&P 500 ({sp500Count})</span>
            </button>

            {/* 3. Small & Mid Growth */}
            <button
              type="button"
              onClick={() => onSelectUniverseCategory('SMALL_MID')}
              className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 ${
                universeCategory === 'SMALL_MID'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Growth Small/Mid ({smallMidCount})</span>
            </button>

            {/* 4. ETFs */}
            <button
              type="button"
              onClick={() => onSelectUniverseCategory('ETF')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                universeCategory === 'ETF'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <span>ETFs ({etfCount})</span>
            </button>

            {/* 5. All Full Sweep */}
            <button
              type="button"
              onClick={() => onSelectUniverseCategory('ALL')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                universeCategory === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <span>All Full Sweep ({totalCount})</span>
            </button>

            {/* 6. Active Watchlist Scope */}
            <button
              type="button"
              onClick={() => onSelectUniverseCategory('WATCHLIST')}
              className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 ${
                universeCategory === 'WATCHLIST'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-amber-800 hover:text-amber-900 bg-amber-50/80 font-semibold'
              }`}
              title="Show only your starred watchlist stocks on the skew chart"
            >
              <Bookmark className={`w-3.5 h-3.5 ${universeCategory === 'WATCHLIST' ? 'fill-white text-white' : 'fill-amber-500 text-amber-500'}`} />
              <span>Watchlist ({watchlistCount})</span>
            </button>
          </div>
        </div>

        {/* Return Horizon Switcher Segmented Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Lookback Horizon:
          </span>
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => onSelectHorizon('1d')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                currentHorizon === '1d'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              1 Day (1D)
            </button>
            <button
              type="button"
              onClick={() => onSelectHorizon('1w')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                currentHorizon === '1w'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              1 Week (5D)
            </button>
            <button
              type="button"
              onClick={() => onSelectHorizon('1m')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                currentHorizon === '1m'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              1 Month (21D)
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Quadrant Quick Filter & Liquidity Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Quadrant Filter:</span>
          <select
            value={selectedQuadrantFilter}
            onChange={(e) => onSelectQuadrantFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Quadrants (Entire Current Scope)</option>
            <option value="CONTRARIAN BID">Contrarian Bid (Stock Down, Calls Bid ★)</option>
            <option value="FEAR">Fear (Stock Down, Puts Bid)</option>
            <option value="HEDGED RALLY">Hedged Rally (Stock Up, Puts Bid)</option>
            <option value="CHASE">Chase (Stock Up, Calls Bid)</option>
            <option value="WATCHLIST">Watchlist Names Only</option>
          </select>
        </div>

        {/* Institutional Liquidity / Thin Filter Toggle */}
        <button
          type="button"
          onClick={onToggleHideThin}
          className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
            hideThin
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
          title={hideThin ? "Click to include illiquid contracts (OI < 100 or Volume < 20)" : "Click to hide illiquid contracts"}
        >
          <Filter className="w-3 h-3 text-slate-400" />
          <span>{hideThin ? 'Hide Thin Chains Active (OI ≥ 100, Vol ≥ 20)' : `Filter Thin Chains (${thinCount})`}</span>
        </button>
      </div>
    </div>
  );
};
