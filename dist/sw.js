/* CACHE_NAME 与 APP_SHELL 由 vite.config.js 的 precacheManifest 插件在构建期改写。
   下面这份是 dev/兜底值，真正上线的内容看 dist/sw.js。
   桶名带内容指纹 —— 任何资源变化都会换桶，activate 里的清理逻辑随即删掉旧桶，
   老用户不会卡在旧壳上，也不用再记得手动 bump 版本号。 */
/* CECP-PRECACHE-BEGIN */
const CACHE_NAME = "cecp-musiclib-pwa-89b190a3d6";
const APP_SHELL = [
  "./?key=cecp2026",
  "./assets/index-DuRyiWkK.js",
  "./bible-service.js?v=20260711-justify-rows",
  "./cecp-olive-logo.svg",
  "./gsap.min.js?v=20260711-justify-rows",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.ico",
  "./icons/icon-192-maskable.png",
  "./icons/icon-192.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./musiclib.css?v=20260801-home17",
  "./musiclib.js?v=20260813-a4page",
  "./olive-fellowship-logo.png",
  "./pinyin-kai.woff2",
  "./pinyin-pro.js?v=20260725-pypro",
  "./projection.html",
  "./soundtouch-processor.js"
];
/* CECP-PRECACHE-END */
const DATA_CACHE = "cecp-musiclib-data-v1";

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
          .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE)
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
    url.pathname.indexOf("/repos/CYE04/Cecp/contents/songs") === 0;
  const isSongJson =
    url.hostname === "raw.githubusercontent.com" &&
    url.pathname.indexOf("/CYE04/Cecp/main/songs/") === 0;
  if (isSongList || isSongJson) {
    const keyUrl = url.origin + url.pathname;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches
              .open(DATA_CACHE)
              .then((cache) => cache.put(keyUrl, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches
            .open(DATA_CACHE)
            .then((cache) => cache.match(keyUrl, MATCH_OPTS))
            .then((match) => match || Response.error())
        )
    );
    return;
  }

  if (url.origin !== location.origin) return;

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
