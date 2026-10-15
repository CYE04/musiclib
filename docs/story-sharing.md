# 诗歌分享

## 实现方案

- 保留现有 React 宿主和 musiclib 播放器，只增加独立 `story-share.js` 面板和 `story-card.js` 画布渲染器。
- 复用歌曲数据、封面、LRC 解析和谱面歌词。预览与导出使用同一张 1080 × 1920 Canvas，避免排版偏差。
- 歌词默认三行，可选最多八行；五种背景、左右/居中排版。封面提供简约与装饰播放器两版。歌词卡不带播放按钮或假链接。
- 有封面时默认使用「封面延展」：将实际封面的图像延伸到 9:16 画面，轻微柔化，保留云层、纹理和配色，叠加对比度遮罩保证歌词可读；没有封面时使用日落渐变。
- 面板标题为「分享」。歌词与封面卡片均支持八种字体风格：灵动手写、清瘦行书、文艺宋体、活泼童趣、复古窄体、拉丁手写、经典衬线、简约黑体；可调整字号、行距和字距，歌词另支持偏左、居中。「恢复默认」只重置文字参数，不清除歌词、背景和封面样式。Ma Shan Zheng 与「可画影流体-简」并非同一款字体。
- 新增五款字体来自 Google Fonts 官方仓库，以本地 WOFF2 按需加载，保留完整 OFL，详见 `public/fonts/README.md`。新增字体不加入首屏或安装预缓存；拉丁手写适合意大利语，中文使用衬线降级。加载失败仍能使用设备字体导出。
- 编辑后预先准备 PNG File，点击分享时直接调用系统分享，以保留 iOS 的用户手势。失败或不支持时提供下载、图片预览与复制链接。
- `/s/<id>/` 由现有 Cloudflare Worker 动态读取 GitHub `CYE04/Cecp/main/songs/<id>.json` 并输出 OG 元信息，爬虫不依赖客户端脚本；打开后沿用既有歌曲路由。无需 `dist/s/`、生成脚本、歌曲快照、新服务器或付费 API。
- 系统支持时同时分享 PNG、文字 URL 和 URL 字段；仅支持图片时分享图片并保留复制链接操作。Instagram 是否接收链接由其自身决定，不能自动添加 Story 链接贴纸，也不能让 PNG 内的文字变成可点击链接。
- 图片加载使用匿名 CORS 和超时，失败时用渐变封面；字体使用设备上的中文衬线字体与系统字体，不使用带拼音注音的谱面字体。

## 执行与验证

- [x] 独立卡片渲染器及背景、文字适配。
- [x] 分享面板、详情和播放器入口、歌词选择。
- [x] PNG 保存、Web Share、复制链接、失败降级。
- [x] 动态 OG 分享入口，复用歌曲现有封面，支持未来新增歌曲，无需重新构建分享页面。
- [x] 后台音频中断恢复与媒体控制：处理 suspended/interrupted，恢复前台仍在播放的音频，不重启已暂停的歌曲。
- [x] 手机 390px、桌面 1280px 浏览器检查：导出尺寸、中意歌词、缺失内容、返回、异步状态、分享/剪贴板降级及真实音频连续性。
- [x] 38 项单元测试，覆盖动态元数据、新歌、错误降级、八种字体、按需加载与重试、字距、组合重音字符、文字边界、字号、行距和音频恢复；生产构建通过。

## 修改文件

| 文件 | 职责 |
| --- | --- |
| `public/story-card.js` | 共用 Canvas 预览与导出，五种背景及封面排版 |
| `public/story-share.js`、`public/story-share.css` | 分享编辑面板、歌词选择、系统分享、PNG 下载及链接复制 |
| `public/musiclib.js` | 分享入口、复用歌词解析、后台音频恢复及系统媒体控制 |
| `src/legacy-loader.js`、`index.html` | 按现有机制加载脚本及样式 |
| `share-worker.js`、`wrangler.jsonc` | 现有 Worker 内处理 `/s/*`、动态获取歌曲信息，普通资源沿用静态资产 |
| `public/fonts/` | 本地手写字体及完整开源授权 |
| `vite.config.js`、`dist/` | PWA 预缓存及更新发布产物；不再生成 `s` 目录 |
| `tests/story-card.test.mjs`、`tests/song-share-worker.test.mjs`、`tests/background-playback.test.mjs`、`tests/story-share.e2e.mjs` | 功能与回归验证 |

## 本次更新与以后加歌

本次需一起更新仓库根目录的 `share-worker.js`、`wrangler.jsonc` 及完整 `dist/`（含 `fonts/`）；不能只上传 `dist/`，否则动态分享入口不会生效。旧 `dist/s/` 可删除。尚未推送或部署。

之后按原流程上传歌曲 JSON、封面和歌词即可；分享入口自动读取，不再补 HTML 或维护快照。元数据缓存当前为 5 分钟，社交平台可能另有自己的预览缓存。

`npm run dev` / `npm run preview` 继续预览前端。`npm run dev:worker` 可在本地验证动态 OG；Cloudflare 上仍使用现有 Worker，不创建额外服务。

真机 iOS / Android 的锁屏长时间播放、Instagram 分享目的地和链接贴纸需在设备上确认。浏览器无法自动添加 Instagram 链接贴纸。Web Share 的 `canShare()` 和完成回调只能检查浏览器交付能力，不能证明 Instagram 保留 URL 或已经发布 Story；[W3C 标准允许接收方丢弃、合并分享字段](https://www.w3.org/TR/web-share/#share-targets)。现有流程不增加重复确认，卡片设计不变。

## PWA 熄屏中断排查（2026-10-15）

项目继续使用添加到主屏幕的 PWA，不新增 Capacitor 或原生 App。用户反馈 iOS 和 Android 熄屏后仍能播放一段时间，随后中断；这不是已经解决的状态。

- 线上播放器已包含之前的 AudioSession、MediaSession 和前台恢复补丁，不应重复把这些当作新的解决方案。
- 实测 `https://cecp.it/upload/jiandanhuxi.mp3`：HEAD 返回 200，`Range: bytes=0-1023` 返回 206、1024 字节和正确 Content-Range，支持续传且允许歌库域名 CORS；仅代表这首歌的当次检查，不能据此排除所有网络问题。
- 已复现并修补独立缺陷：直接打开歌曲详情后点播放，原先未设置当前歌曲和锁屏元信息，只有另一条加载播放路径会设置。现在两条入口保持一致，未改自动播放、歌单、变调和速度行为。这不等于已经证明修复熄屏中断。
- 增加有界本机诊断：最近 60 条媒体、页面可见性和 AudioContext 事件；播放进度最多每 15 秒记录一次。不上传、不写持久存储，不收集 URL、访问口令或 Cookie。记录缓冲区、网络状态、媒体错误码、是否暂停、变调和速度，帮助区分缓冲耗尽、系统暂停和 Web Audio 挂起。
- 原调未启用变调处理时仍由原生 `<audio>` 播放，不额外启动 AudioContext，也不通过静音音轨、计时器或强制唤醒绕过系统限制。

### 真机复现与导出

1. 发布最新完整 `dist/` 后，联网重新打开 PWA，播放同一首歌，先保持原调和 100% 速度。
2. 熄屏直到中断；返回后不要刷新或关闭 PWA，以免丢失本次内存日志。
3. 打开播放器的 MP3 练习面板 → 问号帮助 →「保存播放诊断」，把 JSON 文件与机型、系统版本、是否用过变调一起提供。
4. 分别测试 Safari 标签页、iOS 已安装 PWA、Android Chrome 已安装 PWA；记录至少当前整首歌和下一首，以及通知／耳机／其他音频 App 的中断情况。
5. 本机浏览器回归只验证媒体连续性、导出和入口，不等于真实 iOS / Android 锁屏或 Instagram 接收测试。没有真机记录前不标记问题已解决。

诊断入口复用既有帮助提示；提示内按钮只在提示可见时接收点击，普通提示不遮挡页面。开发入口也可通过 `window.__CECP_MUSICLIB_ENGINE__.getPlaybackDiagnostics()` 读取相同报告。

原生方案仅为未来选项：[Capacitor Share](https://capacitorjs.com/docs/apis/share) 是通用系统分享，不保证 Instagram 提供 Spotify 式链接入口；Android Stories 专用接口与 iOS Stories 集成需要另外核对当前 Meta 文档、授权和真机行为。本次 Meta 官方文档未能读取，不将历史 `content_url` / `contentURL` 字段当作可用保证。也不把原生后台音频配置误用于当前 PWA。

参考：[AudioContext interrupted 状态](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)、[Web Share API 用户手势要求](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)、[Cloudflare 静态目录尾斜杠](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)。
