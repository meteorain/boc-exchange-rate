import { fetchRates } from '@/lib/boc';
import { getTrends } from '@/lib/trend';
import { recordSnapshot, previousValue, dayOf, type BoardHistory } from '@/lib/history';
import { getSettings, getCache, setCache } from '@/lib/storage';
import { currencyName, CURRENCY_EMOJI } from '@/lib/currencies';
import type { RatesMap, Settings, WorkerMessage, WorkerResponse } from '@/lib/types';

const ALARM_NAME = 'fetchExchangeRates';
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

  // Keep the market-trend cache warm; self-throttled and never fatal.
  await getTrends(settings.selectedCurrencies).catch(() => {});
}

function formatBadge(rate: number): string {
  if (rate >= 1000) return Math.round(rate).toString();
  // Keep it to ~4 glyphs so it stays legible on the icon.
  return rate.toFixed(rate >= 100 ? 0 : 2).slice(0, 4);
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

/** (Re)create the polling alarm from the user's configured frequency. */
async function syncAlarm(): Promise<void> {
  const { updateFrequency } = await getSettings();
  await chrome.alarms.create(ALARM_NAME, { periodInMinutes: updateFrequency });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) void refreshRates();
});

chrome.runtime.onMessage.addListener(
  (message: WorkerMessage, _sender, sendResponse: (r: WorkerResponse) => void) => {
    if (message !== 'manual-refresh' && message !== 'refresh-badge') return;

    (async () => {
      try {
        await refreshRates();
        if (message === 'refresh-badge') await syncAlarm();
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

/** Ensure an alarm exists and we have at least one fetch on disk. */
async function bootstrap(): Promise<void> {
  await syncAlarm();
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
