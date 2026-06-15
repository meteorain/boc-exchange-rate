import './popup.css';
import { getCache, getSettings } from '@/lib/storage';
import { getTrends, trendSupported } from '@/lib/trend';
import { currencyName, rateTypeName, RATE_TYPES } from '@/lib/currencies';
import type { CurrencyRate, RateType, TrendPoint, WorkerResponse } from '@/lib/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

const list = document.getElementById('list') as HTMLElement;
const updated = document.getElementById('updated') as HTMLElement;
const empty = document.getElementById('empty') as HTMLElement;
const foot = document.getElementById('foot') as HTMLElement;
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
  article.dataset.code = code;

  const head = document.createElement('div');
  head.className = 'card__head';
  const codeEl = document.createElement('span');
  codeEl.className = 'card__code';
  codeEl.textContent = code;
  const nameEl = document.createElement('span');
  nameEl.className = 'card__name';
  nameEl.textContent = currencyName(code);
  // Trend slot lives in the header, right-aligned; filled in asynchronously.
  const trend = document.createElement('div');
  trend.className = 'card__trend';
  head.append(codeEl, nameEl, trend);

  const rates = document.createElement('div');
  rates.className = 'card__rates';
  for (const type of RATE_TYPES) {
    rates.append(statCell(rateTypeName(type), rate[type], type === badgeRateType));
  }

  article.append(head, rates);
  return article;
}

/** Build an inline SVG sparkline from a value series. */
function sparkline(points: TrendPoint[], rising: boolean): SVGSVGElement {
  const w = 96;
  const h = 24;
  const pad = 2;
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1 || 1);

  const coords = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / range);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.classList.add('spark', rising ? 'spark--up' : 'spark--down');

  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('points', coords.join(' '));
  svg.append(line);

  // Mark the latest point.
  const last = coords[coords.length - 1].split(',');
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('cx', last[0]);
  dot.setAttribute('cy', last[1]);
  dot.setAttribute('r', '1.8');
  svg.append(dot);

  return svg;
}

/** Render the trend cell: sparkline + percentage change over the window. */
function trendCell(points: TrendPoint[]): HTMLElement | null {
  if (points.length < 2) return null;

  const first = points[0].v;
  const last = points[points.length - 1].v;
  const pct = ((last - first) / first) * 100;
  const rising = pct >= 0;

  const wrap = document.createElement('div');
  wrap.className = 'trend';
  wrap.title = `${points[0].t} → ${points[points.length - 1].t}`;

  const delta = document.createElement('span');
  delta.className = `trend__delta ${rising ? 'is-up' : 'is-down'}`;
  delta.textContent = `${rising ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`;

  wrap.append(sparkline(points, rising), delta);
  return wrap;
}

/** Fill the trend slots once series data is available (progressive). */
async function applyTrends(codes: string[]): Promise<void> {
  if (!codes.some(trendSupported)) return;
  const series = await getTrends(codes);

  for (const code of codes) {
    const slot = list.querySelector<HTMLElement>(`.card[data-code="${code}"] .card__trend`);
    if (!slot) continue;
    const cell = trendCell(series[code] ?? []);
    if (cell) slot.replaceChildren(cell);
  }
}

async function render(): Promise<void> {
  const [cache, settings] = await Promise.all([getCache(), getSettings()]);
  list.replaceChildren();

  const codes = settings.selectedCurrencies.filter((c) => cache?.rates[c]);
  if (!cache || codes.length === 0) {
    empty.hidden = false;
    foot.hidden = true;
    updated.textContent = '';
    return;
  }

  empty.hidden = true;
  foot.hidden = !codes.some(trendSupported);
  for (const code of codes) {
    list.append(card(code, cache.rates[code], settings.badgeRateType));
  }

  const datetime = cache.rates[codes[0]].DATETIME ?? '';
  updated.textContent = `${chrome.i18n.getMessage('updatedAt')} ${datetime}`;

  void applyTrends(codes); // progressive: cards show immediately, trends fill in
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
