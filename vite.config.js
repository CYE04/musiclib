import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/* ── Service Worker 预缓存清单：构建期生成 ─────────────────────────────
   原来手写 APP_SHELL 有两个毛病：产物文件名一带 hash 就全失效；每加一个资源就要记得手动补。
   这个插件在打包结束后扫 dist/、生成真实清单、写回 dist/sw.js 的两个标记之间。

   ⚠️ 光扫 dist/ 是不够的。下面这几个文件**任何构建期扫描都看不见**，必须手写死：
     - soundtouch-processor.js  只在用户动变调滑块时才 addModule，URL 由 document.currentScript 算出
     - projection.html          只在进投影时 window.open('./projection.html')，纯字符串字面量
     - 两个 logo                在 innerHTML 模板里用 ${LOGO_SRC} 插值，扫描器看不到路径
   漏掉它们不会报错，只会在"断网 + 用户点了变调/投影"时静默失败 —— 最难查的那种。 */

const SCAN_INVISIBLE = [
  "./soundtouch-processor.js",
  "./projection.html",
  "./olive-fellowship-logo.png",
  "./cecp-olive-logo.svg",
];

/* 导航兜底用的 URL。必须与 sw.js 里 caches.match() 的字符串逐字节一致 —— Cache API 精确匹配查询串。 */
const NAV_FALLBACK = "./?key=cecp2026";

/* 跨域资源一律不进预缓存，各有各的理由，别"顺手加上"：
     Google Fonts       musiclib.css 的 @import，URL 会轮换、传递依赖无界，离线降级到系统字体即可
     GitHub 歌曲数据    必须永远最新，sw.js 已有 network-first + DATA_CACHE 兜底
     html2canvas CDN    只在点导出时才拉
   这些由 sw.js 的 fetch 处理器管，不归清单管。 */

function precacheManifest() {
  return {
    name: "cecp-precache-manifest",
    apply: "build",
    closeBundle() {
      const dist = path.resolve("dist");
      const swPath = path.join(dist, "sw.js");
      if (!fs.existsSync(swPath)) return;

      /* 点开头的文件一律不算数：public/.DS_Store 会被 Vite 原样拷进 dist，
         既会被当成静态资产发布到线上，又会混进下面的内容指纹里——
         于是同样的内容能算出两个桶名，"上线后核对 CACHE_NAME" 这个检查就失效了。
         这里直接删掉，而不是只在遍历时跳过：跳过的话它照样会被 wrangler 发上去。 */
      const walk = (dir, base = "") =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
          const rel = base ? `${base}/${e.name}` : e.name;
          if (e.name.startsWith(".")) {
            if (!e.isDirectory()) fs.rmSync(path.join(dir, e.name));
            return [];
          }
          return e.isDirectory() ? walk(path.join(dir, e.name), rel) : [rel];
        });

      const all = walk(dist);

      /* Cache API 是**精确匹配**：预缓存 "./musiclib.css" 救不了对 "./musiclib.css?v=xxx" 的请求。
         legacy 那几个文件带 ?v= 版本串，所以从产物里把真实请求 URL 抠出来，缓存请求形态而不是裸路径。
         抠而不是手写，是为了将来 bump ?v= 时这里不用跟着改。 */
      const sources = ["index.html", ...all.filter((f) => f.startsWith("assets/") && f.endsWith(".js"))];
      const queryForm = new Map();
      for (const s of sources) {
        const text = fs.readFileSync(path.join(dist, s), "utf8");
        for (const m of text.matchAll(/\.\/([\w.-]+)\?v=[\w.-]+/g)) queryForm.set(m[1], m[0]);
      }

      const asRequested = (f) => queryForm.get(f) || `./${f}`;

      const scanned = all
        .filter((f) => f.startsWith("assets/") || f.startsWith("icons/"))
        .concat(["index.html", "musiclib.css", "musiclib.js", "gsap.min.js", "pinyin-pro.js",
                 "bible-service.js", "pinyin-kai.woff2", "manifest.webmanifest"])
        .filter((f) => all.includes(f))
        .map(asRequested);

      const list = [...new Set([NAV_FALLBACK, ...scanned, ...SCAN_INVISIBLE])].sort();

      const missing = SCAN_INVISIBLE.filter((f) => !all.includes(f.slice(2)));
      if (missing.length) {
        this.error(`预缓存清单里的文件在 dist/ 不存在：${missing.join(", ")}`);
      }

      /* 缓存桶名跟着内容走：任何一个文件变了，桶名就变，
         老 Service Worker 的 activate 会把旧桶删掉（sw.js 里本来就有这段），
         用户不会卡在旧壳上。忘记手动 bump 版本号这个坑从此消失。 */
      const stamp = crypto.createHash("sha256")
        .update(list.join("\n"))
        .update(all.map((f) => `${f}:${fs.statSync(path.join(dist, f)).size}`).sort().join("\n"))
        .digest("hex").slice(0, 10);

      let sw = fs.readFileSync(swPath, "utf8");
      const body =
        `const CACHE_NAME = "cecp-musiclib-pwa-${stamp}";\n` +
        `const APP_SHELL = [\n${list.map((f) => `  ${JSON.stringify(f)}`).join(",\n")}\n];`;

      const B = "/* CECP-PRECACHE-BEGIN */";
      const E = "/* CECP-PRECACHE-END */";
      const a = sw.indexOf(B), b = sw.indexOf(E);
      if (a < 0 || b < 0) this.error("dist/sw.js 里找不到 CECP-PRECACHE 标记");
      sw = sw.slice(0, a + B.length) + "\n" + body + "\n" + sw.slice(b);
      fs.writeFileSync(swPath, sw);

      console.log(`\n  预缓存清单已写入 dist/sw.js：${list.length} 条，缓存桶 cecp-musiclib-pwa-${stamp}`);
    },
  };
}

// base './' 保持原版「部署到任意子路径都能跑」的特性(原 index.html 全部相对引用)。
export default defineConfig({
  base: "./",
  plugins: [react(), precacheManifest()],
  server: { port: 5176 },
});
