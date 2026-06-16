import '../../src/options/options.css';
import { applyTheme, type Theme } from '@lib/theme';
import { currencyName, rateTypeName, RATE_TYPES, CURRENCY_CODES } from '@lib/currencies';
import type { RateType, Threshold } from '@lib/types';
import { store } from './platform';
import { loadSettings, bumpSettingsVersion } from './settings-store';
import { t } from './i18n';

const FREQUENCIES = [10, 30, 60, 120] as const;
const THEMES: Theme[] = ['auto', 'light', 'dark'];
const EXTREME_WINDOWS = [7, 30, 90] as const;

const currencyGrid = document.getElementById('currency-grid') as HTMLElement;
const currencySearch = document.getElementById('currency-search') as HTMLInputElement;
const orderBox = document.getElementById('currency-order') as HTMLElement;
const badgeCurrencySel = document.getElementById('badge-currency') as HTMLSelectElement;
const badgeRateTypeBox = document.getElementById('badge-rate-type') as HTMLElement;
const frequencyBox = document.getElementById('frequency') as HTMLElement;
const themeBox = document.getElementById('theme') as HTMLElement;
const thresholdsBox = document.getElementById('thresholds') as HTMLElement;
const thresholdsEmpty = document.getElementById('thresholds-empty') as HTMLElement;
const summaryOn = document.getElementById('summary-on') as HTMLInputElement;
const summaryTime = document.getElementById('summary-time') as HTMLInputElement;
const moveOn = document.getElementById('move-on') as HTMLInputElement;
const movePercent = document.getElementById('move-percent') as HTMLInputElement;
const extremeOn = document.getElementById('extreme-on') as HTMLInputElement;
const extremeDays = document.getElementById('extreme-days') as HTMLSelectElement;
const toast = document.getElementById('toast') as HTMLElement;

let selected: string[] = [];
let availableCodes: string[] = [];
let storedThresholds: Record<string, Threshold> = {};
let placeholderRates: Record<string, number | null> = {};

function applyI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
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

function filterChips(query: string): void {
  const q = query.trim().toLowerCase();
  currencyGrid.querySelectorAll<HTMLElement>('.chip').forEach((chip) => {
    const code = chip.dataset.code!;
    chip.hidden = q !== '' && !code.toLowerCase().includes(q) && !currencyName(code).toLowerCase().includes(q);
  });
}

function toggleCurrency(code: string, chip: HTMLElement): void {
  if (selected.includes(code)) {
    selected = selected.filter((c) => c !== code);
    chip.classList.remove('is-active');
  } else {
    selected.push(code);
    chip.classList.add('is-active');
  }
  renderOrder();
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
    for (const rt of RATE_TYPES) {
      typeSel.append(option(rt, rateTypeName(rt), saved.rateType ?? 'MR'));
    }

    row.append(name, typeSel, numberInput('high', saved.high, code), numberInput('low', saved.low, code));
    thresholdsBox.append(row);
  }
}

function numberInput(role: 'high' | 'low', value: number | null | undefined, code: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = 'any';
  input.dataset.role = role;
  input.value = value == null ? '' : String(value);
  input.placeholder = t(role === 'high' ? 'highThreshold' : 'lowThreshold');
  const ref = placeholderRates[code];
  if (ref != null) input.title = String(ref);
  return input;
}

function collectThresholds(): Record<string, Threshold> {
  const result: Record<string, Threshold> = {};
  thresholdsBox.querySelectorAll<HTMLElement>('.threshold').forEach((row) => {
    const code = row.dataset.code!;
    const rateType = (row.querySelector('[data-role=rateType]') as HTMLSelectElement).value as RateType;
    const high = parseNum(row.querySelector('[data-role=high]') as HTMLInputElement);
    const low = parseNum(row.querySelector('[data-role=low]') as HTMLInputElement);
    if (high == null && low == null) return;
    result[code] = { rateType, high, low };
  });
  return result;
}

function parseNum(input: HTMLInputElement): number | null {
  const n = Number(input.value);
  return input.value.trim() !== '' && Number.isFinite(n) ? n : null;
}

function bindAlert(toggle: HTMLInputElement, controls: Array<HTMLInputElement | HTMLSelectElement>): void {
  const sync = (): void => controls.forEach((c) => (c.disabled = !toggle.checked));
  sync();
  toggle.addEventListener('change', sync);
}

// ---- reorderable display-order strip ----
let dragIndex = -1;

function renderOrder(): void {
  orderBox.replaceChildren();
  orderBox.hidden = selected.length < 2;
  selected.forEach((code) => {
    const pill = document.createElement('div');
    pill.className = 'order-pill';
    pill.draggable = true;
    pill.dataset.code = code;
    pill.title = currencyName(code);
    const grip = document.createElement('span');
    grip.className = 'order-pill__grip';
    grip.textContent = '⠿';
    pill.append(grip, document.createTextNode(code));

    pill.addEventListener('dragstart', () => {
      dragIndex = selected.indexOf(code);
      pill.classList.add('is-dragging');
    });
    pill.addEventListener('dragend', () => {
      dragIndex = -1;
      orderBox.querySelectorAll('.order-pill').forEach((p) => p.classList.remove('is-dragging', 'is-over'));
    });
    pill.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (pill.dataset.code !== selected[dragIndex]) pill.classList.add('is-over');
    });
    pill.addEventListener('dragleave', () => pill.classList.remove('is-over'));
    pill.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragIndex < 0 || selected[dragIndex] === code) return;
      const [moved] = selected.splice(dragIndex, 1);
      selected.splice(selected.indexOf(code), 0, moved);
      renderOrder();
    });

    orderBox.append(pill);
  });
}

// ---- save ----
let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

async function save(): Promise<void> {
  const badgeRateType = (badgeRateTypeBox.querySelector('input:checked') as HTMLInputElement | null)
    ?.value as RateType | undefined;
  const freq = (frequencyBox.querySelector('input:checked') as HTMLInputElement | null)?.value;

  const movePct = Number(movePercent.value);
  await Promise.all([
    store.set('selected', selected),
    store.set('badgeCurrency', badgeCurrencySel.value),
    store.set('badgeRateType', badgeRateType ?? 'MR'),
    store.set('updateFrequency', freq ? Number(freq) : 30),
    store.set('thresholds', collectThresholds()),
    store.set('dailySummary', { enabled: summaryOn.checked, time: summaryTime.value || '10:00' }),
    store.set('moveAlert', {
      enabled: moveOn.checked,
      percent: Number.isFinite(movePct) && movePct > 0 ? movePct : 1,
    }),
    store.set('extremeAlert', { enabled: extremeOn.checked, days: Number(extremeDays.value) || 30 }),
  ]);
  await bumpSettingsVersion();
  showToast(t('alertSaved'));
}

// ---- init ----
async function init(): Promise<void> {
  applyI18n();
  currencySearch.placeholder = t('searchPlaceholder');

  const settings = await loadSettings();
  const rates = (await store.get<Record<string, unknown>>('rates')) ?? {};
  applyTheme(settings.theme);

  availableCodes = Object.keys(rates).length ? Object.keys(rates).sort() : [...CURRENCY_CODES];
  selected = settings.selected.filter((c) => availableCodes.includes(c));
  storedThresholds = settings.thresholds;
  placeholderRates = Object.fromEntries(
    availableCodes.map((c) => [c, (rates[c] as { MR?: number | null } | undefined)?.MR ?? null]),
  );

  renderChips();
  renderOrder();
  renderThresholds();
  currencySearch.addEventListener('input', () => filterChips(currencySearch.value));

  badgeCurrencySel.replaceChildren(
    ...availableCodes.map((c) => option(c, `${c} · ${currencyName(c)}`, settings.badgeCurrency)),
  );
  radioGroup(
    badgeRateTypeBox,
    'badgeRateType',
    RATE_TYPES.map((rt) => ({ value: rt, label: rateTypeName(rt) })),
    settings.badgeRateType,
  );
  radioGroup(
    frequencyBox,
    'frequency',
    FREQUENCIES.map((f) => ({ value: String(f), label: t(`freq${f}`) })),
    String(settings.updateFrequency),
  );
  radioGroup(
    themeBox,
    'theme',
    THEMES.map((th) => ({ value: th, label: t(`theme_${th}`) })),
    settings.theme,
  );
  themeBox.addEventListener('change', (e) => {
    const theme = (e.target as HTMLInputElement).value as Theme;
    applyTheme(theme);
    void store.set('theme', theme).then(() => bumpSettingsVersion());
  });

  // Smart alerts.
  extremeDays.replaceChildren(
    ...EXTREME_WINDOWS.map((d) =>
      option(String(d), `${d} ${t('alertDaysUnit')}`, String(settings.extremeAlert.days)),
    ),
  );
  summaryOn.checked = settings.dailySummary.enabled;
  summaryTime.value = settings.dailySummary.time;
  moveOn.checked = settings.moveAlert.enabled;
  movePercent.value = String(settings.moveAlert.percent);
  extremeOn.checked = settings.extremeAlert.enabled;
  bindAlert(summaryOn, [summaryTime]);
  bindAlert(moveOn, [movePercent]);
  bindAlert(extremeOn, [extremeDays]);

  document.getElementById('save')?.addEventListener('click', () => void save());
}

void init();
