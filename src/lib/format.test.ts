import { describe, it, expect } from 'vitest';
import { formatBadge } from './format';

describe('formatBadge', () => {
  it('rounds thousands to an integer', () => {
    expect(formatBadge(1234.56)).toBe('1235');
  });

  it('drops decimals for hundreds', () => {
    expect(formatBadge(674.52)).toBe('675');
    expect(formatBadge(86.9)).toBe('86.9'); // < 100 keeps two decimals
  });

  it('keeps two decimals for small values, clamped to 4 chars', () => {
    expect(formatBadge(4.2023)).toBe('4.20');
    expect(formatBadge(7.1)).toBe('7.10');
  });

  it('never exceeds 4 characters', () => {
    for (const v of [4.2023, 86.9, 674.52, 999.9, 1234.5]) {
      expect(formatBadge(v).length).toBeLessThanOrEqual(4);
    }
  });
});
