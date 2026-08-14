# 部署配置与上线清单

> **2026-08-12 更新（以下第一、二节已作废，看这里）**
>
> 真相是 **Cloudflare Workers Builds（Git 集成自动部署）**，不是本地手动 wrangler。
> Cloudflare 后台的 musiclib Worker 直接连着 `CYE04/musiclib` 仓库，**push/上传即部署**。
> 账号是 **cecinese.padova**（不是 carloyuenchen2@gmail.com，所以本机 wrangler 一直报
> "Worker does not exist" —— 那是登错账号，不是 Worker 不存在）。
>
> 仓库里看不到任何痕迹（没有 CI、没有 wrangler-action、没有 CLOUDFLARE_API_TOKEN），
> 因为这套配置只存在于 Cloudflare 后台 —— 这是当初审计判断错的原因。
>
> **后台没有配 build command**，它直接把仓库里的 `dist/` 当静态资产发布。所以：
> - `dist/` 必须跟着提交（`.gitignore` 已改成不忽略它）
> - 改了 `src/` 或 `public/` 之后**一定要** `npm run build` 并把新的 `dist/` 一起传，
>   否则线上还是旧版
> - 更干净的做法：在 Cloudflare 后台给这个 Worker 配 build command
>   `npm ci && npm run build`，然后再把 `dist/` 加回 `.gitignore`
>
> 「先发预览再切生产」这一步**没有发生** —— 上传仓库的那一刻就直接上生产了。

## ⚠️ 先看这条：预览部署卡住了，需要你决定（已作废，见上）

`npx wrangler versions upload` 报错：

```
You cannot upload a new version of a Worker that does not yet exist.
```

追下去发现两件事对不上：

| 事实 | 证据 |
|---|---|
| 线上站活着，跑的是**迁移前**的版本 | `curl https://musiclib.cecp.it/sw.js` → `CACHE_NAME = "cecp-musiclib-pwa-v90-home"` |
| 但当前登录的 Cloudflare 账号下**没有**叫 `musiclib` 的 Worker | `wrangler deployments list` → `This Worker does not exist on your account. [code: 10007]`，账号 `carloyuenchen2@gmail.com` / `0ebd13ee…` |

也就是说 **`musiclib.cecp.it` 不在这个账号下**（另一个 Cloudflare 账号，或者用了别的 Worker 名/别的产品）。

所以我**没有部署任何东西**。在账号归属搞清楚之前发预览，只会在你账号上多出一个和线上无关的 Worker，
既证明不了什么，将来切生产时还容易搞混。需要你确认：`musiclib.cecp.it` 到底在哪个 Cloudflare 账号下。

搞清楚后，安全的预览路径见文末「上线前检查清单」第 4 步。

配置本身是好的，已用不上传的方式验过：

```bash
npx wrangler@4 deploy --dry-run
# ✨ Read 24 files from the assets directory .../dist
```

---

## 部署方式：本地手动 wrangler，而且源不是这个仓库

从 zsh 历史里挖出来的真实上线动作：

```
git clone https://github.com/CYE04/musiclib.git ~/Desktop/musiclib-deploy
cd ~/Desktop/musiclib-deploy && npx wrangler deploy
curl -s "https://musiclib.cecp.it/sw.js?t=$RANDOM" | grep CACHE_NAME   ← 部署后核对线上版本
```

三条结论：

1. **不是** Cloudflare 后台 Git 自动部署。全仓库零 `CLOUDFLARE_API_TOKEN` / `wrangler-action` / `pages-action` 引用；
   两个 GitHub workflow（`deploy.yml` 打 cecp-projection 的 Docker 镜像、`libapp-build.yml` 是个连 git 都没进的死文件）都不碰 musiclib。
   所以**不需要**去后台设置 Build command / Build output directory。
2. **不是** Cloudflare Pages。全仓库没有 `_headers` / `_redirects` / `_routes.json` / `functions/`。
   用的是 Workers Static Assets（`wrangler.jsonc` 的 `assets.directory`）。
3. 部署源是**另一个 GitHub 仓库 `CYE04/musiclib`**，克隆到桌面、发完就删。当前仓库 `CYE04/Cecp` 里的 `musiclib/` 只是本地副本。

顺带一个必须知道的事实：**歌曲数据完全不参与部署**。`musiclib.js` 写死从
`raw.githubusercontent.com/CYE04/Cecp/main/songs/` 拉。改歌 = push 到 Cecp 仓库就即时生效；
改壳才需要 wrangler deploy。两条独立通道。

### 由此带来的问题：React 版该住哪

这次迁移的副本 `musiclib-react-migration/` 是个**没有 remote 的本地 git 仓库**，
而它 `public/` 里那些运行必需的资产（gsap、pinyin-pro、pinyin-kai 字体、soundtouch、bible-service、图标、manifest）
在主仓库 `CYE04/Cecp` 里**从来没有被 git add 过**（`git ls-files musiclib/` 只返回 6 个文件）。
换句话说，这个本地仓库目前是这些文件**唯一**的版本控制。上线前得先决定它推到哪里去。

---

## 任务逐条回复

### 任务 1 — wrangler.jsonc

已改：`assets.directory` 从 `"."` → `"./dist"`。`compatibility_date`（2026-06-11）与
`compatibility_flags`（`nodejs_compat`）原样未动。

**没有加** `not_found_handling: "single-page-application"`。因为投影页选的是**方案 A**：
`projection.html` 保持独立 html 放在 `public/`，不进 React Router。理由在
[MIGRATION.md](MIGRATION.md#投影页选方案-a) 里：它靠 `#music-library` 作用域命中 `musiclib.css`，
一旦被 Vite 资产管线接管、CSS 换成带 hash 的名字就掉样式；而且控制端
`window.open('./projection.html')` 是相对控制页解析的，放 `public/` 后 URL 不变。
加了 SPA 兜底反而会把本该 404 的路径变成首页，与原版行为不符。

### 任务 2 — Service Worker 缓存清单

**没用 vite-plugin-pwa，用了一个约 40 行的构建期插件**（在 `vite.config.js` 里）。理由：

vite-plugin-pwa 的 `injectManifest` 模式要把 sw.js 走一遍它的构建管线，还要引入 `workbox-build` 依赖。
而这里真正要保住的是 sw.js 里那两段**特殊逻辑**——它们是这个站离线能用的全部原因。
自己写插件的好处是：**那两段代码一个字节都没被碰过**，不是"我确认过它还在"，是它压根没进过任何转换。
如果你更想要 vite-plugin-pwa 的生态（自动更新提示、周期性检查），随时可以换，我把接口留得很干净。

插件做三件事：

1. 扫 `dist/`，生成真实清单，写回 `dist/sw.js` 的 `CECP-PRECACHE-BEGIN/END` 之间。
2. **文件名 hash 因此可以恢复**（现在是 `assets/index-DaoBRUQR.js`）。原来为了让手写清单能命中，
   构建产物被迫关掉 hash，这个限制没了。
3. 缓存桶名 = 全部产物的内容指纹（`cecp-musiclib-pwa-<10位hash>`）。**再也不用记得手动 bump 版本号**——
   任何文件变了桶名就变，`activate` 里原有的清理逻辑自动删掉旧桶。

#### 光扫 dist/ 会漏掉 4 个文件（这条最关键）

有四个文件**任何构建期扫描都发现不了**，必须在插件里手写死，它们都在 `SCAN_INVISIBLE` 里：

| 文件 | 为什么扫不到 |
|---|---|
| `soundtouch-processor.js` | 只在用户动变调滑块时 `audioWorklet.addModule()`，URL 由 `document.currentScript` 算出 |
| `projection.html` | 只在进投影时 `window.open('./projection.html')`，纯字符串字面量 |
| `olive-fellowship-logo.png` | 在 `innerHTML` 模板里用 `${LOGO_SRC}` 插值 |
| `cecp-olive-logo.svg` | 同上，`${TRANSPOSE_LOGO_SRC}` |

漏掉它们不会报错，只会在"断网 + 用户点了变调/投影"时静默失败——最难查的那种。

#### (a)(b) 两段特殊逻辑：没丢，而且都实测过

- **(a) GitHub 歌曲数据 network-first**：`api.github.com/repos/CYE04/Cecp/contents/songs` 与
  `raw.githubusercontent.com/CYE04/Cecp/main/songs/` 走 network-first 写入 `cecp-musiclib-data-v1`，
  缓存 key 去掉查询串（`loadSongs` 的 `?t=` 时间戳），离线回退。代码原样未动。
- **(b) navigate 离线回退**：保留，并**修了一个原版就有的瑕疵**——原来任何离线导航都返回
  `./?key=cecp2026`，导致离线打开 `./projection.html` 拿到的是首页。现在先按请求本身找缓存，
  找不到才回退首页。已实测（见下）。

#### 顺带修掉一个原版就埋着的雷：`Vary` 导致预缓存永远命中不了

第一次离线验证时白屏了。查出来是：预缓存用 `cache.addAll(路径字符串)` 存，存进去的请求**没有** `Origin` 头；
而 Vite 产出的模块脚本带 `crossorigin` 属性，真实请求**会**发 `Origin`。服务器只要回一个 `Vary: Origin`，
`caches.match` 就因 Vary 不匹配而落空——**白屏且零报错**。

修法是给所有 `caches.match` 加 `{ ignoreVary: true }`。

这个雷在原版 sw.js 里也在，只是原版的脚本标签没有 `crossorigin` 所以外壳没踩到。
但**歌曲数据那条踩到了**：`api.github.com` 的响应带 `Vary: Accept-Encoding, Accept, Authorization`，
而回读时用的是 `cache.match(keyUrl)`（字符串，无头）。所以你现在线上的「离线还能看歌」很可能是坏的，
只是没人在断网状态下试过。这次一并修了。

#### 可复现的离线验证步骤（我已经按这个跑过一遍）

```bash
cd musiclib-react-migration
npm run build
npx vite preview --port 5177 --strictPort
```

1. 浏览器开 `http://localhost:5177/?key=cecp2026`，等 Service Worker 变成 `activated`。
2. DevTools → Application → Cache Storage，确认有 `cecp-musiclib-pwa-<hash>` 与 `cecp-musiclib-data-v1` 两个桶，
   前者 20 条。
3. **把 `vite preview` 进程 Ctrl-C 停掉**（比 DevTools 的 offline 开关更真：连不上就是连不上）。
4. `curl http://localhost:5177/` 确认 connection refused。
5. 回浏览器刷新页面。

我跑的结果：

- 页面完整渲染，76 首歌可用，深浅主题正常（截图见对话）。
- `performance` 里 `musiclib.css` / `assets/index-DaoBRUQR.js` / `gsap.min.js` / `pinyin-pro.js` /
  `bible-service.js` / `musiclib.js` 全部 `transferSize === 0`。
- `caches.match('./projection.html')` 返回 12,245 字节、内容含「投影输出」而**不是**首页——(b) 的修复生效。
- 升级路径也验了：连续三次构建，每次桶名都变（`df0390190d` → `870c6cd43d` → `dd221c2d02`），
  旧桶每次都被 `activate` 自动删干净，只剩新桶 + 数据桶。

### 任务 3 — 构建与部署流程

**本地手动部署**（判据见上）。`package.json` 已配好：

```bash
npm run build          # vite build，产物进 dist/，同时生成 SW 预缓存清单
npm run deploy:preview # build + wrangler versions upload（不切流量）
npm run deploy         # build + wrangler deploy（会切生产，别手滑）
```

用 `npx wrangler@4` 而不是装成依赖，跟你原来 `npx wrangler deploy` 的习惯一致，也不给这个项目塞一个大包。

**不需要**去 Cloudflare 后台设 Build command / Build output directory —— 那是 Git 集成才需要的，这里没用 Git 集成。

### 任务 4 — gsap.min.js

**放在 `public/` 里，没有装 npm 包**，这是刻意的。

- 它不在主仓库 git 里（和 pinyin-pro、pinyin-kai 字体、soundtouch 等一样，从来没被 `git add` 过），
  但在迁移副本仓库里**已被跟踪**，`public/gsap.min.js` 与 `musiclib/gsap.min.js` 逐字节相同
  （sha256 `5468a19b…`，72,304 字节）。
- 文件头 banner 自称 GSAP 3.12.7（UMD 压缩版）。npm 上确有 `gsap@3.12.7`，但我没下载 tarball 做字节比对，
  所以「3.12.7」目前只有它自己的声明为证。
- **不改成 npm 包的理由**：`musiclib.js` 是 legacy 引擎，靠全局 `window.gsap`。装 npm 包就要 import 进 bundle，
  那会改变加载时序，正好踩迁移的四个硬条件之一。而且只有 5 处调用（`gsap.to` ×3、`gsap.fromTo` ×2），
  缺了也只是按压动效失效，不值得为它冒险。
- **构建产物里确实有**：`dist/gsap.min.js` 存在，且在预缓存清单里（`./gsap.min.js?v=20260711-justify-rows`，
  带 `?v=` 是因为清单存的是**页面真实请求的 URL** —— Cache API 精确匹配查询串，存裸路径救不了带查询串的请求）。

---

## 回滚：万一 PWA 缓存出问题

先说结论：**这次的设计让"卡在坏缓存里"基本不可能发生**，因为三件事叠在一起。

1. **`skipWaiting()` + `clients.claim()`**（原本就有）：新 SW 一装好立刻接管，不等所有标签页关闭。
2. **桶名带内容指纹**：任何一个文件变了，`CACHE_NAME` 就变。
3. **`activate` 删掉所有非当前桶**（原本就有）：

   ```js
   keys.filter(k => k !== CACHE_NAME && k !== DATA_CACHE).map(k => caches.delete(k))
   ```

三者合起来 = 只要用户拿到新 sw.js，旧缓存**必然**被删。而 sw.js 本身不会被 SW 自己缓存（浏览器对
SW 脚本有独立的更新检查，最长 24 小时，且每次导航都会顺带检查一次）。

**回滚动作**（按代价从小到大）：

1. **重发上一版**：`git checkout <上个好的 commit> && npm run build && npm run deploy`。
   桶名跟着内容变回去，用户下次打开自动清掉坏桶。这是首选，不需要用户做任何事。
2. **Cloudflare 后台版本回滚**：Workers → musiclib → Deployments，把流量切回上一个 version。
   比重新构建快，但注意它回滚的是 Worker 资产，不改用户设备上已装的 SW —— 靠第 1 条的机制，
   用户拿到旧 sw.js 后同样会换桶清理。
3. **核选项（只在 SW 本身写坏、导致它连新 sw.js 都取不到时用）**：发一版"自杀 SW"：

   ```js
   self.addEventListener('install', () => self.skipWaiting());
   self.addEventListener('activate', (e) => e.waitUntil(
     caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))
       .then(() => self.registration.unregister())
       .then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url)))
   ));
   ```
   把 `public/sw.js` 临时换成这个、发上去，所有用户下次打开会清空缓存并注销 SW，回到纯网络模式。
   确认干净后再把正常 sw.js 发回去。

**用户侧手动兜底**（教给会众的话术）：iOS 把 App 从主屏删掉重装；桌面 Chrome
设置 → 隐私 → 清除浏览数据 → 只勾"Cookie 及其他站点数据"。

---

## 上线前检查清单

按顺序做，每步写了「预期看到什么」。

### 1. 先把账号问题解决（**阻塞项**）

确认 `musiclib.cecp.it` 在哪个 Cloudflare 账号下。
- 若在另一个账号：`npx wrangler@4 logout && npx wrangler@4 login`，登进那个账号，再跑 `npx wrangler@4 deployments list`
  → **预期**：能列出 `musiclib` 的部署历史，不再报 10007。
- 若 Worker 名不叫 `musiclib`：把 `wrangler.jsonc` 的 `name` 改成真实名字。

### 2. 决定 React 版住哪

线上部署源是 `CYE04/musiclib` 这个独立仓库。要么把 React 版推到那里（替换它的内容），
要么改成从别处部署。**顺带务必解决**：那些运行必需的资产（gsap / pinyin-pro / pinyin-kai / soundtouch / 图标）
在主仓库里从来没进过 git，目前只有本地的 `musiclib-react-migration` 仓库在管它们，而它没有 remote。
→ **预期**：新克隆一份、`npm ci && npm run build`，`dist/` 里 24 个文件齐全。

### 3. 本地最后一次自检

```bash
cd musiclib-react-migration && npm run build
node ../shared/strict-align.conformance.js
npx wrangler@4 deploy --dry-run
```
→ **预期**：构建打印「预缓存清单已写入 dist/sw.js：20 条」；一致性测试「5 份副本行为完全一致」；
dry-run 打印「Read 24 files from the assets directory」。

### 4. 发预览（不切生产）

```bash
cd musiclib-react-migration && npm run deploy:preview
```
→ **预期**：wrangler 输出一个 `Version ID` 和一个 Version Preview URL，
**生产流量不动**（`versions upload` 只上传版本、不部署）。把那个 URL 给我/你自己测。
访问时记得带 `?key=cecp2026`。

### 5. 在预览 URL 上你亲自跑的（我自动测不了的）

这五项我在本地都试不了或试不全，必须你在预览环境上手：

1. **PWA 装到主屏 + 离线**：iOS Safari「添加到主屏幕」，装完飞行模式，从主屏图标进——
   → 预期：能开、能搜、能看谱。**顺带确认变调面板和投影页在断网下也能开**（这次新进预缓存的两个）。
2. **投影双窗口跨屏同步**：接投影仪/副屏，演示台点「进入投影」——
   → 预期：自动跑到副屏并全屏；控制端翻页投影端跟着变；投影端按方向键控制端也跟着变。
   （本地我用同源第二标签页验过协议，但真弹窗 + `getScreenDetails` 双屏定位在这个浏览器面板里开不出来。）
3. **音频变速变调的实际音质**：随便找一首有音频的，变速 80%、变调 −2 —— 
   → 预期：不变调地变速、音质无金属声；面板徽章显示 `pro`。（我只验了 UI，没做听感测试。）
4. **导出单图 PNG**：点「下载图片」—— 预期：拿到暖白底、和弦彩色、荧光笔内联的 PNG。
   （它从 CDN 动态加载 html2canvas，我没在受限网络下试过。）
5. **触屏手势**：下拉刷新、详情下滑关闭、乐谱捏合放大。

已经自动验过、你不用重复的：全库 76 首简谱几何零差异、12 调移调、主题三态、和弦点击弹指法、
嵌入模式、深链、离线首屏、离线投影页、缓存桶升级清理、URL key 门禁（不带 key 确实弹 Access denied 并跳 cecp.it）。

### 6. 切生产

预览跑完没问题，再由**你**执行：

```bash
cd musiclib-react-migration && npm run deploy
```
→ **预期**：`curl -s "https://musiclib.cecp.it/sw.js?t=$RANDOM" | grep CACHE_NAME`
输出的桶名与本地 `dist/sw.js` 里的一致（现在是 `cecp-musiclib-pwa-dd221c2d02`，每次构建都会变）。
这条 curl 就是你原来验证上线用的那条，继续用。
