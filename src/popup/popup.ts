import './popup.css';
import { getCache, getSettings, setSettings } from '@/lib/storage';
import { getTrends, trendSupported, windowed, TREND_WINDOWS } from '@/lib/trend';
import { initConverter, refreshConverter } from './converter';
import { applyTheme } from '@/lib/theme';
import { currencyName, rateTypeName, RATE_TYPES } from '@/lib/currencies';
import type { CurrencyRate, RateType, TrendPoint, WorkerResponse } from '@/lib/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

const list = document.getElementById('list') as HTMLElement;
const updated = document.getElementById('updated') as HTMLElement;
const windowEl = document.getElementById('window') as HTMLElement;
const empty = document.getElementById('empty') as HTMLElement;
const foot = document.getElementById('foot') as HTMLElement;
const refreshBtn = document.getElementById('refresh') as HTMLButtonElement;

// A full year of series is fetched once; the window toggle just re-slices it.
let fullSeries: Record<string, TrendPoint[]> = {};
let trendCodes: string[] = [];
let windowDays = 30;

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

  // Range slot ("cheap index"): where today sits in the window's low–high band.
  const range = document.createElement('div');
  range.className = 'card__range';

  article.append(head, rates, range);
  return article;
}

// Shared hover tooltip, positioned over whichever anchor dot is hovered.
const tip = document.createElement('div');
tip.className = 'tip';
tip.hidden = true;
document.body.append(tip);

/** Show the market reference value on the BOC board's ×100 scale. */
function fmtScaled(v: number): string {
  const s = v * 100;
  return s >= 100 ? s.toFixed(2) : s.toFixed(4);
}

function showTip(anchor: Element, p: TrendPoint): void {
  tip.textContent = `${p.t} · ${fmtScaled(p.v)}`;
  tip.hidden = false;
  const a = anchor.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const left = Math.max(6, Math.min(a.left + a.width / 2 - t.width / 2, window.innerWidth - t.width - 6));
  const top = a.top - t.height - 6;
  tip.style.left = `${left}px`;
  tip.style.top = `${top < 4 ? a.bottom + 6 : top}px`;
}

const hideTip = (): void => {
  tip.hidden = true;
};

function circle(cx: number, cy: number, r: number, cls: string): SVGCircleElement {
  const c = document.createElementNS(SVG_NS, 'circle');
  c.setAttribute('cx', cx.toFixed(1));
  c.setAttribute('cy', cy.toFixed(1));
  c.setAttribute('r', String(r));
  c.setAttribute('class', cls);
  return c;
}

/** Build an inline SVG sparkline with hoverable first/last/high/low anchors. */
function sparkline(points: TrendPoint[], rising: boolean): SVGSVGElement {
  const w = 96;
  const h = 24;
  const pad = 2;
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1 || 1);
  const xy = values.map((v, i): [number, number] => [
    pad + i * stepX,
    pad + (h - pad * 2) * (1 - (v - min) / range),
  ]);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.classList.add('spark', rising ? 'spark--up' : 'spark--down');

  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('points', xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
  svg.append(line);

  // Anchors by priority, deduped by index (e.g. a monotonic series where
  // first === max). Highest priority wins the dot's colour.
  const anchors: Array<[index: number, role: string]> = [
    [values.length - 1, 'last'],
    [values.indexOf(max), 'max'],
    [values.indexOf(min), 'min'],
    [0, 'first'],
  ];
  const seen = new Set<number>();
  for (const [i, role] of anchors) {
    if (seen.has(i)) continue;
    seen.add(i);
    const [x, y] = xy[i];
    svg.append(circle(x, y, role === 'first' ? 1.4 : 2, `spark__dot spark__dot--${role}`));
    const hit = circle(x, y, 6, 'spark__hit');
    hit.addEventListener('mouseenter', () => showTip(hit, points[i]));
    hit.addEventListener('mouseleave', hideTip);
    svg.append(hit);
  }

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

/** Where the latest value sits in the window's low–high band, as a bar. */
function rangeCell(points: TrendPoint[]): HTMLElement | null {
  if (points.length < 2) return null;
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return null;
  const cur = values[values.length - 1];
  const pos = Math.round(((cur - min) / (max - min)) * 100);

  const wrap = document.createElement('div');
  wrap.className = 'range';
  wrap.title = `${chrome.i18n.getMessage('rangeLow')} ${fmtScaled(min)} · ${chrome.i18n.getMessage('rangeHigh')} ${fmtScaled(max)}`;

  const track = document.createElement('div');
  track.className = 'range__track';
  const fill = document.createElement('div');
  fill.className = 'range__fill';
  fill.style.width = `${pos}%`;
  const marker = document.createElement('div');
  marker.className = 'range__marker';
  marker.style.left = `${pos}%`;
  track.append(fill, marker);

  const cap = document.createElement('span');
  cap.className = 'range__cap';
  cap.textContent = `${pos}%`;

  wrap.append(track, cap);
  return wrap;
}

/** Slice the cached year to the active window and (re)paint trend + range. */
function renderTrends(): void {
  for (const code of trendCodes) {
    const card = list.querySelector<HTMLElement>(`.card[data-code="${code}"]`);
    if (!card) continue;
    const win = windowed(fullSeries[code] ?? [], windowDays);

    const trendSlot = card.querySelector<HTMLElement>('.card__trend');
    if (trendSlot) {
      const cell = trendCell(win);
      trendSlot.replaceChildren(...(cell ? [cell] : []));
    }
    const rangeSlot = card.querySelector<HTMLElement>('.card__range');
    if (rangeSlot) {
      const cell = rangeCell(win);
      rangeSlot.replaceChildren(...(cell ? [cell] : []));
    }
  }
}

/** Fetch the year of series once (progressive), then paint the active window. */
async function applyTrends(codes: string[]): Promise<void> {
  trendCodes = codes;
  if (!codes.some(trendSupported)) return;
  fullSeries = await getTrends(codes);
  renderTrends();
}

/** Build the 30 / 90 / 365-day segmented toggle. */
function buildWindowToggle(): void {
  windowEl.replaceChildren();
  for (const days of TREND_WINDOWS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = days === windowDays ? 'seg is-active' : 'seg';
    btn.textContent = chrome.i18n.getMessage(`win${days}`);
    btn.addEventListener('click', () => {
      if (days === windowDays) return;
      windowDays = days;
      void setSettings({ trendDays: days });
      windowEl.querySelectorAll('.seg').forEach((s) => s.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderTrends(); // instant: no refetch
    });
    windowEl.append(btn);
  }
}

async function render(): Promise<void> {
  const [cache, settings] = await Promise.all([getCache(), getSettings()]);
  applyTheme(settings.theme);
  list.replaceChildren();

  windowDays = settings.trendDays;
  const codes = settings.selectedCurrencies.filter((c) => cache?.rates[c]);
  if (!cache || codes.length === 0) {
    empty.hidden = false;
    foot.hidden = true;
    windowEl.hidden = true;
    updated.textContent = '';
    return;
  }

  empty.hidden = true;
  const hasTrend = codes.some(trendSupported);
  foot.hidden = !hasTrend;
  windowEl.hidden = !hasTrend;
  if (hasTrend) buildWindowToggle();

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
    void refreshConverter(); // keep an open converter in sync with new rates
  }
}

applyI18n();
void render();

refreshBtn.addEventListener('click', () => void refresh());
document.getElementById('empty-refresh')?.addEventListener('click', () => void refresh());
document
  .getElementById('options')
  ?.addEventListener('click', () => chrome.runtime.openOptionsPage());

// Currency converter: reveal on demand, initialised once.
const converter = document.getElementById('converter') as HTMLElement;
const calcBtn = document.getElementById('calc') as HTMLButtonElement;
let converterReady = false;
calcBtn.addEventListener('click', () => {
  const open = converter.classList.toggle('is-open');
  converter.setAttribute('aria-hidden', String(!open));
  calcBtn.classList.toggle('is-active', open);
  if (open && !converterReady) {
    converterReady = true;
    void initConverter();
  }
});
