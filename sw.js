const CACHE_NAME = "cecp-musiclib-pwa-v27-weather-v3";
const DATA_CACHE = "cecp-musiclib-data-v1";
const APP_SHELL = [
  "./?key=cecp2026",
  "./index.html",
  "./musiclib.css?v=20260709-weather-v3",
  "./gsap.min.js?v=20260709-weather-v3",
  "./pinyin-dict.js?v=20260709-weather-v3",
  "./musiclib.js?v=20260709-weather-v3",
  "./manifest.webmanifest",
  "./olive-fellowship-logo.png",
  "./icons/favicon.ico",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png"
];

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
            .then((cache) => cache.match(keyUrl))
            .then((match) => match || Response.error())
        )
    );
    return;
  }

  if (url.origin !== location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./?key=cecp2026"))
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
      .catch(() => caches.match(request))
  );
});
