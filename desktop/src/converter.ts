import { currencyName, rateTypeName } from '@lib/currencies';
import { convert, spreadPct, CNY } from '@lib/convert';
import type { RatesMap } from '@lib/types';
import { store } from './platform';
import { t } from './i18n';

const QUICK = [100, 1000, 10000];
const DEFAULT_FROM = 'USD';

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const fmtSmall = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const format = (n: number): string => (Math.abs(n) < 1 ? fmtSmall : fmt).format(n);

let rates: RatesMap = {};
let cash = false;
let recompute: (() => void) | null = null;

export async function initConverter(): Promise<void> {
  const amount = document.getElementById('conv-amount') as HTMLInputElement;
  const from = document.getElementById('conv-from') as HTMLSelectElement;
  const to = document.getElementById('conv-to') as HTMLSelectElement;
  const cashBar = document.getElementById('conv-cash') as HTMLElement;
  const quick = document.getElementById('conv-quick') as HTMLElement;
  const out = document.getElementById('conv-out') as HTMLElement;
  const rateLine = document.getElementById('conv-rate') as HTMLElement;
  const swap = document.getElementById('conv-swap') as HTMLButtonElement;
  const copy = document.getElementById('conv-copy') as HTMLButtonElement;

  rates = (await store.get<RatesMap>('rates')) ?? {};
  const codes = Object.keys(rates).sort();
  if (codes.length === 0) return;

  const makeOptions = (selected: string): DocumentFragment => {
    const frag = document.createDocumentFragment();
    frag.append(new Option(`¥ CNY`, CNY, false, selected === CNY));
    for (const c of codes) {
      frag.append(new Option(`${c} · ${currencyName(c)}`, c, false, selected === c));
    }
    return frag;
  };
  const fromDefault = rates[DEFAULT_FROM] ? DEFAULT_FROM : codes[0];
  from.replaceChildren(makeOptions(fromDefault));
  to.replaceChildren(makeOptions(CNY));

  const buildCashBar = (): void => {
    cashBar.replaceChildren();
    ([['convWire', false], ['convCash', true]] as const).forEach(([key, isCash]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = isCash === cash ? 'seg is-active' : 'seg';
      btn.textContent = t(key);
      btn.addEventListener('click', () => {
        if (cash === isCash) return;
        cash = isCash;
        buildCashBar();
        recompute?.();
      });
      cashBar.append(btn);
    });
  };

  quick.replaceChildren(
    ...QUICK.map((v) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'conv__chip';
      btn.textContent = v.toLocaleString('en-US');
      btn.addEventListener('click', () => {
        amount.value = String(v);
        recompute?.();
      });
      return btn;
    }),
  );

  recompute = (): void => {
    const fromCode = from.value;
    const toCode = to.value;
    const amt = Number(amount.value);
    cashBar.classList.toggle('is-muted', fromCode !== CNY && toCode !== CNY);

    if (!Number.isFinite(amt)) {
      out.textContent = '—';
      rateLine.textContent = '';
      return;
    }

    const res = convert(rates, fromCode, toCode, amt, cash);
    if (res.value == null) {
      out.textContent = '—';
      rateLine.textContent = t('convNoQuote');
      return;
    }

    out.textContent = format(res.value);
    if (res.cross) {
      rateLine.textContent = `${t('convCross')} · ${rateTypeName('MR')}`;
    } else if (res.rateType && res.rate != null) {
      const foreign = toCode === CNY ? fromCode : toCode;
      const sp = spreadPct(rates, foreign);
      const tail = sp != null ? ` · ${t('convSpread')} ${sp.toFixed(2)}%` : '';
      rateLine.textContent = `${rateTypeName(res.rateType)} ${res.rate}${tail}`;
    } else {
      rateLine.textContent = '';
    }
  };

  copy.addEventListener('click', () => {
    if (out.textContent && out.textContent !== '—') {
      void navigator.clipboard?.writeText(out.textContent.replace(/,/g, ''));
      copy.classList.add('is-copied');
      setTimeout(() => copy.classList.remove('is-copied'), 1200);
    }
  });

  swap.addEventListener('click', () => {
    [from.value, to.value] = [to.value, from.value];
    recompute?.();
  });
  amount.addEventListener('input', () => recompute?.());
  from.addEventListener('change', () => recompute?.());
  to.addEventListener('change', () => recompute?.());

  buildCashBar();
  recompute();
}

/** Re-read the latest rates after a manual refresh, if the converter is open. */
export async function refreshConverter(): Promise<void> {
  if (!recompute) return;
  const latest = await store.get<RatesMap>('rates');
  if (latest) {
    rates = latest;
    recompute();
  }
}
