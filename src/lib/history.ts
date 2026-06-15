import type { RatesMap, RateType } from './types';

/**
 * A compact local record of the BOC board over time, one entry per publish
 * day. Powers daily up/down direction and "N-day high/low" alerts — things
 * the single live snapshot can't tell us. Kept entirely on-device.
 */
export type HistoryDay = {
  d: string; // publish date "YYYY/MM/DD"
  BR: number | null;
  CBR: number | null;
  SR: number | null;
  CSR: number | null;
  MR: number | null;
};
export type BoardHistory = Record<string, HistoryDay[]>;

const KEY = 'boardHistory';
const MAX_DAYS = 120;

export function dayOf(datetime: string | null | undefined): string {
  return (datetime ?? '').slice(0, 10);
}

export async function getHistory(): Promise<BoardHistory> {
  const { boardHistory } = await chrome.storage.local.get(KEY);
  return (boardHistory as BoardHistory | undefined) ?? {};
}

/** Append (or replace) today's entry per currency, capped to MAX_DAYS. */
export async function recordSnapshot(rates: RatesMap): Promise<BoardHistory> {
  const history = await getHistory();

  for (const [code, r] of Object.entries(rates)) {
    const d = dayOf(r.DATETIME);
    if (!d) continue;

    const series = (history[code] ??= []);
    const day: HistoryDay = { d, BR: r.BR, CBR: r.CBR, SR: r.SR, CSR: r.CSR, MR: r.MR };
    const last = series[series.length - 1];
    if (last && last.d === d) {
      series[series.length - 1] = day; // latest intraday value wins
    } else {
      series.push(day);
    }
    if (series.length > MAX_DAYS) series.splice(0, series.length - MAX_DAYS);
  }

  await chrome.storage.local.set({ [KEY]: history });
  return history;
}

/** Most recent value strictly before `today` (i.e. the previous publish day). */
export function previousValue(
  series: HistoryDay[] | undefined,
  type: RateType,
  today: string,
): number | null {
  if (!series) return null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].d < today && series[i][type] != null) return series[i][type];
  }
  return null;
}

/** Min/max of a rate type over the last `days` publish days (today included). */
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
