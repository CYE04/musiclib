/* Service Worker 注册与自动更新：
   - updateViaCache: "none" 让浏览器始终向服务器核对最新 sw.js（不吃旧 HTTP 缓存）
   - 切回页面或恢复联网时节流检查更新（至少间隔 60 秒）
   - 新版 SW 接管旧版 SW 时自动刷新一次，让用户直接拿到最新 musiclib.js / 样式 */
export function registerServiceWorker() {
  if (import.meta.env.DEV) return;
  if (!("serviceWorker" in navigator)) return;

  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    try {
      const last = Number(sessionStorage.getItem("cecp:sw-reloaded-at") || "0");
      if (Date.now() - last < 15000) return;
      sessionStorage.setItem("cecp:sw-reloaded-at", String(Date.now()));
    } catch (_) {}
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        let lastCheck = Date.now();
        const checkUpdate = (minGap) => {
          if (navigator.onLine === false) return;
          if (Date.now() - lastCheck < minGap) return;
          lastCheck = Date.now();
          reg.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) checkUpdate(60000);
        });
        window.addEventListener("online", () => checkUpdate(10000));
      })
      .catch(() => {});
  });
}
