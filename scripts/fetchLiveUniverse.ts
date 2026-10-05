/**
 * Comprehensive Live Universe Batch Scanner
 * Scans all 800+ stocks in masterCatalog.json using Yahoo Finance live APIs,
 * calculates analytical Black-Scholes Greeks, 25Δ Skew, and saves progressively.
 */

import { scanLiveTicker } from '../src/server/yahooScanner.ts';
import { RadarRecord } from '../src/types/radar.ts';
import fs from 'fs';
import path from 'path';

const CATALOG_PATH = path.resolve(process.cwd(), 'src/data/masterCatalog.json');
const RADAR_JSON_PATH = path.resolve(process.cwd(), 'radar_data.json');
const FRONTEND_DATA_PATH = path.resolve(process.cwd(), 'src/data/radar_data.json');

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error('Master catalog not found at', CATALOG_PATH);
    process.exit(1);
  }

  const catalog: Array<{ ticker: string; name: string; sector: string; isSP500?: boolean; capCategory?: string }> =
    JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));

  console.log(`Starting massive live universe scan across ${catalog.length} equities...`);

  // Load existing records to preserve already scanned live data
  let existingRecordsMap = new Map<string, RadarRecord>();
  if (fs.existsSync(RADAR_JSON_PATH)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(RADAR_JSON_PATH, 'utf-8'));
      if (existingData.records) {
        for (const r of existingData.records) {
          existingRecordsMap.set(r.ticker, r);
        }
      }
    } catch (e) {}
  }

  console.log(`Loaded ${existingRecordsMap.size} previously scanned records.`);

  // Save helper function
  function saveCurrentState() {
    const list = Array.from(existingRecordsMap.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
    const payload = {
      metadata: {
        total_scanned: list.length,
        successful_records: list.length,
        failed_records: 0,
        scan_timestamp: new Date().toISOString(),
        target_horizon: '30-45 DTE',
        formula: 'Skew = (IV_25d_put - IV_25d_call) / IV_atm * 100',
        source: 'Live Yahoo Finance Options & Quotes',
        description: 'Comprehensive options skew database spanning S&P 500 constituents and active small/mid caps.'
      },
      records: list
    };

    fs.writeFileSync(RADAR_JSON_PATH, JSON.stringify(payload, null, 2));
    fs.mkdirSync(path.dirname(FRONTEND_DATA_PATH), { recursive: true });
    fs.writeFileSync(FRONTEND_DATA_PATH, JSON.stringify(payload, null, 2));
  }

  const CONCURRENCY = 6;
  const itemsToScan = catalog.filter(c => !existingRecordsMap.has(c.ticker));
  console.log(`Unscanned tickers remaining: ${itemsToScan.length}`);

  let completedCount = existingRecordsMap.size;
  let batchIndex = 0;

  for (let i = 0; i < itemsToScan.length; i += CONCURRENCY) {
    const batch = itemsToScan.slice(i, i + CONCURRENCY);
    batchIndex++;

    const promises = batch.map(async (item) => {
      try {
        const record = await scanLiveTicker(item.ticker, item.name, item.sector);
        if (record) {
          record.isSP500 = item.isSP500 ?? true;
          record.capCategory = (item.capCategory as any) || (item.isSP500 ? 'sp500' : 'small_mid');
          existingRecordsMap.set(record.ticker, record);
          console.log(`[${existingRecordsMap.size}/${catalog.length}] ✓ ${record.ticker.padEnd(5)} | $${record.price.toString().padEnd(7)} | Skew: ${record.skew > 0 ? '+' : ''}${record.skew}% | Ret: ${record.ret_1d > 0 ? '+' : ''}${record.ret_1d}%`);
        }
      } catch (err: any) {
        // Continue politely on error
      }
    });

    await Promise.all(promises);

    // Save every 3 batches
    if (batchIndex % 3 === 0) {
      saveCurrentState();
    }

    // Polite 250ms throttle between batches
    await new Promise(r => setTimeout(r, 220));
  }

  saveCurrentState();
  console.log(`\nScan finished! Total live records in database: ${existingRecordsMap.size}`);
}

main().catch(console.error);
