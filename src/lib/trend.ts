import { getTrendCache, setTrendCache } from './storage';
import type { TrendPoint } from './types';

/**
 * Trend lines come from frankfurter.dev (ECB reference rates) rather than the
 * BOC board: BOC publishes no usable history. These are *market reference*
 * rates, so the shape tracks the board closely but the absolute values differ.
 */
const API = 'https://api.frankfurter.dev/v1';
export const TREND_DAYS = 30;
const TTL_MS = 6 * 60 * 60 * 1000; // refresh at most every 6h (data is daily)

/** Currencies absent from the ECB/frankfurter dataset — no trend available. */
const UNSUPPORTED = new Set(['AED', 'MOP', 'RUB', 'SAR', 'TWD']);

export function trendSupported(code: string): boolean {
  return code !== 'CNY' && !UNSUPPORTED.has(code);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

interface FrankfurterResponse {
  rates: Record<string, Record<string, number>>;
}

/** Fetch CNY-per-unit daily series for the given codes in one request. */
async function fetchSeries(codes: string[], days: number): Promise<Record<string, TrendPoint[]>> {
  const symbols = codes.filter(trendSupported);
  if (symbols.length === 0) return {};

  // base=CNY gives "foreign per CNY"; invert to get "CNY per foreign unit",
  // matching how the BOC board is oriented.
  const url = `${API}/${isoDaysAgo(days)}..?base=CNY&symbols=${symbols.join(',')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`frankfurter responded ${res.status}`);
  const data = (await res.json()) as FrankfurterResponse;

  const series: Record<string, TrendPoint[]> = {};
  for (const date of Object.keys(data.rates).sort()) {
    const row = data.rates[date];
    for (const code of symbols) {
      const rate = row[code];
      if (!rate) continue;
      (series[code] ??= []).push({ t: date, v: 1 / rate });
    }
  }
  return series;
}

/**
 * Return trend series for the requested codes, served from cache unless it is
 * stale or missing a requested currency. Network failures fall back to cache.
 */
export async function getTrends(
  codes: string[],
  days = TREND_DAYS,
): Promise<Record<string, TrendPoint[]>> {
  const cache = await getTrendCache();
  const wanted = codes.filter(trendSupported);
  const isFresh =
    cache != null &&
    cache.days === days &&
    Date.now() - cache.fetchedAt < TTL_MS &&
    wanted.every((code) => code in cache.series);

  if (isFresh) return cache.series;

  try {
    const series = await fetchSeries(codes, days);
    await setTrendCache({ fetchedAt: Date.now(), days, series });
    return series;
  } catch (error) {
    console.error('Trend fetch failed:', error);
    return cache?.series ?? {};
  }
}
