/** The five rate columns the Bank of China publishes for each currency. */
export type RateType = 'BR' | 'CBR' | 'SR' | 'CSR' | 'MR';

/** A single currency's rates, as parsed from the BOC page. */
export interface CurrencyRate {
  BR: number | null;
  CBR: number | null;
  SR: number | null;
  CSR: number | null;
  MR: number | null;
  /** Publish time, normalized to "YYY.MM.DD HH:MM:SS". */
  DATETIME: string | null;
}

/** Map of ISO currency code -> rates. */
export type RatesMap = Record<string, CurrencyRate>;

export interface Threshold {
  rateType: RateType;
  high: number | null;
  low: number | null;
}

/** User settings, persisted in chrome.storage.sync. */
export interface Settings {
  selectedCurrencies: string[];
  badgeCurrency: string;
  badgeRateType: RateType;
  updateFrequency: number;
  thresholds: Record<string, Threshold>;
}

/** Cached rate payload, persisted in chrome.storage.local. */
export interface RatesCache {
  rates: RatesMap;
  /** Epoch millis when the cache was written. */
  fetchedAt: number;
}

/** Messages exchanged between UI pages and the service worker. */
export type WorkerMessage = 'manual-refresh' | 'refresh-badge';
export interface WorkerResponse {
  status: 'completed' | 'error';
}
