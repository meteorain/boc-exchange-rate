import './options.css';
import { getCache, getSettings, setSettings } from '@/lib/storage';
import { applyTheme, type Theme } from '@/lib/theme';
import {
  currencyName,
  rateTypeName,
  RATE_TYPES,
  CURRENCY_CODES,
} from '@/lib/currencies';
import type { RateType, Settings, Threshold } from '@/lib/types';

const FREQUENCIES = [10, 30, 60, 120] as const;
const THEMES: Theme[] = ['auto', 'light', 'dark'];

const currencyGrid = document.getElementById('currency-grid') as HTMLElement;
const badgeCurrencySel = document.getElementById('badge-currency') as HTMLSelectElement;
const badgeRateTypeBox = document.getElementById('badge-rate-type') as HTMLElement;
const frequencyBox = document.getElementById('frequency') as HTMLElement;
const themeBox = document.getElementById('theme') as HTMLElement;
const thresholdsBox = document.getElementById('thresholds') as HTMLElement;
const thresholdsEmpty = document.getElementById('thresholds-empty') as HTMLElement;
const toast = document.getElementById('toast') as HTMLElement;

/** Selection order is preserved — it drives the popup's display order. */
let selected: string[] = [];
let availableCodes: string[] = [];
let storedThresholds: Settings['thresholds'] = {};
let placeholderRates: Record<string, number | null> = {};

function applyI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = chrome.i18n.getMessage(el.dataset.i18n!);
  });
}

function option(value: string, label: string, selectedValue: string): HTMLOptionElement {
  const el = document.createElement('option');
  el.value = value;
  el.textContent = label;
  el.selected = value === selectedValue;
  return el;
}

function radioGroup(
  box: HTMLElement,
  name: string,
  items: { value: string; label: string }[],
  current: string,
): void {
  box.replaceChildren();
  for (const item of items) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = item.value;
    input.checked = item.value === current;
    label.append(input, document.createTextNode(item.label));
    box.append(label);
  }
}

// ---- currency chips ----
function renderChips(): void {
  currencyGrid.replaceChildren();
  for (const code of availableCodes) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = selected.includes(code) ? 'chip is-active' : 'chip';
    chip.dataset.code = code;

    const codeEl = document.createElement('span');
    codeEl.className = 'chip__code';
    codeEl.textContent = code;
    const nameEl = document.createElement('span');
    nameEl.textContent = currencyName(code);
    chip.append(codeEl, nameEl);

    chip.addEventListener('click', () => toggleCurrency(code, chip));
    currencyGrid.append(chip);
  }
}

function toggleCurrency(code: string, chip: HTMLElement): void {
  if (selected.includes(code)) {
    selected = selected.filter((c) => c !== code);
    chip.classList.remove('is-active');
  } else {
    selected.push(code);
    chip.classList.add('is-active');
  }
  renderThresholds();
}

// ---- thresholds ----
function renderThresholds(): void {
  thresholdsBox.replaceChildren();
  thresholdsEmpty.hidden = selected.length > 0;

  for (const code of selected) {
    const saved: Partial<Threshold> = storedThresholds[code] ?? {};
    const row = document.createElement('div');
    row.className = 'threshold';
    row.dataset.code = code;

    const name = document.createElement('div');
    name.className = 'threshold__name';
    name.textContent = code;
    const sub = document.createElement('small');
    sub.textContent = currencyName(code);
    name.append(sub);

    const typeSel = document.createElement('select');
    typeSel.className = 'select';
    typeSel.dataset.role = 'rateType';
    for (const type of RATE_TYPES) {
      typeSel.append(option(type, rateTypeName(type), saved.rateType ?? 'MR'));
    }

    const high = numberInput('high', saved.high, code);
    const low = numberInput('low', saved.low, code);

    row.append(name, typeSel, high, low);
    thresholdsBox.append(row);
  }
}

function numberInput(role: 'high' | 'low', value: number | null | undefined, code: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = 'any';
  input.dataset.role = role;
  input.value = value == null ? '' : String(value);
  input.placeholder = chrome.i18n.getMessage(
    role === 'high' ? 'highThreshold' : 'lowThreshold',
  );
  const ref = placeholderRates[code];
  if (ref != null) input.title = String(ref);
  return input;
}

// ---- save ----
function collectThresholds(): Settings['thresholds'] {
  const result: Settings['thresholds'] = {};
  thresholdsBox.querySelectorAll<HTMLElement>('.threshold').forEach((row) => {
    const code = row.dataset.code!;
    const rateType = (row.querySelector('[data-role=rateType]') as HTMLSelectElement)
      .value as RateType;
    const high = parseNum(row.querySelector('[data-role=high]') as HTMLInputElement);
    const low = parseNum(row.querySelector('[data-role=low]') as HTMLInputElement);
    if (high == null && low == null) return; // skip rows with no bounds set
    result[code] = { rateType, high, low };
  });
  return result;
}

function parseNum(input: HTMLInputElement): number | null {
  const n = Number(input.value);
  return input.value.trim() !== '' && Number.isFinite(n) ? n : null;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

async function save(): Promise<void> {
  const badgeRateType = (
    badgeRateTypeBox.querySelector('input:checked') as HTMLInputElement
  ).value as RateType;
  const updateFrequency = Number(
    (frequencyBox.querySelector('input:checked') as HTMLInputElement).value,
  );

  await setSettings({
    selectedCurrencies: selected,
    badgeCurrency: badgeCurrencySel.value,
    badgeRateType,
    updateFrequency,
    thresholds: collectThresholds(),
  });

  showToast(chrome.i18n.getMessage('alertSaved'));
  void chrome.runtime.sendMessage('refresh-badge');
}

// ---- init ----
async function init(): Promise<void> {
  applyI18n();
  const [cache, settings] = await Promise.all([getCache(), getSettings()]);
  applyTheme(settings.theme);

  availableCodes = cache ? Object.keys(cache.rates).sort() : [...CURRENCY_CODES];
  selected = settings.selectedCurrencies.filter((c) => availableCodes.includes(c));
  storedThresholds = settings.thresholds;
  placeholderRates = Object.fromEntries(
    availableCodes.map((c) => [c, cache?.rates[c]?.MR ?? null]),
  );

  renderChips();
  renderThresholds();

  badgeCurrencySel.replaceChildren(
    ...availableCodes.map((c) => option(c, `${c} · ${currencyName(c)}`, settings.badgeCurrency)),
  );

  radioGroup(
    badgeRateTypeBox,
    'badgeRateType',
    RATE_TYPES.map((t) => ({ value: t, label: rateTypeName(t) })),
    settings.badgeRateType,
  );

  radioGroup(
    frequencyBox,
    'frequency',
    FREQUENCIES.map((f) => ({ value: String(f), label: chrome.i18n.getMessage(`freq${f}`) })),
    String(settings.updateFrequency),
  );

  // Theme applies instantly and persists on change — no Save needed.
  radioGroup(
    themeBox,
    'theme',
    THEMES.map((t) => ({ value: t, label: chrome.i18n.getMessage(`theme_${t}`) })),
    settings.theme,
  );
  themeBox.addEventListener('change', (e) => {
    const theme = (e.target as HTMLInputElement).value as Theme;
    applyTheme(theme);
    void setSettings({ theme });
  });

  document.getElementById('save')?.addEventListener('click', () => void save());
}

void init();
