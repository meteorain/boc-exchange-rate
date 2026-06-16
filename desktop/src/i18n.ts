import en from '../../public/_locales/en/messages.json';
import zhCN from '../../public/_locales/zh_CN/messages.json';
import zhTW from '../../public/_locales/zh_TW/messages.json';
import ja from '../../public/_locales/ja/messages.json';
import ko from '../../public/_locales/ko/messages.json';
import ru from '../../public/_locales/ru/messages.json';
import fr from '../../public/_locales/fr/messages.json';
import de from '../../public/_locales/de/messages.json';
import it from '../../public/_locales/it/messages.json';
import es from '../../public/_locales/es/messages.json';

type Messages = Record<string, { message: string }>;

const BY_PREFIX = { ja, ko, ru, fr, de, it, es } as Record<string, Messages>;

function pickLocale(): Messages {
  const lang = navigator.language.toLowerCase();
  if (/^zh/.test(lang)) return (/tw|hk|mo|hant/.test(lang) ? zhTW : zhCN) as Messages;
  for (const prefix of Object.keys(BY_PREFIX)) {
    if (lang.startsWith(prefix)) return BY_PREFIX[prefix];
  }
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
