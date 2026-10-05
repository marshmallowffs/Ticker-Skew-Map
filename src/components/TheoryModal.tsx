import React from 'react';
import { X, BookOpen, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">Quantitative Options Skew Theory</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-slate-600 leading-relaxed">
          {/* Section 1 */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1.5">1. What is Options Skew?</h4>
            <p>
              Options are insurance contracts. Under the classic Black-Scholes model, implied volatility (IV) across strikes is assumed flat. In reality, market participants price risk asymmetrically. Typically, out-of-the-money (OTM) puts trade at a premium to OTM calls because equity investors fear crashes.
            </p>
            <p className="mt-1.5 font-medium text-slate-800">
              When upside calls trade at higher implied volatility than downside puts, sophisticated institutional players are aggressively paying up for upside exposure, signaling latent bullish positioning.
            </p>
          </div>

          {/* Section 2: The Formula */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="text-sm font-bold text-slate-900 mb-1.5">2. The Normalized 25-Delta Skew Formula</h4>
            <div className="p-3 bg-white border border-slate-200 rounded-md font-mono text-center text-sm font-bold text-slate-900 my-2">
              Skew % = [(IV<sub>25Δ Put</sub> - IV<sub>25Δ Call</sub>) / IV<sub>ATM</sub>] × 100
            </div>
            <ul className="space-y-1 text-slate-600 mt-2 list-disc list-inside">
              <li>
                <strong>IV<sub>ATM</sub>:</strong> Implied Volatility of the at-the-money strike (Delta ≈ 0.50). Dividing by ATM IV normalizes the metric, enabling quantum/high-beta names like <code>IONQ</code> to be compared directly against low-beta staples like <code>KO</code> or <code>WMT</code>.
              </li>
              <li>
                <strong>IV<sub>25Δ Put</sub>:</strong> Implied Volatility of the OTM Put with Delta ≈ -0.25.
              </li>
              <li>
                <strong>IV<sub>25Δ Call</sub>:</strong> Implied Volatility of the OTM Call with Delta ≈ +0.25.
              </li>
              <li>
                <strong>Target Expiration:</strong> Options expiring 30 to 45 days out (1-month forward institutional positioning horizon).
              </li>
            </ul>
          </div>

          {/* Section 3: The 4 Quadrants */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">3. The Four Market Sentiment Quadrants</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 border border-slate-200 rounded-lg bg-rose-50/20">
                <span className="font-bold text-rose-700 block mb-1">Top-Left · FEAR</span>
                <span className="text-[11px] font-mono text-slate-500 block mb-1">Return &lt; 0% · Skew &gt; 0%</span>
                <p className="text-[11px]">
                  Stock is falling and downside puts are bid up. Do not catch falling knives until put skew flattens.
                </p>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-blue-50/20">
                <span className="font-bold text-blue-700 block mb-1">Top-Right · HEDGED RALLY</span>
                <span className="text-[11px] font-mono text-slate-500 block mb-1">Return &gt; 0% · Skew &gt; 0%</span>
                <p className="text-[11px]">
                  Stock is rising, but protection is heavily bid. Institutions distrust the move; tighten stops.
                </p>
              </div>

              <div className="p-3 border border-emerald-300 rounded-lg bg-emerald-50/50">
                <span className="font-bold text-emerald-800 block mb-1">Bottom-Left · CONTRARIAN BID ★</span>
                <span className="text-[11px] font-mono text-emerald-700 block mb-1">Return &lt; 0% · Skew &lt; 0%</span>
                <p className="text-[11px] text-emerald-950 font-medium">
                  <strong>The holy grail.</strong> The stock declined over the period, but upside calls are actively bid. Options flow and price disagree. Prime accumulation setup.
                </p>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-violet-50/20">
                <span className="font-bold text-violet-700 block mb-1">Bottom-Right · CHASE</span>
                <span className="text-[11px] font-mono text-slate-500 block mb-1">Return &gt; 0% · Skew &lt; 0%</span>
                <p className="text-[11px]">
                  Stock is rising and calls are bid. Trend confirmed, but beware of crowded call-squeeze chasing.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Liquidity Filtering */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1.5">4. Liquidity & Open Interest Discipline</h4>
            <p>
              If a strike has Open Interest &lt; 30 or Volume &lt; 5, quotes may reflect stale market-maker spreads rather than institutional accumulation. Such records are flagged as <code>thin = True</code> and rendered as <strong>hollow circles</strong> on the radar.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
