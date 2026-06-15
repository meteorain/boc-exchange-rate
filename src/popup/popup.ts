import './popup.css';
import { getCache, getSettings } from '@/lib/storage';
import { currencyName, rateTypeName, RATE_TYPES } from '@/lib/currencies';
import type { CurrencyRate, RateType, WorkerResponse } from '@/lib/types';

const list = document.getElementById('list') as HTMLElement;
const updated = document.getElementById('updated') as HTMLElement;
const empty = document.getElementById('empty') as HTMLElement;
const refreshBtn = document.getElementById('refresh') as HTMLButtonElement;

/** Fill text/title from _locales for every tagged element. */
function applyI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = chrome.i18n.getMessage(el.dataset.i18n!);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = chrome.i18n.getMessage(el.dataset.i18nTitle!);
  });
  (document.getElementById('source') as HTMLAnchorElement).href =
    'https://www.boc.cn/sourcedb/whpj/';
}

function statCell(label: string, value: number | null, highlight: boolean): HTMLElement {
  const cell = document.createElement('div');
  cell.className = highlight ? 'stat stat--badge' : 'stat';

  const labelEl = document.createElement('span');
  labelEl.className = 'stat__label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = value == null ? 'stat__value stat__value--empty' : 'stat__value';
  valueEl.textContent = value == null ? '—' : String(value);

  cell.append(labelEl, valueEl);
  return cell;
}

function card(code: string, rate: CurrencyRate, badgeRateType: RateType): HTMLElement {
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
    rates.append(statCell(rateTypeName(type), rate[type], type === badgeRateType));
  }

  article.append(head, rates);
  return article;
}

async function render(): Promise<void> {
  const [cache, settings] = await Promise.all([getCache(), getSettings()]);
  list.replaceChildren();

  const codes = settings.selectedCurrencies.filter((c) => cache?.rates[c]);
  if (!cache || codes.length === 0) {
    empty.hidden = false;
    updated.textContent = '';
    return;
  }

  empty.hidden = true;
  for (const code of codes) {
    list.append(card(code, cache.rates[code], settings.badgeRateType));
  }

  const datetime = cache.rates[codes[0]].DATETIME ?? '';
  updated.textContent = `${chrome.i18n.getMessage('updatedAt')} ${datetime}`;
}

async function refresh(): Promise<void> {
  refreshBtn.classList.add('is-loading');
  try {
    const res = (await chrome.runtime.sendMessage('manual-refresh')) as WorkerResponse;
    if (res?.status !== 'completed') throw new Error('worker reported failure');
  } catch (error) {
    console.error('Manual refresh failed:', error);
  } finally {
    refreshBtn.classList.remove('is-loading');
    await render();
  }
}

applyI18n();
void render();

refreshBtn.addEventListener('click', () => void refresh());
document.getElementById('empty-refresh')?.addEventListener('click', () => void refresh());
document
  .getElementById('options')
  ?.addEventListener('click', () => chrome.runtime.openOptionsPage());
