import { describe, it, expect } from 'vitest';
import { previousValue, extremes, type HistoryDay } from './history';

const day = (d: string, BR: number | null, MR: number | null): HistoryDay => ({
  d,
  BR,
  CBR: null,
  SR: null,
  CSR: null,
  MR,
});

const series = [
  day('2026/06/10', 10, 5),
  day('2026/06/11', 12, 6),
  day('2026/06/12', 11, 7),
];

describe('previousValue', () => {
  it('returns the latest value strictly before the given day', () => {
    expect(previousValue(series, 'BR', '2026/06/12')).toBe(12);
  });

  it('skips days with a null value for that rate type', () => {
    const withGap = [day('2026/06/10', 10, 5), day('2026/06/11', null, 6)];
    expect(previousValue(withGap, 'BR', '2026/06/12')).toBe(10);
  });

  it('returns null when there is no earlier day or no series', () => {
    expect(previousValue(series, 'BR', '2026/06/10')).toBeNull();
    expect(previousValue(undefined, 'BR', '2026/06/12')).toBeNull();
  });
});

describe('extremes', () => {
  it('computes min/max over the last N days', () => {
    expect(extremes(series, 'BR', 2)).toEqual({ min: 11, max: 12 });
    expect(extremes(series, 'BR', 5)).toEqual({ min: 10, max: 12 });
  });

  it('returns null when no data is available', () => {
    expect(extremes([], 'BR', 5)).toBeNull();
    expect(extremes(undefined, 'MR', 5)).toBeNull();
  });
});
