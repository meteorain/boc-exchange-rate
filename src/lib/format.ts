/**
 * Format a rate for the toolbar badge, kept to ~4 glyphs so it stays legible:
 * thousands are rounded to an integer, hundreds show no decimals, and smaller
 * values keep two decimals (then clamped to 4 characters).
 */
export function formatBadge(rate: number): string {
  if (rate >= 1000) return Math.round(rate).toString();
  return rate.toFixed(rate >= 100 ? 0 : 2).slice(0, 4);
}
