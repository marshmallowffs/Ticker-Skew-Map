import React from 'react';
import { QuadrantType } from '../types/radar';

interface QuadrantExplainerProps {
  activeQuadrantFilter: string;
  onSelectQuadrant: (q: string) => void;
  contrarianCount: number;
  fearCount: number;
  hedgedCount: number;
  chaseCount: number;
}

export const QuadrantExplainer: React.FC<QuadrantExplainerProps> = ({
  activeQuadrantFilter,
  onSelectQuadrant,
  contrarianCount,
  fearCount,
  hedgedCount,
  chaseCount,
}) => {
  const cards = [
    {
      id: 'FEAR' as QuadrantType,
      title: 'Top-Left · FEAR',
      condition: 'Return < 0% · Skew > 0%',
      desc: 'Stock falling and downside puts bid. Market seeking crash protection. Avoid / don\'t catch falling knives.',
      count: fearCount,
      color: 'border-l-rose-500 hover:border-rose-400',
      tagColor: 'text-rose-700',
      activeBg: 'ring-1 ring-rose-500 bg-rose-50/20'
    },
    {
      id: 'HEDGED RALLY' as QuadrantType,
      title: 'Top-Right · HEDGED RALLY',
      condition: 'Return > 0% · Skew > 0%',
      desc: 'Stock rising, but protection bid. Rally distrusted by institutions; lock in gains / tighten stops.',
      count: hedgedCount,
      color: 'border-l-blue-500 hover:border-blue-400',
      tagColor: 'text-blue-700',
      activeBg: 'ring-1 ring-blue-500 bg-blue-50/20'
    },
    {
      id: 'CONTRARIAN BID' as QuadrantType,
      title: 'Bottom-Left · CONTRARIAN BID ★',
      condition: 'Return < 0% · Skew < 0%',
      desc: 'The holy grail. Stock fell on period, but calls are bid. Market price and options flow disagree. High conviction watchlist.',
      count: contrarianCount,
      color: 'border-l-emerald-500 hover:border-emerald-400 bg-emerald-50/40',
      tagColor: 'text-emerald-700 font-bold',
      activeBg: 'ring-2 ring-emerald-500 bg-emerald-50/70'
    },
    {
      id: 'CHASE' as QuadrantType,
      title: 'Bottom-Right · CHASE',
      condition: 'Return > 0% · Skew < 0%',
      desc: 'Stock rising and calls bid. Upside momentum confirmed by options traders, but crowded positioning.',
      count: chaseCount,
      color: 'border-l-violet-500 hover:border-violet-400',
      tagColor: 'text-violet-700',
      activeBg: 'ring-1 ring-violet-500 bg-violet-50/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-3">
      {cards.map((c) => {
        const isActive = activeQuadrantFilter === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectQuadrant(isActive ? 'ALL' : c.id)}
            className={`text-left p-3 rounded-lg border border-slate-200 border-l-4 bg-white transition-all cursor-pointer ${
              c.color
            } ${isActive ? c.activeBg : 'hover:bg-slate-50/60'}`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className={`text-xs font-semibold tracking-wide ${c.tagColor}`}>
                {c.title}
              </span>
              <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 tabular-nums">
                {c.count}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mb-1">
              {c.condition}
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
              {c.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
};
