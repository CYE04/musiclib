# 诗歌分享

## 实现方案

- 保留现有 React 宿主和 musiclib 播放器，只增加独立 `story-share.js` 面板和 `story-card.js` 画布渲染器。
- 复用歌曲数据、封面、LRC 解析和谱面歌词。预览与导出使用同一张 1080 × 1920 Canvas，避免排版偏差。
- 歌词默认三行，可选最多八行；五种背景、左右/居中排版。封面提供简约与装饰播放器两版。歌词卡不带播放按钮或假链接。
- 有封面时默认使用「封面延展」：将实际封面的图像延伸到 9:16 画面，轻微柔化，保留云层、纹理和配色，叠加对比度遮罩保证歌词可读；没有封面时使用日落渐变。
- 面板标题为「分享」。歌词与封面卡片均支持手写、衬线、简约字体以及字号、行距调整；歌词另支持偏左、居中。手写字体采用本地 Ma Shan Zheng（SIL OFL 1.1），与「可画影流体-简」并非同一款字体。
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
- [x] 31 项单元测试，覆盖动态元数据、新歌、错误降级、无效路径、手写字体降级、字号、行距和音频恢复；生产构建与 Cloudflare 本地打包通过。

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

真机 iOS / Android 的锁屏长时间播放、Instagram 分享目的地和链接贴纸需在设备上确认。浏览器无法自动添加 Instagram 链接贴纸。

参考：[AudioContext interrupted 状态](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)、[Web Share API 用户手势要求](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)、[Cloudflare 静态目录尾斜杠](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)。
