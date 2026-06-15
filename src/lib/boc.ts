import type { RatesMap, CurrencyRate } from './types';

/**
 * Bank of China publishes its FX board as a static HTML table. The English
 * page exposes ISO currency codes in the first column, which is what we key on.
 * Service workers have no DOMParser, so we extract the cells with a regex.
 */
const BOC_URL = 'https://www.boc.cn/sourcedb/whpj/enindex_1619.html';

/** Each rate row has 7 cells: code, BR, CBR, SR, CSR, MR, datetime. */
const COLUMNS_PER_ROW = 7;
const CELL_RE = /<td bgcolor="#FFFFFF">([\s\S]*?)<\/td>/g;
const CODE_RE = /^[A-Z]{2,4}$/;

function cleanCell(raw: string): string {
  return raw.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();
}

function toNumber(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseRates(html: string): RatesMap {
  const cells = Array.from(html.matchAll(CELL_RE), (m) => cleanCell(m[1]));
  const rates: RatesMap = {};

  for (let i = 0; i + COLUMNS_PER_ROW <= cells.length; i += COLUMNS_PER_ROW) {
    const code = cells[i];
    // Guard against table-layout changes that would misalign the chunks.
    if (!CODE_RE.test(code)) continue;

    const rate: CurrencyRate = {
      BR: toNumber(cells[i + 1]),
      CBR: toNumber(cells[i + 2]),
      SR: toNumber(cells[i + 3]),
      CSR: toNumber(cells[i + 4]),
      MR: toNumber(cells[i + 5]),
      DATETIME: cells[i + 6] || null,
    };
    rates[code] = rate;
  }

  return rates;
}

/** Fetch and parse the live BOC FX board. Throws on network/parse failure. */
export async function fetchRates(): Promise<RatesMap> {
  const response = await fetch(BOC_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`BOC responded ${response.status}`);
  }
  const html = await response.text();
  const rates = parseRates(html);
  if (Object.keys(rates).length === 0) {
    throw new Error('BOC page parsed to zero currencies (layout may have changed)');
  }
  return rates;
}
