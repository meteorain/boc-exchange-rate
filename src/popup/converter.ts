import { getCache, getSettings } from '@/lib/storage';
import { currencyName, rateTypeName } from '@/lib/currencies';
import { convert, spreadPct, CNY } from '@/lib/convert';
import type { RatesMap } from '@/lib/types';

const QUICK = [100, 1000, 10000];
const msg = (k: string): string => chrome.i18n.getMessage(k);

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

  const [cache, settings] = await Promise.all([getCache(), getSettings()]);
  rates = cache?.rates ?? {};
  const codes = Object.keys(rates).sort();
  if (codes.length === 0) return;

  const makeOptions = (selected: string): DocumentFragment => {
    const frag = document.createDocumentFragment();
    const cny = new Option(`¥ CNY`, CNY, false, selected === CNY);
    frag.append(cny);
    for (const c of codes) {
      frag.append(new Option(`${c} · ${currencyName(c)}`, c, false, selected === c));
    }
    return frag;
  };
  const fromDefault = rates[settings.badgeCurrency] ? settings.badgeCurrency : codes[0];
  from.replaceChildren(makeOptions(fromDefault));
  to.replaceChildren(makeOptions(CNY));

  // 现汇 / 现钞 toggle (used only when one side is CNY).
  const buildCashBar = (): void => {
    cashBar.replaceChildren();
    ([['convWire', false], ['convCash', true]] as const).forEach(([key, isCash]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = isCash === cash ? 'seg is-active' : 'seg';
      btn.textContent = msg(key);
      btn.addEventListener('click', () => {
        if (cash === isCash) return;
        cash = isCash;
        buildCashBar();
        recompute?.();
      });
      cashBar.append(btn);
    });
  };

  // Quick amount chips.
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

    // Empty/invalid input: blank result, no "no quote" message.
    if (!Number.isFinite(amt)) {
      out.textContent = '—';
      rateLine.textContent = '';
      return;
    }

    const res = convert(rates, fromCode, toCode, amt, cash);
    if (res.value == null) {
      out.textContent = '—';
      rateLine.textContent = msg('convNoQuote');
      return;
    }

    out.textContent = format(res.value);
    if (res.cross) {
      rateLine.textContent = `${msg('convCross')} · ${rateTypeName('MR')}`;
    } else if (res.rateType && res.rate != null) {
      const foreign = toCode === CNY ? fromCode : toCode;
      const sp = spreadPct(rates, foreign);
      const tail = sp != null ? ` · ${msg('convSpread')} ${sp.toFixed(2)}%` : '';
      rateLine.textContent = `${rateTypeName(res.rateType)} ${res.rate}${tail}`;
    } else {
      rateLine.textContent = ''; // same currency
    }
  };

  copy.addEventListener('click', () => {
    if (out.textContent && out.textContent !== '—') {
      // Strip the grouping commas so the copied text is a clean number.
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
  const cache = await getCache();
  if (cache) {
    rates = cache.rates;
    recompute();
  }
}
