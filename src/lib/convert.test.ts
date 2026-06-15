import { describe, it, expect } from 'vitest';
import { convert, spreadPct } from './convert';
import type { RatesMap } from './types';

// Per-100 board values (close to real BOC figures).
const RATES: RatesMap = {
  USD: { BR: 674.5, CBR: 674.5, SR: 677.33, CSR: 678.0, MR: 680.88, DATETIME: '2026/06/16 10:00:00' },
  JPY: { BR: 4.2, CBR: 4.18, SR: 4.24, CSR: 4.26, MR: 4.2424, DATETIME: '2026/06/16 10:00:00' },
  BND: { BR: null, CBR: 484.8, SR: null, CSR: 569.12, MR: 527.66, DATETIME: '2026/06/16 10:00:00' },
};

describe('convert', () => {
  it('foreign → CNY uses the buying rate, per 100', () => {
    const r = convert(RATES, 'USD', 'CNY', 100, false);
    expect(r.rateType).toBe('BR');
    expect(r.value).toBeCloseTo(674.5, 4); // 100 * 674.5 / 100
  });

  it('CNY → foreign uses the selling rate, per 100', () => {
    const r = convert(RATES, 'CNY', 'USD', 1000, false);
    expect(r.rateType).toBe('SR');
    expect(r.value).toBeCloseTo((1000 * 100) / 677.33, 4); // ≈ 147.64
  });

  it('honors the cash toggle (现钞)', () => {
    expect(convert(RATES, 'USD', 'CNY', 100, true).rateType).toBe('CBR');
    expect(convert(RATES, 'CNY', 'USD', 100, true).rateType).toBe('CSR');
  });

  it('foreign → foreign is a cross via middle rates', () => {
    const r = convert(RATES, 'USD', 'JPY', 100, false);
    expect(r.cross).toBe(true);
    expect(r.rateType).toBe('MR');
    expect(r.value).toBeCloseTo((100 * 680.88) / 4.2424, 2); // ≈ 16049 JPY
  });

  it('same currency returns the amount unchanged', () => {
    expect(convert(RATES, 'USD', 'USD', 50, false).value).toBe(50);
    expect(convert(RATES, 'CNY', 'CNY', 50, false).value).toBe(50);
  });

  it('returns null when the needed column is missing', () => {
    expect(convert(RATES, 'BND', 'CNY', 100, false).value).toBeNull(); // BND.BR is null
    expect(convert(RATES, 'EUR', 'CNY', 100, false).value).toBeNull(); // unknown currency
  });

  it('returns null for a non-finite amount', () => {
    expect(convert(RATES, 'USD', 'CNY', NaN, false).value).toBeNull();
  });

  it('round-trips approximately (USD→CNY→USD at mid is within the spread)', () => {
    const toCny = convert(RATES, 'USD', 'CNY', 100, false).value!;
    const back = convert(RATES, 'CNY', 'USD', toCny, false).value!;
    expect(back).toBeLessThan(100); // sell-then-buy loses the spread
    expect(back).toBeGreaterThan(99); // but only a little
  });
});

describe('spreadPct', () => {
  it('computes (sell - buy) / buy as a percentage', () => {
    expect(spreadPct(RATES, 'USD')).toBeCloseTo(((677.33 - 674.5) / 674.5) * 100, 4);
  });

  it('returns null when a rate is missing', () => {
    expect(spreadPct(RATES, 'BND')).toBeNull();
    expect(spreadPct(RATES, 'EUR')).toBeNull();
  });
});
