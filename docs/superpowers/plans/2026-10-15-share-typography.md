# Share Typography Implementation Plan

**Goal:** 在已确认的分享范围内增加字体及文字调节，保留现有卡片和手动链接贴纸流程。

**Architecture:** 沿用独立 Canvas 渲染器和原生 dialog。渲染器提供字体目录并按需加载本地字体；面板只传递文字选项，播放器逻辑不变。

**Tech Stack:** 原生 JavaScript、Canvas、FontFace、现有 Vite/PWA、node:test 与 Playwright。

## Global Constraints

- 不重做卡片、不开发原生 App、不增加付费 API；不提交、推送或部署。
- 图片始终为 1080 × 1920 PNG；新字体按需加载；中文与意大利语保留完整字形。
- 只修改 `public/story-card.js`、`public/story-share.js`、`public/story-share.css`、`public/fonts/`、对应测试和文档，以及构建产物。

## Task 1: 字体与字距

- [x] 扩展 `tests/story-card.test.mjs`：八项字体、选择后加载/缓存、失败降级、字距和组合字符边界；先运行确认新增用例失败。
- [x] 添加五款本地 WOFF2 和授权；统一字体目录，替换原单字体加载器；字距同时应用于测量、折行和绘制。
- [x] 运行渲染器测试验证。

## Task 2: 分享面板与视觉校验

- [x] 扩展 `tests/story-share.e2e.mjs`：字体按需加载、滑杆、恢复默认、复制提示、播放连续性和深浅主题布局。
- [x] 字体网格、字距、恢复默认及链接贴纸提示；保留所有既有入口和失败降级。
- [x] 手机与桌面截图检查；38 项单元测试及 390px / 1280px 浏览器检查通过，生产构建完成；差异空白检查与 graphify 同步在交付前执行。
- [x] 更新字体来源和使用说明；未进行真机 Instagram 发布验证，未提交或部署。
