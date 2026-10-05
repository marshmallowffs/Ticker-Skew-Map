#!/usr/bin/env python3
"""
scanner.py - Quantitative Options Skew & Price Positioning Engine for "Name Radar"
Fetches LIVE stock price history & options chains directly from Yahoo Finance,
manages session authentication, calculates analytical Black-Scholes Greeks,
computes normalized 25-Delta Skew, filters liquidity, and outputs radar_data.json.
"""

import sys
import os
import json
import time
import math
import argparse
from datetime import datetime, timezone
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np
from scipy.stats import norm

DEFAULT_UNIVERSE = [
    # Fast-growing non-S&P 500 small/mid caps (Watchlist Core)
    "IONQ", "LUNR", "RDW", "ACHR", "ONDS", "RGTI", "PLTR", "SMCI",
    "ASTS", "JOBY", "RIVN", "LCID", "QS", "SOFI", "HOOD", "AFRM",
    "UPST", "CVNA", "MARA", "MSTR", "COIN", "DKNG", "RBLX", "APP",
    "DUOL", "SYM", "BBAI", "SOUN", "AI", "PATH", "DOCN", "CELH",
    "ENPH", "SEDG", "CRWD", "NET", "SNOW", "ARM", "SMH", "SHOP",
    
    # Mega-Cap Tech & Semis
    "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AMD",
    "AVGO", "QCOM", "TXN", "INTC", "MU", "AMAT", "LRCX", "KLAC",
    "ASML", "TSM", "MRVL", "ON", "MPWR",
    
    # Software, Cloud & Cybersecurity
    "ORCL", "CRM", "ADBE", "PANW", "FTNT", "NOW", "WDAY", "DDOG",
    "ZS", "MDB", "TEAM", "HUBS",
    
    # Fintech & Blue Chips
    "V", "MA", "PYPL", "SQ", "JPM", "BAC", "GS", "MS", "SCHW", "AXP",
    "WMT", "COST", "TGT", "HD", "NKE", "SBUX", "MCD", "LLY", "NVO",
    "JNJ", "PFE", "ABBV", "BA", "CAT", "DE", "GE", "RTX", "LMT",
    "XOM", "CVX",
    
    # Indices
    "SPY", "QQQ", "IWM"
]

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

class YahooFinanceClient:
    def __init__(self):
        self.cookie = None
        self.crumb = None
        self.session_expiry = 0

    def get_session(self):
        now = time.time()
        if self.cookie and self.crumb and now < self.session_expiry:
            return self.cookie, self.crumb

        try:
            req1 = urllib.request.Request("https://fc.yahoo.com", headers={"User-Agent": USER_AGENT})
            try:
                urllib.request.urlopen(req1)
            except urllib.error.HTTPError as e:
                self.cookie = e.headers.get("Set-Cookie")
                
            if not self.cookie:
                raise RuntimeError("Failed to retrieve Yahoo session cookie")

            req2 = urllib.request.Request(
                "https://query2.finance.yahoo.com/v1/test/getcrumb",
                headers={"User-Agent": USER_AGENT, "Cookie": self.cookie}
            )
            with urllib.request.urlopen(req2) as resp:
                self.crumb = resp.read().decode("utf-8").strip()

            self.session_expiry = now + 3600
            return self.cookie, self.crumb
        except Exception as e:
            if self.cookie and self.crumb:
                return self.cookie, self.crumb
            raise RuntimeError(f"Could not initialize Yahoo session: {e}")

session_client = YahooFinanceClient()

def calculate_bs_delta(S: float, K: float, T: float, r: float, sigma: float, option_type: str = "call") -> float:
    """
    Computes Black-Scholes Delta analytically:
    d1 = [ln(S/K) + (r + 0.5 * sigma^2) * T] / (sigma * sqrt(T))
    Delta_call = N(d1)
    Delta_put = N(d1) - 1
    """
    if S <= 0 or K <= 0 or T <= 0 or sigma <= 0.0001:
        return 0.0
    try:
        d1 = (math.log(S / K) + (r + 0.5 * (sigma ** 2)) * T) / (sigma * math.sqrt(T))
        if option_type.lower() == "call":
            return float(norm.cdf(d1))
        elif option_type.lower() == "put":
            return float(norm.cdf(d1) - 1.0)
        else:
            raise ValueError(f"Unknown option_type '{option_type}', expected 'call' or 'put'.")
    except Exception:
        return 0.0

def scan_ticker(ticker: str, r: float = 0.045, verbose: bool = False) -> dict:
    """
    Scans a single ticker using direct live Yahoo Finance APIs:
    1. Fetches historical prices to calculate live 1D, 1W (5 days), 1M (21 days) returns.
    2. Identifies target options chain expiring between 25 and 45 days out.
    3. Calculates BS deltas across calls & puts.
    4. Identifies ATM, 25-Delta Call, and 25-Delta Put strikes.
    5. Computes normalized Skew = (IV_25put - IV_25call) / IV_atm * 100.
    6. Flags thin liquidity if OI < 30 or Volume < 5.
    """
    ticker_clean = ticker.strip().upper()
    try:
        cookie, crumb = session_client.get_session()

        # 1. Fetch live chart for current price and historical returns
        chart_url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_clean}?range=1mo&interval=1d"
        req_chart = urllib.request.Request(chart_url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req_chart) as resp:
            chart_data = json.loads(resp.read().decode("utf-8"))

        result = chart_data.get("chart", {}).get("result", [{}])[0]
        meta = result.get("meta", {})
        current_price = meta.get("regularMarketPrice") or meta.get("chartPreviousClose")
        if not current_price or current_price <= 0:
            if verbose:
                print(f"[{ticker_clean}] Invalid price")
            return None

        quotes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        closes = [c for c in quotes if c is not None and not math.isnan(c)]
        if len(closes) < 2:
            return None

        # Returns
        ret_1d = float(((current_price / closes[-2]) - 1.0) * 100.0)
        ret_1w = float(((current_price / closes[-6]) - 1.0) * 100.0) if len(closes) >= 6 else ret_1d
        ret_1m = float(((current_price / closes[0]) - 1.0) * 100.0)

        # 2. Fetch options chain
        opt_url = f"https://query2.finance.yahoo.com/v7/finance/options/{ticker_clean}?crumb={urllib.parse.quote(crumb)}"
        req_opt = urllib.request.Request(opt_url, headers={"User-Agent": USER_AGENT, "Cookie": cookie})
        with urllib.request.urlopen(req_opt) as resp:
            opt_data = json.loads(resp.read().decode("utf-8"))

        chain_res = opt_data.get("optionChain", {}).get("result", [{}])[0]
        expiration_timestamps = chain_res.get("expirationDates", [])
        if not expiration_timestamps:
            return None

        now_sec = int(time.time())
        target_exp_sec = None
        target_dte = None
        min_diff_from_35 = float("inf")

        for exp_sec in expiration_timestamps:
            dte = round((exp_sec - now_sec) / 86400)
            if 25 <= dte <= 45:
                diff = abs(dte - 35)
                if diff < min_diff_from_35:
                    min_diff_from_35 = diff
                    target_exp_sec = exp_sec
                    target_dte = dte

        if target_exp_sec is None:
            for exp_sec in expiration_timestamps:
                dte = round((exp_sec - now_sec) / 86400)
                if 14 <= dte <= 65:
                    diff = abs(dte - 35)
                    if diff < min_diff_from_35:
                        min_diff_from_35 = diff
                        target_exp_sec = exp_sec
                        target_dte = dte

        if target_exp_sec is None:
            target_exp_sec = expiration_timestamps[0]
            target_dte = max(1, round((target_exp_sec - now_sec) / 86400))

        # Check if the returned option corresponds to target_exp_sec
        options_list = chain_res.get("options", [{}])[0]
        if options_list.get("expirationDate") != target_exp_sec:
            specific_url = f"https://query2.finance.yahoo.com/v7/finance/options/{ticker_clean}?date={target_exp_sec}&crumb={urllib.parse.quote(crumb)}"
            req_spec = urllib.request.Request(specific_url, headers={"User-Agent": USER_AGENT, "Cookie": cookie})
            with urllib.request.urlopen(req_spec) as resp:
                specific_data = json.loads(resp.read().decode("utf-8"))
            options_list = specific_data.get("optionChain", {}).get("result", [{}])[0].get("options", [{}])[0]

        calls = options_list.get("calls", [])
        puts = options_list.get("puts", [])
        if not calls or not puts:
            return None

        T = target_dte / 365.0

        # Filter valid IVs
        valid_calls = [c for c in calls if c.get("impliedVolatility") and c.get("impliedVolatility") > 0.001]
        valid_puts = [p for p in puts if p.get("impliedVolatility") and p.get("impliedVolatility") > 0.001]
        if not valid_calls or not valid_puts:
            return None

        for c in valid_calls:
            c["delta"] = calculate_bs_delta(current_price, float(c["strike"]), T, r, float(c["impliedVolatility"]), "call")
        for p in valid_puts:
            p["delta"] = calculate_bs_delta(current_price, float(p["strike"]), T, r, float(p["impliedVolatility"]), "put")

        # Find ATM strike
        atm_call = min(valid_calls, key=lambda c: abs(float(c["strike"]) - current_price))
        atm_strike = float(atm_call["strike"])
        atm_iv = float(atm_call["impliedVolatility"])
        if atm_iv <= 0.0001:
            return None

        # Find 25-Delta Call (delta closest to +0.25)
        call_25 = min(valid_calls, key=lambda c: abs(c["delta"] - 0.25))
        call_25_strike = float(call_25["strike"])
        call_25_iv = float(call_25["impliedVolatility"])
        call_25_vol = float(call_25.get("volume") or 0)
        call_25_oi = float(call_25.get("openInterest") or 0)

        # Find 25-Delta Put (delta closest to -0.25)
        put_25 = min(valid_puts, key=lambda p: abs(p["delta"] - (-0.25)))
        put_25_strike = float(put_25["strike"])
        put_25_iv = float(put_25["impliedVolatility"])
        put_25_vol = float(put_25.get("volume") or 0)
        put_25_oi = float(put_25.get("openInterest") or 0)

        atm_vol = float(atm_call.get("volume") or 0)
        atm_oi = float(atm_call.get("openInterest") or 0)

        # Normalized Skew % = (Put_25d_IV - Call_25d_IV) / ATM_IV * 100
        skew_pct = float(((put_25_iv - call_25_iv) / atm_iv) * 100.0)

        # Liquidity filter
        min_oi = min(call_25_oi, put_25_oi, atm_oi)
        min_vol = min(call_25_vol, put_25_vol, atm_vol)
        thin = bool(min_oi < 30 or min_vol < 5)

        def get_quadrant(ret: float, skew: float) -> str:
            if ret < 0 and skew > 0:
                return "FEAR"
            elif ret >= 0 and skew > 0:
                return "HEDGED RALLY"
            elif ret < 0 and skew <= 0:
                return "CONTRARIAN BID"
            else:
                return "CHASE"

        exp_str = datetime.fromtimestamp(target_exp_sec, tz=timezone.utc).strftime("%Y-%m-%d")

        return {
            "ticker": ticker_clean,
            "name": meta.get("shortName") or ticker_clean,
            "sector": "Equities",
            "price": round(current_price, 2),
            "ret_1d": round(ret_1d, 2),
            "ret_1w": round(ret_1w, 2),
            "ret_1m": round(ret_1m, 2),
            "skew": round(skew_pct, 2),
            "atm_iv": round(atm_iv * 100.0, 1),
            "put_25_iv": round(put_25_iv * 100.0, 1),
            "call_25_iv": round(call_25_iv * 100.0, 1),
            "put_25_strike": round(put_25_strike, 2),
            "call_25_strike": round(call_25_strike, 2),
            "atm_strike": round(atm_strike, 2),
            "dte": target_dte,
            "expiration": exp_str,
            "volume_25delta": int(call_25_vol + put_25_vol),
            "oi_25delta": int(call_25_oi + put_25_oi),
            "thin": thin,
            "quadrant_1d": get_quadrant(ret_1d, skew_pct),
            "quadrant_1w": get_quadrant(ret_1w, skew_pct),
            "quadrant_1m": get_quadrant(ret_1m, skew_pct),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        if verbose:
            print(f"[{ticker_clean}] Scan error: {e}")
        return None

def run_scanner(tickers: list = None, max_workers: int = 4, output_file: str = "radar_data.json") -> dict:
    if tickers is None:
        catalog_path = os.path.join(os.path.dirname(__file__), "src", "data", "masterCatalog.json")
        if os.path.exists(catalog_path):
            try:
                with open(catalog_path, "r", encoding="utf-8") as f:
                    cat = json.load(f)
                    tickers = [c["ticker"] for c in cat if "ticker" in c]
            except Exception:
                tickers = DEFAULT_UNIVERSE
        else:
            tickers = DEFAULT_UNIVERSE
        
    print(f"[*] Starting Name Radar Live Scanner across {len(tickers)} tickers...")
    print(f"[*] Concurrency: {max_workers} threads, Target DTE: 25-45 days")
    
    results = []
    failed = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_ticker = {executor.submit(scan_ticker, t): t for t in tickers}
        for future in as_completed(future_to_ticker):
            tick = future_to_ticker[future]
            try:
                data = future.result()
                if data:
                    results.append(data)
                    print(f"  [+] {tick:6s} | Live Price: ${data['price']:<7.2f} | Skew: {data['skew']:+6.2f}% | 1D Ret: {data['ret_1d']:+6.2f}% | Thin: {data['thin']}")
                else:
                    failed.append(tick)
            except Exception as e:
                failed.append(tick)
            time.sleep(0.15)
            
    results.sort(key=lambda x: x["ticker"])
    
    payload = {
        "metadata": {
            "total_scanned": len(tickers),
            "successful_records": len(results),
            "failed_records": len(failed),
            "scan_timestamp": datetime.now(timezone.utc).isoformat(),
            "target_horizon": "30-45 DTE",
            "formula": "Skew = (IV_25d_put - IV_25d_call) / IV_atm",
            "source": "Yahoo Finance Live / Delayed Data Feed"
        },
        "records": results
    }
    
    with open(output_file, "w") as f:
        json.dump(payload, f, indent=2)
        
    print(f"\n[✓] Live Scan Complete! Successfully processed {len(results)}/{len(tickers)} names.")
    print(f"[✓] Data saved to {output_file}")
    return payload

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Name Radar Options Skew Scanner")
    parser.add_argument("--workers", type=int, default=4, help="Max worker threads (default: 4)")
    parser.add_argument("--output", type=str, default="radar_data.json", help="Output JSON path")
    parser.add_argument("--tickers", type=str, default=None, help="Comma-separated list of custom tickers")
    args = parser.parse_args()
    
    ticker_list = [t.strip().upper() for t in args.tickers.split(",")] if args.tickers else None
    run_scanner(tickers=ticker_list, max_workers=args.workers, output_file=args.output)
