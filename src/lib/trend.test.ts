import { describe, it, expect } from 'vitest';
import { windowed, trendSupported } from './trend';
import type { TrendPoint } from './types';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

describe('windowed', () => {
  const pts: TrendPoint[] = [
    { t: isoDaysAgo(100), v: 1 },
    { t: isoDaysAgo(40), v: 2 },
    { t: isoDaysAgo(10), v: 3 },
    { t: isoDaysAgo(1), v: 4 },
  ];

  it('keeps only points within the last N days', () => {
    expect(windowed(pts, 30).map((p) => p.v)).toEqual([3, 4]);
    expect(windowed(pts, 90).map((p) => p.v)).toEqual([2, 3, 4]);
    expect(windowed(pts, 365).map((p) => p.v)).toEqual([1, 2, 3, 4]);
  });
});

describe('trendSupported', () => {
  it('excludes CNY and the currencies frankfurter does not cover', () => {
    expect(trendSupported('USD')).toBe(true);
    expect(trendSupported('CNY')).toBe(false);
    for (const c of ['AED', 'MOP', 'RUB', 'SAR', 'TWD']) {
      expect(trendSupported(c)).toBe(false);
    }
  });
});
