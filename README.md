# 中国银行外汇牌价 · BOC FX Rates

实时展示中国银行外汇牌价的一套小工具:**浏览器扩展**(Chrome / Edge)+ **桌面应用**(macOS / Windows)。在工具栏 / 菜单栏即可查看人民币对各主要货币的牌价,内置走势、便宜指数、货币换算与智能提醒,并可把最关心的汇率固定在图标角标上。

A small toolkit that shows the Bank of China FX board in real time — a **browser extension** (Chrome / Edge) and a **desktop app** (macOS / Windows). View CNY rates against major currencies from your toolbar / menu bar, with trend charts, a cheap-index, a converter and smart alerts, plus a badge for the rate you care about.

> 浏览器扩展在应用商店中的名称为 **中国银行外汇汇率牌价 / Bank of China Exchange Rates**;桌面应用与官网统一使用品牌名 **中国银行外汇牌价 / BOC FX Rates**。

## 下载 Download

| 平台 Platform | 链接 |
| --- | --- |
| Chrome | [Chrome 网上应用店](https://chromewebstore.google.com/detail/%E4%B8%AD%E5%9B%BD%E9%93%B6%E8%A1%8C%E5%A4%96%E6%B1%87%E6%B1%87%E7%8E%87%E7%89%8C%E4%BB%B7/mkgpdgkagelcghmbkfbfamonaekfgpla) |
| Edge | [Edge 加载项](https://microsoftedge.microsoft.com/addons/detail/%E4%B8%AD%E5%9B%BD%E9%93%B6%E8%A1%8C%E5%A4%96%E6%B1%87%E6%B1%87%E7%8E%87%E7%89%8C%E4%BB%B7/llneijfgjfcnoajankojegallkldbklj) |
| macOS 桌面版 | [GitHub Releases](https://github.com/meteorain/boc-fx-rates/releases) · `.dmg` |
| Windows 桌面版 | [GitHub Releases](https://github.com/meteorain/boc-fx-rates/releases) · 便携版 `.exe` / 安装版 `*-setup.exe` |

> 🍎 **macOS 首次打开**:应用未做 Apple 公证,首次会提示"无法验证开发者"——**右键点 App →「打开」**一次即可(之后正常双击)。
> _EN: Not Apple-notarized; on first launch right-click the app → **Open** once (normal double-click afterwards)._

> ⚠️ **Windows 用户请注意:便携版收不到通知**
> 免安装的「便携版」单个 `.exe`,在 Windows 上**收不到任何通知**(汇率变化、阈值提醒、每日摘要都收不到)。这是 Windows 系统的限制——它只给"正式安装过"的程序发通知。**想要通知,请下载「安装版」(`*-setup.exe`),安装后使用。** macOS 没有这个问题。
> _EN: The portable `.exe` cannot show notifications on Windows (a Windows limitation); install the `*-setup.exe` build if you want them. macOS is unaffected._

官网(`website/`,纯静态,部署于 Vercel)汇总了上述入口与一个扩展安装包的直接下载。

## 功能 Features

- 📊 实时展示中行外汇牌价(现汇/现钞买入卖出价、中行折算价)
- 📈 每张卡片内嵌市场参考走势 sparkline + 涨跌幅,可切换 30 / 90 天 / 1 年;悬停起点·当前·最高·最低锚点查看具体数值
- 🧮 货币换算器:任意两币种互换(含人民币交叉汇率),自动选对买入/卖出、现汇/现钞,显示点差,快捷金额与一键复制
- 📉 每张卡片显示当前价处于近 30/90/365 天区间的「便宜指数」位置条
- 🎯 在图标 / 菜单栏角标上固定一个汇率,并按当日涨跌红涨绿跌变色
- 🔔 阈值提醒(边沿触发)+ 智能提醒:每日摘要、大幅波动、N 日新高/新低换汇时机
- 🪟 扩展可在浏览器侧边栏常驻;桌面应用常驻菜单栏 / 托盘;数据陈旧 / 周末休市自动提示
- ⚙️ 自由选择展示币种(支持搜索与拖拽排序)与更新频率(10 分钟 ~ 2 小时)
- 🌗 现代卡片式 UI,自动跟随系统暗色模式,也可手动切换浅/深色
- 🌐 10 种界面语言(简/繁中文、英、法、德、意、西、日、韩、俄),币种名同步本地化

## 数据来源 Data source

- **牌价(卡片数值)**:解析自中国银行官方外汇牌价页面
  [`www.boc.cn/sourcedb/whpj`](https://www.boc.cn/sourcedb/whpj/),直接抓取该页面 HTML 并在本地解析,不经过任何第三方服务器。
- **走势线(sparkline)**:取自 [frankfurter.dev](https://frankfurter.dev)(欧洲央行参考汇率)。这是**市场参考价**,与中行牌价走势相近但绝对数值略有差异;其中 AED、MOP、RUB、SAR、TWD 不在该数据源覆盖范围,故不显示走势。

## 平台 Platforms

- **Chrome / Edge**:同一份 `dist/`(或 zip)即可,二者均为 Chromium + Manifest V3,无需改动。
- **macOS / Windows**:`desktop/` 下的 [Tauri](https://tauri.app/) v2 应用,复用扩展的 `src/lib/` 纯逻辑。Windows 同时提供**便携版 `.exe`**(免安装)与**安装版 `*-setup.exe`**——只有安装版能收到通知(见上)。
- **Firefox**:暂未提供(MV3 后台模型与 `sidePanel` 差异,需单独 manifest 与实测,是独立的后续工作)。

## 技术栈 Tech stack

- Manifest V3 · TypeScript (strict) · Vitest
- Vite 6 + [@crxjs/vite-plugin](https://crxjs.dev/)
- 桌面端:Tauri v2(Rust)+ 同一套 `src/lib/`
- 官网:纯静态 HTML / CSS / JS(无框架、无构建)
- 无前端框架,纯原生 DOM

## 开发 Development

```bash
npm install      # 安装依赖
npm run dev      # 扩展开发模式(HMR)
npm run build    # 构建到 dist/
npm run typecheck# 仅类型检查
npm run test     # 运行单元测试(Vitest)
npm run zip      # 打包 dist/ 为可上传商店的 zip
```

桌面应用:`cd desktop && npm install && npm run tauri dev`(打包 `npm run tauri build`)。
官网:`cd website && python3 -m http.server 5500` 本地预览。

### 本地加载扩展 Load unpacked

1. `npm run build`
2. 打开 `chrome://extensions`,开启右上角「开发者模式」
3. 点「加载已解压的扩展程序」,选择 `dist/` 目录

## 项目结构 Structure

```
manifest.config.ts          # 以 TS 生成 manifest
src/
  background/service-worker.ts  # 抓取 / 缓存 / 角标 / 通知 / 定时
  lib/                          # types · currencies · storage · boc 解析(扩展与桌面共用)
  popup/                        # 弹窗 UI
  options/                      # 设置页 UI
public/_locales/                # i18n 文案(10 种语言)
public/images/                  # 图标
desktop/                        # Tauri v2 桌面应用(macOS / Windows)
website/                        # 官网(静态,部署于 Vercel)
```

## License

MIT
