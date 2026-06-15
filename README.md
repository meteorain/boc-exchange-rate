# 中国银行外汇汇率牌价 · BOC Exchange Rates

一个展示中国银行实时外汇牌价的 Chrome 扩展(Manifest V3)。在工具栏弹窗中查看人民币对各主要货币的牌价，可自由配置展示币种、把你最关心的汇率固定在插件图标角标上，并在汇率突破阈值时收到通知。

A Chrome extension (Manifest V3) that shows the Bank of China foreign-exchange board: CNY rates against major currencies, with a configurable currency list, a toolbar badge for the rate you care about, and threshold alerts.

## 功能 Features

- 📊 实时展示中行外汇牌价（现汇/现钞买入卖出价、中行折算价）
- 📈 每张卡片内嵌市场参考走势 sparkline + 涨跌幅，可切换 30 / 90 天 / 1 年；悬停起点·当前·最高·最低锚点查看具体数值
- 🧮 货币换算器：任意两币种互换（含人民币交叉汇率），自动选对买入/卖出、现汇/现钞，显示点差，快捷金额与一键复制
- 📉 每张卡片显示当前价处于近 30/90/365 天区间的「便宜指数」位置条
- 🎯 在插件图标角标上固定一个汇率，并按当日涨跌红涨绿跌变色
- 🔔 阈值提醒（边沿触发）+ 智能提醒：每日摘要、大幅波动、N 日新高/新低换汇时机
- 🪟 可在浏览器侧边栏常驻；数据陈旧 / 周末休市自动提示
- ⚙️ 自由选择展示币种（支持搜索与拖拽排序）与更新频率（10 分钟 ~ 2 小时）
- 🌗 现代卡片式 UI，自动跟随系统暗色模式，也可手动切换浅/深色
- 🌐 10 种界面语言（简/繁中文、英、法、德、意、西、日、韩、俄），币种名同步本地化

## 数据来源 Data source

- **牌价（卡片数值）**：解析自中国银行官方外汇牌价页面
  [`www.boc.cn/sourcedb/whpj`](https://www.boc.cn/sourcedb/whpj/)，扩展直接抓取该页面 HTML 并在本地解析，不经过任何第三方服务器。
- **走势线（sparkline）**：取自 [frankfurter.dev](https://frankfurter.dev)（欧洲央行参考汇率）。这是**市场参考价**，与中行牌价走势相近但绝对数值略有差异；其中 AED、MOP、RUB、SAR、TWD 不在该数据源覆盖范围，故不显示走势。

## 浏览器支持 Browser support

- **Chrome / Edge**：同一份 `dist/`（或 zip）即可,二者均为 Chromium + Manifest V3,无需改动。
- **Firefox**：暂未提供。Firefox 的 MV3 后台仍使用事件页(`background.scripts`)而非 `service_worker`,且没有 `chrome.sidePanel`(对应 `sidebar_action`),需要单独的 manifest 与后台模型 —— 代码已对 `sidePanel` 做了存在性判断,移植是一个独立的、需在 Firefox 实测的后续工作。

## 技术栈 Tech stack

- Manifest V3 · TypeScript (strict) · Vitest
- Vite 6 + [@crxjs/vite-plugin](https://crxjs.dev/)
- 无前端框架，纯原生 DOM

## 开发 Development

```bash
npm install      # 安装依赖
npm run dev      # 开发模式（HMR）
npm run build    # 构建到 dist/
npm run typecheck# 仅类型检查
npm run zip      # 打包 dist/ 为可上传商店的 zip
```

### 本地加载 Load unpacked

1. `npm run build`
2. 打开 `chrome://extensions`，开启右上角「开发者模式」
3. 点「加载已解压的扩展程序」，选择 `dist/` 目录

## 项目结构 Structure

```
manifest.config.ts          # 以 TS 生成 manifest
src/
  background/service-worker.ts  # 抓取 / 缓存 / 角标 / 通知 / 定时
  lib/                          # types · currencies · storage · boc 解析
  popup/                        # 弹窗 UI
  options/                      # 设置页 UI
public/_locales/                # i18n 文案（zh_CN / en）
public/images/                  # 图标
```

## License

MIT
