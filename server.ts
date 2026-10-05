import express from 'express';
import path from 'path';
import fs from 'fs';
import { scanLiveTicker, batchFetchLiveQuotes, getQuadrant } from './src/server/yahooScanner.ts';
import { RadarRecord } from './src/types/radar.ts';

const PORT = 3000;
const RADAR_JSON_PATH = path.resolve(process.cwd(), 'radar_data.json');

async function startServer() {
  const app = express();
  app.use(express.json());

  // In-memory cache of live radar records
  let cachedPayload: any = null;

  function loadRadarData() {
    try {
      if (fs.existsSync(RADAR_JSON_PATH)) {
        const raw = fs.readFileSync(RADAR_JSON_PATH, 'utf-8');
        cachedPayload = JSON.parse(raw);
      }
    } catch (e: any) {
      console.error('Error loading radar_data.json:', e.message);
    }
  }

  loadRadarData();

  // API 1: GET /api/radar - Get current live radar data
  app.get('/api/radar', (req, res) => {
    if (!cachedPayload || !cachedPayload.records || cachedPayload.records.length < 500) {
      loadRadarData();
    }
    if (!cachedPayload || !cachedPayload.records) {
      return res.status(503).json({ error: 'Radar data initializing' });
    }

    const category = (req.query.category as string || 'ALL').toUpperCase();
    let records = cachedPayload.records;

    if (category === 'INSTITUTIONAL') {
      records = records.filter((r: RadarRecord) => r.isInstitutional);
    } else if (category === 'SP500') {
      records = records.filter((r: RadarRecord) => r.isSP500);
    } else if (category === 'SMALL_MID') {
      records = records.filter((r: RadarRecord) => r.capCategory === 'small_mid');
    } else if (category === 'ETF') {
      records = records.filter((r: RadarRecord) => r.capCategory === 'etf');
    }

    const counts = {
      total: cachedPayload.records.length,
      institutional: cachedPayload.records.filter((r: RadarRecord) => r.isInstitutional).length,
      sp500: cachedPayload.records.filter((r: RadarRecord) => r.isSP500).length,
      small_mid: cachedPayload.records.filter((r: RadarRecord) => r.capCategory === 'small_mid').length,
      etf: cachedPayload.records.filter((r: RadarRecord) => r.capCategory === 'etf').length,
    };

    return res.json({
      metadata: {
        ...cachedPayload.metadata,
        total_scanned: cachedPayload.records.length,
        filtered_count: records.length,
        counts,
      },
      records,
    });
  });

  // API 2: GET /api/scan-ticker?ticker=XYZ - Live scan any ticker from Yahoo Finance
  app.get('/api/scan-ticker', async (req, res) => {
    const ticker = (req.query.ticker as string || '').trim().toUpperCase();
    if (!ticker) {
      return res.status(400).json({ error: 'Ticker query param required' });
    }

    try {
      console.log(`[API] Live scanning ticker: ${ticker} from Yahoo Finance...`);
      const record = await scanLiveTicker(ticker);
      if (!record) {
        return res.status(404).json({ error: `Could not fetch live options chain for ${ticker}` });
      }

      // Update in-memory cache and file
      if (cachedPayload && cachedPayload.records) {
        const existingIdx = cachedPayload.records.findIndex((r: RadarRecord) => r.ticker === ticker);
        if (existingIdx >= 0) {
          record.isSP500 = cachedPayload.records[existingIdx].isSP500;
          record.capCategory = cachedPayload.records[existingIdx].capCategory;
          record.isInstitutional = cachedPayload.records[existingIdx].isInstitutional;
          record.marketCap = cachedPayload.records[existingIdx].marketCap;
          record.adv = cachedPayload.records[existingIdx].adv;
          cachedPayload.records[existingIdx] = record;
        } else {
          record.isInstitutional = (record.price >= 5 && record.oi_25delta >= 100 && record.volume_25delta >= 20);
          cachedPayload.records.unshift(record);
        }
        cachedPayload.metadata.total_scanned = cachedPayload.records.length;
        cachedPayload.metadata.scan_timestamp = new Date().toISOString();

        // Write async to disk
        fs.writeFile(RADAR_JSON_PATH, JSON.stringify(cachedPayload, null, 2), () => {});
      }

      return res.json({ success: true, record });
    } catch (err: any) {
      console.error(`[API] Error scanning ${ticker}:`, err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // API 3: POST /api/rescan - Trigger fresh live rescan of market quotes and options chains
  app.post('/api/rescan', async (req, res) => {
    if (!cachedPayload || !cachedPayload.records || cachedPayload.records.length < 500) {
      loadRadarData();
    }

    const userWatchlist: string[] = Array.isArray(req.body.watchlist)
      ? req.body.watchlist
      : Array.isArray(req.body.tickers)
      ? req.body.tickers
      : [];

    console.log(`[API] Rescan initiated. Active watchlist: [${userWatchlist.join(', ')}]. Total database records: ${cachedPayload?.records?.length || 0}`);

    // Step 1: Batch fetch latest real-time / delayed quotes across all symbols in universe
    let quotesUpdatedCount = 0;
    try {
      if (cachedPayload && cachedPayload.records) {
        const allSymbols = cachedPayload.records.map((r: RadarRecord) => r.ticker);
        console.log(`[API] Batch fetching live market quotes for ${allSymbols.length} equities from Yahoo Finance...`);
        const quotesMap = await batchFetchLiveQuotes(allSymbols);
        quotesUpdatedCount = quotesMap.size;

        // Update price, returns, and quadrants for all records
        for (const record of cachedPayload.records) {
          const q = quotesMap.get(record.ticker);
          if (q && q.regularMarketPrice) {
            record.price = parseFloat(q.regularMarketPrice.toFixed(2));
            if (q.regularMarketChangePercent !== undefined && q.regularMarketChangePercent !== null) {
              record.ret_1d = parseFloat(q.regularMarketChangePercent.toFixed(2));
            }
            record.quadrant_1d = getQuadrant(record.ret_1d, record.skew);
            record.quadrant_1w = getQuadrant(record.ret_1w, record.skew);
            record.quadrant_1m = getQuadrant(record.ret_1m, record.skew);
            record.updated_at = new Date().toISOString();
          }
        }
        console.log(`[API] Successfully updated quotes for ${quotesUpdatedCount} equities!`);
      }
    } catch (e: any) {
      console.warn('[API] Batch quote update warning:', e.message);
    }

    // Step 2: Live Options Chains & Greeks Rescan
    // Always scan user's watchlist tickers, plus key active liquid market bellwethers
    const priorityOptionsTickers: string[] = Array.from(new Set([
      ...userWatchlist,
      'IONQ', 'LUNR', 'RDW', 'ACHR', 'ONDS', 'RGTI', 'PLTR', 'SMCI',
      'NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMD', 'COIN', 'MSTR', 'SOFI'
    ])).slice(0, 16);

    console.log(`[API] Scanning live options chains & analytical Greeks for ${priorityOptionsTickers.length} tickers...`);
    const optionsUpdatedList: RadarRecord[] = [];

    // Scan in chunks of 3 for fast throughput
    for (let i = 0; i < priorityOptionsTickers.length; i += 3) {
      const chunk = priorityOptionsTickers.slice(i, i + 3);
      const promises = chunk.map(async (t) => {
        try {
          const rec = await scanLiveTicker(t);
          if (rec) {
            optionsUpdatedList.push(rec);
            if (cachedPayload && cachedPayload.records) {
              const idx = cachedPayload.records.findIndex((r: RadarRecord) => r.ticker === t);
              if (idx >= 0) {
                // Preserve category classification flags
                rec.isSP500 = cachedPayload.records[idx].isSP500;
                rec.capCategory = cachedPayload.records[idx].capCategory;
                rec.isInstitutional = cachedPayload.records[idx].isInstitutional;
                rec.marketCap = cachedPayload.records[idx].marketCap;
                rec.adv = cachedPayload.records[idx].adv;
                cachedPayload.records[idx] = rec;
              } else {
                cachedPayload.records.unshift(rec);
              }
            }
          }
        } catch (e: any) {
          console.warn(`[API] Options scan error for ${t}:`, e.message);
        }
      });
      await Promise.all(promises);
      await new Promise((r) => setTimeout(r, 100));
    }

    // Step 3: Update timestamp and save to disk
    if (cachedPayload) {
      cachedPayload.metadata.scan_timestamp = new Date().toISOString();
      try {
        fs.writeFileSync(RADAR_JSON_PATH, JSON.stringify(cachedPayload, null, 2));
        const frontPath = path.resolve(process.cwd(), 'src/data/radar_data.json');
        if (fs.existsSync(path.dirname(frontPath))) {
          fs.writeFileSync(frontPath, JSON.stringify(cachedPayload, null, 2));
        }
      } catch (err: any) {
        console.warn('Error saving rescan data:', err.message);
      }
    }

    return res.json({
      success: true,
      message: `Successfully rescanned latest market prices for ${quotesUpdatedCount} stocks and live options chains for ${optionsUpdatedList.length} tickers directly from Yahoo Finance`,
      quotesUpdatedCount,
      optionsUpdatedCount: optionsUpdatedList.length,
      scanTimestamp: cachedPayload?.metadata?.scan_timestamp || new Date().toISOString(),
      records: cachedPayload?.records || [],
      rescanned: optionsUpdatedList,
    });
  });

  // Mount Vite or static build
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    // Mount Vite middleware in dev
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Name Radar server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
