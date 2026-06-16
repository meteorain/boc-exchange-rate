# 官网 · Website

中国银行外汇牌价(扩展 + 桌面应用)的产品落地页。纯静态(HTML / CSS / JS),无构建步骤,可直接部署到 Vercel。

A static marketing landing page for the project. No build step.

**双语 / Bilingual**:单个 `index.html`,默认中文;按浏览器语言自动在中 / 英之间切换,右上角也可手动切换(选择会记住)。品牌名与桌面版一致(中文「中国银行外汇牌价」/ 英文「BOC FX Rates」)。

## 本地预览 Preview

直接用浏览器打开 `index.html`,或起个静态服务器:

```bash
cd website
python3 -m http.server 5500   # 然后访问 http://localhost:5500
```

## 部署到 Vercel

1. 在 Vercel 导入这个 GitHub 仓库;
2. **Root Directory** 设为 `website`;
3. **Framework Preset** 选 `Other`(无需 Build Command,Output 留空);
4. Deploy。

> 因为是纯静态,Vercel 直接托管 `website/` 下的文件即可。

## 商店与下载链接 Store & download links

- **Chrome 应用店**、**Edge 加载项**:已在「浏览器扩展」卡片中接入真实地址。
- **桌面版下载**:指向 GitHub Releases;请在仓库发布 Release 并附上 `.dmg` / `.exe` 产物。

## 直接下载的扩展包(随仓库托管) Bundled extension package

页面提供一个扩展安装包的直接下载:`boc-fx-rates-extension.zip`(放在本目录,随 Vercel 一起托管)。
它就是 `npm run build` 产出的 `dist/` 打成的 zip ——**不是 `.crx`/`.rcx`,也无法双击安装**;用户需在 `chrome://extensions` 开启「开发者模式」→「加载已解压的扩展程序」(先解压)。商店按钮才是主要安装入口。

> 注意:`.gitignore` 默认忽略 `*.zip`,已为此文件加了例外 `!website/boc-fx-rates-extension.zip`,确保它会被提交、被 Vercel 托管。

**每次发新版,刷新这个包:**

```bash
# 在仓库根目录
npm run build
cd dist && zip -rq ../website/boc-fx-rates-extension.zip . && cd ..
```

(文件名保持不变,页面链接无需改动;直接覆盖即可。)

## 可选:社交分享图

`index.html` 的 `og:image` 指向 `./og.png`(1200×630)。可用 Lovart 生成后放到本目录;不放也不影响页面本身。
