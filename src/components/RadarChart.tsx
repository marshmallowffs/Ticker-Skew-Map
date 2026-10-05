import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RadarRecord, Horizon } from '../types/radar';
import { ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';

interface RadarChartProps {
  records: RadarRecord[];
  horizon: Horizon;
  watchlist: Set<string>;
  searchQuery: string;
  selectedTicker: string | null;
  onSelectStock: (record: RadarRecord) => void;
  quadrantFilter: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  records,
  horizon,
  watchlist,
  searchQuery,
  selectedTicker,
  onSelectStock,
  quadrantFilter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  const [hoveredRecord, setHoveredRecord] = useState<RadarRecord | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hideOutliers, setHideOutliers] = useState<boolean>(true);

  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update chart dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        setDimensions({
          width: Math.max(clientWidth, 600),
          height: Math.max(Math.min(clientWidth * 0.58, 660), 520),
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getReturn = (r: RadarRecord): number => {
    if (horizon === '1d') return r.ret_1d;
    if (horizon === '1w') return r.ret_1w;
    return r.ret_1m;
  };

  const horizonLabel = horizon === '1d' ? '1-Day' : horizon === '1w' ? '1-Week (5D)' : '1-Month (21D)';

  // Count extreme outliers (> ±50% return)
  const outlierCount = useMemo(() => {
    return records.filter((r) => Math.abs(getReturn(r)) > 50).length;
  }, [records, horizon]);

  // Filter records based on active filters
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const isWatchlist = watchlist.has(r.ticker);
      // Watchlist items are ALWAYS preserved so starred stocks never vanish
      if (isWatchlist) return true;

      const ret = getReturn(r);
      const isContrarian = ret < 0 && r.skew < 0;
      const isFear = ret < 0 && r.skew > 0;
      const isHedged = ret >= 0 && r.skew > 0;
      const isChase = ret >= 0 && r.skew <= 0;

      if (quadrantFilter === 'CONTRARIAN BID' && !isContrarian) return false;
      if (quadrantFilter === 'FEAR' && !isFear) return false;
      if (quadrantFilter === 'HEDGED RALLY' && !isHedged) return false;
      if (quadrantFilter === 'CHASE' && !isChase) return false;
      if (quadrantFilter === 'WATCHLIST' && !isWatchlist) return false;

      return true;
    });
  }, [records, horizon, quadrantFilter, watchlist]);

  // Outlier filtered dataset for clean visual presentation
  const chartDisplayRecords = useMemo(() => {
    if (!hideOutliers) return filteredRecords;
    return filteredRecords.filter((r) => Math.abs(getReturn(r)) <= 50 || watchlist.has(r.ticker));
  }, [filteredRecords, hideOutliers, horizon, watchlist]);

  // Calculate dynamic axis domains with zoom and pan without hard-clamping to 40%
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    let maxRet = 15;
    let maxSkew = 18;

    chartDisplayRecords.forEach((r) => {
      const ret = Math.abs(getReturn(r));
      const skew = Math.abs(r.skew);
      const limitRet = hideOutliers ? 50 : 85;
      if (ret > maxRet && ret <= limitRet) maxRet = ret;
      if (skew > maxSkew && skew <= 32) maxSkew = skew;
    });

    // Dynamic span: scales with dataset up to 85% without artificial walls
    const rawSpanX = hideOutliers
      ? Math.min(50, Math.max(18, Math.ceil(maxRet * 1.1)))
      : Math.min(85, Math.max(25, Math.ceil(maxRet * 1.15)));
    const rawSpanY = Math.min(32, Math.max(18, Math.ceil(maxSkew * 1.15)));

    const spanX = rawSpanX / zoomLevel;
    const spanY = rawSpanY / zoomLevel;

    // Apply pan offset
    const centerX = panOffset.x * (spanX / 100);
    const centerY = panOffset.y * (spanY / 100);

    return {
      xMin: -spanX + centerX,
      xMax: spanX + centerX,
      yMin: -spanY + centerY,
      yMax: spanY + centerY,
    };
  }, [chartDisplayRecords, horizon, zoomLevel, panOffset, hideOutliers]);

  // SVG Coordinates mapping - TRUE MATHEMATICAL SCALING WITHOUT ARTIFICIAL BORDER CLAMPING
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };
  const innerWidth = dimensions.width - margin.left - margin.right;
  const innerHeight = dimensions.height - margin.top - margin.bottom;

  const scaleX = (val: number) => {
    // Unclamped: off-screen points plot off-screen and are clipped, NOT pinned to border
    return margin.left + ((val - xMin) / (xMax - xMin)) * innerWidth;
  };

  const scaleY = (val: number) => {
    // Invert Y axis so positive skew is at top
    return margin.top + innerHeight - ((val - yMin) / (yMax - yMin)) * innerHeight;
  };

  const zeroX = scaleX(0);
  const zeroY = scaleY(0);

  // Generate grid ticks
  const xTicks = useMemo(() => {
    const range = xMax - xMin;
    const step = range > 60 ? 20 : range > 30 ? 10 : 5;
    const ticks: number[] = [];
    const start = Math.ceil(xMin / step) * step;
    for (let t = start; t <= xMax; t += step) {
      if (Math.abs(t) < 0.001) continue; // skip 0 as it has the main zero line
      ticks.push(t);
    }
    return ticks;
  }, [xMin, xMax]);

  const yTicks = useMemo(() => {
    const range = yMax - yMin;
    const step = range > 80 ? 20 : range > 40 ? 10 : 5;
    const ticks: number[] = [];
    const start = Math.ceil(yMin / step) * step;
    for (let t = start; t <= yMax; t += step) {
      if (Math.abs(t) < 0.001) continue;
      ticks.push(t);
    }
    return ticks;
  }, [yMin, yMax]);

  // Handle Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setPanOffset((prev) => ({
        x: prev.x - (dx / innerWidth) * 50,
        y: prev.y + (dy / innerHeight) * 50,
      }));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const resetView = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Search match helper
  const isSearchMatch = (r: RadarRecord) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase();
    return (
      r.ticker.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.sector.toLowerCase().includes(q)
    );
  };

  return (
    <div className="relative bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden select-none">
      {/* Chart Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/70 border-b border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">
            Options Skew vs. Price Positioning Map
          </span>
          <span className="hidden sm:inline font-mono-nums text-[11px] text-slate-400">
            X: {horizonLabel} Return % · Y: Normalized 25Δ Skew %
          </span>
        </div>

        {/* Outliers & Zoom Controls */}
        <div className="flex items-center gap-2">
          {outlierCount > 0 && (
            <button
              type="button"
              onClick={() => setHideOutliers((prev) => !prev)}
              className={`px-2 py-0.5 text-[11px] rounded-md border font-medium transition-colors inline-flex items-center gap-1.5 ${
                hideOutliers
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title={hideOutliers ? "Click to expand x-axis and plot extreme outliers" : "Click to hide extreme outliers (> ±50%)"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hideOutliers ? 'bg-amber-500' : 'bg-slate-400'}`} />
              <span>{hideOutliers ? `Filtered ${outlierCount} Outliers (> ±50%)` : `Showing All (${outlierCount} Outliers)`}</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z * 1.25, 4.0))}
              title="Zoom In"
              className="p-1 hover:bg-white hover:text-slate-900 rounded border border-transparent hover:border-slate-200 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z / 1.25, 0.5))}
              title="Zoom Out"
              className="p-1 hover:bg-white hover:text-slate-900 rounded border border-transparent hover:border-slate-200 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetView}
              title="Reset View"
              className="p-1 hover:bg-white hover:text-slate-900 rounded border border-transparent hover:border-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        className="w-full relative cursor-crosshair overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoveredRecord(null);
        }}
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="block"
        >
          <defs>
            {/* Contrarian Bid Quadrant Soft Emerald Gradient */}
            <linearGradient id="contrarianGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.09" />
            </linearGradient>

            {/* Pulsing glow filter for searched ticker */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Clip path for scatter points: keeps points inside plot area cleanly without edge clamping */}
            <clipPath id="radarPlotClip">
              <rect
                x={margin.left}
                y={margin.top}
                width={innerWidth}
                height={innerHeight}
              />
            </clipPath>
          </defs>

          {/* 1. Subtle Shaded Background for Bottom-Left (CONTRARIAN BID) Quadrant: X < 0, Y < 0 */}
          {zeroX > margin.left && zeroY < margin.top + innerHeight && (
            <rect
              x={margin.left}
              y={Math.max(zeroY, margin.top)}
              width={Math.max(0, Math.min(zeroX - margin.left, innerWidth))}
              height={Math.max(0, Math.min(margin.top + innerHeight - zeroY, innerHeight))}
              fill="url(#contrarianGradient)"
              stroke="#10B981"
              strokeWidth="0.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          )}

          {/* 2. Grid Lines: Vertical */}
          {xTicks.map((tick) => {
            const x = scaleX(tick);
            if (x < margin.left || x > margin.left + innerWidth) return null;
            return (
              <g key={`x-${tick}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + innerHeight}
                  stroke="#E2E8F0"
                  strokeWidth="0.8"
                />
                <text
                  x={x}
                  y={margin.top + innerHeight + 16}
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                  className="tabular-nums"
                >
                  {tick > 0 ? `+${tick}%` : `${tick}%`}
                </text>
              </g>
            );
          })}

          {/* Grid Lines: Horizontal */}
          {yTicks.map((tick) => {
            const y = scaleY(tick);
            if (y < margin.top || y > margin.top + innerHeight) return null;
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + innerWidth}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="0.8"
                />
                <text
                  x={margin.left - 8}
                  y={y + 3.5}
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="end"
                  className="tabular-nums"
                >
                  {tick > 0 ? `+${tick}%` : `${tick}%`}
                </text>
              </g>
            );
          })}

          {/* 3. Solid Zero Axis Lines (Crosshairs at X=0 and Y=0) */}
          {zeroX >= margin.left && zeroX <= margin.left + innerWidth && (
            <line
              x1={zeroX}
              y1={margin.top}
              x2={zeroX}
              y2={margin.top + innerHeight}
              stroke="#94A3B8"
              strokeWidth="1.6"
            />
          )}
          {zeroY >= margin.top && zeroY <= margin.top + innerHeight && (
            <line
              x1={margin.left}
              y1={zeroY}
              x2={margin.left + innerWidth}
              y2={zeroY}
              stroke="#94A3B8"
              strokeWidth="1.6"
            />
          )}

          {/* 4. Large Watermark Quadrant Titles in Corners */}
          {/* Top-Left: FEAR */}
          <g transform={`translate(${margin.left + 16}, ${margin.top + 28})`}>
            <text
              fill="#94A3B8"
              opacity="0.32"
              fontSize="20"
              fontWeight="700"
              fontFamily="Plus Jakarta Sans"
              letterSpacing="0.05em"
            >
              FEAR
            </text>
            <text
              y="16"
              fill="#94A3B8"
              opacity="0.45"
              fontSize="10"
              fontFamily="Plus Jakarta Sans"
            >
              Downside Protection Bid · Avoid Knife
            </text>
          </g>

          {/* Top-Right: HEDGED RALLY */}
          <g transform={`translate(${margin.left + innerWidth - 16}, ${margin.top + 28})`}>
            <text
              fill="#94A3B8"
              opacity="0.32"
              fontSize="20"
              fontWeight="700"
              fontFamily="Plus Jakarta Sans"
              letterSpacing="0.05em"
              textAnchor="end"
            >
              HEDGED RALLY
            </text>
            <text
              y="16"
              fill="#94A3B8"
              opacity="0.45"
              fontSize="10"
              fontFamily="Plus Jakarta Sans"
              textAnchor="end"
            >
              Rally Distrusted · Tighten Stops
            </text>
          </g>

          {/* Bottom-Left: CONTRARIAN BID (Highlighted) */}
          <g transform={`translate(${margin.left + 16}, ${margin.top + innerHeight - 34})`}>
            <text
              fill="#059669"
              opacity="0.55"
              fontSize="20"
              fontWeight="700"
              fontFamily="Plus Jakarta Sans"
              letterSpacing="0.05em"
            >
              CONTRARIAN BID ★
            </text>
            <text
              y="16"
              fill="#059669"
              opacity="0.80"
              fontSize="10.5"
              fontWeight="600"
              fontFamily="Plus Jakarta Sans"
            >
              Stock Down, Calls Bid · Institutional Accumulation
            </text>
          </g>

          {/* Bottom-Right: CHASE */}
          <g transform={`translate(${margin.left + innerWidth - 16}, ${margin.top + innerHeight - 34})`}>
            <text
              fill="#94A3B8"
              opacity="0.32"
              fontSize="20"
              fontWeight="700"
              fontFamily="Plus Jakarta Sans"
              letterSpacing="0.05em"
              textAnchor="end"
            >
              CHASE
            </text>
            <text
              y="16"
              fill="#94A3B8"
              opacity="0.45"
              fontSize="10"
              fontFamily="Plus Jakarta Sans"
              textAnchor="end"
            >
              Momentum Confirmed · Crowded
            </text>
          </g>

          {/* 5. Axis Labels */}
          <text
            x={margin.left + innerWidth / 2}
            y={dimensions.height - 12}
            fill="#475569"
            fontSize="11"
            fontWeight="600"
            fontFamily="Plus Jakarta Sans"
            textAnchor="middle"
          >
            Price Return ({horizonLabel}) %
          </text>
          <text
            transform={`rotate(-90)`}
            x={-(margin.top + innerHeight / 2)}
            y="18"
            fill="#475569"
            fontSize="11"
            fontWeight="600"
            fontFamily="Plus Jakarta Sans"
            textAnchor="middle"
          >
            Options Skew % [(IV₂₅Δ Put - IV₂₅Δ Call) / IV_ATM]
          </text>

          {/* 6. Render Stock Data Markers Inside ClipPath */}
          <g clipPath="url(#radarPlotClip)">
            {/* Layer A: Regular Covered Names (Light blue solid or hollow) */}
            {chartDisplayRecords
              .filter((r) => !watchlist.has(r.ticker))
              .map((r) => {
                const ret = getReturn(r);
                const cx = scaleX(ret);
                const cy = scaleY(r.skew);

                if (cx < margin.left - 10 || cx > margin.left + innerWidth + 10 || cy < margin.top - 10 || cy > margin.top + innerHeight + 10) {
                  return null;
                }

                const isMatch = isSearchMatch(r);
                const isSelected = selectedTicker === r.ticker;
                const isThin = r.thin;

                return (
                  <g
                    key={r.ticker}
                    className="cursor-pointer transition-transform duration-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStock(r);
                    }}
                    onMouseEnter={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                      }
                      setHoveredRecord(r);
                    }}
                    onMouseLeave={() => setHoveredRecord(null)}
                  >
                    {/* Search highlight halo */}
                    {isMatch && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="14"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        className="animate-spin"
                      />
                    )}

                    {/* Marker Circle: Solid or Hollow */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 7 : 5}
                      fill={isThin ? '#FFFFFF' : '#93C5FD'}
                      stroke={isSelected ? '#1D4ED8' : '#60A5FA'}
                      strokeWidth={isThin ? 2 : 1}
                      opacity={isSelected ? 1 : 0.85}
                    />
                  </g>
                );
              })}

            {/* Layer B: Watchlist Names (Yellow dots with same size and hover effects as blue dots, without name tag) */}
            {chartDisplayRecords
              .filter((r) => watchlist.has(r.ticker))
              .map((r) => {
                const ret = getReturn(r);
                const cx = scaleX(ret);
                const cy = scaleY(r.skew);

                if (cx < margin.left - 10 || cx > margin.left + innerWidth + 10 || cy < margin.top - 10 || cy > margin.top + innerHeight + 10) {
                  return null;
                }

                const isMatch = isSearchMatch(r);
                const isSelected = selectedTicker === r.ticker;
                const isThin = r.thin;

                return (
                  <g
                    key={`watchlist-${r.ticker}`}
                    className="cursor-pointer transition-transform duration-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStock(r);
                    }}
                    onMouseEnter={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                      }
                      setHoveredRecord(r);
                    }}
                    onMouseLeave={() => setHoveredRecord(null)}
                  >
                    {/* Search highlight halo */}
                    {isMatch && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="14"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        className="animate-spin"
                      />
                    )}

                    {/* Marker Circle: Same size as blue dots (r={isSelected ? 7 : 5}), but yellow */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 7 : 5}
                      fill={isThin ? '#FFFFFF' : '#EAB308'}
                      stroke={isSelected ? '#A16207' : '#CA8A04'}
                      strokeWidth={isThin ? 2 : 1}
                      opacity={isSelected ? 1 : 0.95}
                    />
                  </g>
                );
              })}
          </g>
        </svg>

        {/* Hover Tooltip Overlay Card */}
        {hoveredRecord && (
          <div
            className="absolute z-40 pointer-events-none bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700/80 text-xs backdrop-blur-sm min-w-[240px] transition-opacity duration-75"
            style={{
              left: Math.min(mousePos.x + 14, dimensions.width - 260),
              top: Math.min(mousePos.y - 10, dimensions.height - 180),
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1.5 mb-2">
              <div>
                <span className="font-mono font-bold text-sm text-amber-400">
                  {hoveredRecord.ticker}
                </span>
                <span className="text-[11px] text-slate-300 ml-1.5">
                  {hoveredRecord.name}
                </span>
              </div>
              <span className="font-mono font-semibold text-slate-100">
                ${hoveredRecord.price.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1 font-mono-nums text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">{horizonLabel} Return:</span>
                <span
                  className={
                    getReturn(hoveredRecord) >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'
                  }
                >
                  {getReturn(hoveredRecord) >= 0 ? '+' : ''}
                  {getReturn(hoveredRecord).toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Normalized Skew:</span>
                <span
                  className={
                    hoveredRecord.skew < 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }
                >
                  {hoveredRecord.skew >= 0 ? '+' : ''}
                  {hoveredRecord.skew.toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">ATM IV:</span>
                <span className="text-slate-200">{hoveredRecord.atm_iv.toFixed(1)}%</span>
              </div>

              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Put 25Δ: {hoveredRecord.put_25_iv.toFixed(1)}%</span>
                <span>Call 25Δ: {hoveredRecord.call_25_iv.toFixed(1)}%</span>
              </div>

              <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px]">
                <span className="text-slate-400">Target DTE:</span>
                <span className="text-slate-300">
                  {hoveredRecord.dte} days ({hoveredRecord.expiration})
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 text-[10px]">
                <span className="text-slate-400">Liquidity:</span>
                <span
                  className={
                    hoveredRecord.thin ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'
                  }
                >
                  {hoveredRecord.thin ? '⚠️ Thin Chain (Hollow)' : '✓ Institutional Liquid'}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 text-center">
              Click node to open Greeks & Skew Curve inspector
            </div>
          </div>
        )}
      </div>

      {/* Institutional Legend Bar below chart */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#93C5FD] border border-[#60A5FA]" />
            <span>Covered Universe ({records.length - watchlist.size})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EAB308] border border-[#CA8A04]" />
            <span className="font-semibold text-amber-900">
              Watchlist Names ({watchlist.size})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-white border-2 border-slate-400" />
            <span className="text-slate-500">Thin Chain (Hollow: Vol &lt; 5 or OI &lt; 30)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-100 border border-emerald-400 rounded-xs" />
            <span className="text-emerald-800 font-semibold">Contrarian Bid Focus Box</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono-nums">
          Drag to Pan · Scroll / Controls to Zoom
        </div>
      </div>
    </div>
  );
};
