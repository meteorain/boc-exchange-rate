// ---------- i18n ----------
const T = {
  zh: {
    title: '中国银行外汇牌价 · 实时人民币汇率',
    metaDesc:
      '实时中国银行外汇牌价:人民币对各主要货币汇率,内置走势图、便宜指数、货币换算与智能提醒。Chrome/Edge 扩展与 macOS/Windows 桌面应用。隐私优先,数据留在本机。',
    brand: '中国银行外汇牌价',
    navFeatures: '功能',
    navDownload: '下载',
    navPrivacy: '隐私',
    navOpenSource: '开源',
    heroEyebrow: 'Chrome / Edge 扩展 · macOS / Windows 桌面应用',
    heroTitle: '实时中行外汇牌价,<br />优雅地放在手边。',
    heroLede:
      '人民币对各主要货币的实时牌价,内置走势图、便宜指数、货币换算与智能提醒。浏览器与桌面,同一套精致体验。',
    ctaGet: '立即获取',
    ctaSource: '查看源码',
    meta1: '无账号 · 无追踪',
    meta2: '数据直取中行官网',
    meta3: '开源 MIT',
    updatedLabel: '更新于',
    strip1: '实时牌价',
    strip2: '走势 · 便宜指数',
    strip3: '货币换算',
    strip4: '智能提醒',
    strip5: '10 种语言',
    featEyebrow: '为决策而设计',
    featTitle: '不只是看汇率,更帮你判断何时换汇。',
    f1t: '实时牌价',
    f1d: '现汇 / 现钞买入卖出价、中行折算价,直接解析自中国银行官网,不经第三方。',
    f2t: '走势 · 便宜指数',
    f2d: '每张卡片内嵌 30 / 90 / 365 天迷你走势,并标出当前价在区间中的位置——一眼看出"现在贵不贵"。',
    f3t: '货币换算器',
    f3d: '自动选对买入/卖出、现汇/现钞,支持任意两种外币交叉换算,并显示买卖点差。',
    f4t: '智能提醒',
    f4d: '阈值突破、每日定点摘要、大幅波动、N 日新高/新低——抓住换汇时机。',
    f5t: '图标角标',
    f5d: '把你最关心的汇率钉在工具栏 / 菜单栏图标上,按当日涨跌红涨绿跌,不打开也知道行情。',
    f6t: '多端 · 暗色 · 多语言',
    f6d: 'Chrome / Edge 扩展与 macOS / Windows 桌面应用;自动跟随系统暗色;10 种界面语言。',
    platEyebrow: '随处可用',
    platTitle: '选择你的平台。',
    extT: '浏览器扩展',
    extD: 'Chrome · Edge。点开工具栏即见牌价,角标常驻。',
    extBtnChrome: 'Chrome 应用店',
    extBtnEdge: 'Edge 加载项',
    extDl: '直接下载 (.zip)',
    extNote: '需开发者模式「加载已解压」· 基于 Manifest V3',
    deskT: '桌面应用',
    deskD: 'macOS · Windows。菜单栏 / 托盘常驻,系统通知提醒。',
    deskBtn: '下载桌面版',
    deskNote: 'macOS 首次右键「打开」· Windows 通知需安装版',
    privEyebrow: '隐私优先',
    privTitle: '你的数据,留在你的设备上。',
    privBody:
      '无需账号,无追踪,无统计分析。牌价直接取自中国银行官网,走势使用欧洲央行参考数据(经 frankfurter.dev),其余一切——你的币种、提醒与设置——都只存在本地。',
    ctaTitle: '把汇率,优雅地放在手边。',
    footNote:
      '数据来源:中国银行外汇牌价。走势为市场参考价(frankfurter.dev / 欧洲央行),与牌价走势相近、绝对数值略有差异。本项目与中国银行无隶属关系。开源协议 MIT。',
    cellBuy: '现汇买入',
    cellSell: '现汇卖出',
    cellMid: '中行折算价',
    langBtn: 'EN',
  },
  en: {
    title: 'BOC FX Rates · Live Bank of China exchange rates',
    metaDesc:
      'Live Bank of China exchange rates: CNY against every major currency, with trend charts, a cheap-index, a converter and smart alerts. Chrome/Edge extension and macOS/Windows apps. Privacy-first — your data stays on your device.',
    brand: 'BOC FX Rates',
    navFeatures: 'Features',
    navDownload: 'Download',
    navPrivacy: 'Privacy',
    navOpenSource: 'Open source',
    heroEyebrow: 'Chrome / Edge extension · macOS / Windows app',
    heroTitle: 'Live Bank of China FX,<br />elegantly at hand.',
    heroLede:
      'Live CNY rates against every major currency — with trend charts, a cheap-index, a converter and smart alerts. The same refined experience in your browser and on your desktop.',
    ctaGet: 'Get it',
    ctaSource: 'View source',
    meta1: 'No account · no tracking',
    meta2: 'Straight from boc.cn',
    meta3: 'Open source (MIT)',
    updatedLabel: 'Updated',
    strip1: 'Live rates',
    strip2: 'Trends · cheap-index',
    strip3: 'Converter',
    strip4: 'Smart alerts',
    strip5: '10 languages',
    featEyebrow: 'Built for decisions',
    featTitle: 'Not just rates — know when to exchange.',
    f1t: 'Live rates',
    f1d: 'Spot & cash buy/sell prices plus the middle rate, parsed straight from the Bank of China — no middle-man.',
    f2t: 'Trends & cheap-index',
    f2d: 'A 30 / 90 / 365-day sparkline on every card, plus where today sits in the range — see at a glance whether it is cheap.',
    f3t: 'Currency converter',
    f3d: 'Picks the right buy/sell and cash/wire rate automatically, cross-converts any two currencies, and shows the spread.',
    f4t: 'Smart alerts',
    f4d: 'Threshold crossings, a daily digest, big moves and new N-day highs/lows — catch the right moment.',
    f5t: 'Toolbar badge',
    f5d: 'Pin the rate you care about to the toolbar / menu-bar icon, coloured by the day’s move — no need to open it.',
    f6t: 'Cross-platform · dark · multilingual',
    f6d: 'Chrome / Edge extension and macOS / Windows apps; automatic dark mode; 10 interface languages.',
    platEyebrow: 'Everywhere',
    platTitle: 'Pick your platform.',
    extT: 'Browser extension',
    extD: 'Chrome · Edge. Rates in your toolbar, always-on badge.',
    extBtnChrome: 'Chrome Web Store',
    extBtnEdge: 'Edge Add-ons',
    extDl: 'Direct download (.zip)',
    extNote: 'Load unpacked (developer mode) · Manifest V3',
    deskT: 'Desktop app',
    deskD: 'macOS · Windows. Lives in the menu bar / tray, native notifications.',
    deskBtn: 'Download',
    deskNote: 'macOS: right-click → Open first · Windows: notifications need the installer',
    privEyebrow: 'Privacy first',
    privTitle: 'Your data stays on your device.',
    privBody:
      'No account, no tracking, no analytics. Rates come straight from boc.cn; trend lines use ECB reference data via frankfurter.dev; everything else — your currencies, alerts and settings — stays local.',
    ctaTitle: 'Put exchange rates, elegantly at hand.',
    footNote:
      'Rates from the Bank of China FX board. Trend lines are market reference rates (frankfurter.dev / ECB) — close in shape, slightly different in absolute value. Not affiliated with the Bank of China. MIT licensed.',
    cellBuy: 'Buy',
    cellSell: 'Sell',
    cellMid: 'Mid',
    langBtn: '中',
  },
};

// ---------- mock rate cards ----------
const CARDS = [
  { code: 'EUR', zh: '欧元', en: 'Euro', buy: '781.36', sell: '787.08', mid: '786.86', delta: -0.96, series: [8.0, 8.1, 7.95, 7.9, 7.93, 7.86, 7.84] },
  { code: 'USD', zh: '美元', en: 'US Dollar', buy: '674.50', sell: '677.33', mid: '680.88', delta: -0.64, series: [6.86, 6.82, 6.8, 6.81, 6.78, 6.77, 6.76] },
  { code: 'GBP', zh: '英镑', en: 'Pound', buy: '904.35', sell: '911.05', mid: '911.91', delta: -0.37, series: [9.18, 9.22, 9.15, 9.18, 9.12, 9.1, 9.11] },
];

function sparkline(values, up) {
  const w = 72;
  const h = 22;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ');
  const color = up ? 'var(--up)' : 'var(--down)';
  return `<svg class="mc__spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
    <polyline points="${pts}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function renderCards(lang) {
  const cardsEl = document.getElementById('mock-cards');
  if (!cardsEl) return;
  const t = T[lang];
  cardsEl.innerHTML = CARDS.map((c) => {
    const up = c.delta >= 0;
    return `<div class="mc">
      <div class="mc__head">
        <span class="mc__code">${c.code}</span>
        <span class="mc__name">${c[lang]}</span>
        ${sparkline(c.series, up)}
        <span class="mc__delta ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(c.delta).toFixed(2)}%</span>
      </div>
      <div class="mc__rates">
        <div class="mc__cell"><span>${t.cellBuy}</span><b>${c.buy}</b></div>
        <div class="mc__cell"><span>${t.cellSell}</span><b>${c.sell}</b></div>
        <div class="mc__cell accent"><span>${t.cellMid}</span><b>${c.mid}</b></div>
      </div>
    </div>`;
  }).join('');
}

// ---------- language switching ----------
const root = document.documentElement;
const langBtn = document.getElementById('lang-toggle');

function setLang(lang) {
  const t = T[lang] || T.zh;
  root.lang = lang === 'en' ? 'en' : 'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const val = t[el.dataset.i18n];
    if (val == null) return;
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = val;
    else el.textContent = val;
  });
  document.title = t.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.metaDesc);
  if (langBtn) langBtn.textContent = t.langBtn;
  renderCards(lang);
  localStorage.setItem('lang', lang);
}

const savedLang = localStorage.getItem('lang');
let lang = savedLang === 'en' || savedLang === 'zh' ? savedLang : /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
setLang(lang);

langBtn?.addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  setLang(lang);
});

// ---------- theme toggle (persisted) ----------
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  localStorage.setItem('theme', next);
});

// ---------- "updated" timestamp (feels live) ----------
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const mt = document.getElementById('mock-time');
if (mt)
  mt.textContent = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

// ---------- scroll reveal ----------
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12 },
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
