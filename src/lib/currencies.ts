import type { RateType } from './types';

type Bilingual = readonly [en: string, zh: string];

/** ISO code -> [English name, 中文名]. */
const CURRENCY_NAMES: Record<string, Bilingual> = {
  AED: ['UAE Dirham', '阿联酋迪拉姆'],
  AUD: ['Australian Dollar', '澳大利亚元'],
  BRL: ['Brazilian Real', '巴西里亚尔'],
  CAD: ['Canadian Dollar', '加拿大元'],
  CHF: ['Swiss Franc', '瑞士法郎'],
  DKK: ['Danish Krone', '丹麦克朗'],
  EUR: ['Euro', '欧元'],
  GBP: ['British Pound', '英镑'],
  HKD: ['Hong Kong Dollar', '港币'],
  IDR: ['Indonesian Rupiah', '印尼卢比'],
  INR: ['Indian Rupee', '印度卢比'],
  JPY: ['Japanese Yen', '日元'],
  KRW: ['South Korean Won', '韩国元'],
  MOP: ['Macau Pataca', '澳门元'],
  MYR: ['Malaysian Ringgit', '林吉特'],
  NOK: ['Norwegian Krone', '挪威克朗'],
  NZD: ['New Zealand Dollar', '新西兰元'],
  PHP: ['Philippine Peso', '菲律宾比索'],
  RUB: ['Russian Ruble', '卢布'],
  SAR: ['Saudi Riyal', '沙特里亚尔'],
  SEK: ['Swedish Krona', '瑞典克朗'],
  SGD: ['Singapore Dollar', '新加坡元'],
  THB: ['Thai Baht', '泰国铢'],
  TRY: ['Turkish Lira', '土耳其里拉'],
  TWD: ['New Taiwan Dollar', '新台币'],
  USD: ['US Dollar', '美元'],
  ZAR: ['South African Rand', '南非兰特'],
};

const RATE_TYPE_NAMES: Record<RateType, Bilingual> = {
  BR: ['Buying Rate', '现汇买入价'],
  CBR: ['Cash Buying Rate', '现钞买入价'],
  SR: ['Selling Rate', '现汇卖出价'],
  CSR: ['Cash Selling Rate', '现钞卖出价'],
  MR: ['Middle Rate', '中行折算价'],
};

export const RATE_TYPES = Object.keys(RATE_TYPE_NAMES) as RateType[];

/** All currency codes we know names for, used as a fallback before first fetch. */
export const CURRENCY_CODES = Object.keys(CURRENCY_NAMES);

/** True when the UI locale is Chinese. Works in both DOM and worker contexts. */
function isChineseLocale(): boolean {
  const lang =
    (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()) ||
    (typeof navigator !== 'undefined' && navigator.language) ||
    'en';
  return /^zh|cn/i.test(lang);
}

export function currencyName(code: string): string {
  const entry = CURRENCY_NAMES[code];
  if (!entry) return code;
  return entry[isChineseLocale() ? 1 : 0];
}

export function rateTypeName(type: RateType): string {
  return RATE_TYPE_NAMES[type][isChineseLocale() ? 1 : 0];
}

/** Emoji flag for a few headline currencies, used in notifications. */
export const CURRENCY_EMOJI: Record<string, string> = {
  USD: '💵',
  EUR: '💶',
  GBP: '💷',
  JPY: '💴',
};
