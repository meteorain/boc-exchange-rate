import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { currencyName } from '@lib/currencies';
import type { RatesMap } from '@lib/types';
import { store } from './platform';
import { previousValue, extremes, dayOf, getHistory, type BoardHistory } from './history';
import { loadSettings, type DesktopSettings } from './settings-store';
import { t } from './i18n';

const TITLE = (): string => `💱 ${t('notificationTitle')}`;

async function notify(title: string, body: string): Promise<void> {
  let granted = await isPermissionGranted();
  if (!granted) granted = (await requestPermission()) === 'granted';
  if (granted) sendNotification({ title, body });
}

/** Edge-triggered threshold crossings. */
export async function checkThresholds(rates: RatesMap, settings: DesktopSettings): Promise<void> {
  const prev = (await store.get<Record<string, boolean>>('breachState')) ?? {};
  const next: Record<string, boolean> = {};

  for (const [code, th] of Object.entries(settings.thresholds)) {
    const value = rates[code]?.[th.rateType];
    if (value == null) continue;
    for (const bound of ['high', 'low'] as const) {
      const limit = th[bound];
      if (limit == null) continue;
      const key = `${code}:${th.rateType}:${bound}`;
      const breached = bound === 'high' ? value >= limit : value <= limit;
      next[key] = breached;
      if (breached && !prev[key]) {
        const dir = t(bound === 'high' ? 'notificationAbove' : 'notificationBelow');
        await notify(TITLE(), `${currencyName(code)} ${t('notificationRate')} ${value} ${dir} ${limit}`);
      }
    }
  }
  await store.set('breachState', next);
}

/** Big daily move + new N-day high/low, once per currency per day. */
export async function checkSmartAlerts(
  rates: RatesMap,
  settings: DesktopSettings,
  history: BoardHistory,
): Promise<void> {
  const { moveAlert, extremeAlert } = settings;
  if (!moveAlert.enabled && !extremeAlert.enabled) return;

  const today = dayOf(Object.values(rates)[0]?.DATETIME);
  if (!today) return;
  const stored = await store.get<{ day: string; keys: string[] }>('firedAlerts');
  const fired = new Set(stored?.day === today ? stored.keys : []);

  const fire = async (key: string, body: string): Promise<void> => {
    if (fired.has(key)) return;
    fired.add(key);
    await notify(TITLE(), body);
  };

  for (const code of settings.selected) {
    const cur = rates[code]?.MR;
    if (cur == null) continue;
    const series = history[code];

    if (moveAlert.enabled) {
      const prev = previousValue(series, 'MR', today);
      if (prev != null && prev !== 0) {
        const pct = ((cur - prev) / prev) * 100;
        if (Math.abs(pct) >= moveAlert.percent) {
          const dir = t(pct >= 0 ? 'moveUp' : 'moveDown');
          await fire(`move:${code}`, `${currencyName(code)} ${dir} ${Math.abs(pct).toFixed(2)}% · ${cur}`);
        }
      }
    }

    if (extremeAlert.enabled && series) {
      const ex = extremes(series.slice(0, -1), 'MR', extremeAlert.days);
      if (ex) {
        if (cur > ex.max) {
          await fire(`high:${code}`, `${currencyName(code)} ${t('alertNewHigh')} (${extremeAlert.days}${t('alertDaysUnit')}) · ${cur}`);
        } else if (cur < ex.min) {
          await fire(`low:${code}`, `${currencyName(code)} ${t('alertNewLow')} (${extremeAlert.days}${t('alertDaysUnit')}) · ${cur}`);
        }
      }
    }
  }
  await store.set('firedAlerts', { day: today, keys: [...fired] });
}

/** Called on a minute tick; sends the digest once when the set time arrives. */
export async function maybeSendDailySummary(): Promise<void> {
  const settings = await loadSettings();
  if (!settings.dailySummary.enabled) return;

  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (hhmm !== settings.dailySummary.time) return;

  const todayKey = now.toISOString().slice(0, 10);
  if ((await store.get<string>('summarySentDate')) === todayKey) return;
  await store.set('summarySentDate', todayKey);

  const [rates, history] = await Promise.all([store.get<RatesMap>('rates'), getHistory()]);
  if (!rates) return;
  const lines = settings.selected
    .slice(0, 8)
    .map((code) => {
      const r = rates[code];
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

  if (lines.length) await notify(`📊 ${t('summaryTitle')}`, lines.join('\n'));
}
