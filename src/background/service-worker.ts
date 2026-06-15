import { fetchRates } from '@/lib/boc';
import { getTrends } from '@/lib/trend';
import { getSettings, getCache, setCache } from '@/lib/storage';
import { currencyName, CURRENCY_EMOJI } from '@/lib/currencies';
import type { RatesMap, Settings, WorkerMessage, WorkerResponse } from '@/lib/types';

const ALARM_NAME = 'fetchExchangeRates';
const BADGE_COLOR = '#2563eb';

/** Fetch the latest rates, cache them, refresh the badge and fire alerts. */
async function refreshRates(): Promise<void> {
  const rates = await fetchRates();
  await setCache({ rates, fetchedAt: Date.now() });

  const settings = await getSettings();
  await updateBadge(rates, settings);
  await checkThresholds(rates, settings);

  // Keep the market-trend cache warm; self-throttled and never fatal.
  await getTrends(settings.selectedCurrencies).catch(() => {});
}

function formatBadge(rate: number): string {
  if (rate >= 1000) return Math.round(rate).toString();
  // Keep it to ~4 glyphs so it stays legible on the icon.
  return rate.toFixed(rate >= 100 ? 0 : 2).slice(0, 4);
}

async function updateBadge(rates: RatesMap, settings: Settings): Promise<void> {
  const rate = rates[settings.badgeCurrency]?.[settings.badgeRateType];

  if (rate == null) {
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: chrome.i18n.getMessage('noData') });
    return;
  }

  const datetime = rates[settings.badgeCurrency]?.DATETIME ?? '';
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  await chrome.action.setBadgeText({ text: formatBadge(rate) });
  await chrome.action.setTitle({
    title: `${currencyName(settings.badgeCurrency)} · ${rate}  @ ${datetime}`,
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
