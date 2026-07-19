# musiclib「投影模式」技术方案（阶段一 · 调研文档）

> 本文档只做调研与方案设计，**未写任何投影功能代码**，也未改动 `musiclib.js` / `musiclib.css` / `index.html`。
> 代码引用行号基于调研当时的 `musiclib/musiclib.js`（约 7758 行），后续代码变动可能有偏移，以函数名为准。

---

## 0. 背景校对（与开发方案的差异）

开发方案里有两处描述需要修正，先说清楚，避免后面按错误前提设计：

1. **「和弦」不需要额外调用 `shared/chord-engine.js` 计算。** 和弦文字是**逐段内联**存在数据里的（`seg.chord`），移调由 `musiclib.js` 内部自带的 `trChord/trChordEx/trKeyName` 完成。`shared/chord-engine.js` 是「点和弦弹出组成音/钢琴键盘/吉他把位」的交互组件（`ChordPianoEl`/`ChordExplorerEl`），**和投影渲染无关**。而且 `index.html` 实际上**只加载了 `pinyin-dict.js` + `musiclib.js` 两个脚本**（见 `index.html:70-71`），chord-engine 的渲染逻辑已内联进 `musiclib.js`。

2. **仓库里已存在一个 `cecp-projection/` 目录**（React + Vite + PPTX 解析器），那是你视频里提到的**独立原型项目**，与本次「在 musiclib 内做投影模式」是两回事，不要混用。本方案的一切都在 `musiclib/` 里做纯前端实现。

其余背景（单文件架构、`song.sections` 结构、`#ml-detail-actions` 挂载点、`cecpPinyinOf` 注音、双屏演示、四开关自由组合、翻页、全屏 + Wake Lock）均与实际代码一致。

---

## 1. 数据结构调研

### 1.1 `song.sections` 的真实形状

在 `renderScore()`（`musiclib.js:7568`）里，渲染就是三层循环 `sections → lines → segs`：

```
song = {
  id, title, artist, sub, origKey, timeSign, bpm, mp3, cover, lrc, youtube, scoreImg,
  sections: [ { name, lines: [...] }, ... ]
}
```

- **`section.name`**：段落名（如 `"主歌"` `"副歌"` `"能不能"`），渲染成 `.sw-lsec-name`。
- **`section.lines`**：每个元素是「一行」，有**两种形态**（`renderScore` 第 7592-7593 行做了兼容）：
  - `Array<seg>`：直接就是段数组；
  - `{ line: Array<seg>, b: true }`：对象包裹，`b` 表示整行**加粗**。
  - 取段数组：`const segs = Array.isArray(line) ? line : (line.line||[])`。

### 1.2 段（seg）的字段 —— label / lyric / chord / n

段有两类，靠 `segIsLabelBlock()` / `segIsRenderableBlock()`（`musiclib.js:3489-3496`）区分：

**(A) 段落标记块**（渲染成彩色小药丸，浮在行上方）：
```json
{ "label": "副歌", "style": "jump"?, "dx": 0? }
```
- `label` 是字符串就算标记块，`segRenderLabelBlock()` 渲染（`musiclib.js:3519`）。
- 颜色由 `secLabelColor()` 按关键词（chorus/副歌/verse/主歌…）或哈希决定。

**(B) 可渲染内容块**（有 `chord`/`n`/`lyric*` 任一字段）：
```json
{ "chord": "Bbmaj7", "n": "3,_ 2,_", "lyric": "看着", "lyric2": "你每" }
```
四层数据的准确含义（这正是投影四开关要拆的四层）：

| 字段 | 含义 | 投影层 | 渲染函数 | 是否随移调变 |
|---|---|---|---|---|
| `chord` | **和弦**文字，如 `Bbmaj7`、`C/G`；空串=无和弦 | 和弦层 | `trChordEx(seg.chord, st, useFlat, trChord)` → `setChordContentEx` | **是**（移调） |
| `n` | **简谱**（数字谱字符串，含小节线 `\|`、连音、附点、三连音 `{3`、跳房子 `[v1`、`{sp}` 补位等） | 简谱层 | `renderNStr(seg.n, {inlineTimeSign})` | **否**（首调唱名，移调不变） |
| `lyric` | **歌词**（第 1 段），`ㅤ`(U+3164) 是占位空拍 | 歌词层 | `setLyricContentEx(el, normLyricText(seg.lyric))` | 否 |
| `lyric2/3/4` | 第 2/3/4 段歌词（多段歌，可选） | 歌词层（多段） | 同上，`.p-lyric2/3/4` | 否 |

真实样本（`songs/zhaodaowo.json`，F 调）：
```json
{"chord":"Bbmaj7","n":"3,_ 2,_","lyric":"看着","lyric2":"你每"}
{"chord":"","n":"3,_ 5,__ ( 5,__ sp 5, )","lyric":"我自己","lyric2":"字每句"}
{"chord":"","n":"0 sp | sp","lyric":"ㅤ","lyric2":"ㅤ"}
```
真实样本（`songs/nengbuneng.json`，G 调，无歌词纯前奏行，和弦里用 `ㅤ` 做对齐补位）：
```json
{"chord":"ㅤㅤㅤㅤㅤㅤㅤㅤㅤ G","n":"1'_ 7_ 1'__ ( 5__ sp | sp 5 )","lyric":"ㅤ"}
```

**关键结论（对投影分层的影响）：**
- 一个 seg 天然就承载了「和弦 / 简谱 / 歌词(多段)」三种并列信息，**拼音是第四层，需要现算**（见 1.3）。
- **简谱不随移调改变**（首调数字谱），只有**和弦随移调改变**。所以投影模式做移调联动时，只需重算和弦层，简谱/歌词/拼音层不动。
- 数据里大量出现 `ㅤ`(U+3164) 和 `{sp}`/`sp` 补位符，是排版对齐用的，投影渲染要沿用 musiclib 现有的 `setLyricContentEx`/`renderNStr`/`spStripTokens` 处理，不要自己 naïve 地按字符切。

### 1.3 `window.cecpPinyinOf(char)` 的调用方式与局限

来源 `musiclib/pinyin-dict.js`：
```js
window.cecpPinyinOf = function(ch){ /* 按码点查表 */ return n ? TABLE[n-1] : ""; }
```
- **输入**：单个字符；**输出**：单个**无声调**拼音音节字符串（如 `"kan"`），查不到返回 `""`。
- **局限**：
  1. **多音字**：查表只给**一个固定读音**（最常见读音），无法结合上下文判断（如「долгота」——「长」「行」「和」这类多音字会给单一读音，可能标错）。方案默认接受此误差，不做上下文消歧。
  2. **非中文字符**：返回 `""`。逐字生成拼音层时，遇到 `""` 要跳过（不占位）或对英文/数字原样透出（现有 `buildPinyinIndex` 的做法是 `else if(/[a-z0-9]/i.test(ch)) syl.push(ch.toLowerCase())`，可参考）。
  3. **占位符**：`ㅤ`(U+3164)、`　`(全角空格)、`{sp}` 这些排版符不是汉字，`cecpPinyinOf` 会返回 `""`，投影拼音层要跳过它们、并与歌词层保持逐字对位。
- **调用范式**（参照 `buildPinyinIndex` `musiclib.js:2223`）：`for(const ch of text){ const py=cecpPinyinOf(ch); ... }`；调用前判 `typeof window.cecpPinyinOf==='function'`，不可用时拼音层整体降级为空。

---

## 2. 现有 UI 挂载点调研

### 2.1 「投影模式」按钮挂在哪、叫什么

挂载点 `#ml-detail-actions`（`musiclib.js:293-296`）当前是三个圆角钮：
```html
<div id="ml-detail-actions">
  <button id="ml-detail-service"  class="ml-detail-action" ...>✓<span>本堂</span></button>
  <button id="ml-detail-favorite" class="ml-detail-action" ...>♥</button>
  <button id="ml-detail-more"     class="ml-detail-action" ...>⋯</button>
</div>
```
`.ml-detail-action` 样式（`musiclib.css:935` 及 `:1217`/`:5943` 的 `!important` 覆盖版）：圆角 `999px`、`min 40×40`、`var(--surface)` 底、`var(--text-secondary)` 字，`.is-active` 时用 `var(--accent)`。

**建议**：新增按钮沿用同一套类，**放在「本堂」和「收藏」之间或「更多」之前**：
```html
<button id="ml-detail-projection" class="ml-detail-action" type="button"
        aria-label="投影模式">${icon('cast'/*或 presentation*/,16)}<span>投影</span></button>
```
- 图标：`icon()` 函数（musiclib 已有内联 SVG 图标系统）里选/加一个投影/幕布类图标（如 tabler 的 `presentation`/`device-tv`/`cast`）。
- **不支持投影的歌**（见 4.2）给按钮加 `disabled` + `.is-disabled`，`aria-disabled="true"`，点/hover 提示「该曲目暂不支持投影」。
- 若担心操作区拥挤，备选是**收进「更多」菜单**（`#ml-detail-more`）里作为一项；建议先做成独立按钮，符合"高频功能一眼可见"。

### 2.2 移调状态 curKey / setCurrentKey 如何联动

- 当前调是 `openDetail()` 闭包内的局部变量 `curKey`（`musiclib.js:7191`），初值 `songState.lastKey || s.origKey || 'C'`；是否用降号 `preferFlat`（`:7192`）。
- 用户改调走 `setCurrentKey(nextKey, flatMode)`（`musiclib.js:7405`）：更新 `curKey`、写 `setSongState(s.id,{lastKey})`、重画按钮、**调用 `renderScore()` 重渲染**。
- `renderScore()`（`:7568`）里 `const info=calcCapo(curKey, s.origKey||'C'), st=info.st, useFlat=preferFlat;`，和弦经 `trChordEx(seg.chord, st, useFlat, trChord)` 得到移调后文字。

**投影联动方案**：投影内容和 `renderScore` 用**同一份 `st`/`useFlat` 计算**。因为 `curKey` 是闭包私有变量，最干净的做法是——在 `setCurrentKey`（或 `renderScore` 末尾）里，**当投影会话处于激活状态时，广播一条 `key` 变更消息**（携带 `curKey`/`st`/`useFlat` 或直接携带算好的分层数据），投影窗口收到后重渲染。这样投影模式本身不需要移调 UI，跟随详情页即可（阶段三再实现，阶段一只需确认这个读取/联动点可行——**可行**）。

---

## 3. 双窗口通信方案设计

现状：`musiclib.js` **没有**用过 `BroadcastChannel`，`window.open` 仅用于打开外链（`:853-854`）。全新引入无冲突。

### 3.1 频道与消息格式

- **主通道**：`const ch = new BroadcastChannel('cecp:musiclib:projection:v1')`，控制台与投影窗口各建一个同名频道即可互通（同源同浏览器）。
- **消息信封**（统一结构，带类型 + 单调递增版本号，防乱序）：
```js
{
  t: 'state' | 'page' | 'toggles' | 'key' | 'appearance' | 'hello' | 'bye' | 'ping' | 'pong',
  v: 12,                 // 递增版本，接收端只接受更大的 v
  songId: 'zhaodaowo',
  payload: { ... }       // 见下
}
```
  - `hello`（投影窗口就绪时发）→ 控制台回一条**全量 `state`**（当前 songId、四开关、页码、总页数、curKey、外观设置），让投影窗口对齐初始状态。
  - `toggles`：`payload={chord,jianpu,lyric,pinyin}`（四个布尔）。
  - `page`：`payload={page, total}`。
  - `key`：`payload={curKey, st, useFlat}`（或直接推算好的分层分页数据）。
  - `appearance`：`payload={fontScale, bg, textColors, ...}`（阶段四用）。
  - `ping`/`pong`：心跳（见 3.3 生死感知）。
  - `bye`：任一端关闭前发一条，通知对端清理。

### 3.2 兼容性兜底（BroadcastChannel 不可用时）

`BroadcastChannel` 覆盖率已很高（Safari 15.4+、iOS 15.4+、所有现代 Chromium/Firefox）。兜底两层：
1. **`localStorage` `storage` 事件**：把上面的信封 `JSON.stringify` 写入 `localStorage['cecp:musiclib:projection:bus:v1']`（每次带新 `v`/时间戳保证值变化触发事件），另一端 `window.addEventListener('storage', ...)` 收。**注意**：`storage` 事件**只在其他同源窗口触发**（写入方自身不触发），正好符合跨窗口同步语义。
2. **`window.open()` 返回的 `winRef` + `postMessage`**：控制台持有投影窗口引用 `projWin`，可 `projWin.postMessage(msg, location.origin)` 直达；投影窗口用 `window.opener?.postMessage(...)` 回传。作为 BroadcastChannel + storage 都不行时的最后兜底，也可作为主通道（更"点对点"、无需清理频道），BroadcastChannel 作增强。

**建议实现顺序**：抽象一个 `projectionBus`（send/onMessage 接口），内部优先 BroadcastChannel，`typeof BroadcastChannel==='undefined'` 时降级 storage 事件；`postMessage` 作为握手/兜底。上层业务只调 `bus.send()` / `bus.on()`，不关心底层。

### 3.3 关闭/失联的互相感知与清理

- **投影窗口被关闭 → 控制台感知**：
  - 控制台持有 `projWin`（`window.open` 返回值），定时 `if(projWin && projWin.closed){ ...恢复"进入投影"按钮... }` 轮询（每 1–2s，注意后台标签 `setInterval` 会被节流，用 `visibilitychange` 唤醒时立即补检一次——这是本仓库 `cecp-intercom` 踩过的后台定时器节流坑，同理处理）。
  - 或投影窗口 `beforeunload` 时发 `bye`，控制台收到即恢复。两者都做，互为兜底。
- **控制台/详情页关闭 → 投影窗口感知**：控制台在 `closeDetail` / `beforeunload` 发 `bye`；投影窗口收到后**默认不自动关闭**（避免误触中断投影），只在自身画面角落提示「控制台已断开，翻页/开关暂停同步」。
- **是否自动关投影窗口**：建议**不自动关**。控制台面板里显示「投影窗口运行中」状态与一个「关闭投影窗口」显式按钮（`projWin.close()`）。阶段二会实现并在面板提示。

---

## 4. 分页与渲染方案设计

### 4.1 四层 → "每页 N 行"的转换结构

**输入**：`song.sections`（+ 当前 `st`/`useFlat` 用于和弦移调 + 四开关状态）。
**中间结构**（把每一「行」拍平成四层并列的 `ProjLine`）：
```js
ProjLine = {
  sectionName: '主歌',        // 该行所属段名（每段首行才显示，见排版）
  bold: false,                // 来自 line.b
  cells: [                    // 逐段（seg）并列，保持列对齐
    { chord:'Bb', n:'3,_ 2,_', lyric:'看着', pinyin:['kan','zhe'] }, ...
  ]
}
```
- `chord`：`seg.chord` 经 `trChordEx(seg.chord, st, useFlat, trChord)`（无和弦=空）。
- `n`：原样 `seg.n`（交给 `renderNStr` 渲染；简谱不移调）。
- `lyric`（多段，**同时显示**）：`{lyric1..4}` 全部保留（存在几段就渲染几段，各段一行，对应 `.p-lyric`/`.p-lyric2/3/4`），**不做"切第几段"**。← 已定 (原开放问题 #9)
- `pinyin`（**每段各配**）：对**每一段歌词**（有 lyric1..4 就各算一份）逐字 `cecpPinyinOf`，拼音行紧贴对应歌词行上方、逐字对位（占位/非中文按 1.3 规则）。即"拼音开"时，每段歌词都带自己的拼音行。← 已定

**分页 = 按可用高度自动算每页行数（不再写死 4 行）** ← 已定 (原开放问题 #7/#9)
因为「4 段歌词全显示 + 和弦 + 简谱 + 拼音」时单行很高、只显示「歌词」时单行很矮，固定行数会一会儿溢出一会儿留白。所以每页行数是**测量后自动算**的：

```js
// 1) 先按当前四开关 + 段数 + 字号，把每种 ProjLine 试渲染量出它的实际像素高度
// 2) 可用投影高度 = 画布高度(由所选比例决定) - 上下留白 - 段名等固定占位
// 3) 贪心装箱：逐行累加高度，超过可用高度就翻到下一页（尽量不把同一 section 首行与内容拆散）
function paginateByHeight(projLines, availH, measure){
  const pages=[]; let cur=[], h=0;
  for(const ln of projLines){
    const lh=measure(ln);                 // 该行实测高度（含已开启的层）
    if(cur.length && h+lh>availH){ pages.push(cur); cur=[]; h=0; }
    cur.push(ln); h+=lh;
  }
  if(cur.length) pages.push(cur);
  return pages;                            // pages.length=总页数
}
```
- `availH` 来自**所选投影比例**：投影画布固定成一个 `4:3` 或 `16:9` 的居中舞台（letterbox，剩余用背景色/图填充），高度按比例 + 字号推算。比例切换或字号变化都要**重新分页**。
- 影响每行高度的变量：四开关组合、实际有几段歌词（有的歌只有 1 段、有的 4 段）、字号滑块。任一变化 → 重新 `measure` + `paginateByHeight` + 广播新总页数给投影窗口。
- **按开关只渲染选中层**：`chord`/`n`/`pinyin`/`lyric(多段)` 各层用开关布尔控制是否 append。关掉的层**不渲染该层 DOM**（而非 `visibility:hidden`），确保行高真正收缩、装箱准确。

**举例**（`songs/nengbuneng.json`，只开「简谱+歌词」、16:9、中等字号）：6 个数据行，实测每行较矮 → 可能一页装 4–5 行；换成「四层全开 + 4 段歌词」后单行变高 → 同样内容自动变成每页 2–3 行、总页数增加。

**渲染函数复用建议（留给阶段三定稿）**：`renderScore()` 里逐段建 `.p-chord`/`renderNStr`/`.p-lyric` 的那段（`musiclib.js:7595-7619`）是现成可复用的核心。可以**抽取一个 `buildProjCell(cell, toggles, {st,useFlat})`**，内部复用 `trChordEx`/`setChordContentEx`/`chordChipDecorate`/`renderNStr`/`setLyricContentEx`，只是按开关裁剪层、并新增拼音层。这样投影与详情页视觉一致、且共享移调/简谱/歌词的所有既有处理（`{sp}`、`ㅤ`、连音、跳房子等）。**不建议**从零写一套渲染。

### 4.2 图片曲谱 / 无结构化数据的歌怎么办

- 判定函数现成：**`hasRenderableScore(song)`**（`musiclib.js:2345`）= `song.sections` 里存在含 `lines` 的段。为 `false` 即"只有图片曲谱/无结构谱"。
- `normalizeScoreImages(song)`（`:2348`）收集 `scoreImg`等字段的图片 URL。
- **投影模式对这类歌**：`hasRenderableScore(song)===false` 时，「投影模式」按钮**置灰 + 提示「该曲目暂不支持投影」**（因为投影靠的是结构化四层数据，图片谱无法拆层/换背景/移调）。
  - 备选（不在本期做，仅记录）：将来可支持"图片谱直接全屏投影"，但那是另一种投影形态，先不混入。
- **补充**：即便 `hasRenderableScore` 为真，也存在「有简谱但整首无歌词」（纯前奏/器乐，`lyric` 全是 `ㅤ`）——此时开「歌词/拼音」层会是空行，属正常，阶段五处理「不足 N 行/空行」的排版即可。

---

## 5. 外观自定义的存储方式（为阶段四铺垫，仅调研）

### 5.1 现有主题/设置的存取约定

- 主题：`index.html:29` `localStorage.getItem("cecp:musiclib:theme")`（值 `light`/`dark`/`system`），解析后写 `data-theme` / `data-resolved-theme` 到 `<html>`；深浅样式靠 `html[data-resolved-theme="dark"]` 选择器。
- 键名统一前缀 **`cecp:musiclib:<feature>:v<n>`**，实例（`musiclib.js:40-42`、`5511`、`7248`）：
  - `cecp:musiclib:theme`
  - `cecp:musiclib:song-state:v1`（`lastKey` 等）
  - `cecp:musiclib:search-history:v1`
  - `cecp:musiclib:audio-pitch:v1`
  - `cecp:musiclib:view-mode:v1`

**投影设置建议键名**（沿用同风格）：
- `cecp:musiclib:projection:settings:v1` —— 一个 JSON，含四开关、**投影比例(`4:3`/`16:9`)**、字号/缩放、背景类型(纯色/图片)、纯色值、四层文字颜色、描边开关、当前主题预设名。（注意：每页行数**不存**，它是按比例+字号+层数实时算出来的，见 4.1。）
- `cecp:musiclib:projection:bus:v1` —— 3.2 里 storage 兜底通道用。
- 背景**图片**不放这里（见 5.2）。

### 5.2 用户上传的背景图存哪

- **不要用 localStorage**：localStorage 单域约 5MB，且是同步字符串存储，塞 base64 大图会拖慢主线程、易超限。
- **推荐 IndexedDB**：新建一个库（如 `cecp-musiclib-projection`）存背景图。可存 **`Blob`**（比 base64 省 ~33% 体积、且 IndexedDB 原生支持 Blob），读出时 `URL.createObjectURL(blob)` 用于投影窗口背景，用完 `revokeObjectURL`。若要跨窗口共享，投影窗口可自行按 key 从 IndexedDB 读同一 Blob（IndexedDB 同源跨窗口可读），或通过 bus 传递 blob（BroadcastChannel 可结构化克隆传 Blob）。
- **settings JSON 里只存背景图的"引用"**（如 `bgImageKey: 'user-bg-1'` + `bgType:'image'`），真身在 IndexedDB。
- 备选（小图/临时）：`sessionStorage` 存 objectURL 不可靠（URL 跨会话失效），不采用。

---

## 6. 风险与开放问题清单（待决策/潜在坑）

**浏览器能力**
1. **Fullscreen API**：必须由用户手势触发，不能自动全屏。iOS Safari 对 `<iframe>`/非视频元素的全屏支持历史上很差（iPhone 上 `requestFullscreen` 基本不可用，iPad 较好）。→ 投影窗口要有"进入全屏"按钮 + 不支持时降级为"请手动全屏/隐藏浏览器 UI"提示。
2. **Wake Lock API**：`navigator.wakeLock.request('screen')` 需 HTTPS + 用户手势 + 页面可见；iOS 16.4+ 才支持，旧 iOS/部分浏览器不支持。→ 不支持时提示用户手动调长系统息屏时间，不能抛错崩溃。切后台会自动释放，`visibilitychange` 回前台要重新申请。
3. **`window.open` 弹窗限制**：必须在用户点击的同步调用栈里 open，否则被拦。iOS Safari 里 `window.open` 常常只能开**新标签页**而非可自由拖动的窗口，**移动端基本无法"把窗口拖到第二块屏"**——这套"双屏拖窗口"范式天然是**桌面(Mac/Windows) + 外接显示器/投影仪/AirPlay/HDMI** 的用法。→ 需向同工说明：手机当控制台可以，但"第二屏"要靠桌面浏览器多显示器，或手机投屏镜像（镜像模式下两屏内容相同，双窗口意义不大）。

**通信**
4. ✅ **已定：本期只做"同机双窗口 + 第二显示器"**（跟 PPT 投屏一样，一屏当控制台、一屏当投影输出）。BroadcastChannel 同源同浏览器足够；不做跨设备（跨设备要另上服务端，属另一期）。
5. **后台标签定时器节流**：投影窗口/控制台切到后台时 `setInterval` 心跳/`closed` 轮询会被限流（本仓库 cecp-intercom 已踩过）。→ 心跳 + `visibilitychange` 回前台补检。

**渲染/数据**
6. **多音字拼音不准**：`cecpPinyinOf` 单读音，「长/行/和/降」等会标错。→ 接受误差；是否需要人工覆盖表（`song` 里加可选 `pinyinOverride`）请你决策，建议本期不做。
7. ✅ **已定：每页行数按"投影比例(4:3/16:9) + 字号 + 层数/歌词段数"自动计算**（见 4.1），不写死、不手动设；比例或字号一变就重新分页。
8. **超长行**：一行段数很多时缩放会把字压得很小。`renderScore` 用的是整体 `transform:scale` 适配（`fitRows`），投影可复用"按宽缩放"，但要单独定"投影可读下限字号"，超限则换行/分页而非无限缩小（阶段五）。
9. ✅ **已定：4 段歌词全部同时显示**（存在几段显示几段，各段一行），不做"切第几段"。**拼音每段各配**（每段歌词上方都有自己的拼音行）。因此"四层全开 + 多段"时单行很高，正是 #7 里"每页行数自动算"要吸收的变量。

**投影窗口的技术形态**
10. ✅ **已定：独立 `projection.html`，并纳入 PWA（离线可用）。**
    - **独立页面**：新建 `musiclib/projection.html`，专做全屏大字投影排版，不复用详情页/首页小屏 UI。渲染逻辑复用引擎——`<script src="./musiclib.js">` 后调用其暴露的构建函数（把 `buildProjCell`/`renderNStr`/分层分页函数挂到已有的 `window.__CECP_MUSICLIB_ENGINE__` 上，见 `musiclib.js:7708`），从而共享移调/简谱/`{sp}`/`ㅤ` 等全部既有处理，不重写。
    - **纳入 PWA 的具体改动**（阶段二/四落地时做）：
      1. `sw.js` 的 `APP_SHELL`（`sw.js:3`）里**加入** `./projection.html` 及其独立 CSS/JS（若拆），并**升级 `CACHE_NAME`**（如 `...-v31-projection`）触发缓存刷新——否则老 SW 不缓存新页、离线打不开。
      2. `manifest.webmanifest` 的 `scope` 是 `./`（已覆盖 `projection.html`），无需改 scope；投影页属同一 PWA。是否单独给投影页加一个 `shortcuts` 入口可选，不必须。
      3. 投影窗口用 `window.open('./projection.html?...')` 打开（同源、被 SW 接管，离线也能开）。装成 standalone PWA 后，`window.open` 通常仍会弹独立浏览器窗口/标签，正好可拖到第二屏。
    - 好处：教会现场常无稳定网络，投影页随主 App 一起离线可用；且比 `index.html?mode=projection` 干净（不连带初始化整个搜索/首页 App）。

---

## 7. 阶段一结论

- 数据结构、移调联动点、图片谱判定、拼音能力、localStorage/IndexedDB 存储约定、双窗口通信可行性——**均已摸清，无阻塞**。
- **已拍板的决策**：
  - #4 本期只做**同机双窗口 + 第二显示器**（PPT 投屏式），不跨设备。
  - #9 **4 段歌词全部同时显示，且每段各配拼音**（拼音行紧贴各自歌词行上方）。
  - #7 **每页行数按"比例 + 字号 + 层数/段数"自动计算**，不写死。
  - 新增 **投影比例可选 4:3 / 16:9**（letterbox 居中舞台，存进 `projection:settings`，切换即重排分页）。
  - #10 **独立 `projection.html`，纳入 PWA 离线可用**（`sw.js` 加进 `APP_SHELL` + 升 `CACHE_NAME`）。
- 仅剩 #6（多音字拼音覆盖表）建议本期不做，采用现成 `cecpPinyinOf` 的单读音误差。

---

## 8. 阶段二后追加决策（投影页改「pptlib 式全屏演示」）

用户看过阶段二占位后给的新方向：

- ✅ **保留独立投影窗口（双屏）**：架构不变——这块屏当控制台、`window.open` 的 `projection.html` 当投影输出，跨窗口 BroadcastChannel 通信保留。
- ✅ **投影页画面改成 pptlib 式全屏演示**（参考 `pptlib/` 的 `#presenter`）：全屏大字幻灯 + 极简 chrome + 键盘/点击翻页 + `documentElement.requestFullscreen()`。参考结构：`#presenter-stage`(舞台) / `.presenter-toolbar`(退出/上一页/计数/下一页/黑屏) / `#presenter-timeline`(缩略图) / `#presenter-black`(黑屏)。
- ✅ **渲染 100% 复用移调页 `renderScore` 的产物**（`renderNStr` 的连音/附点/三连音/跳房子、段落标记药丸、`{sp}`/`ㅤ` 补位、`CECP-CHORD-STYLE` 和弦配色、移调）。**不采用 pptlib 自己那套简化 `score-renderer.js`**（它缺连音弧/跳房子/段标等）。
- ✅ **四开关做成"演示时可呼出的工具栏"**（`四种模式在投屏情况下也能打开`）：投影进行中仍可切和弦/简谱/歌词/拼音——控制台实时联动（阶段二已通），投影页工具栏也放一份可选。
- ✅ **投影页不再显示"和弦开 简谱开 歌词开 拼音开"这类状态文字**（阶段二占位里的那行删掉）。

### 8.1 跨窗口渲染复用方案（阶段三核心，待实现）

难点：`projection.html` 是独立页、不加载 `musiclib.js`，却要出 `renderScore` 同款画面。选定方案（**控制台渲染 → 传 HTML → 投影页注入**）：

1. **控制台侧**：抽 `buildProjRow(line,{st,useFlat,toggles})`，逐行复用 `renderScore` 内那段（`trChordEx`/`setChordContentEx`/`chordChipDecorate`/`renderNStr`/`setLyricContentEx` + 新增拼音层），产出真实 DOM；按开关裁层、按高度分页；把**当前页的 `outerHTML`** + 元信息（歌名/段名/`1=调`/页码/总页数）经 bus 推给投影页。
2. **投影页侧**：`<link rel="stylesheet" href="./musiclib.css">` + 用 `<div id="music-library">` 包住注入区——这样 `#music-library .p-n/.jp-*/.p-chord/.p-lyric/CECP-CHORD-STYLE` 等**作用域样式与主题变量自动命中**，无需复制 CSS、零漂移。投影页只做：注入 HTML、pptlib 式全屏 chrome、按比例缩放(仿 `fitRows`/`fitPresenterCanvas`)、键盘/点击/滑动翻页（翻页回推 bus 让控制台同步）。
3. 好处：渲染逻辑与 CSS 都单一真源（`musiclib.js` + `musiclib.css`），投影页保持"哑显示"，移调/开关/翻页联动只需控制台重渲染再推一次 HTML。

### 8.2 阶段划分微调

- 原「阶段三=真实渲染」→ 现含：`buildProjRow` 复用 + 跨窗口 HTML 推送 + 投影页 pptlib 式壳（含全屏/键盘翻页）。**已完成并验证。**
- 原「阶段四=投影体验+外观」→ 保留：Wake Lock、背景图/颜色/字号、设置持久化、4:3/16:9。

---

## 9. 阶段三后需求修正 v2（路线调整，5 点）

用户实测阶段三后提出 5 点，改变技术路线：

1. **自动上副屏**：投影输出必须**自动全屏到第二块屏**（外接显示器/投影仪），不靠手动拖窗。用 **Window Management API `window.getScreenDetails()`** 检测显示器，授权后自动 `window.open` 定位 + 全屏到副屏；**单屏降级**为当前窗口内全屏。
2. **控制按钮只在屏1**：投影输出（屏2）**纯内容、零控制按钮**。所有开关/翻页/16:9/黑屏/全屏移到控制端（屏1）。
3. **新增 App 级投影入口**：类 pptlib 整体进入演示模式，控制端可**浏览/选歌投影**，不限当前这一首。
4. **单曲入口保留**：详情页「投影」按钮仍在；两入口并存、各自独立。
5. **控制端要有 slide 缩略图/预览列表**：切歌/跳页时看得到内容概览，不只页码数字。

### 9.1 架构重构：分页从投影页移回控制端（#2 + #5 的必然结果）

投影页要纯净（#2）又要控制端出缩略图（#5）→ **分页与渲染全部在控制端做**，投影页降为哑显示：

- **控制端（屏1 = 演示台）**：数据 + 渲染 + **分页**（按选定 16:9/4:3 虚拟画布 + 字号算每页行数）+ 当前页索引 + 全部控制 + **缩略图列表** + **选歌浏览**。
- **控制端 → 投影**：只发「**当前页 HTML**」(+ `chordCss` 一次 + `aspect` 定信箱形状 + `blank` 黑屏标志)。切页/开关/移调/换歌 → 控制端重算并重发当前页。
- **投影页（屏2）**：纯显示 = 收到页 HTML → 按视口缩放填充（信箱对齐 aspect）→ 显示；**无控制、无导航、无分页**；黑屏由控制端 `blank` 标志控制。
- **缩略图**：控制端已持有分页，逐页小比例渲染成缩略卡，点击跳页（= 让投影跳到该页）。

> 这与阶段三"投影页自己分页 + 带工具栏"相反：阶段三的 `projection.html` 工具栏/键盘导航/分页要**拆掉**，导航逻辑上移控制端。

### 9.2 自动副屏（#1）

```js
const sd  = await window.getScreenDetails();            // 需一次权限授权(window-management)
const ext = sd.screens.find(s => !s.isPrimary) || sd.currentScreen;
const feat= `left=${ext.availLeft},top=${ext.availTop},width=${ext.availWidth},height=${ext.availHeight}`;
const win = window.open('./projection.html', 'cecpProjection', feat);   // 定位到副屏
// 投影页 onload 尝试 el.requestFullscreen({ screen: ext })  (best-effort)
```

- **单屏降级**：无副屏 → 当前窗口/新标签内全屏。
- **坑**：全屏需用户激活，跨窗口激活不稳定；`getScreenDetails` 需权限且仅 Chromium 系支持（Safari 无）。Safari/不支持时降级为"打开窗口 + 提示手动全屏/拖到副屏"（保留旧路径兜底）。**以真机多屏实测为准**。

### 9.3 两入口（#3 + #4）共用一套控制端

- **单曲入口**：详情页 `#ml-detail-projection`（现有）→ 控制端，已选中当前歌。
- **App 级入口**：侧栏导航新增「投影」项 → 控制端（演示台），起始在选歌浏览。
- 二者**共用同一套控制端 UI 与同一个投影输出窗口**，仅初始状态不同。

### 9.4 阶段重排

- **阶段 3.5**：分页移控制端 + 投影页纯净化（去工具栏/导航）+ 控制端接管全部控制 + 控制端出「当前页预览」+ Window Management API 自动副屏（含单屏降级）。
- **阶段 3.6**：控制端**缩略图列表**（全页概览、点击跳页）+ **App 级入口 + 选歌浏览**。
- 阶段四/五（Wake Lock、外观自定义、持久化、边界、文档）顺延。

### 9.5 已定：App 级 = **Setlist 歌单**

控制端先把多首歌拉进「本堂歌单」排好序，再从头逐首/逐页演示，**跨首连续翻页**（像 PPT 播放列表）。
- 单曲入口 = 往一个"临时单曲歌单"里放这一首后进入同一演示台（复用 setlist 演示引擎，避免两套逻辑）。
- 歌单可增删/排序；可持久化到 `cecp:musiclib:projection:setlist:v1`（阶段 3.6）。
- 分页跨首：每首歌的页顺序拼成一条总序列，翻页在总序列上走。
