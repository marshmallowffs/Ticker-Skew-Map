import React, { useState, useMemo } from 'react';
import { RadarRecord, Horizon } from '../types/radar';
import { Star, ChevronLeft, ChevronRight, ExternalLink, ArrowUpDown, Search, ShieldCheck, Zap } from 'lucide-react';

interface ActionListTableProps {
  records: RadarRecord[];
  horizon: Horizon;
  watchlist: Set<string>;
  onToggleWatchlist: (ticker: string) => void;
  onSelectStock: (record: RadarRecord) => void;
  selectedTicker: string | null;
}

export const ActionListTable: React.FC<ActionListTableProps> = ({
  records,
  horizon,
  watchlist,
  onToggleWatchlist,
  onSelectStock,
  selectedTicker,
}) => {
  const [viewMode, setViewMode] = useState<'CONTRARIAN_ONLY' | 'ALL'>('CONTRARIAN_ONLY');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [sortField, setSortField] = useState<'skew' | 'return' | 'price' | 'atm_iv'>('skew');
  const [sortAsc, setSortAsc] = useState<boolean>(true); // default true for lowest skew first
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const getReturn = (r: RadarRecord): number => {
    if (horizon === '1d') return r.ret_1d;
    if (horizon === '1w') return r.ret_1w;
    return r.ret_1m;
  };

  const horizonLabel = horizon === '1d' ? '1D' : horizon === '1w' ? '1W' : '1M';

  // Filter based on viewMode and table search
  const filteredRecords = useMemo(() => {
    let list = records;
    if (viewMode === 'CONTRARIAN_ONLY') {
      list = list.filter((r) => getReturn(r) < 0 && r.skew < 0);
    }

    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.ticker.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortField === 'skew') {
        valA = a.skew;
        valB = b.skew;
      } else if (sortField === 'return') {
        valA = getReturn(a);
        valB = getReturn(b);
      } else if (sortField === 'price') {
        valA = a.price;
        valB = b.price;
      } else if (sortField === 'atm_iv') {
        valA = a.atm_iv;
        valB = b.atm_iv;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [records, horizon, viewMode, tableSearch, sortField, sortAsc]);

  const toggleSort = (field: 'skew' | 'return' | 'price' | 'atm_iv') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'skew'); // default ascending for skew to find most aggressive calls
    }
    setCurrentPage(1);
  };

  const contrarianCount = useMemo(() => {
    return records.filter((r) => getReturn(r) < 0 && r.skew < 0).length;
  }, [records, horizon]);

  // Pagination calculation
  const totalItems = filteredRecords.length;
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / (effectivePageSize || 1)));
  const pageIndex = Math.min(currentPage, totalPages);
  const startIndex = (pageIndex - 1) * effectivePageSize;
  const paginatedRecords = pageSize === 0 ? filteredRecords : filteredRecords.slice(startIndex, startIndex + effectivePageSize);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden my-6">
      {/* Table Section Header */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              The Action List · Contrarian Bid Opportunities
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {contrarianCount} names qualified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Institutional options flow paying premium for OTM upside calls (Negative Skew) while equity price declined
            over the {horizonLabel} horizon. The market price and options flow disagree — prime institutional accumulation signal.
          </p>
        </div>

        {/* View Mode Toggle & In-Table Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Table quick search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search in table..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 w-40"
            />
          </div>

          <div className="inline-flex p-1 bg-slate-200/70 rounded-lg shrink-0">
            <button
              onClick={() => {
                setViewMode('CONTRARIAN_ONLY');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'CONTRARIAN_ONLY'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Contrarian Bid ({contrarianCount})
            </button>
            <button
              onClick={() => {
                setViewMode('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'ALL'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Scanned Names ({records.length})
            </button>
          </div>
        </div>
      </div>

      {/* High Density Institutional Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">Pin</th>
              <th className="py-2.5 px-3">Ticker / Company</th>
              <th className="py-2.5 px-3">Universe</th>
              <th className="py-2.5 px-3">Sector</th>
              <th
                onClick={() => toggleSort('price')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Price</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('return')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Return ({horizonLabel})</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('skew')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span className="text-emerald-700 font-bold">Options Skew</span>
                  <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('atm_iv')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>ATM IV</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Call 25Δ IV</th>
              <th className="py-2.5 px-3 text-right">Put 25Δ IV</th>
              <th className="py-2.5 px-3 text-right">DTE</th>
              <th className="py-2.5 px-3 text-center">Liquidity</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-slate-400">
                  No stocks match the selected criteria for this horizon and universe.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r) => {
                const ret = getReturn(r);
                const isWatch = watchlist.has(r.ticker);
                const isSelected = selectedTicker === r.ticker;
                const isContrarian = ret < 0 && r.skew < 0;

                return (
                  <tr
                    key={r.ticker}
                    onClick={() => onSelectStock(r)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-50/70'
                        : isContrarian
                        ? 'hover:bg-emerald-50/30'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Watchlist Star Toggle */}
                    <td
                      className="py-2 px-3 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(r.ticker);
                      }}
                    >
                      <button
                        title={isWatch ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        className="text-slate-300 hover:text-amber-500 transition-colors p-1"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isWatch ? 'text-amber-500 fill-amber-400' : ''
                          }`}
                        />
                      </button>
                    </td>

                    {/* Ticker & Name */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {r.ticker}
                        </span>
                        {isWatch && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold">
                            WL
                          </span>
                        )}
                        <span className="text-slate-500 text-[11px] truncate max-w-[130px]">
                          {r.name}
                        </span>
                      </div>
                    </td>

                    {/* Universe Badge */}
                    <td className="py-2 px-3">
                      {r.isSP500 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                          <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                          S&P 500
                        </span>
                      ) : r.capCategory === 'etf' ? (
                        <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          ETF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <Zap className="w-2.5 h-2.5 text-emerald-600" />
                          Small/Mid
                        </span>
                      )}
                    </td>

                    {/* Sector */}
                    <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[120px]">
                      {r.sector}
                    </td>

                    {/* Price */}
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      ${r.price.toFixed(2)}
                    </td>

                    {/* Return */}
                    <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          ret > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : ret < 0
                            ? 'bg-rose-50 text-rose-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {ret > 0 ? `+${ret.toFixed(2)}%` : `${ret.toFixed(2)}%`}
                      </span>
                    </td>

                    {/* Options Skew */}
                    <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                          r.skew < 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.skew > 0 ? `+${r.skew.toFixed(2)}%` : `${r.skew.toFixed(2)}%`}
                      </span>
                    </td>

                    {/* ATM IV */}
                    <td className="py-2 px-3 text-right font-mono text-slate-700 tabular-nums">
                      {r.atm_iv.toFixed(1)}%
                    </td>

                    {/* Call 25Δ IV */}
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 tabular-nums">
                      {r.call_25_iv.toFixed(1)}%
                    </td>

                    {/* Put 25Δ IV */}
                    <td className="py-2 px-3 text-right font-mono text-rose-700 tabular-nums">
                      {r.put_25_iv.toFixed(1)}%
                    </td>

                    {/* DTE */}
                    <td className="py-2 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {r.dte}d
                    </td>

                    {/* Liquidity */}
                    <td className="py-2 px-3 text-center">
                      {r.thin ? (
                        <span
                          title="Thin chain: Open Interest < 30 or Volume < 5 on key strikes"
                          className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200"
                        >
                          THIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                          LIQUID
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStock(r);
                        }}
                        className="text-slate-400 hover:text-slate-900 inline-flex items-center gap-1 text-[11px] font-medium"
                      >
                        Inspect
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{' '}
            <strong className="text-slate-900">{Math.min(startIndex + effectivePageSize, totalItems)}</strong> of{' '}
            <strong className="text-slate-900">{totalItems}</strong> names
          </span>
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>All ({totalItems})</option>
            </select>
          </div>
        </div>

        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={pageIndex <= 1}
              className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3 h-3" />
              Prev
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {pageIndex} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageIndex >= totalPages}
              className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
