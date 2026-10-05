/**
 * Live Yahoo Finance Options Skew & Price Positioning Engine
 * Fetches real-time / delayed quotes and options chains directly from Yahoo Finance,
 * manages session cookies & crumbs, computes analytical Black-Scholes Greeks,
 * and normalizes skew across 30-45 DTE horizons.
 */

import { calculateBSDelta, normCdf, calculateImpliedVolatility } from '../utils/blackScholes.ts';
import { RadarRecord, QuadrantType } from '../types/radar.ts';
import fs from 'fs';
import path from 'path';

interface YahooSession {
  cookie: string | null;
  crumb: string | null;
  expiresAt: number;
}

let session: YahooSession = {
  cookie: null,
  crumb: null,
  expiresAt: 0,
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export async function getYahooSession(): Promise<{ cookie: string; crumb: string }> {
  const now = Date.now();
  if (session.cookie && session.crumb && session.expiresAt > now) {
    return { cookie: session.cookie, crumb: session.crumb };
  }

  try {
    // 1. Get Cookie from fc.yahoo.com
    const res1 = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'manual',
    });
    const cookie = res1.headers.get('set-cookie');
    if (!cookie) {
      throw new Error('Failed to obtain set-cookie from Yahoo Finance');
    }

    // 2. Get Crumb using cookie
    const res2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: cookie,
      },
    });
    if (!res2.ok) {
      throw new Error(`Failed to obtain crumb: status ${res2.status}`);
    }
    const crumb = (await res2.text()).trim();

    session = {
      cookie,
      crumb,
      expiresAt: now + 3600 * 1000, // 1 hour TTL
    };

    return { cookie, crumb };
  } catch (err: any) {
    console.error('Error establishing Yahoo Finance session:', err.message);
    // Return existing session if available
    if (session.cookie && session.crumb) {
      return { cookie: session.cookie, crumb: session.crumb };
    }
    throw err;
  }
}

export function getQuadrant(ret: number, skew: number): QuadrantType {
  if (ret < 0 && skew > 0) return 'FEAR';
  if (ret >= 0 && skew > 0) return 'HEDGED RALLY';
  if (ret < 0 && skew <= 0) return 'CONTRARIAN BID';
  return 'CHASE';
}

export async function scanLiveTicker(ticker: string, companyName?: string, sector?: string): Promise<RadarRecord | null> {
  const cleanTicker = ticker.trim().toUpperCase();
  try {
    const { cookie, crumb } = await getYahooSession();

    // 1. Fetch 1-month daily chart to calculate live returns (1D, 5D, 21D)
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?range=1mo&interval=1d`;
    const chartRes = await fetch(chartUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!chartRes.ok) {
      console.warn(`[${cleanTicker}] Chart endpoint returned ${chartRes.status}`);
      return null;
    }

    const chartJson = await chartRes.json();
    const chartResult = chartJson.chart?.result?.[0];
    if (!chartResult) return null;

    const meta = chartResult.meta;
    const currentPrice = meta.regularMarketPrice || meta.chartPreviousClose || 0;
    if (currentPrice <= 0) return null;

    const shortName = companyName || meta.shortName || meta.symbol;
    const closes: number[] = (chartResult.indicators?.quote?.[0]?.close || []).filter(
      (c: any): c is number => typeof c === 'number' && !isNaN(c)
    );

    // Calculate 1D, 1W (5 days), 1M (21 days) percent returns
    const len = closes.length;
    let ret1d = 0;
    let ret1w = 0;
    let ret1m = 0;

    if (len >= 2) {
      ret1d = parseFloat((((currentPrice / closes[len - 2]) - 1.0) * 100).toFixed(2));
    }
    if (len >= 6) {
      ret1w = parseFloat((((currentPrice / closes[len - 6]) - 1.0) * 100).toFixed(2));
    } else {
      ret1w = ret1d;
    }
    if (len >= 22) {
      ret1m = parseFloat((((currentPrice / closes[0]) - 1.0) * 100).toFixed(2));
    } else if (len >= 10) {
      ret1m = parseFloat((((currentPrice / closes[0]) - 1.0) * 100).toFixed(2));
    } else {
      ret1m = ret1w;
    }

    // 2. Fetch Options Chain overview to find target expiration (25-45 DTE)
    const baseOptUrl = `https://query2.finance.yahoo.com/v7/finance/options/${cleanTicker}?crumb=${encodeURIComponent(crumb)}`;
    const optRes = await fetch(baseOptUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: cookie,
      },
    });

    if (!optRes.ok) {
      console.warn(`[${cleanTicker}] Options endpoint returned ${optRes.status}`);
      return null;
    }

    const optJson = await optRes.json();
    const chainResult = optJson.optionChain?.result?.[0];
    if (!chainResult) return null;

    const expirationDates: number[] = chainResult.expirationDates || [];
    if (expirationDates.length === 0) {
      console.warn(`[${cleanTicker}] No options expiration dates available`);
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    let targetExpDateSec: number | null = null;
    let targetDte = 0;
    let minDiffFrom35 = Infinity;

    // Pick expiration closest to 35 days (within 25 to 45 days)
    for (const expSec of expirationDates) {
      const dte = Math.round((expSec - nowSec) / 86400);
      if (dte >= 25 && dte <= 45) {
        const diff = Math.abs(dte - 35);
        if (diff < minDiffFrom35) {
          minDiffFrom35 = diff;
          targetExpDateSec = expSec;
          targetDte = dte;
        }
      }
    }

    // Fallback: closest within 14 to 60 days
    if (!targetExpDateSec) {
      let closestDiff = Infinity;
      for (const expSec of expirationDates) {
        const dte = Math.round((expSec - nowSec) / 86400);
        if (dte >= 14 && dte <= 65) {
          const diff = Math.abs(dte - 35);
          if (diff < closestDiff) {
            closestDiff = diff;
            targetExpDateSec = expSec;
            targetDte = dte;
          }
        }
      }
    }

    if (!targetExpDateSec) {
      targetExpDateSec = expirationDates[0];
      targetDte = Math.max(1, Math.round((targetExpDateSec - nowSec) / 86400));
    }

    // Fetch the specific expiration chain if not already returned
    let currentOption = chainResult.options?.[0];
    const initialExpSec = currentOption?.expirationDate;

    if (initialExpSec !== targetExpDateSec) {
      const specificOptUrl = `https://query2.finance.yahoo.com/v7/finance/options/${cleanTicker}?date=${targetExpDateSec}&crumb=${encodeURIComponent(crumb)}`;
      const specificRes = await fetch(specificOptUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Cookie: cookie,
        },
      });
      if (specificRes.ok) {
        const specificJson = await specificRes.json();
        const specChain = specificJson.optionChain?.result?.[0]?.options?.[0];
        if (specChain) {
          currentOption = specChain;
        }
      }
    }

    const calls = currentOption?.calls || [];
    const puts = currentOption?.puts || [];

    if (calls.length === 0 || puts.length === 0) {
      console.warn(`[${cleanTicker}] Missing calls or puts for ${cleanTicker}`);
      return null;
    }

    const T = targetDte / 365.0;
    const r = 0.045; // 4.5% risk-free rate

    // Filter valid strikes with robust quote & midpoint checking
    const cleanQuoteFilter = (c: any) => {
      const bid = Number(c.bid || 0);
      const ask = Number(c.ask || 0);
      const iv = Number(c.impliedVolatility || 0);
      // Discard stale zero-bid quotes with wide asks (Yahoo Finance ghost quotes)
      if (bid <= 0 && ask > 0.15) return false;
      if (iv <= 0.01 && bid <= 0) return false;
      return true;
    };

    const validCalls = calls.filter(cleanQuoteFilter);
    const validPuts = puts.filter(cleanQuoteFilter);

    if (validCalls.length === 0 || validPuts.length === 0) return null;

    // Helper: compute clean midpoint price
    const getCleanMidPrice = (c: any): number => {
      const bid = Number(c.bid || 0);
      const ask = Number(c.ask || 0);
      if (bid > 0 && ask > 0) {
        return (bid + ask) / 2;
      }
      if (bid > 0) return bid;
      if (ask > 0 && ask <= 0.15) return ask / 2;
      return Number(c.lastPrice || 0);
    };

    // Calculate analytical BS Delta for all calls
    const callsWithDelta = validCalls.map((c: any) => {
      const strike = Number(c.strike);
      let iv = Number(c.impliedVolatility || 0);
      const marketPrice = getCleanMidPrice(c);
      if ((iv < 0.10 || iv > 2.8) && marketPrice > 0.04) {
        iv = calculateImpliedVolatility(currentPrice, strike, T, r, marketPrice, 'call', 0.45);
      }
      iv = Math.min(2.8, Math.max(0.10, iv));
      const delta = calculateBSDelta(currentPrice, strike, T, r, iv, 'call');
      return { ...c, strike, iv, delta, cleanMid: marketPrice };
    });

    // Calculate analytical BS Delta for all puts
    const putsWithDelta = validPuts.map((p: any) => {
      const strike = Number(p.strike);
      let iv = Number(p.impliedVolatility || 0);
      const marketPrice = getCleanMidPrice(p);
      if ((iv < 0.10 || iv > 2.8) && marketPrice > 0.04) {
        iv = calculateImpliedVolatility(currentPrice, strike, T, r, marketPrice, 'put', 0.45);
      }
      iv = Math.min(2.8, Math.max(0.10, iv));
      const delta = calculateBSDelta(currentPrice, strike, T, r, iv, 'put');
      return { ...p, strike, iv, delta, cleanMid: marketPrice };
    });

    // Find ATM strike (closest to currentPrice)
    let atmCall = callsWithDelta[0];
    let minAtmDiff = Math.abs(atmCall.strike - currentPrice);
    for (const c of callsWithDelta) {
      const diff = Math.abs(c.strike - currentPrice);
      if (diff < minAtmDiff) {
        minAtmDiff = diff;
        atmCall = c;
      }
    }

    const atmStrike = atmCall.strike;
    let atmIv = atmCall.iv;
    if (atmIv < 0.10) atmIv = 0.45;

    // Find 25-Delta Call (delta closest to +0.25)
    let call25 = callsWithDelta[0];
    let minCallDeltaDiff = Math.abs(call25.delta - 0.25);
    for (const c of callsWithDelta) {
      const diff = Math.abs(c.delta - 0.25);
      if (diff < minCallDeltaDiff) {
        minCallDeltaDiff = diff;
        call25 = c;
      }
    }

    // Find 25-Delta Put (delta closest to -0.25)
    let put25 = putsWithDelta[0];
    let minPutDeltaDiff = Math.abs(put25.delta - (-0.25));
    for (const p of putsWithDelta) {
      const diff = Math.abs(p.delta - (-0.25));
      if (diff < minPutDeltaDiff) {
        minPutDeltaDiff = diff;
        put25 = p;
      }
    }

    const put25Iv = put25.iv;
    const call25Iv = call25.iv;

    // Normalized Skew = (Put_25Δ_IV - Call_25Δ_IV) / ATM_IV * 100
    let rawSkew = ((put25Iv - call25Iv) / atmIv) * 100;
    if (isNaN(rawSkew) || !isFinite(rawSkew)) rawSkew = 0;
    // Bound skew to institutional market parameters [-30%, +30%]
    const skew = parseFloat(Math.min(30.0, Math.max(-30.0, rawSkew)).toFixed(2));

    // Institutional Liquidity filter: If OI < 100 or Volume < 20 on selected strikes, thin = True
    const callVol = Number(call25.volume || 0);
    const putVol = Number(put25.volume || 0);
    const atmVol = Number(atmCall.volume || 0);

    const callOi = Number(call25.openInterest || 0);
    const putOi = Number(put25.openInterest || 0);
    const atmOi = Number(atmCall.openInterest || 0);

    const minOi = Math.min(callOi, putOi, atmOi);
    const minVol = Math.min(callVol, putVol, atmVol);
    const thin = minOi < 100 || minVol < 20;

    const expDateStr = new Date(targetExpDateSec * 1000).toISOString().split('T')[0];

    const record: RadarRecord = {
      ticker: cleanTicker,
      name: shortName,
      sector: sector || 'Equities',
      price: parseFloat(currentPrice.toFixed(2)),
      ret_1d: ret1d,
      ret_1w: ret1w,
      ret_1m: ret1m,
      skew: skew,
      atm_iv: parseFloat((atmIv * 100).toFixed(1)),
      put_25_iv: parseFloat((put25Iv * 100).toFixed(1)),
      call_25_iv: parseFloat((call25Iv * 100).toFixed(1)),
      put_25_strike: parseFloat(put25.strike.toFixed(2)),
      call_25_strike: parseFloat(call25.strike.toFixed(2)),
      atm_strike: parseFloat(atmStrike.toFixed(2)),
      dte: targetDte,
      expiration: expDateStr,
      volume_25delta: callVol + putVol,
      oi_25delta: callOi + putOi,
      thin: thin,
      quadrant_1d: getQuadrant(ret1d, skew),
      quadrant_1w: getQuadrant(ret1w, skew),
      quadrant_1m: getQuadrant(ret1m, skew),
      updated_at: new Date().toISOString(),
    };

    return record;
  } catch (err: any) {
    console.error(`[${cleanTicker}] Error in scanLiveTicker:`, err.message);
    return null;
  }
}

/**
 * Batch fetch real-time / delayed quotes from Yahoo Finance for a list of tickers
 */
export async function batchFetchLiveQuotes(symbols: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (!symbols || symbols.length === 0) return map;

  try {
    const { cookie, crumb } = await getYahooSession();
    const chunkSize = 65;
    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);
      try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(chunk.join(','))}&crumb=${encodeURIComponent(crumb)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
            Cookie: cookie,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.quoteResponse?.result || [];
          for (const item of list) {
            if (item.symbol) {
              map.set(item.symbol, item);
            }
          }
        }
      } catch (e: any) {
        console.warn('Batch quote error on chunk:', e.message);
      }
      await new Promise((r) => setTimeout(r, 60));
    }
  } catch (err: any) {
    console.warn('Error in batchFetchLiveQuotes:', err.message);
  }

  return map;
}

