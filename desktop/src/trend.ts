import type { TrendPoint } from '@lib/types';
import { fetchText, store } from './platform';

/**
 * Desktop trend source: same as the extension (frankfurter.dev / ECB market
 * reference), but fetched through Tauri's HTTP plugin (no CORS) and cached in
 * the Tauri store. The pure helpers are reimplemented here (a few lines each)
 * to avoid importing the extension's chrome.storage-coupled trend module.
 */
const API = 'https://api.frankfurter.dev/v1';
const MAX_DAYS = 365;
const TTL_MS = 6 * 60 * 60 * 1000;

export const TREND_WINDOWS = [30, 90, 365] as const;
const UNSUPPORTED = new Set(['AED', 'MOP', 'RUB', 'SAR', 'TWD']);

export function trendSupported(code: string): boolean {
  return code !== 'CNY' && !UNSUPPORTED.has(code);
}

export function windowed(points: TrendPoint[], days: number): TrendPoint[] {
  const cutoff = isoDaysAgo(days);
  return points.filter((p) => p.t >= cutoff);
}

interface CachedTrends {
  fetchedAt: number;
  series: Record<string, TrendPoint[]>;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function fetchSeries(codes: string[]): Promise<Record<string, TrendPoint[]>> {
  const symbols = codes.filter(trendSupported);
  if (symbols.length === 0) return {};

  const url = `${API}/${isoDaysAgo(MAX_DAYS)}..?base=CNY&symbols=${symbols.join(',')}`;
  const data = JSON.parse(await fetchText(url)) as { rates: Record<string, Record<string, number>> };

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

export async function getTrends(codes: string[]): Promise<Record<string, TrendPoint[]>> {
  const cache = await store.get<CachedTrends>('trends');
  const wanted = codes.filter(trendSupported);
  const fresh =
    cache != null &&
    Date.now() - cache.fetchedAt < TTL_MS &&
    wanted.every((code) => code in cache.series);

  if (fresh) return cache.series;

  try {
    const series = await fetchSeries(codes);
    await store.set('trends', { fetchedAt: Date.now(), series });
    return series;
  } catch (error) {
    console.error('Trend fetch failed:', error);
    return cache?.series ?? {};
  }
}
