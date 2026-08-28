/* legacy 引擎装载器 —— 唯一职责:在 React 把 #music-library 挂到文档里之后,
   按原 index.html <body> 末尾的顺序注入那 4 个 <script>。

   为什么用注入而不是 import：
   musiclib.js 是一个自执行 IIFE,顶层就有 `const root=document.getElementById('music-library')`
   (L335),必须在容器已入档之后才执行。原版靠"div 写在 script 之前"保证,这里靠 useEffect 时序保证。
   注入的是同样的 URL、同样的顺序、同样的 ?v= 查询串,所以脚本内部的 document.currentScript
   相对定位(LOGO_SRC / TRANSPOSE_LOGO_SRC / SOUNDTOUCH_PROCESSOR_URL,L230-253)结果与原版逐字节一致。

   legacy 文件本身一个字节都没改。 */

/* pinyin-pro 不在这里 —— 它 gzip 138KB，却只服务「拼音搜索」和「投影拼音标注」两处。
   改由 musiclib.js 的 ensurePinyinPro() 懒加载：首屏不拉，歌单载完趁空闲补，
   用户点搜索框或进投影则立刻拉。首屏因此少 138KB。 */
const LEGACY_SCRIPTS = [
  "./gsap.min.js?v=20260711-justify-rows",
  "./bible-service.js?v=20260711-justify-rows",
  "./musiclib.js?v=20260827-soft1",
];

let started = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = new URL(src, document.baseURI).href;
    el.async = false; // 保序:即便浏览器并行下载,也按插入顺序执行
    el.dataset.cecpLegacy = "1";
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("legacy script failed: " + src));
    document.body.appendChild(el);
  });
}

/** 装载 legacy 引擎。多次调用只生效一次(引擎无法卸载重入)。
 *
 * 四个标签一次性全插进去、并行下载,执行顺序由上面的 `el.async = false` 保证
 * (经典外部脚本 async=false 时,浏览器按插入 DOM 的顺序执行,与下载完成顺序无关)。
 * 原来这里是 `for (const src of ...) await loadScript(src)` —— 那是串行下载,
 * 白白等掉三个往返,而 async=false 本来就已经保住顺序了。 */
export async function initMusicLib() {
  if (started) return;
  started = true;
  await Promise.all(LEGACY_SCRIPTS.map(loadScript));
}

/* 原引擎没有任何销毁逻辑(事件委托挂在 document 上、全局单例状态),
   所以卸载是无操作。React StrictMode 的双跑由 initMusicLib 的 started 闸门挡掉。
   若将来要支持真正的卸载/重入,那属于修改 musiclib.js 内部逻辑,需另行批准。 */
export function cleanupMusicLib() {}

if (typeof window !== "undefined") {
  window.initMusicLib = initMusicLib;
  window.cleanupMusicLib = cleanupMusicLib;
}
