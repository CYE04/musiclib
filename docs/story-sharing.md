# Instagram Story 分享

## 实现方案

- 保留现有 React 宿主和 musiclib 播放器，只增加独立 `story-share.js` 面板和 `story-card.js` 画布渲染器。
- 复用歌曲数据、封面、LRC 解析和谱面歌词。预览与导出使用同一张 1080 × 1920 Canvas，避免排版偏差。
- 歌词默认三行，可选最多八行；五种背景、左右/居中排版。封面提供简约与装饰播放器两版。歌词卡不带播放按钮或假链接。
- 有封面时默认使用「封面延展」：将实际封面的图像延伸到 9:16 画面，轻微柔化，保留云层、纹理和配色，叠加对比度遮罩保证歌词可读；没有封面时使用日落渐变。
- 编辑后预先准备 PNG File，点击分享时直接调用系统分享，以保留 iOS 的用户手势。失败或不支持时提供下载、图片预览与复制链接。
- `/s/<id>/` 使用构建时生成的静态歌曲页面输出 OG 元信息，爬虫不依赖客户端脚本；打开后沿用既有歌曲路由。尾部斜杠直接指向静态目录，兼容本地预览和静态部署。无额外服务或付费 API。
- 图片加载使用匿名 CORS 和超时，失败时用渐变封面；字体使用设备上的中文衬线字体与系统字体，不使用带拼音注音的谱面字体。

## 执行与验证

- [x] 独立卡片渲染器及背景、文字适配。
- [x] 分享面板、详情和播放器入口、歌词选择。
- [x] PNG 保存、Web Share、复制链接、失败降级。
- [x] 静态 OG 页面与构建集成：当前生成 78 首歌曲页面，OG 图片使用歌曲现有专辑封面。
- [x] 后台音频中断恢复与媒体控制：处理 suspended/interrupted，恢复前台仍在播放的音频，不重启已暂停的歌曲。
- [x] 手机 390px、桌面 1280px 浏览器检查：导出尺寸、中意歌词、缺失内容、返回、异步状态、分享/剪贴板降级及真实音频连续性。
- [x] 23 项单元测试、原工具箱返回行为回归测试、生产构建、歌曲静态 OG 和真实封面检查通过。

## 修改文件

| 文件 | 职责 |
| --- | --- |
| `public/story-card.js` | 共用 Canvas 预览与导出，五种背景及封面排版 |
| `public/story-share.js`、`public/story-share.css` | 分享编辑面板、歌词选择、系统分享、PNG 下载及链接复制 |
| `public/musiclib.js` | 分享入口、复用歌词解析、后台音频恢复及系统媒体控制 |
| `src/legacy-loader.js`、`index.html` | 按现有机制加载脚本及样式 |
| `scripts/song-share-pages.mjs`、`scripts/song-share-catalog.json` | 构建时歌曲 OG 页面与独立仓库构建目录快照 |
| `vite.config.js`、`dist/` | OG 构建、PWA 预缓存及更新发布产物 |
| `tests/story-card.test.mjs`、`tests/song-share-pages.test.mjs`、`tests/background-playback.test.mjs`、`tests/story-share.e2e.mjs` | 功能与回归验证 |

增删歌曲或修改歌曲 OG 内容后重新构建。使用静态构建，无需新增后端。尚未推送或部署。

真机 iOS / Android 的锁屏长时间播放、Instagram 分享目的地和链接贴纸需在设备上确认。浏览器无法自动添加 Instagram 链接贴纸。

参考：[AudioContext interrupted 状态](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)、[Web Share API 用户手势要求](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)、[Cloudflare 静态目录尾斜杠](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)。
