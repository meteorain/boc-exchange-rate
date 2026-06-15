import type { RatesCache, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  selectedCurrencies: ['EUR', 'GBP', 'HKD', 'USD'],
  badgeCurrency: 'USD',
  badgeRateType: 'BR',
  updateFrequency: 30,
  thresholds: {},
};

/** Read user settings, merged over defaults so callers never see undefined. */
export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

export async function getCache(): Promise<RatesCache | null> {
  const { ratesCache } = await chrome.storage.local.get('ratesCache');
  return (ratesCache as RatesCache | undefined) ?? null;
}

export async function setCache(cache: RatesCache): Promise<void> {
  await chrome.storage.local.set({ ratesCache: cache });
}
