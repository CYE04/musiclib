# musiclib → React 外壳迁移记录

副本：`musiclib-react-migration/`，独立 git 仓库。原 `musiclib/` 一个字节都没动。
基线 tag：`baseline-v0`（迁移前的原样副本）。

## 做了什么

React（Vite）只接管**外壳**：一个 `<div id="music-library">` 和三段原本写在 `index.html` 里的内联脚本。
渲染引擎（`musiclib.js` 及其三个前置脚本）**逐字节未改**，仍以经典 `<script src>` 形式按原顺序加载。

```
musiclib-react-migration/
├── index.html            React 入口；主题预刷/URL key 门禁/iOS 手势禁用 三段内联脚本原位保留
├── src/
│   ├── main.jsx          挂载 React + 注册 SW
│   ├── App.jsx
│   ├── register-sw.js    等价于原 </body> 前的注册脚本（dev 模式不注册）
│   ├── legacy-loader.js  window.initMusicLib / cleanupMusicLib
│   └── components/MusicLibHost.jsx
├── public/               legacy 全部资产，URL 空间与原版逐字节一致
│   ├── musiclib.js  musiclib.css  gsap.min.js  pinyin-pro.js  bible-service.js
│   ├── soundtouch-processor.js  pinyin-kai.woff2  projection.html  sw.js
│   └── manifest.webmanifest  icons/  robots.txt  两个 logo
├── vite.config.js        base './'；关掉文件名 hash（见下）
└── dist/                 vite build 产物 = 可发布目录
```

### 为什么是「注入脚本」而不是 `import`

`musiclib.js` 是自执行 IIFE，顶层第 335 行就是 `document.getElementById('music-library')`，
拿不到就整个应用静默 return。原版靠「div 写在 script 前面」保证，React 版靠 `useEffect` 时序保证：
容器入档 → 才注入脚本。

注入必须满足 4 个条件，`legacy-loader.js` 全部满足：

1. **经典外部脚本**（`createElement('script')` + 真 `src`）。改成 `type="module"` 或内联，
   `document.currentScript` 会变 null，L230-253 三处相对定位（两个 logo、soundtouch AudioWorklet）
   和 L323 的 CSS 兜底注入会全部退化成相对页面 URL 而 404。
2. **`async = false`** 保序。动态 script 默认 async，乱序会让 `fxAttachPressFeedback` 读不到
   `window.gsap`，按压动效永久静默失效。
3. **注入前 URL 已带 `?key=cecp2026`**，否则引擎走「仅内部使用」提示页并 return。
4. **只注入一次，且 `#music-library` 终身不卸载**。主 IIFE 没有重入 guard，重复执行会叠加
   document 级监听、`setInterval` 和第二次 `loadSongs()`。`initMusicLib` 的 `started` 闸门
   挡掉 StrictMode 双跑；`cleanupMusicLib` 是空操作（原引擎本来就没有销毁逻辑，
   要做真正的卸载就得改 `musiclib.js` 内部，属于需另行批准的范围）。

### 内联脚本放哪了

| 原位置 | 现位置 | 理由 |
|---|---|---|
| 主题预刷（读 localStorage 写 `data-theme`） | `index.html` `<head>` 原位 | 挪进 React 组件会晚一帧，深色模式白闪 |
| URL key 门禁 | `index.html` `<head>` 原位 | 必须在任何资源加载前执行 |
| iOS `gesturestart` 禁缩放 + `touch-action` 样式 | `index.html` `<head>` 原位 | 原样 |
| Service Worker 注册 | `src/register-sw.js`，`main.jsx` 挂载后调用 | 等价于原 `</body>` 前；内部仍挂 `window load` |
| `<link id="ml-style">` | `index.html` `<head>` 原位 | 保留 `id` 才能让 `musiclib.js` L320 的自注入分支跳过，避免样式表加载两次 |

### projection.html：选方案 A（保持独立页，不进 React）

理由：
- 它只依赖 `musiclib.css` 一个外部文件，且必须把内容包在 `#music-library` 里才能命中作用域样式；
  一旦被 Vite 资产管线接管、CSS 改成带 hash 的名字，投影页立刻掉样式。
- 控制端 `window.open('./projection.html')` 是相对控制页 document 解析的。放 `public/` 后
  URL 仍是 `<根>/projection.html`，开窗代码不用改。
- 跨窗口通信（BroadcastChannel `cecp:musiclib:projection:v1` + localStorage 总线兜底）
  与 React 完全无关，原样保留即生效——已实测双向通。

方案 B（做成 React 路由页）除了引入上述风险，没有任何收益。

### 改了的 legacy 文件（仅两处，都是构建/部署必需）

- `public/sw.js`：`APP_SHELL` 增加 `./assets/index.js`（React 入口 bundle），
  `CACHE_NAME` bump 到 `cecp-musiclib-pwa-v91-react`（不 bump 的话老 SW 会一直喂旧 shell）。
  为了让这一行能静态写死，`vite.config.js` 关掉了产物文件名 hash。
  **若将来恢复 hash 文件名，必须改成构建期注入 manifest，否则离线首屏白屏。**
- `wrangler.jsonc`：`assets.directory` 从 `.` 改成 `./dist`。部署前必须先 `npm run build`。

`musiclib.js` / `shared/*` / `soundtouch-processor.js` / `bible-service.js` / `pinyin-pro.js` /
`gsap.min.js` / `musiclib.css` / `projection.html` / `manifest.webmanifest`：**零改动**。

## 验证报告

环境：Chrome，视口统一 1280×900；A = 原版 `http://localhost:8742/musiclib/`，
B = React 版 `http://localhost:5176/`（dev）与 `http://localhost:5177/`（`vite build` 产物）。

### 1. 简谱 / 和弦 像素级比对（核心风险，已用数值比对而非肉眼）

写了个几何指纹探针：打开每首歌，把乐谱容器内 16 类元素
（`.sw-lrow / .p-n / .p-lyric / .p-chord / .chord-chip / .jp-u1-line / .jp-u2-line /
.jp-slur* / .jp-tie / .sw-lsec-name / .jp-dot / .jp-aug / .jp-bar / .jp-nav`）
逐个量 `getBoundingClientRect`，取相对乐谱容器左上角的 left/top/width/height（精确到 0.01px）
连同 className、文本一起哈希。

- **全库 76 首、共 41,605 个元素几何，A 与 B 指纹逐首完全一致（76/76）。**
  含全部 18 首 `align:"strict"` 严格对位歌。差异数：0。
- **移调 12 调**（`shijiadeai`，strict 歌）：C / C# / D / D# / E / F / F# / G / G# / A / A# / B
  十二个调的几何指纹**全部一致**；同时比对了每个和弦 chip 的文本 + `getComputedStyle` 的
  `color` / `backgroundColor`，**12 调 × 40 个 chip 的配色也全部一致**。

> 踩到的坑（不是产品问题，是测量问题）：浏览器后台标签会节流 timer/rAF，
> `fitRows` 这类布局收尾跑不完，量出来的是「未收敛」中间态。必须把被测标签置前再量。
> 第一次比对出现的「A 宽 1147.2px / B 宽 1000px」差异就是这个原因，置前重测后两边完全一致。

### 2. 投影模式（双窗口）

控制端 = React 版 `/`，投影端 = `/projection.html`（另一个标签页，同源 BroadcastChannel）。

- 投影页正确加载，`document.title` = 投影输出 · CECP 诗歌库，`data-resolved-theme=dark`，
  样式表只有 `musiclib.css?v=20260801-home17`，`#music-library #proj-page` 作用域成立。
- 控制端 → 投影端：收到真实 `page` 消息，烘进去的 HTML 22,616 字符，
  页码 `2 / 2`，`scale(0.957176)` 自适应缩放生效，`#proj-chord-style` 和弦样式已注入，
  背景渐变已应用。
- 投影端 → 控制端：在投影页按 ArrowLeft，控制端收到 `nav prev` 并重新推页，
  投影端页码变 `1 / 2` 且内容换成第 1 页（标题页 `C调 4/4 0061 歌唱耶和华的大慈爱`）。
  **双向同步实时生效。**
- 演示台三栏 UI（本堂歌单 / 幻灯片 / 当前输出 + 四个显示层开关 + 16:9·4:3 + 黑屏 +
  字号/和弦/行距滑块）在 React 壳内正常渲染。

### 3. PWA 离线（在 `vite build` 产物上验证，不是 dev）

- SW 注册并 `activated`，两个缓存桶都在：`cecp-musiclib-pwa-v91-react`、`cecp-musiclib-data-v1`。
- APP_SHELL **19/19 条全部预缓存成功**，含 `/assets/index.js`、`/?key=cecp2026`、
  `/projection.html`、`/pinyin-kai.woff2`。
- **真·断网测试**：把 HTTP server 进程停掉（`curl` 确认 5177 端口 connection refused），
  然后刷新页面 —— 页面完整渲染，76 首歌可用，
  `performance` 显示 `musiclib.css / assets/index.js / gsap / pinyin-pro / bible-service / musiclib.js`
  全部 `transferSize === 0`（走 SW 缓存）。

### 4. 其它已验证项

| 项 | 结果 |
|---|---|
| 引擎启动 | `__CECP_MUSICLIB_ENGINE__` 就绪，`#music-library` 17 个子节点，控制台零错误 |
| 脚本顺序与全局 | 4 个脚本按原序、原 URL（含 `?v=`）加载；`gsap` / `pinyinPro` / `CECPBibleService` 均在 |
| 样式表未双载 | 页面只有 1 个 `musiclib.css` link（`id="ml-style"` 生效） |
| 曲库加载 | 76 首（GitHub API + raw，与原版同源同路径） |
| 首页 / 今日推荐 / 货架 / 底栏 | 与原版一致 |
| 主题三态 | `system/light → light/light → dark/dark → system/light`，localStorage 持久 |
| 和弦点击 | 点 `D/F#` 弹出 `<chord-explorer>`，钢琴图在，`cecp-chord-engine-style` 与委托监听均已装 |
| 变速/变调面板 | CECP Transpose 面板正常（TRANSPOSE / PITCH / SPEED·TEMPO / LOOP） |
| 嵌入模式 `?embed=1&song=` | 只出详情，外壳全藏，工具条压成 移调/变速/节拍器，原图谱正常 |
| 详情深链 `?song=` | 正常直达 |

### 5. 没能验证的（需要真机或真环境）

- **iOS 手势禁用、PWA 装到主屏、锁竖屏**：需要 iOS 真机。代码与原版逐字节相同、位置相同。
- **URL key 门禁的拒绝分支**：`alert()` + `location.replace('https://cecp.it')`，
  外站在这个浏览器面板里被策略拦截，没法跑通。门禁脚本本身与原版逐字节一致且在 `<head>` 最前。
- **双屏自动定位**（`getScreenDetails` + `window.open` 定位到扩展屏）：需要真双屏。
  弹窗本身在这个面板里也开不出来（面板不支持 popup），所以用同源第二标签页验证了通信协议。
- **触屏手势**：下拉刷新、详情下滑关闭、乐谱捏合缩放。
- **导出单图 PNG**：依赖 CDN 动态加载 html2canvas，没在断网/CSP 场景下跑。
- **音频变速变调的实际音质**：面板 UI 已验证，没做听感测试。

### 6. 已知问题（迁移前就有，本次原样保留，没有修）

- 离线状态下直接导航到 `./projection.html`，SW 的 navigate 兜底会返回 `index.html`
  （`sw.js` L85 只 match `"./?key=cecp2026"`）。现状能用是因为投影窗总是由在线的控制端开出来。
  要修的话在 L85 前加一条按 `url.pathname` 匹配 projection.html 的分支——但那是行为改动，
  等你点头再做。
- `musiclib.css` 顶部 `@import` 的 Google Fonts 不进离线缓存，断网时靠系统字体兜底。

## 下一步

阶段 4「优化」（拆 CSS、提取 React 组件、上 TypeScript、ES module 化）**一律没做**，
按约定等这份验证报告过了再单独讨论。
