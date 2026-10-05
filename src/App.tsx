import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { COMPLETE_RADAR_DATA } from './data/extendedUniverse';
import { RadarRecord, Horizon, QuadrantType, UniverseCategory } from './types/radar';
import { TopNav } from './components/TopNav';
import { HorizonSwitcher } from './components/HorizonSwitcher';
import { QuadrantExplainer } from './components/QuadrantExplainer';
import { RadarChart } from './components/RadarChart';
import { ActionListTable } from './components/ActionListTable';
import { StockDetailModal } from './components/StockDetailModal';
import { WatchlistManagerModal } from './components/WatchlistManagerModal';
import { TheoryModal } from './components/TheoryModal';

const WATCHLIST_STORAGE_KEY = 'name_radar_user_watchlist';

function getStoredWatchlist(): Set<string> {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set<string>(arr.map((s: any) => String(s).trim().toUpperCase()));
      }
    }
  } catch (e) {
    console.warn('Error reading watchlist from localStorage:', e);
  }
  return new Set<string>(); // Clean empty set by default: only remember stocks the user explicitly adds
}

export default function App() {
  // Master records state initialized with our full universe (1,080 equities)
  const [records, setRecords] = useState<RadarRecord[]>(COMPLETE_RADAR_DATA);
  const [horizon, setHorizon] = useState<Horizon>('1m'); // default 1-Month lookback
  const [universeCategory, setUniverseCategory] = useState<UniverseCategory>('INSTITUTIONAL');
  const [watchlist, setWatchlist] = useState<Set<string>>(getStoredWatchlist);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hideThin, setHideThin] = useState<boolean>(true); // default true: filter out thin illiquid chains
  const [quadrantFilter, setQuadrantFilter] = useState<string>('ALL');
  const [lastScannedTime, setLastScannedTime] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  // Modals & Selected Stock
  const [selectedStock, setSelectedStock] = useState<RadarRecord | null>(null);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState<boolean>(false);
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState<boolean>(false);
  const [isRescanning, setIsRescanning] = useState<boolean>(false);
  interface ToastData {
    message: string;
    type: 'info' | 'success' | 'error' | 'loading';
  }
  const [toast, setToast] = useState<ToastData | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' | 'loading' = 'info', durationMs = 5000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, durationMs);
  }, []);

  // Fetch live radar records from the backend API on load
  const loadLiveRadarData = useCallback(async (showNotification = false) => {
    try {
      const res = await fetch('/api/radar');
      if (res.ok) {
        const data = await res.json();
        if (data && data.records && data.records.length > 0) {
          setRecords(data.records);
          setIsLiveConnected(true);
          if (data.metadata?.scan_timestamp) {
            setLastScannedTime(new Date(data.metadata.scan_timestamp).toLocaleTimeString());
          }
          if (showNotification) {
            showToast(`Loaded ${data.records.length} live records from Yahoo Finance`);
          }
        }
      }
    } catch (err) {
      console.warn('Backend live API not available yet, using initialized dataset');
    }
  }, []);

  useEffect(() => {
    loadLiveRadarData();
  }, [loadLiveRadarData]);

  // Watchlist handlers
  const handleToggleWatchlist = useCallback(async (ticker: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
        showToast(`Removed ${ticker} from Watchlist`);
      } else {
        next.add(ticker);
        showToast(`Added ${ticker} to Watchlist`);
      }
      return next;
    });

    // If ticker not in current records, scan it live!
    if (!records.some((r) => r.ticker === ticker)) {
      try {
        const scanRes = await fetch(`/api/scan-ticker?ticker=${encodeURIComponent(ticker)}`);
        if (scanRes.ok) {
          const scanData = await scanRes.json();
          if (scanData.record) {
            setRecords((prev) => [scanData.record, ...prev]);
            showToast(`Fetched live options chain for ${ticker}`);
          }
        }
      } catch (e) {
        console.warn(`Could not live scan ${ticker}`);
      }
    }
  }, [records]);

  const handleAddTickerToWatchlist = useCallback(async (ticker: string) => {
    const clean = ticker.trim().toUpperCase();
    setWatchlist((prev) => {
      const next = new Set(prev);
      next.add(clean);
      return next;
    });
    showToast(`Added ${clean} to Watchlist`);

    // Check if we need to live scan this ticker
    const exists = records.some((r) => r.ticker === clean);
    if (!exists) {
      showToast(`Fetching live Yahoo Finance options for ${clean}...`);
      try {
        const scanRes = await fetch(`/api/scan-ticker?ticker=${encodeURIComponent(clean)}`);
        if (scanRes.ok) {
          const scanData = await scanRes.json();
          if (scanData.record) {
            setRecords((prev) => [scanData.record, ...prev]);
            showToast(`Successfully added live data for ${clean} ($${scanData.record.price})`);
          }
        }
      } catch (e) {
        console.warn(`Live scan error for ${clean}`);
      }
    }
  }, [records]);

  const handleRemoveTickerFromWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      next.delete(ticker);
      return next;
    });
    showToast(`Removed ${ticker} from Watchlist`);
  }, []);

  const handleClearWatchlist = useCallback(() => {
    setWatchlist(new Set());
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {}
    showToast('Watchlist cleared');
  }, []);

  // Persist watchlist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(Array.from(watchlist)));
    } catch (e) {
      console.warn('Error persisting watchlist to localStorage:', e);
    }
  }, [watchlist]);

  // Universe category counts
  const institutionalCount = useMemo(() => records.filter((r) => r.isInstitutional).length, [records]);
  const sp500Count = useMemo(() => records.filter((r) => r.isSP500).length, [records]);
  const smallMidCount = useMemo(() => records.filter((r) => r.capCategory === 'small_mid').length, [records]);
  const etfCount = useMemo(() => records.filter((r) => r.capCategory === 'etf').length, [records]);

  // Filtered by universe category (Watchlist items are ALWAYS preserved so you can monitor them)
  const universeFilteredRecords = useMemo(() => {
    if (universeCategory === 'INSTITUTIONAL') return records.filter((r) => r.isInstitutional || watchlist.has(r.ticker));
    if (universeCategory === 'SP500') return records.filter((r) => r.isSP500 || watchlist.has(r.ticker));
    if (universeCategory === 'SMALL_MID') return records.filter((r) => r.capCategory === 'small_mid' || watchlist.has(r.ticker));
    if (universeCategory === 'ETF') return records.filter((r) => r.capCategory === 'etf' || watchlist.has(r.ticker));
    if (universeCategory === 'WATCHLIST') return records.filter((r) => watchlist.has(r.ticker));
    return records;
  }, [records, universeCategory, watchlist]);

  // Filtered by thin liquidity — Watchlist tickers are ALWAYS protected and visible
  const visibleRecords = useMemo(() => {
    if (!hideThin) return universeFilteredRecords;
    return universeFilteredRecords.filter((r) => !r.thin || watchlist.has(r.ticker));
  }, [universeFilteredRecords, hideThin, watchlist]);

  const thinCount = useMemo(() => {
    return universeFilteredRecords.filter((r) => r.thin).length;
  }, [universeFilteredRecords]);

  // Quadrant counts for current horizon
  const getReturn = (r: RadarRecord): number => {
    if (horizon === '1d') return r.ret_1d;
    if (horizon === '1w') return r.ret_1w;
    return r.ret_1m;
  };

  const { contrarianCount, fearCount, hedgedCount, chaseCount } = useMemo(() => {
    let contrarian = 0;
    let fear = 0;
    let hedged = 0;
    let chase = 0;

    visibleRecords.forEach((r) => {
      const ret = getReturn(r);
      if (ret < 0 && r.skew < 0) contrarian++;
      else if (ret < 0 && r.skew > 0) fear++;
      else if (ret >= 0 && r.skew > 0) hedged++;
      else chase++;
    });

    return {
      contrarianCount: contrarian,
      fearCount: fear,
      hedgedCount: hedged,
      chaseCount: chase,
    };
  }, [visibleRecords, horizon]);

  // Real-time Rescan: queries live Yahoo Finance options chains and quotes
  const handleRescan = async () => {
    setIsRescanning(true);
    showToast('Connecting to Yahoo Finance: pulling latest quotes & live options chains...', 'loading', 15000);
    try {
      // Trigger full universe quotes refresh & priority options chains rescan
      const res = await fetch('/api/rescan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlist: Array.from(watchlist),
          category: universeCategory,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (data && data.records && data.records.length > 0) {
        setRecords(data.records);
        setIsLiveConnected(true);
        const timeStr = data.scanTimestamp
          ? new Date(data.scanTimestamp).toLocaleTimeString()
          : new Date().toLocaleTimeString();
        setLastScannedTime(timeStr);
        showToast(
          `Rescan complete: updated live market prices for ${data.quotesUpdatedCount || data.records.length} stocks & options chains from Yahoo Finance`,
          'success',
          6000
        );
        return;
      }

      // Fallback reload
      await loadLiveRadarData(true);
    } catch (err: any) {
      console.warn('Error during rescan:', err.message);
      showToast(
        `Rescan failed: ${err.message || 'Could not connect to live market data'}. Please retry.`,
        'error',
        7500
      );
    } finally {
      setIsRescanning(false);
    }
  };

  // Export JSON dataset
  const handleExport = () => {
    const payload = {
      metadata: {
        total_scanned: records.length,
        successful_records: records.length,
        failed_records: 0,
        scan_timestamp: new Date().toISOString(),
        target_horizon: '30-45 DTE',
        formula: 'Skew = (IV_25d_put - IV_25d_call) / IV_atm * 100',
      },
      records,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `name_radar_dataset_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported dataset to radar_data.json');
  };

  const handleAddScannedRecord = useCallback((newRecord: RadarRecord) => {
    setRecords((prev) => {
      const filtered = prev.filter((r) => r.ticker !== newRecord.ticker);
      return [newRecord, ...filtered];
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col antialiased">
      {/* 1. Top Navigation Bar (Top Bar Contract: 3 Zones) */}
      <TopNav
        watchlistCount={watchlist.size}
        totalRecordsCount={records.length}
        isLiveConnected={isLiveConnected}
        lastScannedTime={lastScannedTime}
        onOpenWatchlist={() => setIsWatchlistModalOpen(true)}
        onOpenTheory={() => setIsTheoryModalOpen(true)}
        onExport={handleExport}
        onRescan={handleRescan}
        isRescanning={isRescanning}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        records={records}
        onSelectStock={setSelectedStock}
        onAddScannedRecord={handleAddScannedRecord}
        onShowToast={showToast}
      />

      {/* Main Workspace Viewport (Baseline 1440px wide) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-4">
        {/* Horizon Switcher & Controls */}
        <HorizonSwitcher
          currentHorizon={horizon}
          onSelectHorizon={setHorizon}
          universeCategory={universeCategory}
          onSelectUniverseCategory={setUniverseCategory}
          hideThin={hideThin}
          onToggleHideThin={() => setHideThin((prev) => !prev)}
          selectedQuadrantFilter={quadrantFilter}
          onSelectQuadrantFilter={setQuadrantFilter}
          thinCount={thinCount}
          totalCount={records.length}
          institutionalCount={institutionalCount}
          sp500Count={sp500Count}
          smallMidCount={smallMidCount}
          etfCount={etfCount}
          watchlistCount={watchlist.size}
        />

        {/* 4 Quadrants Summary Cards */}
        <QuadrantExplainer
          activeQuadrantFilter={quadrantFilter}
          onSelectQuadrant={setQuadrantFilter}
          contrarianCount={contrarianCount}
          fearCount={fearCount}
          hedgedCount={hedgedCount}
          chaseCount={chaseCount}
        />

        {/* The Institutional Options Skew Radar Scatter Chart */}
        <RadarChart
          records={visibleRecords}
          horizon={horizon}
          watchlist={watchlist}
          searchQuery={searchQuery}
          selectedTicker={selectedStock?.ticker || null}
          onSelectStock={setSelectedStock}
          quadrantFilter={quadrantFilter}
        />

        {/* The Action List (Contrarian Bid Opportunities Table) */}
        <ActionListTable
          records={visibleRecords}
          horizon={horizon}
          watchlist={watchlist}
          onToggleWatchlist={handleToggleWatchlist}
          onSelectStock={setSelectedStock}
          selectedTicker={selectedStock?.ticker || null}
        />
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            <span>Name Radar</span>
            <span className="mx-2">·</span>
            <span>Institutional Equity Skew & Price Positioning Engine</span>
            <span className="mx-2">·</span>
            <span className="font-mono-nums">30–45 DTE</span>
          </div>
          <div className="font-mono-nums text-[11px] text-slate-400">
            Formula: Skew = (IV₂₅Δ Put - IV₂₅Δ Call) / IV_ATM
          </div>
        </div>
      </footer>

      {/* Single Stock Detail / Greeks Inspector Modal */}
      <StockDetailModal
        stock={selectedStock}
        onClose={() => setSelectedStock(null)}
        horizon={horizon}
        isWatchlist={selectedStock ? watchlist.has(selectedStock.ticker) : false}
        onToggleWatchlist={handleToggleWatchlist}
      />

      {/* Watchlist Manager Modal */}
      <WatchlistManagerModal
        isOpen={isWatchlistModalOpen}
        onClose={() => setIsWatchlistModalOpen(false)}
        watchlist={watchlist}
        onAddTicker={handleAddTickerToWatchlist}
        onRemoveTicker={handleRemoveTickerFromWatchlist}
        onClearWatchlist={handleClearWatchlist}
        availableTickers={records.map((r) => r.ticker)}
      />

      {/* Mathematical Theory & Methodology Modal */}
      <TheoryModal
        isOpen={isTheoryModalOpen}
        onClose={() => setIsTheoryModalOpen(false)}
      />

      {/* Enhanced Toast Notification with Type Badges and Dismiss Button */}
      {toast && (
        <div className="fixed bottom-5 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-md">
          {toast.type === 'loading' && (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
          )}
          {toast.type === 'success' && (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          )}
          {toast.type === 'error' && (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
          )}
          {toast.type === 'info' && (
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
          )}

          <span className="flex-1 font-mono-nums leading-relaxed">{toast.message}</span>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 text-base leading-none shrink-0 px-1 py-0.5"
            title="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
