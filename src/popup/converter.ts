import { getCache, getSettings } from '@/lib/storage';
import { currencyName, rateTypeName } from '@/lib/currencies';
import type { RatesMap, RateType } from '@/lib/types';

/**
 * Converter with the correct board column for each trade:
 * - foreign → CNY uses the bank's buying rate (现汇/现钞买入价)
 * - CNY → foreign uses the selling rate (现汇/现钞卖出价)
 * - foreign → foreign is a cross rate via the middle rate (中行折算价)
 * BOC quotes per 100 units, handled here.
 */

const CNY = 'CNY';
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

    if (!Number.isFinite(amt)) {
      out.textContent = '—';
      rateLine.textContent = '';
      return;
    }
    if (fromCode === toCode) {
      out.textContent = format(amt);
      rateLine.textContent = '';
      return;
    }

    let result: number | null = null;
    let detail = '';

    if (toCode === CNY) {
      // Sell foreign to the bank → buying rate.
      const type: RateType = cash ? 'CBR' : 'BR';
      const rate = rates[fromCode]?.[type] ?? null;
      if (rate != null) {
        result = (amt * rate) / 100;
        detail = `${rateTypeName(type)} ${rate}${spread(fromCode)}`;
      }
    } else if (fromCode === CNY) {
      // Buy foreign from the bank → selling rate.
      const type: RateType = cash ? 'CSR' : 'SR';
      const rate = rates[toCode]?.[type] ?? null;
      if (rate != null) {
        result = (amt * 100) / rate;
        detail = `${rateTypeName(type)} ${rate}${spread(toCode)}`;
      }
    } else {
      // Cross rate via each currency's middle rate.
      const mf = rates[fromCode]?.MR ?? null;
      const mt = rates[toCode]?.MR ?? null;
      if (mf != null && mt != null) {
        result = (amt * mf) / mt;
        detail = `${msg('convCross')} · ${rateTypeName('MR')}`;
      }
    }

    if (result == null) {
      out.textContent = '—';
      rateLine.textContent = msg('convNoQuote');
    } else {
      out.textContent = format(result);
      rateLine.textContent = detail;
    }
  };

  copy.addEventListener('click', () => {
    if (out.textContent && out.textContent !== '—') {
      void navigator.clipboard?.writeText(out.textContent);
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

/** Percentage spread between the foreign currency's buy and sell rates. */
function spread(code: string): string {
  const r = rates[code];
  if (!r || r.BR == null || r.SR == null || r.BR === 0) return '';
  const pct = ((r.SR - r.BR) / r.BR) * 100;
  return ` · ${msg('convSpread')} ${pct.toFixed(2)}%`;
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
