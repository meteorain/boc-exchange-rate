# 中国银行外汇汇率牌价 · BOC Exchange Rates

一个展示中国银行实时外汇牌价的 Chrome 扩展(Manifest V3)。在工具栏弹窗中查看人民币对各主要货币的牌价，可自由配置展示币种、把你最关心的汇率固定在插件图标角标上，并在汇率突破阈值时收到通知。

A Chrome extension (Manifest V3) that shows the Bank of China foreign-exchange board: CNY rates against major currencies, with a configurable currency list, a toolbar badge for the rate you care about, and threshold alerts.

## 功能 Features

- 📊 实时展示中行外汇牌价（现汇/现钞买入卖出价、中行折算价）
- 📈 每张卡片内嵌市场参考走势 sparkline + 涨跌幅，可切换 30 / 90 天 / 1 年；悬停起点·当前·最高·最低锚点查看具体数值
- 🎯 在插件图标角标上固定显示一个你关心的汇率
- 🔔 汇率突破上限/下限时通知（边沿触发，不刷屏）
- ⚙️ 自由选择展示币种与更新频率（10 分钟 ~ 2 小时）
- 🌗 现代卡片式 UI，自动跟随系统暗色模式
- 🌐 中英文界面（`zh_CN` / `en`）

## 数据来源 Data source

- **牌价（卡片数值）**：解析自中国银行官方外汇牌价页面
  [`www.boc.cn/sourcedb/whpj`](https://www.boc.cn/sourcedb/whpj/)，扩展直接抓取该页面 HTML 并在本地解析，不经过任何第三方服务器。
- **走势线（sparkline）**：取自 [frankfurter.dev](https://frankfurter.dev)（欧洲央行参考汇率）。这是**市场参考价**，与中行牌价走势相近但绝对数值略有差异；其中 AED、MOP、RUB、SAR、TWD 不在该数据源覆盖范围，故不显示走势。

## 技术栈 Tech stack

- Manifest V3 · TypeScript (strict)
- Vite 6 + [@crxjs/vite-plugin](https://crxjs.dev/)
- 无前端框架，纯原生 DOM，体积 ~36KB

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
