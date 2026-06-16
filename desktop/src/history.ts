import type { RatesMap, RateType } from '@lib/types';
import { store } from './platform';

/**
 * Local board history (one entry per publish day), kept in the Tauri store.
 * Powers the badge's day-over-day colour and the alerts. Mirrors the
 * extension's lib/history but store-backed; the pure helpers are reimplemented
 * here to avoid importing the chrome.storage-coupled module.
 */
export type HistoryDay = {
  d: string;
  BR: number | null;
  CBR: number | null;
  SR: number | null;
  CSR: number | null;
  MR: number | null;
};
export type BoardHistory = Record<string, HistoryDay[]>;

const MAX_DAYS = 120;

export function dayOf(datetime: string | null | undefined): string {
  return (datetime ?? '').slice(0, 10);
}

export async function getHistory(): Promise<BoardHistory> {
  return (await store.get<BoardHistory>('history')) ?? {};
}

export async function recordSnapshot(rates: RatesMap): Promise<BoardHistory> {
  const history = await getHistory();
  for (const [code, r] of Object.entries(rates)) {
    const d = dayOf(r.DATETIME);
    if (!d) continue;
    const series = (history[code] ??= []);
    const day: HistoryDay = { d, BR: r.BR, CBR: r.CBR, SR: r.SR, CSR: r.CSR, MR: r.MR };
    const last = series[series.length - 1];
    if (last && last.d === d) series[series.length - 1] = day;
    else series.push(day);
    if (series.length > MAX_DAYS) series.splice(0, series.length - MAX_DAYS);
  }
  await store.set('history', history);
  return history;
}

export function previousValue(
  series: HistoryDay[] | undefined,
  type: RateType,
  today: string,
): number | null {
  if (!series) return null;
  for (let i = series.length - 1; i >= 0; i--) {
    const v = series[i][type];
    if (series[i].d < today && v != null) return v;
  }
  return null;
}

export function extremes(
  series: HistoryDay[] | undefined,
  type: RateType,
  days: number,
): { min: number; max: number } | null {
  if (!series || series.length === 0) return null;
  const vals = series.slice(-days).map((e) => e[type]).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return { min: Math.min(...vals), max: Math.max(...vals) };
}
