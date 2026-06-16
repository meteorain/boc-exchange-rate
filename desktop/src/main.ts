import './app.css';
import { parseRates } from '@lib/boc';
import { currencyName, rateTypeName, RATE_TYPES } from '@lib/currencies';
import { formatBadge } from '@lib/format';
import type { CurrencyRate, RatesMap, TrendPoint } from '@lib/types';
import { applyTheme } from '@lib/theme';
import { fetchText, setBadge, store, onSettingsChange } from './platform';
import { getTrends, windowed, trendSupported, TREND_WINDOWS } from './trend';
import { trendCell, rangeCell } from './chart';
import { initConverter, refreshConverter } from './converter';
import { recordSnapshot, getHistory, previousValue, dayOf, type BoardHistory } from './history';
import { checkThresholds, checkSmartAlerts, maybeSendDailySummary } from './alerts';
import { loadSettings, DEFAULTS, type DesktopSettings } from './settings-store';
import { t, applyI18n } from './i18n';

// Badge pill colour by the day's move (red up / green down / blue flat).
const BADGE_FLAT = '#2563eb';
const BADGE_UP = '#e5484d';
const BADGE_DOWN = '#30a46c';
import logoUrl from '../../public/images/icon128.png';

const logo = new Image();
logo.src = logoUrl;
const logoReady = logo.decode().catch(() => undefined);

const BOC_URL = 'https://www.boc.cn/sourcedb/whpj/enindex_1619.html';

let cfg: DesktopSettings = DEFAULTS;
let pollTimer: ReturnType<typeof setInterval> | undefined;

const list = document.getElementById('list') as HTMLElement;
const updated = document.getElementById('updated') as HTMLElement;
const windowEl = document.getElementById('window') as HTMLElement;
const foot = document.getElementById('foot') as HTMLElement;
const notice = document.getElementById('notice') as HTMLElement;
const refreshBtn = document.getElementById('refresh') as HTMLButtonElement;

// A full year of trend series is fetched once; the toggle re-slices it.
let fullSeries: Record<string, TrendPoint[]> = {};
let trendCodes: string[] = [];
let windowDays = 30;
let lastFetchedAt = 0;

/** Today's date in Beijing time as "YYYY/MM/DD" (matches the board format). */
function beijingToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' })
    .format(new Date())
    .replace(/-/g, '/');
}

function updateNotice(publishDay: string, frequency: number): void {
  const ageMin = (Date.now() - lastFetchedAt) / 60000;
  if (lastFetchedAt > 0 && ageMin > Math.max(frequency * 3, 90)) {
    notice.className = 'notice notice--warn';
    notice.textContent = t('staleNote');
    notice.hidden = false;
  } else if (publishDay && publishDay !== beijingToday()) {
    notice.className = 'notice';
    notice.textContent = t('closedNote');
    notice.hidden = false;
  } else {
    notice.hidden = true;
  }
}

function card(code: string, rate: CurrencyRate): HTMLElement {
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
  const trend = document.createElement('div');
  trend.className = 'card__trend';
  head.append(codeEl, nameEl, trend);

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

  const range = document.createElement('div');
  range.className = 'card__range';

  article.append(head, rates, range);
  return article;
}

/** Slice the cached year to the active window and paint trend + range slots. */
function renderTrends(): void {
  for (const code of trendCodes) {
    const el = list.querySelector<HTMLElement>(`.card[data-code="${code}"]`);
    if (!el) continue;
    const win = windowed(fullSeries[code] ?? [], windowDays);
    const trendSlot = el.querySelector<HTMLElement>('.card__trend');
    if (trendSlot) {
      const cell = trendCell(win);
      trendSlot.replaceChildren(...(cell ? [cell] : []));
    }
    const rangeSlot = el.querySelector<HTMLElement>('.card__range');
    if (rangeSlot) {
      const cell = rangeCell(win);
      rangeSlot.replaceChildren(...(cell ? [cell] : []));
    }
  }
}

async function applyTrends(codes: string[]): Promise<void> {
  trendCodes = codes;
  if (!codes.some(trendSupported)) return;
  fullSeries = await getTrends(codes);
  renderTrends();
}

function buildWindowToggle(): void {
  windowEl.replaceChildren();
  for (const days of TREND_WINDOWS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = days === windowDays ? 'seg is-active' : 'seg';
    btn.textContent = t(`win${days}`);
    btn.addEventListener('click', () => {
      if (days === windowDays) return;
      windowDays = days;
      void store.set('trendDays', days);
      windowEl.querySelectorAll('.seg').forEach((s) => s.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderTrends();
    });
    windowEl.append(btn);
  }
}

const IS_MAC = /Macintosh|Mac OS X/i.test(navigator.userAgent);
const FONT = '-apple-system, "Segoe UI", system-ui, sans-serif';

type Icon = { rgba: number[]; width: number; height: number };

function readPixels(ctx: CanvasRenderingContext2D, w: number, h: number): Icon {
  return { rgba: Array.from(ctx.getImageData(0, 0, w, h).data), width: w, height: h };
}

/**
 * macOS menu bar: a big number pill with the logo tucked behind it, peeking
 * out only at the top. The pill keeps its large, legible size; the menu bar
 * scales the whole image to its height.
 */
function wideBadge(text: string, color: string): Icon {
  const fontSize = 40;
  const padX = 16;
  const pillH = 56;
  const logoSize = 58;
  const sliver = 14; // how much of the logo shows above the pill

  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = `800 ${fontSize}px ${FONT}`;
  const pillW = Math.ceil(measure.measureText(text).width) + padX * 2;
  const w = Math.max(pillW, logoSize);
  const h = sliver + pillH;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Logo behind, only its top edge peeking above the pill.
  if (logo.naturalWidth) ctx.drawImage(logo, (w - logoSize) / 2, 0, logoSize, logoSize);

  // Big number pill overlapping the lower part of the logo.
  const pillX = (w - pillW) / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(pillX, sliver, pillW, pillH, pillH / 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fontSize}px ${FONT}`;
  ctx.fillText(text, w / 2, sliver + pillH / 2 + 1);

  return readPixels(ctx, w, h);
}

/**
 * Windows/Linux tray (a small square slot): a big number filling the square,
 * with the logo tucked behind and peeking only at the top — same idea as
 * macOS, squared off so it stays legible in the tiny tray.
 */
function squareBadge(text: string, color: string): Icon {
  const size = 64;
  const sliver = 12; // how much of the logo shows above the pill
  const pad = 8;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Logo behind, only its top edge peeking above the pill.
  if (logo.naturalWidth) ctx.drawImage(logo, 0, 0, size, size);

  // Big number pill filling the square below the sliver.
  const pillY = sliver;
  const pillH = size - sliver - 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(1, pillY, size - 2, pillH, 13);
  ctx.fill();

  // Fit the number to the pill width so it's as large as possible.
  let fontSize = 40;
  ctx.font = `800 ${fontSize}px ${FONT}`;
  const maxW = size - 2 - pad * 2;
  const textW = ctx.measureText(text).width;
  if (textW > maxW) fontSize = Math.floor((fontSize * maxW) / textW);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fontSize}px ${FONT}`;
  ctx.fillText(text, size / 2, pillY + pillH / 2 + 1);

  return readPixels(ctx, size, size);
}

async function updateBadge(rate: number | null | undefined, prev: number | null): Promise<void> {
  await logoReady;
  const short = rate != null ? formatBadge(rate) : '—';
  let color = BADGE_FLAT;
  if (rate != null && prev != null && prev !== 0 && rate !== prev) {
    color = rate > prev ? BADGE_UP : BADGE_DOWN;
  }
  const icon = IS_MAC ? wideBadge(short, color) : squareBadge(short, color);
  await setBadge(icon.rgba, icon.width, icon.height, rate != null ? `¥${short}` : '—');
}

/** Colour the badge by today-vs-previous-day for the chosen currency/rate. */
async function paintBadge(rates: RatesMap, history: BoardHistory): Promise<void> {
  const current = rates[cfg.badgeCurrency];
  const rate = current?.[cfg.badgeRateType] ?? null;
  const prev = previousValue(history[cfg.badgeCurrency], cfg.badgeRateType, dayOf(current?.DATETIME));
  await updateBadge(rate, prev);
}

function render(rates: RatesMap, selected: string[]): void {
  list.replaceChildren();
  const codes = selected.filter((c) => rates[c]);
  for (const code of codes) list.append(card(code, rates[code]));
  updated.textContent = codes.length
    ? `${t('updatedAt')} ${rates[codes[0]].DATETIME ?? ''}`
    : t('noData');

  if (codes.length === 0) notice.hidden = true;
  else updateNotice(rates[codes[0]].DATETIME?.slice(0, 10) ?? '', cfg.updateFrequency);

  const hasTrend = codes.some(trendSupported);
  windowEl.hidden = !hasTrend;
  foot.hidden = !hasTrend;
  if (hasTrend) buildWindowToggle();
  void applyTrends(codes);
}

async function refresh(): Promise<void> {
  refreshBtn.classList.add('is-loading');
  try {
    const rates = parseRates(await fetchText(BOC_URL));
    if (Object.keys(rates).length === 0) throw new Error('parsed zero currencies');
    lastFetchedAt = Date.now();
    await store.set('rates', rates);
    await store.set('fetchedAt', lastFetchedAt);
    const history = await recordSnapshot(rates);

    render(rates, cfg.selected);
    await paintBadge(rates, history);
    void refreshConverter();
    void checkThresholds(rates, cfg);
    void checkSmartAlerts(rates, cfg, history);
  } catch (error) {
    console.error('Refresh failed:', error);
  } finally {
    refreshBtn.classList.remove('is-loading');
  }
}

function startPoll(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => void refresh(), cfg.updateFrequency * 60 * 1000);
}

/** Re-apply settings after the settings window saves. */
async function applySettings(): Promise<void> {
  cfg = await loadSettings();
  windowDays = cfg.trendDays;
  applyTheme(cfg.theme);
  const rates = (await store.get<RatesMap>('rates')) ?? {};
  render(rates, cfg.selected);
  await paintBadge(rates, await getHistory());
  startPoll();
}

async function init(): Promise<void> {
  applyI18n();
  cfg = await loadSettings();
  windowDays = cfg.trendDays;
  applyTheme(cfg.theme);

  lastFetchedAt = (await store.get<number>('fetchedAt')) ?? 0;
  const cached = await store.get<RatesMap>('rates');
  if (cached) render(cached, cfg.selected);
  await refresh();
  startPoll();
  setInterval(() => void maybeSendDailySummary(), 30_000);
  void onSettingsChange(() => void applySettings());
}

refreshBtn.addEventListener('click', () => void refresh());

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

void init();
