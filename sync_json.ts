import fs from 'fs';
import { COMPLETE_RADAR_DATA } from './src/data/extendedUniverse';

const payload = {
  metadata: {
    total_scanned: COMPLETE_RADAR_DATA.length,
    successful_records: COMPLETE_RADAR_DATA.length,
    failed_records: 0,
    scan_timestamp: "2026-09-30T14:00:00Z",
    target_horizon: "30-45 DTE",
    formula: "Skew = (IV_25d_put - IV_25d_call) / IV_atm * 100",
    description: "Institutional options skew vs stock price positioning database across 1D, 1W, and 1M horizons."
  },
  records: COMPLETE_RADAR_DATA
};

fs.writeFileSync('./radar_data.json', JSON.stringify(payload, null, 2));
fs.writeFileSync('./src/data/radar_data.json', JSON.stringify(payload, null, 2));
console.log(`Synced radar_data.json with ${COMPLETE_RADAR_DATA.length} records!`);
