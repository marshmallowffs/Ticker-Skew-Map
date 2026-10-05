import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Bookmark, Download, BookOpen, Search, RefreshCw, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { RadarRecord } from '../types/radar';

interface TopNavProps {
  watchlistCount: number;
  totalRecordsCount: number;
  isLiveConnected?: boolean;
  lastScannedTime?: string | null;
  onOpenWatchlist: () => void;
  onOpenTheory: () => void;
  onExport: () => void;
  onRescan: () => void;
  isRescanning: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  records: RadarRecord[];
  onSelectStock: (record: RadarRecord) => void;
  onAddScannedRecord?: (record: RadarRecord) => void;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'error' | 'loading', durationMs?: number) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  watchlistCount,
  totalRecordsCount,
  isLiveConnected = true,
  lastScannedTime,
  onOpenWatchlist,
  onOpenTheory,
  onExport,
  onRescan,
  isRescanning,
  searchQuery,
  onSearchChange,
  records,
  onSelectStock,
  onAddScannedRecord,
  onShowToast,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isScanningLive, setIsScanningLive] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute smart, strict ticker-first recommendations based on what the user is typing
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const genericEtfWords = new Set([
      'daily', 'bull', 'bear', 'shares', 'fund', 'etf', 'index', 'ultra',
      'short', '2x', '3x', 'corp', 'inc', 'co', 'ltd', 'company', 'the'
    ]);

    const scored: { record: RadarRecord; score: number }[] = [];

    for (const r of records) {
      const ticker = r.ticker.toLowerCase();
      const name = r.name.toLowerCase();

      // Rule 1: Exact ticker match -> highest score (100)
      if (ticker === q) {
        scored.push({ record: r, score: 100 });
        continue;
      }

      // Rule 2: Ticker begins with typed query (e.g. 'b' -> BULL, BA, BABA)
      if (ticker.startsWith(q)) {
        scored.push({ record: r, score: 85 - Math.min(ticker.length - q.length, 10) });
        continue;
      }

      // Rule 3: Company name starts with query (e.g. 'webull' -> BULL, 'apple' -> AAPL)
      if (name.startsWith(q)) {
        scored.push({ record: r, score: 65 });
        continue;
      }

      // Rule 4: Distinct word in company name starts with query (for queries >= 3 chars, e.g. 'palantir', 'nvidia')
      if (q.length >= 3 && !genericEtfWords.has(q)) {
        const words = name.split(/[\s,.-]+/);
        if (words.some((w) => w.startsWith(q))) {
          scored.push({ record: r, score: 45 });
          continue;
        }
      }
    }

    // Only if no prefix matches exist and user typed >= 3 chars, check if ticker contains query
    if (scored.length === 0 && q.length >= 3) {
      for (const r of records) {
        if (r.ticker.toLowerCase().includes(q)) {
          scored.push({ record: r, score: 30 });
        }
      }
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.record.ticker.length !== b.record.ticker.length) {
        return a.record.ticker.length - b.record.ticker.length; // shorter ticker first
      }
      return (b.record.marketCap || 0) - (a.record.marketCap || 0);
    });

    return scored.slice(0, 6).map((s) => s.record);
  }, [searchQuery, records]);

  // Reset selectedIndex when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  // Live scan fallback for tickers not in current pre-indexed list
  const handleLiveScan = async (tickerToScan: string) => {
    const cleanTicker = tickerToScan.trim().toUpperCase();
    if (!cleanTicker) return;

    setIsScanningLive(true);
    if (onShowToast) {
      onShowToast(`Scanning live options chain for ${cleanTicker} from Yahoo Finance...`, 'loading', 10000);
    }

    try {
      const res = await fetch(`/api/scan-ticker?ticker=${encodeURIComponent(cleanTicker)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.record) {
          if (onAddScannedRecord) {
            onAddScannedRecord(data.record);
          }
          onSelectStock(data.record);
          onSearchChange(data.record.ticker);
          setIsFocused(false);
          inputRef.current?.blur();
          if (onShowToast) {
            onShowToast(`Loaded live data for ${data.record.ticker} ($${data.record.price.toFixed(2)}) from Yahoo Finance`, 'success', 5000);
          }
          return;
        }
      }
      if (onShowToast) {
        onShowToast(`No options chain found for ticker "${cleanTicker}" on Yahoo Finance`, 'error', 6000);
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(`Failed to scan ${cleanTicker}: ${err.message}`, 'error', 6000);
      }
    } finally {
      setIsScanningLive(false);
    }
  };

  // Submit and open specific ticker info modal
  const handleSelect = async (recordToSelect?: RadarRecord) => {
    let target = recordToSelect;

    if (!target) {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        target = suggestions[selectedIndex];
      } else {
        const q = searchQuery.trim().toLowerCase();
        // Exact ticker match
        target = records.find((r) => r.ticker.toLowerCase() === q);
        // Fallback to top suggestion if it starts with query
        if (!target && suggestions.length > 0) {
          target = suggestions[0];
        }
      }
    }

    if (target) {
      onSelectStock(target);
      onSearchChange(target.ticker);
      setIsFocused(false);
      inputRef.current?.blur();
    } else {
      // If no local record exists, try live scanning from Yahoo Finance!
      const cleanTicker = searchQuery.trim().toUpperCase();
      if (/^[A-Z0-9.\-]{1,7}$/.test(cleanTicker)) {
        await handleLiveScan(cleanTicker);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="/" className="text-lg font-bold tracking-tight text-slate-900 hover:text-slate-700 transition-colors">
            Name Radar
          </a>
          <div className="hidden xl:flex items-center gap-2 text-xs font-mono-nums">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Yahoo Data</span>
            </span>
            <span className="text-slate-400">
              {totalRecordsCount} names · {lastScannedTime ? `Updated ${lastScannedTime}` : '30–45 DTE'}
            </span>
          </div>
        </div>

        {/* Zone 2: Expanding Search Bar with Autocomplete Suggestions */}
        <div
          ref={searchContainerRef}
          className={`relative transition-all duration-300 ease-out flex-1 ${
            isFocused || searchQuery.trim() ? 'max-w-xl lg:max-w-2xl' : 'max-w-xs md:max-w-sm'
          } mx-2`}
        >
          <div className="relative w-full">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                isFocused ? 'text-amber-500' : 'text-slate-400'
              }`}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search ticker or company (e.g. BULL, NVDA, AAPL, Tesla)..."
              value={searchQuery}
              onFocus={() => setIsFocused(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (!isFocused) setIsFocused(true);
              }}
              onKeyDown={handleKeyDown}
              className={`w-full bg-slate-50 border rounded-lg pl-9 pr-14 py-2 text-xs text-slate-900 placeholder:text-slate-400 transition-all font-mono-nums shadow-2xs ${
                isFocused
                  ? 'border-amber-400 bg-white ring-2 ring-amber-100 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            />

            {/* Clear & Submit Action Indicator */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    inputRef.current?.focus();
                  }}
                  className="text-slate-400 hover:text-slate-600 p-0.5 text-xs rounded hover:bg-slate-200/50 cursor-pointer"
                  title="Clear search"
                >
                  ×
                </button>
              )}
              {isFocused && (
                <button
                  type="button"
                  onClick={() => handleSelect()}
                  disabled={isScanningLive}
                  className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
                  title="Press Enter to view stock details"
                >
                  {isScanningLive ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <span>↵</span>
                  )}
                  <span className="text-[9px]">{isScanningLive ? 'Scanning' : 'Enter'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Recommendation Dropdown */}
          {isFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
              {suggestions.length > 0 ? (
                <>
                  <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 text-[11px] font-medium text-slate-500">
                    <span>Recommended Tickers ({suggestions.length})</span>
                    <span className="text-[10px] text-slate-400">Click or press Enter to view deep analysis</span>
                  </div>

                  <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100/80">
                    {suggestions.map((record, index) => {
                      const isSelected = index === selectedIndex;
                      const isContrarian = record.ret_1m < 0 && record.skew < 0;
                      const isFear = record.ret_1m < 0 && record.skew > 0;
                      const isHedged = record.ret_1m >= 0 && record.skew > 0;

                      const quadrantBadge = isContrarian
                        ? { label: 'CONTRARIAN BID ★', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                        : isFear
                        ? { label: 'FEAR', bg: 'bg-rose-50 text-rose-700 border-rose-200' }
                        : isHedged
                        ? { label: 'HEDGED RALLY', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
                        : { label: 'CHASE', bg: 'bg-blue-50 text-blue-700 border-blue-200' };

                      return (
                        <div
                          key={record.ticker}
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevent blur
                            handleSelect(record);
                          }}
                          className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50/80' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Ticker Symbol Badge */}
                            <div className="w-16 shrink-0">
                              <span className="font-mono font-bold text-xs px-2 py-1 rounded bg-slate-900 text-white inline-block">
                                {record.ticker}
                              </span>
                            </div>

                            {/* Company Name & Sector */}
                            <div className="min-w-0 flex flex-col">
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {record.name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">
                                {record.sector} {record.isInstitutional ? '· Institutional Liquid' : ''}
                              </span>
                            </div>
                          </div>

                          {/* Financial Metrics & Skew Quadrant */}
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div>
                              <div className="text-xs font-mono font-semibold text-slate-900">
                                ${record.price.toFixed(2)}
                              </div>
                              <div
                                className={`text-[10px] font-mono flex items-center justify-end gap-0.5 ${
                                  record.ret_1m >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {record.ret_1m >= 0 ? (
                                  <TrendingUp className="w-2.5 h-2.5" />
                                ) : (
                                  <TrendingDown className="w-2.5 h-2.5" />
                                )}
                                <span>{record.ret_1m > 0 ? `+${record.ret_1m}%` : `${record.ret_1m}%`} (1M)</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${quadrantBadge.bg}`}
                              >
                                {quadrantBadge.label}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                                Skew: {record.skew > 0 ? `+${record.skew}%` : `${record.skew}%`}
                              </span>
                            </div>

                            <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  <p className="mb-2">
                    No ticker found starting with &ldquo;<span className="font-semibold text-slate-800">{searchQuery.toUpperCase()}</span>&rdquo;.
                  </p>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleLiveScan(searchQuery.trim().toUpperCase());
                    }}
                    disabled={isScanningLive}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isScanningLive ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Scanning Yahoo Finance...</span>
                      </>
                    ) : (
                      <>
                        <span>Scan live options for {searchQuery.trim().toUpperCase()} on Yahoo Finance ↵</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRescan}
            disabled={isRescanning}
            title="Recalculate analytical skew and live market quotes"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-md border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRescanning ? 'animate-spin text-amber-600' : 'text-slate-600'}`} />
            <span>{isRescanning ? 'Rescanning...' : 'Rescan'}</span>
          </button>

          <button
            onClick={onOpenTheory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Formula & Theory</span>
          </button>

          <button
            onClick={onOpenWatchlist}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>Watchlist ({watchlistCount})</span>
          </button>

          <button
            onClick={onExport}
            title="Export radar dataset as JSON"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
