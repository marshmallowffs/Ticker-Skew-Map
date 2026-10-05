/**
 * Analytical Black-Scholes Formula & Greeks Engine
 */

export function erf(x: number): number {
  // Abramowitz & Stegun formula 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

export function normCdf(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.sqrt(2.0)));
}

export function normPdf(x: number): number {
  return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * x * x);
}

export function calculateBSDelta(
  S: number,
  K: number,
  T: number, // in years (e.g. 35 / 365)
  r: number, // e.g. 0.045
  sigma: number, // IV as decimal e.g. 0.45
  type: 'call' | 'put'
): number {
  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0.0001) {
    return 0;
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  if (type === 'call') {
    return normCdf(d1);
  } else {
    return normCdf(d1) - 1.0;
  }
}

export function calculateBSPrice(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
): number {
  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0.0001) {
    return type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  }
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (type === 'call') {
    return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  } else {
    return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
  }
}

export function calculateBSGreeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
) {
  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0.0001) {
    return { delta: 0, gamma: 0, vega: 0, theta: 0 };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = normPdf(d1);
  const delta = type === 'call' ? normCdf(d1) : normCdf(d1) - 1.0;
  const gamma = nd1 / (S * sigma * sqrtT);
  const vega = (S * sqrtT * nd1) / 100.0; // 1% vol change
  
  let theta = 0;
  if (type === 'call') {
    theta = (-(S * sigma * nd1) / (2 * sqrtT) - r * K * Math.exp(-r * T) * normCdf(d2)) / 365.0;
  } else {
    theta = (-(S * sigma * nd1) / (2 * sqrtT) + r * K * Math.exp(-r * T) * normCdf(-d2)) / 365.0;
  }

  return { delta, gamma, vega, theta };
}

export function calculateNormalizedSkew(put25Iv: number, call25Iv: number, atmIv: number): number {
  if (atmIv <= 0.0001) return 0;
  return ((put25Iv - call25Iv) / atmIv) * 100;
}

/**
 * Numerical Black-Scholes Implied Volatility Solver (Bisection method)
 * Returns IV as decimal (e.g. 0.45 for 45% IV)
 */
export function calculateImpliedVolatility(
  S: number,
  K: number,
  T: number,
  r: number,
  marketPrice: number,
  type: 'call' | 'put',
  defaultFallback = 0.40
): number {
  if (marketPrice <= 0.01 || S <= 0 || K <= 0 || T <= 0) {
    return defaultFallback;
  }

  const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  const timeValue = marketPrice - intrinsic;
  if (timeValue <= 0.02) {
    return defaultFallback;
  }

  let low = 0.05;
  let high = 3.5;
  for (let i = 0; i < 32; i++) {
    const mid = (low + high) / 2;
    const price = calculateBSPrice(S, K, T, r, mid, type);
    if (Math.abs(price - marketPrice) < 0.01) {
      return mid;
    }
    if (price < marketPrice) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const result = (low + high) / 2;
  return Math.min(3.5, Math.max(0.10, result));
}

