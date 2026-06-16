import type { TrendPoint } from '@lib/types';
import { t } from './i18n';

const SVG_NS = 'http://www.w3.org/2000/svg';

const tip = document.createElement('div');
tip.className = 'tip';
tip.hidden = true;
document.body.append(tip);

/** Market reference value on the BOC board's x100 scale (matches card numbers). */
export function fmtScaled(v: number): string {
  const s = v * 100;
  return s >= 100 ? s.toFixed(2) : s.toFixed(4);
}

function showText(anchor: Element, text: string): void {
  tip.textContent = text;
  tip.hidden = false;
  const a = anchor.getBoundingClientRect();
  const r = tip.getBoundingClientRect();
  const left = Math.max(6, Math.min(a.left + a.width / 2 - r.width / 2, window.innerWidth - r.width - 6));
  const top = a.top - r.height - 6;
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

  const anchors: Array<[number, string]> = [
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
    hit.addEventListener('mouseenter', () => showText(hit, `${points[i].t} · ${fmtScaled(points[i].v)}`));
    hit.addEventListener('mouseleave', hideTip);
    svg.append(hit);
  }
  return svg;
}

/** Sparkline + window percentage change. */
export function trendCell(points: TrendPoint[]): HTMLElement | null {
  if (points.length < 2) return null;
  const first = points[0].v;
  const last = points[points.length - 1].v;
  const pct = ((last - first) / first) * 100;
  const rising = pct >= 0;

  const wrap = document.createElement('div');
  wrap.className = 'trend';
  const delta = document.createElement('span');
  delta.className = `trend__delta ${rising ? 'is-up' : 'is-down'}`;
  delta.textContent = `${rising ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`;
  wrap.append(sparkline(points, rising), delta);
  return wrap;
}

/** "Cheap index": where the latest value sits in the window's low–high band. */
export function rangeCell(points: TrendPoint[]): HTMLElement | null {
  if (points.length < 2) return null;
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return null;
  const pos = Math.round(((values[values.length - 1] - min) / (max - min)) * 100);

  const wrap = document.createElement('div');
  wrap.className = 'range';
  const tipText = `${t('rangeLow')} ${fmtScaled(min)} · ${t('rangeHigh')} ${fmtScaled(max)}`;
  wrap.setAttribute('aria-label', tipText);
  wrap.addEventListener('mouseenter', () => showText(wrap, tipText));
  wrap.addEventListener('mouseleave', hideTip);

  const lowEnd = document.createElement('span');
  lowEnd.className = 'range__end';
  lowEnd.textContent = t('rangeEndLow');
  const track = document.createElement('div');
  track.className = 'range__track';
  const fill = document.createElement('div');
  fill.className = 'range__fill';
  fill.style.width = `${pos}%`;
  const tick = document.createElement('i');
  tick.className = 'range__tick';
  tick.style.left = `${pos}%`;
  track.append(fill, tick);
  const highEnd = document.createElement('span');
  highEnd.className = 'range__end';
  highEnd.textContent = t('rangeEndHigh');

  const qualKey = pos < 33 ? 'rangeLowPos' : pos > 67 ? 'rangeHighPos' : 'rangeMidPos';
  const cap = document.createElement('span');
  cap.className = 'range__cap';
  cap.textContent = t(qualKey);

  wrap.append(lowEnd, track, highEnd, cap);
  return wrap;
}
