import en from '../../public/_locales/en/messages.json';
import zhCN from '../../public/_locales/zh_CN/messages.json';
import zhTW from '../../public/_locales/zh_TW/messages.json';
import ja from '../../public/_locales/ja/messages.json';

type Messages = Record<string, { message: string }>;

function pickLocale(): Messages {
  const lang = navigator.language.toLowerCase();
  if (/^zh/.test(lang)) return /tw|hk|mo|hant/.test(lang) ? (zhTW as Messages) : (zhCN as Messages);
  if (lang.startsWith('ja')) return ja as Messages;
  return en as Messages;
}

const messages = pickLocale();

export function t(key: string): string {
  return messages[key]?.message ?? key;
}

/** Fill text/title for tagged elements, mirroring the extension's helper. */
export function applyI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle!);
  });
}
