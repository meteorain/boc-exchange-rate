import type { RatesMap, RateType } from './types';

export const CNY = 'CNY';

export interface ConvertResult {
  /** Converted amount, or null when there's no usable quote. */
  value: number | null;
  /** Board column used (null for same-currency). */
  rateType: RateType | null;
  /** The board rate applied, per 100 units (null for same / cross). */
  rate: number | null;
  /** True when this is a foreign↔foreign cross via the middle rate. */
  cross: boolean;
}

/**
 * Convert `amount` from one currency to another using the BOC board:
 * - foreign → CNY: bank buys foreign → buying rate (现汇/现钞买入价)
 * - CNY → foreign: bank sells foreign → selling rate (现汇/现钞卖出价)
 * - foreign → foreign: cross rate via each side's middle rate (中行折算价)
 * Board rates are per 100 units of the foreign currency.
 */
export function convert(
  rates: RatesMap,
  from: string,
  to: string,
  amount: number,
  cash: boolean,
): ConvertResult {
  const none = (rateType: RateType | null, cross: boolean): ConvertResult => ({
    value: null,
    rateType,
    rate: null,
    cross,
  });

  if (!Number.isFinite(amount)) return none(null, false);
  if (from === to) return { value: amount, rateType: null, rate: null, cross: false };

  if (to === CNY) {
    const rateType: RateType = cash ? 'CBR' : 'BR';
    const rate = rates[from]?.[rateType] ?? null;
    return rate == null
      ? none(rateType, false)
      : { value: (amount * rate) / 100, rateType, rate, cross: false };
  }

  if (from === CNY) {
    const rateType: RateType = cash ? 'CSR' : 'SR';
    const rate = rates[to]?.[rateType] ?? null;
    return rate == null || rate === 0
      ? none(rateType, false)
      : { value: (amount * 100) / rate, rateType, rate, cross: false };
  }

  const mf = rates[from]?.MR ?? null;
  const mt = rates[to]?.MR ?? null;
  return mf != null && mt != null && mt !== 0
    ? { value: (amount * mf) / mt, rateType: 'MR', rate: null, cross: true }
    : none(null, true);
}

/** Percentage spread between a foreign currency's buy and sell wire rates. */
export function spreadPct(rates: RatesMap, code: string): number | null {
  const r = rates[code];
  if (!r || r.BR == null || r.SR == null || r.BR === 0) return null;
  return ((r.SR - r.BR) / r.BR) * 100;
}
