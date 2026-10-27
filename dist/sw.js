/* CACHE_NAME 与 APP_SHELL 由 vite.config.js 的 precacheManifest 插件在构建期改写。
   下面这份是 dev/兜底值，真正上线的内容看 dist/sw.js。
   桶名带内容指纹 —— 任何资源变化都会换桶，activate 里的清理逻辑随即删掉旧桶，
   老用户不会卡在旧壳上，也不用再记得手动 bump 版本号。 */
/* CECP-PRECACHE-BEGIN */
const CACHE_NAME = "cecp-musiclib-pwa-ae31a74e24";
const APP_SHELL = [
  "./?key=cecp2026",
  "./assets/index-DsNBVaIK.js",
  "./bible-service.js?v=20260711-justify-rows",
  "./cecp-olive-logo.svg",
  "./fonts/MaShanZheng-Regular.ttf",
  "./gsap.min.js?v=20260711-justify-rows",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.ico",
  "./icons/icon-192-maskable.png",
  "./icons/icon-192.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-512.png",
  "./icons/musiclib-olive-v1-192-maskable.png",
  "./icons/musiclib-olive-v1-192.png",
  "./icons/musiclib-olive-v1-512-maskable.png",
  "./icons/musiclib-olive-v1-512.png",
  "./icons/musiclib-olive-v1-apple-touch.png",
  "./icons/musiclib-olive-v1-favicon.ico",
  "./index.html",
  "./manifest.webmanifest",
  "./musiclib-tools.css?v=20261014-console",
  "./musiclib-tools.js?v=20261014-console",
  "./musiclib.css?v=20261027-score-flow",
  "./musiclib.js?v=20261027-score-flow",
  "./olive-fellowship-logo.png",
  "./pinyin-kai.woff2",
  "./pinyin-pro.js",
  "./projection.html",
  "./soundtouch-processor.js",
  "./story-card.js?v=20261015-story",
  "./story-share.css?v=20261015-story",
  "./story-share.js?v=20261015-story"
];
/* CECP-PRECACHE-END */
const DATA_CACHE = "cecp-musiclib-data-v1";
// 编辑器只在使用时缓存；升级歌库壳时保留已准备的编辑器和图鉴。
const EDITOR_CACHE = "cecp-musiclib-editor-v1";

/* ignoreVary：预缓存是用 cache.addAll(路径字符串) 存的，请求里没有 Origin/Accept 这些头；
   而真实请求带（Vite 的模块脚本有 crossorigin 属性会发 Origin，GitHub API 响应带 Vary）。
   不加这个，服务器只要回一个 Vary，离线时预缓存就永远命中不了 —— 白屏且无报错。 */
const MATCH_OPTS = { ignoreVary: true };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE && key !== EDITOR_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 歌曲数据（跨域 GitHub）：network-first，在线永远最新，离线回退到上次缓存。
  // 缓存 key 去掉查询串（loadSongs 的 ?t= 时间戳），保证离线能命中。
  const isSongList =
    url.hostname === "api.github.com" &&
    /^\/repos\/CYE04\/songs\/contents\/?$/.test(url.pathname);
  const isSongJson =
    url.hostname === "raw.githubusercontent.com" &&
    /^\/CYE04\/songs\/main\/[^/]+\.json$/i.test(url.pathname);
  if (isSongList || isSongJson) {
    const keyUrl = url.origin + url.pathname;
    event.respondWith(
      fetch(request)
        .then((response) => {
          // ⚠️ 403/429/5xx 不是网络异常，不会自己掉进下面的 .catch()。
          // 不主动 throw 的话，GitHub 未认证 API 限流（60 次/小时/IP）返回的 403
          // 会原样穿透给页面 —— 明明 DATA_CACHE 里躺着完整歌库，用户却看到"载入失败"，
          // 而他唯一会做的动作（再刷一次）只会再烧一次配额。
          // 教会同一个 wifi 出口，主日早上很容易撞到这个。
          if (!response || !response.ok) throw new Error("bad response " + (response && response.status));
          const copy = response.clone();
          caches
            .open(DATA_CACHE)
            .then((cache) => cache.put(keyUrl, copy))
            .catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .open(DATA_CACHE)
            .then((cache) => cache.match(keyUrl, MATCH_OPTS))
            .then((match) => {
              if (!match) return Response.error();
              // Distinguish an offline copy from a successfully fetched new version.
              const fallback = new Response(match.body, { status: match.status, statusText: match.statusText, headers: match.headers });
              fallback.headers.set('X-CECP-Song-Cache', 'fallback');
              return fallback;
            })
        )
    );
    return;
  }

  if (url.origin !== location.origin) return;

  const editorBase = new URL('musictool/', self.registration.scope);
  if (url.pathname.startsWith(editorBase.pathname)) {
    const cacheUrl = new URL(url.pathname === editorBase.pathname ? 'index.html' : url.pathname, editorBase);
    // 去掉 tool 查询串和图鉴渲染器版本串，两个编辑器共享同一份离线页面。
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            // 缓存失败不应挡住在线编辑器；离线准备状态由包装页单独反馈。
            event.waitUntil(caches.open(EDITOR_CACHE)
              .then((cache) => cache.put(cacheUrl.href, copy)).catch(() => {}));
          }
          return response;
        })
        .catch(async () => {
          let hit;
          try {
            const cache = await caches.open(EDITOR_CACHE);
            hit = await cache.match(cacheUrl.href, MATCH_OPTS);
          } catch (_) { /* 存储不可用时仍给出明确的离线准备说明。 */ }
          if (hit) return hit;
          if (request.mode !== 'navigate') return Response.error();
          const libraryUrl = new URL('?key=cecp2026', self.registration.scope).href;
          return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>编辑器尚未准备离线使用</title><style>body{margin:0;padding:40px 24px;background:#F4EFE7;color:#241C17;font:16px/1.7 system-ui,sans-serif}main{max-width:560px;margin:10vh auto}h1{font-size:24px}a{display:inline-flex;align-items:center;min-height:44px;color:#A9501A}p{color:#6F655D}</style><main><h1>此编辑器尚未准备离线使用</h1><p>请联网打开一次编辑器后，再离线使用。记号图鉴也需要先联网打开一次。</p><a href="${libraryUrl}">← 返回歌库</a></main></html>`, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        })
    );
    return;
  }

  if (request.mode === "navigate") {
    // 先按请求本身找缓存，找不到才回退到首页。
    // 原来直接回退到首页，导致离线打开 ./projection.html 拿到的是 index.html
    // （投影窗一直是在线的控制端开出来的，所以没暴露）。
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request, MATCH_OPTS).then((hit) => hit || caches.match("./?key=cecp2026", MATCH_OPTS))
      )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, MATCH_OPTS))
  );
});
