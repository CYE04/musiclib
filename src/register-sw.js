/* Service Worker 注册 —— 逐字保留原 index.html 末尾内联 script 的行为。
   dev 模式不注册:Vite 开发服务器不产出 dist,SW 预缓存清单会命中不存在的 /assets/*,
   而且旧 SW 会拦截 HMR 请求。离线能力在 `npm run build && npm run preview` 下验证。 */
export function registerServiceWorker() {
  if (import.meta.env.DEV) return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=20260801-home17").catch(() => {});
  });
}
