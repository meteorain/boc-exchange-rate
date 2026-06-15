# 桌面版 (Tauri) · Desktop app

中国银行外汇牌价的**菜单栏 / 托盘版**,基于 [Tauri v2](https://tauri.app)。复用浏览器扩展的纯逻辑(`../src/lib`:解析、换算、币种名、格式化),抓取走 Tauri 的 HTTP 插件(无 CORS),把汇率显示在菜单栏标题上。

A menu-bar / tray build of the Bank of China exchange-rate tool. Reuses the
extension's pure logic from `../src/lib`; fetches via Tauri's HTTP plugin
(no CORS); shows the rate in the menu-bar title.

## 前置 Prerequisites

- Node 18+,Rust(`https://rustup.rs`),以及各平台的 Tauri 系统依赖
  (macOS 自带 WKWebView;Windows 需 WebView2,Win10/11 通常已预装)。

## 开发 Develop

```bash
cd desktop
npm install
npm run tauri dev      # 启动应用,点菜单栏图标开关窗口
```

## 构建 Build

```bash
# macOS:.app + .dmg
npm run tauri build

# Windows:单个便携 exe(免安装,约 5–8MB,依赖系统 WebView2)
npm run tauri build -- --no-bundle
# 产物:src-tauri/target/release/boc-fx-desktop.exe
```

> 打包必须在目标系统上进行(macOS 包只能在 macOS 上打、Windows exe 只能在
> Windows 上打)。仓库已配 GitHub Actions(`.github/workflows/desktop.yml`),
> push 一个 `desktop-v*` 标签即可在云端同时产出两个平台的包。

## 说明 Notes

- **图标**:`src-tauri/icons/` 由 `npm run tauri icon <源图>` 生成,建议用
  1024×1024 源图重新生成以获得最佳清晰度(当前用的是 128×128 扩展图标)。
- **签名**:未签名可直接自用;对外分发建议 macOS 公证、Windows 代码签名,
  否则首次打开会有系统安全提示。
- **当前范围 (MVP)**:菜单栏汇率 + 牌价卡片列表 + 自动/手动刷新。走势图、
  换算器、智能提醒等可在此基础上继续移植(逻辑已在 `../src/lib` 中)。
