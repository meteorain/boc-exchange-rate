import type {
  RateType,
  Threshold,
  DailySummaryConfig,
  MoveAlertConfig,
  ExtremeAlertConfig,
} from '@lib/types';
import type { Theme } from '@lib/theme';
import { store } from './platform';

export interface DesktopSettings {
  selected: string[];
  badgeCurrency: string;
  badgeRateType: RateType;
  updateFrequency: number;
  theme: Theme;
  trendDays: number;
  thresholds: Record<string, Threshold>;
  dailySummary: DailySummaryConfig;
  moveAlert: MoveAlertConfig;
  extremeAlert: ExtremeAlertConfig;
}

export const DEFAULTS: DesktopSettings = {
  selected: ['EUR', 'GBP', 'HKD', 'USD'],
  badgeCurrency: 'USD',
  badgeRateType: 'MR',
  updateFrequency: 30,
  theme: 'auto',
  trendDays: 30,
  thresholds: {},
  dailySummary: { enabled: false, time: '10:00' },
  moveAlert: { enabled: false, percent: 1 },
  extremeAlert: { enabled: false, days: 30 },
};

export async function loadSettings(): Promise<DesktopSettings> {
  const [selected, badgeCurrency, badgeRateType, updateFrequency, theme, trendDays, thresholds, dailySummary, moveAlert, extremeAlert] =
    await Promise.all([
      store.get<string[]>('selected'),
      store.get<string>('badgeCurrency'),
      store.get<RateType>('badgeRateType'),
      store.get<number>('updateFrequency'),
      store.get<Theme>('theme'),
      store.get<number>('trendDays'),
      store.get<Record<string, Threshold>>('thresholds'),
      store.get<DailySummaryConfig>('dailySummary'),
      store.get<MoveAlertConfig>('moveAlert'),
      store.get<ExtremeAlertConfig>('extremeAlert'),
    ]);
  return {
    selected: selected ?? DEFAULTS.selected,
    badgeCurrency: badgeCurrency ?? DEFAULTS.badgeCurrency,
    badgeRateType: badgeRateType ?? DEFAULTS.badgeRateType,
    updateFrequency: updateFrequency ?? DEFAULTS.updateFrequency,
    theme: theme ?? DEFAULTS.theme,
    trendDays: trendDays ?? DEFAULTS.trendDays,
    thresholds: thresholds ?? DEFAULTS.thresholds,
    dailySummary: dailySummary ?? DEFAULTS.dailySummary,
    moveAlert: moveAlert ?? DEFAULTS.moveAlert,
    extremeAlert: extremeAlert ?? DEFAULTS.extremeAlert,
  };
}

/** Bumped after a settings save so the main window knows to reload. */
export async function bumpSettingsVersion(): Promise<void> {
  await store.set('settingsVersion', Date.now());
}
