import { fetchRates } from '@/lib/boc';
import { getTrends } from '@/lib/trend';
import {
  recordSnapshot,
  getHistory,
  previousValue,
  extremes,
  dayOf,
  type BoardHistory,
} from '@/lib/history';
import { getSettings, getCache, setCache } from '@/lib/storage';
import { currencyName, CURRENCY_EMOJI } from '@/lib/currencies';
import { formatBadge } from '@/lib/format';
import type { RatesMap, Settings, WorkerMessage, WorkerResponse } from '@/lib/types';

const ALARM_NAME = 'fetchExchangeRates';
const SUMMARY_ALARM = 'dailySummary';
// Badge background encodes the day's direction (red up / green down, CN style).
const BADGE_FLAT = '#2563eb';
const BADGE_UP = '#e5484d';
const BADGE_DOWN = '#30a46c';

/** Fetch the latest rates, cache them, refresh the badge and fire alerts. */
async function refreshRates(): Promise<void> {
  const rates = await fetchRates();
  await setCache({ rates, fetchedAt: Date.now() });
  const history = await recordSnapshot(rates);

  const settings = await getSettings();
  await updateBadge(rates, settings, history);
  await checkThresholds(rates, settings);
  await checkSmartAlerts(rates, settings, history);

  // Keep the market-trend cache warm; self-throttled and never fatal.
  await getTrends(settings.selectedCurrencies).catch(() => {});
}

async function updateBadge(
  rates: RatesMap,
  settings: Settings,
  history: BoardHistory,
): Promise<void> {
  const current = rates[settings.badgeCurrency];
  const rate = current?.[settings.badgeRateType];

  if (rate == null) {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: chrome.i18n.getMessage('noData') });
    return;
  }

  // Compare with the previous publish day to colour the badge.
  const prev = previousValue(
    history[settings.badgeCurrency],
    settings.badgeRateType,
    dayOf(current.DATETIME),
  );
  let color = BADGE_FLAT;
  let change = '';
  if (prev != null && prev !== 0 && rate !== prev) {
    const up = rate > prev;
    color = up ? BADGE_UP : BADGE_DOWN;
    change = `  ${up ? '▲' : '▼'}${(Math.abs((rate - prev) / prev) * 100).toFixed(2)}%`;
  }

  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text: formatBadge(rate) });
  await chrome.action.setTitle({
    title: `${currencyName(settings.badgeCurrency)} · ${rate}${change}  @ ${current.DATETIME ?? ''}`,
  });
}

/**
 * Edge-triggered threshold alerts: notify only when a rate first crosses a
 * bound, not on every poll while it stays out of range.
 */
async function checkThresholds(rates: RatesMap, settings: Settings): Promise<void> {
  const { breachState = {} } = await chrome.storage.local.get('breachState');
  const nextState: Record<string, boolean> = {};

  for (const [code, threshold] of Object.entries(settings.thresholds)) {
    const value = rates[code]?.[threshold.rateType];
    if (value == null) continue;

    for (const bound of ['high', 'low'] as const) {
      const limit = threshold[bound];
      if (limit == null) continue;

      const key = `${code}:${threshold.rateType}:${bound}`;
      const breached = bound === 'high' ? value >= limit : value <= limit;
      nextState[key] = breached;

      if (breached && !breachState[key]) {
        notify(code, bound, value, limit);
      }
    }
  }

  await chrome.storage.local.set({ breachState: nextState });
}

function notify(code: string, bound: 'high' | 'low', rate: number, limit: number): void {
  const emoji = CURRENCY_EMOJI[code] ?? '💱';
  const direction = chrome.i18n.getMessage(
    bound === 'high' ? 'notificationAbove' : 'notificationBelow',
  );
  chrome.notifications.create(`${code}:${bound}`, {
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: `${emoji} ${chrome.i18n.getMessage('notificationTitle')}`,
    message: `${currencyName(code)} ${chrome.i18n.getMessage(
      'notificationRate',
    )} ${rate} ${direction} ${limit}`,
  });
}

/**
 * Smart alerts on the mid rate (中行折算价), once per currency per day:
 * a large daily move, or a new N-day high / low (a good moment to exchange).
 */
async function checkSmartAlerts(
  rates: RatesMap,
  settings: Settings,
  history: BoardHistory,
): Promise<void> {
  const { moveAlert, extremeAlert } = settings;
  if (!moveAlert.enabled && !extremeAlert.enabled) return;

  const today = dayOf(Object.values(rates)[0]?.DATETIME);
  if (!today) return;
  const fired = await loadFiredKeys(today);

  const fire = (key: string, build: () => chrome.notifications.NotificationOptions<true>): void => {
    if (fired.has(key)) return;
    fired.add(key);
    chrome.notifications.create(`${key}:${today}`, build());
  };

  for (const code of settings.selectedCurrencies) {
    const cur = rates[code]?.MR;
    if (cur == null) continue;
    const series = history[code];

    if (moveAlert.enabled) {
      const prev = previousValue(series, 'MR', today);
      if (prev != null && prev !== 0) {
        const pct = ((cur - prev) / prev) * 100;
        if (Math.abs(pct) >= moveAlert.percent) {
          fire(`move:${code}`, () => alertNotif(code, 'move', cur, pct));
        }
      }
    }

    if (extremeAlert.enabled && series) {
      // Compare against the window *before* today to detect a fresh extreme.
      const ex = extremes(series.slice(0, -1), 'MR', extremeAlert.days);
      if (ex) {
        if (cur > ex.max) fire(`high:${code}`, () => alertNotif(code, 'high', cur, extremeAlert.days));
        else if (cur < ex.min) fire(`low:${code}`, () => alertNotif(code, 'low', cur, extremeAlert.days));
      }
    }
  }

  await chrome.storage.local.set({ firedAlerts: { day: today, keys: [...fired] } });
}

/** Per-day dedup set, reset when the publish day rolls over. */
async function loadFiredKeys(today: string): Promise<Set<string>> {
  const { firedAlerts } = await chrome.storage.local.get('firedAlerts');
  const stored = firedAlerts as { day: string; keys: string[] } | undefined;
  return new Set(stored?.day === today ? stored.keys : []);
}

function alertNotif(
  code: string,
  kind: 'move' | 'high' | 'low',
  rate: number,
  arg: number,
): chrome.notifications.NotificationOptions<true> {
  const emoji = CURRENCY_EMOJI[code] ?? '💱';
  const name = currencyName(code);
  let message: string;
  if (kind === 'move') {
    const dir = chrome.i18n.getMessage(arg >= 0 ? 'moveUp' : 'moveDown');
    message = `${name} ${dir} ${Math.abs(arg).toFixed(2)}% · ${rate}`;
  } else {
    const label = chrome.i18n.getMessage(kind === 'high' ? 'alertNewHigh' : 'alertNewLow');
    message = `${name} ${label} (${arg}${chrome.i18n.getMessage('alertDaysUnit')}) · ${rate}`;
  }
  return {
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: `${emoji} ${chrome.i18n.getMessage('notificationTitle')}`,
    message,
  };
}

/** Build and push the daily digest notification. */
async function sendDailySummary(): Promise<void> {
  const [cache, settings, history] = await Promise.all([getCache(), getSettings(), getHistory()]);
  if (!cache) return;

  const lines = settings.selectedCurrencies
    .slice(0, 8)
    .map((code) => {
      const r = cache.rates[code];
      if (!r || r.MR == null) return null;
      const prev = previousValue(history[code], 'MR', dayOf(r.DATETIME));
      let change = '';
      if (prev != null && prev !== 0) {
        const pct = ((r.MR - prev) / prev) * 100;
        change = ` ${pct >= 0 ? '▲' : '▼'}${Math.abs(pct).toFixed(2)}%`;
      }
      return `${code} ${currencyName(code)}: ${r.MR}${change}`;
    })
    .filter((l): l is string => l != null);

  if (lines.length === 0) return;
  chrome.notifications.create('daily-summary', {
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: `📊 ${chrome.i18n.getMessage('summaryTitle')}`,
    message: lines.join('\n'),
  });
}

/** Next occurrence of "HH:MM" in local time, as epoch millis. */
function nextDailyTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

/** (Re)create the polling alarm from the user's configured frequency. */
async function syncAlarm(): Promise<void> {
  const { updateFrequency } = await getSettings();
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: updateFrequency });
}

/** Schedule (or clear) the daily summary alarm per settings. */
async function syncSummaryAlarm(): Promise<void> {
  const { dailySummary } = await getSettings();
  if (!dailySummary.enabled) {
    await chrome.alarms.clear(SUMMARY_ALARM);
    return;
  }
  await chrome.alarms.create(SUMMARY_ALARM, {
    when: nextDailyTime(dailySummary.time),
    periodInMinutes: 1440,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) void refreshRates();
  else if (alarm.name === SUMMARY_ALARM) void sendDailySummary();
});

chrome.runtime.onMessage.addListener(
  (message: WorkerMessage, _sender, sendResponse: (r: WorkerResponse) => void) => {
    if (message !== 'manual-refresh' && message !== 'refresh-badge') return;

    (async () => {
      try {
        await refreshRates();
        if (message === 'refresh-badge') {
          await syncAlarm();
          await syncSummaryAlarm();
        }
        sendResponse({ status: 'completed' });
      } catch (error) {
        console.error('Refresh failed:', error);
        sendResponse({ status: 'error' });
      }
    })();

    return true; // response is sent asynchronously
  },
);

// Open the options page once, on first install only.
chrome.runtime.onInstalled.addListener(async (details) => {
  await bootstrap();
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup.addListener(() => void bootstrap());

/** Ensure alarms exist and we have at least one fetch on disk. */
async function bootstrap(): Promise<void> {
  await syncAlarm();
  await syncSummaryAlarm();
  const cache = await getCache();
  if (!cache) {
    try {
      await refreshRates();
    } catch (error) {
      console.error('Initial fetch failed:', error);
    }
  }
}

void bootstrap();
