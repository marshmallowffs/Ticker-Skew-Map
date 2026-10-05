import React from 'react';
import { RadarRecord, Horizon } from '../types/radar';
import { calculateBSGreeks } from '../utils/blackScholes';
import { X, Star, TrendingUp, TrendingDown, ShieldAlert, Zap, Compass } from 'lucide-react';

interface StockDetailModalProps {
  stock: RadarRecord | null;
  onClose: () => void;
  horizon: Horizon;
  isWatchlist: boolean;
  onToggleWatchlist: (ticker: string) => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  stock,
  onClose,
  horizon,
  isWatchlist,
  onToggleWatchlist,
}) => {
  if (!stock) return null;

  const currentReturn = horizon === '1d' ? stock.ret_1d : horizon === '1w' ? stock.ret_1w : stock.ret_1m;
  const horizonLabel = horizon === '1d' ? '1-Day' : horizon === '1w' ? '1-Week (5D)' : '1-Month (21D)';

  // Calculate approximate analytical Greeks for Call and Put 25-Delta strikes
  const T = stock.dte / 365.0;
  const r = 0.045; // 4.5% risk free rate
  const callGreeks = calculateBSGreeks(stock.price, stock.call_25_strike, T, r, stock.call_25_iv / 100.0, 'call');
  const putGreeks = calculateBSGreeks(stock.price, stock.put_25_strike, T, r, stock.put_25_iv / 100.0, 'put');

  const isContrarian = currentReturn < 0 && stock.skew < 0;
  const isFear = currentReturn < 0 && stock.skew > 0;
  const isHedged = currentReturn >= 0 && stock.skew > 0;
  const isChase = currentReturn >= 0 && stock.skew <= 0;

  const activeQuadrant = isContrarian
    ? 'CONTRARIAN BID'
    : isFear
    ? 'FEAR'
    : isHedged
    ? 'HEDGED RALLY'
    : 'CHASE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleWatchlist(stock.ticker)}
              className="text-slate-300 hover:text-amber-500 transition-colors"
              title={isWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Star className={`w-5 h-5 ${isWatchlist ? 'text-amber-500 fill-amber-400' : ''}`} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-mono text-slate-900">{stock.ticker}</h3>
                <span className="text-sm text-slate-600 font-medium">{stock.name}</span>
                <span className="text-xs text-slate-400">· {stock.sector}</span>
              </div>
              <p className="text-xs text-slate-500 font-mono-nums">
                Current Price: <span className="font-bold text-slate-900">${stock.price.toFixed(2)}</span> · Target Exp: {stock.expiration} ({stock.dte} DTE)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Quadrant Badge & Strategic Summary */}
          <div
            className={`p-4 rounded-lg border ${
              isContrarian
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : isFear
                ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                : isHedged
                ? 'bg-blue-50/80 border-blue-300 text-blue-950'
                : 'bg-violet-50/80 border-violet-300 text-violet-950'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">
                Current Regime: {activeQuadrant}
              </span>
              <span className="text-xs font-mono font-semibold tabular-nums">
                Skew: {stock.skew >= 0 ? '+' : ''}
                {stock.skew.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs leading-relaxed">
              {isContrarian &&
                'High-conviction contrarian setup: The stock price has fallen, but institutional flow is aggressively paying a premium for 25Δ upside calls over 25Δ puts. Market price and options flow are in stark disagreement.'}
              {isFear &&
                'Defensive posture: The stock is down and downside puts are commanding high premiums. Do not catch falling knives until put skew flattens.'}
              {isHedged &&
                'Distrusted rally: The stock has advanced over the period, but institutional participants are actively buying downside put protection. Consider tightening trailing stop losses.'}
              {isChase &&
                'Momentum chase: Stock price is advancing and calls are bid. Strong trend confirmation, but beware of crowded positioning.'}
            </p>
          </div>

          {/* Metric Comparison Cards */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-500 font-medium block mb-1">{horizonLabel} Return</span>
              <span
                className={`text-lg font-mono font-bold tabular-nums ${
                  currentReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {currentReturn >= 0 ? '+' : ''}
                {currentReturn.toFixed(2)}%
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-500 font-medium block mb-1">Normalized Skew %</span>
              <span
                className={`text-lg font-mono font-bold tabular-nums ${
                  stock.skew < 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {stock.skew >= 0 ? '+' : ''}
                {stock.skew.toFixed(2)}%
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] text-slate-500 font-medium block mb-1">ATM Implied Vol (IV)</span>
              <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                {stock.atm_iv.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Options Skew Smile Curve Inspector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Options Volatility Surface (25Δ Put — ATM — 25Δ Call)
              </h4>
              <span className="text-[11px] text-slate-500 font-mono-nums">
                Formula: (IV₂₅ Put - IV₂₅ Call) / IV_ATM
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              {/* Visual Skew Balance Bar */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono-nums">
                <div className="p-2.5 bg-white border border-slate-200 rounded">
                  <div className="text-[10px] text-slate-400 font-semibold mb-0.5">25Δ OTM Put</div>
                  <div className="text-sm font-bold text-slate-800">${stock.put_25_strike}</div>
                  <div className="text-xs text-slate-600 font-medium">{stock.put_25_iv.toFixed(1)}% IV</div>
                  <div className="text-[10px] text-slate-400 mt-1">Delta ≈ {putGreeks.delta.toFixed(2)}</div>
                </div>

                <div className="p-2.5 bg-white border border-slate-300 rounded shadow-xs">
                  <div className="text-[10px] text-slate-400 font-semibold mb-0.5">At-The-Money (ATM)</div>
                  <div className="text-sm font-bold text-slate-900">${stock.atm_strike}</div>
                  <div className="text-xs text-amber-700 font-bold">{stock.atm_iv.toFixed(1)}% IV</div>
                  <div className="text-[10px] text-slate-400 mt-1">Delta ≈ 0.50</div>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded">
                  <div className="text-[10px] text-slate-400 font-semibold mb-0.5">25Δ OTM Call</div>
                  <div className="text-sm font-bold text-slate-800">${stock.call_25_strike}</div>
                  <div className="text-xs text-emerald-700 font-bold">{stock.call_25_iv.toFixed(1)}% IV</div>
                  <div className="text-[10px] text-slate-400 mt-1">Delta ≈ {callGreeks.delta.toFixed(2)}</div>
                </div>
              </div>

              {/* Spread analysis */}
              <div className="p-2.5 bg-white border border-slate-200 rounded text-xs text-slate-600 font-mono-nums flex items-center justify-between">
                <span>Call vs Put Vol Spread (Call IV - Put IV):</span>
                <span
                  className={`font-bold ${
                    stock.call_25_iv > stock.put_25_iv ? 'text-emerald-700' : 'text-slate-700'
                  }`}
                >
                  {(stock.call_25_iv - stock.put_25_iv).toFixed(1)}% pts{' '}
                  {stock.call_25_iv > stock.put_25_iv ? '(Calls Bid Higher!)' : '(Puts Bid Higher)'}
                </span>
              </div>
            </div>
          </div>

          {/* Black-Scholes Greeks Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Black-Scholes Greek Sensitivities (30–45 DTE)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs font-mono-nums text-left divide-y divide-slate-100">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Option</th>
                    <th className="py-2 px-3 text-right">Strike</th>
                    <th className="py-2 px-3 text-right">Delta (Δ)</th>
                    <th className="py-2 px-3 text-right">Gamma (Γ)</th>
                    <th className="py-2 px-3 text-right">Vega (ν / 1% vol)</th>
                    <th className="py-2 px-3 text-right">Theta (θ / day)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-800">25Δ Call</td>
                    <td className="py-2 px-3 text-right text-slate-700">${stock.call_25_strike}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600">
                      +{callGreeks.delta.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{callGreeks.gamma.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">${callGreeks.vega.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-rose-600">${callGreeks.theta.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-800">25Δ Put</td>
                    <td className="py-2 px-3 text-right text-slate-700">${stock.put_25_strike}</td>
                    <td className="py-2 px-3 text-right font-bold text-rose-600">
                      {putGreeks.delta.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{putGreeks.gamma.toFixed(3)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">${putGreeks.vega.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-rose-600">${putGreeks.theta.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Liquidity & Catalyst Context */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded font-mono-nums">
              <span className="text-slate-500">25Δ Chain Volume & Open Interest:</span>
              <span className="font-semibold text-slate-800">
                Vol: {stock.volume_25delta.toLocaleString()} · OI: {stock.oi_25delta.toLocaleString()}
                <span className="ml-2">
                  {stock.thin ? (
                    <span className="text-amber-700 font-bold">(⚠️ Thin Chain)</span>
                  ) : (
                    <span className="text-emerald-700 font-bold">(✓ Institutional Liquid)</span>
                  )}
                </span>
              </span>
            </div>

            {stock.catalyst && (
              <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded text-slate-700">
                <span className="font-semibold text-amber-900 block mb-0.5">Options Flow Context & Catalyst:</span>
                <p className="text-[11px] leading-relaxed text-slate-600">{stock.catalyst}</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs">
          <button
            onClick={() => onToggleWatchlist(stock.ticker)}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              isWatchlist
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isWatchlist ? '★ In Watchlist' : '+ Add to Watchlist'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
