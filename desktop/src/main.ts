import './app.css';
import { parseRates } from '@lib/boc';
import { currencyName, rateTypeName, RATE_TYPES } from '@lib/currencies';
import { formatBadge } from '@lib/format';
import type { CurrencyRate, RatesMap, RateType } from '@lib/types';
import { fetchText, setTrayTitle, store } from './platform';
import { t, applyI18n } from './i18n';

const BOC_URL = 'https://www.boc.cn/sourcedb/whpj/enindex_1619.html';
const POLL_MS = 30 * 60 * 1000;
const DEFAULT_CURRENCIES = ['EUR', 'GBP', 'HKD', 'USD'];
const BADGE_CURRENCY = 'USD';
const BADGE_RATE: RateType = 'MR';

const list = document.getElementById('list') as HTMLElement;
const updated = document.getElementById('updated') as HTMLElement;
const refreshBtn = document.getElementById('refresh') as HTMLButtonElement;

function card(code: string, rate: CurrencyRate): HTMLElement {
  const article = document.createElement('article');
  article.className = 'card';

  const head = document.createElement('div');
  head.className = 'card__head';
  const codeEl = document.createElement('span');
  codeEl.className = 'card__code';
  codeEl.textContent = code;
  const nameEl = document.createElement('span');
  nameEl.className = 'card__name';
  nameEl.textContent = currencyName(code);
  head.append(codeEl, nameEl);

  const rates = document.createElement('div');
  rates.className = 'card__rates';
  for (const type of RATE_TYPES) {
    const cell = document.createElement('div');
    cell.className = 'stat';
    const label = document.createElement('span');
    label.className = 'stat__label';
    label.textContent = rateTypeName(type);
    const value = document.createElement('span');
    const v = rate[type];
    value.className = v == null ? 'stat__value stat__value--empty' : 'stat__value';
    value.textContent = v == null ? '—' : String(v);
    cell.append(label, value);
    rates.append(cell);
  }

  article.append(head, rates);
  return article;
}

function render(rates: RatesMap, selected: string[]): void {
  list.replaceChildren();
  const codes = selected.filter((c) => rates[c]);
  for (const code of codes) list.append(card(code, rates[code]));
  updated.textContent = codes.length
    ? `${t('updatedAt')} ${rates[codes[0]].DATETIME ?? ''}`
    : t('noData');
}

async function refresh(): Promise<void> {
  refreshBtn.classList.add('is-loading');
  try {
    const rates = parseRates(await fetchText(BOC_URL));
    if (Object.keys(rates).length === 0) throw new Error('parsed zero currencies');
    await store.set('rates', rates);

    const selected = (await store.get<string[]>('selected')) ?? DEFAULT_CURRENCIES;
    render(rates, selected);

    const badge = rates[BADGE_CURRENCY]?.[BADGE_RATE];
    await setTrayTitle(badge != null ? `¥${formatBadge(badge)}` : '');
  } catch (error) {
    console.error('Refresh failed:', error);
  } finally {
    refreshBtn.classList.remove('is-loading');
  }
}

async function init(): Promise<void> {
  applyI18n();
  const [cached, selected] = await Promise.all([
    store.get<RatesMap>('rates'),
    store.get<string[]>('selected'),
  ]);
  if (cached) render(cached, selected ?? DEFAULT_CURRENCIES);
  await refresh();
  setInterval(() => void refresh(), POLL_MS);
}

refreshBtn.addEventListener('click', () => void refresh());
void init();
