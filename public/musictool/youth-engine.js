/* ══ 内联 shared/strict-align.js（严格对位纯函数层）— 权威版本在 shared/strict-align.js；改动先改那边跑测试再同步回此处。宿主页未单独加载它，故内联于此暴露全局 CecpStrictAlign ══ */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  if (root) root.CecpStrictAlign = mod;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
  'use strict';

  /* ── 以下三个函数从 renderNStr 逐字复刻（见顶部同步警告）───────────────────── */

  function normalizeTimeSignValue(sig) {
    var m = String(sig || '').trim().replace(/\s+/g, '').replace(/／/g, '/').match(/^(\d{1,2})\/(\d{1,2})$/);
    return m ? (m[1] + '/' + m[2]) : '';
  }

  function extractInlineTimeSignToken(tok) {
    var m = String(tok || '').trim().match(/^\[(?:ts|timesign|meter):([^\]]+)\]$/i);
    return m ? normalizeTimeSignValue(m[1]) : '';
  }

  /* 小节线 / 导航记号 / 两者组合(||coda 等) —— 与三宿主 barNavOf 同一套判定，不用正则。 */
  function isBarNavTok(tk) {
    var BARS = { '|': 1, '||': 1, '||/': 1, '|]': 1, '|:': 1, ':|': 1, '|:|': 1 };
    var t = String(tk || '');
    if (BARS[t]) return true;
    var NAVS = ['fine', 'dc', 'ds', 'coda', 'segno'];
    for (var i = 0; i < NAVS.length; i++) {
      var n = NAVS[i];
      if (t.length >= n.length && t.slice(-n.length) === n) {
        var pre = t.slice(0, t.length - n.length);
        if (pre === '' || BARS[pre]) return true;
      }
    }
    return false;
  }

  function isDualAtom(tk) {
    if (!tk || tk === '/' || tk === '／' || tk === '!' || tk.charAt(0) === '~' || tk.charAt(0) === '*') return false;
    if (tk === '(' || tk === ')' || tk === '([' || tk === '])' || tk === '}' || tk === '[v1' || tk === '[v2' || tk === ']v') return false;
    if (isBarNavTok(tk)) return false;   // 小节线/导航记号/两者组合(如 ||coda) 都不是音位
    if (/^\{(3|5)$/.test(tk)) return false;
    if (extractInlineTimeSignToken(tk)) return false;
    if (/^\[v:(.+)\]$/.test(tk)) return false;
    return true;
  }

  /* dual-merge 分词：与 renderNStr 里那段 while 循环逐字一致（把 `X / Y` 合成 `X/Y`）。 */
  function tokenizeN(nStr) {
    var s = String(nStr || '').trim();
    if (!s) return [];
    var rawToks = s.split(/\s+/), toks = [], ti = 0;
    while (ti < rawToks.length) {
      if (ti + 2 < rawToks.length && (rawToks[ti + 1] === '/' || rawToks[ti + 1] === '／') && isDualAtom(rawToks[ti]) && isDualAtom(rawToks[ti + 2])) {
        toks.push(rawToks[ti] + '/' + rawToks[ti + 2]);
        ti += 3;
        continue;
      }
      toks.push(rawToks[ti]);
      ti++;
    }
    return toks;
  }

  /* ── 对位纯函数 ───────────────────────────────────────────────────────────── */

  /** 把 n 串切成音位序列。返回音位 token 数组（结构 token 已剔除，dual 已合并）。 */
  function splitSlots(nStr) {
    return tokenizeN(nStr).filter(isDualAtom);
  }

  /** 一个和弦 token 可能叠两个：逗号分隔。返回 [下, 上, ...]（第一个在下）。 */
  function splitChordStack(tok) {
    if (tok == null) return [];
    return String(tok).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
  }

  function parseFieldTokens(str) {
    var s = String(str == null ? '' : str).trim();
    return s ? s.split(/\s+/) : [];
  }

  /* ── 歌词智能分词（仅 lyric 字段用；chord/n 不走这里）——同 shared/strict-align.js ──
     中文连写每字一位；拖腔/无词的音写 `@`；标点自动粘前一个字（不占音位）；英文/拼音按空格断音节。
     不用正则做分类（charCode + indexOf），免模板转义坑。改动先改 shared 跑测试再同步回此处。 */
  var LYRIC_PUNCT = '，。、；：？！…—―～·「」『』（）〔〕【】《》〈〉“”‘’,.;:?!(){}';
  function isLyricPunctChar(ch) { return LYRIC_PUNCT.indexOf(ch) >= 0; }
  function isLyricWordChar(ch) {
    var c = ch.charCodeAt(0);
    return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || ch === "'" || ch === '-';
  }
  function isLyricSpaceChar(ch) { return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '　'; }

  /* 和弦智能分词（仅 chord）：空格分隔 + `@` 自分隔，使 `C@@@G@` = `C @ @ @ G @`；真和弦整体保留、`C,G` 不拆。同 shared/strict-align.js。 */
  function tokenizeChord(str) {
    var s = String(str == null ? '' : str).trim();
    if (!s) return [];
    var raw = s.split(/\s+/), out = [];
    for (var i = 0; i < raw.length; i++) {
      var t = raw[i], buf = '';
      for (var j = 0; j < t.length; j++) {
        var ch = t.charAt(j);
        if (ch === '@') { if (buf) { out.push(buf); buf = ''; } out.push('@'); }
        else buf += ch;
      }
      if (buf) out.push(buf);
    }
    return out;
  }

  function tokenizeLyric(str) {
    var arr = Array.from(String(str == null ? '' : str)), toks = [], buf = '';
    function flush() { if (buf) { toks.push(buf); buf = ''; } }
    for (var i = 0; i < arr.length; i++) {
      var ch = arr[i];
      if (isLyricSpaceChar(ch)) { flush(); continue; }
      if (ch === '@') { flush(); toks.push('@'); continue; }
      if (isLyricPunctChar(ch)) {
        if (buf) buf += ch;
        else if (toks.length && toks[toks.length - 1] !== '@') toks[toks.length - 1] += ch;
        else buf += ch;
        continue;
      }
      if (isLyricWordChar(ch)) { buf += ch; continue; }
      flush(); toks.push(ch);
    }
    flush();
    return toks;
  }

  /* 尾随标点拆分（悬挂渲染用）：`说，`→{base:'说',punct:'，'}；同 shared/strict-align.js。 */
  function splitTrailingPunct(s) {
    s = String(s == null ? '' : s);
    var i = s.length;
    while (i > 0 && isLyricPunctChar(s.charAt(i - 1))) i--;
    if (i === 0) return { base: s, punct: '' };
    return { base: s.slice(0, i), punct: s.slice(i) };
  }

  /** 把一行 strict 歌词/字段串还原成"纯展示/搜索文本"：丢掉 `@`（空位）与音位间空白，
   *  相邻两个拉丁词之间保留一个空格。用于搜索 haystack、歌词面板、song.lyrics 拼接——
   *  strict 下 `@` 绝不能漏进展示或搜索串。老串（无空白可分/无 @）原样返回，安全。 */
  function strictLyricPlain(str) {
    var toks = tokenizeLyric(str), out = '';
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t === '@') continue;
      if (out && /[0-9A-Za-z]$/.test(out) && /^[0-9A-Za-z]/.test(t)) out += ' ';
      out += t;
    }
    return out;
  }

  /* 把一行字段（chord 或某行 lyric）对到音位上；@ / 缺失 → null；不足/超出 → warning。 */
  function alignField(fieldName, raw, slotCount, warnings) {
    var toks = fieldName === 'chord' ? tokenizeChord(raw) : tokenizeLyric(raw);
    var vals = [];
    for (var i = 0; i < slotCount; i++) {
      var t = i < toks.length ? toks[i] : null;
      vals.push((t === '@' || t == null) ? null : t);
    }
    if (toks.length !== slotCount) {
      if (toks.length > slotCount) {
        warnings.push({
          field: fieldName, kind: 'over',
          slot: slotCount + 1, extra: toks.length - slotCount,
          message: fieldName + '：共 ' + slotCount + ' 个音位，但写了 ' + toks.length + ' 个 token —— 第 ' + (slotCount + 1) + ' 个 token 起没有对应音位（多出 ' + (toks.length - slotCount) + ' 个）'
        });
      } else {
        warnings.push({
          field: fieldName, kind: 'under',
          slot: toks.length + 1, missing: slotCount - toks.length,
          message: fieldName + '：共 ' + slotCount + ' 个音位，只写到第 ' + toks.length + ' 个 —— 第 ' + (toks.length + 1) + ' 个音位起没内容（还差 ' + (slotCount - toks.length) + ' 个）'
        });
      }
    }
    return vals;
  }

  /**
   * 把一整行（一个 line 里的一组 seg 拼出来的 n/chord/lyric*）做严格对位。
   * @param {string} nStr   简谱串
   * @param {string} chord  和弦串（空格分隔，@=空位，逗号=叠和弦）
   * @param {string|string[]} lyrics 一行或多行歌词串
   * @returns {{slotCount:number, slots:string[], chords:(string|null)[],
   *            lyrics:(string|null)[][], warnings:object[]}}
   *   chords[i] / lyrics[k][i] 为该音位的原始 token（含逗号叠和弦）或 null（空位）。
   *   `@` 永不出现在返回值里（一律转 null），杜绝漏进展示/搜索。
   */
  function alignRow(nStr, chord, lyrics) {
    var lys = lyrics == null ? [] : (Array.isArray(lyrics) ? lyrics : [lyrics]);
    var slots = splitSlots(nStr);
    var n = slots.length;
    var warnings = [];
    var chords = alignField('chord', chord, n, warnings);
    var outLyrics = [];
    for (var k = 0; k < lys.length; k++) {
      outLyrics.push(alignField(k === 0 ? 'lyric' : 'lyric' + (k + 1), lys[k], n, warnings));
    }
    return { slotCount: n, slots: slots, chords: chords, lyrics: outLyrics, warnings: warnings };
  }

  return {
    splitSlots: splitSlots,
    alignRow: alignRow,
    splitChordStack: splitChordStack,
    strictLyricPlain: strictLyricPlain,
    tokenizeN: tokenizeN,
    tokenizeLyric: tokenizeLyric,
    tokenizeChord: tokenizeChord,
    splitTrailingPunct: splitTrailingPunct,
    isDualAtom: isDualAtom,           // 导出仅供测试对拍；生产判定走 splitSlots
    _timeSign: { normalizeTimeSignValue: normalizeTimeSignValue, extractInlineTimeSignToken: extractInlineTimeSignToken }
  };
});
/* ══ /内联 strict-align（END）══ */

/**
 * youth-engine.js v3.1
 * 橄榄树团契 · 青年聚会渲染引擎
 * 托管于 GitHub Pages，所有帖子共用
 *
 * 使用方式A（新，推荐）：
 *   YouthEngine.render('2026-03', document.getElementById('ym-root'));
 *
 * 使用方式B（旧，向后兼容）：
 *   window.YouthMeeting = { ... }; // 帖子里定义
 *   <script src="youth-engine.js"></script>  // 自动读取并渲染
 */

/* ══════════ GitHub Pages 基础路径 ══════════ */
var YM_BASE = 'https://cye04.github.io/Cecp';
var SONGS_BASE = 'https://cye04.github.io/songs';
var YM_LOGO_SRC = (function () {
  try {
    var cur = document.currentScript && document.currentScript.src ? new URL(document.currentScript.src, location.href) : null;
    return cur ? new URL('musiclib/olive-fellowship-logo.png', cur.href).href : 'musiclib/olive-fellowship-logo.png';
  } catch (_) {
    return 'musiclib/olive-fellowship-logo.png';
  }
})();

window.YouthEngine = {};

(function () {
  'use strict';

  // 模块级变量，由 _run() 赋值
  var C, ROOT;

  function _applyDefaults(C) {
    C.time       = C.time       || '每周日 12:00 – 13:30';
    C.gameText   = C.gameText   || '本周没有游戏活动哦👀';
    C.schedule   = C.schedule   || [
      { time:'12:00 – 12:30', event:'诗歌敬拜',   emoji:'🎶' },
      { time:'12:30 – 13:30', event:'圣经分享',   emoji:'📖' },
      { time:'13:30',          event:'祷告 & 结束', emoji:'🙏' },
    ];
    C.songs  = C.songs  || [];
    C.apiBase = C.apiBase || 'https://script.google.com/macros/s/AKfycbxihf7j08Pkus9rWBqectkmJ7PbJNVdhPTrbNL8v3wm1vTbJ76xE6ksNKytTe4SUii3_Q/exec';
  }

  /* ══════════════ CSS 只注入一次 ══════════════ */
  var _cssInjected = false;
  function _injectCSS() {
    if (_cssInjected) return;
    _cssInjected = true;

    var fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&family=DM+Mono:wght@400;500&family=Space+Mono:wght@400;700&display=swap';
    document.head.appendChild(fontLink);

    var style = document.createElement('style');
    style.textContent = `
/* ── theme vars ── */
:root{
  color-scheme:light;
  /* ── SEMANTIC TOKENS — single source of truth (soft neutral surfaces + ink blue) ── */
  /* surfaces: base < elevated < elevated-2 ; sunken for insets/inputs */
  --ym-bg-base:#F5F4F1;--ym-bg-elevated:#FFFFFF;--ym-bg-elevated-2:#FAF9F6;--ym-bg-sunken:#ECEEEB;
  /* text — neutral ramp; tertiary maintains 4.5:1 across opaque light surfaces */
  --ym-text-primary:#252D35;--ym-text-secondary:#56616B;--ym-text-tertiary:#626D77;
  /* separators (cool) */
  --ym-separator:rgba(20,30,55,.10);--ym-separator-strong:rgba(20,30,55,.16);
  /* accent — ink blue; a softer companion for secondary highlights */
  --ym-accent:#315F86;--ym-accent-hover:#254D70;--ym-accent-pressed:#1D3E5B;--ym-accent-subtle:rgba(49,95,134,.09);
  --ym-accent-2:#527EA1;--ym-on-accent:#FFFFFF;
  /* team accents — muted blue / indigo / teal */
  --ym-team-a:#315F86;--ym-team-b:#6C5790;--ym-team-c:#247478;
  /* status */
  --ym-success:#1F9D57;--ym-warning:#C2740A;--ym-danger:#D9463C;
  /* elevation — multi-layer, low-alpha, large blur, cool-tinted (no hard black edges) */
  --ym-sh:0 1px 2px rgba(20,30,55,.06),0 8px 24px rgba(20,30,55,.07);
  --ym-sh-lg:0 2px 4px rgba(20,30,55,.06),0 18px 48px rgba(20,30,55,.11);
  --ym-elev:0 2px 4px rgba(20,30,55,.06),0 24px 70px rgba(20,30,55,.12),0 1px 0 rgba(255,255,255,.8) inset;
  /* radius / motion */
  --ym-r-btn:11px;--ym-r-card:14px;--ym-r-container:20px;
  --ym-ease:cubic-bezier(.4,0,.2,1);--ym-dur:.18s;
  /* editorial: serif display face (hymnal/scripture voice) + section rules */
  --ym-serif:Georgia,"Songti SC","Noto Serif SC","Source Han Serif SC","STSong",serif;
  --ym-rule:rgba(49,70,88,.32);--ym-line-soft:rgba(20,22,30,.07);
  /* z-index scale (no scattered magic numbers): raised < chord-panel < lightbox < overlay < modal; FABs (footer) live at 2147483630, below youth overlays */
  --ym-z-raised:10;--ym-z-chord:2147482000;--ym-z-lightbox:2147483640;--ym-z-overlay:2147483646;--ym-z-modal:2147483647;
  /* bottom clearance so the last card / player clears the fixed FAB cluster + system safe area */
  --ym-safe-bottom:calc(88px + env(safe-area-inset-bottom,0px));
  /* platform brand — fixed, non-themed */
  --ym-youtube:#ff0033;--ym-youtube-hover:#e6002e;

  /* ── LEGACY ALIASES → semantic tokens (keeps existing var(--ym-*) refs working) ── */
  --ym-bg:var(--ym-bg-base);--ym-card:var(--ym-bg-elevated);
  --ym-ink:var(--ym-text-primary);--ym-ink2:var(--ym-text-secondary);--ym-ink3:var(--ym-text-tertiary);
  --ym-border:var(--ym-separator);--ym-border-md:var(--ym-separator-strong);--ym-soft:rgba(20,30,55,.05);
  --ym-glow:var(--ym-accent-subtle);--ym-warm:rgba(74,163,232,.14);--ym-mint:rgba(14,154,174,.12);
  --ym-page:var(--ym-bg-base);--ym-panel:var(--ym-bg-elevated);--ym-panel-2:var(--ym-bg-elevated-2);--ym-glass:rgba(255,255,255,.72);
  --ym-chip:rgba(255,255,255,.66);--ym-chip-hover:#FFFFFF;--ym-line:var(--ym-separator);
  --ym-brand:var(--ym-accent);--ym-brand2:var(--ym-accent-2);--ym-brand3:var(--ym-accent-2);--ym-on-brand:var(--ym-on-accent);
  --ym-accent2:var(--ym-accent-hover);
  --ym-capo:#0B6FE3;--ym-capo-bg:rgba(11,111,227,.08);--ym-capo-ln:rgba(11,111,227,.2);
  --ym-chord-ink:#0B6FE3;
  /* 歌词分行配色：第 1 行纯黑，第 2/3/4 行深蓝/深绿/深紫 —— 都要够深，别用浅色/降透明度 */
  --ym-ly2:#123C8F;--ym-ly3:#0E4F33;--ym-ly4:#5C2178;
  --yb:var(--ym-bg-elevated);--yt:var(--ym-text-primary);--ym:var(--ym-text-secondary);--ybr:var(--ym-separator);--ysh:rgba(20,30,55,.24);--ybk:rgba(15,20,35,.55);
}
@media(prefers-color-scheme:dark){
  :root{
    color-scheme:dark;
    /* dark surfaces: cool neutral charcoal (Apple system dark, never pure black); lightness rises to signal elevation */
    --ym-bg-base:#121418;--ym-bg-elevated:#1C1F26;--ym-bg-elevated-2:#252932;--ym-bg-sunken:#0D0E12;
    --ym-text-primary:#ECEEF3;--ym-text-secondary:#A6AEBD;--ym-text-tertiary:#9AA5B4;
    --ym-separator:rgba(255,255,255,.09);--ym-separator-strong:rgba(255,255,255,.15);
    --ym-accent:#6EA3E6;--ym-accent-hover:#84B2EC;--ym-accent-pressed:#5B93DA;--ym-accent-subtle:rgba(110,163,230,.16);
    --ym-accent-2:#5B93DA;--ym-on-accent:#0A1220;
    --ym-rule:rgba(180,199,218,.30);--ym-line-soft:rgba(255,255,255,.07);
    --ym-team-a:#4C9BFF;--ym-team-b:#8E8CFF;--ym-team-c:#3FC4D6;
    --ym-success:#4ADE80;--ym-warning:#E3B457;--ym-danger:#F0756A;
    --ym-sh:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.34);
    --ym-sh-lg:0 2px 6px rgba(0,0,0,.44),0 20px 52px rgba(0,0,0,.44);
    --ym-elev:0 2px 6px rgba(0,0,0,.4),0 24px 70px rgba(0,0,0,.46),0 1px 0 rgba(255,255,255,.05) inset;

    --ym-bg:var(--ym-bg-base);--ym-card:var(--ym-bg-elevated);
    /* 暗色下同样三种色相，提亮到深底上看得清 */
    --ym-ly2:#7FB0FF;--ym-ly3:#52C994;--ym-ly4:#C88FEC;
    --ym-ink:var(--ym-text-primary);--ym-ink2:var(--ym-text-secondary);--ym-ink3:var(--ym-text-tertiary);
    --ym-border:var(--ym-separator);--ym-border-md:var(--ym-separator-strong);--ym-soft:rgba(255,255,255,.06);
    --ym-glow:var(--ym-accent-subtle);--ym-warm:rgba(99,179,242,.14);--ym-mint:rgba(63,196,214,.12);
    --ym-page:var(--ym-bg-base);--ym-panel:var(--ym-bg-elevated);--ym-panel-2:var(--ym-bg-elevated-2);--ym-glass:rgba(28,31,38,.78);
    --ym-chip:rgba(255,255,255,.05);--ym-chip-hover:rgba(255,255,255,.09);--ym-line:var(--ym-separator);
    --ym-brand:var(--ym-accent);--ym-brand2:var(--ym-accent-2);--ym-brand3:var(--ym-accent-2);--ym-on-brand:var(--ym-on-accent);
    --ym-accent2:var(--ym-accent-hover);
    --ym-capo:#4C9BFF;--ym-capo-bg:rgba(76,155,255,.14);--ym-capo-ln:rgba(76,155,255,.26);
    --ym-chord-ink:#4C9BFF;
    --yb:var(--ym-bg-elevated);--yt:var(--ym-text-primary);--ym:var(--ym-text-secondary);--ybr:var(--ym-separator);--ysh:rgba(0,0,0,.65);--ybk:rgba(0,0,0,.8);
  }
}
*,*::before,*::after{box-sizing:border-box}
.ym-bottom-safe{height:var(--ym-safe-bottom);flex:0 0 auto;pointer-events:none}
:where(a,button,input,textarea,select,[role="button"],[tabindex]):focus-visible{outline:2px solid var(--ym-accent);outline-offset:2px}
:where(a,button,input,textarea,select,[role="button"],[tabindex]):focus:not(:focus-visible){outline:none}
.ym-tilt{position:relative;max-width:100%}
.ym-tilt::after{display:none}
.ym-reveal{opacity:1;transform:none}
.ym-reveal.in{opacity:1;transform:none}
@media(hover:none),(pointer:coarse){.ym-tilt:hover{box-shadow:var(--ym-sh-lg);transform:none!important}.ym-tilt::after{display:none}}
@media(prefers-reduced-motion:reduce){.ym-tilt,.ym-tilt::after,.ym-reveal{transition:none!important;transform:none!important}.ym-reveal{opacity:1!important}}

/* ── Masthead (editorial) ── */
.ym-mast{width:100%;min-width:0;margin:0 auto;padding:30px 0 20px;border-bottom:1px solid var(--ym-line)}
.ym-eyebrow{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600;letter-spacing:.2em;color:var(--ym-ink2)}
.ym-eyebrow-dot{width:4px;height:4px;border-radius:50%;background:var(--ym-accent);flex:0 0 auto}
.ym-mast-title{font-family:var(--ym-serif);font-weight:400;font-size:clamp(30px,7.4vw,42px);line-height:1.13;letter-spacing:.01em;color:var(--ym-ink);margin:14px 0 10px;overflow-wrap:anywhere}
.ym-mast-lede{font-size:15px;line-height:1.65;color:var(--ym-ink2);margin:0;max-width:36ch}
.ym-mast-meta{margin-top:16px;font-family:'DM Mono','SF Mono',ui-monospace,monospace;font-size:12.5px;letter-spacing:.02em;color:var(--ym-ink3)}
.ym-mast-nav{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:18px}
.ym-mast-link{--nav-color:#4F79B8;position:relative;font-size:14.5px;color:var(--ym-ink2);text-decoration:none;padding:4px 0 6px;cursor:pointer;background:none;border:0;font-family:inherit;transition:color var(--ym-dur) var(--ym-ease)}
.ym-mast-link::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--nav-color);opacity:.6;transition:opacity var(--ym-dur) var(--ym-ease)}
.ym-mast-link[data-section="songs"]{--nav-color:#B78335}
.ym-mast-link[data-section="score"]{--nav-color:#4D8A72}
.ym-mast-link[data-section="message"]{--nav-color:#8166A5}
.ym-mast-link[data-section="ppt"]{--nav-color:#A36F45}
.ym-mast-link[data-section="replay"]{--nav-color:#64738B}
.ym-mast-link[data-section="tutorial"]{--nav-color:#367E89}
.ym-mast-link[data-section="game"]{--nav-color:#A36363}
.ym-mast-link:hover,.ym-mast-link.active{color:var(--ym-ink)}
.ym-mast-link:hover::after,.ym-mast-link.active::after{opacity:1}

/* ── Schedule ── */
/* ── animated inline icons ── */
.ym-ic{width:1em;height:1em;display:inline-block;vertical-align:-.14em;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;overflow:visible}
@keyframes ym-ic-pop{0%{opacity:0;transform:scale(.55) translateY(3px)}62%{opacity:1;transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
.ym-ic-pop{animation:ym-ic-pop .5s var(--ym-ease) both}
@keyframes ym-node-in{0%{opacity:0;transform:scale(.68) translateY(5px)}70%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
.ym-tl-node-in{animation:ym-node-in .52s var(--ym-ease) both}
/* motion keyframes — played ONLY while the icon's control is hovered, never idle */
@keyframes ym-ic-spin{to{transform:rotate(360deg)}}
@keyframes ym-ic-bob{0%,100%{transform:translateY(0)}28%{transform:translateY(-3px)}55%{transform:translateY(0)}78%{transform:translateY(-1.4px)}}
@keyframes ym-ic-pulse{0%,100%{transform:scale(1)}45%{transform:scale(1.22)}}
@keyframes ym-ic-sway{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}
.ym-ic-pulse,.ym-ic-sway,.ym-ic-hand{transform-box:view-box;transform-origin:12px 12px}
:where(.ym-nav-btn,.ym-tl-step,.wr-tab,.wr-section,.wr-group-hd):hover .ym-ic-bob{animation:ym-ic-bob .58s var(--ym-ease)}
:where(.ym-nav-btn,.ym-tl-step,.wr-tab,.wr-section,.wr-group-hd):hover .ym-ic-pulse{animation:ym-ic-pulse .5s var(--ym-ease)}
:where(.ym-nav-btn,.ym-tl-step,.wr-tab,.wr-section,.wr-group-hd):hover .ym-ic-sway{animation:ym-ic-sway .6s var(--ym-ease)}
:where(.ym-tl-hd,.ym-tl-ic):hover .ym-ic-hand{animation:ym-ic-spin 1.1s var(--ym-ease)}
@media(prefers-reduced-motion:reduce){.ym-ic,.ym-ic *,.ym-tl-node-in{animation:none!important}}

/* ── Editorial section header (shared by 流程 / 诗歌 / 信息 …) ── */
.ym-sec{width:100%;min-width:0;margin:34px auto 12px}
.ym-sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:6px}
.ym-sec-h .k{font-family:var(--ym-serif);font-size:clamp(20px,4.8vw,25px);font-weight:400;letter-spacing:.01em;color:var(--ym-ink);line-height:1.2;word-break:break-word}
.ym-sec-h .n{font-size:12.5px;color:var(--ym-ink3);font-family:'DM Mono','SF Mono',ui-monospace,monospace;letter-spacing:.02em;white-space:nowrap;flex:0 0 auto}
.ym-sec.is-featured .k{font-size:clamp(23px,5.4vw,29px)}
.ym-sec{--section-color:var(--ym-accent)}
.ym-sec[data-tone="gold"]{--section-color:#B78335}
.ym-sec[data-tone="violet"]{--section-color:var(--ym-team-b)}
.ym-sec[data-tone="teal"]{--section-color:var(--ym-team-c)}
.ym-sec[data-tone="rose"]{--section-color:#A36363}
.ym-sec-rule{height:1px;background:color-mix(in srgb,var(--section-color) 32%,transparent);margin-bottom:2px}

/* ── Order of service (schedule) ── */
.ym-flow{width:100%;min-width:0;margin:34px auto 0;color:var(--ym-ink)}
.ym-ord{list-style:none;margin:0;padding:0}
.ym-ord-row{display:grid;grid-template-columns:20px 78px 1fr auto;gap:14px;align-items:baseline;padding:18px 2px;border-bottom:1px solid var(--ym-line-soft)}
.ym-ord-row:last-child{border-bottom:0}
.ym-ord-num{font-family:var(--ym-serif);font-size:15px;color:var(--ym-ink3);line-height:1}
.ym-ord-time{font-family:'DM Mono','SF Mono',ui-monospace,monospace;font-size:17px;font-weight:600;letter-spacing:-.01em;color:var(--ym-ink);min-width:0}
.ym-ord-time,.ym-ord-dur,.ym-mast-meta{font-variant-numeric:tabular-nums}
.ym-ord-time small{display:block;font-size:12px;font-weight:400;color:var(--ym-ink3);margin-top:3px;letter-spacing:0}
.ym-ord-name{font-family:var(--ym-serif);font-size:clamp(18px,4.8vw,22px);line-height:1.26;color:var(--ym-ink);min-width:0;word-break:break-word}
.ym-ord-name .sub{display:block;font-family:-apple-system,system-ui,"PingFang SC",sans-serif;font-size:12.5px;color:var(--ym-ink2);margin-top:4px;letter-spacing:0}
.ym-ord-dur{font-family:'DM Mono','SF Mono',ui-monospace,monospace;font-size:12px;color:var(--ym-ink3);white-space:nowrap}
.ym-ord-live{display:none;font-family:-apple-system,system-ui,"PingFang SC",sans-serif;font-size:10.5px;font-weight:600;letter-spacing:.12em;color:var(--ym-accent);background:var(--ym-accent-subtle);padding:2px 8px;border-radius:100px;margin-right:8px;vertical-align:3px;white-space:nowrap}
.ym-ord-row.live .ym-ord-live{display:inline-block}
.ym-ord-row.live .ym-ord-time,.ym-ord-row.live .ym-ord-num{color:var(--ym-accent)}
@media(max-width:520px){.ym-ord-row{grid-template-columns:16px 66px 1fr auto;gap:10px}.ym-ord-time{font-size:16px}}

/* ── Roster ── */
/* ── Roster / team board ── */
.wr-studio-icon{display:inline-block;width:20px;height:20px;flex:0 0 auto;vertical-align:middle;fill:currentColor;stroke:none}
.wr-section-title .wr-studio-icon,.wr-group-ic .wr-studio-icon{color:var(--ym-ink2)}
.wr-root{--tc:var(--ym-accent);width:100%;min-width:0;margin:1rem 0;box-sizing:border-box;font-family:-apple-system,system-ui,"SF Pro Text","PingFang SC",sans-serif;color:var(--ym-ink)}
.wr-team-a{--tc:var(--ym-team-a)}.wr-team-b{--tc:var(--ym-team-b)}.wr-team-c{--tc:var(--ym-team-c)}
.wr-tabs-wrap{display:flex;justify-content:flex-start;margin-bottom:4px;border-bottom:1px solid var(--ym-line)}
.wr-tabs{display:inline-flex;gap:24px;padding:0;max-width:100%;overflow-x:auto;border-radius:0;background:none;border:0;scrollbar-width:none}
.wr-tabs::-webkit-scrollbar{display:none}
.wr-tab{position:relative;display:inline-flex;align-items:center;gap:6px;padding:8px 0 11px;border-radius:0;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;user-select:none;white-space:nowrap;color:var(--ym-ink2);background:transparent;border:0;transition:color var(--ym-dur) var(--ym-ease)}
.wr-tab .ym-ic{font-size:15px}
.wr-tab:hover{color:var(--ym-ink)}
.wr-tab.active{color:var(--ym-accent);background:none;box-shadow:none}
.wr-tab.active::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:1.5px;background:var(--ym-accent)}
.wr-card{width:100%;min-width:0;padding:0;border-radius:0;background:none;border:0;box-sizing:border-box;box-shadow:none}
.wr-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin:14px 0 2px}
.wr-title{font-family:var(--ym-serif);font-weight:400;font-size:18px;letter-spacing:.01em;color:var(--ym-ink)}
.wr-actions button{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--ym-line);border-radius:10px;padding:6px 12px;cursor:pointer;font-size:13px;font-weight:600;background:var(--ym-chip);color:var(--ym-ink2);margin-left:6px;transition:color var(--ym-dur) var(--ym-ease),border-color var(--ym-dur) var(--ym-ease),transform var(--ym-dur) var(--ym-ease)}
.wr-actions button:hover{color:var(--ym-ink);border-color:var(--ym-border-md);transform:translateY(-1px)}
.wr-group{margin-top:20px}
.wr-group-hd{display:flex;align-items:baseline;gap:9px;margin:0 0 2px;padding-bottom:9px;border-bottom:1px solid color-mix(in srgb,var(--tc) 22%,transparent)}
.wr-group-ic{display:inline-flex;align-items:center;font-size:14px;color:var(--ym-ink3)}
.wr-group-nm{font-size:13.5px;font-weight:600;letter-spacing:.06em;color:var(--ym-ink)}
.wr-group-ct{font-family:'DM Mono','SF Mono',ui-monospace,monospace;font-size:11.5px;color:var(--ym-ink3);margin-left:auto}
.wr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
@media(min-width:640px){.wr-grid{grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}}
.wr-section{position:relative;background:color-mix(in srgb,var(--tc) 4%,var(--ym-bg-elevated-2));border-radius:12px;padding:12px 13px 13px;border:1px solid var(--ym-line);box-sizing:border-box;min-width:0}
.wr-section-title{display:flex;align-items:center;gap:7px;font-weight:600;font-size:12.5px;margin-bottom:10px;color:var(--ym-ink2)}
.wr-section-title .ym-ic{font-size:14px;color:var(--ym-ink3)}
.wr-people{display:flex;flex-direction:column;gap:7px}
.wr-name{display:flex;align-items:center;gap:8px}
.wr-avatar{display:none}
.wr-avatar.empty{color:var(--ym-ink3);background:var(--ym-bg-sunken);box-shadow:inset 0 0 0 1px var(--ym-line)}
.wr-name input{flex:1;min-width:0;width:100%;padding:8px 11px;border-radius:7px;border:1px solid var(--ym-line-soft);background:var(--ym-soft);color:var(--ym-ink);font-family:var(--ym-serif);font-size:15.5px;font-weight:400;box-sizing:border-box;transition:background var(--ym-dur) var(--ym-ease),border-color var(--ym-dur) var(--ym-ease)}
.wr-name input:not(:disabled){background:var(--ym-bg-sunken);border-color:var(--ym-line)}
.wr-name input:focus{border-color:var(--tc)}
.wr-name input:focus-visible{outline:2px solid var(--tc);outline-offset:2px}
.wr-name input::placeholder{color:var(--ym-ink3)}
.wr-name button{display:grid;place-items:center;width:24px;height:24px;background:var(--ym-danger);border:none;border-radius:7px;color:var(--ym-on-accent);cursor:pointer;font-size:14px;line-height:1;flex-shrink:0}
.add-btn{display:inline-flex;align-items:center;gap:4px;margin-top:8px;font-size:12px;font-weight:600;cursor:pointer;color:var(--tc)}

/* ── Song card ── */
.sw-wrap{font-family:'Noto Serif SC','PingFang SC',serif;width:100%;max-width:100%;min-width:0;margin:0 auto 28px;color:var(--ym-ink)}
.sw-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
.sw-eyebrow{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--ym-ink3);margin-bottom:4px}
.sw-title{font-family:var(--ym-serif);font-size:23px;font-weight:400;color:var(--ym-ink);margin-bottom:3px;letter-spacing:.01em}
.sw-sub{font-size:11px;color:var(--ym-ink2)}
.sw-pills{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
.sw-pill{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.5px;padding:3px 9px;border-radius:5px;border:1px solid var(--ym-border);background:var(--ym-soft);color:var(--ym-ink2)}
.sw-tog{flex-shrink:0;display:inline-flex;align-items:center;gap:4px;padding:7px 13px;border-radius:10px;border:1px solid var(--ym-line);background:none;font-size:13px;font-weight:600;color:var(--ym-ink);cursor:pointer;box-shadow:none;transition:all .2s;white-space:nowrap;margin-top:2px}
.sw-tog:hover{background:var(--ym-soft);border-color:var(--ym-border-md)}
.sw-tog.on{background:var(--ym-accent);color:var(--ym-on-accent);border-color:transparent}
.sw-tog .sw-tog-arrow{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .24s cubic-bezier(.4,0,.2,1);margin-left:2px}
.sw-tog.on .sw-tog-arrow{transform:rotate(180deg)}
.sw-panel{max-height:0;overflow:hidden;transition:max-height .5s cubic-bezier(.4,0,.2,1)}
.sw-panel.open{max-height:9999px}
.sw-panel-inner{border-radius:0;border:0;border-top:1px solid var(--ym-line);border-bottom:1px solid var(--ym-line);background:none;box-shadow:none;overflow:hidden;margin-bottom:14px}
.sw-ks{padding:16px 16px 14px;border-bottom:1px solid var(--ym-border)}
.sw-slabel{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--ym-ink3);margin-bottom:12px}
.sw-kg{display:flex;flex-wrap:wrap;gap:9px 11px;align-items:center}
.sw-key-actions{margin-bottom:13px;gap:9px}
.sw-kb{font-family:'DM Mono',monospace;font-size:12px;padding:0 13px;border-radius:7px;border:1px solid var(--ym-border);background:transparent;color:var(--ym-ink2);cursor:pointer;transition:border-color .15s,background .15s,color .15s;min-width:42px;min-height:40px;text-align:center}
.sw-kb:hover{border-color:var(--ym-border-md);color:var(--ym-ink);background:var(--ym-soft)}
.sw-kb.on{background:var(--ym-ink);color:var(--ym-bg);border-color:transparent;font-weight:600;box-shadow:0 12px 24px rgba(0,0,0,.16)}
.sw-capo{display:flex;align-items:center;gap:12px;padding:13px 16px;background:var(--ym-capo-bg);border-bottom:1px solid var(--ym-capo-ln);transition:all .2s}
.sw-capo.plain{background:var(--ym-soft);border-bottom-color:var(--ym-border)}
.sw-capo-t{font-size:13px;font-weight:600;color:var(--ym-capo);transition:color .2s}
.sw-capo.plain .sw-capo-t{color:var(--ym-ink)}
.sw-capo-s{font-size:11px;color:var(--ym-ink2);margin-top:1px}
.sw-capo-n{font-family:'DM Mono',monospace;font-size:21px;font-weight:500;color:var(--ym-capo);margin-left:auto;flex-shrink:0}
.sw-capo.plain .sw-capo-n{color:var(--ym-ink2);font-size:11px}
.sw-lb{padding:14px 16px 18px}
.sw-lsec{margin-bottom:20px}.sw-lsec:last-child{margin-bottom:0}
.sw-lsec-name{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:var(--ym-ink3);margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sw-lsec-name::after{content:'';flex:1;height:1px;background:var(--ym-border)}
.sw-lline{margin-bottom:12px}.sw-lline:last-child{margin-bottom:0}
.sw-lrow{display:flex;flex-wrap:nowrap;align-items:flex-end;overflow:visible}
.sw-seg{display:inline-flex;flex-direction:column;align-items:flex-start;margin-right:4px;margin-bottom:5px}
.sw-chord{font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:var(--ym-chord-ink, var(--ym-capo));margin-bottom:3px;min-height:15px;white-space:pre}
.sw-chord.empty{visibility:hidden}
.sw-jianpu{font-family:'DM Mono',monospace;color:var(--ym-ink);margin-bottom:2px;display:flex;align-items:flex-end;line-height:1}
.sw-lyric{font-size:22px;color:var(--ym-ink2);white-space:pre;letter-spacing:.5px}
.sw-lyric2{display:block;font-size:22px;opacity:0.6;margin-top:1px}.sw-lyric3{display:block;font-size:22px;opacity:0.6;margin-top:1px}.sw-lyric4{display:block;font-size:22px;opacity:0.6;margin-top:1px}
.prev-row{--volta-rail:0px;--volta-top:2px;--row-note-height:0px;display:flex;flex-wrap:nowrap;align-items:flex-end;margin-bottom:10px;overflow:visible;padding-top:0;padding-bottom:2px}
.prev-row.has-volta{--volta-rail:0px}
.prev-row.has-volta .p-n{margin-top:var(--volta-rail)}
.prev-seg{display:inline-flex;flex-direction:column;align-items:flex-start;margin-right:4px;flex-shrink:0}
.p-chord{font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:var(--ym-chord-ink, var(--ym-capo));margin-bottom:2px;min-height:13px;white-space:pre}
.p-chord.empty{visibility:hidden}
.p-n{font-family:'Space Mono',monospace;color:var(--ym-ink);margin-bottom:1px;line-height:1.2;display:flex;align-items:flex-end;min-height:var(--row-note-height)}
.p-lyric{min-height:var(--row-lyric-height,0px);font-family:'Noto Serif SC',serif;font-size:18px;font-weight:600;color:var(--ym-ink);white-space:pre-wrap}
/* 加粗＝真的更重一档。字体常只有 400/700 两个字重，700→800 可能一点变化都没有，
   所以再叠一层极细的横向 text-shadow 兜底（html2canvas 也认 text-shadow）。 */
.p-lyric.bold{font-weight:800;text-shadow:.32px 0 0 currentColor,-.32px 0 0 currentColor}
.p-lyric2,.p-lyric3,.p-lyric4{margin-top:1px}
.p-lyric2{color:var(--ym-ly2)}.p-lyric3{color:var(--ym-ly3)}.p-lyric4{color:var(--ym-ly4)}
.chord-gap,
.lyric-gap{display:inline-block;white-space:pre;visibility:hidden;pointer-events:none;font:inherit;line-height:inherit}
.prev-volta{display:inline-flex;align-items:flex-end;position:relative}
.prev-volta::before{content:'';position:absolute;top:calc(var(--volta-top,2px) - var(--volta-rail,0px));left:0;right:0;height:10px;border-top:1.5px solid var(--ym-ink2);border-left:1.5px solid var(--ym-ink2);pointer-events:none;box-sizing:border-box}
.prev-volta.closed::before{border-right:1.5px solid var(--ym-ink2)}
.prev-volta::after{content:attr(data-v);position:absolute;top:calc(var(--volta-top,2px) + 1px - var(--volta-rail,0px));left:3px;font-size:8px;line-height:1;color:var(--ym-ink2);pointer-events:none;font-family:'DM Mono',monospace}
.jp-wrap{display:inline-flex;flex-direction:column;align-items:center;vertical-align:bottom;min-width:1em}
.jp-plain{display:inline-flex;flex-direction:column;align-items:center;vertical-align:bottom;min-width:1em}
.jp-plain-top{height:12px}.jp-plain-sym{font-size:15px;line-height:1;text-align:center;display:inline-flex;align-items:center;justify-content:center;width:1em;height:1em}.jp-plain-sym.is-dash{position:relative;top:-0.12em}.jp-plain-bot{height:16px}
.jp-dot-top,.jp-dot-bot{width:1em;font-size:16px;line-height:.563;color:var(--ym-ink);text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px;position:relative}
.jp-dot-top{height:8px;justify-content:flex-end;top:-2px}.jp-dot-bot{height:8px;justify-content:flex-start}
/* 八度点画成 CSS 实心圆：比字形的 · 更粗更清楚，尺寸与水平对中都不受字体影响 */
.jp-dot-top>span,.jp-dot-bot>span{display:block;width:4px;height:4px;border-radius:50%;background:currentColor;font-size:0;line-height:0;flex:0 0 auto}
/* 低音点贴近数字；有减时线(8分/16分)时改为贴近下划线。只用 top 位移，盒高恒定 → 不影响整体排版 */
.jp-wrap .jp-dot-bot{top:-10.5px}
.jp-wrap:has(.jp-u1-line) .jp-dot-bot{top:-1px}
.jp-wrap:has(.jp-u2-line) .jp-dot-bot{top:2px}
.jp-lines-wrap{width:1em;display:inline-flex;flex-direction:column;align-items:stretch;padding-bottom:4px;position:relative}
.jp-num-row{width:1em;display:inline-flex;align-items:center;justify-content:center;position:relative;padding-bottom:3px}
.jp-num{font-size:19px;line-height:1;display:inline-flex;align-items:center;justify-content:center;text-align:center;width:1em;height:1em;position:relative;top:-0.12em}
/* 附点/延音点：同款实心圆；上下对准数字墨迹中心，左右保持原来的间距 */
.jp-aug{position:absolute;right:-4.42px;top:50%;transform:translateY(-50%) translateY(0.5px);width:4px;height:4px;border-radius:50%;background:currentColor;font-size:0;line-height:0;pointer-events:none}
.jp-u1-line{display:block;position:absolute;left:0;right:0;bottom:3px;height:1.5px;background:var(--ym-ink);pointer-events:none;z-index:1}
.jp-u2-line{display:block;position:absolute;left:0;right:0;bottom:0;height:1.5px;background:var(--ym-ink);pointer-events:none;z-index:1}
.jp-fermata{display:inline-flex;flex-direction:column;align-items:center;vertical-align:bottom;position:relative;padding-top:18px}
.jp-fermata::before{content:'';position:absolute;top:2px;left:50%;transform:translateX(-50%);width:14px;height:7px;border-top:2px solid currentColor;border-left:2px solid currentColor;border-right:2px solid currentColor;border-radius:7px 7px 0 0/7px 7px 0 0;pointer-events:none;box-sizing:border-box}
.jp-fermata::after{content:'';position:absolute;top:9px;left:50%;transform:translateX(-50%);width:3.5px;height:3.5px;border-radius:50%;background:currentColor;pointer-events:none}
.jp-dual{display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-end;vertical-align:bottom;line-height:1;margin:0 .04em}
.jp-dual-top,.jp-dual-bot{display:inline-flex;align-items:flex-end}
.jp-dual-top{margin-bottom:-5px}
.jp-dual-top .jp-dot-bot{height:2px}
.jp-dual-bot .jp-dot-top{height:2px}
.jp-dual .jp-dual-top .jp-dot-bot,.jp-dual .jp-dual-bot .jp-dot-top{top:0}
.jp-slur{display:inline-flex;align-items:flex-end;position:relative;padding-top:var(--slur-pad,12px)}
.jp-slur::before{content:'';position:absolute;top:var(--jp-nav-arc-top,2px);left:15%;right:15%;height:8px;border-top:1.5px solid var(--ym-ink);border-left:1.5px solid var(--ym-ink);border-right:1.5px solid var(--ym-ink);border-radius:50% 50% 0 0/100% 100% 0 0}
.jp-slur-open{display:inline-flex;align-items:flex-end;position:relative;padding-top:var(--slur-pad,12px)}
.jp-slur-open::before{content:'';position:absolute;top:var(--jp-nav-arc-top,2px);left:15%;right:-4px;height:8px;border-top:1.5px solid var(--ym-ink);border-left:1.5px solid var(--ym-ink);border-radius:50% 0 0 0/100% 0 0 0}
.jp-slur-close{display:inline-flex;align-items:flex-end;position:relative;padding-top:var(--slur-pad,12px)}
.jp-slur-close::before{content:'';position:absolute;top:var(--jp-nav-arc-top,2px);left:-4px;right:15%;height:8px;border-top:1.5px solid var(--ym-ink);border-right:1.5px solid var(--ym-ink);border-radius:0 50% 0 0/0 100% 0 0}
.jp-tie{display:inline-flex;width:0;height:0;position:relative;overflow:visible;pointer-events:none}
.jp-tie::before{content:'';position:absolute;left:var(--tie-l,-0.75em);top:var(--tie-t,-34px);width:var(--tie-w,1.5em);height:8px;border-top:1.5px solid var(--ym-ink);border-left:1.5px solid var(--ym-ink);border-right:1.5px solid var(--ym-ink);border-radius:50% 50% 0 0/100% 100% 0 0}
.jp-tuplet{display:inline-flex;align-items:flex-end;position:relative;padding-top:var(--slur-pad,12px);margin-right:1px}
.jp-tuplet-br{position:absolute;top:2px;left:2px;right:2px;height:8px;border-top:1.5px solid var(--ym-ink);border-left:1.5px solid var(--ym-ink);border-right:1.5px solid var(--ym-ink);border-radius:3px 3px 0 0;pointer-events:none}
.jp-tuplet-num{position:absolute;top:-1px;left:50%;transform:translateX(-50%);font-size:8px;line-height:1;padding:0 3px;background:var(--ym-bg);color:var(--ym-ink);pointer-events:none}
.jp-timesig{display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-end;vertical-align:bottom;flex-shrink:0;min-width:1.42em;margin:0 5px 0 2px;position:relative;top:-1px;line-height:1}
.jp-timesig-pad{display:block;width:100%;flex-shrink:0}
.jp-timesig-pad-top{height:2px}
.jp-timesig-pad-bot{height:3px}
.jp-timesig-stack{display:inline-flex;flex-direction:column;align-items:stretch;justify-content:center;min-width:1.42em;line-height:1}
.jp-timesig-top,.jp-timesig-bot{display:flex;align-items:center;justify-content:center;min-width:1.42em;text-align:center;font-size:18px;font-weight:700;line-height:1}
.jp-timesig-top{padding:0 1px 2px;border-bottom:1.6px solid currentColor;margin-bottom:1px}
.jp-timesig-bot{padding-top:0}
.jp-volta{display:inline-flex;align-items:flex-end;position:relative;padding-top:0}
.jp-volta::before{content:'';position:absolute;top:var(--jp-volta-top,3px);left:0;right:0;height:10px;border-top:1.5px solid var(--ym-ink2);border-left:1.5px solid var(--ym-ink2);pointer-events:none;box-sizing:border-box}
.jp-volta.v-close::before{border-right:1.5px solid var(--ym-ink2)}
.jp-volta::after{content:attr(data-v);position:absolute;top:calc(var(--jp-volta-top,3px) + 1px);left:3px;font-size:8px;line-height:1;color:var(--ym-ink2);pointer-events:none;font-family:'DM Mono',monospace}
.sw-tools{display:flex;justify-content:center;margin:14px 0}
.sw-tools-row{display:inline-flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;padding:0;border-radius:0;background:none;border:0;box-shadow:none}
.sw-export-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;padding:8px 14px;border-radius:8px;border:1px solid var(--ym-line);background:none;color:var(--ym-ink);font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:.02em;line-height:1;cursor:pointer;text-decoration:none;box-shadow:none;transition:border-color .15s,background .15s,opacity .15s}
.sw-export-btn:hover,.sw-export-btn:focus-visible{border-color:var(--ym-border-md);background:var(--ym-accent-subtle)}
.sw-export-btn:disabled{cursor:default;transform:none}
.sw-export-btn svg{width:15px;height:15px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.yt-btn{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:var(--ym-youtube);color:#fff;text-decoration:none;transition:transform .15s,box-shadow .15s,background .15s;box-shadow:0 3px 10px rgba(255,0,51,.28)}
.yt-btn:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(255,0,51,.36);background:var(--ym-youtube-hover)}
.yt-btn svg{width:22px;height:22px;display:block;overflow:visible}
.yt-btn svg .yt-screen{fill:#fff!important}
.yt-btn svg .yt-play{fill:var(--ym-youtube)!important}
.sw-metro{position:relative;display:inline-flex;align-items:center;gap:7px;user-select:none;cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,.25))}
.sw-metro .mbg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:0;font-size:40px;font-weight:600;pointer-events:none;color:rgba(130,130,130,.9);text-shadow:0 1px 2px rgba(0,0,0,.55)}
.sw-metro .mleaf{position:relative;z-index:1;font-size:13px;opacity:.45;transition:opacity .15s,transform .15s}
.sw-metro .mleaf.active{opacity:.85;transform:scale(1.1)}
.sw-metro .msettings{position:absolute;top:120%;left:0;z-index:99;background:var(--ym-card);padding:12px;border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.25);display:none;min-width:170px;border:1px solid var(--ym-border)}
.sw-metro .mrow{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.sw-metro input.mbpm{width:58px;font-size:15px;text-align:center;border-radius:9px;border:1px solid var(--ym-border);padding:3px 5px;background:var(--ym-soft);color:var(--ym-ink)}
.sw-metro button{font-size:14px;padding:4px 10px;border-radius:9px;border:none;background:var(--ym-soft);cursor:pointer;color:var(--ym-ink)}
.sw-metro .mstop-btn{background:var(--ym-ink);color:var(--ym-bg)}
.sw-score{border-radius:0;border:0;border-top:1px solid var(--ym-line);border-bottom:1px solid var(--ym-line);background:none;box-shadow:none;overflow:visible;margin-top:4px}
.sw-score-top{padding:10px 14px;border-bottom:1px solid var(--ym-border);display:flex;align-items:center;justify-content:space-between}
.sw-score-lbl{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--ym-ink3)}
.sw-score-key{font-family:'DM Mono',monospace;font-size:10px;color:var(--ym-ink2);background:var(--ym-soft);border:1px solid var(--ym-border);padding:2px 7px;border-radius:5px}
.sw-score img{width:100%;display:block;cursor:zoom-in}
.sw-score-ph{padding:40px 20px;text-align:center;font-family:'DM Mono',monospace;font-size:10px;color:var(--ym-ink3);letter-spacing:1px;line-height:2.2}

/* ── Copy pill ── */
.ym-copy-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:8px;background:none;border:1px solid var(--ym-line);cursor:pointer;user-select:none;transition:background .15s,border-color .15s;box-shadow:none}
.ym-copy-pill:hover{background:var(--ym-soft)}
.ym-copy-pill .st{font-size:14px;color:var(--ym-ink);white-space:nowrap}
.ym-copy-pill svg{color:var(--ym-ink2)}
.ym-song-list{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:1rem}

/* ── Lightbox ── */
.sw-lb-overlay{position:fixed;inset:0;z-index:var(--ym-z-lightbox);display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);backdrop-filter:blur(10px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s,visibility .25s;padding:18px}
.sw-lb-overlay.open{opacity:1;visibility:visible;pointer-events:auto}
.sw-lb-box{position:relative;max-width:95vw;max-height:95vh;transform:scale(.92);transition:transform .28s cubic-bezier(.22,1,.36,1)}
.sw-lb-overlay.open .sw-lb-box{transform:scale(1)}
.sw-lb-img{max-width:95vw;max-height:95vh;border-radius:12px;display:block;box-shadow:0 12px 40px rgba(0,0,0,.4)}
.sw-lb-close{position:absolute;top:-44px;right:0;border:0;background:rgba(0,0,0,.4);color:#fff;width:34px;height:34px;border-radius:999px;cursor:pointer;display:grid;place-items:center;font-size:16px}
.sw-lb-close:hover{background:rgba(0,0,0,.6)}
.sw-lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:999px;border:0;background:rgba(0,0,0,.45);color:#fff;display:grid;place-items:center;font-size:24px;cursor:pointer}
.sw-lb-nav:hover{background:rgba(0,0,0,.65)}
.sw-lb-nav.prev{left:-52px}.sw-lb-nav.next{right:-52px}
@media(max-width:520px){.sw-lb-nav.prev{left:8px}.sw-lb-nav.next{right:8px}.sw-lb-close{top:8px;right:8px}}

/* ── Section dividers & misc ── */
hr.ym-hr{border:none;margin:1.2rem 0;background:none}
.ym-section-title{position:relative;font-size:1.3rem;font-weight:800;color:var(--ym-ink);margin:1.5rem 0 .8rem;display:flex;align-items:center;gap:10px;line-height:1.25}
.ym-section-title::after{content:'';height:1px;flex:1;min-width:32px;background:linear-gradient(90deg,var(--ym-line),transparent)}
.ym-section-title.is-featured{font-size:1.52rem;font-weight:800;letter-spacing:.01em}
:root{--ym-panel-inset:20px}
.ym-block{max-width:100%;min-width:0;box-sizing:border-box;background:none;border:0;border-radius:0;padding:16px var(--ym-panel-inset);margin-bottom:1rem;box-shadow:none}
.ym-block.is-featured{border:0;box-shadow:none;background:none}
.ym-block.ym-message-soft{background:color-mix(in srgb,var(--ym-team-b) 4%,transparent);border-radius:8px}
.ym-block.ym-game-soft{background:color-mix(in srgb,#A36363 4%,transparent);border-radius:8px}
.ym-meta{font-size:14px;color:var(--ym-ink2);line-height:1.8}
.ym-meta.is-featured{font-size:15.5px;line-height:1.95;color:var(--ym-ink);font-weight:400}
.ym-meta strong{color:var(--ym-ink)}
.ym-feature-copy{margin:0;font-family:var(--ym-serif);font-size:16.5px;line-height:2.05;color:var(--ym-ink);font-weight:400}
.ym-meta-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px;margin:0;padding:13px 0;border-bottom:1px solid var(--ym-line-soft)}
.ym-meta-row:first-child{padding-top:0}
.ym-meta-row:last-child{padding-bottom:0;border-bottom:0}
.ym-meta-label{font-family:'DM Mono','SF Mono',ui-monospace,monospace;font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:none;color:var(--ym-ink3);flex:0 0 auto}
.ym-meta-value{font-family:var(--ym-serif);font-size:clamp(17px,4.4vw,20px);font-weight:400;color:var(--ym-ink);line-height:1.4}
.ppt-card{display:block;width:100%;box-sizing:border-box;margin:6px 0;border:1px solid var(--ym-line);border-radius:10px;overflow:hidden;background:var(--ym-bg-elevated);color:var(--ym-ink);text-decoration:none;transition:border-color var(--ym-dur) var(--ym-ease),background var(--ym-dur) var(--ym-ease),box-shadow var(--ym-dur) var(--ym-ease)}
.ppt-card:hover,.ppt-card:focus-visible{border-color:var(--ym-border-md);background:var(--ym-accent-subtle)}
.ppt-card:focus-visible{outline:2px solid var(--ym-accent);outline-offset:3px}
.ppt-card-details{display:flex;align-items:center;gap:14px;padding:16px calc(var(--ym-panel-inset) - 1px)}
.ppt-card-preview{position:relative;display:grid;place-items:center;width:100%;aspect-ratio:16/9;overflow:hidden;border-bottom:1px solid var(--ym-line);background:var(--ym-bg-elevated-2)}
.ppt-card-preview.is-ready{background:#fff}
.ppt-card-preview.is-unavailable{aspect-ratio:auto;min-height:210px}
.ppt-card-preview img,.ppt-card-preview canvas{display:block;width:100%;height:100%;object-fit:contain}
.ppt-preview-fallback{position:relative;isolation:isolate;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:14px;width:100%;min-height:inherit;box-sizing:border-box;padding:32px calc(var(--ym-panel-inset) - 1px);background:linear-gradient(125deg,var(--ym-bg-elevated-2),color-mix(in srgb,var(--ym-accent) 9%,var(--ym-bg-elevated)));color:var(--ym-ink3);font-size:12px;text-align:left}
.ppt-preview-fallback::after{content:'';position:absolute;z-index:-1;right:8%;top:22%;width:19%;height:57%;border:1px solid color-mix(in srgb,var(--ym-accent) 18%,transparent);border-radius:5px;background:linear-gradient(var(--ym-accent-subtle),var(--ym-accent-subtle)) 20% 25%/60% 2px no-repeat,linear-gradient(var(--ym-accent-subtle),var(--ym-accent-subtle)) 20% 40%/45% 2px no-repeat,var(--ym-bg-elevated-2);box-shadow:8px 8px 0 color-mix(in srgb,var(--ym-accent) 5%,transparent);transform:rotate(-8deg);pointer-events:none}
.ppt-preview-eyebrow{display:flex;align-items:center;gap:8px;color:var(--ym-accent);font-size:11px;font-weight:600;letter-spacing:.12em}
.ppt-preview-eyebrow .ym-ic{width:18px;height:18px}
.ppt-preview-title{max-width:74%;font-family:var(--ym-serif);font-size:clamp(23px,4.5vw,34px);line-height:1.45;color:var(--ym-ink);overflow-wrap:anywhere}
@media(max-width:480px){.ppt-preview-fallback{padding-top:26px;padding-bottom:26px}.ppt-card-preview.is-unavailable{min-height:190px}}
.ppt-preview-badge{position:absolute;right:12px;bottom:12px;padding:5px 9px;border-radius:5px;background:rgba(25,38,50,.78);color:#fff;font-size:11px;line-height:1.4;pointer-events:none}
.ppt-card:hover .ppt-card-s,.ppt-card:focus-visible .ppt-card-s{color:var(--ym-ink2)}
.ppt-card-ic{display:grid;place-items:center;width:40px;height:40px;flex:0 0 auto;border-radius:9px;color:var(--ym-accent);background:var(--ym-accent-subtle);font-size:19px}
.ppt-card-main{display:block;flex:1 1 auto;min-width:0}
.ppt-card-t{display:block;font-family:var(--ym-serif);font-size:16.5px;color:var(--ym-ink);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ppt-card-s{display:block;font-size:12px;color:var(--ym-ink3);margin-top:3px}
.ppt-card-arrow{flex:0 0 auto;color:var(--ym-ink3);font-size:15px;transition:transform var(--ym-dur) var(--ym-ease),color var(--ym-dur) var(--ym-ease)}
.ppt-card:hover .ppt-card-arrow,.ppt-card:focus-visible .ppt-card-arrow{transform:translateX(3px);color:var(--ym-accent)}
.ppt-download-link{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:8px;background:none;border:1px solid var(--ym-line);color:var(--ym-ink);text-decoration:none;font-size:14px;font-weight:500;transition:border-color .15s,background .15s}
.ppt-download-link:hover,.ppt-download-link:focus-visible{border-color:var(--ym-border-md);background:var(--ym-accent-subtle)}
.ppt-empty,.replay-tip{color:var(--ym-ink2);font-size:14px;padding:20px 0}
.ym-iframe-wrap{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px}
.ym-iframe-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:14px}
.ym-action{box-sizing:border-box;margin:2.4rem 0;padding:16px var(--ym-panel-inset);border:0;box-shadow:inset 2px 0 0 var(--ym-accent);background:color-mix(in srgb,var(--ym-accent) 4%,transparent);border-radius:8px;font-family:var(--ym-serif);font-size:15.5px;line-height:2;color:var(--ym-ink)}
.ym-action strong{color:var(--ym-ink)}

/* ── Song selector tabs ── */
.ym-songs-wrap{width:100%}
.ym-song-tabs{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px 24px;margin-bottom:1.2rem;padding:0 0 2px;border-radius:0;background:none;border:0;border-bottom:1px solid var(--ym-line-soft);box-shadow:none}
.ym-song-tab{position:relative;display:inline-flex;align-items:center;gap:8px;padding:5px 0 7px;border-radius:0;border:0;background:none;color:var(--ym-ink);font-size:15px;cursor:pointer;transition:color var(--ym-dur) var(--ym-ease);text-align:left;max-width:100%;box-shadow:none}
.ym-song-tab:hover .ym-song-tab-title{color:var(--ym-accent)}
.ym-song-tab.active{background:none;color:var(--ym-ink);box-shadow:none}
.ym-song-tab.active .ym-song-tab-num,.ym-song-tab.active .ym-song-tab-title{color:var(--ym-accent)}
.ym-song-tab.active::after{content:'';position:absolute;left:0;right:0;bottom:-2px;height:2px;border-radius:1px;background:var(--ym-accent)}
.ym-song-tab-num{display:inline-flex;align-items:center;justify-content:center;width:auto;min-width:0;height:auto;border-radius:0;background:none;font-family:'DM Mono','SF Mono',ui-monospace,monospace;font-size:13px;font-weight:500;color:var(--ym-ink3);flex-shrink:0}
.ym-song-tab-title{font-family:var(--ym-serif);font-size:17.5px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(56vw,280px);flex:0 1 auto;min-width:0}
.ym-song-tab-copy{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;flex-shrink:0;opacity:.5;transition:opacity .15s,background .15s}
.ym-song-tab-copy:hover{opacity:1;background:var(--ym-soft)}
.ym-song-panel{display:none}
.ym-song-panel.active{display:block;min-width:0}
@media(max-width:640px){
  .ym-mast{padding:22px 0 16px}
  .ym-song-tabs{display:flex;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;align-items:center;gap:18px;padding:0 0 4px;border-radius:0;border-bottom:1px solid var(--ym-line-soft)}
  .ym-song-tabs::-webkit-scrollbar{display:none}
  .ym-song-tab{flex-shrink:0;max-width:none;padding:5px 0 7px}
  .sw-hd{flex-direction:column;align-items:stretch;gap:10px}
  .sw-tog{align-self:flex-start;max-width:100%}
  .sw-tools-row{max-width:100%}
  .sw-score-top{gap:10px;flex-wrap:wrap}
  :root{--ym-panel-inset:16px}
}
`;
    document.head.appendChild(style);
  } // end _injectCSS

  /* ══════════════ Utility ══════════════ */
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k){
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    if (children) children.forEach(function(c){ if(c) e.appendChild(c); });
    return e;
  }
  function div(cls, children){ return el('div',{class:cls},children); }

  /* ══════════════ Animated inline icons (Tabler/Lucide-style, stroke=currentColor) ══════════════ */
  var YM_ICON_SVG = {
    clock:'<circle cx="12" cy="12" r="8.4"/><g class="ym-ic-hand"><path d="M12 7.4V12l3.1 1.9"/></g>',
    music:'<circle cx="7" cy="17.5" r="2.3"/><circle cx="17.5" cy="15.5" r="2.3"/><path d="M9.3 17.5V6l10.2-2.2v11.7"/><path d="M9.3 8.4 19.5 6.2"/>',
    book:'<path d="M12 6.4C10.4 5.3 8.3 5 6 5.2 4.9 5.3 4 6.2 4 7.3v9.5c0 1 .9 1.8 2 1.7 2-.2 4.3.1 6 1.3 1.7-1.2 4-1.5 6-1.3 1.1.1 2-.7 2-1.7V7.3c0-1.1-.9-2-2-2.1-2.3-.2-4.4.1-6 1.2Z"/><path d="M12 6.4V18"/>',
    pray:'<path d="M12 20.5c-1.1-1.9-1.9-3.3-1.9-6.3V6.6a1.45 1.45 0 0 1 2.9 0v5.2"/><path d="M12 20.5c1.1-1.9 1.9-3.3 1.9-6.3V6.6a1.45 1.45 0 0 0-2.9 0v5.2"/><path d="M10.1 12.4 7.6 13.6a2 2 0 0 0-1.1 2.3l.6 2.4M13.9 12.4l2.5 1.2a2 2 0 0 1 1.1 2.3l-.6 2.4"/>',
    mic:'<rect x="9" y="2.8" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><path d="M12 17v4M9 21h6"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3.6 20a5.4 5.4 0 0 1 10.8 0"/><path d="M16 5.3a3 3 0 0 1 0 5.4M17.4 20a5.4 5.4 0 0 0-2.9-4.8"/>',
    piano:'<rect x="3.5" y="4.8" width="17" height="14.4" rx="2.6"/><path d="M8.3 4.8v8.8M12 4.8v8.8M15.7 4.8v8.8"/><path d="M3.5 13.6h17"/>',
    drum:'<ellipse cx="12" cy="8" rx="8" ry="3"/><path d="M4 8v6c0 1.7 3.6 3 8 3s8-1.3 8-3V8"/><path d="M12 11.2v5.7M9.2 17 6.6 20.7M14.8 17l2.6 3.7"/>',
    guitar:'<circle cx="9.2" cy="14.8" r="4.6"/><circle cx="9.2" cy="14.8" r="1.3"/><path d="M12.4 11.6 17 7a1.7 1.7 0 0 0-2.4-2.4l-4.6 4.6"/><path d="M14.4 6.2 16.4 8.2"/>',
    sliders:'<path d="M5 7h14M5 12h14M5 17h14"/><circle cx="9" cy="7" r="2.1"/><circle cx="15.5" cy="12" r="2.1"/><circle cx="7.8" cy="17" r="2.1"/>',
    screen:'<rect x="3" y="4.6" width="18" height="11.4" rx="2.2"/><path d="M8.5 20h7M12 16v4"/>',
    clipboard:'<rect x="5" y="4.5" width="14" height="16" rx="2.6"/><rect x="9" y="2.8" width="6" height="3.4" rx="1.2"/><path d="M8.5 11.5h7M8.5 15h4.6"/>',
    calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 9.6h17M8 3v4M16 3v4"/>',
    video:'<rect x="3" y="5.5" width="18" height="13" rx="2.6"/><path d="m10.4 9.4 4.7 2.6-4.7 2.6z"/>',
    game:'<rect x="2.5" y="7.5" width="19" height="9" rx="4.5"/><path d="M6.6 10.6v2.8M5.2 12h2.8M14.8 11.2h.02M17.2 13.2h.02"/>',
    present:'<rect x="3.5" y="4.5" width="17" height="11" rx="2.2"/><path d="M12 15.5V19M8.5 19h7M7.6 8.3h8.8M7.6 11.4h5.2"/>',
    headphones:'<path d="M5 13a7 7 0 0 1 14 0"/><path d="M5 13v4a2 2 0 0 0 2 2h1v-6.5H7A2 2 0 0 0 5 13Z"/><path d="M19 13v4a2 2 0 0 1-2 2h-1v-6.5h1A2 2 0 0 1 19 13Z"/>'
  };
  var YM_EMOJI_ICON = {
    '🕒':'clock','🕐':'clock','⏰':'clock','⏱':'clock',
    '🎶':'music','🎵':'music','🎼':'music','🎧':'music',
    '📖':'book','📕':'book','📗':'book','📘':'book','📚':'book',
    '🙏':'pray','🤲':'pray',
    '🎤':'mic','🎙':'mic',
    '👥':'users','🧑':'users','👤':'users',
    '🎹':'piano',
    '🥁':'drum',
    '🎸':'guitar',
    '🎛':'sliders','🎚':'sliders',
    '💻':'screen','🖥':'screen','📽':'screen','📺':'screen',
    '📋':'clipboard','📝':'clipboard',
    '📅':'calendar','🗓':'calendar',
    '🎬':'video','🎞':'video','▶':'video',
    '🎮':'game','🕹':'game',
    '📑':'present','📊':'present','📽':'present',
    '🎧':'headphones'
  };
  // Which hover animation each icon plays (on control :hover only; clock uses its inner <g class=ym-ic-hand>)
  var YM_ICON_HOVER = {
    music:'ym-ic-bob', book:'ym-ic-sway', pray:'ym-ic-pulse', mic:'ym-ic-bob',
    drum:'ym-ic-pulse', guitar:'ym-ic-sway', piano:'ym-ic-bob',
    sliders:'ym-ic-pulse', screen:'ym-ic-pulse', users:'ym-ic-bob', clipboard:'ym-ic-sway',
    calendar:'ym-ic-pulse', video:'ym-ic-pulse', game:'ym-ic-sway', present:'ym-ic-bob', headphones:'ym-ic-bob'
  };
  function ymIconName(key){
    if(!key) return null;
    var k = String(key).replace(/[️‍]/g,'');
    if(YM_ICON_SVG[k]) return k;
    if(YM_EMOJI_ICON[k]) return YM_EMOJI_ICON[k];
    // take the first emoji cluster if a longer string slipped in
    var first = k.match(/[\p{Extended_Pictographic}]/u);
    if(first && YM_EMOJI_ICON[first[0]]) return YM_EMOJI_ICON[first[0]];
    return null;
  }
  function ymIcon(key, extraCls){
    var name = ymIconName(key);
    if(!name) return null;
    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');
    var hov = YM_ICON_HOVER[name];
    svg.setAttribute('class','ym-ic'+(hov?' '+hov:'')+(extraCls?' '+extraCls:''));
    svg.setAttribute('aria-hidden','true');
    svg.innerHTML = YM_ICON_SVG[name];
    return svg;
  }
  // Split a leading emoji off a label, e.g. "🎙️ 主领" -> {emoji:'🎙️', text:'主领'}
  function ymSplitLabel(s){
    s = String(s==null?'':s);
    var m = s.match(/^\s*((?:[\p{Extended_Pictographic}️‍])+)\s*(.*)$/u);
    if(m) return {emoji:m[1], text:m[2].trim()};
    return {emoji:'', text:s.trim()};
  }
  // Duration between the two times in a range string like "12:00 – 12:30" -> "30 分钟"
  function ymParseDur(t){
    if(!t) return '';
    var m = String(t).replace(/\s/g,'').match(/(\d{1,2}):(\d{2})[^\d]+(\d{1,2}):(\d{2})/);
    if(!m) return '';
    var d = (+m[3]*60 + +m[4]) - (+m[1]*60 + +m[2]);
    if(d<=0) return '';
    var h = Math.floor(d/60), mi = d%60;
    return (h ? h+' 小时' : '') + (mi ? mi+' 分钟' : '');
  }
  // Icon element from an emoji, else a <span> fallback rendering the emoji glyph
  function ymIconOrEmoji(emoji, extraCls){
    var ic = ymIcon(emoji, extraCls);
    if(ic) return ic;
    if(emoji) return el('span',{class:'ym-emoji'+(extraCls?' '+extraCls:''),text:emoji});
    return null;
  }

  function safeFileName(name){
    return String(name||'song')
      .trim()
      .replace(/[\\/:*?"<>|]+/g,'-')
      .replace(/\s+/g,'_')
      .replace(/\.+$/,'')
      .slice(0,80) || 'song';
  }

  function escapeHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  var _h2cPromise=null;
  function loadHtml2Canvas(){
    if(window.html2canvas) return Promise.resolve(window.html2canvas);
    if(_h2cPromise) return _h2cPromise;
    _h2cPromise=new Promise(function(resolve,reject){
      function inject(src,next){
        var s=document.createElement('script');
        s.src=src;
        s.async=true;
        s.onload=function(){
          if(window.html2canvas) resolve(window.html2canvas);
          else if(next) inject(next,null);
          else reject(new Error('html2canvas unavailable'));
        };
        s.onerror=function(){
          s.remove();
          if(next) inject(next,null);
          else reject(new Error('html2canvas load failed'));
        };
        document.head.appendChild(s);
      }
      inject(
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
      );
    });
    return _h2cPromise;
  }

  function canvasToPngBlob(canvas){
    return new Promise(function(resolve,reject){
      if(canvas.toBlob){
        canvas.toBlob(function(blob){
          if(blob) resolve(blob);
          else reject(new Error('png conversion failed'));
        },'image/png');
      }else{
        try{
          var dataUrl=canvas.toDataURL('image/png');
          var bin=atob(dataUrl.split(',')[1]||'');
          var arr=new Uint8Array(bin.length);
          for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
          resolve(new Blob([arr],{type:'image/png'}));
        }catch(err){ reject(err); }
      }
    });
  }

  function parseRgba(str){
    var m=String(str||'').match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if(!m) return null;
    return {r:+m[1],g:+m[2],b:+m[3],a:(m[4]===undefined?1:+m[4])};
  }

  function resolveExportBackground(node,preferred){
    if(preferred) return preferred;
    var cur=node;
    while(cur&&cur.nodeType===1){
      var c=getComputedStyle(cur).backgroundColor;
      var p=parseRgba(c);
      if(p&&p.a>0.98) return c;
      cur=cur.parentElement;
    }
    var bodyBg=getComputedStyle(document.body||document.documentElement).backgroundColor;
    var bp=parseRgba(bodyBg);
    if(bp&&bp.a>0.2) return bodyBg;
    return '#ffffff';
  }

  function nodeToPngBlobByHtml2Canvas(node,bgColor,opts){
    return loadHtml2Canvas().then(function(html2canvas){
      var dpr=Math.max(1,window.devicePixelRatio||1);
      var scale=(opts&&isFinite(opts.scale)&&opts.scale>0)?opts.scale:Math.min(2,dpr);
      return html2canvas(node,{
        backgroundColor:bgColor||'#ffffff',
        scale:scale,
        foreignObjectRendering:false,
        useCORS:true,
        logging:false
      });
    }).then(canvasToPngBlob);
  }

  function cloneWithComputedStyle(node){
    var cloned=node.cloneNode(true);
    function sync(src,dst){
      if(!src||!dst) return;
      if(src.nodeType===1&&dst.nodeType===1){
        var cs=getComputedStyle(src);
        for(var i=0;i<cs.length;i++){
          var prop=cs[i];
          dst.style.setProperty(prop,cs.getPropertyValue(prop),cs.getPropertyPriority(prop));
        }
      }
      var sKids=src.childNodes||[];
      var dKids=dst.childNodes||[];
      for(var k=0;k<sKids.length;k++){
        if(dKids[k]) sync(sKids[k],dKids[k]);
      }
    }
    sync(node,cloned);
    return cloned;
  }

  function nodeToPngBlob(node,bgColor){
    return new Promise(function(resolve,reject){
      if(!node){ reject(new Error('empty node')); return; }
      var rect=node.getBoundingClientRect();
      var width=Math.max(1,Math.ceil(rect.width));
      var height=Math.max(1,Math.ceil(rect.height));
      var snap=cloneWithComputedStyle(node);
      snap.style.width=width+'px';
      snap.style.maxWidth='none';
      var html=new XMLSerializer().serializeToString(snap);
      var bg=bgColor||'transparent';
      var foreign=[
        '<div xmlns="http://www.w3.org/1999/xhtml" style="width:'+width+'px;height:'+height+'px;background:'+bg+';">',
        html,
        '</div>'
      ].join('');
      var svg=[
        '<svg xmlns="http://www.w3.org/2000/svg" width="',width,'" height="',height,'" viewBox="0 0 ',width,' ',height,'">',
        '<foreignObject width="100%" height="100%">',foreign,'</foreignObject>',
        '</svg>'
      ].join('');

      var svgBlob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
      var svgUrl=URL.createObjectURL(svgBlob);
      var img=new Image();

      img.onload=function(){
        URL.revokeObjectURL(svgUrl);
        var maxSide=4096;
        var scale=Math.min(2,maxSide/width,maxSide/height);
        if(!isFinite(scale)||scale<=0) scale=1;
        var canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(width*scale));
        canvas.height=Math.max(1,Math.round(height*scale));
        var ctx=canvas.getContext('2d');
        if(!ctx){ reject(new Error('canvas unavailable')); return; }
        if(bg!=='transparent'){ ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height); }
        ctx.setTransform(scale,0,0,scale,0,0);
        ctx.drawImage(img,0,0,width,height);
        canvasToPngBlob(canvas).then(resolve).catch(reject);
      };
      img.onerror=function(){
        URL.revokeObjectURL(svgUrl);
        reject(new Error('svg render failed'));
      };
      img.src=svgUrl;
    });
  }

  function nodeToPngBlobByTextFallback(node,bgColor){
    return new Promise(function(resolve,reject){
      try{
        var entries=[];
        var secs=node.querySelectorAll('.sw-lsec');
        Array.prototype.forEach.call(secs,function(sec){
          var secName=(sec.querySelector('.sw-lsec-name')||{}).textContent||'';
          secName=secName.replace(/\s+/g,' ').trim();
          if(secName) entries.push({type:'sec',text:'['+secName+']'});
          Array.prototype.forEach.call(sec.querySelectorAll('.sw-lrow'),function(row){
            var chordLine='';
            var jianpuLine='';
            var lyricLine='';
            Array.prototype.forEach.call(row.querySelectorAll('.prev-seg'),function(seg){
              var chord=((seg.querySelector('.p-chord')||{}).textContent||'').replace(/\u00a0/g,' ');
              var jianpu=((seg.querySelector('.p-n')||{}).textContent||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
              var lyric=((seg.querySelector('.p-lyric')||{}).textContent||'').replace(/\u00a0/g,' ');
              chordLine+= (chord||' ') + '  ';
              jianpuLine+= (jianpu||' ') + '  ';
              lyricLine+= (lyric||' ') + '  ';
            });
            if(chordLine.trim()) entries.push({type:'chord',text:chordLine.trimEnd()});
            if(jianpuLine.trim()) entries.push({type:'jianpu',text:jianpuLine.trimEnd()});
            if(lyricLine.trim()) entries.push({type:'lyric',text:lyricLine.trimEnd()});
          });
          entries.push({type:'gap',text:''});
        });
        if(!entries.length) entries=[{type:'sec',text:'[Transpose]'}];

        function toLuma(color){
          var c=String(color||'').trim().toLowerCase();
          var r=255,g=255,b=255,m=null;
          m=c.match(/^#([0-9a-f]{3})$/i);
          if(m){
            r=parseInt(m[1].charAt(0)+m[1].charAt(0),16);
            g=parseInt(m[1].charAt(1)+m[1].charAt(1),16);
            b=parseInt(m[1].charAt(2)+m[1].charAt(2),16);
            return 0.2126*r+0.7152*g+0.0722*b;
          }
          m=c.match(/^#([0-9a-f]{6})$/i);
          if(m){
            r=parseInt(m[1].slice(0,2),16);
            g=parseInt(m[1].slice(2,4),16);
            b=parseInt(m[1].slice(4,6),16);
            return 0.2126*r+0.7152*g+0.0722*b;
          }
          m=c.match(/^rgba?\(([^)]+)\)$/i);
          if(m){
            var parts=m[1].split(',');
            if(parts.length>=3){
              r=parseFloat(parts[0])||0;
              g=parseFloat(parts[1])||0;
              b=parseFloat(parts[2])||0;
            }
          }
          return 0.2126*r+0.7152*g+0.0722*b;
        }
        var isDarkBg=toLuma(bgColor||'#ffffff')<140;

        function fontFor(type){
          if(type==='sec') return '700 18px "Noto Serif SC","PingFang SC",serif';
          if(type==='jianpu') return '700 18px "Space Mono","DM Mono",monospace';
          if(type==='lyric') return '500 19px "Noto Serif SC","PingFang SC",serif';
          return '700 14px "Space Mono","DM Mono",monospace';
        }
        function lhFor(type){
          if(type==='sec') return 30;
          if(type==='jianpu') return 26;
          if(type==='lyric') return 28;
          if(type==='gap') return 14;
          return 24;
        }
        function colorFor(type){
          if(type==='sec') return isDarkBg ? '#a6b3cf' : '#8a5a3b';
          if(type==='lyric'||type==='jianpu') return isDarkBg ? '#e5e7eb' : '#2d2a26';
          return isDarkBg ? '#f59e0b' : '#c2410c';
        }

        var pad=26;
        var measure=document.createElement('canvas').getContext('2d');
        var maxW=0,totalH=pad*2;
        entries.forEach(function(e){
          measure.font=fontFor(e.type);
          var w=measure.measureText(e.text||' ').width;
          if(w>maxW) maxW=w;
          totalH+=lhFor(e.type);
        });

        var canvas=document.createElement('canvas');
        canvas.width=Math.max(720,Math.ceil(maxW+pad*2));
        canvas.height=Math.max(480,Math.ceil(totalH));
        var ctx=canvas.getContext('2d');
        if(!ctx){ reject(new Error('canvas unavailable')); return; }
        ctx.fillStyle=bgColor||'#ffffff';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        var y=pad;
        entries.forEach(function(e){
          ctx.font=fontFor(e.type);
          ctx.fillStyle=colorFor(e.type);
          ctx.textBaseline='top';
          ctx.fillText(e.text||'',pad,y);
          y+=lhFor(e.type);
        });
        canvasToPngBlob(canvas).then(resolve).catch(reject);
      }catch(err){ reject(err); }
    });
  }

  function nodeToPngBlobRobust(node,bgColor,opts){
    return nodeToPngBlobByHtml2Canvas(node,bgColor,opts).catch(function(primaryErr){
      try{ console.warn('[YouthEngine] html2canvas export failed, fallback to svg',primaryErr); }catch(_){}
      return nodeToPngBlob(node,bgColor).catch(function(secondErr){
        try{ console.warn('[YouthEngine] svg export failed, fallback to text canvas',secondErr); }catch(_){}
        return nodeToPngBlobByTextFallback(node,bgColor);
      });
    });
  }

  function saveBlobAs(blob,filename){
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); },800);
  }

  function withExportJpFix(scope,work){
    var touched=[];
    function setStyle(el,prop,val,pri){
      touched.push([el,prop,el.style.getPropertyValue(prop),el.style.getPropertyPriority(prop)]);
      el.style.setProperty(prop,val,pri||'');
    }
    function styleUnderlineLine(line,isU2){
      setStyle(line,'display','block');
      setStyle(line,'position','absolute');
      setStyle(line,'left','0');
      setStyle(line,'right','0');
      setStyle(line,'bottom',isU2?'0':'3px');
      setStyle(line,'height','1.5px');
      setStyle(line,'background','currentColor');
      setStyle(line,'margin-top','0');
      setStyle(line,'align-self','auto');
      setStyle(line,'pointer-events','none');
      setStyle(line,'z-index','1');
    }
    function addTempLine(wrap,isU2,beforeNode){
      var ln=document.createElement('span');
      ln.className=isU2?'jp-u2-line':'jp-u1-line';
      ln.setAttribute('data-export-temp-line','1');
      wrap.insertBefore(ln,beforeNode||null);
      return ln;
    }
    function nextPaint(){
      return new Promise(function(resolve){
        requestAnimationFrame(function(){requestAnimationFrame(resolve);});
      });
    }

    // If legacy renderer left border-bottom on number row, convert it to underline element for export.
    var wraps=scope.querySelectorAll('.jp-lines-wrap');
    Array.prototype.forEach.call(wraps,function(wrap){
      var row=wrap.querySelector('.jp-num-row');
      if(!row) return;
      var cs=getComputedStyle(row);
      var hadBorder=(parseFloat(cs.borderBottomWidth||'0')>0)&&(cs.borderBottomStyle!=='none');
      var hasU1=!!wrap.querySelector('.jp-u1-line');
      if(hadBorder && !hasU1){
        var beforeU2=wrap.querySelector('.jp-u2-line');
        addTempLine(wrap,false,beforeU2||null);
      }
    });

    var rows=scope.querySelectorAll('.jp-num-row');
    Array.prototype.forEach.call(rows,function(row){
      setStyle(row,'padding-bottom','8px');
      setStyle(row,'border-bottom','none');
      setStyle(row,'min-height','1.15em');
      setStyle(row,'display','inline-flex');
      setStyle(row,'align-items','center');
      setStyle(row,'justify-content','center');
    });

    var nums=scope.querySelectorAll('.jp-num');
    Array.prototype.forEach.call(nums,function(num){
      setStyle(num,'line-height','1');
      setStyle(num,'display','inline-block');
      setStyle(num,'vertical-align','baseline');
    });
    var dashes=scope.querySelectorAll('.jp-plain-sym.is-dash');
    Array.prototype.forEach.call(dashes,function(d){
      setStyle(d,'top','-0.08em');
      setStyle(d,'height','1em');
      setStyle(d,'display','inline-flex');
      setStyle(d,'align-items','center');
      setStyle(d,'justify-content','center');
      setStyle(d,'line-height','1');
      setStyle(d,'font-size','19px');
      setStyle(d,'transform','none');
    });
    var augs=scope.querySelectorAll('.jp-aug');
    Array.prototype.forEach.call(augs,function(a){
      setStyle(a,'top','-0.16em');
      setStyle(a,'transform','none');
      setStyle(a,'right','-0.35em');
      setStyle(a,'line-height','1');
      setStyle(a,'display','inline-block');
    });
    var accs=scope.querySelectorAll('.jp-acc');
    Array.prototype.forEach.call(accs,function(a){
      styleJpAccEl(a);
      setStyle(a,'display','inline-block');
    });

    var lines=scope.querySelectorAll('.jp-u1-line,.jp-u2-line');
    Array.prototype.forEach.call(lines,function(line){
      styleUnderlineLine(line,line.classList.contains('jp-u2-line'));
    });

    return nextPaint()
      .then(work)
      .finally(function(){
        for(var i=touched.length-1;i>=0;i--){
          var t=touched[i],el=t[0],prop=t[1],old=t[2],pri=t[3];
          if(old) el.style.setProperty(prop,old,pri||'');
          else el.style.removeProperty(prop);
        }
        var temps=scope.querySelectorAll('[data-export-temp-line="1"]');
        Array.prototype.forEach.call(temps,function(n){n.remove();});
      });
  }

  function buildExportClone(panelInner,opt){
    opt=opt||{};
    var rect=panelInner.getBoundingClientRect();
    var mount=(panelInner&&panelInner.closest&&panelInner.closest('#music-library')) || document.body;
    var host=document.createElement('div');
    host.style.cssText='position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none;';
    var clone=panelInner.cloneNode(true);
    // CECP-A4-PAGE: 屏幕上为填满 A4 撑开的行距(paddingBottom)不进导出图——导出仍按自然行距排
    clone.querySelectorAll('.sw-lline').forEach(function(l){l.style.paddingBottom='';});
    if(opt.tight){
      clone.style.display='inline-block';
      clone.style.width='max-content';
      clone.style.minWidth='0';
    }else{
      clone.style.width=Math.max(1,Math.ceil(rect.width))+'px';
    }
    clone.style.maxWidth='none';
    clone.style.margin='0';
    clone.style.transform='none';
    host.appendChild(clone);
    mount.appendChild(host);
    /* CECP-A4-PAGE v2: 屏幕上为填满纸宽做的「压紧+拉宽」不进导出图 ——
       压紧类的 CSS 挂在 .sw-page 下,克隆搬出纸外本来就失效;真正会跟过来的是
       justify 写在 .prev-seg 上的 inline margin 和段落标记被挪过的 left/top。
       这里把两者都退回「按最宽的自然行对齐 + 作者拖的原始 dx/dy」=
       v2 之前导出拿到的样子,导出自己的排版从这里起步。 */
    clone.classList.remove('sw-a4-tight');
    Array.prototype.forEach.call(clone.querySelectorAll('.sec-label[data-a4-l0]'),function(t){
      t.style.left=t.getAttribute('data-a4-l0')+'px';
      t.style.top=t.getAttribute('data-a4-t0')+'px';
    });
    justifyScoreRowsClear(clone);
    if(YE_JUSTIFY_ROWS)justifyScoreRows(clone.querySelectorAll('.sw-lrow'));
    if(opt.tight){
      var tightW=Math.max(1,Math.ceil(clone.scrollWidth||rect.width||0));
      clone.style.width=tightW+'px';
    }
    return {
      node:clone,
      cleanup:function(){ host.remove(); }
    };
  }

  function loadImageForExport(src){
    return new Promise(function(resolve){
      if(!src){ resolve(null); return; }
      var img=new Image();
      img.crossOrigin='anonymous';
      img.onload=function(){ resolve(img); };
      img.onerror=function(){
        var fallback=new Image();
        fallback.onload=function(){ resolve(fallback); };
        fallback.onerror=function(){ resolve(null); };
        fallback.src=src;
      };
      img.src=src;
    });
  }

  function blobToImage(blob){
    return new Promise(function(resolve,reject){
      var url=URL.createObjectURL(blob);
      var img=new Image();
      img.onload=function(){ URL.revokeObjectURL(url); resolve(img); };
      img.onerror=function(err){ URL.revokeObjectURL(url); reject(err); };
      img.src=url;
    });
  }

  function makeExportTextBlack(scope){
    if(!scope||!scope.querySelectorAll) return;
    if(!scope.querySelector('[data-export-symbol-fix="1"]')){
      var style=document.createElement('style');
      style.setAttribute('data-export-symbol-fix','1');
      style.textContent=[
        '.jp-slur,.jp-slur-open,.jp-slur-close,.jp-tuplet{padding-top:calc(var(--slur-pad,12px) + 10px)!important;overflow:visible!important;}',
        '.jp-slur::before{top:var(--jp-nav-arc-top,3px)!important;left:12%!important;right:12%!important;height:11px!important;border-top:2.4px solid #111!important;border-left:2.4px solid #111!important;border-right:2.4px solid #111!important;background:transparent!important;z-index:2!important;}',
        '.jp-slur-open::before{top:var(--jp-nav-arc-top,3px)!important;left:12%!important;right:-4px!important;height:11px!important;border-top:2.4px solid #111!important;border-left:2.4px solid #111!important;background:transparent!important;z-index:2!important;}',
        '.jp-slur-close::before{top:var(--jp-nav-arc-top,3px)!important;left:-4px!important;right:12%!important;height:11px!important;border-top:2.4px solid #111!important;border-right:2.4px solid #111!important;background:transparent!important;z-index:2!important;}',
        '.jp-tie::before{height:11px!important;border-top:2.4px solid #111!important;border-left:2.4px solid #111!important;border-right:2.4px solid #111!important;background:transparent!important;z-index:2!important;}',
        '.jp-tuplet-br{top:3px!important;left:2px!important;right:2px!important;height:11px!important;border-top:2.4px solid #111!important;border-left:2.4px solid #111!important;border-right:2.4px solid #111!important;background:transparent!important;z-index:1!important;}',
        '.jp-tuplet-num{top:-4px!important;font-size:10px!important;line-height:1!important;padding:0 5px!important;background:#fff!important;color:#111!important;-webkit-text-fill-color:#111!important;z-index:4!important;}'
      ].join('\n');
      scope.insertBefore(style,scope.firstChild);
    }
    var nodes=[scope].concat(Array.prototype.slice.call(scope.querySelectorAll('*')));
    nodes.forEach(function(n){
      if(!n.style) return;
      if(n.closest&&n.closest('.sec-label')) return;   // 段落标记保留自己的配色（否则边框被刷成黑色）
      n.style.setProperty('color','#111','important');
      n.style.setProperty('-webkit-text-fill-color','#111','important');
      n.style.setProperty('border-color','#111','important');
      n.style.setProperty('text-shadow','none','important');
    });
    Array.prototype.forEach.call(scope.querySelectorAll('.jp-u1-line,.jp-u2-line,.jp-dash-line'),function(n){
      n.style.setProperty('background','#111','important');
    });
  }

  /* 导出专用：和弦芯片固定用「浅色主题」配色（内联 !important），不受当前明暗主题影响。
     必须在 makeExportTextBlack 之后调用——它会把所有元素刷成黑字，这里再把和弦改回来。 */
  function exportForceLightChordChips(scope){
    if(!scope||!scope.querySelectorAll)return;
    var chips=scope.querySelectorAll('.chord-chip');
    for(var i=0;i<chips.length;i++){
      var el=chips[i],cls=String(el.className||''),pc=-1;
      var parts=cls.split(/\s+/);
      for(var j=0;j<parts.length;j++){
        if(parts[j].indexOf('chord-pc')===0){pc=parseInt(parts[j].slice(8),10);break;}
      }
      if(!(pc>=0&&pc<=11))continue;
      var h=(pc*30+210)%360;
      el.style.setProperty('background','hsl('+h+',34%,94%)','important');
      el.style.setProperty('outline-color','hsl('+h+',38%,74%)','important');
      el.style.setProperty('color','hsl('+h+',90%,20%)','important');
      el.style.setProperty('-webkit-text-fill-color','hsl('+h+',90%,20%)','important');
    }
  }


  function composeA4SongImage(scoreBlob,opt){
    opt=opt||{};
    return Promise.all([blobToImage(scoreBlob),loadImageForExport(YM_LOGO_SRC)]).then(function(items){
      var scoreImg=items[0], logoImg=items[1];
      var W=2000,H=2828;
      var canvas=document.createElement('canvas');
      canvas.width=W; canvas.height=H;
      var ctx=canvas.getContext('2d');
      if(!ctx) throw new Error('canvas unavailable');
      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,W,H);

      var song=opt.song||{};
      var title=song.title||opt.title||'';
      var subtitle=[song.artist,song.sub].filter(Boolean).join('  ');
      var leftLines=[song.bpm?'♪ = '+song.bpm:'','1= '+(opt.key||song.origKey||'C')+'  '+(song.timeSign||'4/4')].filter(Boolean);

      ctx.fillStyle='#111';
      ctx.textBaseline='top';
      ctx.font='600 24px "DM Mono","Space Mono",monospace';
      leftLines.forEach(function(line,i){ ctx.fillText(line,260,130+i*34); });
      ctx.textAlign='center';
      ctx.font='900 38px "Noto Serif SC","Songti SC","PingFang SC",serif';
      ctx.fillText(title,W/2,128);
      if(subtitle){
        ctx.font='500 22px "Noto Serif SC","Songti SC","PingFang SC",serif';
        ctx.fillText(subtitle,W/2,182);
      }
      ctx.textAlign='left';

      var area={x:150,y:250,w:1700,h:2460};
      var scale=Math.min(area.w/scoreImg.width,area.h/scoreImg.height);
      var drawW=scoreImg.width*scale;
      var drawH=scoreImg.height*scale;
      var drawX=area.x+(area.w-drawW)/2;
      var drawY=area.y;
      ctx.drawImage(scoreImg,drawX,drawY,drawW,drawH);

      if(logoImg){
        var logoW=1180;
        var logoH=logoW*(logoImg.naturalHeight||logoImg.height)/(logoImg.naturalWidth||logoImg.width);
        ctx.save();
        ctx.globalAlpha=0.045;
        ctx.drawImage(logoImg,(W-logoW)/2,(H-logoH)/2,logoW,logoH);
        ctx.restore();
      }
      return canvasToPngBlob(canvas);
    });
  }

  function normalizeExportNotation(scope){
    if(!scope||!scope.querySelectorAll) return;
    var wraps=scope.querySelectorAll('.jp-lines-wrap');
    Array.prototype.forEach.call(wraps,function(wrap){
      wrap.style.position='relative';
      wrap.style.paddingBottom='12px';
      wrap.style.overflow='visible';

      var row=wrap.querySelector('.jp-num-row');
      if(!row) return;
      var cs=getComputedStyle(row);
      var hadBorder=(parseFloat(cs.borderBottomWidth||'0')>0)&&(cs.borderBottomStyle!=='none');
      row.style.borderBottom='none';
      row.style.paddingBottom='0';
      row.style.minHeight='1.15em';
      row.style.display='inline-flex';
      row.style.alignItems='center';
      row.style.justifyContent='center';

      if(hadBorder && !wrap.querySelector('.jp-u1-line')){
        var ul=document.createElement('span');
        ul.className='jp-u1-line';
        wrap.appendChild(ul);
      }

      var lines=wrap.querySelectorAll('.jp-u1-line,.jp-u2-line');
      Array.prototype.forEach.call(lines,function(line){
        line.style.display='block';
        line.style.position='absolute';
        line.style.left='0';
        line.style.right='0';
        line.style.bottom=line.classList.contains('jp-u2-line')?'0':'4px';
        line.style.height='1.5px';
        line.style.background='currentColor';
        line.style.margin='0';
        line.style.pointerEvents='none';
      });
    });

    var nums=scope.querySelectorAll('.jp-num');
    Array.prototype.forEach.call(nums,function(num){
      num.style.lineHeight='1';
      num.style.display='inline-block';
      num.style.verticalAlign='baseline';
      num.style.height='1em';
      num.style.position='relative';
      num.style.top='-0.12em';
    });
    var dashes=scope.querySelectorAll('.jp-plain-sym.is-dash');
    Array.prototype.forEach.call(dashes,function(d){
      d.style.position='relative';
      d.style.top='-0.12em';
      d.style.height='1em';
      d.style.display='inline-flex';
      d.style.alignItems='center';
      d.style.justifyContent='center';
      d.style.lineHeight='1';
      d.style.fontSize='19px';
      d.style.transform='none';
      d.style.overflow='visible';
      var dashLine=d.querySelector('.jp-dash-line');
      if(!dashLine){
        dashLine=document.createElement('span');
        dashLine.className='jp-dash-line';
        d.textContent='';
        d.appendChild(dashLine);
      }
      styleJpDashLineEl(dashLine);
    });
    var augs=scope.querySelectorAll('.jp-aug');
    Array.prototype.forEach.call(augs,function(a){
      styleJpAugEl(a);
      a.style.display='block';
    });
    /* 导出时 .jp-lines-wrap 的 padding-bottom 由 4px 变 12px、下划线由 bottom:3/0 变 4/0，
       低音点要跟着重算，否则导出图里点会比屏幕上低 5px */
    var dotBots=scope.querySelectorAll('.jp-dot-bot');
    Array.prototype.forEach.call(dotBots,function(b){
      var wrap=b.parentElement;
      if(!wrap||!wrap.classList.contains('jp-wrap'))return;
      if(wrap.parentElement&&/jp-dual-(top|bot)/.test(wrap.parentElement.className||''))return;
      b.style.position='relative';
      b.style.top=wrap.querySelector('.jp-u2-line')?'2px':(wrap.querySelector('.jp-u1-line')?'-2px':'-15.5px');
    });
    var accs=scope.querySelectorAll('.jp-acc');
    Array.prototype.forEach.call(accs,function(a){
      styleJpAccEl(a);
      a.style.display='inline-block';
    });
  }

  function waitPaint2(){
    return new Promise(function(resolve){
      requestAnimationFrame(function(){requestAnimationFrame(resolve);});
    });
  }

  function exportTransposePanel(panelInner,opt){
    opt=opt||{};
    if(!panelInner) return Promise.reject(new Error('panel missing'));
    var bg=resolveExportBackground(panelInner,opt.bgColor);
    var waitFonts=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
    return waitFonts
      .then(function(){
        var snap=buildExportClone(panelInner,{tight:!!opt.tight});
        if(opt.hideTransposeOptions){
          var keyZone=snap.node.querySelector('.sw-ks');
          if(keyZone) keyZone.remove();
        }
        normalizeExportNotation(snap.node);
        if(opt.a4) makeExportTextBlack(snap.node);
      exportForceLightChordChips(snap.node);
        lyricHlPrepareExport(snap.node);
        if(opt.a4) snap.node.style.setProperty('background','#ffffff','important');
        return waitPaint2()
          .then(function(){ return nodeToPngBlobRobust(snap.node,bg); })
          .then(function(blob){ return opt.a4 ? composeA4SongImage(blob,opt) : blob; })
          .finally(function(){ snap.cleanup(); });
      })
      .then(function(blob){
        var base=safeFileName(opt.title||'transpose');
        var key=safeFileName(opt.key||'');
        var filename=base+(key?('_'+key):'')+'.png';
        saveBlobAs(blob,filename);
      });
  }


  /* ══════════ 单图导出：整首缩放进一张固定尺寸 PNG（纯白底） ══════════
     取代此前的「A4 分页多页 PDF」方案，核心规则：
     - 只输出一张 PNG，默认 A4 竖版基准（2000x2828，1:1.414）；
     - 不做「先截原尺寸长图再缩小贴上」（位图降采样会发虚），而是把
       目标缩放比例直接交给 html2canvas 的 scale 渲染参数，文字按
       最终尺寸矢量光栅化，缩小后依然清晰；
     - 最小可读字号下限：歌词在成图里的字高不低于 minLyricPx
       （24px，约合 A4 打印 9pt）。竖版压到下限仍放不下时，不再继续
       压小，而改用 A4 横版（2828x2000）+ 歌词区双栏排版，用宽度换
       高度；双栏断点由 CSS break-inside 控制，只落在整行之间；
       宽度上限即横版双栏，不再进一步拉宽；
     - 背景永远纯白 #ffffff，不跟随深浅主题；导出前把荧光笔标记
       内联为白底可辨的实色（lyricHlPrepareExport）。
     resolveExportBackground 不再参与本路径，仅保留给旧版
     exportTransposePanel 兜底（该路径调用方也固定传白底）。 */
  var EXPORT_FIT={
    portrait:{W:2000,H:2828},
    landscape:{W:2828,H:2000},
    headerH:250,bottomH:118,sideM:150,
    minLyricPx:24,maxScale:2.6,ss:1.5
  };
  /* 导出图纸张底色：暖白，比纯白柔和、久看不刺眼（只作用于「下载歌谱图」，屏幕与移调面板导出不变） */
  var EXPORT_PAPER_BG='#faf7f1';
  function exportMeasureLyricFont(scope){
    var el=scope.querySelector('.p-lyric');
    if(!el)return 19;
    var fs=parseFloat(getComputedStyle(el).fontSize);
    return isFinite(fs)&&fs>0?fs:19;
  }
  function exportApplyTwoColumns(clone,baseW){
    var st=document.createElement('style');
    st.setAttribute('data-export-columns','1');
    st.textContent='.sw-lline{break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}.sw-lsec{break-inside:auto;}';
    clone.insertBefore(st,clone.firstChild);
    clone.style.columnCount='2';
    clone.style.columnGap='64px';
    clone.style.columnFill='balance';
    clone.style.width=Math.ceil(baseW*2+64)+'px';
  }
  function composeFittedSongImage(scoreBlob,opt,page){
    return Promise.all([blobToImage(scoreBlob),loadImageForExport(YM_LOGO_SRC)]).then(function(items){
      var scoreImg=items[0],logoImg=items[1];
      var W=page.W,H=page.H;
      var canvas=document.createElement('canvas');
      canvas.width=W;canvas.height=H;
      var ctx=canvas.getContext('2d');
      if(!ctx)throw new Error('canvas unavailable');
      ctx.fillStyle=EXPORT_PAPER_BG;
      ctx.fillRect(0,0,W,H);
      var song=opt.song||{};
      var title=song.title||opt.title||'';
      var subtitle=[song.artist,song.sub].filter(Boolean).join('  ');
      var leftLines=[song.bpm?'♪ = '+song.bpm:'','1= '+(opt.key||song.origKey||'C')+'  '+(song.timeSign||'4/4')].filter(Boolean);
      ctx.fillStyle='#111';
      ctx.textBaseline='top';
      ctx.font='600 24px "DM Mono","Space Mono",monospace';
      leftLines.forEach(function(line,i){ ctx.fillText(line,260,130+i*34); });
      ctx.textAlign='center';
      ctx.font='900 38px "Noto Serif SC","Songti SC","PingFang SC",serif';
      ctx.fillText(title,W/2,128);
      if(subtitle){
        ctx.font='500 22px "Noto Serif SC","Songti SC","PingFang SC",serif';
        ctx.fillText(subtitle,W/2,182);
      }
      ctx.textAlign='left';
      var area={x:EXPORT_FIT.sideM,y:EXPORT_FIT.headerH,w:W-EXPORT_FIT.sideM*2,h:H-EXPORT_FIT.headerH-EXPORT_FIT.bottomH};
      var s=Math.min(area.w/scoreImg.width,area.h/scoreImg.height,1.001);
      var drawW=scoreImg.width*s,drawH=scoreImg.height*s;
      ctx.drawImage(scoreImg,area.x+(area.w-drawW)/2,area.y,drawW,drawH);
      if(logoImg){
        var logoW=1180;
        var logoH=logoW*(logoImg.naturalHeight||logoImg.height)/(logoImg.naturalWidth||logoImg.width);
        ctx.save();
        ctx.globalAlpha=0.045;
        ctx.drawImage(logoImg,(W-logoW)/2,(H-logoH)/2,logoW,logoH);
        ctx.restore();
      }
      return canvasToPngBlob(canvas);
    });
  }
  /* §4 导出锁 A4 · 12 调稳定：移调只给根音/斜杠低音多出一个升降号，后缀不变。
     给每个"根音/低音没有升降号"的和弦各预留一个升降号宽，使导出内容宽度在 12 个调下恒定，
     竖版/横版判断因此不随调变。只作用于导出克隆，屏幕渲染逐像素不变。复用 {sp} 的 spMeasureWidth 量宽。 */
  function reserveChordAccidentalWidth(scope){
    if(!scope)return;
    [].forEach.call(scope.querySelectorAll('.p-chord'),function(ch){
      var txt=(ch.textContent||'').replace(/ㅤ/g,'').trim();  // 去 {sp} 补位符再解析
      if(!txt)return;
      var parts=txt.split('/'),need=0,root=parts[0].trim();
      if(/^[A-G]/.test(root)&&!/^[A-G][#b♯♭]/.test(root))need++;       // 根音无升降号 → 预留 1
      if(parts.length>1){var bass=parts[1].trim();
        if(/^[A-G]/.test(bass)&&!/^[A-G][#b♯♭]/.test(bass))need++;}    // 有斜杠低音且无升降号 → 再预留 1
      if(!need)return;
      var w=spMeasureWidth(ch,'#');
      if(w>0){
        // 左右各留一半：总宽不变(12调稳定)，但和弦本体仍居中对齐音符（全加右边会把和弦挤向左）
        var half=(w*need/2).toFixed(2);
        var mkSp=function(){var x=document.createElement('span');x.setAttribute('aria-hidden','true');x.style.cssText='display:inline-block;width:'+half+'px;';return x;};
        ch.insertBefore(mkSp(),ch.firstChild);ch.appendChild(mkSp());
      }
    });
  }
  function exportSongAsFittedPng(panelInner,opt){
    opt=opt||{};
    if(!panelInner)return Promise.reject(new Error('panel missing'));
    var waitFonts=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
    var keyPart=safeFileName(opt.key||'');
    var stem=safeFileName(opt.title||'transpose')+(keyPart?('_'+keyPart):'');
    return waitFonts.then(function(){
      var snap=buildExportClone(panelInner,{tight:!!opt.tight});
      if(opt.hideTransposeOptions){
        var keyZone=snap.node.querySelector('.sw-ks');
        if(keyZone) keyZone.remove();
      }
      normalizeExportNotation(snap.node);
      reserveChordAccidentalWidth(snap.node);   // §4：12 调导出宽度恒定
      makeExportTextBlack(snap.node);
      exportForceLightChordChips(snap.node);
      lyricHlPrepareExport(snap.node);
      snap.node.style.setProperty('background',EXPORT_PAPER_BG,'important');
      return waitPaint2()
        .then(function(){
          // strict: 克隆里的梁/弧是屏幕坐标, 导出按 max-content 重新排版了, 得按新布局重排(非 strict 为 no-op)
          layoutStrictChordsAll(snap.node);
          snap.node.querySelectorAll('.sw-lrow').forEach(connectStrictBeams);
          layoutStrictArcsAll(snap.node);
          var r1=snap.node.getBoundingClientRect();
          var cw=Math.max(1,r1.width),ch=Math.max(1,r1.height);
          var P=EXPORT_FIT.portrait;
          var targetW = P.W-EXPORT_FIT.sideM*2;
          var targetH = P.H-EXPORT_FIT.headerH-EXPORT_FIT.bottomH;
          var aspectRatio = cw / ch;
          var idealAspect = targetW / targetH;
          var stretched = false;
          console.log('[FittedExport] cw='+cw+' ch='+ch+' aspect='+aspectRatio.toFixed(3)+' ideal='+idealAspect.toFixed(3));
          if (aspectRatio < idealAspect) {
             console.log('[FittedExport] Song is too tall/narrow, stretching wide...');
             stretched = true;
             var expLabels = secLabelsSnapshot(snap.node);   // 拉宽会把音符挪走，段落标记得跟着走(同屏幕那套锚点)
             var st = document.createElement('style');
             st.textContent = '.sw-lline{margin-bottom:6px !important;} .sw-seg{margin-bottom:2px !important;}';
             snap.node.insertBefore(st, snap.node.firstChild);
             var stretchW = Math.min(ch * idealAspect * 0.9, cw * 1.6);
             console.log('[FittedExport] stretchW='+stretchW.toFixed(0)+' (natural cw='+cw+')');
             /* 关键：把 clone 容器宽度撑开，否则 flex 行会被旧宽度压缩 */
             snap.node.style.width = Math.ceil(stretchW) + 'px';
             if(YE_JUSTIFY_ROWS) justifyScoreRows(snap.node.querySelectorAll('.sw-lrow'), {targetWidth: stretchW, ratio: 0.4});
             layoutStrictChordsAll(snap.node);
             snap.node.querySelectorAll('.sw-lrow').forEach(connectStrictBeams);
             layoutStrictArcsAll(snap.node);
             r1=snap.node.getBoundingClientRect();
             cw=Math.max(1,r1.width);
             ch=Math.max(1,r1.height);
             secLabelsRestore(expLabels);                    // 徽章放回原来那一拍
             console.log('[FittedExport] after stretch: cw='+cw+' ch='+ch+' newAspect='+(cw/ch).toFixed(3));
          }
          var lyricPx=exportMeasureLyricFont(snap.node);
          var sPort=Math.min(
            targetW/cw,
            targetH/ch,
            EXPORT_FIT.maxScale
          );
          /* 拉宽优化后，歌词仍然清晰可读，放宽 minLyricPx 门槛让竖版通过 */
          var effectiveMinLyric = stretched ? Math.min(EXPORT_FIT.minLyricPx, 16) : EXPORT_FIT.minLyricPx;
          console.log('[FittedExport] sPort='+sPort.toFixed(3)+' lyricPx='+lyricPx+' rendered='+(sPort*lyricPx).toFixed(1)+' min='+effectiveMinLyric);
          if(sPort*lyricPx>=effectiveMinLyric){
            return nodeToPngBlobRobust(snap.node,EXPORT_PAPER_BG,{scale:sPort*EXPORT_FIT.ss}).then(function(blob){return {blob:blob,page:P};});
          }
          exportApplyTwoColumns(snap.node,cw);
          return waitPaint2().then(function(){
            layoutStrictChordsAll(snap.node);                                     // 双栏重排后和弦避让也要重算
            snap.node.querySelectorAll('.sw-lrow').forEach(connectStrictBeams);   // 双栏重排后再排一次梁/弧
            layoutStrictArcsAll(snap.node);
            var r2=snap.node.getBoundingClientRect();
            var cw2=Math.max(1,r2.width),ch2=Math.max(1,r2.height);
            var L=EXPORT_FIT.landscape;
            var sLand=Math.min(
              (L.W-EXPORT_FIT.sideM*2)/cw2,
              (L.H-EXPORT_FIT.headerH-EXPORT_FIT.bottomH)/ch2,
              EXPORT_FIT.maxScale
            );
            return nodeToPngBlobRobust(snap.node,EXPORT_PAPER_BG,{scale:sLand*EXPORT_FIT.ss}).then(function(blob){return {blob:blob,page:L};});
          });
        })
        .finally(function(){ snap.cleanup(); });
    }).then(function(res){
      return composeFittedSongImage(res.blob,opt,res.page);
    }).then(function(png){
      saveBlobAs(png,stem+'.png');
    });
  }

  /* ══════════════ Hero ══════════════ */
  function buildHero() {
    var navGroups = {
      flow: [
        {label:'📅 聚会流程', href:'#ym-flow'},
      ],
      songs: [
        {label:'🎧 本周诗歌', href:'#ym-songs'},
      ],
      message: [
        {label:'📖 信息分享', href:'#ym-message'},
      ],
      ppt: [
        {label:'📑 讲员PPT', href:'#ym-ppt'},
      ],
      replay: [
        {label:'📺 直播回放', href:'#ym-replay'},
      ],
      tutorial: [
        {label:'🎬 视频教程', href:'#ym-tutorial'},
      ],
      game: [
        {label:'🎮 游戏活动', href:'#ym-game'},
      ],
    };
    var navItems = [];
    getSectionOrder().forEach(function(section){
      (navGroups[section] || []).forEach(function(item){
        navItems.push(item);
      });
    });
    var navDiv = el('nav', {class:'ym-mast-nav'});
    navItems.forEach(function(item){
      var parts = ymSplitLabel(item.label);
      var a = el('button', {class:'ym-mast-link', type:'button', 'data-section':item.href.replace('#ym-', ''), text: parts.text});
      a.addEventListener('click', function(){
        navDiv.querySelectorAll('.ym-mast-link').forEach(function(b){b.classList.remove('active')});
        a.classList.add('active');
        var t = document.querySelector(item.href);
        if(t) t.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
      });
      navDiv.appendChild(a);
    });
    return el('header', {class:'ym-mast ym-reveal'}, [
      el('div',{class:'ym-eyebrow'},[
        el('span',{text:'本周聚会'}),
        el('span',{class:'ym-eyebrow-dot'}),
        el('span',{text: C.week || '主日敬拜'}),
      ]),
      el('h1', {class:'ym-mast-title', html:'青年聚会<br>敬拜与信息分享'}),
      el('p',  {class:'ym-mast-lede', text:'欢迎一起敬拜、分享，也欢迎敬拜团在这里预备本周的诗歌。'}),
      el('div',{class:'ym-mast-meta', text: C.time || ''}),
      navDiv,
    ]);
  }

  /* ══════════════ Schedule ══════════════ */
  var YM_ROMAN = ['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ'];
  function buildSchedule() {
    var sched = C.schedule || [];
    var rows = sched.map(function(s, i){
      // split "12:00 – 12:30" -> big start + small end line
      var t = String(s.time || '');
      var m = t.replace(/\s/g,'').match(/^(\d{1,2}:\d{2})[^\d](\d{1,2}:\d{2})$/);
      var timeCell = el('div',{class:'ym-ord-time'});
      if(m){
        timeCell.appendChild(document.createTextNode(m[1]));
        timeCell.appendChild(el('small',{text:'– ' + m[2]}));
      } else {
        timeCell.textContent = t;
      }
      var dur = ymParseDur(s.time);
      var ev = String(s.event || '');
      var name = el('div',{class:'ym-ord-name'});
      name.appendChild(el('span',{class:'ym-ord-live', text:'正在进行'}));
      name.appendChild(document.createTextNode(ev));
      if (C.speaker && /分享|讲道|信息/.test(ev)) {
        name.appendChild(el('span',{class:'sub', text:'讲员 · ' + C.speaker}));
      } else if (/诗歌|敬拜/.test(ev)) {
        // 主领名字在服侍分工表里（异步）；buildRoster 拿到数据后回填这个占位
        name.appendChild(el('span',{class:'sub','data-ym-lead-slot':'1',style:'display:none'}));
      }
      return el('li',{class:'ym-ord-row ym-reveal'},[
        el('span',{class:'ym-ord-num', text: YM_ROMAN[i] || String(i+1)}),
        timeCell,
        name,
        el('span',{class:'ym-ord-dur', text: dur || ''}),
      ]);
    });
    var listEl = el('ol',{class:'ym-ord'}, rows);

    // 「正在进行」：仅在本周刊对应的当天、且当前时刻落在某环节时间段内时点亮
    var weekDay = (function(){
      var m = String(C.__weekId||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m ? {y:+m[1], mo:+m[2], d:+m[3]} : null;
    })();
    function toMin(hm){ var p=hm.split(':'); return (+p[0])*60 + (+p[1]); }
    var ranges = sched.map(function(s){
      var t = String(s.time||'').replace(/\s/g,'');
      var m = t.match(/^(\d{1,2}:\d{2})[^\d](\d{1,2}:\d{2})$/);
      return m ? {s:toMin(m[1]), e:toMin(m[2])} : null;
    });
    function liveTick(){
      // 构建期尚未挂载：跳过但保留定时器；挂载过又被移除（页面重渲染）才清理
      if(!listEl.isConnected){ if(liveTick._mounted){ clearInterval(liveTimer); } return; }
      liveTick._mounted = true;
      var now = window.__YM_FAKE_NOW__ ? new Date(window.__YM_FAKE_NOW__) : new Date();
      var sameDay = !!weekDay && now.getFullYear()===weekDay.y && (now.getMonth()+1)===weekDay.mo && now.getDate()===weekDay.d;
      var cur = now.getHours()*60 + now.getMinutes();
      rows.forEach(function(li,i){
        var r = ranges[i];
        li.classList.toggle('live', sameDay && !!r && cur>=r.s && cur<r.e);
      });
    }
    var liveTimer = setInterval(liveTick, 30000);
    if (window.requestAnimationFrame) requestAnimationFrame(liveTick); else liveTick();

    return el('div',{class:'ym-flow'},[
      el('div',{class:'ym-sec-h'},[
        el('span',{class:'k', text:'聚会流程'}),
        el('span',{class:'n', text: sched.length ? sched.length + ' 个环节' : ''}),
      ]),
      el('div',{class:'ym-sec-rule'}),
      listEl,
    ]);
  }

  /* ══════════════ Roster ══════════════ */
  // StudioLive32S / Universal Control glyphs; provenance: docs/youth-studiolive-icons.md.
  var YM_ROSTER_ICONS = {"mic":"<svg viewBox=\"0 0 1000 1000\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\">\n<g>\n</g>\n<g>\n\t<g>\n\t\t<path d=\"M737.7,509.7c0-14.3-11.5-25.8-25.8-25.8S686,495.4,686,509.7c0,103.1-83.9,186.9-186.9,186.9    s-186.9-83.8-186.9-186.9c0-14.3-11.5-25.8-25.8-25.8s-25.8,11.5-25.8,25.8c0,122.8,93.3,224.2,212.7,237.2v61.6h-77.5    c-14.3,0-25.8,11.5-25.8,25.8s11.5,25.8,25.8,25.8h206.6c14.3,0,25.8-11.5,25.8-25.8s-11.5-25.8-25.8-25.8H525v-61.7    C644.5,733.8,737.7,632.5,737.7,509.7L737.7,509.7L737.7,509.7z\" fill=\"currentColor\" />\n\t\t<path d=\"M563.7,309.2h73.2v-28.6c0-76.1-61.6-137.7-137.7-137.7s-137.7,61.6-137.7,137.7v28.6h73.2    c9.5,0,17.2,7.7,17.2,17.2s-7.7,17.2-17.2,17.2h-73.2v34.4h73.2c9.5,0,17.2,7.7,17.2,17.2s-7.7,17.2-17.2,17.2h-73.2V447h73.2    c9.5,0,17.2,7.7,17.2,17.2s-7.7,17.2-17.2,17.2h-73.2V510c0,76.1,61.6,137.7,137.7,137.7S636.9,586.1,636.9,510v-28.6h-73.2    c-9.5,0-17.2-7.7-17.2-17.2s7.7-17.2,17.2-17.2h73.2v-34.4h-73.2c-9.5,0-17.2-7.7-17.2-17.2s7.7-17.2,17.2-17.2h73.2v-34.4h-73.2    c-9.5,0-17.2-7.7-17.2-17.2S554.2,309.2,563.7,309.2z\" fill=\"currentColor\" />\n\t</g>\n</g>\n</svg>","choir":"<svg viewBox=\"0 0 1000 1000\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\">\n<g>\n</g>\n<g>\n\t<g>\n\t\t<path d=\"M256.2,491.2c34.3,0,62.5-27.5,62.5-62.5s-27.5-62.5-62.5-62.5s-62.5,27.5-62.5,62.5    C194.4,463.7,222,491.2,256.2,491.2z\" fill=\"currentColor\" />\n\t\t<path d=\"M308.3,606.6c-4.5,1.5-8.9,2.2-12.6,3c-11.9,1.5-20.9,12.7-19.4,24.6c1.5,11.2,11.2,19.4,21.6,19.4h3    c1.5,0,4.5-0.8,6.7-1.5v13.4c0,3-2.2,5.2-4.5,6l-45.4,13.4h-3.7l-45.4-13.4c-3-0.8-4.5-3-4.5-6V652c3,0.8,5.2,0.8,6.7,1.5    c11.9,1.5,23.1-6.7,24.6-19.4c1.5-11.9-6.7-23.1-19.4-24.6c-4.5-0.8-8.9-1.5-12.6-3v-20.8c0-4.5,4.5-7.4,8.2-6l41.7,12.7h3.7    l41.7-12.7c4.5-1.5,8.2,2.2,8.2,6l0.1,20.8H308.3L308.3,606.6z M354.5,569.4c-11.2-28.3-23.8-59.5-64-59.5h-67.8    c-40.2,0-52.9,32-64,59.5c-2.2,6-5.2,11.9-8.2,18.6c-5.2,11.9-4.5,23.8,1.5,34.3c6.7,12.7,20.9,20.1,33.5,24.6l-5.1,58    c0,8.2,6.7,15.7,14.9,15.7h122.1c8.9,0,15.6-7.4,14.9-15.7l-4.5-58.1c12.6-4.5,26.8-11.9,33.5-24.6c6-10.4,6-22.3,0.8-34.3    C359.7,581.3,356.7,574.6,354.5,569.4L354.5,569.4L354.5,569.4z\" fill=\"currentColor\" />\n\t\t<path d=\"M437.9,428.7c0,34.3,27.5,62.5,62.5,62.5s62.5-27.5,62.5-62.5s-27.5-62.5-62.5-62.5    C465.4,366.2,437.9,394.5,437.9,428.7z\" fill=\"currentColor\" />\n\t\t<path d=\"M552.5,606.6c-4.5,1.5-8.9,2.2-12.7,3c-11.9,1.5-20.8,12.7-19.4,24.6c1.5,11.2,11.2,19.4,21.6,19.4h3    c1.5,0,4.5-0.8,6.7-1.5v13.4c0,3-2.2,5.2-4.5,6l-45.4,13.4h-3.7l-45.4-13.4c-2.1-0.8-4.4-3-4.4-6V652c3,0.8,5.2,0.8,6.7,1.5    c11.9,1.5,23.1-6.7,24.6-19.4c1.5-11.9-6.7-23.1-19.4-24.6c-4.5-0.8-8.9-1.5-12.6-3v-20.8c0-4.5,4.5-7.4,8.2-6l41.7,12.7h3.7    l41.7-12.7c4.5-1.5,8.2,2.2,8.2,6l0,20.8H552.5z M598.7,569.4c-11.2-28.3-23.8-59.5-64-59.5h-67.8c-40.2,0-52.9,32-64,59.5    c-2.2,6-5.2,11.9-8.2,18.6c-5.2,11.9-4.5,23.8,1.5,34.3c6.7,12.7,20.9,20.1,33.5,24.6l-4.5,58.1c-0.8,8.9,6,15.7,14.9,15.7h122.1    c8.9,0,15.7-7.4,14.9-15.7l-4.5-58.1c12.7-4.5,26.8-11.9,33.5-24.6c6-10.4,6-22.3,0.8-34.3C603.2,581.3,600.9,574.6,598.7,569.4    L598.7,569.4z\" fill=\"currentColor\" />\n\t\t<path d=\"M682,428.7c0,34.3,27.5,62.5,62.5,62.5s62.5-27.5,62.5-62.5s-27.5-62.5-62.5-62.5    C710.3,366.9,682,394.5,682,428.7z\" fill=\"currentColor\" />\n\t\t<path d=\"M796.7,606.6c-4.5,1.5-8.9,2.2-12.7,3c-11.9,1.5-20.8,12.7-19.4,24.6c1.5,11.2,11.2,19.4,21.6,19.4h3    c1.5,0,4.5-0.8,6.7-1.5v13.4c0,3-2.2,5.2-4.5,6l-45.4,13.4h-3.7l-45.4-13.4c-3-0.8-4.5-3-4.5-6V652c3,0.8,5.2,0.8,6.7,1.5    c11.9,1.5,23.1-6.7,24.6-19.4c1.5-11.9-6.7-23.1-19.4-24.6c-4.5-0.8-8.9-1.5-12.7-3v-20.8c0-4.5,4.5-7.4,8.2-6l41.7,12.7h3.7    l41.7-12.7c4.5-1.5,8.2,2.2,8.2,6v20.9L796.7,606.6L796.7,606.6z M850.3,588c-3-6.7-5.2-12.7-7.4-18.6    c-11.2-28.3-23.8-59.5-64-59.5h-67.8c-40.2,0-52.9,32-64,59.5c-2.2,6-5.2,11.9-8.2,18.6c-5.2,11.9-4.5,23.8,1.5,34.3    c6.7,12.7,20.8,20.1,33.5,24.6l-4.5,58.1c-0.8,8.9,6,15.7,14.9,15.7l121.4,0c8.9,0,15.7-7.4,14.9-15.7l-4.5-58.1    c12.7-4.5,26.8-11.9,33.5-24.6C855.5,611.8,855.5,599.2,850.3,588L850.3,588L850.3,588z\" fill=\"currentColor\" />\n\t</g>\n</g>\n</svg>","guitar":"<svg viewBox=\"0 0 1000 1000\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><g><path d=\"M483.4,691.6c.3-21.3,5.5-34.7,33.3-42.3,11-3,56.3-19.4,62.9-58.1,1.6-9.1,1.7-17.4,.8-25.2-49.8,30.3-94-17-56.9-54.2l14.3-15,195.8-203.6,1.6-1.6c5.7-4.7,17.1-10.9,24-5.9,2.7-3.9,7-9.4,12.1-15.4l3.9,3.9c-1.6,2.9-1.2,6.6,1.3,9.1s6.1,3.1,10-.9,3.9-7,.9-10-6.2-2.9-9.1-1.3l-4.1-4.1c3.5-3.9,7.3-8,11.3-12.1l4.6,4.6c-1.6,2.9-1.2,6.6,1.3,9.1s6.1,3.1,10-.9,3.9-7,.9-10-6.2-2.9-9.1-1.3l-4.6-4.6c3.9-3.9,8-7.6,12.1-11.1,0,0,0,0,.1,0l4,4c-1.6,2.9-1.2,6.6,1.3,9.1,3,3,6.1,3.1,10-.9s3.9-7,.9-10-6.2-2.9-9.1-1.3l-3.7-3.7c5.5-4.4,11.1-8.3,16.4-11.1-7.1-3.4-5.7-20.3-14-23.5-1.9-.5-5-.5-7,0,.4-2,0-4.7,.2-6.7-3.3-8.8-21-7.2-23.4-14-2.8,5.3-6.7,10.9-11.1,16.4l-3.7-3.7h0c1.6-2.9,1.2-6.6-1.3-9.1s-6.1-3.1-10,.9c-3.9,3.9-3.9,7-.9,10s6.2,2.9,9.1,1.3l4,4c-3.5,4.2-7.3,8.3-11.2,12.2l-4.6-4.6s0,0,0,0c1.6-2.9,1.2-6.7-1.3-9.1-3-3-6.1-3.1-10,.9-3.9,3.9-3.9,7-.9,10s6.2,2.9,9.1,1.3l4.6,4.6c-4.1,4-8.2,7.8-12.1,11.3l-4.1-4.1h0c1.6-2.9,1.2-6.6-1.3-9.1-3-3-6.1-3.1-10,.9-3.9,3.9-3.9,7-.9,10,2.5,2.5,6.2,2.9,9.1,1.3l3.9,3.9c-6,5.2-11.4,9.4-15.4,12.1,5,6.9-1.2,18.3-5.9,24l-1.6,1.6-203.6,195.8h0c-26.6-26.8-52.4-49.1-94.3-41.8-38.7,6.6-55.1,51.9-58.1,62.9-7.6,27.8-21,33-42.3,33.3-55.6,.7-93.8,17.5-117.1,40.8-36.8,36.8-70.6,127.2,13.9,219.6,.4,.9,.9,1.8,1.6,2.7-1.8,1.9-.5,3.3-.1,4.5l-3.3,3.3c-.1,0-.2,0-.4,0l-1.7-1.7c-.4-.4-1.1-.4-1.5,0l-1.6,1.6c-.4,.4-.4,1.1,0,1.5l9.9,9.9c.4,.4,1.1,.4,1.5,0l1.6-1.6c.4-.4,.4-1.1,0-1.5l-1.7-1.7c0-.1,0-.2,0-.3l3.3-3.3c1.3,.3,2.7,1.5,4.5-.1,.9,.6,1.8,1.1,2.6,1.5,0,0,.2,.2,.3,.3,92.3,84.2,182.6,50.4,219.4,13.6,23.3-23.3,40.2-61.6,40.8-117.1Zm-71.4-100.7c-14.6-14.6-14.6-38.2,0-52.7,14.6-14.6,38.2-14.6,52.7,0,14.6,14.6,14.6,38.2,0,52.7-14.6,14.6-38.2,14.6-52.7,0Z\" fill=\"currentColor\" /></g></svg>","electric-guitar":"<svg viewBox=\"0 0 1000 1000\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><g /><g><g><path d=\"M845.04,176.3c-8.87-5.05-22.2,2-22.2,2l-.03,.03-1.23-2.81s5.16-2.38,2.05-8.39c-3.11-6.01-9.21-2.31-9.21-2.31,0,0-7.42,3.73-4.26,9.5,3.16,6.21,8.42,3.03,8.42,3.03l1.55,2.41-16.32,8.7-1.12-2.73s5.17-2.34,2.05-8.33c-3.04-5.95-9.24-2.35-9.24-2.35,0,0-7.38,3.74-4.2,9.56,3.12,6.17,8.42,3.03,8.42,3.03l1.39,2.25-16.29,8.69-1.03-2.61s5.18-2.34,2.08-8.36c-3.12-5.92-9.24-2.34-9.24-2.34,0,0-7.45,3.75-4.23,9.52,3.12,6.24,8.42,3.09,8.42,3.09l1.34,2.13-16.51,8.77-1.08-2.7s5.17-2.4,2.08-8.36c-3.09-5.95-9.27-2.31-9.27-2.31,0,0-7.34,3.77-4.2,9.56,3.19,6.1,8.46,2.98,8.46,2.98l1.32,2.25-16.75,8.93,.52-.29-1.07-2.67s5.09-2.45,2.05-8.33c-3.07-5.98-9.22-2.36-9.22-2.36,0,0-7.42,3.72-4.25,9.48,3.12,6.23,8.45,3.06,8.45,3.06l1.41,2.23-17.75,9.46,1.33-.74-1.03-2.66s5.18-2.36,2.07-8.31c-3.11-5.95-9.29-2.36-9.29-2.36,0,0-7.37,3.72-4.16,9.51,3.09,6.2,8.37,3.02,8.37,3.02l1.38,2.21-9.44,5.03s-6.42,3.04-6.03,7.89c.29,3.4,.28,7.6,.44,8.79,.5,4.74-5.04,9.73-5.04,9.73l-258.97,247.86-5.02,4.78s-14.05,8.51-26.76-4.85c-19.65-21.84-6.46-44.49-2.5-49.7,1.86-2.51,4.23-6.83,14.48-14.71,9.62-7.4,10.32-19.23,3.07-24.47-12.79-8.94-35.16,.42-35.16,.42,0,0-34.57,11.83-69.07,83.82-20.41,42.55-47.71,50.54-47.71,50.54l-76.66,32.34s-75.01,32.32-65.55,100.65c6.39,46.41,59.91,97.36,59.91,97.36l5.07,5.35s41.13,41.13,60.75,51.86c65.26,33.46,107.45-15.01,122.68-38.24,13.25-22.6,25.79-52.31,37.36-82.63,11.14-29.46,38.81-37.87,38.81-37.87,0,0,35.18-13.14,53.04-28.96,17.38-15.93,20.39-32.44,20.39-32.44,0,0,3.14-9.84-4.62-16.59-9.11-8.04-21.75,3.24-21.75,3.24,0,0-27.53,26.08-52.68-.6-15.09-16-9.57-28.49-9.57-28.49l35.96-36.58,255.43-259.47s14.79-14.37,35.62-8.77c6.55,.89,8.79-4.17,8.79-4.17l32.39-47.16s4.14-7.16,11.06-4.61c23.34,8.56,32.47-12.02,32.47-12.02,0,0,10.81-20.84-11.2-31.46Z\" fill=\"currentColor\" /></g></g></svg>","bass":"<svg viewBox=\"0 0 1000 1000\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\">\n<g>\n</g>\n<g>\n\t<g>\n\t\t<path d=\"M857.5,164.2c-8.2-6.9-17.6-7.9-27.5-3.6c-0.3,0.1-2.8,1.7-6.7,4.2c-0.3-0.5-0.6-0.9-0.5-1    c1-1.6,0.2-2.9-0.3-4.3c-0.1-0.6-0.2-1.2-0.3-1.9c0-0.2,0-0.4,0-0.7c0.1-1.7,0.6-3.3,1.6-4.7c2.2-3.3,2.8-6.7,0.7-10.1    c-2.2-3.6-5.8-4.4-9.9-4.1c-1.3,0.1-2.7,0.1-4-0.2c-5.7-1.4-9.8,1.2-11.1,6.9c-0.4,1.6-1,3.1-1.8,4.6c-1.8,3.1-2.4,6.3-0.4,9.3    c2,3,4.8,4.8,8.8,3.9c3-0.6,5.7,0.2,8.1,2.1c1.2,1,2.1,2.8,4.2,1.9c0.3,0.3,0.5,0.6,0.7,1c-7,4.5-16.8,10.9-27.6,17.9    c-0.3-0.4-0.5-0.7-0.4-0.8c1-1.6,0.2-2.9-0.3-4.3c-0.1-0.6-0.2-1.2-0.3-1.9c0-0.2,0-0.4,0-0.7c0.1-1.7,0.6-3.3,1.6-4.6    c2.2-3.3,2.8-6.7,0.7-10.1c-2.2-3.6-5.8-4.4-9.9-4.1c-1.3,0.1-2.7,0.1-4-0.2c-5.7-1.4-9.8,1.2-11.1,6.9c-0.4,1.6-1,3.1-1.8,4.6    c-1.8,3.1-2.4,6.3-0.4,9.3c2,3,4.8,4.8,8.8,3.9c3-0.6,5.7,0.2,8.1,2.1c1.2,1,2.1,2.8,4.2,1.9c0.1,0,0.3,0.4,0.6,0.8    c-9,5.9-18.5,12.1-27.6,18c-0.2-0.3-0.4-0.6-0.3-0.7c1-1.6,0.2-2.9-0.3-4.3c-0.1-0.6-0.2-1.2-0.2-1.9c0-0.2,0-0.4,0-0.7    c0.1-1.7,0.6-3.3,1.6-4.7c2.2-3.3,2.8-6.7,0.7-10.1c-2.2-3.6-5.9-4.4-9.9-4.1c-1.3,0.1-2.7,0.1-4-0.2c-5.7-1.4-9.8,1.2-11.1,6.9    c-0.4,1.6-1,3.1-1.8,4.6c-1.8,3.1-2.4,6.3-0.4,9.3c2,3,4.8,4.8,8.8,3.9c3-0.6,5.7,0.2,8.1,2.1c1.2,1,2.1,2.8,4.2,1.9    c0.1,0,0.3,0.3,0.5,0.7c-10.5,6.9-20.2,13.2-27.6,18c-0.2-0.3-0.4-0.6-0.3-0.7c1-1.6,0.2-2.9-0.3-4.3c-0.1-0.6-0.2-1.2-0.3-1.9    c0-0.2,0-0.4,0-0.7c0.1-1.7,0.6-3.3,1.6-4.7c2.2-3.3,2.8-6.7,0.7-10.1c-2.2-3.6-5.8-4.4-9.9-4.1c-1.3,0.1-2.7,0.1-4-0.2    c-5.7-1.4-9.8,1.2-11.1,6.9c-0.4,1.6-1,3.1-1.8,4.6c-1.8,3.1-2.4,6.3-0.4,9.3c2,3,4.8,4.8,8.8,3.9c3-0.6,5.7,0.2,8.1,2.1    c1.2,1,2.1,2.8,4.2,1.9c0.1,0,0.2,0.3,0.5,0.6c-5.4,3.6-8.9,5.9-9.4,6.2c-6.2,4.3-7.6,9.4-4.8,16.3c0.9,2.1,1.9,4.2,2.8,6.4    c2.8,7.1,2,11.2-3.5,16.5l-5.3,5.1c-15.7,15.1-36,34.6-51.6,49.7c-23.9,23-47.7,45.9-71.6,68.9c-13.2,12.7-26.4,25.4-39.6,38.1    c-21.1,20.3-42.2,40.5-63.3,60.8l-12.2,11.8l-49.4,47.6c0,0-0.8,0.2-1.1,0.3l-0.4,0.1c-5.1,1.5-10.3,0-14.1-3.8l-0.1-0.1    c-1.8-1.9-3.3-4.1-4.2-6.5c-1-2.4-1.4-5-1.4-7.7l0-0.4c0.1-3.5,0.8-6.9,2.1-10.2l0.1-0.3c3.4-9.3,8.6-16.8,15-24.5l1.1-1.3    c10.2-11.7,13.8-20.9,13.8-20.9c5.3-11.2-5.5-18.3-5.5-18.3c-4.5-2.9-9.8-4.1-15-3.6l-0.3,0.1c-7,0.6-13.8,2.8-19.9,6.2l-0.4,0.2    c-10.3,5.7-19.7,12.9-28,21.2l-0.2,0.1c-14.8,14.7-26.9,31.9-35.8,50.8l-0.2,0.4c-3.9,8.2-8,15.8-12.6,23.7l-0.2,0.4    c-9.4,16-22.4,29.4-38.1,39.3l-0.3,0.2c-7.8,4.9-16.2,8.7-25,11.3l-0.2,0.1c-12.8,3.7-32.8,10.2-57.7,24.3l-0.3,0.1    c-18.8,10.5-33.6,26.8-42.2,46.5l-0.1,0.3c-4.4,9.8-6.6,20.5-6.4,31.2s2.5,21.3,7,31l0.1,0.2c7.9,17,18.7,32.6,32,45.8l38.5,38.5    c11.8,11.8,25.4,21.7,40.2,29.2l0.1,0c12.2,6.3,25.9,9.1,39.6,8.2s26.9-5.5,38.2-13.4l0.1-0.1c14.6-10.2,26.7-23.5,35.5-38.9    l0.1-0.1c7.5-13.1,13.8-26.9,18.8-41.2l0.1-0.2l8.9-25.3l0-0.1c1.4-4,3-7.9,4.9-11.8l0-0.1c3.7-7.8,9.9-14.1,17.5-18.1l0.1-0.1    c3.6-1.9,7.3-3.5,11.2-4.7l0.2,0c15.5-4.9,29.8-12.7,42.3-23l0.2-0.1c7.8-6.4,14.5-14.2,19.7-22.9l0.1-0.1    c4.1-6.7,5.5-14.7,3.9-22.4l0-0.2c-0.4-1.9-1.1-3.7-2.2-5.3c-1.1-1.6-2.5-3-4.1-4.1c-1.6-1.1-3.4-1.8-5.3-2.2s-3.9-0.4-5.8,0    c-0.8,0.1-1.6,0.3-2.4,0.7l-0.1,0c-2.8,1.1-5.3,2.5-7.7,4.3l-0.2,0.2c-4.2,3.3-8.8,6-13.8,8.1l-0.3,0.1c-3.1,1.4-6.4,2.3-9.8,2.8    h-0.1c-4.4,0.7-8.9,0.1-12.9-1.7l-0.2-0.1c-5.2-2.3-9.9-5.7-13.7-10l-0.2-0.2c-2.5-2.8-2.9-7.1-2.4-10.2s3.5-6.2,4.5-7.3    c0,0,28-29.2,28.4-29.6l48.2-50.3l7.1-7.4c28.3-29.3,56.5-58.7,84.8-88c21-21.8,42.1-43.6,63.1-65.4    c25.9-26.8,51.7-53.6,77.5-80.5l6.9-7.2c2.2-2.2,4.5-4.3,6.9-6.3c9.1-7.5,18.9-8.4,29.1-3c3.2,1.7,3.4,1.7,5.9-0.9    c9.2-9.9,17.6-20.4,24-32.4c5.3-9.9,10.7-19.7,16.5-29.3c3.5-5.8,8.9-8.9,15.9-8.5c1.9,0.1,3.8,0.1,5.8,0    c13.5-0.6,24-11.9,26-23.2C869,179.5,865.4,170.8,857.5,164.2L857.5,164.2z\" fill=\"currentColor\" />\n\t</g>\n</g>\n</svg>","keyboard":"<svg viewBox=\"0 0 1000 1000\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\">\n<g>\n</g>\n<g>\n\t<g>\n\t\t<path d=\"M252.9,142.3h-44.8c-37.1,0-67.2,30.1-67.2,67.2v582.1c0,37.1,30.1,67.2,67.2,67.2h89.6V522.9h-22.4    c-12.4,0-22.4-11.8-22.4-26.3L252.9,142.3L252.9,142.3z\" fill=\"currentColor\" />\n\t\t<path d=\"M342.5,522.9h22.4c12.4,0,22.4-11.8,22.4-26.3V142.3H432v354.2c0,14.5,10,26.3,22.4,26.3h22.4v335.8H342.5    L342.5,522.9L342.5,522.9z\" fill=\"currentColor\" />\n\t\t<path d=\"M521.5,522.9v335.8h134.3V522.9h-22.4c-12.4,0-22.4-11.8-22.4-26.3V142.3h-44.8v354.2    c0,14.5-10,26.3-22.4,26.3L521.5,522.9L521.5,522.9z\" fill=\"currentColor\" />\n\t\t<path d=\"M745.4,142.3v354.2c0,14.5-10,26.3-22.4,26.3h-22.4v335.8h89.5c37.1,0,67.2-30,67.2-67.2V209.5    c0-37.1-30-67.2-67.2-67.2H745.4L745.4,142.3z\" fill=\"currentColor\" />\n\t</g>\n</g>\n</svg>","piano":"<svg viewBox=\"0 0 1000 1000\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\">\n<g>\n</g>\n<g>\n\t<g>\n\t\t<path d=\"M585.5,639.8l12.4,180l11.7,3.3l11.7-3.7l12.4-194.6l-24.1,7.4L585.5,639.8L585.5,639.8z M249.9,721.4    l12.1,3.5l12.5-3.6l12.4-134.4l-49.4-14L249.9,721.4L249.9,721.4z M546.5,540.6l-310.7-86.2c-6.9-1.9-7.9-11.6-1.1-13.6l12-3.6    c7.4-2.2,15.1-2.2,22.5-0.1l318.4,88.5l15-4.3c16.5-4.8,28.1-13.7,32.3-27.8l-329-95.2c-6.3-1.8-9.7-7.5-9.7-14v-22.2    c0-9.7,8.4-16.7,17.7-14l324.8,93.5c2.7-16.3,13.4-34,28.3-38.6l92.5-28.4c40.8-12.5,85.9-33.1,83.9-63.3    c0,0-190.9-97.7-530.7-14.5l-23.4,5.5c-17.1,5.2-34.1,21-34.1,38.8v32.8c0,21.7-9,40.8-29.8,46.8l-48.6,14.2    c-21.4,6.2-36,25.8-36,48v53.6L525,642v-51.9C525,571.9,531.1,551,546.5,540.6L546.5,540.6L546.5,540.6z M801.6,572.6L814,721.6    l12.4,3.6l12.4-3.8L851,539C841.8,553.1,823.7,563.7,801.6,572.6L801.6,572.6L801.6,572.6z M765.2,385.7l-87.4,26.4    c-17,5.2-30.1,21-30.1,38.8v32.8c0,21.7-14.3,40.8-35.1,46.8l-46,14.2c-21.4,6.2-33.3,25.8-33.3,48v51.9l235.2-71    c42.4-12.8,75.4-28.6,91.8-64.7V320.1C843.8,359.2,807.8,372.6,765.2,385.7L765.2,385.7L765.2,385.7z\" fill=\"currentColor\" />\n\t</g>\n</g>\n</svg>","drums":"<svg viewBox=\"0 0 1000 1000\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\">\n<g>\n</g>\n<g>\n\t<g>\n\t\t<path d=\"M735.9,509.3c-3.2,0-5.8,2.6-5.8,5.8v5.8h-5.8V463h5.8c3.2,0,5.8-2.6,5.8-5.8s-2.6-5.8-5.8-5.8H568.2    c-3.2,0-5.8,2.6-5.8,5.8s2.6,5.8,5.8,5.8h5.8v27.7c14.4,11.8,26.9,25.9,36.8,41.7h119.3c0,6.4-5.2,11.6-11.6,11.6h-101    c2,3.8,3.8,7.6,5.6,11.6h14.5v142.3l-20.2,8.4c-3.1,5.8-6.4,11.3-10.1,16.7l31.1-12.9c1.7,4.3,5.8,7.5,10.8,7.5s9.1-3.1,10.8-7.5    l44.9,18.6c-2.1,2.3-2,5.8,0.2,8l1.4,1.4c1.1,1.1,2.5,1.7,4.1,1.7l17.5,0c5.3,0,7.8-6.5,3.9-10l-10.5-9.8c-2.2-2-5.4-2-7.6-0.1    l-53-22V555.6h57.8c12.7,0,23.1-10.4,23.1-23.1v-17.3C741.7,511.9,739.1,509.3,735.9,509.3L735.9,509.3z\" fill=\"currentColor\" />\n\t\t<path d=\"M169.2,723.3v-81h122.3c-0.6-5.7-0.9-11.5-0.9-17.3c0-45.5,17.6-86.9,46.3-117.9v-49.8h5.8    c3.2,0,5.8-2.6,5.8-5.8s-2.6-5.8-5.8-5.8H146.1c-3.2,0-5.8,2.6-5.8,5.8s2.6,5.8,5.8,5.8h5.8v173.5h-5.8c-3.2,0-5.8,2.6-5.8,5.8    s2.6,5.8,5.8,5.8h11.6v81c-3.2,0-5.8,2.6-5.8,5.8v23.1c0,3.2,2.6,5.8,5.8,5.8h11.6c3.2,0,5.8-2.6,5.8-5.8v-23.1    C175,725.9,172.4,723.3,169.2,723.3L169.2,723.3z\" fill=\"currentColor\" />\n\t\t<path d=\"M880.5,317.8c0-10.2-82.1-21.9-82.1-21.9c-3-6.5-11.9-11.5-23.1-12.6v-22.7c0-3.2-2.6-5.8-5.8-5.8    s-5.8,2.6-5.8,5.8v23c-10.1,1.5-18.1,6.2-20.9,12.2c0,0-82.1,11.7-82.1,21.9H880.5z M748.6,623.6L671.2,677v11.6h6.1    c3.6,0,7.2-0.7,10.5-2l70.9-27.7h21.6l44.9,18.6c-2.1,2.3-2,5.8,0.2,8l1.4,1.4c1.1,1.1,2.5,1.7,4.1,1.7l17.5,0    c5.3,0,7.8-6.5,3.9-10l-10.5-9.8c-2.2-2-5.4-2-7.6-0.1l-53-22V363.5c8.4-2,14.9-6.3,17.3-11.6c0,0,82.1-11.7,82.1-21.9H660.8    c0,10.2,82.1,21.9,82.1,21.9c2.2,4.8,7.8,8.8,15.1,11v285.2L688.5,677l60.2-41.3L748.6,623.6L748.6,623.6z\" fill=\"currentColor\" />\n\t\t<path d=\"M423.7,353.2c3.2,0,5.8-2.6,5.8-5.8s-2.6-5.8-5.8-5.8H273.3c-3.2,0-5.8,2.6-5.8,5.8s2.6,5.8,5.8,5.8v63.6    c-3.2,0-5.8,2.6-5.8,5.8s2.6,5.8,5.8,5.8h150.4c3.2,0,5.8-2.6,5.8-5.8s-2.6-5.8-5.8-5.8V353.2z\" fill=\"currentColor\" />\n\t\t<path d=\"M504.6,416.8c-3.2,0-5.8,2.6-5.8,5.8s2.6,5.8,5.8,5.8h127.2c3.2,0,5.8-2.6,5.8-5.8s-2.6-5.8-5.8-5.8v-63.6    c3.2,0,5.8-2.6,5.8-5.8s-2.6-5.8-5.8-5.8H504.6c-3.2,0-5.8,2.6-5.8,5.8s2.6,5.8,5.8,5.8L504.6,416.8L504.6,416.8z\" fill=\"currentColor\" />\n\t\t<path d=\"M493,376.3h-17.4c0-6.4-5.2-11.6-11.6-11.6s-11.6,5.2-11.6,11.6h-17.4v11.6h17.4v64c3.8-0.2,7.7-0.4,11.6-0.4    s7.7,0.1,11.6,0.4v-64H493V376.3z\" fill=\"currentColor\" />\n\t\t<g>\n\t\t\t\n\t\t\t\t<rect x=\"586.3\" y=\"723.1\" transform=\"matrix(0.7071 -0.7071 0.7071 0.7071 -359.5967 639.475)\" width=\"11.6\" height=\"61.5\" fill=\"currentColor\" />\n\t\t\t<path d=\"M628.6,786.8l-17.5,0c-1.5,0-3-0.6-4.1-1.7l-1.4-1.4c-2.3-2.3-2.3-5.9,0-8.2l8.3-8.3c2.2-2.2,5.7-2.3,8-0.2     l10.5,9.8C636.4,780.4,633.9,786.9,628.6,786.8z\" fill=\"currentColor\" />\n\t\t\t\n\t\t\t\t<rect x=\"305.4\" y=\"748\" transform=\"matrix(0.7071 -0.7071 0.7071 0.7071 -434.5667 458.4894)\" width=\"61.5\" height=\"11.6\" fill=\"currentColor\" />\n\t\t\t<path d=\"M299.7,786.8l17.5,0c1.5,0,3-0.6,4.1-1.7l1.4-1.4c2.3-2.3,2.3-5.9,0-8.2l-8.3-8.3c-2.2-2.2-5.7-2.3-8-0.2     l-10.5,9.8C291.9,780.4,294.4,786.9,299.7,786.8z\" fill=\"currentColor\" />\n\t\t\t<path d=\"M464.1,463c-89.4,0-161.9,72.5-161.9,161.9s72.5,161.9,161.9,161.9S626.1,714.4,626.1,625     S553.6,463,464.1,463L464.1,463z M464.1,758c-24,0-43.4-19.4-43.4-43.4s19.4-43.4,43.4-43.4s43.4,19.4,43.4,43.4     S488.1,758,464.1,758z\" fill=\"currentColor\" />\n\t\t</g>\n\t</g>\n</g>\n</svg>","mixer":"<svg viewBox=\"0 0 1000 1000\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><g /><g><g><path d=\"M691.04,484.58c-35.37,0-64.14-28.64-64.14-64.14s28.76-64.14,64.14-64.14,64.14,28.76,64.14,64.14-28.64,64.14-64.14,64.14Zm38.99,239.74c0,21.58-17.38,39.27-39.11,39.27s-38.96-17.68-38.96-39.27v-226.74c11.69,6.15,25.02,9.44,39.11,9.44s27.27-3.29,38.96-9.28v226.59Zm-229.48-79.3c-35.37,0-64.14-28.64-64.14-64.14s28.76-64.14,64.14-64.14,64.14,28.76,64.14,64.14-28.61,64.14-64.14,64.14Zm39.02,79.3c0,21.58-17.38,39.27-39.11,39.27s-38.96-17.68-38.96-39.27v-66.24c11.69,6,25.02,9.44,39.11,9.44s27.27-3.29,38.96-9.44v66.24Zm-229.51-160.9c-35.37,0-64.14-28.64-64.14-64.14s28.76-64.14,64.14-64.14,64.14,28.76,64.14,64.14c.03,35.49-28.61,64.14-64.14,64.14Zm39.02,160.9c0,21.58-17.38,39.27-39.11,39.27s-38.96-17.68-38.96-39.27v-147.9c11.69,6.15,25.02,9.44,39.11,9.44s27.27-3.29,38.96-9.28v147.75Zm-78.08-447.6c0-21.73,17.53-39.27,38.96-39.27,10.78,0,20.52,4.35,27.73,11.54,7.03,7.03,11.38,16.77,11.38,27.73v145.34c-11.69-6.15-25.02-9.44-38.96-9.44s-27.43,3.29-39.11,9.44v-145.34Zm190.48,0c0-21.73,17.53-39.27,38.96-39.27,10.78,0,20.52,4.35,27.73,11.54,7.03,7.03,11.38,16.77,11.38,27.73v227.02c-11.69-6.15-24.87-9.44-38.96-9.44s-27.43,3.44-39.11,9.44v-227.02Zm190.45,0c0-21.73,17.53-39.27,38.96-39.27,10.78,0,20.67,4.35,27.73,11.54,7.03,7.03,11.38,16.77,11.38,27.73v66.39c-11.69-6-24.87-9.28-38.96-9.28s-27.43,3.29-39.11,9.44v-66.54Zm106.63-135.85H242.51c-56.13,0-101.6,45.48-101.6,101.6V758.5c0,56.16,45.48,101.64,101.6,101.64H758.55c56.16,0,101.64-45.48,101.64-101.6V242.47c0-56.13-45.48-101.6-101.6-101.6Z\" fill=\"currentColor\" /></g></g></svg>","computer":"<svg viewBox=\"0 0 1000 1000\" fill-rule=\"evenodd\" clip-rule=\"evenodd\" stroke-linejoin=\"round\" stroke-miterlimit=\"2\" class=\"wr-studio-icon\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\">\n    <g>\n        <g>\n            <path d=\"M188.3,199.9L812.2,199.9L812.2,585.1L188.3,585.1L188.3,199.9ZM527.1,636.4L527,636.2L526.9,635.9L526.8,635.5L526.7,635.4L526.3,634.4L526.2,634.3L526,634L525.9,633.7L525.6,633.1L525.4,632.6L525.4,632.5L524.8,631.3L524.7,631.2L524.4,630.8L524.4,630.7L524.1,630.3L524,630.1L523.8,629.9L522.9,628.7L522.8,628.6L522.6,628.3L522,628L521.9,627.8L519.6,625.5L519.2,625.2L518.6,624.6L517.4,623.7L517.2,623.5L516.6,623.2L516.5,623.2L516,622.9L515.2,622.5L514.9,622.3L514.8,622.2L513.8,621.8L513.7,621.7L513.4,621.6L513.1,621.4L512.9,621.3L511.9,620.9L511.8,620.8L511.4,620.7L511.2,620.6L510.4,620.4L509.9,620.2L509.8,620.2L509.3,620.1L509.1,620L508.8,619.9L508.4,619.8L508.3,619.8L507.2,619.5L507,619.5L506.6,619.4L506.3,619.3L506.1,619.3L505.6,619.2L505.5,619.2L505,619.1L504.9,619.1L504.5,619L504,619L503.5,618.9L497.6,618.9L497.1,619L496.6,619L496.2,619.1L496.1,619.1L495.6,619.2L495.5,619.2L495,619.3L494.8,619.3L494.5,619.4L494.1,619.5L493.9,619.5L492.8,619.8L492.7,619.8L492.3,619.9L492,620L491.8,620.1L491.3,620.2L491.2,620.2L490.7,620.4L489.9,620.6L489.7,620.7L489.3,620.8L489.2,620.9L488.2,621.3L488,621.4L487.7,621.6L487.4,621.7L487.3,621.8L486.3,622.2L486.2,622.3L485.9,622.5L485.1,622.9L484.6,623.2L484.5,623.2L483.9,623.5L483.7,623.7L482.5,624.6L481.9,625.2L481.5,625.5L478.8,628.2L478.6,628.5L478.5,628.6L477.6,629.8L477.4,630L477.3,630.2L477,630.6L477,630.7L476.7,631.1L476.6,631.2L476,632.4L476,632.5L475.8,633L475.5,633.6L475.4,633.9L475.2,634.2L475.1,634.3L474.7,635.3L474.6,635.4L474.5,635.8L474.4,636.1L474.3,636.3C473.1,639.5 472.4,643 472.4,646.6C472.4,662.5 485.3,675.4 501.2,675.4C517.1,675.4 530,662.5 530,646.6C530,642.9 529.3,639.5 528.1,636.3L527.1,636.3L527.1,636.4ZM172.2,151.9L828.1,151.9C845.7,151.9 860.1,166.3 860.1,183.9L860.1,676.4C860.1,694 845.7,708.4 828.1,708.4L563.9,708.4C567.2,737.3 574.2,766.2 586.1,795.2L660,795.2L660,843.2L340.4,843.2L340.4,795.2L414.3,795.2C426.2,766.3 433.3,737.4 436.5,708.4L172.3,708.4C154.7,708.4 140.3,694 140.3,676.4L140.3,183.9C140.3,166.3 154.7,151.9 172.2,151.9Z\" fill=\"currentColor\" />\n        </g>\n    </g>\n</svg>"};
  function rosterIcon(label, emoji) {
    var key = /主领|人声/.test(label) ? 'mic'
      : /伴唱|合唱/.test(label) ? 'choir'
      : /电吉他/.test(label) ? 'electric-guitar'
      : /贝斯|貝斯/.test(label) ? 'bass'
      : /民谣|木吉他|吉他/.test(label) ? 'guitar'
      : /键盘|鍵盤/.test(label) ? 'keyboard'
      : /钢琴|鋼琴|乐器/.test(label) ? 'piano'
      : /鼓/.test(label) ? 'drums'
      : /音控|调音/.test(label) ? 'mixer'
      : /投影/.test(label) ? 'computer' : null;
    if (!key) return ymIconOrEmoji(emoji);
    var holder = document.createElement('span');
    holder.innerHTML = YM_ROSTER_ICONS[key];
    return holder.firstElementChild;
  }

  function buildRoster() {
    if (!C.sheetName) return null;
    var API_URL = C.apiBase + '?sheet=' + encodeURIComponent(C.sheetName);
    var data = {}, isAdmin = false, curView = '所有';

    var root    = div('wr-root');
    var tabsWrap= div('wr-tabs-wrap');
    var tabs    = div('wr-tabs');
    var card    = div('wr-card ym-tilt ym-reveal');
    var head    = div('wr-head');
    var titleEl = el('div',{class:'wr-title',text:'所有服侍分工'});
    var acts    = div('wr-actions');
    var content = div('');
    var saveBtn = el('button',{text:'💾 保存',style:'display:none'});

    var lockBtn = el('button',{text:'🔒 管理员'});
    acts.appendChild(lockBtn);
    acts.appendChild(saveBtn);
    head.appendChild(titleEl);
    head.appendChild(acts);
    card.appendChild(head);
    card.appendChild(content);

    var tabDefs = [
      {label:'📋 所有', view:'所有'},
      {label:'🎤 人声', view:'🎤'},
      {label:'🎹 乐器', view:'🎹'},
      {label:'🎛️ 音控', view:'🎛️'},
    ];
    tabDefs.forEach(function(td){
      var parts = ymSplitLabel(td.label);
      var t = el('a',{class:'wr-tab'+(td.view==='所有'?' active':'')});
      var ic = rosterIcon(parts.text, parts.emoji); if(ic) t.appendChild(ic);
      t.appendChild(el('span',{text: parts.text}));
      t.addEventListener('click', function(){
        tabs.querySelectorAll('.wr-tab').forEach(function(x){x.classList.remove('active')});
        t.classList.add('active');
        curView = td.view;
        render();
      });
      tabs.appendChild(t);
    });

    tabsWrap.appendChild(tabs);
    root.appendChild(tabsWrap);
    root.appendChild(card);

    function teamClass(g){
      if(g.indexOf('🎤')>=0 || g.indexOf('人声')>=0) return 'wr-team-a';
      if(g.indexOf('🎹')>=0 || g.indexOf('乐器')>=0) return 'wr-team-b';
      if(g.indexOf('🎛')>=0 || g.indexOf('音控')>=0) return 'wr-team-c';
      return 'wr-team-a';
    }

    function render(){
      content.innerHTML = '';
      titleEl.textContent = curView === '所有' ? '所有服侍分工' : '服侍分工';
      var groups = Object.keys(data).filter(function(k){ return curView==='所有'||k.includes(curView); });
      groups.forEach(function(g){
        var grp = el('div',{class:'wr-group '+teamClass(g)});
        var gp = ymSplitLabel(g);
        var filled = 0;
        Object.values(data[g]).forEach(function(arr){ (arr||[]).forEach(function(n){ if(String(n).trim()) filled++; }); });
        grp.appendChild(el('div',{class:'wr-group-hd'},[
          el('span',{class:'wr-group-ic'},[ rosterIcon(gp.text, gp.emoji) ]),
          el('span',{class:'wr-group-nm', text: gp.text || g}),
          el('span',{class:'wr-group-ct', text: filled + ' 人'}),
        ]));
        var grid = div('wr-grid');
        Object.entries(data[g]).forEach(function(entry, si){
          var role = entry[0], arr = entry[1] || [];
          var rp = ymSplitLabel(role);
          var sec  = div('wr-section ym-reveal');
          var stitle = div('wr-section-title');
          var rIc = rosterIcon(rp.text, rp.emoji);
          if(rIc){ if(rIc.tagName === 'svg'){ rIc.classList.add('ym-ic-pop'); rIc.style.animationDelay = (0.035 * si + 0.05).toFixed(2) + 's'; } stitle.appendChild(rIc); }
          stitle.appendChild(el('span',{text: rp.text || role}));
          sec.appendChild(stitle);
          var people = div('wr-people');
          arr.forEach(function(name,i){
            var row = div('wr-name');
            var initial = String(name||'').trim().charAt(0);
            var av = el('span',{class:'wr-avatar'+(initial?'':' empty'), text: initial || '·'});
            row.appendChild(av);
            var inp = el('input',{placeholder:'填写名字'}); inp.value=name; inp.disabled=!isAdmin;
            inp.addEventListener('input',function(e){
              arr[i]=e.target.value;
              var v=String(e.target.value||'').trim().charAt(0);
              av.textContent = v || '·';
              av.className = 'wr-avatar'+(v?'':' empty');
            });
            row.appendChild(inp);
            if(isAdmin){ var del=el('button',{text:'×','aria-label':'删除'}); del.onclick=function(){arr.splice(i,1);render();}; row.appendChild(del); }
            people.appendChild(row);
          });
          sec.appendChild(people);
          if(isAdmin){ var add=el('div',{class:'add-btn',text:'+ 新增'}); add.onclick=function(){arr.push('');render();}; sec.appendChild(add); }
          grid.appendChild(sec);
        });
        grp.appendChild(grid);
        content.appendChild(grp);
      });

      // 回填聚会流程「主领 ·」占位（数据在本表：角色名含「主领」的第一个非空名字）
      var leadSlot = document.querySelector('[data-ym-lead-slot]');
      if (leadSlot) {
        var lead = '';
        Object.keys(data).some(function(g){
          return Object.keys(data[g]||{}).some(function(role){
            if (role.indexOf('主领') < 0) return false;
            var n = (data[g][role]||[]).map(function(x){return String(x||'').trim();}).filter(Boolean)[0];
            if (n) { lead = n; return true; }
            return false;
          });
        });
        if (lead) { leadSlot.textContent = '主领 · ' + lead; leadSlot.style.display = ''; }
      }
    }

    lockBtn.onclick = function(){
      var pwd = prompt('管理员密码'); if(!pwd) return;
      isAdmin = true; saveBtn.style.display='inline-block'; render();
    };
    saveBtn.onclick = function(){
      var pwd = prompt('再次输入管理员密码'); if(!pwd) return;
      var url = C.apiBase+'?save=1&sheet='+encodeURIComponent(C.sheetName)+'&password='+encodeURIComponent(pwd)+'&data='+encodeURIComponent(JSON.stringify(data));
      fetch(url).then(function(r){return r.text()}).then(function(t){
        if(t==='ok') alert('已保存'); else if(t==='denied') alert('密码错误'); else alert('保存失败');
      });
    };

    fetch(API_URL).then(function(r){return r.json()}).then(function(d){ data=d||{}; render(); });
    return root;
  }

  /* ══════════════ Jianpu helpers ══════════════ */
  function getVoltaStartLabel(nStr){
    if(!nStr)return '';
    var m=nStr.match(/\[v:([^\]\s]+)\]/);
    if(m&&m[1])return m[1];
    if(nStr.indexOf('[v1')>=0)return '1';
    if(nStr.indexOf('[v2')>=0)return '2';
    return '';
  }
  function hasVoltaEnd(nStr){
    return !!(nStr&&nStr.indexOf(']v')>=0);
  }
  function normalizeTimeSignValue(sig){
    var m=String(sig||'').trim().replace(/\s+/g,'').replace(/\uFF0F/g,'/').match(/^(\d{1,2})\/(\d{1,2})$/);
    return m?(m[1]+'/'+m[2]):'';
  }
  function extractInlineTimeSignToken(tok){
    var m=String(tok||'').trim().match(/^\[(?:ts|timesign|meter):([^\]]+)\]$/i);
    return m?normalizeTimeSignValue(m[1]):'';
  }
  function getSegInlineTimeSign(seg){
    if(!seg)return'';
    return normalizeTimeSignValue(seg.timeSign||seg.ts||seg.meter||'');
  }
  /* 导航记号可与任意小节线组合：写法 = 小节线token + 记号名 连写，如 ||coda、:|fine、|:|segno。
     单写 coda/dc/... 时用各自的默认小节线（向后兼容）。不用正则(musictool 模板内禁反斜杠)。 */
  function barNavOf(tok){
    var NAVS={fine:'||/',dc:'||',ds:'||',coda:'|',segno:'|'};
    var t=String(tok||'');
    for(var n in NAVS){
      if(t.length>=n.length&&t.slice(-n.length)===n){
        var pre=t.slice(0,t.length-n.length);
        if(pre==='')return {bar:NAVS[n],nav:n};
        if(pre==='|'||pre==='||'||pre==='||/'||pre==='|]'||pre==='|:'||pre===':|'||pre==='|:|')return {bar:pre,nav:n};
      }
    }
    return {bar:t,nav:''};
  }
  function isBarlineTok(tok){
    var b=barNavOf(tok).bar;
    return b==='|'||b==='||'||b==='||/'||b==='|]'||b==='|:'||b===':|'||b==='|:|';
  }
  function makeBarline(tok){
    var _bn=barNavOf(tok),bar=_bn.bar,nav=_bn.nav;
    var o=document.createElement('span');o.className='jp-bar';
    o.style.cssText='display:inline-flex;flex-direction:column;align-items:flex-start;vertical-align:bottom;';
    var top=document.createElement('span');top.className='jp-bar-top';top.style.height='12px';o.appendChild(top);
    var mid=document.createElement('span');mid.className='jp-bar-mid';mid.style.cssText='display:inline-flex;align-items:stretch;height:26px;';
    function thin(){var l=document.createElement('span');l.className='jp-bar-stroke';l.style.cssText='width:1.5px;background:currentColor;flex-shrink:0;';return l;}
    function thick(){var l=document.createElement('span');l.className='jp-bar-stroke';l.style.cssText='width:3.5px;background:currentColor;flex-shrink:0;';return l;}
    function gap(px){var g=document.createElement('span');g.style.cssText='width:'+px+'px;flex-shrink:0;';return g;}
    function dots(){var d=document.createElement('span');d.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:6px;flex-shrink:0;';var d1=document.createElement('span');d1.style.cssText='width:3px;height:3px;border-radius:50%;background:currentColor;';var d2=document.createElement('span');d2.style.cssText='width:3px;height:3px;border-radius:50%;background:currentColor;';d.appendChild(d1);d.appendChild(d2);return d;}
    if(bar==='|'){mid.appendChild(thin());}
    else if(bar==='||'){mid.appendChild(thin());mid.appendChild(gap(2));mid.appendChild(thin());}
    else if(bar==='||/'||bar==='|]'){mid.appendChild(thin());mid.appendChild(gap(2));mid.appendChild(thick());}
    else if(bar==='|:'){mid.appendChild(thick());mid.appendChild(gap(1.5));mid.appendChild(thin());mid.appendChild(gap(3));mid.appendChild(dots());}
    else if(bar===':|'){mid.appendChild(dots());mid.appendChild(gap(3));mid.appendChild(thin());mid.appendChild(gap(1.5));mid.appendChild(thick());}
    else if(bar==='|:|'){mid.appendChild(dots());mid.appendChild(gap(3));mid.appendChild(thin());mid.appendChild(gap(1.5));mid.appendChild(thick());mid.appendChild(gap(2));mid.appendChild(thick());mid.appendChild(gap(1.5));mid.appendChild(thin());mid.appendChild(gap(3));mid.appendChild(dots());}
    else if(nav==='coda'||nav==='segno'){mid.appendChild(thin());}
    o.appendChild(mid);
    var bot=document.createElement('span');bot.className='jp-bar-bot';bot.style.height='16px';o.appendChild(bot);
    // 导航记号：Coda=椭圆十字SVG；Segno=官方 Bravura 字形(U+E047)；Fine/D.C./D.S.=双线下方斜体标签
    if(nav==='coda'||nav==='segno'){
      top.style.cssText='display:flex;align-items:flex-end;justify-content:center;height:22px;line-height:1;';
      if(nav==='coda'){
        top.innerHTML='<svg viewBox="0 0 26 30" width="18" height="18" style="display:block;overflow:visible"><ellipse cx="13" cy="15" rx="6.4" ry="9.4" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="13" y1="2.6" x2="13" y2="27.4" stroke="currentColor" stroke-width="1.7"/><line x1="2.6" y1="15" x2="23.4" y2="15" stroke="currentColor" stroke-width="1.7"/></svg>';
      }else{ top.innerHTML='<svg viewBox="4 -759 546 786" width="10" height="14" style="display:block;overflow:visible"><path transform="scale(1,-1)" d="M135 665C141 665 148 663 151 652L153 645C160 618 175 559 226 559C267 559 295 583 295 626C295 641 292 657 287 673C271 719 204 736 153 736C83 736 4 650 4 551C4 527 9 502 20 477C52 404 197 315 205 312C209 310 211 308 211 304C211 300 209 295 205 288C198 274 54 15 54 15C52 11 51 6 51 2C51 -14 63 -27 79 -27C89 -27 99 -21 104 -12C104 -12 259 268 262 274C262 273 270 279 274 279C289 276 489 217 489 122C489 83 465 57 431 52L428 51C407 51 390 65 390 96V107C390 145 365 173 337 173C333 173 329 172 325 171C288 162 254 146 254 106C254 45 316 -8 375 -8C388 -8 402 -6 417 -1C497 26 550 91 550 174C550 183 549 193 548 203C533 313 375 402 363 408C351 415 346 419 346 424C346 426 347 428 348 430C353 438 508 717 508 717C511 722 512 726 512 731C512 747 499 759 484 759C474 759 464 754 459 745C459 745 300 458 294 449C291 444 289 441 285 441C282 441 279 442 275 444C266 447 115 505 89 550C83 561 75 582 75 603C75 630 87 658 129 665ZM415 466C415 435 441 409 472 409C504 409 529 435 529 466C529 498 504 523 472 523C441 523 415 498 415 466ZM140 264C140 295 115 321 83 321C52 321 26 295 26 264C26 232 52 207 83 207C115 207 140 232 140 264Z" fill="currentColor"/></svg>'; }
      o.style.alignItems='center';
    } else if(nav==='fine'||nav==='dc'||nav==='ds'){
      bot.textContent=(nav==='fine')?'Fine':(nav==='dc'?'D.C.':'D.S.');
      bot.style.cssText='display:flex;align-items:flex-start;justify-content:center;height:16px;font-family:"Noto Serif SC",Georgia,serif;font-style:italic;font-size:9.5px;line-height:1;white-space:nowrap;padding-top:2px;';
      o.style.alignItems='center';
    }
    if(nav){o.setAttribute('data-jp-nav-base-height',top.style.height||'22px');o.setAttribute('data-jp-nav',nav);o.setAttribute('data-jp-nav-above',(nav==='coda'||nav==='segno')?'1':'0');}
    return o;
  }
/* CECP-CHORD-HEIGHT-BEGIN
   三个渲染器使用同一条和弦高度线，只按实际音符、弧线、导航记号和房子避让。
   编辑器 srcdoc 内联块，禁止反斜杠及反引号。 */
function scoreHeightRows(scope){
  if(!scope)return [];
  var rows=[].slice.call(scope.querySelectorAll('.prev-row'));
  if(scope.matches&&scope.matches('.prev-row'))rows.unshift(scope);
  return rows;
}
function scoreHeightScale(el){var r=el.getBoundingClientRect();return el.offsetWidth?r.width/el.offsetWidth:1;}
function scoreNormalizeNotes(scope){
  scoreHeightRows(scope).forEach(function(row){
    row.style.setProperty('--volta-rail','0px');
    row.style.setProperty('--row-lyric-height','0px');
    var lyricHeight=0;
    [].forEach.call(row.querySelectorAll('.p-lyric'),function(lyric){lyricHeight=Math.max(lyricHeight,lyric.offsetHeight);});
    if(lyricHeight)row.style.setProperty('--row-lyric-height',lyricHeight+'px');
    row.style.setProperty('--row-note-height','0px');
    var height=0;
    [].forEach.call(row.querySelectorAll('.p-n'),function(lane){height=Math.max(height,lane.offsetHeight);});
    if(height)row.style.setProperty('--row-note-height',height+'px');
  });
}
function scoreResetChordHeight(scope){
  scoreHeightRows(scope).forEach(function(row){
    if(row.cecpChordPaddingTop!=null){row.style.paddingTop=row.cecpChordPaddingTop;delete row.cecpChordPaddingTop;}
    [].forEach.call(row.querySelectorAll('.p-chord'),function(chord){chord.style.marginBottom='';});
  });
}
function scoreHeightObstacles(row){
  var rects=[];
  [].forEach.call(row.querySelectorAll('.jp-num,.jp-plain-sym,.jp-dot-top > span,.jp-navmark svg,[data-jp-nav-above="1"] .jp-bar-top svg,.strict-arc-svg > div,.strict-arc-svg path,.strict-arc-svg text,.strict-arc-tup text'),function(el){var r=el.getBoundingClientRect();if(r.width&&r.height)rects.push(r);});
  [].forEach.call(row.querySelectorAll('.jp-slur,.jp-slur-open,.jp-slur-close,.jp-tie'),function(group){
    var r=group.getBoundingClientRect(),s=scoreHeightScale(group),ps=getComputedStyle(group,'::before');
    if(ps.content==='none')return;
    function length(value){return String(value).indexOf('%')>=0?(parseFloat(value)||0)*group.offsetWidth/100:parseFloat(value)||0;}
    var left=r.left+length(ps.left)*s,right=group.classList.contains('jp-tie')?left+length(ps.width)*s:r.right-length(ps.right)*s;
    if(right>left)rects.push({left:left,right:right,top:r.top+length(ps.top)*s});
  });
  return rects;
}
function scoreHeightHouses(row,obstacles){
  var rails=[];
  [].slice.call(row.querySelectorAll('.prev-volta,.jp-volta')).reverse().forEach(function(house){
    var r=house.getBoundingClientRect(),s=scoreHeightScale(house),ceiling=Infinity;
    obstacles.concat(rails).forEach(function(o){if(o.left<r.right&&o.right>r.left)ceiling=Math.min(ceiling,o.top);});
    if(!isFinite(ceiling)||!s)return;
    var top=ceiling-12*s;
    house.style.setProperty(house.classList.contains('jp-volta')?'--jp-volta-top':'--volta-top',((top-r.top)/s).toFixed(3)+'px');
    rails.push({left:r.left,right:r.right,top:top});
  });
  return rails;
}
var scoreChordMeasureContext;
function scoreChordInk(chord,scale){
  var range=document.createRange();range.selectNodeContents(chord);
  var r=range.getBoundingClientRect();if(!r.height)r=chord.getBoundingClientRect();
  var stacks=chord.querySelectorAll('.p-chord-stk'),last=stacks.length?stacks[stacks.length-1]:chord;
  var text=last.querySelector('.chord-chip')||last,cs=getComputedStyle(text),descent=0,inkDescent=0;
  if(!scoreChordMeasureContext)scoreChordMeasureContext=document.createElement('canvas').getContext('2d');
  if(scoreChordMeasureContext){
    scoreChordMeasureContext.font=cs.font||cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
    var metrics=scoreChordMeasureContext.measureText(text.textContent||'');
    if(isFinite(metrics.fontBoundingBoxDescent)&&isFinite(metrics.actualBoundingBoxDescent)){
      descent=metrics.fontBoundingBoxDescent;inkDescent=Math.max(0,metrics.actualBoundingBoxDescent);
    }
  }
  return {baseline:r.bottom-descent*scale,descent:inkDescent};
}
function scoreLayoutChordRows(scope){
  scoreHeightRows(scope).forEach(function(row){
    if(!row.isConnected||!row.querySelector('.p-n'))return;
    var s=scoreHeightScale(row);if(!s)return;
    var obstacles=scoreHeightObstacles(row),rails=scoreHeightHouses(row,obstacles),ceiling=Infinity;
    obstacles.concat(rails).forEach(function(o){ceiling=Math.min(ceiling,o.top);});
    if(!isFinite(ceiling))return;
    var labelBand=0;
    [].forEach.call(row.querySelectorAll('.sec-label-holder .sec-label'),function(tag){labelBand=Math.max(labelBand,tag.offsetHeight+6);});
    var chords=[],inkDescent=0;
    [].forEach.call(row.querySelectorAll('.p-chord'),function(chord){var ink=scoreChordInk(chord,s);inkDescent=Math.max(inkDescent,ink.descent);chords.push({chord:chord,ink:ink});});
    var target=ceiling-(3+labelBand+inkDescent)*s;
    var anchor=row.querySelector('.jp-num,.jp-plain-sym'),oldTop=anchor?anchor.getBoundingClientRect().top-row.getBoundingClientRect().top:0;
    var changes=[];
    chords.forEach(function(item){
      var margin=parseFloat(getComputedStyle(item.chord).marginBottom)||0;
      changes.push({chord:item.chord,margin:margin+(item.ink.baseline-target)/s});
    });
    changes.forEach(function(change){change.chord.style.marginBottom=change.margin.toFixed(3)+'px';});
    if(!chords.length){
      var inset=(row.getBoundingClientRect().top-ceiling)/s+2;
      if(inset>0){
        if(row.cecpChordPaddingTop==null)row.cecpChordPaddingTop=row.style.paddingTop;
        row.style.paddingTop=((parseFloat(getComputedStyle(row).paddingTop)||0)+inset).toFixed(3)+'px';
      }
    }
    var delta=anchor?(anchor.getBoundingClientRect().top-row.getBoundingClientRect().top-oldTop)/s:0;
    if(Math.abs(delta)>.01){[].forEach.call(row.querySelectorAll('.strict-arc-svg'),function(host){host.style.top=((parseFloat(host.style.top)||0)+delta).toFixed(3)+'px';});}
    scoreHeightHouses(row,scoreHeightObstacles(row));
    [].forEach.call(row.querySelectorAll('.sec-label-holder'),function(holder){if(holder.cecpPlaceSecLabel)holder.cecpPlaceSecLabel(true);});
  });
}
/* CECP-CHORD-HEIGHT-END */
/* CECP-JP-NAVIGATION-BEGIN
   与 youth / musictool / musiclib 同步。此块在编辑器 srcdoc 中，禁止反斜杠及反引号。
   反复圆点不参与导航记号的中心计算；上方记号为经过它的连音线留出空间。 */
function jpNoteArcTop(atom){
  var box=atom.getBoundingClientRect();
  if(!atom.querySelector('.jp-navmark'))return box.top;
  var top=Infinity,scale=atom.offsetWidth?box.width/atom.offsetWidth:1;
  [].forEach.call(atom.querySelectorAll('.jp-num,.jp-plain-sym,.jp-dot-top > span'),function(note){var r=note.getBoundingClientRect();if(r.height)top=Math.min(top,r.top);});
  return top===Infinity?box.top:top-4*(scale||1);
}
function jpResetNavigation(scope){
  if(!scope)return;
  [].forEach.call(scope.querySelectorAll('[data-jp-nav],.jp-navmark'),function(el){
    var mark=el.classList.contains('jp-navmark')?el:el.querySelector('.jp-bar-top,.jp-bar-bot');
    if(!mark)return;
    mark.style.transform='';mark.style.paddingBottom='';
    if(el.hasAttribute('data-jp-nav')){
      mark=el.querySelector(el.getAttribute('data-jp-nav-above')==='1'?'.jp-bar-top':'.jp-bar-bot');
      if(mark){mark.style.transform='';mark.style.paddingBottom='';if(el.getAttribute('data-jp-nav-above')==='1')mark.style.height=el.getAttribute('data-jp-nav-base-height')||'22px';}
    }
  });
  [].forEach.call(scope.querySelectorAll('.jp-slur,.jp-slur-open,.jp-slur-close'),function(group){group.style.removeProperty('--jp-nav-arc-top');});
}
function jpPrepareLegacyNavigation(scope){
  if(!scope)return;
  [].forEach.call(scope.querySelectorAll('.jp-slur,.jp-slur-open,.jp-slur-close'),function(group){
    if(!group.querySelector('[data-jp-nav],.jp-navmark'))return;
    var gr=group.getBoundingClientRect(),scale=group.offsetWidth?gr.width/group.offsetWidth:1;
    if(!gr.width||!scale)return;
    var noteTop=Infinity;
    [].forEach.call(group.querySelectorAll('.jp-num,.jp-dot-top:not(:empty)'),function(note){var r=note.getBoundingClientRect();if(r.height)noteTop=Math.min(noteTop,r.top);});
    if(noteTop===Infinity)return;
    var ps=getComputedStyle(group,'::before');
    var height=parseFloat(ps.height)||8;
    var layer=Math.max(0,(parseFloat(getComputedStyle(group).paddingTop)||12)-12);
    group.style.setProperty('--jp-nav-arc-top',((noteTop-gr.top)/scale-height-3-layer).toFixed(3)+'px');
  });
}
function jpLayoutNavigation(scope){
  if(!scope)return false;
  [].forEach.call(scope.querySelectorAll('[data-jp-nav],.jp-navmark'),function(el){
    var attached=el.classList.contains('jp-navmark');
    var above=attached||el.getAttribute('data-jp-nav-above')==='1';
    var mark=attached?el:el.querySelector(above?'.jp-bar-top':'.jp-bar-bot');
    if(!mark)return;
    var paint=mark.querySelector('svg')||mark,mr=paint.getBoundingClientRect();
    if(!mr.width||!mr.height)return;
    var natural=parseFloat(getComputedStyle(paint).height)||paint.offsetHeight;
    var scale=natural?mr.height/natural:1;if(!scale||!isFinite(scale))scale=1;
    if(!attached){
      var strokes=[].slice.call(el.querySelectorAll('.jp-bar-stroke'));
      if(strokes.length){
        var left=Infinity,right=-Infinity;
        strokes.forEach(function(stroke){var r=stroke.getBoundingClientRect();left=Math.min(left,r.left);right=Math.max(right,r.right);});
        mark.style.transform='translateX('+(((left+right-mr.left-mr.right)/2)/scale).toFixed(3)+'px)';
        mr=paint.getBoundingClientRect();
      }
    }
    if(!above)return;
    var row=el.closest('.prev-row')||el.closest('.sw-lrow')||el.closest('.p-notes');if(!row)return;
    var ceiling=Infinity;
    [].forEach.call(row.querySelectorAll('.strict-arc-svg > div,.strict-arc-svg path,.strict-arc-tup text'),function(arc){
      var r=arc.getBoundingClientRect();
      if(r.width&&r.height&&r.left<mr.right&&r.right>mr.left)ceiling=Math.min(ceiling,r.top);
    });
    [].forEach.call(row.querySelectorAll('.jp-slur,.jp-slur-open,.jp-slur-close,.jp-tie'),function(group){
      var gr=group.getBoundingClientRect(),gs=group.offsetWidth?gr.width/group.offsetWidth:scale;
      var ps=getComputedStyle(group,'::before'),top=parseFloat(ps.top),left=parseFloat(ps.left)||0,right=parseFloat(ps.right)||0;
      if(String(ps.left).indexOf('%')>=0)left=group.offsetWidth*left/100;
      if(String(ps.right).indexOf('%')>=0)right=group.offsetWidth*right/100;
      var width=parseFloat(ps.width)||0;
      var arcRight=group.classList.contains('jp-tie')?gr.left+(left+width)*gs:gr.right-right*gs;
      if((gr.width||width)&&isFinite(top)&&gr.left+left*gs<mr.right&&arcRight>mr.left)ceiling=Math.min(ceiling,gr.top+top*gs);
    });
    var anchors=attached?el.parentElement.querySelectorAll('.jp-num,.jp-plain-sym,.jp-dot-top > span'):el.querySelectorAll('.jp-bar-stroke');
    [].forEach.call(anchors,function(anchor){var r=anchor.getBoundingClientRect();if(r.width&&r.height)ceiling=Math.min(ceiling,r.top);});
    if(ceiling===Infinity)return;
    var move=(ceiling-mr.bottom)/scale-4;
    if(Math.abs(move)<.25)return;
    mark.style.transform=(mark.style.transform||'')+' translateY('+move.toFixed(3)+'px)';
  });
  // 只移动记号墨迹，不再次增高音格或累加预留空间。
}
var jpBaseLayoutArcs=layoutStrictArcs;
layoutStrictArcs=function(row){jpResetNavigation(row);scoreResetChordHeight(row);scoreNormalizeNotes(row);jpBaseLayoutArcs(row);jpPrepareLegacyNavigation(row);jpLayoutNavigation(row);scoreLayoutChordRows(row);};
var jpBaseLayoutArcsAll=layoutStrictArcsAll;
layoutStrictArcsAll=function(scope){jpResetNavigation(scope);scoreResetChordHeight(scope);scoreNormalizeNotes(scope);jpBaseLayoutArcsAll(scope);jpPrepareLegacyNavigation(scope);jpLayoutNavigation(scope);scoreLayoutChordRows(scope);};
var jpBaseLayoutNoteArcs=layoutJpArcs;
layoutJpArcs=function(lane){jpResetNavigation(lane);jpBaseLayoutNoteArcs(lane);jpPrepareLegacyNavigation(lane);jpLayoutNavigation(lane);var row=lane&&lane.closest('.prev-row');if(row)scoreLayoutChordRows(row);};
/* CECP-JP-NAVIGATION-END */

  /* ── 导航记号挂在音符正上方：写法 = `*` + 记号名，如 `1 *coda`、`3_ *segno` ──
     与小节线写法(||coda/:|fine)并存；`*` 前缀这一档不画小节线、不占音位（isDualAtom 已判 false，
     所以 chord/lyric 不用补 @）。记号用绝对定位挂在前一个音符上，不参与布局 → 不会把行撑高。 */
  var JP_NOTE_NAVS={fine:'Fine',dc:'D.C.',ds:'D.S.',coda:1,segno:1};
  function noteNavOf(tok){
    var t=String(tok||'');
    if(t.charAt(0)!=='*')return '';
    var n=t.slice(1);
    return JP_NOTE_NAVS[n]?n:'';
  }
  function makeNoteNavMark(nav){
    var m=document.createElement('span');
    m.className='jp-navmark';
    m.style.cssText='display:flex;align-items:flex-end;justify-content:center;line-height:1;pointer-events:none;white-space:nowrap;margin-bottom:2px;flex:0 0 auto;';
    if(nav==='coda'){
      m.innerHTML='<svg viewBox="0 0 26 30" width="16" height="16" style="display:block;overflow:visible"><ellipse cx="13" cy="15" rx="6.4" ry="9.4" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="13" y1="2.6" x2="13" y2="27.4" stroke="currentColor" stroke-width="1.7"/><line x1="2.6" y1="15" x2="23.4" y2="15" stroke="currentColor" stroke-width="1.7"/></svg>';
    }else if(nav==='segno'){
      m.innerHTML='<svg viewBox="4 -759 546 786" width="9" height="13" style="display:block;overflow:visible"><path transform="scale(1,-1)" d="M135 665C141 665 148 663 151 652L153 645C160 618 175 559 226 559C267 559 295 583 295 626C295 641 292 657 287 673C271 719 204 736 153 736C83 736 4 650 4 551C4 527 9 502 20 477C52 404 197 315 205 312C209 310 211 308 211 304C211 300 209 295 205 288C198 274 54 15 54 15C52 11 51 6 51 2C51 -14 63 -27 79 -27C89 -27 99 -21 104 -12C104 -12 259 268 262 274C262 273 270 279 274 279C289 276 489 217 489 122C489 83 465 57 431 52L428 51C407 51 390 65 390 96V107C390 145 365 173 337 173C333 173 329 172 325 171C288 162 254 146 254 106C254 45 316 -8 375 -8C388 -8 402 -6 417 -1C497 26 550 91 550 174C550 183 549 193 548 203C533 313 375 402 363 408C351 415 346 419 346 424C346 426 347 428 348 430C353 438 508 717 508 717C511 722 512 726 512 731C512 747 499 759 484 759C474 759 464 754 459 745C459 745 300 458 294 449C291 444 289 441 285 441C282 441 279 442 275 444C266 447 115 505 89 550C83 561 75 582 75 603C75 630 87 658 129 665ZM415 466C415 435 441 409 472 409C504 409 529 435 529 466C529 498 504 523 472 523C441 523 415 498 415 466ZM140 264C140 295 115 321 83 321C52 321 26 295 26 264C26 232 52 207 83 207C115 207 140 232 140 264Z" fill="currentColor"/></svg>';
    }else{
      m.textContent=JP_NOTE_NAVS[nav];
      m.style.fontFamily='"Noto Serif SC",Georgia,serif';m.style.fontStyle='italic';m.style.fontSize='10px';
    }
    return m;
  }
  /* host 可以是音符本体(.jp-wrap/.jp-plain)，也可以是严格模式的音位列(内含 .jp-wrap) */
  function attachNoteNavMark(host,nav){
    if(!host||!nav)return false;
    var cn=String(host.className||'');
    var anchor=(cn.indexOf('jp-wrap')>=0||cn.indexOf('jp-plain')>=0)?host
              :(host.querySelector('.jp-wrap')||host.querySelector('.jp-plain')||host);
    /* 作为普通 flex 子元素插在音符最上面，而不是绝对定位：
       .jp-wrap 是 vertical-align:bottom、.p-n 是 align-items:flex-end，
       所以音符本身不动，只是音符泳道往上长高 → 上面的和弦行被自动顶开，不会被挡。 */
    var _m=makeNoteNavMark(nav);
    /* 尽量贴近音符：音符上方那个八度点盒子(.jp-dot-top 8px / .jp-plain-top 12px)在没有高音点时
       是空的，会白白撑出一段距离 —— 空的就用负 margin 收掉，只留 2px；有高音点则保持让位。 */
    var _dt=anchor.querySelector('.jp-dot-top'), _pt=anchor.querySelector('.jp-plain-top');
    if(_dt&&!_dt.firstElementChild)_m.style.marginBottom='-3.7px';
    else if(_pt&&!_dt)_m.style.marginBottom='-7.7px';
    anchor.insertBefore(_m, anchor.firstChild);
    return true;
  }
  function makeTimeSignature(sig){
    var norm=normalizeTimeSignValue(sig);
    if(!norm)return document.createDocumentFragment();
    var parts=norm.split('/');
    var o=document.createElement('span');o.className='jp-timesig';o.setAttribute('data-ts',norm);
    var topPad=document.createElement('span');topPad.className='jp-timesig-pad jp-timesig-pad-top';o.appendChild(topPad);
    var stack=document.createElement('span');stack.className='jp-timesig-stack';
    var top=document.createElement('span');top.className='jp-timesig-top';top.textContent=parts[0];
    var bot=document.createElement('span');bot.className='jp-timesig-bot';bot.textContent=parts[1];
    stack.appendChild(top);stack.appendChild(bot);o.appendChild(stack);
    var botPad=document.createElement('span');botPad.className='jp-timesig-pad jp-timesig-pad-bot';o.appendChild(botPad);
    return o;
  }
  function makeJpPlain(sym){
    var pl=document.createElement('span');pl.className='jp-plain';
    var t=document.createElement('span');t.className='jp-plain-top';pl.appendChild(t);
    var s=document.createElement('span');s.className='jp-plain-sym'+(sym==='-'?' is-dash':'');s.textContent=sym;pl.appendChild(s);
    s.style.display='inline-flex';
    s.style.alignItems='center';
    s.style.justifyContent='center';
    s.style.width='1em';
    s.style.height='1em';
    if(sym==='-'){
      s.style.fontSize='19px';
      s.style.position='relative';
      s.style.top='-0.12em';
      s.style.lineHeight='1';
      s.style.overflow='visible';
      s.textContent='';
      var dashLine=document.createElement('span');
      dashLine.className='jp-dash-line';
      styleJpDashLineEl(dashLine);
      s.appendChild(dashLine);
    }
    var b=document.createElement('span');b.className='jp-plain-bot';pl.appendChild(b);
    return pl;
  }
  function setDots(el,cnt){
    el.innerHTML='';
    for(var i=0;i<cnt;i++){var d=document.createElement('span');d.textContent='·';el.appendChild(d);}
  }
  function styleJpNumEl(el){
    if(!el)return;
    el.style.display='inline-flex';
    el.style.alignItems='center';
    el.style.justifyContent='center';
    el.style.textAlign='center';
    el.style.width='1em';
    el.style.height='1em';
    el.style.position='relative';
    el.style.top='-0.12em';
  }
  function styleJpAugEl(el){
    if(!el)return;
    el.style.position='absolute';
    el.style.right='-4.42px';
    el.style.top='50%';
    el.style.transform='translateY(-50%) translateY(0.5px)';
    el.style.width='4px';
    el.style.height='4px';
    el.style.borderRadius='50%';
    el.style.background='currentColor';
    el.style.fontSize='0';
    el.style.lineHeight='0';
    el.style.pointerEvents='none';
  }
  function styleJpAccEl(el){
    if(!el)return;
    el.style.position='absolute';
    el.style.left='-0.32em';
    el.style.top='-0.08em';
    el.style.transform='none';
    el.style.fontSize='12px';
    el.style.fontWeight='700';
    el.style.lineHeight='1';
    el.style.pointerEvents='none';
  }
  function styleJpDashLineEl(el){
    if(!el)return;
    el.style.position='absolute';
    el.style.left='0.08em';
    el.style.right='0.08em';
    el.style.top='50%';
    el.style.height='2px';
    el.style.transform='translateY(-50%)';
    el.style.background='currentColor';
    el.style.borderRadius='2px';
    el.style.pointerEvents='none';
  }
  function makeJpUnderlineLine(level){
    var ln=document.createElement('span');
    ln.className=level===2?'jp-u2-line':'jp-u1-line';
    ln.style.display='block';
    ln.style.position='absolute';
    ln.style.left='0';
    ln.style.right='0';
    ln.style.bottom=level===2?'0':'3px';
    ln.style.height='1.5px';
    ln.style.background='currentColor';
    ln.style.marginTop='0';
    ln.style.alignSelf='auto';
    ln.style.pointerEvents='none';
    ln.style.zIndex='1';
    return ln;
  }
  function parseDualJpToken(tok){
    var raw=String(tok||'').replace(/\uFF0F/g,'/');
    var idx=raw.indexOf('/');
    if(idx<0||idx!==raw.lastIndexOf('/'))return null;
    var top=raw.slice(0,idx).trim();
    var bot=raw.slice(idx+1).trim();
    if(!top&&!bot)return null;
    return {top:top||'sp',bot:bot||'sp'};
  }
  function makeDualJpToken(pair){
    var w=document.createElement('span');w.className='jp-dual';
    var t=document.createElement('span');t.className='jp-dual-top';t.appendChild(parseJpToken(pair.top,{inDual:true}));w.appendChild(t);
    var b=document.createElement('span');b.className='jp-dual-bot';b.appendChild(parseJpToken(pair.bot,{inDual:true}));w.appendChild(b);
    return w;
  }
  function parseJpToken(tok,opts) {
    opts=opts||{};
    tok=String(tok||'');
    if(isBarlineTok(tok))return makeBarline(tok);
    var dual=!opts.inDual?parseDualJpToken(tok):null;
    if(dual)return makeDualJpToken(dual);
    if(!tok||tok==='-'||tok===' ')return makeJpPlain(tok);
    var hasFermata=false;
    if(tok.slice(-1)==='^'){hasFermata=true;tok=tok.slice(0,-1);}
    if(tok==='sp'||tok==='sp_'||tok==='sp__'){
      var fake=tok==='sp__'?'0__':tok==='sp_'?'0_':'0';
      var el2=parseJpToken(fake);
      el2.className+=' jp-sp';
      var ns=el2.querySelector('.jp-num')||el2.querySelector('.jp-plain-sym');
      if(ns)ns.style.visibility='hidden';
      return el2;
    }
    var zm=tok.match(/^(0·?)(_*)$/);
    if(zm){
      var wz=document.createElement('span');wz.className='jp-wrap';
      var tdz=document.createElement('span');tdz.className='jp-dot-top';wz.appendChild(tdz);
      var lwz=document.createElement('span');lwz.className='jp-lines-wrap';
      var nrz=document.createElement('span');nrz.className='jp-num-row';
      var nsz=document.createElement('span');nsz.className='jp-num';nsz.textContent='0';styleJpNumEl(nsz);nrz.appendChild(nsz);
      if(zm[1].indexOf('\u00b7')>-1){var agz=document.createElement('span');agz.className='jp-aug';agz.textContent='·';styleJpAugEl(agz);nsz.appendChild(agz);}
      var ulz=zm[2].length;
      lwz.appendChild(nrz);
      if(ulz>=1)lwz.appendChild(makeJpUnderlineLine(1));
      if(ulz===2)lwz.appendChild(makeJpUnderlineLine(2));
      wz.appendChild(lwz);
      var bdz=document.createElement('span');bdz.className='jp-dot-bot';wz.appendChild(bdz);
      return wz;
    }
    var num=tok,isHigh=0,isLow=0,isDot=false,uline=0;
    if(num.slice(-2)==='__'){uline=2;num=num.slice(0,-2);}
    else if(num.slice(-1)==='_'){uline=1;num=num.slice(0,-1);}
    if(num.indexOf('\u00b7')>-1){isDot=true;num=num.replace(/\u00b7/g,'');}
    var hm=num.match(/^(.+?)('+)$/);if(hm){isHigh=hm[2].length;num=hm[1];}
    var lm=num.match(/^(.+?)(,+)$/);if(lm){isLow=lm[2].length;num=lm[1];}
    var acc='';
    var am=num.match(/^([#b\u266f\u266d\u266e=])([0-7])$/);
    if(am){acc=am[1]==='#'?'\u266f':am[1]==='b'?'\u266d':am[1]==='='?'\u266e':am[1];num=am[2];}
    var w=document.createElement('span');w.className='jp-wrap'+(acc?' has-acc':'');
    if(acc)w.style.minWidth='1.35em';
    var td=document.createElement('span');td.className='jp-dot-top';setDots(td,isHigh>=2?2:isHigh);w.appendChild(td);
    var lw2=document.createElement('span');lw2.className='jp-lines-wrap';
    var numRow=document.createElement('span');numRow.className='jp-num-row';
    if(acc){var ac=document.createElement('span');ac.className='jp-acc';ac.textContent=acc;styleJpAccEl(ac);numRow.appendChild(ac);}
    var ns2=document.createElement('span');ns2.className='jp-num';ns2.textContent=num;styleJpNumEl(ns2);numRow.appendChild(ns2);
    if(isDot){var dt=document.createElement('span');dt.className='jp-aug';dt.textContent='·';styleJpAugEl(dt);ns2.appendChild(dt);}
    lw2.appendChild(numRow);
    if(uline>=1)lw2.appendChild(makeJpUnderlineLine(1));
    if(uline===2)lw2.appendChild(makeJpUnderlineLine(2));
    w.appendChild(lw2);
    var botDot=document.createElement('span');botDot.className='jp-dot-bot';setDots(botDot,isLow>=2?2:isLow);w.appendChild(botDot);
    if(hasFermata){var fw=document.createElement('span');fw.className='jp-fermata';fw.appendChild(w);return fw;}
    return w;
  }
  function makeTuplet(n){var w=document.createElement('span');w.className='jp-tuplet';var br=document.createElement('span');br.className='jp-tuplet-br';w.appendChild(br);var nm=document.createElement('span');nm.className='jp-tuplet-num';nm.textContent=String(n);w.appendChild(nm);return w;}
  /* ── 连音线（~ token）与弧线分层 ─────────────────
     ~N 语义（数字计数）：
       ~   = 连接左侧第 1 个可见音 → 右侧第 1 个可见音
       ~2  = 连接左侧第 2 个可见音 → 右侧第 1 个可见音（跨过 1 个音）；~3 以此类推
       计数时 sp 占位、小节线、拍号一律跳过且不可作端点；
       ( ) 组与三连音边界透明（计数穿过，可跨组、可写在组内）；
       左侧不足 N 个音或右侧无音时该弧不画。
     分层（几何嵌套 + 类型权重）：
       范围重叠（不含只共享端点）的 ~ 之间：窄的贴音符在下、宽的抬高在上；
       ( ) 组/三连音弧线永远比与其相接或重叠的 ~ 至少高一层（含共享端点）；
       每升一层抬高 JP_ARC_LAYER_STEP px；无 ~ 的行完全不处理（逐像素回归）。 */
  var JP_ARC_LAYER_STEP=6;
  function makeJpTie(span){
    var tie=document.createElement('span');
    tie.className='jp-tie';
    tie.setAttribute('data-tie-span',span>0?span:1);
    return tie;
  }
  function layoutJpArcs(lane){
    if(!lane||!lane.isConnected)return;
    var atoms=[],ties=[],groups=[];
    (function walk(node){
      for(var c=node.firstElementChild;c;c=c.nextElementSibling){
        var cn=String(c.className||'');
        if(cn.indexOf('jp-tie')>=0){ties.push({el:c,pos:atoms.length,span:parseInt(c.getAttribute('data-tie-span'),10)||1});continue;}
        if(cn.indexOf('jp-bar')>=0||cn.indexOf('jp-timesig')>=0||cn.indexOf('jp-sp')>=0)continue;
        if(cn.indexOf('jp-slur')>=0||cn.indexOf('jp-tuplet')>=0){
          var s0=atoms.length;
          walk(c);
          if(atoms.length>s0)groups.push({el:c,start:s0,end:atoms.length-1});
          continue;
        }
        if(cn.indexOf('jp-wrap')>=0||cn.indexOf('jp-plain')>=0||cn.indexOf('jp-dual')>=0)atoms.push(c);
      }
    })(lane);
    if(!ties.length)return;
    var arcs=[];
    ties.forEach(function(t){
      var s=t.pos-t.span,e=t.pos;
      if(s<0||e>=atoms.length){t.el.style.display='none';return;}
      t.el.style.display='';
      arcs.push({kind:'tie',el:t.el,start:s,end:e,layer:0});
    });
    groups.forEach(function(g){arcs.push({kind:'group',el:g.el,start:g.start,end:g.end,layer:0});});
    function overlaps(a,b){
      if(a.kind==='tie'&&b.kind==='tie')return a.start<b.end&&b.start<a.end;
      return a.start<=b.end&&b.start<=a.end;
    }
    var order=arcs.slice().sort(function(a,b){
      if(a.kind!==b.kind)return a.kind==='tie'?-1:1;
      var wa=a.end-a.start,wb=b.end-b.start;
      return wa!==wb?wa-wb:a.start-b.start;
    });
    var placed=[];
    order.forEach(function(a){
      var m=0;
      placed.forEach(function(p){if(overlaps(a,p)&&p.layer>m)m=p.layer;});
      a.layer=m+1;
      placed.push(a);
    });
    arcs.forEach(function(a){
      if(a.kind==='group'){
        if(a.layer>1)a.el.style.setProperty('--slur-pad',(12+(a.layer-1)*JP_ARC_LAYER_STEP)+'px');
        return;
      }
      var p=atoms[a.start],n=atoms[a.end],tr=a.el.getBoundingClientRect();
      var pr=p.getBoundingClientRect(),nr=n.getBoundingClientRect();
      var scale=p.offsetWidth?(pr.width/p.offsetWidth):1;
      if(!scale)scale=1;
      var minTop=Infinity;
      for(var k=a.start;k<=a.end;k++){
        var noteTop=jpNoteArcTop(atoms[k]);
        if(noteTop<minTop)minTop=noteTop;
      }
      var x1=(pr.left+pr.width/2-tr.left)/scale;
      var x2=(nr.left+nr.width/2-tr.left)/scale;
      var topY=(minTop-tr.top)/scale-9-(a.layer-1)*JP_ARC_LAYER_STEP;
      a.el.style.setProperty('--tie-l',x1.toFixed(1)+'px');
      a.el.style.setProperty('--tie-w',Math.max(8,x2-x1).toFixed(1)+'px');
      a.el.style.setProperty('--tie-t',topY.toFixed(1)+'px');
    });
  }
  /* ~ token 解析：~ =1；~~ / ~2 =2；~~~ / ~3 =3 … 返回 0 表示不是 tie token */
  function jpTieSpan(t){
    if(!t||t.charAt(0)!=='~')return 0;
    var rest=t.slice(1);
    if(!rest)return 1;
    if(/^~+$/.test(rest))return rest.length+1;
    if(/^[0-9]+$/.test(rest)){var n=parseInt(rest,10);return n>0?n:0;}
    return 0;
  }
  function renderNStr(nStr,opts){
    opts=opts||{};
    var d=document.createElement('div');d.className='p-n';
    var headTimeSign=normalizeTimeSignValue(opts.inlineTimeSign||'');
    if(headTimeSign)d.appendChild(makeTimeSignature(headTimeSign));
    if(!nStr||!nStr.trim())return d;
    var hasTie=false;
    function appendRenderedTok(parent,tk){
      var noteNav=noteNavOf(tk);if(noteNav){attachNoteNavMark(parent.lastElementChild,noteNav);return;}
      var ts2=jpTieSpan(tk);
      if(ts2){parent.appendChild(makeJpTie(ts2));hasTie=true;return;}
      var inlineTs=extractInlineTimeSignToken(tk);
      parent.appendChild(inlineTs?makeTimeSignature(inlineTs):parseJpToken(tk));
    }
    function isDualAtom(tk){
      if(!tk||tk==='/'||tk==='／'||tk==='!'||tk.charAt(0)==='~'||tk.charAt(0)==='*')return false;
      if(tk==='('||tk===')'||tk==='(['||tk==='])'||tk==='}'||tk==='[v1'||tk==='[v2'||tk===']v')return false;
      if(isBarlineTok(tk))return false;
      if(/^\{(3|5)$/.test(tk))return false;
      if(extractInlineTimeSignToken(tk))return false;
      if(/^\[v:(.+)\]$/.test(tk))return false;
      return true;
    }
    var rawToks=nStr.trim().split(/\s+/),toks=[],ti=0;
    while(ti<rawToks.length){
      if(ti+2<rawToks.length && (rawToks[ti+1]==='/'||rawToks[ti+1]==='／') && isDualAtom(rawToks[ti]) && isDualAtom(rawToks[ti+2])){
        toks.push(rawToks[ti]+'/'+rawToks[ti+2]);
        ti+=3;
        continue;
      }
      toks.push(rawToks[ti]);
      ti++;
    }
    var i=0;
    while(i<toks.length){
      var t=toks[i];
      var inlineTs=extractInlineTimeSignToken(t);
      if(inlineTs){d.appendChild(makeTimeSignature(inlineTs));i++;continue;}
      var tieSpan=jpTieSpan(t);
      if(tieSpan){d.appendChild(makeJpTie(tieSpan));hasTie=true;i++;continue;}
      var _nnav=noteNavOf(t);if(_nnav){attachNoteNavMark(d.lastElementChild,_nnav);i++;continue;}   // *coda/*segno/… 挂在前一个音符上方
      if(t==='('){var sl=document.createElement('span');sl.className='jp-slur';i++;while(i<toks.length&&toks[i]!==')')appendRenderedTok(sl,toks[i++]);d.appendChild(sl);i++;continue;}
      if(t==='(['){var so=document.createElement('span');so.className='jp-slur-open';i++;while(i<toks.length&&toks[i]!=='])')appendRenderedTok(so,toks[i++]);if(i<toks.length)i++;d.appendChild(so);continue;}
      if(t==='])'){var sc=document.createElement('span');sc.className='jp-slur-close';i++;if(i<toks.length)appendRenderedTok(sc,toks[i++]);d.appendChild(sc);continue;}
      if(t==='[v1'||t==='[v2'||t===']v'||/^\[v:(.+)\]$/.test(t)){i++;continue;} // volta handled at row level
      var tm2=t.match(/^\{(3|5)$/);if(tm2){var tn=parseInt(tm2[1],10);var tp=makeTuplet(tn);i++;while(i<toks.length&&toks[i]!=='}')appendRenderedTok(tp,toks[i++]);d.appendChild(tp);i++;continue;}
      if(t==='}'){i++;continue;}
      appendRenderedTok(d,t);i++;
    }
    if(hasTie&&typeof requestAnimationFrame==='function'){
      requestAnimationFrame(function(){layoutJpArcs(d);});
    }
    return d;
  }

  /* 严格对位「连梁」：相邻下划线音位把减时线补齐贴上（_一级/__二级分别），
     小节线/空格sp/非下划线音位天然断开——与老渲染逐像素一致。幂等；须在
     justifyScoreRows 之后、缩放之前跑（此刻是自然坐标 scale≈1）。 */
  function connectStrictBeams(row){
    if(!row)return;
    var slots=[].slice.call(row.querySelectorAll('.prev-seg.p-slot'));
    slots.forEach(function(c){[].forEach.call(c.querySelectorAll('.jp-u1-line,.jp-u2-line'),function(u){u.style.right='';u.style.left='';});});
    ['jp-u1-line','jp-u2-line'].forEach(function(cls){
      for(var i=0;i<slots.length-1;i++){
        var a=slots[i],b=slots[i+1];
        if(a.classList.contains('p-barslot')||b.classList.contains('p-barslot'))continue;
        if(a.getAttribute('data-bb'))continue;  // 断梁标记：不与后邻连梁
        var ua=a.querySelector('.'+cls),ub=b.querySelector('.'+cls);
        if(!ua||!ub)continue;
        var ra=ua.getBoundingClientRect(),rb=ub.getBoundingClientRect();
        var scale=ua.offsetWidth?(ra.width/ua.offsetWidth):1;if(!scale)scale=1;
        var gap=(rb.left-ra.right)/scale;
        if(gap>0.3)ua.style.right=(-(gap+1))+'px';
      }
    });
  }

  /* 严格对位：连音线弧 + 三连音括号（读列上 data-slur/tuplet，栈式配对，画 SVG 覆盖层）。 */
  function layoutStrictArcs(row){
    if(!row)return;
    var prev=row.querySelector('.strict-arc-svg');if(prev)prev.remove();
    [].forEach.call(row.querySelectorAll('.prev-seg.p-slot .p-chord'),function(ch){ch.style.marginBottom='';});  // 清上次抬升
    var slots=[].slice.call(row.querySelectorAll('.prev-seg.p-slot')).filter(function(c){return !c.classList.contains('p-barslot');});
    if(!slots.length)return;
    var stack=[],groups=[],tupOpen=null,tups=[];
    slots.forEach(function(col){
      var so=(+col.getAttribute('data-slur-open'))||0, sc=(+col.getAttribute('data-slur-close'))||0;
      var to=(+col.getAttribute('data-tuplet-open'))||0, tc=col.getAttribute('data-tuplet-close'),k;
      for(k=0;k<so;k++)stack.push(col);
      for(k=0;k<sc;k++){var st=stack.pop();if(st)groups.push({start:st,end:col});}
      if(to)tupOpen={start:col,n:to};
      if(tc&&tupOpen){tups.push({start:tupOpen.start,end:col,n:tupOpen.n});tupOpen=null;}
    });
    if(!groups.length&&!tups.length)return;
    var probe=slots[0].querySelector('.jp-num'),scale=1;
    if(probe&&probe.offsetWidth){var pr=probe.getBoundingClientRect();scale=pr.width/probe.offsetWidth;}
    if(!scale)scale=1;
    var rr=row.getBoundingClientRect();
    function box(col){var el=col.querySelector('.jp-num')||col.querySelector('.jp-plain-sym')||col.querySelector('.p-n')||col;var r=el.getBoundingClientRect(),rr=row.getBoundingClientRect();var _t=r.top,_od=col.querySelector('.jp-dot-top');if(_od){var _or=_od.getBoundingClientRect();if(_or.height&&_or.top<_t)_t=_or.top;}   // 高音点在数字上方：弧线要抬到点之上,免得压住看不清
      return {cx:(r.left+r.width/2-rr.left)/scale,top:(_t-rr.top)/scale};}
    function ix(c){return slots.indexOf(c);}
    var NS='http://www.w3.org/2000/svg';
    var svg=document.createElementNS(NS,'svg');svg.setAttribute('class','strict-arc-svg');
    svg.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:4;';
    var maxD=0;
    groups.forEach(function(g){var gs=ix(g.start),ge=ix(g.end);g._d=0;groups.forEach(function(h){if(h===g)return;var hs=ix(h.start),he=ix(h.end);if(hs<=gs&&ge<=he&&(he-hs)>(ge-gs))g._d++;});if(g._d>maxD)maxD=g._d;});
    var STEP=7,BASE=9,reserve=0;
    if(groups.length)reserve=Math.max(reserve,15+maxD*STEP);
    if(tups.length)reserve=Math.max(reserve,20);
    [].forEach.call(row.querySelectorAll('.prev-seg.p-slot .p-chord'),function(ch){if(reserve)ch.style.marginBottom=reserve+'px';});  // 整行和弦统一抬到弧线之上
    groups.forEach(function(g){
      var lift=maxD-g._d,arcH=BASE+lift*STEP;
      var a=box(g.start),b=box(g.end),y=Math.min(a.top,b.top)-2;
      var p=document.createElementNS(NS,'path');
      p.setAttribute('d','M '+a.cx.toFixed(1)+' '+y.toFixed(1)+' Q '+((a.cx+b.cx)/2).toFixed(1)+' '+(y-arcH*2).toFixed(1)+' '+b.cx.toFixed(1)+' '+y.toFixed(1));
      p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','1.4');p.setAttribute('stroke-linecap','round');
      svg.appendChild(p);
    });
    tups.forEach(function(g){
      var a=box(g.start),b=box(g.end),x1=a.cx-4,x2=b.cx+4,y=Math.min(a.top,b.top)-7;
      var p=document.createElementNS(NS,'path');
      p.setAttribute('d','M '+x1.toFixed(1)+' '+(y+4)+' L '+x1.toFixed(1)+' '+y+' L '+x2.toFixed(1)+' '+y+' L '+x2.toFixed(1)+' '+(y+4));
      p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','1.2');svg.appendChild(p);
      var t=document.createElementNS(NS,'text');t.setAttribute('x',((x1+x2)/2).toFixed(1));t.setAttribute('y',(y-2).toFixed(1));t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.setAttribute('fill','currentColor');t.textContent=g.n;svg.appendChild(t);
    });
    row.style.position='relative';row.appendChild(svg);
  }

  /* 整首级连音弧：栈跨 row 配对（支持跨行连音——上行画开口弧、下行画收口弧）+ 三连音括号。
     逐行算 reserve 抬升整行和弦到弧上（一行一个高度）。缩放前跑，box 每次重测 row rect。 */
  function layoutStrictArcsAll(scope){
    if(!scope)return;
    var rows=[].slice.call(scope.querySelectorAll('.prev-row'));
    if(!rows.length)return;
    rows.forEach(function(row){var s=row.querySelector('.strict-arc-svg');if(s)s.remove();[].forEach.call(row.querySelectorAll('.prev-seg.p-slot .p-chord'),function(ch){ch.style.marginBottom='';});});
    var all=[];
    rows.forEach(function(row){[].slice.call(row.querySelectorAll('.prev-seg.p-slot')).forEach(function(col){if(!col.classList.contains('p-barslot'))all.push({col:col,row:row});});});
    if(!all.length)return;
    var sstack=[],ystack=[],sgroups=[],tstack=[],tgroups=[];
    all.forEach(function(s,i){
      var so=(+s.col.getAttribute('data-slur-open'))||0,sc=(+s.col.getAttribute('data-slur-close'))||0,to=(+s.col.getAttribute('data-tuplet-open'))||0,tc=s.col.getAttribute('data-tuplet-close'),k;
      for(k=0;k<so;k++)sstack.push(i);
      for(k=0;k<sc;k++){var st=sstack.pop();if(st!=null)sgroups.push({s:st,e:i});}
      var yc=(+s.col.getAttribute('data-tie-close'))||0,yo=(+s.col.getAttribute('data-tie-open'))||0;   // ~ 连音独立栈：同列先收后开(链式 1~1~1 = 相邻小弧,同老版)
      for(k=0;k<yc;k++){var yt=ystack.pop();if(yt!=null)sgroups.push({s:yt,e:i,tie:1});}
      for(k=0;k<yo;k++)ystack.push(i);
      if(to)tstack.push({i:i,n:to});
      if(tc){var tt=tstack.pop();if(tt)tgroups.push({s:tt.i,e:i,n:tt.n});}
    });
    var dangles=[];while(sstack.length){var _ds=sstack.pop();if(_ds!=null)dangles.push(_ds);}while(ystack.length){var _dy=ystack.pop();if(_dy!=null)dangles.push(_dy);}   // 未闭合的 ( ：先画到行尾的开口半弧，边写边可见
    if(!sgroups.length&&!tgroups.length&&!dangles.length)return;
    sgroups.forEach(function(g){g._d=0;sgroups.forEach(function(h){if(h===g)return;if(h.s<=g.s&&g.e<=h.e&&(h.e-h.s)>(g.e-g.s))g._d++;});});
    var maxD=0;sgroups.forEach(function(g){if(g._d>maxD)maxD=g._d;});
    var NS='http://www.w3.org/2000/svg';
    function rIx(r){return rows.indexOf(r);}
    rows.forEach(function(row){
      var here=[];
      sgroups.forEach(function(g){var sr=all[g.s].row,er=all[g.e].row,ri=rIx(row),si=rIx(sr),ei=rIx(er);
        if(sr===row&&er===row)here.push({g:g,m:'full'});
        else if(sr===row)here.push({g:g,m:'open'});
        else if(er===row)here.push({g:g,m:'close'});
        else if(ri>si&&ri<ei)here.push({g:g,m:'thru'});
      });
      dangles.forEach(function(_ds){if(all[_ds].row===row)here.push({g:{s:_ds,e:_ds,_d:0},m:'open'});});
      var tHere=tgroups.filter(function(g){return all[g.s].row===row&&all[g.e].row===row;});
      if(!here.length&&!tHere.length)return;
      var reserve=0;if(here.length)reserve=Math.max(reserve,13+maxD*8);if(tHere.length)reserve=Math.max(reserve,20);
      [].forEach.call(row.querySelectorAll('.prev-seg.p-slot .p-chord'),function(ch){if(reserve)ch.style.marginBottom=reserve+'px';});
      var cols=[].slice.call(row.querySelectorAll('.prev-seg.p-slot')).filter(function(c){return !c.classList.contains('p-barslot');});
      var probe=cols[0]&&cols[0].querySelector('.jp-num'),scale=1;
      if(probe&&probe.offsetWidth){var pr=probe.getBoundingClientRect();scale=pr.width/probe.offsetWidth;}if(!scale)scale=1;
      function box(col){var el=col.querySelector('.jp-num')||col.querySelector('.jp-plain-sym')||col.querySelector('.p-n')||col;var r=el.getBoundingClientRect(),rr=row.getBoundingClientRect();var _t=r.top,_od=col.querySelector('.jp-dot-top');if(_od){var _or=_od.getBoundingClientRect();if(_or.height&&_or.top<_t)_t=_or.top;}   // 高音点在数字上方：弧线要抬到点之上,免得压住看不清
      return {cx:(r.left+r.width/2-rr.left)/scale,top:(_t-rr.top)/scale};}
      function rowW(){return row.getBoundingClientRect().width/scale;}
      // 旧渲染器 .jp-slur 同款：CSS 边框拱形(border-top/left/right + border-radius:50%/100% = 半椭圆拱)。全=拱、open=左半(左圆右平)、close=右半。三连音括号仍用 SVG。
      var host=document.createElement('div');host.className='strict-arc-svg';host.style.cssText='position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:4;color:currentColor;';
      var ARCH=9,STK=1.5,GAP=2,ASTEP=8,firstCol=cols[0],lastCol=cols[cols.length-1];
      function edge(col,side){var el=col.querySelector('.jp-num')||col.querySelector('.jp-plain-sym')||col.querySelector('.p-n')||col;var r=el.getBoundingClientRect(),rr=row.getBoundingClientRect();return ((side==='r'?r.right:r.left)-rr.left)/scale;}
      here.forEach(function(it){
        var g=it.g,lift=maxD-g._d,L,W,nt,cls;
        if(it.m==='full'){var a=box(all[g.s].col),b=box(all[g.e].col);var pad=0;   /* 端点一律精确对音位中心：相邻弧共享同一坐标才能无缝(slur 原来探出 2px 会跟 tie 重叠) */L=a.cx-pad;W=(b.cx-a.cx)+pad*2;nt=Math.min(a.top,b.top);for(var _k=g.s+1;_k<g.e;_k++){var _mt=box(all[_k].col).top;if(_mt<nt)nt=_mt;}cls='f';}
        else if(it.m==='open'){var a2=box(all[g.s].col);L=a2.cx;W=(edge(lastCol,'r')+4)-a2.cx;nt=a2.top;cls='o';}
        else if(it.m==='close'){var b2=box(all[g.e].col);L=edge(firstCol,'l')-4;W=b2.cx-L;nt=b2.top;cls='c';}
        else {L=edge(firstCol,'l')-4;W=(edge(lastCol,'r')+4)-L;nt=box(cols[0]).top;cls='t';}
        if(W<8)W=8;
        var top=nt-GAP-ARCH-lift*ASTEP;
        var css='position:absolute;box-sizing:border-box;pointer-events:none;left:'+L.toFixed(1)+'px;top:'+top.toFixed(1)+'px;width:'+W.toFixed(1)+'px;height:'+ARCH+'px;border:'+STK+'px solid currentColor;border-bottom:none;';
        if(cls==='f')css+='border-radius:50% 50% 0 0/100% 100% 0 0;';
        else if(cls==='o')css+='border-right:none;border-radius:50% 0 0 0/100% 0 0 0;';
        else if(cls==='c')css+='border-left:none;border-radius:0 50% 0 0/0 100% 0 0;';
        else css+='border-left:none;border-right:none;';
        var div=document.createElement('div');div.style.cssText=css;host.appendChild(div);
      });
      if(tHere.length){
        var svg=document.createElementNS(NS,'svg');svg.setAttribute('class','strict-arc-tup');svg.style.cssText='position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:4;';
        tHere.forEach(function(g){var a=box(all[g.s].col),b=box(all[g.e].col),x1=a.cx-4,x2=b.cx+4,y=Math.min(a.top,b.top)-7;var p=document.createElementNS(NS,'path');p.setAttribute('d','M '+x1.toFixed(1)+' '+(y+4)+' L '+x1.toFixed(1)+' '+y+' L '+x2.toFixed(1)+' '+y+' L '+x2.toFixed(1)+' '+(y+4));p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','1.2');svg.appendChild(p);var t=document.createElementNS(NS,'text');t.setAttribute('x',((x1+x2)/2).toFixed(1));t.setAttribute('y',(y-2).toFixed(1));t.setAttribute('text-anchor','middle');t.setAttribute('font-size','11');t.setAttribute('fill','currentColor');t.textContent=g.n;svg.appendChild(t);});
        host.appendChild(svg);
      }
      row.style.position='relative';row.appendChild(host);
    });
  }

  /* ══════════════ Transpose ══════════════ */
  var CHR=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var ENH={Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
  var FLT={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
  var FLAT_KEYS={F:1,Bb:1,Eb:1,Ab:1,Db:1,Gb:1,Cb:1};
  var USE_FLAT_MINOR_ROOTS={D:1,G:1,C:1,F:1,Bb:1,Eb:1};
  var KEY_SET_FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  var KEY_SET_SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  var ENHARMONIC_FLAT={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
  var ENHARMONIC_SHARP={Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
  function nIdx(n){return CHR.indexOf(ENH[n]||n);}
  function parseKeyName(key){
    var k=(key||'').trim();
    if(!k)return{root:'C',suf:''};
    var m=k.match(/^([A-G](?:#|b)?)(.*)$/);
    if(!m)return{root:k,suf:''};
    return{root:m[1],suf:m[2]||''};
  }
  function needFlat(root,suf){
    var minor=/m(?!aj)/i.test(suf||'');
    if(minor)return !!USE_FLAT_MINOR_ROOTS[root];
    return !!FLAT_KEYS[root];
  }
  function trKeyName(key,st,useFlat){
    var parsed=parseKeyName(key),i=nIdx(parsed.root);
    if(i<0)return key;
    var r=CHR[(i+st+12)%12];
    var flat=(useFlat!==undefined)?useFlat:needFlat(parsed.root,parsed.suf);
    return (flat?(FLT[r]||r):r)+parsed.suf;
  }
  function trBass(bass,st,useFlat){return trKeyName(bass,st,useFlat);}
  function normLyricText(text){return String(text||'');}
  var IS_APPLE_DEVICE=/Mac|iPad|iPhone|iPod/.test(navigator.platform||'')||/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent||'');
  var GAP_CANDIDATES=['\u3164','\u3000','\u2003','\u00a0'];
  var GAP_CHAR_CACHE=new Map();
  var GAP_WIDTH_CACHE=new Map();
  function pickRenderableGapChar(el){
    if(!el||!document.body)return '\u3000';
    var cs=getComputedStyle(el);
    var key=[cs.font,cs.letterSpacing,cs.wordSpacing,cs.lineHeight].join('|');
    if(GAP_CHAR_CACHE.has(key))return GAP_CHAR_CACHE.get(key);
    var probe=document.createElement('span');
    probe.style.cssText='position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:pre;pointer-events:none;';
    probe.style.font=cs.font;
    probe.style.letterSpacing=cs.letterSpacing;
    probe.style.wordSpacing=cs.wordSpacing;
    probe.style.lineHeight=cs.lineHeight;
    document.body.appendChild(probe);
    var pick='\u3000';
    GAP_CANDIDATES.forEach(function(ch){
      if(pick!=='\u3000')return;
      probe.textContent=ch;
      if(probe.getBoundingClientRect().width>0.2)pick=ch;
    });
    probe.remove();
    GAP_CHAR_CACHE.set(key,pick);
    return pick;
  }
  function measureGapWidth(el,sample){
    if(!el||!document.body)return 0;
    var cs=getComputedStyle(el);
    var key=[sample,cs.font,cs.letterSpacing,cs.wordSpacing,cs.lineHeight].join('|');
    if(GAP_WIDTH_CACHE.has(key))return GAP_WIDTH_CACHE.get(key);
    var probe=document.createElement('span');
    probe.style.cssText='position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:pre;pointer-events:none;';
    probe.style.font=cs.font;
    probe.style.letterSpacing=cs.letterSpacing;
    probe.style.wordSpacing=cs.wordSpacing;
    probe.style.lineHeight=cs.lineHeight;
    probe.textContent=sample;
    document.body.appendChild(probe);
    var w=probe.getBoundingClientRect().width;
    probe.remove();
    GAP_WIDTH_CACHE.set(key,w);
    return w;
  }
  function appendGapNode(el,cls,width,ch){
    var gap=document.createElement('span');
    gap.className=cls;
    gap.setAttribute('aria-hidden','true');
    if(width>0){
      gap.style.display='inline-block';
      gap.style.width=width+'px';
      gap.textContent=' ';
    }else{
      gap.textContent=ch;
    }
    el.appendChild(gap);
  }
  function normalizeRenderableGapText(el,text){
    return String(text||'').replace(/\u3164/g,pickRenderableGapChar(el));
  }
  function setChordContent(el,text){
    var raw=String(text||'');
    if(!IS_APPLE_DEVICE){el.textContent=normalizeRenderableGapText(el,raw);return;}
    var gapWidth=measureGapWidth(el,'0');
    el.textContent='';
    for(var i=0;i<raw.length;i++){
      var ch=raw[i];
      if(ch==='\u3164')appendGapNode(el,'chord-gap',gapWidth,ch);
      else el.appendChild(document.createTextNode(ch));
    }
  }
  function setLyricContent(el,text){
    var raw=String(text||'');
    var gapChar=pickRenderableGapChar(el);
    var gapWidth=IS_APPLE_DEVICE?measureGapWidth(el,'我'):0;
    el.textContent='';
    for(var i=0;i<raw.length;i++){
      var ch=raw[i];
      if(ch==='\u3164'){
        appendGapNode(el,'lyric-gap',gapWidth,gapChar);
      }else{
        el.appendChild(document.createTextNode(ch));
      }
    }
  }
/* ═══════════ CECP-SONG-EXT v1 BEGIN ═══════════
   共享模块：{sp} 专属空格渲染 + 移调占位补偿。
   本块在以下三个文件中逐字节相同（权威版本 = shared/song-ext.js）：
     musiclib/musiclib.js / youth-engine.js / musictool/musictool.js
   修改流程：先改 shared/song-ext.js，再同步三处，diff 校验一致。
   注意：本块内禁止出现反斜杠字符
   （musictool.js 经 CMS 部署会丢失一层反斜杠），
   转义字符一律用 String.fromCharCode 构造。 */
var SP_TOKEN='{sp}';
var SP_TAB=String.fromCharCode(9);
var SP_HANGUL_FILLER=String.fromCharCode(0x3164);
var SP_IDEO_SPACE=String.fromCharCode(0x3000);
var SP_WIDTH_CACHE={};
function spHasToken(text){
  return String(text||'').indexOf(SP_TOKEN)>=0;
}
function spStripTokens(text){
  return String(text||'').split(SP_TOKEN).join('');
}
function spMeasureWidth(el,sample){
  if(!el||!document.body)return 0;
  var cs=getComputedStyle(el);
  var key=sample+'|'+cs.font+'|'+cs.letterSpacing+'|'+cs.wordSpacing+'|'+cs.lineHeight;
  if(Object.prototype.hasOwnProperty.call(SP_WIDTH_CACHE,key))return SP_WIDTH_CACHE[key];
  var probe=document.createElement('span');
  probe.style.cssText='position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:pre;pointer-events:none;';
  probe.style.font=cs.font;
  probe.style.letterSpacing=cs.letterSpacing;
  probe.style.wordSpacing=cs.wordSpacing;
  probe.style.lineHeight=cs.lineHeight;
  probe.textContent=sample;
  document.body.appendChild(probe);
  var w=probe.getBoundingClientRect().width;
  probe.remove();
  SP_WIDTH_CACHE[key]=w;
  return w;
}
function spAppendGap(el,cls,width){
  var gap=document.createElement('span');
  gap.className=cls;
  gap.setAttribute('aria-hidden','true');
  gap.style.display='inline-block';
  gap.style.width=width+'px';
  gap.textContent=' ';
  el.appendChild(gap);
}
function spSetContent(el,text,kind,fallback){
  var raw=String(text||'');
  if(raw.indexOf(SP_TOKEN)<0){fallback(el,raw);return;}
  var sample=kind==='chord'?'0':'我';
  var cls=kind==='chord'?'chord-gap sp-gap':'lyric-gap sp-gap';
  var width=spMeasureWidth(el,sample);
  el.textContent='';
  var parts=raw.split(SP_TOKEN);
  for(var i=0;i<parts.length;i++){
    if(i>0)spAppendGap(el,cls,width);
    if(parts[i]){
      var sub=document.createElement('span');
      el.appendChild(sub);
      fallback(sub,parts[i]);
    }
  }
}
function setChordContentEx(el,text,fallback){
  spSetContent(el,text,'chord',fallback);
}
function setLyricContentEx(el,text,fallback){
  spSetContent(el,text,'lyric',fallback);
}
function spIsGapChar(ch){
  return ch===' '||ch===SP_TAB||ch===SP_HANGUL_FILLER;
}
function spTokenizeChord(text){
  var raw=String(text||''),out=[],i=0,cur='';
  function flushText(){
    if(cur){out.push({gap:false,text:cur});cur='';}
  }
  while(i<raw.length){
    var isSp=raw.substr(i,SP_TOKEN.length)===SP_TOKEN;
    var ch=raw.charAt(i);
    if(isSp||spIsGapChar(ch)){
      flushText();
      var units=[];
      while(i<raw.length){
        if(raw.substr(i,SP_TOKEN.length)===SP_TOKEN){
          units.push(SP_TOKEN);i+=SP_TOKEN.length;continue;
        }
        var gc=raw.charAt(i);
        if(spIsGapChar(gc)){units.push(gc);i++;continue;}
        break;
      }
      out.push({gap:true,units:units});
      continue;
    }
    cur+=ch;i++;
  }
  flushText();
  return out;
}
function spResizeGapRun(units,len){
  var mapped=[];
  for(var i=0;i<units.length;i++){
    var u=units[i];
    mapped.push(u===SP_HANGUL_FILLER?SP_IDEO_SPACE:u);
  }
  if(!mapped.length||len<=0)return '';
  var out='';
  for(var j=0;j<len;j++)out+=mapped[j%mapped.length];
  return out;
}
function trChordEx(text,st,useFlat,trChordFn){
  var raw=String(text||'');
  if(raw.indexOf(SP_TOKEN)<0)return trChordFn(raw,st,useFlat);
  var parts=spTokenizeChord(raw),out='',i=0;
  while(i<parts.length){
    var part=parts[i];
    if(part.gap){out+=part.units.join('');i++;continue;}
    var tr=trChordFn(part.text,st,useFlat);
    out+=tr;
    if(i+1<parts.length&&parts[i+1].gap){
      var units=parts[i+1].units;
      var nextLen=units.length+(Array.from(part.text).length-Array.from(tr).length);
      if(nextLen<0)nextLen=0;
      if(nextLen===0&&i+2<parts.length&&!parts[i+2].gap)nextLen=1;
      out+=spResizeGapRun(units,nextLen);
      i+=2;continue;
    }
    i++;
  }
  return out;
}
function segIsLabelBlock(seg){
  return !!seg&&typeof seg==='object'&&typeof seg.label==='string';
}
function segIsRenderableBlock(seg){
  if(!seg||typeof seg!=='object')return false;
  if(segIsLabelBlock(seg))return true;
  return typeof seg.chord!=='undefined'||typeof seg.n!=='undefined'||typeof seg.lyric!=='undefined'||typeof seg.lyric2!=='undefined'||typeof seg.lyric3!=='undefined'||typeof seg.lyric4!=='undefined';
}
var SEC_LABEL_COLORS=[
  ['pre-chorus','prechorus','pre chorus','前副歌','导歌','#0d9488'],
  ['chorus','副歌','#e8590c'],
  ['verse','主歌','#2f6fdb'],
  ['bridge','桥段','桥','#7c3aed'],
  ['intro','前奏','#6b7280'],
  ['outro','ending','尾奏','尾声','#b45309']
];
var SEC_LABEL_FALLBACK=['#db2777','#0891b2','#4f46e5','#65a30d','#9333ea','#0284c7'];
function secLabelColor(text){
  var t=String(text||'').toLowerCase();
  for(var i=0;i<SEC_LABEL_COLORS.length;i++){
    var grp=SEC_LABEL_COLORS[i];
    for(var j=0;j<grp.length-1;j++){
      if(grp[j]&&t.indexOf(grp[j])>=0)return grp[grp.length-1];
    }
  }
  var h=0;
  for(var k=0;k<t.length;k++)h=(h*31+t.charCodeAt(k))%997;
  return SEC_LABEL_FALLBACK[h%SEC_LABEL_FALLBACK.length];
}
var SEC_LABEL_TOP_GAP_PX=3;
/* ── 段落标记(严格模式)的锚点 ──
   严格模式的段落标记单独占一行 .strict-label-row，徽章用的是 left:dx / top:dy 的
   **绝对像素** —— 作者在自然排版下一格一格拖出来的(song JSON 的 dx/dy)。
   v2 一压紧行高、一拉宽行，音符就走了、行高也变了，徽章会指错拍子、掉到音符上。
   所以每次重排前先记下「它指着哪一列、列内哪个位置、离这行音符行多高」，
   重排完按新坐标放回去：徽章还是压在原来那一拍、离音符一样高。
   left/top 都是 relative 定位，改了不影响任何布局，放回去之后不必重新测量。
   老格式的标记是 inline 挂在行里跟着音符走的(placeSecLabel 每次重排都会重新定位)，不用管。
   data-a4-l0/t0 = 第一次见到时的原始 dx/dy，resetScoreFit 每次先归位 —— 否则反复 fit 会把
   补偿量一次次叠上去(跟 justify 的 data-ml-just 幂等是同一个道理)。 */
function secLabelTags(scope){
  return (scope&&scope.querySelectorAll)?scope.querySelectorAll('.strict-label-row .sec-label'):[];
}
function secLabelsReset(scope){
  Array.prototype.forEach.call(secLabelTags(scope),function(tag){
    if(!tag.hasAttribute('data-a4-l0'))return;
    tag.style.left=tag.getAttribute('data-a4-l0')+'px';
    tag.style.top=tag.getAttribute('data-a4-t0')+'px';
  });
}
function secLabelsSnapshot(scope){
  var marks=[];
  Array.prototype.forEach.call(secLabelTags(scope),function(tag){
    var line=tag.closest?tag.closest('.sw-lline'):null;
    var row=line?line.querySelector('.sw-lrow'):null;
    if(!row)return;
    if(!tag.hasAttribute('data-a4-l0')){
      tag.setAttribute('data-a4-l0',(parseFloat(tag.style.left)||0));
      tag.setAttribute('data-a4-t0',(parseFloat(tag.style.top)||0));
    }
    var rr=row.getBoundingClientRect(),tr=tag.getBoundingClientRect();
    var x=tr.left-rr.left;
    var cols=row.querySelectorAll('.prev-seg'),col=null,frac=0,i,cr;
    for(i=0;i<cols.length;i++){
      cr=cols[i].getBoundingClientRect();
      if(cr.left-rr.left<=x||i===0)col=cols[i];else break;
    }
    if(col){cr=col.getBoundingClientRect();frac=cr.width?((x-(cr.left-rr.left))/cr.width):0;}
    var note=row.querySelector('.p-n');
    marks.push({tag:tag,row:row,col:col,frac:frac,x:x,rowW:row.offsetWidth||1,
                note:note,gap:note?(tr.top-note.getBoundingClientRect().top):null});
  });
  return marks;
}
function secLabelsRestore(marks){
  if(!marks||!marks.length)return;
  marks.forEach(function(m){
    var rr=m.row.getBoundingClientRect(),x=m.x;
    if(m.col){var cr=m.col.getBoundingClientRect();x=(cr.left-rr.left)+m.frac*cr.width;}
    else x=m.x*(m.row.offsetWidth||1)/m.rowW;      // 没有音位列可锚(纯记号行)：按行宽等比挪
    m.tag.style.left=x.toFixed(1)+'px';
    if(m.note&&m.gap!=null){
      var now=m.tag.getBoundingClientRect().top-m.note.getBoundingClientRect().top;
      m.tag.style.top=((parseFloat(m.tag.style.top)||0)+(m.gap-now)).toFixed(1)+'px';
    }
  });
}
function segRenderLabelBlock(seg,row){
  var holder=document.createElement('span');
  holder.className='sec-label-holder';
  holder.style.cssText='display:inline-block;width:0;overflow:visible;vertical-align:top;position:relative;align-self:stretch;';
  holder.setAttribute('aria-hidden','true');
  var tag=document.createElement('span');
  var jump=seg.style==='jump';
  tag.className='sec-label'+(jump?' sec-label-jump':'');
  var color=secLabelColor(seg.label);
  var dx=Number(seg.dx)||0;
  var dy=Number(seg.dy)||0;   // 上下偏移(可拖)：正=往下,可把标记拖到谱下方当 Fine 用
  var base='display:inline-block;position:absolute;left:'+dx+'px;top:'+(16+dy)+'px;white-space:nowrap;line-height:1.4;font-size:0.58em;padding:0 7px;border-radius:999px;box-sizing:border-box;letter-spacing:0.4px;z-index:2;';
  if(jump){
    tag.style.cssText=base+'font-style:italic;font-weight:600;color:'+color+';border:1px solid '+color+';background:transparent;opacity:0.92;';
  }else{
    tag.style.cssText=base+'font-weight:700;color:#ffffff;border:1px solid '+color+';background:'+color+';';
  }
  tag.textContent=String(seg.label||'');
  holder.appendChild(tag);
  /* 给段落标记让出一条带(把和弦顶上去)并把徽章定位到和弦下方。
     ⚠️ 这里必须能重试：makeSecLabel 是在内存里拼行时调用的，
     youth 这类「先拼好整首再交给宿主 append」的路径，首帧 holder.isConnected 还是 false。
     老代码是一次性 rAF + 直接 return，于是回调永远没跑成 —— 徽章停在初始 top:16px、
     和弦也没让位，两者就撞在一起（严格模式因为 layoutStrictArcsAll 每次都会重设
     .p-chord 的 marginBottom，所以看不出问题）。 */
  function placeSecLabel(keepChordHeight){
    if(!holder.isConnected)return false;
    var scope=holder.closest?holder.closest('.prev-row'):null;
    if(!scope)return false;
    var pillH=tag.offsetHeight||13;
    var band=pillH+SEC_LABEL_TOP_GAP_PX*2;
    var chords=scope.querySelectorAll('.p-chord');
    for(var i=0;!keepChordHeight&&i<chords.length;i++){
      chords[i].style.marginBottom=(2+band)+'px';
    }
    var ref=holder.nextElementSibling;
    while(ref&&!(ref.querySelector&&ref.querySelector('.p-chord')))ref=ref.nextElementSibling;
    if(!ref){
      ref=holder.previousElementSibling;
      while(ref&&!(ref.querySelector&&ref.querySelector('.p-chord')))ref=ref.previousElementSibling;
    }
    var ch=ref?ref.querySelector('.p-chord'):scope.querySelector('.p-chord');
    if(ch){
      var hr=holder.getBoundingClientRect();
      var cr=ch.getBoundingClientRect();
      var scale=(holder.offsetHeight&&hr.height)?(hr.height/holder.offsetHeight):1;
      if(!scale)scale=1;
      tag.style.top=((cr.bottom-hr.top)/scale+SEC_LABEL_TOP_GAP_PX+dy)+'px';
    }
    return true;
  }
  holder.cecpPlaceSecLabel=placeSecLabel;   // 宿主布局settle后可再调一次
  if(typeof requestAnimationFrame==='function'){
    var tries=0;
    (function retry(){
      if(placeSecLabel())return;
      if(++tries>40)return;                 // 约 40 帧兜底，避免节点永远不入档时空转
      requestAnimationFrame(retry);
    })();
  }
  return holder;
}
/* ═══════════ CECP-SONG-EXT v1 END ═══════════ */

/* ═══════════ CECP-CHORD-STYLE v1 BEGIN ═══════════
   共享模块：和弦文字视觉样式（按根音固定配色的纯文字，不加任何底色/边框）。
   本块在以下三个文件中逐字节相同（权威版本 = shared/chord-style.js）：
     musiclib/musiclib.js / youth-engine.js / musictool/musictool.js
   修改流程：先改 shared/chord-style.js，再同步三处，diff 校验一致。
   注意：本块内禁止出现反斜杠字符
   （musictool.js 经 CMS 部署会丢失一层反斜杠），
   转义字符一律用 String.fromCharCode 构造。
   硬性约束：只做视觉，不改布局——和弦按等宽字体与歌词逐字对齐，
   因此不用 padding/border/margin/outline，只改 color。
   字号、行高、margin、min-height 全部继承宿主 .p-chord 原样。
   2026-08 起去掉了底色与描边小片（用户反馈更占地方）：
   和弦回到纯文字，仅靠颜色区分根音。这条约束原本就写在这里，
   后来 padding 被加了进来，现在改回来了。
   配色规则：同根音共用一色（G/G7/Gsus4/Gm 同色），12 音名 12 色，
   色相按半音序直接展开（pc*30°）：常见进行（I-IV-V、关系小调）
   的根音相距纯四/五度或小三度，映射后色差足够大，
   同一首歌里的常用和弦颜色能明显区分；
   文字对比度优先：浅色主题深字(L20%)、深色主题浅字(L84%)，
   直接压在宿主背景上（不再有自己的底色）。这两个亮度值是去底色后实测过的：
   压在 #F4EFE7 / #101613 上最差对比度 5.71 / 9.85，均过 WCAG AA(4.5)。
   ⚠️ 别把浅色调到 28%，G/A/B 那几个黄绿色相会掉到 3.3~4.1，投影上发虚；
   深浅主题分别取色：优先 html[data-resolved-theme]，
   无该属性的宿主回退 prefers-color-scheme。 */
var CHORD_STYLE_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
var CHORD_STYLE_SHARP=String.fromCharCode(0x266F);
var CHORD_STYLE_FLAT=String.fromCharCode(0x266D);
var CHORD_STYLE_GAPS=' '+String.fromCharCode(9)+String.fromCharCode(160)+String.fromCharCode(0x3164)+String.fromCharCode(0x3000);
function chordStyleIsGapChar(ch){
  return CHORD_STYLE_GAPS.indexOf(ch)>=0;
}
/* 根音 -> 半音音级（0..11）；找不到可识别根音时返回 -1（不上色）。
   规则：根音必须在 token 开头（允许若干前置左括号，兼容 "(C/G)"），
   根音（含变音记号）之后若紧跟小写字母，必须是合法和弦后缀首字母
   （m/s/a/d，如 m7、sus4、add9、dim），否则视为普通单词不上色——
   这样可排除写在 chord 字段里的 "Fine"、"Chorus"、"Coda"、
   "To Chorus" 这类段落标记文本。 */
function chordStylePitchClass(token){
  var s=String(token||'');
  var i=0;
  while(i<s.length&&s.charAt(i)==='(')i++;
  var ch=s.charAt(i);
  if(!Object.prototype.hasOwnProperty.call(CHORD_STYLE_PC,ch))return -1;
  var pc=CHORD_STYLE_PC[ch];
  var j=i+1;
  var nx=s.charAt(j);
  if(nx==='#'||nx===CHORD_STYLE_SHARP){pc=(pc+1)%12;j++;}
  else if(nx==='b'||nx===CHORD_STYLE_FLAT){pc=(pc+11)%12;j++;}
  var after=s.charAt(j);
  if(after>='a'&&after<='z'&&'msad'.indexOf(after)<0)return -1;
  return pc;
}
/* 音级 -> 色相：半音序直接展开再整体旋转，C=210°（蓝），确定性映射。 */
function chordStyleHue(pc){
  return (pc*30+210)%360;
}
function chordStyleEnsureCss(){
  if(typeof document==='undefined'||!document.head)return;
  if(document.getElementById('cecp-chord-style'))return;
  var st=document.createElement('style');
  st.id='cecp-chord-style';
  var light='',dark='',i,h;
  for(i=0;i<12;i++){
    h=chordStyleHue(i);
    light+='.chord-chip.chord-pc'+i+'{color:hsl('+h+',90%,20%);}';
    dark+='.chord-chip.chord-pc'+i+'{color:hsl('+h+',72%,84%);}';
  }
  // Theme context must not outrank the light paper's local chord palette.
  var darkAttr=dark.split('.chord-chip.').join(':where(html[data-resolved-theme="dark"]:not([data-sheet-theme="light"])) .chord-chip.');
  var darkAuto=dark.split('.chord-chip.').join(':where(html:not([data-resolved-theme="light"]):not([data-sheet-theme="light"])) .chord-chip.');
  st.textContent=
    light+darkAttr+
    '@media (prefers-color-scheme: dark){'+darkAuto+'}'+
    '.sw-score .chord-chip, .sw-page .chord-chip, .cf-jianpu .chord-chip { font-weight:700; }';
  document.head.appendChild(st);
}
/* 把一个文本节点按 gap 字符切成若干节点，返回 [{gap,node}...]；
   只有内容/gap 混排时才真正拆分 DOM。 */
function chordStyleSplitText(node){
  var s=node.nodeValue||'',pieces=[],cur='',curGap=null,out=[],i;
  for(i=0;i<s.length;i++){
    var g=chordStyleIsGapChar(s.charAt(i));
    if(curGap===null)curGap=g;
    if(g!==curGap){pieces.push({gap:curGap,text:cur});cur='';curGap=g;}
    cur+=s.charAt(i);
  }
  if(cur)pieces.push({gap:curGap,text:cur});
  if(pieces.length<=1){
    out.push({gap:pieces.length?pieces[0].gap:true,node:node});
    return out;
  }
  var parent=node.parentNode;
  for(i=0;i<pieces.length;i++){
    var tn=document.createTextNode(pieces[i].text);
    parent.insertBefore(tn,node);
    out.push({gap:pieces[i].gap,node:tn});
  }
  parent.removeChild(node);
  return out;
}
function chordChipWalk(parent){
  var nodes=[],n,i;
  for(n=parent.firstChild;n;n=n.nextSibling)nodes.push(n);
  var run=[];
  function flush(){
    if(!run.length)return;
    var text='',k;
    for(k=0;k<run.length;k++)text+=run[k].nodeValue;
    var pc=chordStylePitchClass(text);
    if(pc>=0){
      var chip=document.createElement('span');
      chip.className='chord-chip chord-pc'+pc;
      parent.insertBefore(chip,run[0]);
      for(k=0;k<run.length;k++)chip.appendChild(run[k]);
    }
    run=[];
  }
  for(i=0;i<nodes.length;i++){
    n=nodes[i];
    if(n.nodeType===3){
      var pieces=chordStyleSplitText(n);
      for(var j=0;j<pieces.length;j++){
        if(pieces[j].gap)flush();
        else run.push(pieces[j].node);
      }
    }else if(n.nodeType===1){
      flush();
      var c=' '+String(n.className||'')+' ';
      if(c.indexOf('gap')<0)chordChipWalk(n);
    }else{
      flush();
    }
  }
  flush();
}
/* 对一个 .p-chord 元素做视觉装饰：内容设置完成后调用。
   同一元素内多个和弦（以空白/占位分隔）各自成片、各自取色。 */
function chordChipDecorate(root){
  if(!root||root.nodeType!==1)return;
  var cls=' '+String(root.className||'')+' ';
  if(cls.indexOf(' empty ')>=0)return;
  if(root.querySelector&&root.querySelector('.chord-chip'))return;
  chordStyleEnsureCss();
  chordChipWalk(root);
}
/* ═══════════ CECP-CHORD-STYLE v1 END ═══════════ */

/* ═══════════ CECP-JUSTIFY-ROWS v1 BEGIN ═══════════
   共享模块：简谱行内两端对齐（justify）。
   本块在以下三个文件中逐字节相同（权威版本 = shared/justify-rows.js）：
     musiclib/musiclib.js / youth-engine.js / musictool/musictool.js
   修改流程：先改 shared/justify-rows.js，再同步三处，diff 校验一致。
   注意：本块内禁止出现反斜杠字符
   （musictool.js 的副本位于 jianpuHTML 模板字符串内，
   经 CMS 部署还会再丢一层反斜杠）。
   硬性约束：只改 .prev-seg 的 inline margin-right，
   绝不插入/删除/移动任何元素——musictool 点击定位用 data-loc，
   shared/lyric-hl.js 用 .prev-seg 的索引定位歌词高亮，
   元素数量或顺序一旦变化全部错位。
   工作方式：在未缩放坐标系（transform:scale 之前）执行；
   每次先按 data-ml-just 标记还原上次写入的 margin，再重新测量分摊，
   保证 resize / 重渲染幂等，margin 不会叠加复利。
   短行不拉伸：自然宽 < ratio*maxW（默认 0.62）的行保持左对齐，
   类似文本 justify 对最后一行的惯例。 */
function justifyScoreRowsClear(scope){
  if(!scope||!scope.querySelectorAll)return;
  scope.querySelectorAll('[data-ml-just]').forEach(function(seg){
    seg.style.marginRight='';
    seg.removeAttribute('data-ml-just');
  });
}
function justifyScoreRows(rowList,opts){
  opts=opts||{};
  var ratio=(opts.ratio==null)?0.62:opts.ratio;
  var rows=Array.prototype.slice.call(rowList||[]);
  if(!rows.length)return 0;
  /* 1. 还原上次 justify 写入的 margin（幂等基线） */
  rows.forEach(function(row){justifyScoreRowsClear(row);});
  /* 2. inline-flex 测各行自然宽度（与 measureNaturalScore 同法） */
  var widths=rows.map(function(row){
    var prev=row.style.display;
    var prevW=row.style.width;
    row.style.display='inline-flex';
    row.style.width='max-content';
    /* 必须用 offsetWidth：flex 容器的 scrollWidth 不含子项 margin，
       而最终行宽是含 margin 的，两者不是同一个量 -> 严格模式每列都有 margin
       (列间距/悬挂标点间隙)，列数越多误差越大，各行拉不齐(实测差 15px)。 */
    var w=row.offsetWidth;
    row.style.display=prev;
    row.style.width=prevW;
    return w;
  });
  var maxW=0;
  widths.forEach(function(w){if(w>maxW)maxW=w;});
  if(opts.targetWidth && opts.targetWidth > maxW) maxW = opts.targetWidth;
  if(!maxW)return 0;
  /* 3. 先集中读（offsetWidth / computed margin），后集中写，避免逐格回流 */
  var plans=[];
  rows.forEach(function(row,idx){
    var w=widths[idx];
    var extra=maxW-w;
    if(extra<=0||w<ratio*maxW)return;
    var segs=Array.prototype.slice.call(row.querySelectorAll('.prev-seg'));
    if(segs.length<2)return;
    segs.pop(); /* DOM 顺序最后一个 seg 不加 margin，保住行尾对齐 */
    var total=0;
    var items=segs.map(function(seg){
      var sw=seg.offsetWidth;
      total+=sw;
      return {
        seg:seg,
        w:sw,
        base:parseFloat(getComputedStyle(seg).marginRight)||0
      };
    });
    if(total<=0)return;
    plans.push({row:row,items:items,extra:extra,total:total});
  });
  plans.forEach(function(plan){
    plan.items.forEach(function(item){
      item.seg.style.marginRight=(item.base+plan.extra*item.w/plan.total)+'px';
      item.seg.setAttribute('data-ml-just','1');
    });
  });
  /* 收尾校正：写完之后逐行实测，把残差补到最后一个参与分摊的 seg 上。
     「量」和「写」之间只要有任何东西改过宽度（网页字体晚到、谱图加载、
     宿主容器重排），一次性按比例分摊就会不准，而且没人再纠正 ——
     实测老格式歌各行会差十几 px，行尾参差不齐。
     这一刀让本函数自己保证后置条件：该拉伸的行，右端严格对齐到同一个 maxW。 */
  plans.forEach(function(plan){
    if(!plan.items.length)return;
    /* 只校正老格式行：严格对位行的 p-slot 列宽和弦避让已经由 strict 分支负责，
       这里保持原来的 strict 水平布局不变。 */
    if(plan.row.querySelector('.prev-seg.p-slot'))return;
    var prev=plan.row.style.display;
    var prevW=plan.row.style.width;
    plan.row.style.display='inline-flex';
    plan.row.style.width='max-content';
    var now=plan.row.offsetWidth;
    plan.row.style.display=prev;
    plan.row.style.width=prevW;
    var diff=maxW-now;
    if(diff>0.5||diff<-0.5){
      var last=plan.items[plan.items.length-1];
      var v=(parseFloat(last.seg.style.marginRight)||0)+diff;
      if(v<0)v=0;
      last.seg.style.marginRight=v+'px';
    }
  });
  return plans.length;
}
/* ═══════════ CECP-JUSTIFY-ROWS v1 END ═══════════ */

/* ═══════════ CECP-CHORD-FIT v1 BEGIN ═══════════
   共享模块：严格对位（align:"strict"）下的和弦排版。
   本块在以下三个文件中逐字节相同（权威版本 = shared/chord-fit.js）：
     musiclib-react-migration/public/musiclib.js / youth-engine.js / musictool/musictool.js
   修改流程：先改 shared/chord-fit.js，再同步三处，diff 校验一致。
   注意：本块内禁止出现反斜杠字符、反引号、以及美元号紧跟大括号
   （musictool.js 的副本位于 jianpuHTML 模板字符串内，
   经 CMS 部署还会再丢一层反斜杠）。转义一律用 String.fromCharCode 构造。

   只作用于严格模式（.prev-seg.p-slot 结构）；老格式的歌一个像素都不动。

   解决的问题：严格模式下每个音位是一个竖列，和弦 .p-chord 参与列宽计算，
   于是 F#sus4 这种长和弦会把整列撑宽 → 数字之间的间距被拉大 → 整行自然宽度变大
   → fitRows 按「可用宽度 / 自然宽度」缩放，行越宽整首谱缩得越小。

   规则（用户 2026-08-15 定的）：
   1. .p-chord 零宽 + overflow 可见 → 和弦完全不参与列宽，数字位置只由数字/歌词决定。
   2. 对中核心 = 前两个「字」；斜杠和括号不算字（所以 C/E 是 2 个字、整体对中）。
      一个字就那个字对中，两个字就两个字对中 —— 与老版逐像素相同。
      第 3 个字起是「尾巴」，零宽悬挂、只向右延伸，不影响任何人的位置。
   3. 紧邻的下一个音位马上也有和弦时，这个和弦退回老版「整段整体对中」
      （左右都伸），否则右延伸会把后面的音位推开，反而比老版更宽。
   4. 头和尾一样大，绝不为了省地方缩小尾巴（用户明确否过）。
      严格模式的和弦基准字号 16px（老格式仍是 12px，不受影响）——
      零宽之后放大不撑列宽，所以敢放大。
   5. 只有两个和弦真的会撞上时，才在那一处局部加最小间距（写 padding，
      不碰 margin-right —— 那是 justifyScoreRows 的地盘）。
   6. 收紧要**同时**满足两个条件，缺一不收：
      ① 这一段是连续 >=4 个「歌词空位」（前奏/间奏/拖腔）；
      ② **这一行确实长** —— 自然宽 >= 全曲最宽行 * CHORD_FIT_LONG_ROW。
      收紧的意义是「别让这行拖着整首谱缩小」，行本来就不长的话收了白收，
      只会显得局促（用户 2026-08-16：「一行太长的时候才需要缩紧，位置够就正常对齐」）。
      收紧只改列的 margin/min-width，不改字号、不改和弦、不改和弦的位置关系。

   与既有代码的分工（都不要碰）：
   - .prev-seg 的 marginRight = justifyScoreRows 的
   - .p-chord 的 marginBottom = layoutStrictArcsAll / placeSecLabel 的
   - 本块只写：列的 paddingLeft / paddingRight，以及 .p-chord 上的 p-chord-mid 类。 */

var CHORD_FIT_GAP=4;          /* 两个和弦之间的最小安全间距(px, scale=1) */
var CHORD_FIT_EMPTY_RUN=4;    /* 连续这么多个「歌词空位」才触发收紧（用户定的：4 个以上 @） */
var CHORD_FIT_LONG_ROW=0.9;   /* 还要这行确实长：自然宽 >= 最宽行 * 这个比例才收紧，位置够就正常排 */
var CHORD_FIT_TIGHT=0.3;      /* 收紧强度参考值：列外边距归零 + 最小列宽 1.2em -> 0.9em，约省三成横向占位 */

/* 空白字符：普通空格 / TAB / NBSP / 韩文填充符 ㅤ / 全角空格 */
var CHORD_FIT_BLANKS=' '+String.fromCharCode(9)+String.fromCharCode(160)+String.fromCharCode(0x3164)+String.fromCharCode(0x3000);
function chordFitIsBlank(s){
  var t=String(s||''),i;
  for(i=0;i<t.length;i++){ if(CHORD_FIT_BLANKS.indexOf(t.charAt(i))<0)return false; }
  return true;
}
/* 对中核心的长度：数到第 2 个「字」为止；斜杠与括号不算字。
   C -> 1(整个)、F# -> 2、C/E -> 3(整个,因为 / 不算字)、Gm7 -> 2、F#sus4 -> 2 */
function chordFitHeadLen(text){
  var s=String(text||''),n=0,i,c;
  for(i=0;i<s.length;i++){
    c=s.charAt(i);
    if(c!=='/'&&c!=='('&&c!==')')n++;
    if(n>=2)return i+1;
  }
  return s.length;
}
/* 把一个和弦元素的文字拆成 头 + 尾 两个 span。幂等。
   注意：setChordContent 在 Apple 设备上是「一个字符一个文本节点」，
   所以这里要吃下任意多个连续文本节点；一旦混进元素子节点
   （{sp} 的 chord-gap 占位块）就原样放过——放过也没关系：
   零宽 + 整体对中，仍然不撑列宽，只是没有右延伸。 */
function chordFitSplitOne(host){
  if(!host||host.nodeType!==1)return;
  if(host.querySelector&&host.querySelector('.p-chord-head'))return;
  var nodes=[],txt='',n,i;
  for(n=host.firstChild;n;n=n.nextSibling){
    if(n.nodeType!==3)return;
    nodes.push(n);
    txt+=(n.nodeValue||'');
  }
  if(!nodes.length||!txt||chordFitIsBlank(txt))return;
  var k=chordFitHeadLen(txt);
  var head=document.createElement('span');
  head.className='p-chord-head';
  head.appendChild(document.createTextNode(txt.slice(0,k)));
  for(i=0;i<nodes.length;i++)host.removeChild(nodes[i]);
  host.appendChild(head);
  if(k<txt.length){
    var tail=document.createElement('span');
    tail.className='p-chord-tail';
    tail.appendChild(document.createTextNode(txt.slice(k)));
    host.appendChild(tail);
  }
}
/* 建列时调用：setChordContentEx + chordChipDecorate 之后，对一个 .p-chord 生效。
   叠和弦(逗号)每一层 .p-chord-stk 各自拆。 */
function chordFitPrepare(el){
  if(!el||el.nodeType!==1)return;
  var cls=' '+String(el.className||'')+' ';
  if(cls.indexOf(' empty ')>=0)return;
  var stks=el.querySelectorAll?el.querySelectorAll('.p-chord-stk'):null;
  var hosts=[],i;
  if(stks&&stks.length){ for(i=0;i<stks.length;i++)hosts.push(stks[i]); }
  else hosts.push(el);
  for(i=0;i<hosts.length;i++){
    var chip=hosts[i].querySelector?hosts[i].querySelector('.chord-chip'):null;
    chordFitSplitOne(chip||hosts[i]);
  }
}
/* 量一个元素里「真正画出来的墨迹」左右边界。
   .p-chord 是零宽盒子，量盒子恒为 0，必须用 Range。 */
function chordFitInk(el){
  var rg=document.createRange();
  rg.selectNodeContents(el);
  var r=rg.getBoundingClientRect();
  return { L:r.left, R:r.right, w:r.width };
}
/* 这一列的歌词是不是空的（所有歌词行都只有 @ / 空白） */
function chordFitSlotBlank(col){
  var ls=col.querySelectorAll('.p-lyric'),i;
  if(!ls.length)return true;
  for(i=0;i<ls.length;i++){ if(!chordFitIsBlank(ls[i].textContent||''))return false; }
  return true;
}
/* 给一行里「连续 >=CHORD_FIT_EMPTY_RUN 个空歌词音位」的那几段打 cf-tight。
   小节线列不算音位：既不打断连续，也不参与收紧。 */
function chordFitMarkTightRuns(cols){
  var run=[],i,j;
  function flush(){
    if(run.length>=CHORD_FIT_EMPTY_RUN){
      for(j=0;j<run.length;j++)run[j].classList.add('cf-tight');
    }
    run=[];
  }
  for(i=0;i<cols.length;i++){
    if(cols[i].classList.contains('p-barslot'))continue;
    if(chordFitSlotBlank(cols[i]))run.push(cols[i]);
    else flush();
  }
  flush();
}
/* 幂等还原：清掉上一轮写的所有东西 */
function layoutStrictChordsClear(scope){
  if(!scope||!scope.querySelectorAll)return;
  var a=scope.querySelectorAll('[data-cfgap]'),i;
  for(i=0;i<a.length;i++){
    a[i].style.paddingLeft='';
    a[i].style.paddingRight='';
    a[i].removeAttribute('data-cfgap');
  }
  var m=scope.querySelectorAll('.p-chord-mid');
  for(i=0;i<m.length;i++)m[i].classList.remove('p-chord-mid');
  var n=scope.querySelectorAll('.cf-tight');
  for(i=0;i<n.length;i++)n[i].classList.remove('cf-tight');
}
/* 一行：（可选的）空歌词收紧 + 定对中模式 + 只在真会撞时局部加距离。返回是否动过布局。
   allowTight 省略视为 false —— 收紧要不要做由整首那一层判断，单行调用不擅自收。 */
function layoutStrictChords(row,allowTight){
  if(!row||!row.querySelectorAll)return false;
  var all=row.querySelectorAll('.prev-seg.p-slot');
  if(!all.length)return false;
  var cols=[],i;
  for(i=0;i<all.length;i++)cols.push(all[i]);

  var prevDisp=row.style.display;
  row.style.display='inline-flex';        /* 摊到自然宽再量，免得被容器挤扁量歪 */

  /* 音位序号（小节线/拍号列不算音位） */
  var slotNo=[],sn=0;
  for(i=0;i<cols.length;i++){
    slotNo.push(cols[i].classList.contains('p-barslot')?-1:sn++);
  }
  /* 先收紧「连续空歌词」的那几段：它改列宽，必须排在下面的量之前。
     allowTight 由 layoutStrictChordsAll 按「这行够不够长」给，不长就不收。 */
  if(allowTight)chordFitMarkTightRuns(cols);

  var items=[];
  for(i=0;i<cols.length;i++){
    var ch=cols[i].querySelector('.p-chord');
    if(!ch)continue;
    if((' '+String(ch.className||'')+' ').indexOf(' empty ')>=0)continue;
    if(chordFitIsBlank(ch.textContent||''))continue;
    items.push({col:cols[i],slot:slotNo[i],ch:ch});
  }
  /* 紧邻下一个音位就有和弦 -> 这个和弦退回老版整段整体对中 */
  for(i=0;i<items.length-1;i++){
    if(items[i].slot>=0&&items[i+1].slot-items[i].slot===1){
      items[i].ch.classList.add('p-chord-mid');
    }
  }
  var changed=false,prevR=null,m,need,host,base;
  for(i=0;i<items.length;i++){
    m=chordFitInk(items[i].ch);
    if(prevR!==null&&m.L<prevR+CHORD_FIT_GAP){
      need=prevR+CHORD_FIT_GAP-m.L;
      /* 推前一列的右内边距：本列连同后面所有音位一起右移，音位之间的基础间距不变。
         没有前一列(行首/volta 首列)就推自己的左内边距，效果一样。 */
      host=items[i].col.previousElementSibling;
      if(host&&host.style){
        base=parseFloat(host.style.paddingRight)||0;
        host.style.paddingRight=(base+need).toFixed(2)+'px';
        host.setAttribute('data-cfgap','1');
      }else{
        host=items[i].col;
        base=parseFloat(host.style.paddingLeft)||0;
        host.style.paddingLeft=(base+need).toFixed(2)+'px';
        host.setAttribute('data-cfgap','1');
      }
      changed=true;
      m=chordFitInk(items[i].ch);
    }
    prevR=m.R;
  }
  /* 行首/行尾溢出兜底：让整行的盒子把和弦墨迹整个包住，
     否则 justify 量不到、导出/投影会被裁掉。 */
  if(items.length){
    var rr=row.getBoundingClientRect();
    var over=chordFitInk(items[items.length-1].ch).R-rr.right;
    if(over>0.5){
      host=cols[cols.length-1];
      base=parseFloat(host.style.paddingRight)||0;
      host.style.paddingRight=(base+over).toFixed(2)+'px';
      host.setAttribute('data-cfgap','1');
      changed=true;
    }
    var under=rr.left-chordFitInk(items[0].ch).L;
    if(under>0.5){
      host=cols[0];
      base=parseFloat(host.style.paddingLeft)||0;
      host.style.paddingLeft=(base+under).toFixed(2)+'px';
      host.setAttribute('data-cfgap','1');
      changed=true;
    }
  }
  row.style.display=prevDisp;
  return changed;
}
/* 整首：逐行做「连续空歌词收紧 + 和弦避让」。
   非严格模式(没有 .p-slot)全程 no-op。 */
function layoutStrictChordsAll(scope){
  if(!scope||!scope.querySelectorAll)return false;
  var list=scope.querySelectorAll('.prev-row'),rows=[],i;
  for(i=0;i<list.length;i++){ if(list[i].querySelector('.prev-seg.p-slot'))rows.push(list[i]); }
  if(!rows.length)return false;
  layoutStrictChordsClear(scope);

  /* 先量各行的自然宽（此时还没加任何收紧/避让），用来判断哪些行「确实长」。
     只有拖着整首谱缩小的那些行才值得收紧；位置够的行收了白收，只会显得局促。 */
  var widths=[],maxW=0,prevDisp,w;
  for(i=0;i<rows.length;i++){
    prevDisp=rows[i].style.display;
    rows[i].style.display='inline-flex';
    w=rows[i].offsetWidth;
    rows[i].style.display=prevDisp;
    widths.push(w);
    if(w>maxW)maxW=w;
  }
  var changed=false,longEnough;
  for(i=0;i<rows.length;i++){
    longEnough=(maxW>0&&widths[i]>=maxW*CHORD_FIT_LONG_ROW);
    if(layoutStrictChords(rows[i],longEnough))changed=true;
  }
  return changed;
}
/* 本块要求的 CSS（三个宿主各自带前缀注入，规则文字保持一致）：

  .prev-seg.p-slot .p-chord{min-width:0;width:0;overflow:visible;white-space:pre;
    display:flex;flex-direction:row;justify-content:center;align-items:flex-end;
    font-size:16px;min-height:17px;}
    -- 字号 16px 是严格模式专属（基础 .p-chord 仍是 12px，老格式歌不受影响）。
       和弦零宽之后放大不再撑开列宽，实测 12/14/15/16px 行自然宽恒为同一值，
       代价只是碰撞避让多一两处。用户 2026-08-15 选的 +4。
  .prev-seg.p-slot .p-chord > *{flex:0 0 auto;}
    -- 这条必须有：musiclib 有全局 reset #music-library *{min-width:0}，
       零宽 flex 容器里的 .chord-chip 会被 flex-shrink 压成 0 宽，
       和弦就贴到音符中心右边而不是对中。
  .prev-seg.p-slot .p-chord.p-chord-multi{flex-direction:column;align-items:center;justify-content:flex-end;}
  .prev-seg.p-slot .p-chord .p-chord-head{white-space:pre;}
  .prev-seg.p-slot .p-chord .p-chord-tail{display:inline-block;width:0;min-width:0;overflow:visible;white-space:pre;}
  .prev-seg.p-slot .p-chord.p-chord-mid .p-chord-tail{width:auto;}
  .prev-seg.p-slot.cf-tight{margin-left:0;margin-right:0;min-width:14.4px;}
  .prev-seg.p-slot:has(.jp-aug){margin-right:11px;}
  .prev-seg.p-slot.cf-tight[data-bb]{margin-right:8px;}
    -- 断梁的「断口」就是两列之间的空隙（connectStrictBeams 遇到 data-bb 不连梁）。
       cf-tight 把 margin 归零之后断口跟着变 0，断梁等于白写 —— 前奏/间奏这种
       没歌词的行首当其冲。实测有歌词 8px、收紧后 0px。这条把断口捞回来。
    -- 附点 .jp-aug 是零宽绝对定位(right:-5px)，会贴到下一个音符上（实测间隙
       只剩 3.6px，而正常音符之间是 16.5px），分不清点属于哪个音；给带附点的
       音位补出间距。特异度 (0,4,0) 高于 cf-tight，所以收紧段里也保得住。
    -- 连续 >=4 个空歌词音位的那一段：横向占位收紧约三成（外边距 2px->0、最小列宽 1.2em->0.9em）。
*/
/* ═══════════ CECP-CHORD-FIT v1 END ═══════════ */
/* justifyRows 开关：youth 显式开启（行右端与最宽行对齐） */
var YE_JUSTIFY_ROWS=true;

/* ═══════════ CECP-LYRIC-HL v2 BEGIN ═══════════
   共享模块：歌词荧光笔标记（本地持久化，仅歌词行可标记）。
   本块在以下两个文件中逐字节相同（权威版本 = shared/lyric-hl.js）：
     musiclib/musiclib.js / youth-engine.js
   （本期不含 musictool.js，但仍遵守共享块「禁止反斜杠」约定，
   转义一律用 String.fromCharCode，便于未来同步。）
   修改流程：先改 shared/lyric-hl.js，再同步两处，diff 校验一致。

   v2 相对 v1 的变化（2026-07-10，解决"整段文字只能整体标记，标记之间
   有断开、空拍标记不了"的反馈）：
   - 标记最小单位从「一个 .p-lyric 元素」下沉到「.p-lyric 内的一个字符/
     一个占位间隙」，逐字符可点、可标记，包括歌词内本身的排版占位空格。
   - 完全没有歌词文字的 .p-lyric（休止/空拍格子）会补一个占位标记单元，
     使其也能被点亮，保持整句高亮跨越空拍时视觉连续。
   - 同一行内相邻且同色的标记单元，只在整段的最左/最右两端保留圆角，
     中间彼此方角拼接，形成一整条扁平色带，而不是逐字各自一个小圆点。
   - 新增独立「橡皮擦」：不再依赖"用当前画笔色重新涂一遍来切换擦除"
     这种隐式规则，橡皮擦作为调色板里独立的一项，选中后笔画擦除任意
     颜色的标记。
   - 存储坐标从 4 元组 [行,段,歌词行,颜色] 升级为 5 元组
     [行,段,歌词行,字符号,颜色]，版本号从 v:1 升到 v:2；旧版 v1 数据
     不兼容新坐标体系，加载时直接忽略（相当于一次性清空旧标记，
     属已知、可接受的一次性代价，不做迁移）。

   设计要点（延续 v1）：
   - 只有 .p-lyric（含 lyric2/3/4，均带 .p-lyric 类）可被标记；
     .p-chord / .p-n 不参与。
   - 标记直接写在元素上（data-hl 属性 + 注入 CSS 背景色），是真实
     DOM 样式，html2canvas 导出自动带上；导出前另有
     lyricHlPrepareExport 把颜色内联成白底可辨的实色。
   - 存储用 localStorage，键 cecp-lyric-hl:<songId>，值为内容坐标，
     与 DOM 实例无关；每次 renderScore 重建 DOM 后由宿主调用
     lyricHlApply 重放（同时负责给新渲染出的 .p-lyric 逐字符打标记
     单元），坐标越界的标记静默忽略。
   - 手势冲突：默认关闭标记模式，歌词区滚动不受影响；开启后在根节点
     上 pointer capture + touch-action:none，滑动只画不滚。 */
var LYRIC_HL_COLORS=[
  {name:'yellow',solid:'#FFE45E',dark:'rgba(255,228,94,0.34)'},
  {name:'green',solid:'#A9E886',dark:'rgba(169,232,134,0.32)'},
  {name:'pink',solid:'#FFAFC9',dark:'rgba(255,175,201,0.34)'},
  {name:'blue',solid:'#9FD3FF',dark:'rgba(159,211,255,0.34)'},
  {name:'orange',solid:'#FFC98A',dark:'rgba(255,201,138,0.34)'}
];
var LYRIC_HL_PREFIX='cecp-lyric-hl:';
var LYRIC_HL_PEN_KEY='cecp-lyric-hl-pen';
function lyricHlLoad(songId){
  try{
    var raw=localStorage.getItem(LYRIC_HL_PREFIX+String(songId||''));
    if(!raw)return [];
    var data=JSON.parse(raw);
    if(!data||data.v!==2)return []; /* v1 坐标体系不兼容，直接忽略 */
    return Object.prototype.toString.call(data.marks)==='[object Array]'?data.marks:[];
  }catch(_){return [];}
}
function lyricHlSave(songId,marks){
  try{
    var key=LYRIC_HL_PREFIX+String(songId||'');
    if(marks&&marks.length)localStorage.setItem(key,JSON.stringify({v:2,marks:marks}));
    else localStorage.removeItem(key);
  }catch(_){}
}
function lyricHlEnsureCss(){
  if(typeof document==='undefined'||!document.head)return;
  if(document.getElementById('cecp-lyric-hl-style'))return;
  var st=document.createElement('style');
  st.id='cecp-lyric-hl-style';
  /* 圆角只挂在「整段连续同色的最左/最右单元」上（由 lyricHlRefreshRuns
     计算并打上 hl-edge-l/hl-edge-r），中间单元维持方角，拼接起来是
     一整条扁平色带，而不是逐字各自一颗药丸。 */
  var base=
    '.lyric-hl-ch[data-hl].hl-edge-l{border-top-left-radius:3px;border-bottom-left-radius:3px;}'+
    '.lyric-hl-ch[data-hl].hl-edge-r{border-top-right-radius:3px;border-bottom-right-radius:3px;}',
    i;
  var light='',dark='';
  for(i=0;i<LYRIC_HL_COLORS.length;i++){
    light+='.lyric-hl-ch[data-hl="'+i+'"]{background-color:'+LYRIC_HL_COLORS[i].solid+';}';
    dark+='.lyric-hl-ch[data-hl="'+i+'"]{background-color:'+LYRIC_HL_COLORS[i].dark+';}';
  }
  var darkAttr=dark.split('.lyric-hl-ch[').join('html[data-resolved-theme="dark"] .lyric-hl-ch[');
  var darkAuto=dark.split('.lyric-hl-ch[').join('html:not([data-resolved-theme="light"]) .lyric-hl-ch[');
  st.textContent=
    base+light+darkAttr+
    '@media (prefers-color-scheme: dark){'+darkAuto+'}'+
    '.lyric-hl-marking{touch-action:none;-webkit-user-select:none;user-select:none;}'+
    '.lyric-hl-marking .lyric-hl-ch{cursor:crosshair;}';
  document.head.appendChild(st);
}
/* 给一个 .p-lyric 元素补上逐字符可标记单元（.lyric-hl-ch），只处理一次。
   - 普通字符文本节点：拆成一个字符一个 <span class="lyric-hl-ch">。
   - 已有的占位间隙元素（.lyric-gap，来自 {sp}/半角空格排版补偿）：
     本身已是独立元素，直接加标记类即可，不拆分其内部结构（避免破坏
     既有的定宽/兜底字符逻辑）。
   - 完全没有任何字符的空歌词（休止/空拍格子）：补一个不可见占位单元，
     使其也能被点亮标记，保持整句高亮跨越空拍时的视觉连续。 */
function lyricHlDecorate(lyricEl){
  if(!lyricEl||lyricEl.getAttribute('data-hl-decorated'))return;
  lyricEl.setAttribute('data-hl-decorated','1');
  var gapEls=lyricEl.querySelectorAll('.lyric-gap');
  for(var g=0;g<gapEls.length;g++)gapEls[g].classList.add('lyric-hl-ch');
  var walker=document.createTreeWalker(lyricEl,NodeFilter.SHOW_TEXT,{
    acceptNode:function(node){
      return (node.parentElement&&node.parentElement.closest('.lyric-gap'))
        ?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
    }
  });
  var textNodes=[],n;
  while((n=walker.nextNode()))textNodes.push(n);
  for(var t=0;t<textNodes.length;t++){
    var tn=textNodes[t],raw=tn.nodeValue||'',frag=document.createDocumentFragment();
    for(var c=0;c<raw.length;c++){
      var sp=document.createElement('span');
      sp.className='lyric-hl-ch';
      sp.textContent=raw[c];
      frag.appendChild(sp);
    }
    tn.parentNode.replaceChild(frag,tn);
  }
  if(!lyricEl.querySelector('.lyric-hl-ch')){
    var ph=document.createElement('span');
    ph.className='lyric-hl-ch lyric-hl-empty';
    ph.textContent=' ';
    lyricEl.appendChild(ph);
  }
  var units=lyricEl.querySelectorAll('.lyric-hl-ch');
  for(var u=0;u<units.length;u++)units[u].setAttribute('data-hl-i',String(u));
}
/* 标记单元 -> 内容坐标 {row,seg,line,ci}；不属于歌词区时返回 null */
function lyricHlCoordOf(root,el){
  if(!el||!el.closest)return null;
  var unit=el.closest('.lyric-hl-ch');
  if(!unit||!root.contains(unit))return null;
  var lyric=unit.closest('.p-lyric');
  if(!lyric)return null;
  var row=lyric.closest('.sw-lrow');
  var seg=lyric.closest('.prev-seg');
  if(!row||!seg)return null;
  var r=Array.prototype.indexOf.call(root.querySelectorAll('.sw-lrow'),row);
  var sIdx=Array.prototype.indexOf.call(row.querySelectorAll('.prev-seg'),seg);
  var lIdx=Array.prototype.indexOf.call(seg.querySelectorAll('.p-lyric'),lyric);
  var ci=parseInt(unit.getAttribute('data-hl-i'),10);
  if(r<0||sIdx<0||lIdx<0||!(ci>=0))return null;
  return {row:r,seg:sIdx,line:lIdx,ci:ci,el:unit};
}
/* 内容坐标 -> 当前 DOM 节点；越界返回 null（内容被编辑过的兜底） */
function lyricHlNodeAt(root,row,seg,line,ci){
  var rows=root.querySelectorAll('.sw-lrow');
  if(row<0||row>=rows.length)return null;
  var segs=rows[row].querySelectorAll('.prev-seg');
  if(seg<0||seg>=segs.length)return null;
  var lyrics=segs[seg].querySelectorAll('.p-lyric');
  if(line<0||line>=lyrics.length)return null;
  var units=lyrics[line].querySelectorAll('.lyric-hl-ch');
  if(ci<0||ci>=units.length)return null;
  return units[ci];
}
/* 对一整行内某个「歌词行号」(line) 的所有标记单元，按 DOM 顺序（即
   跨 seg 从左到右）重新计算连续同色段的起止边界。只在段首/段尾保留
   圆角，中间方角，视觉上拼成一整条扁平色带。 */
function lyricHlRefreshRunsForRow(rowEl){
  var segs=rowEl.querySelectorAll('.prev-seg');
  var byLine={};
  for(var s=0;s<segs.length;s++){
    var lyrics=segs[s].querySelectorAll('.p-lyric');
    for(var l=0;l<lyrics.length;l++){
      var units=lyrics[l].querySelectorAll('.lyric-hl-ch');
      (byLine[l]||(byLine[l]=[])).push.apply(byLine[l],Array.prototype.slice.call(units));
    }
  }
  Object.keys(byLine).forEach(function(l){
    var units=byLine[l],prevColor=null;
    for(var i=0;i<units.length;i++){
      var u=units[i],c=u.getAttribute('data-hl');
      var nextColor=(i+1<units.length)?units[i+1].getAttribute('data-hl'):null;
      u.classList.toggle('hl-edge-l',c!=null&&c!==prevColor);
      u.classList.toggle('hl-edge-r',c!=null&&c!==nextColor);
      prevColor=c;
    }
  });
}
function lyricHlRefreshRuns(root,rowEl){
  if(rowEl){lyricHlRefreshRunsForRow(rowEl);return;}
  Array.prototype.forEach.call(root.querySelectorAll('.sw-lrow'),lyricHlRefreshRunsForRow);
}
/* 渲染完成后重放：给这次新渲染的 .p-lyric 打上逐字符标记单元，
   清掉旧标记属性，再按存储坐标重新打上，最后计算连续色块边界。 */
function lyricHlApply(root,songId){
  if(!root||!root.querySelectorAll)return;
  lyricHlEnsureCss();
  Array.prototype.forEach.call(root.querySelectorAll('.p-lyric'),lyricHlDecorate);
  Array.prototype.forEach.call(root.querySelectorAll('.lyric-hl-ch[data-hl]'),function(el){
    el.removeAttribute('data-hl');
  });
  var marks=lyricHlLoad(songId);
  for(var i=0;i<marks.length;i++){
    var m=marks[i];
    if(!m||m.length<5)continue;
    var c=m[4];
    if(!(c>=0&&c<LYRIC_HL_COLORS.length))continue;
    var el=lyricHlNodeAt(root,m[0],m[1],m[2],m[3]);
    if(el)el.setAttribute('data-hl',String(c));
  }
  lyricHlRefreshRuns(root);
}
/* 更新一处标记：colorIdx 为 null 时表示擦除 */
function lyricHlSet(root,songId,coord,colorIdx){
  var marks=lyricHlLoad(songId),out=[],found=false,i;
  for(i=0;i<marks.length;i++){
    var m=marks[i];
    if(m&&m[0]===coord.row&&m[1]===coord.seg&&m[2]===coord.line&&m[3]===coord.ci){
      found=true;
      if(colorIdx!=null)out.push([coord.row,coord.seg,coord.line,coord.ci,colorIdx]);
    }else out.push(m);
  }
  if(!found&&colorIdx!=null)out.push([coord.row,coord.seg,coord.line,coord.ci,colorIdx]);
  lyricHlSave(songId,out);
  if(coord.el){
    if(colorIdx!=null)coord.el.setAttribute('data-hl',String(colorIdx));
    else coord.el.removeAttribute('data-hl');
  }
  var row=coord.el&&coord.el.closest?coord.el.closest('.sw-lrow'):null;
  if(row)lyricHlRefreshRuns(root,row);
}
/* 导出前调用：把标记颜色内联成白底可辨的实色（live 深色模式的半透明
   变体在纯白导出底上会太淡），边缘圆角也一并内联，保证优先级高于
   导出置黑逻辑，且不依赖 html2canvas 对属性选择器 CSS 的支持程度。 */
function lyricHlPrepareExport(scope){
  if(!scope||!scope.querySelectorAll)return;
  Array.prototype.forEach.call(scope.querySelectorAll('.lyric-hl-ch[data-hl]'),function(el){
    var idx=parseInt(el.getAttribute('data-hl'),10);
    if(!(idx>=0&&idx<LYRIC_HL_COLORS.length))return;
    el.style.setProperty('background-color',LYRIC_HL_COLORS[idx].solid,'important');
    if(el.classList.contains('hl-edge-l')){
      el.style.setProperty('border-top-left-radius','3px');
      el.style.setProperty('border-bottom-left-radius','3px');
    }
    if(el.classList.contains('hl-edge-r')){
      el.style.setProperty('border-top-right-radius','3px');
      el.style.setProperty('border-bottom-right-radius','3px');
    }
  });
}
/* 荧光笔控制条：笔开关 + 5 色 + 橡皮擦 + 清空。宿主把返回的元素插进
   工具行，并在每次 renderScore 末尾调用 lyricHlApply。root = 歌词区
   根节点（innerHTML 会被重建但节点本身持久），getSongId 惰性取歌曲 id。
   colorIdx 语义：0~4 = 对应颜色画笔，-1 = 橡皮擦（擦除任意颜色的标记，
   不要求笔画起点当前颜色与被擦除的标记颜色一致）。 */
function lyricHlCreateController(root,getSongId){
  lyricHlEnsureCss();
  var active=false;
  var colorIdx=0;
  try{
    var savedPen=parseInt(localStorage.getItem(LYRIC_HL_PEN_KEY),10);
    if(savedPen===-1||(savedPen>=0&&savedPen<LYRIC_HL_COLORS.length))colorIdx=savedPen;
  }catch(_){}
  var wrap=document.createElement('span');
  wrap.className='lyric-hl-ctrl';
  wrap.style.cssText='display:inline-flex;align-items:center;gap:6px;vertical-align:middle;';
  var pen=document.createElement('button');
  pen.type='button';
  pen.setAttribute('aria-label','歌词荧光笔');
  pen.textContent=String.fromCharCode(0xD83D,0xDD8D);
  pen.style.cssText='cursor:pointer;font-size:15px;line-height:1;min-height:36px;padding:0 12px;border-radius:11px;border:1px solid rgba(128,128,128,0.35);background:transparent;display:inline-flex;align-items:center;transition:background .15s,border-color .15s;';
  var palette=document.createElement('span');
  palette.style.cssText='display:none;align-items:center;gap:5px;';
  var dots=[];
  function refreshDots(){
    for(var i=0;i<dots.length;i++){
      var on=(i===colorIdx);
      dots[i].style.boxShadow=on?'0 0 0 2px rgba(128,128,128,0.9)':'none';
      dots[i].style.transform=on?'scale(1.15)':'none';
    }
    var eraserOn=(colorIdx===-1);
    eraserDot.style.boxShadow=eraserOn?'0 0 0 2px rgba(128,128,128,0.9)':'none';
    eraserDot.style.transform=eraserOn?'scale(1.15)':'none';
  }
  LYRIC_HL_COLORS.forEach(function(c,i){
    var d=document.createElement('button');
    d.type='button';
    d.setAttribute('aria-label','荧光笔颜色 '+c.name);
    d.style.cssText='cursor:pointer;width:16px;height:16px;border-radius:50%;border:1px solid rgba(0,0,0,0.18);padding:0;background:'+c.solid+';transition:transform .12s ease;';
    d.addEventListener('click',function(ev){
      ev.stopPropagation();
      colorIdx=i;
      try{localStorage.setItem(LYRIC_HL_PEN_KEY,String(i));}catch(_){}
      refreshDots();
    });
    dots.push(d);
    palette.appendChild(d);
  });
  /* 橡皮擦：画一个真实的斜切橡皮擦形状（粉红色块 + 顶部高光棱边），
     一眼可辨认，不再和颜色圆点混淆；独立于当前画笔色。 */
  var eraserDot=document.createElement('button');
  eraserDot.type='button';
  eraserDot.setAttribute('aria-label','橡皮擦');
  eraserDot.style.cssText='cursor:pointer;width:20px;height:20px;border-radius:5px;border:none;padding:0;background:transparent;display:inline-flex;align-items:center;justify-content:center;transition:transform .12s ease;';
  eraserDot.innerHTML=
    '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">'+
      '<g transform="rotate(-28 12 12)">'+
        '<rect x="4" y="8" width="16" height="10" rx="2.2" fill="#F0899E" stroke="#B84D63" stroke-width="1.1"/>'+
        '<path d="M4.6 12h14.8" stroke="#B84D63" stroke-width="1.1"/>'+
        '<rect x="4" y="8" width="16" height="4" rx="2" fill="#FBD3DC"/>'+
      '</g>'+
    '</svg>';
  eraserDot.addEventListener('click',function(ev){
    ev.stopPropagation();
    colorIdx=-1;
    try{localStorage.setItem(LYRIC_HL_PEN_KEY,String(colorIdx));}catch(_){}
    refreshDots();
  });
  palette.appendChild(eraserDot);
  var clearBtn=document.createElement('button');
  clearBtn.type='button';
  clearBtn.textContent='清空';
  clearBtn.setAttribute('aria-label','清空本歌全部标记');
  clearBtn.style.cssText='cursor:pointer;font-size:11px;font-weight:700;line-height:1;min-height:30px;padding:0 10px;border-radius:9px;border:1px solid rgba(128,128,128,0.35);background:transparent;color:inherit;display:inline-flex;align-items:center;';
  clearBtn.addEventListener('click',function(ev){
    ev.stopPropagation();
    lyricHlSave(getSongId(),[]);
    lyricHlApply(root,getSongId());
  });
  palette.appendChild(clearBtn);
  wrap.appendChild(pen);
  wrap.appendChild(palette);
  function setActive(on){
    active=!!on;
    pen.style.background=active?'rgba(128,128,128,0.22)':'transparent';
    pen.style.borderColor=active?'rgba(128,128,128,0.7)':'rgba(128,128,128,0.35)';
    palette.style.display=active?'inline-flex':'none';
    if(root&&root.classList){
      if(active)root.classList.add('lyric-hl-marking');
      else root.classList.remove('lyric-hl-marking');
    }
    refreshDots();
  }
  pen.addEventListener('click',function(ev){
    ev.stopPropagation();
    setActive(!active);
  });
  /* 笔迹手势：开启时 pointer capture，滑过的字符逐个上色/擦除。
     colorIdx===-1（橡皮擦）时无视被划过单元当前是什么颜色，一律擦除。 */
  var stroke=null;
  function strokeApply(target){
    var coord=lyricHlCoordOf(root,target);
    if(!coord)return;
    var k=coord.row+'_'+coord.seg+'_'+coord.line+'_'+coord.ci;
    if(stroke.seen[k])return;
    stroke.seen[k]=true;
    lyricHlSet(root,getSongId(),coord,colorIdx===-1?null:colorIdx);
  }
  root.addEventListener('pointerdown',function(e){
    if(!active)return;
    var coord=lyricHlCoordOf(root,e.target);
    if(!coord)return;
    e.preventDefault();
    try{root.setPointerCapture(e.pointerId);}catch(_){}
    stroke={seen:{}};
    strokeApply(e.target);
  });
  root.addEventListener('pointermove',function(e){
    if(!active||!stroke)return;
    e.preventDefault();
    var t=document.elementFromPoint(e.clientX,e.clientY);
    if(t)strokeApply(t);
  });
  function endStroke(e){
    if(!stroke)return;
    stroke=null;
    try{root.releasePointerCapture(e.pointerId);}catch(_){}
  }
  root.addEventListener('pointerup',endStroke);
  root.addEventListener('pointercancel',endStroke);
  refreshDots();
  return wrap;
}
/* ═══════════ CECP-LYRIC-HL v2 END ═══════════ */

/* ═══════════ CECP-CHORD-ENGINE v1 BEGIN ═══════════
   共享模块：和弦浏览器引擎（Chord Explorer）。
   点击歌词区 .p-chord 弹出底部面板：组成音 / 钢琴键盘 / 吉他把位 / 试听。

   本块在以下两个文件中逐字节相同（权威版本 = shared/chord-engine.js）：
     musiclib/musiclib.js / youth-engine.js
   修改流程：先改 shared/chord-engine.js，再同步两处，diff 校验一致。
   （本块不同步进 musictool.js，因此不受「块内禁止反斜杠」限制。）

   宿主依赖（两个宿主文件在本块之前的同一作用域内均已定义，逐字节同名）：
     parseKeyName(key)            -> {root,suf}
     needFlat(root,suf)           -> boolean（根据根音/大小调决定升降号拼写）
     trKeyName(key,st,useFlat)    -> 移调后的音名（宿主移调功能同款拼写规则）
     KEY_SET_SHARP                -> 12 个升号拼写音名表
   本引擎不自带任何升降号拼写规则，全部委托给以上宿主函数，
   保证弹出面板里的音名与移调功能显示的拼写完全一致。

   对外暴露：
     window.ChordEngine.open('G#m')     编程式打开面板
     window.ChordEngine.parseChord(sym) 解析和弦 -> ChordDefinition
     window.ChordEngine.getChord(sym)   解析 + 吉他把位（带缓存）
     <chord-explorer> / <chord-piano> / <chord-guitar-diagram> 自定义元素
   纯逻辑层（解析/乐理/把位/Store）不依赖 DOM，可在 Node 中单测。 */
var ChordEngine=(function(){
  'use strict';

  var VERSION='1.0.0';

  /* ───────────────────────── 常量 ─────────────────────────
     颜色不写死在绘图代码里：先读宿主 CSS 变量，读不到时用下面的回退色。
     语义色三档：root（根音，复用宿主 --accent）/ third（三音）/ ext（五音与延伸音）。 */
  var FALLBACK_LIGHT={
    bg:'#FFFDF9',bg2:'#F8F1E8',bg3:'#F3E8DC',
    text:'#241C17',text2:'#6F655D',text3:'#9A8F85',
    border:'#E9E0D8',borderMd:'rgba(87,63,45,.18)',
    accent:'#C76524',accentSoft:'#F8E7D8',
    third:'#3E6E9E',ext:'#5E8A55',
    keyWhite:'#FFFEFB',keyWhiteEdge:'#DCD2C6',keyBlack:'#2A2118'
  };
  var FALLBACK_DARK={
    bg:'#18201C',bg2:'#202A25',bg3:'#25312B',
    text:'#F5F1EA',text2:'#BCC4BF',text3:'#89948E',
    border:'rgba(255,255,255,.10)',borderMd:'rgba(255,255,255,.16)',
    accent:'#D77A38',accentSoft:'rgba(215,122,56,.20)',
    third:'#82AFD6',ext:'#96BE8C',
    keyWhite:'#EDE8DE',keyWhiteEdge:'#4A453C',keyBlack:'#12100C'
  };
  /* 吉他标准调弦（低音弦 -> 高音弦）的音级与 MIDI 音高 */
  var GUITAR_STRING_PC=[4,9,2,7,11,4];
  var GUITAR_STRING_MIDI=[40,45,50,55,59,64];
  /* 试听参数 */
  var STRUM_STAGGER_MS=48;      /* 吉他扫弦相邻弦触发间隔 */
  var PIANO_NOTE_SECONDS=1.9;   /* 钢琴音衰减时长 */
  var GUITAR_NOTE_SECONDS=1.5;  /* 吉他音衰减时长 */
  var FLASH_MS=420;             /* 按键/指法点按下反馈时长 */

  /* ───────────────────────── 极简 Store ─────────────────────────
     零依赖发布-订阅状态容器，供 <chord-explorer> 内部使用。 */

  /**
   * 创建一个极简 Store。
   * @param {Object} initialState 初始状态
   * @returns {{getState:function():Object, setState:function(Object):void, subscribe:function(Function):Function}}
   *   setState 做浅合并并通知订阅者；subscribe 返回取消订阅函数。
   */
  function createStore(initialState){
    var state=Object.assign({},initialState||{});
    var listeners=[];
    return {
      getState:function(){return state;},
      setState:function(partial){
        state=Object.assign({},state,partial||{});
        for(var i=0;i<listeners.length;i++){try{listeners[i](state);}catch(e){}}
      },
      subscribe:function(fn){
        listeners.push(fn);
        return function(){
          var i=listeners.indexOf(fn);
          if(i>=0)listeners.splice(i,1);
        };
      }
    };
  }

  /* ───────────────────────── 乐理层 ─────────────────────────
     宿主已有 trKeyName 等函数只处理「根音本身」的移调拼写；
     本层在其之上补充「由音程算出完整组成音列表」。 */

  /**
   * 求音名的音级（pitch class，0=C ... 11=B）。
   * 拼写委托宿主：先用 trKeyName 归一成升号拼写，再查 KEY_SET_SHARP。
   * @param {string} note 音名（如 'Ab'、'F#'）
   * @returns {number} 0~11；无法识别返回 -1
   */
  function pcOf(note){
    var parsed=parseKeyName(String(note||'').trim());
    var sharp=parseKeyName(trKeyName(parsed.root,0,false)).root;
    return KEY_SET_SHARP.indexOf(sharp);
  }

  /**
   * 根音整体的升降号偏好：
   * 写明升/降号的根音以用户看到的为准；自然音级根音沿用宿主 needFlat 规则。
   * @param {string} root 根音
   * @param {string} qualityId 性质 id（needFlat 靠它判断大小调）
   * @returns {boolean} true=偏好降号拼写
   */
  function rootPrefersFlat(root,qualityId){
    if(root.indexOf('b')>0)return true;
    if(root.indexOf('#')>0)return false;
    return needFlat(root,qualityId);
  }

  /**
   * 拼写某个组成音。
   * 降变度数（b3/b5/b7/b9…）强制降号、升变度数（#5/#9…）强制升号，
   * 自然度数跟随根音偏好——这样 C7 得到 Bb 而不是 A#，E 大三和弦得到 G#。
   * @param {string} root 根音
   * @param {number} interval 距根音的半音数
   * @param {string} degree 度数标签（'R'/'3'/'b7'/'#9'…）
   * @param {boolean} rootFlat 根音整体偏好
   * @returns {string} 音名
   */
  function spellChordTone(root,interval,degree,rootFlat){
    var flat=rootFlat;
    if(degree.indexOf('b')>=0)flat=true;
    else if(degree.indexOf('#')>=0)flat=false;
    return parseKeyName(trKeyName(root,interval,flat)).root;
  }

  /* 度数 -> 语义角色：root=根音 / third=三音（含挂留替代音）/ ext=五音与延伸音 */
  function degreeRole(degree){
    if(degree==='R')return 'root';
    if(degree==='3'||degree==='b3'||degree==='2'||degree==='4')return 'third';
    return 'ext';
  }

  /* ───────────────────────── 和弦性质表 ─────────────────────────
     [id, 英文名, 中文名, 音程(半音), 度数标签]。
     音程与度数一一对应；新增性质只需加一行，解析器无需改动。 */
  var QUALITY_ROWS=[
    ['','Major','大三和弦',[0,4,7],['R','3','5']],
    ['m','Minor','小三和弦',[0,3,7],['R','b3','5']],
    ['5','Power Chord','五度和弦',[0,7],['R','5']],
    ['6','Major 6th','大六和弦',[0,4,7,9],['R','3','5','6']],
    ['m6','Minor 6th','小六和弦',[0,3,7,9],['R','b3','5','6']],
    ['69','6/9','六九和弦',[0,4,7,9,14],['R','3','5','6','9']],
    ['7','Dominant 7th','属七和弦',[0,4,7,10],['R','3','5','b7']],
    ['maj7','Major 7th','大七和弦',[0,4,7,11],['R','3','5','7']],
    ['m7','Minor 7th','小七和弦',[0,3,7,10],['R','b3','5','b7']],
    ['mMaj7','Minor-Major 7th','小大七和弦',[0,3,7,11],['R','b3','5','7']],
    ['9','Dominant 9th','属九和弦',[0,4,7,10,14],['R','3','5','b7','9']],
    ['11','Dominant 11th','属十一和弦',[0,4,7,10,14,17],['R','3','5','b7','9','11']],
    ['13','Dominant 13th','属十三和弦',[0,4,7,10,14,21],['R','3','5','b7','9','13']],
    ['sus2','Suspended 2nd','挂二和弦',[0,2,7],['R','2','5']],
    ['sus4','Suspended 4th','挂四和弦',[0,5,7],['R','4','5']],
    ['7sus4','7th Suspended 4th','属七挂四和弦',[0,5,7,10],['R','4','5','b7']],
    ['add9','Added 9th','加九和弦',[0,4,7,14],['R','3','5','9']],
    ['madd9','Minor Added 9th','小加九和弦',[0,3,7,14],['R','b3','5','9']],
    ['dim','Diminished','减三和弦',[0,3,6],['R','b3','b5']],
    ['dim7','Diminished 7th','减七和弦',[0,3,6,9],['R','b3','b5','bb7']],
    ['aug','Augmented','增三和弦',[0,4,8],['R','3','#5']],
    ['aug7','Augmented 7th','增属七和弦',[0,4,8,10],['R','3','#5','b7']],
    ['m7b5','Half-Diminished','半减七和弦',[0,3,6,10],['R','b3','b5','b7']],
    ['7b5','Dominant 7th flat 5','属七降五和弦',[0,4,6,10],['R','3','b5','b7']],
    ['7#9','Dominant 7th sharp 9','属七升九和弦',[0,4,7,10,15],['R','3','5','b7','#9']],
    ['7b9','Dominant 7th flat 9','属七降九和弦',[0,4,7,10,13],['R','3','5','b7','b9']],
    ['maj9','Major 9th','大九和弦',[0,4,7,11,14],['R','3','5','7','9']],
    ['m9','Minor 9th','小九和弦',[0,3,7,10,14],['R','b3','5','b7','9']],
    ['maj13','Major 13th','大十三和弦',[0,4,7,11,14,21],['R','3','5','7','9','13']],
    ['m11','Minor 11th','小十一和弦',[0,3,7,10,14,17],['R','b3','5','b7','9','11']]
  ];
  var QUALITIES={};
  (function(){
    for(var i=0;i<QUALITY_ROWS.length;i++){
      var r=QUALITY_ROWS[i];
      QUALITIES[r[0]]={id:r[0],name:r[1],zh:r[2],intervals:r[3],degrees:r[4]};
    }
  })();

  /* 后缀别名 -> 性质 id。大小写敏感（'M'=大，'m'=小）。 */
  var SUFFIX_ALIASES={
    '':'','maj':'','M':'','major':'',
    'm':'m','min':'m','-':'m','minor':'m',
    '5':'5',
    '6':'6','maj6':'6','M6':'6',
    'm6':'m6','min6':'m6','-6':'m6',
    '69':'69','6/9':'69','6add9':'69',
    '7':'7','dom7':'7',
    'maj7':'maj7','M7':'maj7','Maj7':'maj7','ma7':'maj7','MA7':'maj7',
    'm7':'m7','min7':'m7','-7':'m7',
    'mMaj7':'mMaj7','mmaj7':'mMaj7','mM7':'mMaj7','minmaj7':'mMaj7','mMAJ7':'mMaj7','-maj7':'mMaj7',
    '9':'9','maj9':'maj9','M9':'maj9','m9':'m9','min9':'m9',
    '11':'11','m11':'m11','min11':'m11',
    '13':'13','maj13':'maj13','M13':'maj13',
    'sus':'sus4','sus4':'sus4','sus2':'sus2',
    '7sus4':'7sus4','7sus':'7sus4',
    '2':'add9','add2':'add9','add9':'add9',
    'madd9':'madd9','madd2':'madd9',
    'dim':'dim','o':'dim','°':'dim',
    'dim7':'dim7','o7':'dim7','°7':'dim7',
    'aug':'aug','+':'aug',
    'aug7':'aug7','7#5':'aug7','7+5':'aug7','+7':'aug7',
    'm7b5':'m7b5','ø':'m7b5','ø7':'m7b5','m7-5':'m7b5','min7b5':'m7b5',
    '7b5':'7b5','7-5':'7b5',
    '7#9':'7#9','7+9':'7#9',
    '7b9':'7b9','7-9':'7b9'
  };

  /* ───────────────────────── 解析器 ─────────────────────────
     思路：符号拆成「根音 + 性质后缀 + 斜杠低音」三段；
     后缀经别名表归一到性质 id，性质映射到一组音程；
     再由根音 + 音程 + 宿主拼写函数得到组成音。 */

  var NOTE_ONLY_RE=/^[A-G](?:#|b)?$/;
  var ROOT_SPLIT_RE=/^([A-G](?:#|b)?)(.*)$/;

  /** 清洗和弦文本：统一 ♯/♭ 全角字符、去掉排版占位空白（NBSP/全角空格/谚文填充符）。 */
  function cleanChordText(text){
    return String(text||'')
      .replace(/[♯＃]/g,'#')
      .replace(/♭/g,'b')
      .replace(/[ 　ㅤ]/g,' ')
      .trim();
  }

  /**
   * 解析和弦符号。
   * @param {string} symbol 和弦符号（如 'G#m'、'D/F#'、'Bb13'、'Cmaj7'）
   * @returns {?ChordDefinition} 解析失败返回 null（不抛异常，便于点击时静默忽略非和弦文本）
   *
   * ChordDefinition 结构：
   *   input        原始输入
   *   symbol       归一化符号（根音+性质id[+/低音]）
   *   root/bass    根音 / 斜杠低音（无低音为 null）
   *   rootPc/bassPc 音级
   *   quality      {id,name,zh,intervals,degrees}
   *   notes        [{name,degree,role,pc,midi}] 组成音（不含低音）
   *   bassNote     低音 {name,pc,midi} 或 null
   *   pianoMidis   钢琴试听/高亮用 MIDI 列表（低音在最前）
   */
  function parseChord(symbol){
    var raw=cleanChordText(symbol);
    if(!raw)return null;
    /* 取第一个空白前的记号（歌谱里可能带尾随占位空格） */
    raw=raw.split(/\s+/)[0];
    var m=raw.match(ROOT_SPLIT_RE);
    if(!m)return null;
    var root=m[1],rest=m[2]||'';
    /* 斜杠低音：只有 '/' 后是纯音名才算（避免把 6/9 当低音） */
    var bass=null;
    var slash=rest.lastIndexOf('/');
    if(slash>=0){
      var after=rest.slice(slash+1);
      if(NOTE_ONLY_RE.test(after)){bass=after;rest=rest.slice(0,slash);}
    }
    /* 后缀归一：去掉括号（如 7(#9) -> 7#9），查别名表 */
    var suffix=rest.replace(/[()]/g,'').trim();
    var qid=Object.prototype.hasOwnProperty.call(SUFFIX_ALIASES,suffix)?SUFFIX_ALIASES[suffix]:null;
    if(qid===null)return null;
    var quality=QUALITIES[qid];
    var rootPc=pcOf(root);
    if(rootPc<0)return null;
    var bassPc=bass!==null?pcOf(bass):-1;
    if(bass!==null&&bassPc<0)bass=null;
    var rootFlat=rootPrefersFlat(root,qid);
    /* 根音落在 C3~B4 之间：高根音降一个八度，避免延伸和弦爬得太高 */
    var rootMidi=(rootPc>=8?48:60)+rootPc;
    var notes=[];
    for(var i=0;i<quality.intervals.length;i++){
      var iv=quality.intervals[i],deg=quality.degrees[i];
      /* 根音永远保持用户看到的拼写，其余组成音按度数规则拼写 */
      var name=i===0?parseKeyName(root).root:spellChordTone(root,iv,deg,rootFlat);
      notes.push({name:name,degree:deg,role:degreeRole(deg),pc:(rootPc+iv)%12,midi:rootMidi+iv});
    }
    var bassNote=null;
    if(bass!==null&&bassPc!==rootPc){
      /* 低音放在根音下方一个八度以内 */
      bassNote={name:parseKeyName(bass).root,pc:bassPc,midi:rootMidi+((bassPc-rootPc+12)%12)-12};
    }
    var pianoMidis=(bassNote?[bassNote.midi]:[]).concat(notes.map(function(n){return n.midi;}));
    return {
      input:String(symbol||''),
      symbol:parseKeyName(root).root+qid+(bassNote?'/'+bassNote.name:''),
      root:parseKeyName(root).root,rootPc:rootPc,
      bass:bassNote?bassNote.name:null,bassPc:bassNote?bassPc:-1,
      quality:quality,useFlat:rootFlat,
      notes:notes,bassNote:bassNote,pianoMidis:pianoMidis
    };
  }

  /* ───────────────────────── 吉他把位数据 ─────────────────────────
     数据以 JS 字面量内嵌（而非独立 JSON 请求）：
     本块会同步进两个部署路径不同的宿主，内嵌可避免跨宿主的 fetch 路径
     问题，并随宿主 JS 一起被 Service Worker 预缓存，天然离线可用。
     指法为常见标准按法（参考通行吉他和弦手册整理，非复制任何单一数据库）。

     两类数据：
     1. OPEN_VOICINGS：开放把位（含空弦，不可平移），key = `${pc}|${qualityId}`。
     2. MOVABLE_SHAPES：可平移把位（CAGED 型/横按型），按性质分组；
        rel 为相对品位（0 = 基准品），rootString 为根音所在弦（0=低音E弦），
        rootRel 为根音在型内的相对品位；实际品位 = rel + baseFret。
     frets/fingers 均为低音弦->高音弦；fret -1=闷音(x)，0=空弦(o)；finger 0=空弦/不按。 */

  var OPEN_VOICINGS={
    '0|':[{frets:[-1,3,2,0,1,0],fingers:[0,3,2,0,1,0],caged:'C'}],
    '9|':[{frets:[-1,0,2,2,2,0],fingers:[0,0,1,2,3,0],caged:'A'}],
    '7|':[{frets:[3,2,0,0,0,3],fingers:[2,1,0,0,0,3],caged:'G'}],
    '4|':[{frets:[0,2,2,1,0,0],fingers:[0,2,3,1,0,0],caged:'E'}],
    '2|':[{frets:[-1,-1,0,2,3,2],fingers:[0,0,0,1,3,2],caged:'D'}],
    '9|m':[{frets:[-1,0,2,2,1,0],fingers:[0,0,2,3,1,0],caged:'Am'}],
    '4|m':[{frets:[0,2,2,0,0,0],fingers:[0,2,3,0,0,0],caged:'Em'}],
    '2|m':[{frets:[-1,-1,0,2,3,1],fingers:[0,0,0,2,3,1],caged:'Dm'}],
    '9|7':[{frets:[-1,0,2,0,2,0],fingers:[0,0,2,0,3,0]}],
    '11|7':[{frets:[-1,2,1,2,0,2],fingers:[0,2,1,3,0,4]}],
    '0|7':[{frets:[-1,3,2,3,1,0],fingers:[0,3,2,4,1,0]}],
    '2|7':[{frets:[-1,-1,0,2,1,2],fingers:[0,0,0,2,1,3]}],
    '4|7':[{frets:[0,2,0,1,0,0],fingers:[0,2,0,1,0,0]}],
    '7|7':[{frets:[3,2,0,0,0,1],fingers:[3,2,0,0,0,1]}],
    '9|m7':[{frets:[-1,0,2,0,1,0],fingers:[0,0,2,0,1,0]}],
    '4|m7':[{frets:[0,2,0,0,0,0],fingers:[0,2,0,0,0,0]}],
    '2|m7':[{frets:[-1,-1,0,2,1,1],fingers:[0,0,0,2,1,1],barre:{fret:1,from:4,to:5}}],
    '0|maj7':[{frets:[-1,3,2,0,0,0],fingers:[0,3,2,0,0,0]}],
    '9|maj7':[{frets:[-1,0,2,1,2,0],fingers:[0,0,2,1,3,0]}],
    '2|maj7':[{frets:[-1,-1,0,2,2,2],fingers:[0,0,0,1,2,3]}],
    '5|maj7':[{frets:[-1,-1,3,2,1,0],fingers:[0,0,3,2,1,0]}],
    '7|maj7':[{frets:[3,2,0,0,0,2],fingers:[2,1,0,0,0,3]}],
    '9|sus2':[{frets:[-1,0,2,2,0,0],fingers:[0,0,1,2,0,0]}],
    '2|sus2':[{frets:[-1,-1,0,2,3,0],fingers:[0,0,0,1,3,0]}],
    '9|sus4':[{frets:[-1,0,2,2,3,0],fingers:[0,0,1,2,3,0]}],
    '2|sus4':[{frets:[-1,-1,0,2,3,3],fingers:[0,0,0,1,3,4]}],
    '4|sus4':[{frets:[0,2,2,2,0,0],fingers:[0,2,3,4,0,0]}],
    '0|add9':[{frets:[-1,3,2,0,3,0],fingers:[0,2,1,0,3,0]}]
  };

  /* 常见斜杠和弦的专用开放把位，key = `${rootPc}|${qualityId}|${bassPc}` */
  var SLASH_OPEN_VOICINGS={
    '2||6':[{frets:[2,-1,0,2,3,2],fingers:[1,0,0,2,4,3]}],   /* D/F# */
    '7||11':[{frets:[-1,2,0,0,3,3],fingers:[0,1,0,0,3,4]}],  /* G/B  */
    '0||7':[{frets:[3,3,2,0,1,0],fingers:[3,4,2,0,1,0]}],    /* C/G  */
    '0||4':[{frets:[0,3,2,0,1,0],fingers:[0,3,2,0,1,0]}],    /* C/E  */
    '2||9':[{frets:[-1,0,0,2,3,2],fingers:[0,0,0,1,3,2]}],   /* D/A  */
    '9|m|7':[{frets:[3,0,2,2,1,0],fingers:[4,0,2,3,1,0]}]    /* Am/G */
  };

  var MOVABLE_SHAPES={
    '':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,2,2,1,0,0],fingers:[1,3,4,2,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,2,2,0],fingers:[0,1,2,3,4,1],barre:{rel:0,from:1,to:5}},
      {caged:'D',rootString:2,rootRel:0,rel:[-1,-1,0,2,3,2],fingers:[0,0,1,2,4,3]}
    ],
    'm':[
      {caged:'Em',rootString:0,rootRel:0,rel:[0,2,2,0,0,0],fingers:[1,3,4,1,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'Am',rootString:1,rootRel:0,rel:[-1,0,2,2,1,0],fingers:[0,1,3,4,2,1],barre:{rel:0,from:1,to:5}},
      {caged:'Dm',rootString:2,rootRel:0,rel:[-1,-1,0,2,3,1],fingers:[0,0,1,3,4,2]}
    ],
    '7':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,2,0,1,0,0],fingers:[1,3,1,2,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,0,2,0],fingers:[0,1,3,1,4,1],barre:{rel:0,from:1,to:5}}
    ],
    'm7':[
      {caged:'Em',rootString:0,rootRel:0,rel:[0,2,0,0,0,0],fingers:[1,3,1,1,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'Am',rootString:1,rootRel:0,rel:[-1,0,2,0,1,0],fingers:[0,1,3,1,2,1],barre:{rel:0,from:1,to:5}}
    ],
    'maj7':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,-1,1,1,0,-1],fingers:[2,0,3,4,1,0]},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,1,2,0],fingers:[0,1,3,2,4,1],barre:{rel:0,from:1,to:5}}
    ],
    'mMaj7':[
      {caged:'Am',rootString:1,rootRel:0,rel:[-1,0,2,1,1,0],fingers:[0,1,4,2,3,1],barre:{rel:0,from:1,to:5}}
    ],
    '6':[
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,2,2,2],fingers:[0,1,3,3,3,3],barre:{rel:2,from:2,to:5}}
    ],
    'm6':[
      {caged:'Em',rootString:0,rootRel:0,rel:[0,2,2,0,2,0],fingers:[1,3,4,1,2,1],barre:{rel:0,from:0,to:5}}
    ],
    '69':[
      {rootString:1,rootRel:1,rel:[-1,1,0,0,1,1],fingers:[0,2,1,1,3,4],barre:{rel:0,from:2,to:3}}
    ],
    '9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,1,1,1],fingers:[0,2,1,3,3,3],barre:{rel:1,from:3,to:5}}
    ],
    'm9':[
      {rootString:1,rootRel:2,rel:[-1,2,0,2,2,-1],fingers:[0,2,1,3,4,0]}
    ],
    'maj9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,2,1,-1],fingers:[0,2,1,4,3,0]}
    ],
    'add9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,-1,1,1],fingers:[0,2,1,0,3,4]}
    ],
    'sus2':[
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,2,0,0],fingers:[0,1,3,4,1,1],barre:{rel:0,from:1,to:5}}
    ],
    'sus4':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,2,2,2,0,0],fingers:[1,2,3,4,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,2,3,0],fingers:[0,1,2,3,4,1],barre:{rel:0,from:1,to:5}}
    ],
    '7sus4':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,2,0,2,0,0],fingers:[1,3,1,4,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,0,3,0],fingers:[0,1,3,1,4,1],barre:{rel:0,from:1,to:5}}
    ],
    'dim':[
      {rootString:1,rootRel:0,rel:[-1,0,1,2,1,-1],fingers:[0,1,2,4,3,0]}
    ],
    'dim7':[
      {rootString:2,rootRel:0,rel:[-1,-1,0,1,0,1],fingers:[0,0,1,3,2,4]}
    ],
    'aug':[
      {rootString:1,rootRel:2,rel:[-1,2,1,0,0,-1],fingers:[0,4,3,1,1,0],barre:{rel:0,from:3,to:4}}
    ],
    'aug7':[
      {rootString:0,rootRel:0,rel:[0,-1,0,1,1,-1],fingers:[1,0,2,3,4,0]}
    ],
    'm7b5':[
      {rootString:1,rootRel:0,rel:[-1,0,1,0,1,-1],fingers:[0,1,2,1,3,0],barre:{rel:0,from:1,to:3}},
      {rootString:0,rootRel:1,rel:[1,-1,1,1,0,-1],fingers:[2,0,3,4,1,0]}
    ],
    '7b5':[
      {rootString:0,rootRel:0,rel:[0,1,0,1,-1,-1],fingers:[1,2,1,3,0,0],barre:{rel:0,from:0,to:2}}
    ],
    '7#9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,1,2,-1],fingers:[0,2,1,3,4,0]}
    ],
    '7b9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,1,0,-1],fingers:[0,2,1,3,1,0],barre:{rel:0,from:2,to:4}}
    ],
    '13':[
      {rootString:0,rootRel:0,rel:[0,-1,0,1,2,2],fingers:[1,0,1,2,3,4],barre:{rel:0,from:0,to:2}}
    ],
    'm11':[
      {rootString:0,rootRel:0,rel:[0,0,0,0,0,0],fingers:[1,1,1,1,1,1],barre:{rel:0,from:0,to:5}}
    ],
    '5':[
      {rootString:0,rootRel:0,rel:[0,2,2,-1,-1,-1],fingers:[1,3,4,0,0,0]},
      {rootString:1,rootRel:0,rel:[-1,0,2,2,-1,-1],fingers:[0,1,3,4,0,0]}
    ]
  };

  /** 把位的展示起始品：低把位从 1 品画起（带琴枕），高把位从最低按品画起。 */
  function displayBaseFret(frets){
    var maxF=0,minPos=99;
    for(var i=0;i<6;i++){
      if(frets[i]>0){if(frets[i]>maxF)maxF=frets[i];if(frets[i]<minPos)minPos=frets[i];}
    }
    if(maxF<=4)return 1;
    return minPos===99?1:minPos;
  }

  /** 把位对象收尾：补 baseFret/label/root 标记，供绘图与试听使用。 */
  function finishPosition(pos,rootPc){
    pos.baseFret=displayBaseFret(pos.frets);
    pos.rootPc=rootPc;
    /* 试听用 MIDI（低音弦 -> 高音弦，跳过闷音） */
    pos.midis=[];
    for(var i=0;i<6;i++){
      if(pos.frets[i]>=0)pos.midis.push(GUITAR_STRING_MIDI[i]+pos.frets[i]);
    }
    if(!pos.label){
      /* 开放把位 / CAGED 型名；两者都没有时留空，由 UI 只显示品位号 */
      pos.label=pos.open?'开放把位':(pos.caged?pos.caged+' 型':'');
    }
    return pos;
  }

  /**
   * 计算某根音+性质的吉他把位列表。
   * 开放把位优先，其余按基准品从低到高排列，最多返回 4 个。
   * @param {number} rootPc 根音音级
   * @param {string} qualityId 性质 id
   * @param {number} [bassPc] 斜杠低音音级（命中专用开放把位时优先返回）
   * @returns {Array<Object>} 把位数组（可能为空：该性质暂未收录吉他按法）
   */
  function guitarPositionsFor(rootPc,qualityId,bassPc){
    var out=[],seen={};
    function push(p){
      var sig=p.frets.join(',');
      if(seen[sig])return;
      seen[sig]=1;
      out.push(finishPosition(p,rootPc));
    }
    /* 1. 斜杠和弦专用开放把位 */
    if(bassPc!==undefined&&bassPc>=0){
      var sk=rootPc+'|'+qualityId+'|'+bassPc;
      var sv=SLASH_OPEN_VOICINGS[sk]||[];
      for(var s=0;s<sv.length;s++){
        push({frets:sv[s].frets.slice(),fingers:sv[s].fingers.slice(),barre:sv[s].barre||null,caged:sv[s].caged||'',open:true});
      }
    }
    /* 2. 开放把位 */
    var ov=OPEN_VOICINGS[rootPc+'|'+qualityId]||[];
    for(var o=0;o<ov.length;o++){
      push({frets:ov[o].frets.slice(),fingers:ov[o].fingers.slice(),barre:ov[o].barre||null,caged:ov[o].caged||'',open:true});
    }
    /* 3. 可平移把位：基准品 = 根音品位 - 型内根音相对品位（不足则升八度） */
    var shapes=MOVABLE_SHAPES[qualityId]||[];
    for(var i=0;i<shapes.length;i++){
      var sh=shapes[i];
      var f=(rootPc-GUITAR_STRING_PC[sh.rootString]+12)%12;
      var base=f-sh.rootRel;
      if(base<0)base+=12;
      var frets=[],fingers=[];
      for(var j=0;j<6;j++){
        if(sh.rel[j]<0){frets.push(-1);fingers.push(0);}
        else{
          var fr=sh.rel[j]+base;
          frets.push(fr);
          fingers.push(fr===0?0:sh.fingers[j]);
        }
      }
      var barre=null;
      if(sh.barre){
        var bf=sh.barre.rel+base;
        if(bf>0)barre={fret:bf,from:sh.barre.from,to:sh.barre.to};
      }
      push({frets:frets,fingers:fingers,barre:barre,caged:sh.caged||'',open:base===0});
    }
    out.sort(function(a,b){
      if(a.open!==b.open)return a.open?-1:1;
      return a.baseFret-b.baseFret;
    });
    return out.slice(0,4);
  }

  /* ───────────────────────── Repository ─────────────────────────
     统一入口：符号 -> {def, guitar}，Map 缓存避免重复解析/计算。 */
  var repoCache=new Map();

  /**
   * 读取和弦完整数据（解析结果 + 吉他把位），带缓存。
   * @param {string} symbol 和弦符号
   * @returns {?{def:Object, guitar:Array}} 解析失败返回 null
   */
  function getChord(symbol){
    var key=cleanChordText(symbol);
    if(!key)return null;
    if(repoCache.has(key))return repoCache.get(key);
    var def=parseChord(key);
    var entry=def?{def:def,guitar:guitarPositionsFor(def.rootPc,def.quality.id,def.bassPc)}:null;
    repoCache.set(key,entry);
    return entry;
  }

  /* ───────────────────────── 音频引擎（Web Audio 合成） ─────────────────────────
     MVP 用振荡器合成，零音频文件、天然离线、低延迟。
     接口化设计：将来可用同接口换成真实采样音色。 */
  var AudioEngine={
    _ctx:null,_master:null,
    /** 懒初始化 AudioContext（必须由用户手势触发的调用链进入）。 */
    _ensure:function(){
      if(typeof window==='undefined')return null;
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      if(!this._ctx){
        this._ctx=new AC();
        /* 压限器兜底，多音齐奏不削波 */
        this._master=this._ctx.createDynamicsCompressor();
        this._master.threshold.value=-16;
        this._master.connect(this._ctx.destination);
      }
      if(this._ctx.state==='suspended'){try{this._ctx.resume();}catch(e){}}
      return this._ctx;
    },
    _midiFreq:function(m){return 440*Math.pow(2,(m-69)/12);},
    /** 单音合成：双振荡器 + 低通 + 指数衰减包络。timbre: 'piano'|'guitar' */
    _voice:function(midi,when,timbre){
      var ctx=this._ctx,freq=this._midiFreq(midi);
      var isG=timbre==='guitar';
      var dur=isG?GUITAR_NOTE_SECONDS:PIANO_NOTE_SECONDS;
      var lp=ctx.createBiquadFilter();
      lp.type='lowpass';
      lp.frequency.value=isG?2300:3800;
      lp.Q.value=0.6;
      var gain=ctx.createGain();
      gain.gain.setValueAtTime(0.0001,when);
      gain.gain.linearRampToValueAtTime(isG?0.30:0.26,when+0.006);
      gain.gain.exponentialRampToValueAtTime(0.0008,when+dur);
      var o1=ctx.createOscillator();
      o1.type=isG?'sawtooth':'triangle';
      o1.frequency.value=freq;
      var o2=ctx.createOscillator();
      o2.type=isG?'triangle':'sine';
      o2.frequency.value=freq*(isG?1:2);
      o2.detune.value=isG?4:2;
      var g2=ctx.createGain();
      g2.gain.value=isG?0.5:0.35;
      o1.connect(lp);o2.connect(g2);g2.connect(lp);
      lp.connect(gain);gain.connect(this._master);
      o1.start(when);o2.start(when);
      o1.stop(when+dur+0.05);o2.stop(when+dur+0.05);
    },
    /**
     * 钢琴式播放：组成音同时触发。
     * @param {number[]} midis MIDI 音高列表
     * @returns {boolean} 环境不支持 Web Audio 时返回 false
     */
    playChord:function(midis){
      var ctx=this._ensure();
      if(!ctx||!midis||!midis.length)return false;
      var t=ctx.currentTime+0.02;
      for(var i=0;i<midis.length;i++)this._voice(midis[i],t,'piano');
      return true;
    },
    /**
     * 吉他扫弦：各弦按 STRUM_STAGGER_MS 间隔依次触发。
     * @param {number[]} midis 低音弦->高音弦的 MIDI 列表
     * @returns {number[]} 各音相对触发延时（ms），供 UI 同步动画；不支持时返回 []
     */
    strumGuitar:function(midis){
      var ctx=this._ensure();
      if(!ctx||!midis||!midis.length)return [];
      var t=ctx.currentTime+0.02,delays=[];
      for(var i=0;i<midis.length;i++){
        this._voice(midis[i],t+i*STRUM_STAGGER_MS/1000,'guitar');
        delays.push(i*STRUM_STAGGER_MS);
      }
      return delays;
    }
  };

  /* 对外 API（DOM 相关的 open/close 在下方 DOM 段里再挂上） */
  var API={
    version:VERSION,
    parseChord:parseChord,
    getChord:getChord,
    guitarPositionsFor:guitarPositionsFor,
    cleanChordText:cleanChordText,
    createStore:createStore,
    audio:AudioEngine,
    qualities:QUALITIES,
    open:function(){},
    close:function(){}
  };

  /* ═════════════════ 以下为 DOM/UI 段，Node 单测环境自动跳过 ═════════════════ */
  if(typeof window!=='undefined'&&typeof document!=='undefined'&&typeof customElements!=='undefined'){

    /* ── 主题工具：宿主 CSS 变量 -> 引擎内部 --ce-* 变量 ──
       宿主的主题变量定义在 #music-library 上（不在 :root），
       而面板挂在 body 下，无法靠继承拿到，因此在打开时把
       计算值复制到组件宿主元素上；读不到时按明暗回退。 */
    function isDarkTheme(){
      var attr=document.documentElement.getAttribute('data-resolved-theme');
      if(attr==='dark')return true;
      if(attr==='light')return false;
      return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    /* [引擎变量名, 宿主候选变量, 回退键] */
    var THEME_VAR_MAP=[
      ['--ce-bg',['--surface','--bg2'],'bg'],
      ['--ce-bg2',['--surface-secondary','--bg3'],'bg2'],
      ['--ce-bg3',['--surface-hover'],'bg3'],
      ['--ce-text',['--text-primary','--text'],'text'],
      ['--ce-text2',['--text-secondary','--text2'],'text2'],
      ['--ce-text3',['--text-muted','--text3'],'text3'],
      ['--ce-border',['--divider','--border'],'border'],
      ['--ce-border-md',['--border-md'],'borderMd'],
      ['--ce-accent',['--accent'],'accent'],
      ['--ce-accent-soft',['--accent-soft','--accent-light'],'accentSoft'],
      ['--ce-third',['--chord-third'],'third'],
      ['--ce-ext',['--chord-tension'],'ext']
    ];
    /**
     * 把宿主主题变量同步到元素（内联 --ce-*），主题切换/打开面板时调用。
     * @param {HTMLElement} host 目标元素（通常是 <chord-explorer>）
     */
    function syncThemeVars(host){
      var src=document.getElementById('music-library')||document.body;
      var cs=src?getComputedStyle(src):null;
      var fb=isDarkTheme()?FALLBACK_DARK:FALLBACK_LIGHT;
      for(var i=0;i<THEME_VAR_MAP.length;i++){
        var row=THEME_VAR_MAP[i],val='';
        for(var j=0;j<row[1].length&&!val;j++){
          if(cs)val=cs.getPropertyValue(row[1][j]).trim();
        }
        host.style.setProperty(row[0],val||fb[row[2]]);
      }
    }
    /** 组件内读取绘图色：优先 --ce-* 变量（含继承），否则按明暗回退。 */
    function paintColors(el){
      var cs=getComputedStyle(el);
      var fb=isDarkTheme()?FALLBACK_DARK:FALLBACK_LIGHT;
      function v(name,fbKey){var x=cs.getPropertyValue(name).trim();return x||fb[fbKey];}
      return {
        bg:v('--ce-bg','bg'),bg2:v('--ce-bg2','bg2'),
        text:v('--ce-text','text'),text2:v('--ce-text2','text2'),text3:v('--ce-text3','text3'),
        border:v('--ce-border','border'),borderMd:v('--ce-border-md','borderMd'),
        root:v('--ce-accent','accent'),third:v('--ce-third','third'),ext:v('--ce-ext','ext'),
        keyWhite:fb.keyWhite,keyWhiteEdge:fb.keyWhiteEdge,keyBlack:fb.keyBlack
      };
    }
    function roleColor(colors,role){
      return role==='root'?colors.root:(role==='third'?colors.third:colors.ext);
    }
    /** Canvas 通用：按容器宽度与 DPR 设定物理尺寸，返回 2D 上下文。 */
    function setupCanvas(canvas,cssW,cssH){
      var dpr=window.devicePixelRatio||1;
      canvas.width=Math.max(1,Math.round(cssW*dpr));
      canvas.height=Math.max(1,Math.round(cssH*dpr));
      canvas.style.width=cssW+'px';
      canvas.style.height=cssH+'px';
      var ctx=canvas.getContext('2d');
      ctx.setTransform(dpr,0,0,dpr,0,0);
      return ctx;
    }
    function roundRect(ctx,x,y,w,h,r){
      var rr=Math.min(r,w/2,h/2);
      ctx.beginPath();
      ctx.moveTo(x+rr,y);
      ctx.arcTo(x+w,y,x+w,y+h,rr);
      ctx.arcTo(x+w,y+h,x,y+h,rr);
      ctx.arcTo(x,y+h,x,y,rr);
      ctx.arcTo(x,y,x+w,y,rr);
      ctx.closePath();
    }
    /** 宿主主题切换（html[data-resolved-theme] 变化）时重绘：组件独立使用时也能跟随主题。 */
    function observeTheme(el,redraw){
      if(typeof MutationObserver==='undefined')return null;
      var mo=new MutationObserver(redraw);
      mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-resolved-theme','data-theme']});
      return mo;
    }

    var WHITE_PCS=[0,2,4,5,7,9,11];

    /* ────────────── <chord-piano>：Canvas 手绘钢琴键盘 ────────────── */
    /**
     * 钢琴键盘组件。用法：
     *   el.definition = ChordEngine.parseChord('G#m')   （或 setAttribute('chord','G#m')）
     *   el.flash(midis) 播放时按下反馈
     * 自动定位到覆盖和弦音的音区（含低音，至少两个完整八度）。
     */
    class ChordPianoEl extends HTMLElement{
      static get observedAttributes(){return ['chord'];}
      constructor(){
        super();
        this._def=null;
        this._pressed={};
        this._shadow=this.attachShadow({mode:'open'});
        this._shadow.innerHTML='<style>:host{display:block}canvas{display:block;width:100%}</style><canvas aria-hidden="true"></canvas>';
        this._canvas=this._shadow.querySelector('canvas');
        this._onResize=this._draw.bind(this);
      }
      connectedCallback(){
        if(typeof ResizeObserver!=='undefined'){
          this._ro=new ResizeObserver(this._onResize);
          this._ro.observe(this);
        }else{
          window.addEventListener('resize',this._onResize);
        }
        this._mo=observeTheme(this,this._onResize);
        this._draw();
      }
      disconnectedCallback(){
        if(this._ro){this._ro.disconnect();this._ro=null;}
        if(this._mo){this._mo.disconnect();this._mo=null;}
        window.removeEventListener('resize',this._onResize);
      }
      attributeChangedCallback(name,ov,nv){
        if(name==='chord')this.definition=parseChord(nv);
      }
      set definition(def){this._def=def;this._draw();}
      get definition(){return this._def;}
      /** 播放反馈：这批琴键短暂点亮。@param {number[]} midis */
      flash(midis){
        var self=this;
        for(var i=0;i<midis.length;i++)this._pressed[midis[i]]=1;
        this._draw();
        setTimeout(function(){self._pressed={};self._draw();},FLASH_MS);
      }
      /** 键盘音区窗口：整八度对齐，覆盖所有和弦音，至少两个八度。 */
      _window(){
        var midis=this._def?this._def.pianoMidis:[60,64,67];
        var lo=Math.min.apply(null,midis),hi=Math.max.apply(null,midis);
        var start=Math.floor(lo/12)*12;
        var end=Math.ceil((hi+1)/12)*12-1;
        while(end-start<23)end+=12;
        return {start:start,end:end};
      }
      _draw(){
        if(!this.isConnected)return;
        var w=this.clientWidth;
        if(w<40)return;
        var def=this._def,win=this._window();
        var colors=paintColors(this);
        /* 音名标注：pc -> {name,role} */
        var pcInfo={};
        if(def){
          for(var n=def.notes.length-1;n>=0;n--)pcInfo[def.notes[n].pc]={name:def.notes[n].name,role:def.notes[n].role};
          if(def.bassNote&&!pcInfo[def.bassNote.pc])pcInfo[def.bassNote.pc]={name:def.bassNote.name,role:'root'};
        }
        var inChord={};
        if(def)for(var q=0;q<def.pianoMidis.length;q++)inChord[def.pianoMidis[q]]=1;
        var whites=[];
        for(var m=win.start;m<=win.end;m++){
          if(WHITE_PCS.indexOf(m%12)>=0)whites.push(m);
        }
        var keyW=w/whites.length;
        var h=Math.max(96,Math.min(190,keyW*6.2));
        var ctx=setupCanvas(this._canvas,w,h);
        ctx.clearRect(0,0,w,h);
        /* 白键 */
        var xOf={};
        for(var i=0;i<whites.length;i++){
          var mw=whites[i],x=i*keyW;
          xOf[mw]=x;
          ctx.fillStyle=colors.keyWhite;
          roundRect(ctx,x+0.75,0,keyW-1.5,h,3);
          ctx.fill();
          ctx.strokeStyle=colors.keyWhiteEdge;
          ctx.lineWidth=1;
          ctx.stroke();
          if(inChord[mw]){
            var info=pcInfo[mw%12]||{};
            var c=roleColor(colors,this._pressed[mw]?'root':info.role||'ext');
            ctx.globalAlpha=this._pressed[mw]?0.34:0.16;
            ctx.fillStyle=roleColor(colors,info.role||'ext');
            roundRect(ctx,x+0.75,0,keyW-1.5,h,3);
            ctx.fill();
            ctx.globalAlpha=1;
            /* 键底音名药丸 */
            var r=Math.min(keyW*0.36,12);
            ctx.fillStyle=roleColor(colors,info.role||'ext');
            ctx.beginPath();
            ctx.arc(x+keyW/2,h-r-7,r,0,Math.PI*2);
            ctx.fill();
            ctx.fillStyle='#FFFFFF';
            ctx.font='600 '+Math.max(8,Math.min(11,r))+'px system-ui,sans-serif';
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText((pcInfo[mw%12]||{}).name||'',x+keyW/2,h-r-6.5);
          }
        }
        /* 黑键 */
        var bw=keyW*0.62,bh=h*0.62;
        for(var mb=win.start;mb<=win.end;mb++){
          if(WHITE_PCS.indexOf(mb%12)>=0)continue;
          var prevWhite=mb-1;
          if(xOf[prevWhite]===undefined)continue;
          var bx=xOf[prevWhite]+keyW-bw/2;
          ctx.fillStyle=colors.keyBlack;
          roundRect(ctx,bx,0,bw,bh,2.5);
          ctx.fill();
          if(inChord[mb]){
            var infoB=pcInfo[mb%12]||{};
            ctx.globalAlpha=this._pressed[mb]?0.55:0.35;
            ctx.fillStyle=roleColor(colors,infoB.role||'ext');
            roundRect(ctx,bx,0,bw,bh,2.5);
            ctx.fill();
            ctx.globalAlpha=1;
            var rb=Math.min(bw*0.44,10);
            ctx.fillStyle=roleColor(colors,infoB.role||'ext');
            ctx.beginPath();
            ctx.arc(bx+bw/2,bh-rb-5,rb,0,Math.PI*2);
            ctx.fill();
            ctx.fillStyle='#FFFFFF';
            ctx.font='600 '+Math.max(7,Math.min(10,rb))+'px system-ui,sans-serif';
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(infoB.name||'',bx+bw/2,bh-rb-4.5);
          }
        }
      }
    }
    if(!customElements.get('chord-piano'))customElements.define('chord-piano',ChordPianoEl);

    /* ────────────── <chord-guitar-diagram>：Canvas 手绘吉他指法图 ────────────── */
    /**
     * 吉他指法图组件。用法：
     *   el.setPosition(position)  （position 来自 getChord(...).guitar[i]）
     *   el.flashStrings(delays)   扫弦时逐弦点亮
     * 支持：按弦圆点(内含指法编号)、闷音 x、空弦 o、横按整条、根音标记、起始品位号。
     */
    class ChordGuitarEl extends HTMLElement{
      constructor(){
        super();
        this._pos=null;
        this._lit={};
        this._shadow=this.attachShadow({mode:'open'});
        this._shadow.innerHTML='<style>:host{display:block}canvas{display:block;width:100%}</style><canvas aria-hidden="true"></canvas>';
        this._canvas=this._shadow.querySelector('canvas');
        this._onResize=this._draw.bind(this);
      }
      connectedCallback(){
        if(typeof ResizeObserver!=='undefined'){
          this._ro=new ResizeObserver(this._onResize);
          this._ro.observe(this);
        }else{
          window.addEventListener('resize',this._onResize);
        }
        this._mo=observeTheme(this,this._onResize);
        this._draw();
      }
      disconnectedCallback(){
        if(this._ro){this._ro.disconnect();this._ro=null;}
        if(this._mo){this._mo.disconnect();this._mo=null;}
        window.removeEventListener('resize',this._onResize);
      }
      /** @param {Object} pos guitarPositionsFor 产出的把位对象 */
      setPosition(pos){this._pos=pos;this._draw();}
      /** 扫弦反馈：delays[i] 为第 i 根发声弦的延时（ms）。 */
      flashStrings(delays){
        var self=this,order=[];
        if(!this._pos)return;
        for(var i=0;i<6;i++)if(this._pos.frets[i]>=0)order.push(i);
        for(var k=0;k<order.length;k++){
          (function(stringIdx,delay){
            setTimeout(function(){
              self._lit[stringIdx]=1;self._draw();
              setTimeout(function(){delete self._lit[stringIdx];self._draw();},FLASH_MS);
            },delay);
          })(order[k],delays[k]||0);
        }
      }
      _draw(){
        if(!this.isConnected||!this._pos)return;
        var w=this.clientWidth;
        if(w<40)return;
        var pos=this._pos,colors=paintColors(this);
        var base=pos.baseFret;
        var maxRel=0;
        for(var i=0;i<6;i++)if(pos.frets[i]>0)maxRel=Math.max(maxRel,pos.frets[i]-base+1);
        var nFrets=Math.max(4,maxRel);
        /* 起始品位号需要的左侧留白：两位数品号（10 品以上）更宽，避免被画布裁切 */
        var padL=base>1?(base>=10?36:26):14,padR=10,padT=26,padB=12;
        var gridW=w-padL-padR;
        var fretH=Math.min(34,Math.max(22,gridW/4));
        var h=padT+fretH*nFrets+padB;
        var ctx=setupCanvas(this._canvas,w,h);
        ctx.clearRect(0,0,w,h);
        var sx=function(s){return padL+gridW*s/5;};
        var fy=function(f){return padT+fretH*f;};
        /* 品丝与弦 */
        ctx.strokeStyle=colors.border;
        ctx.lineWidth=1;
        for(var f=1;f<=nFrets;f++){
          ctx.beginPath();ctx.moveTo(sx(0),fy(f));ctx.lineTo(sx(5),fy(f));ctx.stroke();
        }
        for(var s=0;s<6;s++){
          ctx.strokeStyle=this._lit[s]?colors.root:colors.borderMd;
          ctx.lineWidth=this._lit[s]?2:1;
          ctx.beginPath();ctx.moveTo(sx(s),fy(0));ctx.lineTo(sx(s),fy(nFrets));ctx.stroke();
        }
        /* 琴枕（1 把位）或起始品位号 */
        if(base<=1){
          ctx.strokeStyle=colors.text;
          ctx.lineWidth=3;
          ctx.beginPath();ctx.moveTo(sx(0)-1,fy(0));ctx.lineTo(sx(5)+1,fy(0));ctx.stroke();
        }else{
          ctx.strokeStyle=colors.text2;
          ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(sx(0),fy(0));ctx.lineTo(sx(5),fy(0));ctx.stroke();
          ctx.fillStyle=colors.text2;
          ctx.font='600 11px system-ui,sans-serif';
          ctx.textAlign='right';ctx.textBaseline='middle';
          ctx.fillText(base+'品',padL-7,fy(0)+fretH/2);
        }
        /* 横按 */
        if(pos.barre){
          var bf=pos.barre.fret-base;
          if(bf>=0&&bf<nFrets){
            var by=fy(bf)+fretH/2;
            ctx.fillStyle=colors.text;
            ctx.globalAlpha=0.9;
            roundRect(ctx,sx(pos.barre.from)-7,by-6.5,sx(pos.barre.to)-sx(pos.barre.from)+14,13,6.5);
            ctx.fill();
            ctx.globalAlpha=1;
          }
        }
        /* 按弦点 / 空弦 / 闷音 */
        var dotR=Math.min(fretH*0.34,gridW/5*0.42);
        for(var st=0;st<6;st++){
          var fr=pos.frets[st];
          var topY=fy(0)-11;
          if(fr<0){
            /* 闷音 x */
            ctx.strokeStyle=colors.text3;
            ctx.lineWidth=1.6;
            ctx.beginPath();
            ctx.moveTo(sx(st)-4,topY-4);ctx.lineTo(sx(st)+4,topY+4);
            ctx.moveTo(sx(st)+4,topY-4);ctx.lineTo(sx(st)-4,topY+4);
            ctx.stroke();
            continue;
          }
          var isRoot=((GUITAR_STRING_PC[st]+fr)%12)===pos.rootPc;
          if(fr===0){
            /* 空弦 o；根音空弦用强调色 */
            ctx.strokeStyle=isRoot?colors.root:colors.text2;
            ctx.lineWidth=isRoot?2:1.6;
            ctx.beginPath();ctx.arc(sx(st),topY,4.5,0,Math.PI*2);ctx.stroke();
            continue;
          }
          var relF=fr-base;
          if(relF<0||relF>=nFrets)continue;
          var cy=fy(relF)+fretH/2;
          /* 横按覆盖到的音若与横按同品且无更高指编号，仅靠横按条表达，不再叠点 */
          var onBarre=pos.barre&&pos.barre.fret===fr&&st>=pos.barre.from&&st<=pos.barre.to&&pos.fingers[st]<=1;
          if(onBarre&&!isRoot)continue;
          ctx.fillStyle=isRoot?colors.root:colors.text;
          ctx.beginPath();ctx.arc(sx(st),cy,dotR,0,Math.PI*2);ctx.fill();
          if(this._lit[st]){
            ctx.strokeStyle=colors.root;
            ctx.lineWidth=2;
            ctx.beginPath();ctx.arc(sx(st),cy,dotR+2.5,0,Math.PI*2);ctx.stroke();
          }
          if(pos.fingers[st]>0){
            /* 指法数字与圆点填充色反色：根音点(强调色)配白字；
               普通点填充为 text 色，深色模式下是浅色，数字用 bg 色才可读 */
            ctx.fillStyle=isRoot?'#FFFFFF':colors.bg;
            ctx.font='600 '+Math.max(8,dotR)+'px system-ui,sans-serif';
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(String(pos.fingers[st]),sx(st),cy+0.5);
          }
        }
      }
    }
    if(!customElements.get('chord-guitar-diagram'))customElements.define('chord-guitar-diagram',ChordGuitarEl);

    /* ────────────── <chord-explorer>：底部弹出主面板 ────────────── */
    var EXPLORER_CSS=
      ':host{position:fixed;inset:0;z-index:2147482000;display:block;pointer-events:none;'+
        'font-family:Inter,"Noto Sans SC",-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",system-ui,sans-serif}'+
      '.backdrop{position:absolute;inset:0;background:rgba(18,13,9,.42);opacity:0;transition:opacity .22s ease;pointer-events:none}'+
      '.sheet{position:absolute;left:50%;bottom:0;transform:translate(-50%,103%);width:min(720px,100%);'+
        'max-height:min(86dvh,860px);box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain;'+
        'background:var(--ce-bg);color:var(--ce-text);border:1px solid var(--ce-border-md);border-bottom:none;'+
        'border-radius:18px 18px 0 0;box-shadow:0 -18px 60px rgba(0,0,0,.22);'+
        'padding:10px 20px calc(22px + env(safe-area-inset-bottom,0px));'+
        'transition:transform .24s cubic-bezier(.32,.72,.28,1);pointer-events:none}'+
      ':host(.open) .backdrop{opacity:1;pointer-events:auto}'+
      ':host(.open) .sheet{transform:translate(-50%,0);pointer-events:auto}'+
      '.grab{width:38px;height:4px;border-radius:2px;background:var(--ce-border-md);margin:2px auto 12px}'+
      '.head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding-right:38px}'+
      '.name{font-size:30px;font-weight:700;line-height:1.1}'+
      '.qual{font-size:13px;color:var(--ce-text2)}'+
      '.close{position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;'+
        'border:1px solid var(--ce-border);background:var(--ce-bg2);color:var(--ce-text2);'+
        'font-size:15px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}'+
      '.close:hover{background:var(--ce-bg3)}'+
      '.tones{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 4px}'+
      '.tone{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:44px;padding:7px 10px;'+
        'border-radius:10px;border:1px solid var(--ce-border);background:var(--ce-bg2)}'+
      '.tone b{font-size:16px;font-weight:700}'+
      '.tone i{font-style:normal;font-size:10.5px;color:var(--ce-text3)}'+
      '.tone.root b{color:var(--ce-accent)}.tone.third b{color:var(--ce-third)}.tone.ext b{color:var(--ce-ext)}'+
      '.bassnote{font-size:12px;color:var(--ce-text2);margin:6px 0 0}'+
      '.sec{margin-top:20px}'+
      '.sec-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}'+
      '.sec-t{font-size:12px;font-weight:600;letter-spacing:.08em;color:var(--ce-text3)}'+
      '.play{width:30px;height:30px;border-radius:50%;border:1px solid var(--ce-border-md);cursor:pointer;'+
        'background:var(--ce-accent-soft);color:var(--ce-accent);display:flex;align-items:center;justify-content:center;'+
        'transition:transform .12s ease}'+
      '.play:active{transform:scale(.9)}'+
      '.play svg{width:12px;height:12px;fill:currentColor}'+
      '.piano-card,.gcard{border:1px solid var(--ce-border);border-radius:14px;background:var(--ce-bg2);padding:12px}'+
      '.gwrap{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}'+
      '.gcard{flex:0 0 150px;display:flex;flex-direction:column;gap:6px}'+
      '.gmeta{display:flex;align-items:center;justify-content:space-between;gap:6px}'+
      '.glabel{font-size:11.5px;color:var(--ce-text2);font-weight:600}'+
      '.gempty{font-size:12.5px;color:var(--ce-text3);padding:6px 2px}'+
      '@media (max-width:480px){.name{font-size:26px}.gcard{flex-basis:138px}}';
    var PLAY_SVG='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.6c0-.5.55-.8.98-.55l7.02 4.4c.4.25.4.85 0 1.1l-7.02 4.4a.65.65 0 0 1-.98-.55z"/></svg>';

    /**
     * 和弦浏览器主组件（Bottom Sheet）。
     * 对外：el.open('G#m') / el.close() / setAttribute('chord','G#m')；
     * 打开/关闭时派发 'chord-open' / 'chord-close' CustomEvent（detail 为符号）。
     * 内部用极简 Store 管理当前 ChordDefinition，子组件订阅式刷新。
     */
    class ChordExplorerEl extends HTMLElement{
      static get observedAttributes(){return ['chord'];}
      constructor(){
        super();
        var self=this;
        this._store=createStore({entry:null,visible:false});
        this._shadow=this.attachShadow({mode:'open'});
        this._shadow.innerHTML=
          '<style>'+EXPLORER_CSS+'</style>'+
          '<div class="backdrop" part="backdrop"></div>'+
          '<div class="sheet" role="dialog" aria-modal="true" aria-label="和弦浏览器">'+
            '<div class="grab"></div>'+
            '<button class="close" aria-label="关闭">✕</button>'+
            '<div class="head"><span class="name"></span><span class="qual"></span></div>'+
            '<div class="tones"></div>'+
            '<div class="bassnote" hidden></div>'+
            '<div class="sec"><div class="sec-h"><span class="sec-t">钢琴</span>'+
              '<button class="play piano-play" aria-label="钢琴试听">'+PLAY_SVG+'</button></div>'+
              '<div class="piano-card"><chord-piano></chord-piano></div></div>'+
            '<div class="sec"><div class="sec-h"><span class="sec-t">吉他把位</span></div>'+
              '<div class="gwrap"></div><div class="gempty" hidden>该和弦性质的吉他把位暂未收录，可参考上方钢琴组成音。</div></div>'+
          '</div>';
        this._els={
          backdrop:this._shadow.querySelector('.backdrop'),
          sheet:this._shadow.querySelector('.sheet'),
          name:this._shadow.querySelector('.name'),
          qual:this._shadow.querySelector('.qual'),
          tones:this._shadow.querySelector('.tones'),
          bass:this._shadow.querySelector('.bassnote'),
          piano:this._shadow.querySelector('chord-piano'),
          pianoPlay:this._shadow.querySelector('.piano-play'),
          gwrap:this._shadow.querySelector('.gwrap'),
          gempty:this._shadow.querySelector('.gempty'),
          close:this._shadow.querySelector('.close')
        };
        this._els.backdrop.addEventListener('click',function(){self.close();});
        this._els.close.addEventListener('click',function(){self.close();});
        this._onKey=function(e){if(e.key==='Escape')self.close();};
        this._els.pianoPlay.addEventListener('click',function(){
          var st=self._store.getState();
          if(!st.entry)return;
          if(AudioEngine.playChord(st.entry.def.pianoMidis))self._els.piano.flash(st.entry.def.pianoMidis);
        });
        this._unsub=this._store.subscribe(this._render.bind(this));
        /* 宿主主题切换时同步变量并重绘 */
        if(typeof MutationObserver!=='undefined'){
          this._themeMo=new MutationObserver(function(){
            syncThemeVars(self);
            if(self._store.getState().visible)self._render(self._store.getState());
          });
          this._themeMo.observe(document.documentElement,{attributes:true,attributeFilter:['data-resolved-theme','data-theme']});
        }
      }
      attributeChangedCallback(name,ov,nv){
        if(name==='chord'&&nv)this.open(nv);
      }
      /**
       * 打开面板展示某和弦。
       * @param {string} symbol 和弦符号（可以带排版占位字符，内部会清洗）
       * @returns {boolean} 解析失败返回 false 且不打开
       */
      open(symbol){
        var entry=getChord(symbol);
        if(!entry)return false;
        syncThemeVars(this);
        this._store.setState({entry:entry,visible:true});
        document.addEventListener('keydown',this._onKey);
        this.dispatchEvent(new CustomEvent('chord-open',{detail:entry.def.symbol}));
        return true;
      }
      /** 关闭面板。 */
      close(){
        if(!this._store.getState().visible)return;
        this._store.setState({visible:false});
        document.removeEventListener('keydown',this._onKey);
        this.dispatchEvent(new CustomEvent('chord-close',{detail:null}));
      }
      _render(state){
        var els=this._els,self=this;
        this.classList.toggle('open',!!state.visible);
        if(!state.entry)return;
        var def=state.entry.def,positions=state.entry.guitar;
        els.name.textContent=def.root+def.quality.id+(def.bass?'/'+def.bass:'');
        els.qual.textContent=def.quality.zh+' · '+def.quality.name;
        /* 组成音 */
        els.tones.innerHTML='';
        for(var i=0;i<def.notes.length;i++){
          var n=def.notes[i];
          var chip=document.createElement('span');
          chip.className='tone '+n.role;
          chip.innerHTML='<b></b><i></i>';
          chip.querySelector('b').textContent=n.name;
          chip.querySelector('i').textContent=n.degree==='R'?'根音':n.degree;
          els.tones.appendChild(chip);
        }
        if(def.bassNote){
          els.bass.hidden=false;
          els.bass.textContent='斜杠和弦：低音 '+def.bassNote.name+' 由左手 / 贝斯演奏，右手按上方组成音。';
        }else{
          els.bass.hidden=true;
        }
        /* 钢琴 */
        els.piano.definition=def;
        /* 吉他把位 */
        els.gwrap.innerHTML='';
        els.gempty.hidden=positions.length>0;
        for(var p=0;p<positions.length;p++){
          (function(pos){
            var card=document.createElement('div');
            card.className='gcard';
            var diagram=document.createElement('chord-guitar-diagram');
            var meta=document.createElement('div');
            meta.className='gmeta';
            var label=document.createElement('span');
            label.className='glabel';
            var labelParts=[pos.label,pos.baseFret>1?pos.baseFret+'品':''].filter(Boolean);
            label.textContent=labelParts.join(' · ')||'开放把位';
            var btn=document.createElement('button');
            btn.className='play';
            btn.setAttribute('aria-label','吉他试听 '+pos.label);
            btn.innerHTML=PLAY_SVG;
            btn.addEventListener('click',function(){
              var delays=AudioEngine.strumGuitar(pos.midis);
              if(delays.length)diagram.flashStrings(delays);
            });
            meta.appendChild(label);
            meta.appendChild(btn);
            card.appendChild(diagram);
            card.appendChild(meta);
            els.gwrap.appendChild(card);
            diagram.setPosition(pos);
          })(positions[p]);
        }
      }
    }
    if(!customElements.get('chord-explorer'))customElements.define('chord-explorer',ChordExplorerEl);

    /* ────────────── 宿主歌词页集成 ──────────────
       约束（见阶段 7）：不改动 .p-chord 的创建/渲染逻辑；
       在稳定祖先上用事件委托（切调重渲染后监听依然有效）；
       读取节点当前 textContent（已移调文本），保证与用户所见一致。 */
    var explorerInstance=null;
    /** 懒创建全局唯一 <chord-explorer> 实例。 */
    function ensureExplorer(){
      if(explorerInstance&&explorerInstance.isConnected)return explorerInstance;
      explorerInstance=document.createElement('chord-explorer');
      (document.body||document.documentElement).appendChild(explorerInstance);
      return explorerInstance;
    }
    API.open=function(symbol){return ensureExplorer().open(symbol);};
    API.close=function(){if(explorerInstance)explorerInstance.close();};

    function setupHostIntegration(){
      if(window.__CECP_CHORD_ENGINE_WIRED__)return;
      window.__CECP_CHORD_ENGINE_WIRED__=true;
      /* 可点击视觉反馈：不改变布局尺寸 */
      var style=document.createElement('style');
      style.id='cecp-chord-engine-style';
      style.textContent=
        '.p-chord:not(.empty){cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .12s ease}'+
        '.p-chord:not(.empty):hover{opacity:.72}'+
        '.p-chord:not(.empty):active{opacity:.5}';
      (document.head||document.documentElement).appendChild(style);
      /* 事件委托挂在 document 上（#music-library 在两个宿主中都存在，
         但挂 document 同样稳定且不依赖挂载时序），命中后按当前文本打开。 */
      document.addEventListener('click',function(e){
        var target=e.target;
        if(!target||!target.closest)return;
        var el=target.closest('.p-chord');
        if(!el||el.classList.contains('empty'))return;
        /* 用户正在选择文本时不打断 */
        var sel=window.getSelection&&window.getSelection();
        if(sel&&String(sel).length)return;
        /* 一格内可能塞了多个和弦（CECP-CHORD-STYLE 把它们各自包成一个
           .chord-chip 彩色徽章）：点在具体某个 chip 上就只取该 chip 自己的
           文本，否则永远读到整个 .p-chord 拼接文本，只能解析出第一个和弦。 */
        var chip=target.closest('.chord-chip');
        var text=cleanChordText((chip&&el.contains(chip))?chip.textContent:el.textContent);
        if(!text)return;
        var entry=getChord(text);
        if(!entry)return; /* 非和弦文本静默忽略 */
        ensureExplorer().open(text);
      });
    }
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',setupHostIntegration);
    }else{
      setupHostIntegration();
    }
  }

  return API;
})();
if(typeof window!=='undefined'){window.ChordEngine=ChordEngine;}
/* ═══════════ CECP-CHORD-ENGINE v1 END ═══════════ */
/* ═══════════ CECP-SCORE-ZOOM v1 BEGIN ═══════════
   全屏图片式查看器: 双指捏合缩放、拖动平移、点空白退出, 跟微信点图片一样。两种内容用同一套手势:
     ① 移调谱(.sw-lb-zoomable): 点谱 -> 克隆谱 DOM 放大(矢量, 放多大都清晰); 谱内点和弦照弹指法图
        (和弦点击是 CECP-CHORD-ENGINE 挂 document 的委托, 克隆后照样命中)。document 委托自动接管。
     ② 原图图片: 宿主调 window.CecpZoom.openImage(list, idx) 打开; 带上一张/下一张。
   本块在以下文件中逐字节相同(权威版本 = shared/score-zoom.js): musiclib/musiclib.js / youth-engine.js
   修改流程: 先改 shared/score-zoom.js, 再同步两处, diff 校验一致。
   自包含: 自注入 CSS + 懒建遮罩; z-index 2147481000 压在和弦图之下(点和弦时指法图弹在放大层之上)。
   谱样式在宿主里带作用域(musiclib 是 #music-library .prev-row, youth 全局), 故"谱"模式把遮罩挂进源谱的作用域根;
   "图片"模式无此依赖, 挂 body。量尺寸必须在 display 打开之后(display:none 量出来是 0)。 */
(function(){
  if(typeof document==='undefined'||window.__cecpScoreZoom)return;
  window.__cecpScoreZoom=true;
  var overlay=null,content=null,prevBtn=null,nextBtn=null,countEl=null;
  var mode='node',imgList=[],imgIdx=0,lastClose=0;
  var s=1,tx=0,ty=0,minS=1,maxS=4,natW=1,natH=1;
  var pts={},pinch=null,pan=null,down=null,dragged=false;
  function notifyHost(open){
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:'cecp-pm-score-zoom',open:!!open},'*');
    }
  }
  function injectCss(){
    if(document.getElementById('cecp-scorezoom-css'))return;
    var st=document.createElement('style');st.id='cecp-scorezoom-css';
    st.textContent=[
      '#cecp-scorezoom{position:fixed;inset:0;z-index:2147481000;display:none;overflow:hidden;background:var(--bg,#0b0f16);touch-action:none;cursor:zoom-out;-webkit-user-select:none;user-select:none;}',
      '#cecp-scorezoom.open{display:block;}',
      '#cecp-scorezoom .czoom-content{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform;width:max-content;padding:16px;box-sizing:border-box;}',
      '#cecp-scorezoom .czoom-content.czoom-img{padding:0;}',
      '#cecp-scorezoom .czoom-content.czoom-img img{display:block;max-width:none;}',
      '#cecp-scorezoom .czoom-nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:66px;border:none;border-radius:12px;background:rgba(0,0,0,.34);color:#fff;font-size:30px;line-height:1;cursor:pointer;z-index:3;display:none;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;}',
      '#cecp-scorezoom .czoom-prev{left:10px;}#cecp-scorezoom .czoom-next{right:10px;}',
      '#cecp-scorezoom .czoom-count{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:0;right:0;text-align:center;font-size:13px;letter-spacing:1px;color:rgba(255,255,255,.62);font-family:"Noto Sans SC",sans-serif;pointer-events:none;display:none;z-index:3;}',
      '#cecp-scorezoom .czoom-hint{position:absolute;left:0;right:0;bottom:calc(12px + env(safe-area-inset-bottom,0px));text-align:center;font-size:12px;letter-spacing:1px;color:var(--text3,rgba(140,140,150,.72));font-family:"Noto Sans SC",sans-serif;pointer-events:none;}',
      '.sw-lb-zoomable{cursor:zoom-in;}'
    ].join('');
    (document.head||document.documentElement).appendChild(st);
  }
  function embedViewport(){
    var css=getComputedStyle(document.documentElement);
    var top=parseFloat(css.getPropertyValue('--cecp-embed-visible-top'));
    var height=parseFloat(css.getPropertyValue('--cecp-embed-visible-height'));
    return isFinite(top)&&isFinite(height)&&height>0?{top:Math.max(0,top),height:height}:null;
  }
  function placeOverlay(){
    var box=embedViewport();
    if(box){overlay.style.inset='auto 0 auto 0';overlay.style.top=box.top+'px';overlay.style.height=box.height+'px';}
    else{overlay.style.inset='0';overlay.style.top='';overlay.style.height='';}
  }
  function viewportSize(){
    return {w:(overlay&&overlay.clientWidth)||window.innerWidth,h:(overlay&&overlay.clientHeight)||window.innerHeight};
  }
  function apply(){content.style.transform='translate('+tx+'px,'+ty+'px) scale('+s+')';}
  function clampPan(){
    var size=viewportSize(),vw=size.w,vh=size.h,w=natW*s,h=natH*s;
    if(w<=vw)tx=(vw-w)/2; else tx=Math.min(0,Math.max(vw-w,tx));
    if(h<=vh)ty=(vh-h)/2; else ty=Math.min(12,Math.max(vh-h-12,ty));
  }
  function ensure(){
    if(overlay)return; injectCss();
    overlay=document.createElement('div');overlay.id='cecp-scorezoom';
    overlay.innerHTML='<div class="czoom-content sw-lb"></div>'+
      '<button class="czoom-nav czoom-prev" type="button" aria-label="上一张">‹</button>'+
      '<button class="czoom-nav czoom-next" type="button" aria-label="下一张">›</button>'+
      '<div class="czoom-count"></div>'+
      '<div class="czoom-hint">双指缩放 · 拖动平移 · 点空白退出</div>';
    content=overlay.querySelector('.czoom-content');
    prevBtn=overlay.querySelector('.czoom-prev');nextBtn=overlay.querySelector('.czoom-next');countEl=overlay.querySelector('.czoom-count');
    prevBtn.addEventListener('click',function(e){e.stopPropagation();nav(-1);});
    nextBtn.addEventListener('click',function(e){e.stopPropagation();nav(1);});
    bind();
  }
  function isOpen(){return overlay&&overlay.classList.contains('open');}
  function fitAndCenter(){
    content.style.transform='none';
    natW=content.offsetWidth||content.scrollWidth||1;
    natH=content.offsetHeight||content.scrollHeight||1;
    var size=viewportSize(),vw=size.w,vh=size.h;
    if(mode==='image'){var f=Math.min((vw-16)/natW,(vh-64)/natH);if(!(f>0))f=1;f=Math.min(3,f);minS=f;s=f;maxS=f*4;}
    else{minS=Math.min(1,(vw-8)/natW);s=Math.max(minS,Math.min(2.4,(vw-8)/natW));maxS=Math.max(minS*4,s*4);}
    tx=0;ty=(mode==='image'?0:12);clampPan();apply();
  }
  function updateNav(){
    var multi=mode==='image'&&imgList.length>1;
    prevBtn.style.display=multi?'flex':'none';nextBtn.style.display=multi?'flex':'none';
    countEl.style.display=(mode==='image'&&imgList.length)?'block':'none';
    if(mode==='image'&&imgList.length)countEl.textContent=(imgIdx+1)+' / '+imgList.length;
  }
  function open(src){                                   // 谱模式
    ensure();
    var root=(src.closest&&src.closest('#music-library,#ym-root'))||document.body;
    if(overlay.parentNode!==root)root.appendChild(overlay);
    mode='node';imgList=[];
    var pg=src.closest&&src.closest('.sw-page');
    if(pg){
      /* CECP-A4-PAGE: 谱套在 A4 纸里时连纸一起放大——克隆整个 .sw-page
         (内联宽高 + 谱的内联 transform 都带着, 所见即所得的那张纸)。
         去掉克隆里的 sw-lb-zoomable, 免得在放大层里点谱又触发一次 open。 */
      content.className='czoom-content czoom-paper';
      content.innerHTML=pg.outerHTML;
      var zl=content.querySelector('.sw-lb-zoomable');
      if(zl)zl.classList.remove('sw-lb-zoomable');
    }else{
      content.className=('czoom-content '+src.className).replace('sw-lb-zoomable','').replace(/\s+/g,' ');
      content.innerHTML=src.innerHTML;
    }
    /* CECP-SCORE-INK: 墨迹是画在 <canvas> 上的，而 canvas 的位图不随 innerHTML 克隆走——
       克隆出来是一张空白画布，既盖在谱上吃掉指针事件(橡皮/点击退出都会失灵)，
       又让页面同时存在两个 .cecp-ink-layer(宿主按类名取节点时会取错)。
       放大器本来就是只读的图片式查看器，不需要墨迹层，直接摘掉。 */
    var inks=content.querySelectorAll('.cecp-ink-layer');
    for(var ii=0;ii<inks.length;ii++)inks[ii].parentNode.removeChild(inks[ii]);
    placeOverlay();overlay.classList.add('open');document.documentElement.style.overflow='hidden';notifyHost(true);
    updateNav();fitAndCenter();
  }
  function openImage(list,idx){                          // 图片模式(宿主调用)
    if(Date.now()-lastClose<450)return;                  // 刚点掉那次的 ghost click 别又把它打开(移动端穿透)
    ensure();
    if(overlay.parentNode!==document.body)document.body.appendChild(overlay);
    imgList=(list||[]).filter(Boolean);if(!imgList.length)return;
    mode='image';imgIdx=Math.max(0,Math.min(imgList.length-1,idx||0));
    placeOverlay();overlay.classList.add('open');document.documentElement.style.overflow='hidden';notifyHost(true);
    showImg();
  }
  function showImg(){
    content.className='czoom-content czoom-img';
    content.innerHTML='<img alt="原图">';
    var img=content.querySelector('img');
    img.onload=fitAndCenter;
    img.src=imgList[imgIdx];
    if(img.complete&&img.naturalWidth)fitAndCenter();
    updateNav();
  }
  function nav(d){if(mode!=='image'||imgList.length<2)return;imgIdx=(imgIdx+d+imgList.length)%imgList.length;showImg();}
  function close(){if(overlay){overlay.classList.remove('open');document.documentElement.style.overflow='';pts={};pinch=pan=down=null;lastClose=Date.now();notifyHost(false);}}
  function d2(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function mid(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  function zoomAt(ns,cx,cy){ns=Math.max(minS,Math.min(maxS,ns));var k=ns/s;tx=cx-(cx-tx)*k;ty=cy-(cy-ty)*k;s=ns;clampPan();apply();}
  function bind(){
    overlay.addEventListener('pointerdown',function(e){
      if(overlay.setPointerCapture)try{overlay.setPointerCapture(e.pointerId);}catch(_){}
      pts[e.pointerId]={x:e.clientX,y:e.clientY};
      var ids=Object.keys(pts);
      if(ids.length===1){pan={x:e.clientX,y:e.clientY,tx:tx,ty:ty};down={x:e.clientX,y:e.clientY,target:e.target};dragged=false;}
      else if(ids.length===2){var p=ids.map(function(i){return pts[i];});pinch={d:d2(p[0],p[1]),s:s};}
    });
    overlay.addEventListener('pointermove',function(e){
      if(!pts[e.pointerId])return;
      pts[e.pointerId]={x:e.clientX,y:e.clientY};
      var ids=Object.keys(pts);
      if(ids.length>=2&&pinch){e.preventDefault();var p=ids.map(function(i){return pts[i];});var m=mid(p[0],p[1]),r=overlay.getBoundingClientRect();zoomAt(pinch.s*(d2(p[0],p[1])/pinch.d),m.x-r.left,m.y-r.top);}
      else if(ids.length===1&&pan){var dx=e.clientX-pan.x,dy=e.clientY-pan.y;if(dragged||Math.abs(dx)>6||Math.abs(dy)>6){dragged=true;e.preventDefault();tx=pan.tx+dx;ty=pan.ty+dy;clampPan();apply();}}
    });
    function up(e){
      var single=Object.keys(pts).length===1;
      delete pts[e.pointerId];
      if(Object.keys(pts).length<2)pinch=null;
      if(Object.keys(pts).length===0){
        pan=null;
        if(single&&down&&!dragged){                     // 一次干净的点击
          var t=down.target;
          if(t&&t.closest&&(t.closest('.p-chord:not(.empty)')||t.closest('.czoom-nav'))){down=null;return;} // 和弦/翻页钮: 不退出
          close();                                       // 点空白/音符/歌词/图片 -> 退出
        }
        down=null;
      }
    }
    overlay.addEventListener('pointerup',up);
    overlay.addEventListener('pointercancel',up);
    overlay.addEventListener('dblclick',function(e){
      if(e.target.closest('.p-chord:not(.empty)')||e.target.closest('.czoom-nav'))return;e.preventDefault();
      var size=viewportSize(),fit=(mode==='image')?minS:Math.max(minS,Math.min(2.4,(size.w-8)/natW));
      if(s>fit*1.05){s=fit;tx=0;ty=(mode==='image'?0:12);clampPan();apply();}else{var r=overlay.getBoundingClientRect();zoomAt(fit*2.2,e.clientX-r.left,e.clientY-r.top);}
    });
  }
  document.addEventListener('click',function(e){       // 未放大时点谱 -> 打开(图片由宿主 openImage 触发)
    if(isOpen())return;
    if(Date.now()-lastClose<450)return;                 // 刚点掉那次的 ghost click 穿透到下层谱, 别又打开
    var t=e.target;if(!t||!t.closest)return;
    if(t.closest('.p-chord:not(.empty)'))return;
    /* CECP-SCORE-INK: 正在用笔/荧光笔/橡皮时，点谱是「画」不是「放大」。
       两道判断都要：① target 就是画布(真实点击时画布在最上层，命中的就是它)；
       ② 谱里存在一个正在吃事件的画布(pointer-events!=='none')——
       合成事件或从子节点冒上来的 click 到不了画布，只靠 ① 会漏。 */
    if(t.classList&&t.classList.contains('cecp-ink-layer'))return;
    var box=t.closest('.sw-lb-zoomable');
    if(box){
      var ink=box.querySelector('.cecp-ink-layer');
      if(ink&&getComputedStyle(ink).pointerEvents!=='none')return;
    }
    if(box&&box.textContent.trim())open(box);
  },false);
  document.addEventListener('keydown',function(e){if(!isOpen())return;if(e.key==='Escape')close();else if(mode==='image'&&e.key==='ArrowLeft')nav(-1);else if(mode==='image'&&e.key==='ArrowRight')nav(1);});
  window.addEventListener('cecp-pm-viewport-change',function(){if(isOpen()){placeOverlay();fitAndCenter();}});
  window.addEventListener('resize',function(){if(isOpen()){clampPan();apply();}});
  window.CecpZoom={openImage:openImage};               // 宿主原图 lightbox 改调这个, 体验统一
})();
/* ═══════════ CECP-SCORE-ZOOM v1 END ═══════════ */
  /* 合法和弦 token 判定（同 CECP-CHORD-STYLE chordStylePitchClass 的思路）：
     根音 A-G 须在 token 开头（允许前置括号），可跟 #/b，
     其后若为小写字母则首字母限 m/s/a/d ——
     排除写在 chord 字段里的 "Fine"/"To Chorus" 等段落标记。 */
  function isChordLikeToken(token){
    var s=String(token||'').trim();
    var i=0;
    while(i<s.length&&s.charAt(i)==='(')i++;
    var ch=s.charAt(i);
    if(ch<'A'||ch>'G')return false;
    var j=i+1;
    var nx=s.charAt(j);
    if(nx==='#'||nx==='b')j++;
    var after=s.charAt(j);
    if(after>='a'&&after<='z'&&'msad'.indexOf(after)<0)return false;
    return true;
  }
  function trChordToken(token,st,useFlat){
    var raw=String(token||'');
    if(!isChordLikeToken(raw))return raw;
    var m=raw.match(/^([A-G](?:#|b)?)([^A-G]*)(.*)$/);
    if(m&&m[1]&&!m[3]){
      var rest=m[2]||'';
      rest=rest.replace(/\/\s*([A-G](?:#|b)?)/g,function(_,bass){return '/'+trBass(bass,st,useFlat);});
      return trKeyName(m[1],st,useFlat)+rest;
    }
    return raw.replace(/(^|[^A-Za-z#b])([A-G](?:#|b)?)(maj|min|dim|aug|sus|add|m(?!aj)|[0-9+\-#b°øº⁰¹²³⁴⁵⁶⁷⁸⁹]*)(\/\s*([A-G](?:#|b)?))?(?=$|[^A-Za-z#b])/g,function(_,lead,root,suf,bassPart,bassRoot){
      var out=trKeyName(root,st,useFlat)+(suf||'');
      if(bassPart)out+='/'+trBass(bassRoot,st,useFlat);
      return lead+out;
    });
  }
  function resizeChordGap(gap,len){
    var chars=[...String(gap||'')].map(function(ch){return ch==='\u3164'?'\u3000':ch;});
    if(!chars.length||len<=0)return '';
    var out='';
    for(var i=0;i<len;i++)out+=chars[i%chars.length];
    return out;
  }
  function trChord(c,st,useFlat){
    if(!c)return c;
    var parts=String(c).split(/([ \t\u3164]+)/),out='';
    for(var i=0;i<parts.length;i++){
      var part=parts[i];
      if(!/[^\s\u3164]/.test(part)){out+=part;continue;}
      var tr=trChordToken(part,st,useFlat);
      out+=tr;
      if(i+1<parts.length&&/[ \t\u3164]+/.test(parts[i+1])){
        var gap=parts[i+1];
        var nextLen=Math.max(0,[...gap].length + ([...part].length - [...tr].length));
        if(nextLen===0 && i+2<parts.length && /[^\s\u3164]/.test(parts[i+2]))nextLen=1;
        out+=resizeChordGap(gap,nextLen);
        i++;
      }
    }
    return out;
  }
  function calcCapo(t,o){
    var target=parseKeyName(t),orig=parseKeyName(o);
    var ti=nIdx(target.root),oi=nIdx(orig.root);
    if(ti<0||oi<0)return{st:0,capo:0,playKey:t};
    var st=(ti-oi+12)%12,best=null;
    ['C','D','E','F','G','A','B'].forEach(function(pk){
      var c=(nIdx(target.root)-nIdx(pk)+12)%12;
      if(c<=7&&(!best||c<best.capo))best={playKey:pk+target.suf,capo:c};
    });
    return{st:st,capo:best?best.capo:0,playKey:best?best.playKey:t};
  }
  function stepKeyName(key,delta,useFlat){
    var parsed=parseKeyName(key),i=nIdx(parsed.root);
    if(i<0)return key;
    var roots=useFlat?['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']:CHR;
    return roots[(i+delta+120)%12]+parsed.suf;
  }
  function enharmonicKeyName(key,useFlat){
    var parsed=parseKeyName(key);
    var root=useFlat?(ENHARMONIC_FLAT[parsed.root]||parsed.root):(ENHARMONIC_SHARP[parsed.root]||parsed.root);
    return root+parsed.suf;
  }

  /* ══════════════ Song card ══════════════ */
  function buildSongCard(song) {
    var wrap = el('div', {class:'sw-wrap ym-reveal', id:'song-'+song.id});
    var curKey = song.origKey||'C';
    var preferFlat = !!FLAT_KEYS[parseKeyName(curKey).root];

    /* header */
    var kPill = el('span',{class:'sw-pill sw-kpill',text:'1 = '+curKey});
    wrap.innerHTML = '';
    var hd = div('sw-hd',[
      el('div',{},[
        el('div',{class:'sw-eyebrow',text:'敬拜诗歌'}),
        el('div',{class:'sw-title',text:song.title}),
        el('div',{class:'sw-sub',text:song.sub||''}),
        el('div',{class:'sw-pills'},[
          kPill,
          el('span',{class:'sw-pill',text:song.timeSign||'4/4'}),
          el('span',{class:'sw-pill',text:'♩ = '+(song.bpm||80)}),
        ]),
      ]),
      (function(){
        var togArrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        togArrow.setAttribute('viewBox', '0 0 24 24');
        togArrow.setAttribute('class', 'sw-tog-arrow');
        togArrow.setAttribute('aria-hidden', 'true');
        var togPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        togPath.setAttribute('d', 'M6 9l6 6l6 -6');
        togPath.setAttribute('fill', 'none');
        togPath.setAttribute('stroke', 'currentColor');
        togPath.setAttribute('stroke-width', '2');
        togPath.setAttribute('stroke-linecap', 'round');
        togPath.setAttribute('stroke-linejoin', 'round');
        togArrow.appendChild(togPath);
        return el('button',{class:'sw-tog',type:'button'},[
          document.createTextNode('移调'),
          togArrow
        ]);
      })(),
    ]);
    wrap.appendChild(hd);

    /* toggle button */
    var togBtn = hd.querySelector('.sw-tog');
    var fitRaf=0;
    /* getViewportBox 原是屏高适配(scaleY 压扁)用的,CECP-A4-PAGE 后已无消费者,保留防外部引用 */
    function getViewportBox(){
      var vv=window.visualViewport;
      return vv ? {
        width:vv.width||window.innerWidth||document.documentElement.clientWidth||0,
        height:vv.height||window.innerHeight||document.documentElement.clientHeight||0,
        offsetTop:vv.offsetTop||0
      } : {
        width:window.innerWidth||document.documentElement.clientWidth||0,
        height:window.innerHeight||document.documentElement.clientHeight||0,
        offsetTop:0
      };
    }
    /* ═══════════ CECP-A4-PAGE v1 BEGIN ═══════════
       屏幕上的移调谱按一张 A4 纸呈现，**规范 = musiclib 详情页那张「原图谱卡片」**
       （用户原话：「跟下面那个原图一样的大小的显示」）：
       ① 纸撑满所在容器的宽度(吃掉 .sw-wrap 左右 padding)，不留额外边距；
       ② 纸是 A4 比例(210:297)，整首歌完整装在这一张上；纸比屏幕高就上下滚，
          字小就点谱放大(CECP-SCORE-ZOOM 连纸一起放大)；
       ③ 内容在纸内**等比**缩放(scale 单参数)，绝不出现 scale(x,y) 压扁；
       ④ 内容不够高时把行与行的间距均匀撑开填满整页(只动行距，字号/对位一律不变)。
       ⚠️ 「纸」是 lbDiv **外面**新套的 .sw-page —— 导出(buildExportClone)只克隆
          lbDiv 本身(克隆里已清撑行距的 paddingBottom)，故导出不受影响。
       ⚠️ 与 [[strict-arc-fit-order]] 的顺序约束不冲突：撑开行距只加纵向 padding，
          在梁/弧布局**之后**做，不改任何行内水平坐标(弧线挂在各自 .sw-lrow 里随行走)。
       与 musiclib 逐条同款(仅 CSS 前缀/变量名按各自宿主)。 */
    var A4_RATIO=297/210;        // 1.41428…
    var PAGE_MX=12,PAGE_MY=12;   // 纸内页边距(lbDiv 自己还有 8/18/16/8 的 padding,叠加后=页边距)
    var SPREAD_MAX=0.9;          // 每个行间隙最多再撑开 0.9×平均行高(防两行歌被拉散)
    /* v2「压紧+拉宽」用的两个上限，见下面 fitRows 里的注释 */
    var STRETCH_MAX=1.6;         // 行最多拉到自然宽的 1.6 倍(再宽音符就散成一盘沙)
    var STRETCH_RATIO=0.45;      // 拉宽时的短行门槛：不到目标宽 45% 的行保持左对齐(尾句不跟着拉)
    function ensureScorePageCss(){
      if(document.getElementById('ye-a4-page-css'))return;
      var st=document.createElement('style');
      st.id='ye-a4-page-css';
      /* 纸永远是浅色 → 纸内把取色变量钉回浅色值(youth 谱面用 --ym-ink/--ym-ink3/
         --ym-border/--ym-capo)，并把和弦强制用浅色主题的文字色(否则深色模式下共享块给的
         浅色字压在浅纸上看不见)。2026-08 和弦去掉底色/描边后，这里也只剩 color。 */
      var chip='',i,h;
      for(i=0;i<12;i++){
        h=chordStyleHue(i);
        // The paper stays light even when the host/system is dark; outrank the shared dark selector.
        chip+='.sw-page .p-chord .chord-chip.chord-pc'+i+'{color:hsl('+h+',90%,20%);}';
      }
      st.textContent=[
        '.sw-page{position:relative;box-sizing:border-box;margin:0 0 14px;overflow:hidden;',
        'background:#f7f4ee;color:#241C17;border:1px solid #E9E0D8;border-radius:8px;',
        '--ym-ink:#241C17;--ym-ink2:#6F655D;--ym-ink3:#9A8F85;--ym-border:#E1D8CE;--ym-capo:#1C5AA6;--ym-chord-ink:#1C5AA6;}',
        'html[data-resolved-theme="dark"] .sw-page{background:#f4efe7;',
        'box-shadow:0 12px 32px rgba(0,0,0,.24);}',
        '@media (prefers-color-scheme:dark){html:not([data-resolved-theme="light"]) .sw-page{',
        'background:#f4efe7;box-shadow:0 12px 32px rgba(0,0,0,.24);}}',
        '.sw-page>.sw-lb{background:transparent !important;}',
        /* CECP-A4-PAGE v2：长歌压紧纵向留白(只在纸里、只在高瘦歌上加 .sw-a4-tight)。
           一律 (0,4,0) 特异度 —— 要压得过严格模式那套 .prev-seg.p-slot .p-lyric (0,3,0)。
           只动留白不动字号：字号在这里改是白改，fitRows 随后会按比例缩放，改了等于没改。
           ⚠️ 规则挂在 .sw-page 下 → 导出克隆(搬到纸外面)天然不受影响，跟撑行距那条一样。 */
        '.sw-page .sw-lb.sw-a4-tight .p-lyric{min-height:var(--row-lyric-height,0px);line-height:1.12;}',
        '.sw-page .sw-lb.sw-a4-tight .p-lyric2,.sw-page .sw-lb.sw-a4-tight .p-lyric3,.sw-page .sw-lb.sw-a4-tight .p-lyric4{margin-top:0;}',
        '.sw-page .sw-lb.sw-a4-tight .p-chord{line-height:1.05;}',
        '.sw-page .sw-lb.sw-a4-tight .sw-lline{margin-bottom:4px;}',
        '.sw-page .sw-lb.sw-a4-tight .sw-lsec{margin-bottom:10px;}',
        '.sw-page .sw-lb.sw-a4-tight .sw-lsec-name{margin-bottom:4px;}',
        '.sw-page .sw-lb.sw-a4-tight .prev-row.has-volta{--volta-rail:0px;}'
      ].join('')+chip;
      document.head.appendChild(st);
    }
    function ensureScorePage(){
      ensureScorePageCss();
      var pg=lbDiv.parentElement;
      if(pg&&pg.classList&&pg.classList.contains('sw-page'))return pg;
      /* 纸挂在 panel 下(panelInner 的弟弟)而不是 panelInner 里：panelInner 是
         overflow:hidden 的卡片，纸要比它宽会被裁。 */
      pg=document.createElement('div');
      pg.className='sw-page';
      panel.appendChild(pg);
      pg.appendChild(lbDiv);
      return pg;
    }
    /* 把 slack 像素均匀分到行与行之间(用 paddingBottom,不覆盖 CSS 的 margin 规则)。
       幂等：每次先清空再重设，所以可以反复调用来逼近目标高度。 */
    function spreadScoreLines(slack){
      var lines=lbDiv.querySelectorAll('.sw-lline');
      var n=lines.length,i;
      for(i=0;i<n;i++)lines[i].style.paddingBottom='';
      if(n<2||!(slack>1))return 0;
      var sum=0;
      for(i=0;i<n;i++)sum+=lines[i].offsetHeight||0;
      var avg=sum/n;
      if(!(avg>0))return 0;
      var gaps=n-1;
      var per=Math.min(slack/gaps,avg*SPREAD_MAX);
      if(!(per>0.5))return 0;
      for(i=0;i<gaps;i++)lines[i].style.paddingBottom=per.toFixed(2)+'px';
      return per*gaps;
    }
    /* 把内容高度撑到 target(未缩放坐标)。
       ⚠️ 不能靠「加了多少 padding 就长多少」来预测：给「段落里最后一行」加 padding 会
          解开它与 .sw-lsec 之间的外边距合并，scrollHeight 会多涨一截(实测 4 段歌多 60px)。
          所以撑一次 → 实测 → 按差额回收一次，第二次就精确落在 target。 */
    function fillScoreHeight(base,target){
      if(!(target-base>1))return base;
      spreadScoreLines(target-base);
      var got=lbDiv.scrollHeight||base;
      var over=got-target;
      if(over>0.5){
        spreadScoreLines(target-base-over);
        got=lbDiv.scrollHeight||base;
      }
      return got;
    }
    /* 行内附加物重排：严格模式的梁/弧、老格式的段落标记。
       行宽或行高一变(justify 拉宽、压紧留白、移调重渲染)就得重来一遍，
       ⚠️ 且必须排在 measureNaturalScore() 之后 —— 那时 lbDiv 才被撑到自然宽，
          在那之前行还被容器挤着，量到的音位坐标是压扁的([[strict-arc-fit-order]])。
       返回重排后的内容高度(弧线会给和弦加 marginBottom，行会变高)。 */
    function relayoutRowExtras(){
      if(song.align==='strict'){
        lbDiv.querySelectorAll('.sw-lrow').forEach(connectStrictBeams);
      }else{
        var _sl=lbDiv.querySelectorAll('.sec-label-holder');
        Array.prototype.forEach.call(_sl,function(h){ if(h.cecpPlaceSecLabel)h.cecpPlaceSecLabel(); });
      }
      layoutStrictArcsAll(lbDiv);
      positionVoltaRails(lbDiv);
      return lbDiv.scrollHeight||0;
    }
    /* ═══════════ CECP-A4-PAGE v1 END ═══════════ */
    function resetScoreFit(){
      lbDiv.style.transform='';
      lbDiv.style.transformOrigin='';
      lbDiv.style.width='';
      lbDiv.style.marginBottom='';
      lbDiv.style.padding='8px 18px 16px 8px';
      lbDiv.style.boxSizing='border-box';
      lbDiv.classList.remove('sw-a4-tight');   // v2 压紧幂等：每次 fit 都从松的基线重新判断
      secLabelsReset(lbDiv);                   // 段落标记回到作者拖的原始 dx/dy(同上，防补偿量叠加)
      var _ll=lbDiv.querySelectorAll('.sw-lline');
      for(var i=0;i<_ll.length;i++)_ll[i].style.paddingBottom='';
      var pg=lbDiv.parentElement;
      if(pg&&pg.classList&&pg.classList.contains('sw-page')){pg.style.width='';pg.style.height='';}
      justifyScoreRowsClear(lbDiv);
      if(lbDiv.parentElement)lbDiv.parentElement.style.overflow='hidden';
    }
  /* Keep the ending rail between chords and notes, in unscaled layout coordinates. */
  function positionVoltaRails(scope){scoreLayoutChordRows(scope);
  }
    function normalizePreviewRowHeights(){
      lbDiv.querySelectorAll('.prev-row').forEach(function(row){
        row.style.setProperty('--row-note-height','0px');
        var maxH=0;
        row.querySelectorAll('.p-n').forEach(function(noteLane){
          maxH=Math.max(maxH,Math.ceil(noteLane.getBoundingClientRect().height||0));
        });
        if(maxH)row.style.setProperty('--row-note-height',maxH+'px');
      });
    }
    function measureNaturalScore(){
      var maxW=0;
      lbDiv.querySelectorAll('.sw-lrow').forEach(function(row){
        var prevDisplay=row.style.display;
        row.style.display='inline-flex';
        if(row.scrollWidth>maxW)maxW=row.scrollWidth;
        row.style.display=prevDisplay;
      });
      if(!maxW)return null;
      var naturalWidth=maxW+24;
      lbDiv.style.width=naturalWidth+'px';
      var naturalHeight=lbDiv.scrollHeight;
      if(!naturalHeight)return null;
      return { width:naturalWidth,height:naturalHeight };
    }
    function scheduleFitRows(){
      cancelAnimationFrame(fitRaf);
      fitRaf=requestAnimationFrame(function(){
        fitRaf=0;
        fitRows();
      });
    }

    togBtn.addEventListener('click', function(){
      panel.classList.toggle('open');
      togBtn.classList.toggle('on', panel.classList.contains('open'));
      scheduleFitRows();
    });

    /* transpose panel */
    var kg     = div('sw-kg');
    var quickKeys = div('sw-kg sw-key-actions');
    var capoEl = div('sw-capo plain',[
      el('div',{style:'font-size:15px;flex-shrink:0',text:'🎸'}),
      el('div',{style:'flex:1'},[
        el('div',{class:'sw-capo-t'}),
        el('div',{class:'sw-capo-s'}),
      ]),
      el('div',{class:'sw-capo-n'}),
    ]);
    var lbDiv  = div('sw-lb sw-lb-zoomable');
    var panelInner = div('sw-panel-inner',[div('sw-ks',[el('div',{class:'sw-slabel',text:'目标调'}),quickKeys,kg]),capoEl,lbDiv]);
    var panel  = div('sw-panel',[panelInner]);
    wrap.appendChild(panel);

    function setCurrentKey(nextKey,flatMode){
      if(flatMode!==undefined)preferFlat=flatMode;
      curKey=nextKey;
      renderKeyButtons();
      renderScore();
    }
    function addQuickKey(label,handler){
      var b=el('button',{class:'sw-kb',type:'button',text:label});
      b.addEventListener('click',handler);
      quickKeys.appendChild(b);
      return b;
    }
    addQuickKey('-1',function(){setCurrentKey(stepKeyName(curKey,-1,preferFlat));});
    addQuickKey('原调',function(){setCurrentKey(song.origKey||'C',!!FLAT_KEYS[parseKeyName(song.origKey||'C').root]);});
    addQuickKey('+1',function(){setCurrentKey(stepKeyName(curKey,1,preferFlat));});
    var enharmBtn=addQuickKey(preferFlat?'♭':'#',function(){
      preferFlat=!preferFlat;
      curKey=enharmonicKeyName(curKey,preferFlat);
      enharmBtn.textContent=preferFlat?'♭':'#';
      setCurrentKey(curKey,preferFlat);
    });
    function renderKeyButtons(){
      kg.innerHTML='';
      var keys=preferFlat?KEY_SET_FLAT:KEY_SET_SHARP;
      keys.forEach(function(k){
        var b = el('button',{class:'sw-kb'+(k===curKey?' on':''),type:'button',text:k});
        b.addEventListener('click',function(){setCurrentKey(k,preferFlat);});
        kg.appendChild(b);
      });
      enharmBtn.textContent=preferFlat?'♭':'#';
    }
    renderKeyButtons();

    /* tools row */
    var exportBtn = el('button',{class:'sw-export-btn',type:'button','aria-label':'下载图片'});
    function setExportButtonState(label){
      exportBtn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11"></path><path d="m7 10 5 5 5-5"></path><path d="M5 20h14"></path></svg>' +
        '<span>' + label + '</span>';
    }
    setExportButtonState('下载图片');

    var ytBtn = el('a',{class:'yt-btn',href:song.youtube||'#',target:'_blank',title:'YouTube',
      rel:'noopener noreferrer',
      'aria-label':'打开 YouTube',
      html:'<svg viewBox="0 0 24 24" aria-hidden="true"><path class="yt-screen" d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A22 22 0 0 0 2 12a22 22 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A22 22 0 0 0 22 12a22 22 0 0 0-.4-4.8z"></path><path class="yt-play" d="M10.2 8.8v6.4l5.4-3.2-5.4-3.2z"></path></svg>'
    });

    var metroDiv = buildMetro(song.bpm || 80);
    var toolsRow = div('sw-tools-row',[exportBtn, ytBtn, metroDiv]);

    /* youth 不做谱面自由笔记（用户明确不需要）：这里仍是原来的歌词荧光笔。
       墨迹那一套只在 musiclib 有；CECP-SCORE-INK 块也没有装进 youth。 */
    toolsRow.appendChild(lyricHlCreateController(lbDiv,function(){return song.id;}));
    wrap.appendChild(div('sw-tools',[toolsRow]));

    /* score image */
    var scoreKeyBadge = el('span',{class:'sw-score-key sw-score-key-badge',text:'1 = '+curKey});
    var img = el('img',{src:song.scoreImg||'', alt:'简谱'});
    img.addEventListener('error', function(){ img.style.display='none'; placeholder.style.display='block'; });
    var placeholder = el('div',{class:'sw-score-ph',text:'📄 歌谱上传后自动显示',style:'display:none'});
    var scoreDiv = div('sw-score',[
      div('sw-score-top',[el('div',{class:'sw-score-lbl',text:'简谱原稿'}), scoreKeyBadge]),
      img, placeholder,
    ]);
    wrap.appendChild(scoreDiv);

    /* jianpu render */
    /* ── 严格对位（align:"strict"）渲染分支 ──────────────────────────────
       复用现有字形原语（parseJpToken/makeBarline/makeTimeSignature）+ CecpStrictAlign，
       不另建渲染器；每个音位渲染成独立列（和弦/简谱/歌词三层居中共轴）。
       老分支完全不动。弧线/连音（( ) {3 } ~）Phase 2 先跳过，Phase 4 再补。 */
    function ensureStrictCss(){
      if(document.getElementById('ye-strict-css'))return;
      var s=document.createElement('style');s.id='ye-strict-css';
      s.textContent=[
        /* font-size 必须钉死：严格模式里 .jp-wrap{min-width:1em}、标点间隙等都是 em，
           而各宿主的环境字号不同(youth 页面 18px / musiclib 16px)，不钉的话同一首歌
           每列宽差 2.4px，几十个音位累积下来整行差近百 px → 缩放不同 → 段落位置对不上。 */
        '.prev-seg.p-slot{align-items:center !important;font-size:16px;min-width:19.2px;margin:0 2px;}',
        /* CECP-CHORD-FIT：和弦零宽，完全不参与列宽（长和弦不再撑开数字间距）。
           前两个字对中(=老版位置)，第三个字起零宽悬挂向右延伸；字号一律不变。 */
        '.prev-seg.p-slot .p-chord{min-width:0;width:0;overflow:visible;white-space:pre;display:flex;flex-direction:row;justify-content:center;align-items:flex-end;font-size:16px;min-height:17px;}',
        '.prev-seg.p-slot .p-chord > *{flex:0 0 auto;}',   /* musiclib 有 #music-library *{min-width:0} 全局 reset，不写这条 chord-chip 会被压成 0 宽 */
        '.prev-seg.p-slot .p-chord .p-chord-head{white-space:pre;}',
        '.prev-seg.p-slot .p-chord .p-chord-tail{display:inline-block;width:0;min-width:0;overflow:visible;white-space:pre;}',
        '.prev-seg.p-slot .p-chord.p-chord-mid .p-chord-tail{width:auto;}',
        '.prev-seg.p-slot.cf-tight{margin-left:0;margin-right:0;min-width:14.4px;}',   /* 连续>=4个空歌词音位:横向占位收紧约三成 */
        '.prev-seg.p-slot:has(.jp-aug){margin-right:11px;}',   /* 附点是零宽绝对定位的,会贴到下一个音;给这一列补出间距,免得看不出点属于哪个音 */
        '.prev-seg.p-slot.cf-tight[data-bb]{margin-right:8px;}',   /* 收紧不能把断梁的断口也压没了 —— 没写歌词时梁缝会变 0，断梁等于白写 */
        '.prev-seg.p-slot .p-chord.p-chord-multi{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:1px;line-height:1.1;}',
        '.prev-seg.p-slot .p-chord-multi .p-chord-stk{display:block;line-height:1.2;}',
        /* 叠和弦(上下两个)跟单和弦一样大：以前压到 .85em 是为了塞下两行，
           零宽之后宽度不成问题，小一号反而像写错了 */
        '.prev-seg.p-slot .p-chord-multi .chord-chip{font-size:1em;}',
        '.prev-seg.p-slot .p-lyric{min-height:var(--row-lyric-height,0px);text-align:center;padding:0 1px;}',
        '.prev-seg.p-slot .p-lyric .p-punct{display:inline-block;width:0;overflow:visible;white-space:pre;pointer-events:none;}',
        '.prev-seg.p-slot.p-punct-gap{margin-right:8px;}',
        '.prev-seg.p-barslot{min-width:0;margin:0 3px;}',
        '.strict-label-row{display:block;margin:0 0 2px;line-height:1;}'
      ].join('');
      document.head.appendChild(s);
    }
    var STRICT_BARS={'|':1,'||':1,'||/':1,'|]':1,'|:':1,':|':1,'|:|':1,'fine':1,'dc':1,'ds':1,'coda':1,'segno':1};
    function buildStrictSegColumns(seg, st, useFlat, bold, container){
      ensureStrictCss();
      var toks=CecpStrictAlign.tokenizeN(seg.n||'');
      var lyricFields=[seg.lyric||''];
      if(seg.lyric2!=null)lyricFields.push(seg.lyric2);
      if(seg.lyric3!=null)lyricFields.push(seg.lyric3);
      if(seg.lyric4!=null)lyricFields.push(seg.lyric4);
      var aligned=CecpStrictAlign.alignRow(seg.n||'', seg.chord||'', lyricFields);
      var slot=0, pendingSlurOpen=0, pendingSlurClose=0, pendingTupletN=0, lastSlotCol=null;
      toks.forEach(function(tok){
        if(tok==='!'){var lc=container.lastElementChild;if(lc)lc.setAttribute('data-bb','1');return;}  // 断梁标记：让前一音位不与后邻连梁
        var _nnav=noteNavOf(tok);if(_nnav){attachNoteNavMark(container.lastElementChild,_nnav);return;}   // *coda/*segno/… 挂在前一个音位的音符上方
        if(CecpStrictAlign.isDualAtom(tok)){
          var col=div('prev-seg p-slot');
          if(pendingSlurOpen){col.setAttribute('data-slur-open',pendingSlurOpen);pendingSlurOpen=0;}
          var _isSp=(tok==='sp'||tok==='sp_'||tok==='sp__');if(_isSp)col.setAttribute('data-sp','1');
      if(pendingSlurClose&&!_isSp){col.setAttribute('data-tie-close',((+col.getAttribute('data-tie-close'))||0)+pendingSlurClose);pendingSlurClose=0;}   // ~ 收口跳过 sp(同老版 layoutJpArcs：原子不含 sp)   // ~ 连音收口在下一音位
          if(pendingTupletN){col.setAttribute('data-tuplet-open',pendingTupletN);pendingTupletN=0;}
          var chVal=aligned.chords[slot];
          var c=div('p-chord'+(chVal?'':' empty'));
          if(chVal){
            var stack=CecpStrictAlign.splitChordStack(chVal);      // [下,上]
            if(stack.length<=1){
              setChordContentEx(c, trChordEx(chVal,st,useFlat,trChord), setChordContent);
              chordChipDecorate(c);
            } else {
              c.classList.add('p-chord-multi');
              stack.slice().reverse().forEach(function(sym){        // DOM 由上到下
                var ln=div('p-chord-stk');
                setChordContentEx(ln, trChordEx(sym,st,useFlat,trChord), setChordContent);
                chordChipDecorate(ln);
                c.appendChild(ln);
              });
            }
          } else {
            setChordContentEx(c,' ',setChordContent);
          }
          chordFitPrepare(c);      // CECP-CHORD-FIT：拆成「前两字(对中) + 尾巴(零宽右延伸)」
          col.appendChild(c);
          var nWrap=div('p-n');nWrap.appendChild(parseJpToken(tok));col.appendChild(nWrap);
          aligned.lyrics.forEach(function(arr,j){
            var lv=arr[slot];
            var l=div('p-lyric'+(j?' p-lyric'+(j+1):'')+(bold?' bold':''));
            if(lv==null){ setLyricContentEx(l,' ',setLyricContent); }
            else {
              var lsp=CecpStrictAlign.splitTrailingPunct(lv);   // 标点永远悬挂：对中点保留在字上；列级 p-punct-gap 在标点后留空隙防撞后字
              if(lsp.punct){
                setLyricContentEx(l, normLyricText(lsp.base||' '), setLyricContent);
                var pun=document.createElement('span');pun.className='p-punct';pun.textContent=lsp.punct;l.appendChild(pun);
              } else { setLyricContentEx(l, normLyricText(lv), setLyricContent); }
            }
            col.appendChild(l);
          });
          if(col.querySelector('.p-punct'))col.classList.add('p-punct-gap');   // 悬挂标点后留一点空间
          container.appendChild(col);
          slot++;lastSlotCol=col;
        } else if(isBarlineTok(tok)){
          var b=div('prev-seg p-slot p-barslot');
          var bc=div('p-chord empty');setChordContentEx(bc,' ',setChordContent);b.appendChild(bc);
          var bn=div('p-n');bn.appendChild(makeBarline(tok));b.appendChild(bn);
          aligned.lyrics.forEach(function(_,j){var bl=div('p-lyric'+(j?' p-lyric'+(j+1):'')+(bold?' bold':''));setLyricContentEx(bl,' ',setLyricContent);b.appendChild(bl);});
          container.appendChild(b);
        } else if(extractInlineTimeSignToken(tok)){
          var t=div('prev-seg p-slot p-barslot');
          var tc=div('p-chord empty');t.appendChild(tc);
          var tn=div('p-n');tn.appendChild(makeTimeSignature(extractInlineTimeSignToken(tok)));t.appendChild(tn);
          aligned.lyrics.forEach(function(_,j){var tl=div('p-lyric'+(j?' p-lyric'+(j+1):'')+(bold?' bold':''));setLyricContentEx(tl,' ',setLyricContent);t.appendChild(tl);});
          container.appendChild(t);
        } else if(tok==='('||tok==='(['){ pendingSlurOpen++; }
        else if(tok===')'||tok==='])'){ if(lastSlotCol)lastSlotCol.setAttribute('data-slur-close',((+lastSlotCol.getAttribute('data-slur-close'))||0)+1); }
        else if(tok==='{3'||tok==='{5'){ pendingTupletN=parseInt(tok.slice(1),10); }
        else if(tok==='}'){ if(lastSlotCol)lastSlotCol.setAttribute('data-tuplet-close','1'); }
        else if(tok.charAt(0)==='~'){   // 连音 ~ / ~2 / ~3：从往回第 k 个音位开弧，下一音位收弧（复用 slur 弧机制）
          var tieSpan=jpTieSpan(tok)||1;
          var tieCols=[].slice.call(container.querySelectorAll('.prev-seg.p-slot')).filter(function(c){return !c.classList.contains('p-barslot')&&!c.getAttribute('data-sp');});
          var tieStart=tieCols[tieCols.length-tieSpan];
          if(tieStart){tieStart.setAttribute('data-tie-open',((+tieStart.getAttribute('data-tie-open'))||0)+1);pendingSlurClose++;}
        }
        // 跨行 [( ]) 已支持；( ){3}~ 已画弧/括号
      });
    }

    function renderScore(){
      var info = calcCapo(curKey, song.origKey||'C'), st = info.st, useFlat = preferFlat;
      kPill.textContent = '1 = ' + curKey;
      scoreKeyBadge.textContent = '1 = ' + curKey;

      if(curKey === (song.origKey||'C')){
        capoEl.className='sw-capo plain';
        capoEl.querySelector('.sw-capo-t').textContent='原调演奏';
        capoEl.querySelector('.sw-capo-s').textContent='不需要变调夹';
        capoEl.querySelector('.sw-capo-n').textContent='—';
      } else if(info.capo===0){
        capoEl.className='sw-capo plain';
        capoEl.querySelector('.sw-capo-t').textContent='不需要变调夹';
        capoEl.querySelector('.sw-capo-s').textContent='按 '+info.playKey+' 调指法演奏';
        capoEl.querySelector('.sw-capo-n').textContent='开放';
      } else {
        capoEl.className='sw-capo';
        capoEl.querySelector('.sw-capo-t').textContent='变调夹夹第 '+info.capo+' 格';
        capoEl.querySelector('.sw-capo-s').textContent='按 '+info.playKey+' 调指法 → 实际 '+curKey;
        capoEl.querySelector('.sw-capo-n').textContent=info.capo;
      }

      lbDiv.innerHTML = '';
      (song.sections||[]).forEach(function(sec){
        var se=div('sw-lsec');
        var sn=div('sw-lsec-name');sn.textContent=sec.name;se.appendChild(sn);
        (sec.lines||[]).forEach(function(line){
          var le=div('sw-lline');
          var row=div('sw-lrow prev-row'+((!Array.isArray(line)&&line.b)?' bold':''));
          var segs=Array.isArray(line)?line:(line.line||[]);
          var voltaWrap=null;
          segs.forEach(function(seg){
            if(!segIsRenderableBlock(seg))return;
            if(segIsLabelBlock(seg)){
              if(song.align==='strict'){   // 严格模式：段落标记独立一行(不与弧线/和弦挤)
                var lw=div('strict-label-row');
                var lh=segRenderLabelBlock(seg,row);
                var ltag=lh.querySelector('.sec-label');
                if(ltag){ltag.style.position='relative';ltag.style.top=((Number(seg.dy)||0))+'px';ltag.style.fontSize='13px';lw.appendChild(ltag);}
                else lw.appendChild(lh);
                le.appendChild(lw);
                return;
              }
              (voltaWrap||row).appendChild(segRenderLabelBlock(seg,row));return;
            }
            if(song.align==='strict'){
              var _vs=getVoltaStartLabel(seg.n);
              if(_vs){row.classList.add('has-volta');voltaWrap=document.createElement('span');voltaWrap.className='prev-volta';voltaWrap.setAttribute('data-v',_vs+'.');}
              buildStrictSegColumns(seg, st, useFlat, (!Array.isArray(line)&&line.b), voltaWrap||row);
              if(voltaWrap&&hasVoltaEnd(seg.n)){voltaWrap.classList.add('closed');row.appendChild(voltaWrap);voltaWrap=null;}
              return;
            }
            var s=div('prev-seg');
            var c=div('p-chord'+(seg.chord?'':' empty'));
            setChordContentEx(c,seg.chord?trChordEx(seg.chord,st,useFlat,trChord):'\u00a0',setChordContent);
            chordChipDecorate(c);
            s.appendChild(c);
            s.appendChild(renderNStr(seg.n||'',{inlineTimeSign:getSegInlineTimeSign(seg)}));
            var l=div('p-lyric'+((!Array.isArray(line)&&line.b)?' bold':''));setLyricContentEx(l,normLyricText(seg.lyric),setLyricContent);s.appendChild(l);
            if(seg.lyric2){var l2=div('p-lyric p-lyric2'+((!Array.isArray(line)&&line.b)?' bold':''));setLyricContentEx(l2,normLyricText(seg.lyric2),setLyricContent);s.appendChild(l2);}
            if(seg.lyric3){var l3=div('p-lyric p-lyric3'+((!Array.isArray(line)&&line.b)?' bold':''));setLyricContentEx(l3,normLyricText(seg.lyric3),setLyricContent);s.appendChild(l3);}
            if(seg.lyric4){var l4=div('p-lyric p-lyric4'+((!Array.isArray(line)&&line.b)?' bold':''));setLyricContentEx(l4,normLyricText(seg.lyric4),setLyricContent);s.appendChild(l4);}
            var _vn=getVoltaStartLabel(seg.n);
            if(_vn){
              row.classList.add('has-volta');
              voltaWrap=document.createElement('span');
              voltaWrap.className='prev-volta';
              voltaWrap.setAttribute('data-v',_vn+'.');
            }
            (voltaWrap||row).appendChild(s);
            if(voltaWrap&&hasVoltaEnd(seg.n)){voltaWrap.classList.add('closed');row.appendChild(voltaWrap);voltaWrap=null;}
          });
          if(voltaWrap)row.appendChild(voltaWrap);
          le.appendChild(row); se.appendChild(le);
        });
        lbDiv.appendChild(se);
      });
      lyricHlApply(lbDiv,song.id);
      scheduleFitRows();
    }
    function fitRows(){
      if(!lbDiv.isConnected||!lbDiv.parentNode)return;
      var pageEl=ensureScorePage();       // 幂等：把 lbDiv 套进 .sw-page（A4 纸）
      /* 纸要撑满卡片全宽：把 .sw-wrap 的左右 padding 吃掉(panel 负 margin)，
         panelInner 补回同样的正 margin 保持原宽。数值实测取自 computed style，各断点自动跟。 */
      var wrapEl=panel.parentElement;
      if(wrapEl){
        var wcs=getComputedStyle(wrapEl);
        var padL=parseFloat(wcs.paddingLeft)||0,padR=parseFloat(wcs.paddingRight)||0;
        panel.style.marginLeft=(-padL)+'px';panel.style.marginRight=(-padR)+'px';
        panelInner.style.marginLeft=padL+'px';panelInner.style.marginRight=padR+'px';
      }
      var host=panel;                     // 纸的宽度基准 = 撑到 wrap 全宽的 panel
      resetScoreFit();
      normalizePreviewRowHeights();

      /* CECP-CHORD-FIT：和弦避让排在 justify 之前 —— 它会给个别列加 padding，
         justify 与 measureNaturalScore 都得把这些 padding 算进行宽里。
         它内部逐行临时 display:inline-flex 量自然宽，所以不受容器挤压影响。 */
      if(song.align==='strict')layoutStrictChordsAll(lbDiv);
      if(YE_JUSTIFY_ROWS)justifyScoreRows(lbDiv.querySelectorAll('.sw-lrow'));
      var natural=measureNaturalScore();
      if(!natural)return;
      natural.height=relayoutRowExtras()||natural.height;   // 梁/弧(或段落标记)——见函数上的顺序警告

      /* ── CECP-A4-PAGE：纸撑满容器宽(同原图卡片)，正好一张 A4，整首歌装在这一张上 ── */
      var pageW=Math.max(1,host.clientWidth||natural.width);
      var pageH=pageW*A4_RATIO;
      var cw=Math.max(1,pageW-PAGE_MX*2);
      var ch=Math.max(1,pageH-PAGE_MY*2);

      /* ── CECP-A4-PAGE v2：长歌「先压紧、再拉宽」 ──
         高瘦的歌(行数多、每行还叠着和弦和三四段歌词)是**以高定缩放**：纸的高度用满了，
         宽度却剩一大截白边，整首谱被缩得很小(怜悯的爱实测只占纸宽 71%，两边各留 15%)。
         把这截白边换成谱面，两步：
         ① 压紧纵向留白(.sw-a4-tight：歌词行距/和弦行高/行间距/段落间距/反复记号轨)——
            只动留白不动字号，同一张纸于是能装下更大的谱；
         ② 还剩白边就把每行拉宽到刚好填满纸宽(justify 的 targetWidth，音位间距均匀变大)，
            跟原图谱一样满幅；最多拉到自然宽的 STRETCH_MAX 倍，再宽音符就散了。
         矮胖的歌(以宽定缩放)一步都不走，仍旧是原来的「行距撑开填页」；
         压紧之后若反过来变成以宽定缩放，剩下的高度也照旧由 fillScoreHeight 撑回行距里
         —— 留白从行内挪到行与行之间，正是它该待的地方。 */
      if(natural.width*ch<natural.height*cw){
        var labelMarks=secLabelsSnapshot(lbDiv);  // 压紧/拉宽前记下段落标记指着哪一拍、离音符多高
        lbDiv.classList.add('sw-a4-tight');
        var tightNat=measureNaturalScore();
        if(tightNat)natural=tightNat;
        natural.height=relayoutRowExtras()||natural.height;
        var targetW=Math.min(natural.height*cw/ch,natural.width*STRETCH_MAX);
        if(YE_JUSTIFY_ROWS&&targetW>natural.width+1){
          justifyScoreRows(lbDiv.querySelectorAll('.sw-lrow'),{targetWidth:targetW,ratio:STRETCH_RATIO});
          var wideNat=measureNaturalScore();
          if(wideNat)natural=wideNat;
          natural.height=relayoutRowExtras()||natural.height;
        }
        secLabelsRestore(labelMarks);          // 段落标记放回原来那一拍(只动 relative 定位，不影响排版)
      }

      /* 单参数 scale = 等比：横竖同一个比例，简谱/和弦/歌词的形状与对位一律不变。
         min(宽比,高比) → 整首歌完整落在这一张 A4 里，跟 musiclib 原图谱一样的看法：
         纸比屏幕高就上下滚，字小就点谱放大(CECP-SCORE-ZOOM)。 */
      var scale=Math.min(cw/natural.width,ch/natural.height);
      if(!isFinite(scale)||scale<=0)scale=1;

      // 内容不够高：把剩下的高度均匀撑到行与行之间（字号不动），把整页填满
      natural.height=fillScoreHeight(natural.height,ch/scale);

      pageEl.style.width=pageW.toFixed(1)+'px';
      pageEl.style.height=pageH.toFixed(1)+'px';
      var offX=PAGE_MX+Math.max(0,(cw-natural.width*scale)/2);
      var offY=PAGE_MY+Math.max(0,(ch-natural.height*scale)/2);
      lbDiv.style.transformOrigin='left top';
      lbDiv.style.transform='translate('+offX.toFixed(1)+'px,'+offY.toFixed(1)+'px) scale('+scale+')';
      lbDiv.style.width=natural.width+'px';
    }

    exportBtn.addEventListener('click',function(){
      if(exportBtn.disabled) return;
      exportBtn.disabled=true;
      exportBtn.style.opacity='.65';
      setExportButtonState('生成中...');
      var exportOpts={
        title:song.title||'transpose',
        key:curKey,
        song:song,
        a4:true,
        bgColor:'#ffffff',
        tight:true,
        width:Math.max(560,Math.ceil(wrap.getBoundingClientRect().width||0)||900)
      };
      exportSongAsFittedPng(lbDiv,exportOpts).catch(function(err){
        try{ console.warn('[YouthEngine] fitted export failed, fallback to legacy single image',err); }catch(_){}
        return exportTransposePanel(lbDiv,exportOpts);
      }).then(function(){
        setExportButtonState('已下载');
      }).catch(function(err){
        setExportButtonState('下载失败');
        try{ console.error('[YouthEngine] export transpose image failed',err); }catch(_){}
      }).finally(function(){
        setTimeout(function(){
          exportBtn.disabled=false;
          exportBtn.style.opacity='';
          setExportButtonState('下载图片');
        },1200);
      });
    });

    renderScore();
    scheduleFitRows();
    var onViewportChange=function(){ scheduleFitRows(); };
    var onPanelTransitionEnd=function(e){
      if(e.target===panel&&e.propertyName==='max-height')scheduleFitRows();
    };
    var vv=window.visualViewport;
    var fitObs=new ResizeObserver(scheduleFitRows);
    fitObs.observe(panelInner);
    panel.addEventListener('transitionend',onPanelTransitionEnd);
    window.addEventListener('resize',onViewportChange,{passive:true});
    window.addEventListener('orientationchange',onViewportChange,{passive:true});
    if(vv){
      vv.addEventListener('resize',onViewportChange,{passive:true});
      vv.addEventListener('scroll',onViewportChange,{passive:true});
    }
    if(document.fonts&&document.fonts.ready){
      document.fonts.ready.then(function(){
        if(lbDiv.isConnected)scheduleFitRows();
      }).catch(function(){});
    }
    return wrap;
  }

  /* ══════════════ Metronome ══════════════ */
  function buildMetro(defBpm) {
    var metro = div('sw-metro');
    metro.innerHTML = `
      <span class="mleaf">🌿</span><span class="mleaf">🌿</span>
      <div class="mbg">${defBpm}</div>
      <span class="mleaf">🌿</span><span class="mleaf">🌿</span>
      <div class="msettings">
        <div class="mrow">
          <button class="mminus">−</button>
          <input class="mbpm" type="number" min="30" max="300" value="${defBpm}">
          <button class="mplus">＋</button>
        </div>
        <div class="mrow">
          <button class="mreset">重置</button>
          <button class="mstop-btn">停止</button>
        </div>
        <div class="mrow mrow-vol">
          <span class="mvol-icon">\u{1F50A}</span>
          <input class="mvol" type="range" min="0" max="200" step="5">
          <span class="mvol-val"></span>
        </div>
      </div>`;

    var bpm=defBpm,step=0,playing=false,timer=null,audioCtx=null,settingsOpen=false,pressTimer=null;
    var leaves=metro.querySelectorAll('.mleaf');
    var mbg=metro.querySelector('.mbg');
    var msettings=metro.querySelector('.msettings');
    var minput=metro.querySelector('.mbpm');

    function metroVolPct(){try{var v=parseInt(localStorage.getItem('cecp-metro-vol'),10);if(isFinite(v)&&v>=0&&v<=200)return v;}catch(_){}return 100;}
    function playClick(){var vol=metroVolPct();if(vol<=0)return;if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();var o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='triangle';o.frequency.value=step===0?900:700;g.gain.value=(step===0?.2:.14)*(vol/100);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+0.035);}
    function tick(){leaves.forEach(function(l){l.classList.remove('active')});leaves[step].classList.add('active');playClick();step=(step+1)%4;}
    function mstart(){mstop();step=0;tick();timer=setInterval(tick,60000/bpm);playing=true;}
    function mstop(){if(timer)clearInterval(timer);timer=null;playing=false;leaves.forEach(function(l){l.classList.remove('active')});}
    function setBpm(v){bpm=Math.min(300,Math.max(30,v||defBpm));mbg.textContent=bpm;minput.value=bpm;if(playing)mstart();}

    metro.addEventListener('click',function(e){if(e.target.closest('.msettings')||settingsOpen)return;playing?mstop():mstart();});
    function openS(){msettings.style.display='block';settingsOpen=true;}
    function cancelP(){clearTimeout(pressTimer);}
    metro.addEventListener('touchstart',function(){pressTimer=setTimeout(openS,500);},{passive:true});
    metro.addEventListener('touchend',cancelP,{passive:true});
    metro.addEventListener('touchmove',cancelP,{passive:true});
    metro.addEventListener('mousedown',function(){pressTimer=setTimeout(openS,500);});
    metro.addEventListener('mouseup',cancelP);
    metro.addEventListener('mouseleave',cancelP);
    var mvol=metro.querySelector('.mvol');
    var mvolVal=metro.querySelector('.mvol-val');
    var mvolIcon=metro.querySelector('.mvol-icon');
    function refreshVolUi(){var v=metroVolPct();mvol.value=v;mvolVal.textContent=v+'%';mvolIcon.textContent=v===0?'\u{1F507}':'\u{1F50A}';}
    mvol.addEventListener('input',function(e){e.stopPropagation();try{localStorage.setItem('cecp-metro-vol',String(Math.max(0,Math.min(200,parseInt(mvol.value,10)||0))));}catch(_){}refreshVolUi();});
    mvol.addEventListener('click',function(e){e.stopPropagation();});
    refreshVolUi();
    metro.querySelector('.mminus').onclick=function(e){e.stopPropagation();setBpm(bpm-1);};
    metro.querySelector('.mplus').onclick=function(e){e.stopPropagation();setBpm(bpm+1);};
    metro.querySelector('.mreset').onclick=function(e){e.stopPropagation();setBpm(defBpm);};
    metro.querySelector('.mstop-btn').onclick=function(e){e.stopPropagation();mstop();};
    minput.addEventListener('change',function(e){e.stopPropagation();setBpm(parseInt(minput.value,10));});
    minput.addEventListener('click',function(e){e.stopPropagation();});
    document.addEventListener('click',function(e){if(!metro.contains(e.target)){msettings.style.display='none';settingsOpen=false;}});
    return metro;
  }

  /* ══════════════ Lightbox ══════════════ */
  function initLightbox() {
    if (document.getElementById('ym-lb-overlay')) return;
    var ov = div('sw-lb-overlay');
    ov.id = 'ym-lb-overlay';
    ov.innerHTML = '<div class="sw-lb-box" role="dialog" aria-modal="true"><button class="sw-lb-close">✕</button><button class="sw-lb-nav prev">‹</button><img class="sw-lb-img" alt="score"><button class="sw-lb-nav next">›</button></div>';
    document.body.appendChild(ov);

    var lbImg=ov.querySelector('.sw-lb-img');
    var btnClose=ov.querySelector('.sw-lb-close');
    var btnPrev=ov.querySelector('.sw-lb-nav.prev');
    var btnNext=ov.querySelector('.sw-lb-nav.next');
    var list=[],idx=0,isOpen=false;

    function getImgs(){return Array.from(document.querySelectorAll('.sw-score img')).filter(function(i){return i&&i.src&&i.style.display!=='none';});}
    function syncNav(){var s=list.length>1;btnPrev.style.display=s?'':'none';btnNext.style.display=s?'':'none';}
    function showImg(i){if(!list.length)return;idx=(i+list.length)%list.length;lbImg.src=list[idx].src;}
    function lbOpen(img){
      list=getImgs();idx=Math.max(0,list.indexOf(img));
      // 统一用 CECP-SCORE-ZOOM 图片查看器(捏合/平移/翻页/点退出), 跟移调谱放大同款体验
      if(window.CecpZoom&&window.CecpZoom.openImage){window.CecpZoom.openImage(list.map(function(i){return i.src;}),idx);return;}
      showImg(idx);syncNav();ov.classList.add('open');document.body.style.overflow='hidden';isOpen=true;   // 兜底: 旧 lightbox
    }
    function lbClose(){ov.classList.remove('open');document.body.style.overflow='';isOpen=false;}

    btnClose.onclick=function(e){e.stopPropagation();lbClose();};
    btnPrev.onclick=function(e){e.stopPropagation();if(list.length>1)showImg(idx-1);};
    btnNext.onclick=function(e){e.stopPropagation();if(list.length>1)showImg(idx+1);};
    ov.addEventListener('click',function(e){if(e.target===ov)lbClose();});
    document.addEventListener('keydown',function(e){if(!isOpen)return;if(e.key==='Escape')lbClose();if(e.key==='ArrowLeft'&&list.length>1)showImg(idx-1);if(e.key==='ArrowRight'&&list.length>1)showImg(idx+1);});
    document.addEventListener('click',function(e){var img=e.target.closest('.sw-score img');if(img)lbOpen(img);});
    var sx=0,sy=0,moved=false;
    ov.addEventListener('touchstart',function(e){if(!isOpen)return;sx=e.touches[0].clientX;sy=e.touches[0].clientY;moved=false;},{passive:true});
    ov.addEventListener('touchmove',function(){moved=true;},{passive:true});
    ov.addEventListener('touchend',function(e){if(!isOpen||!moved)return;var t=e.changedTouches[0];if(!t)return;var dx=t.clientX-sx;if(Math.abs(dx)<40||Math.abs(dx)<Math.abs(t.clientY-sy))return;if(dx<0&&list.length>1)showImg(idx+1);else if(list.length>1)showImg(idx-1);},{passive:true});
  }

  /* ══════════════ Built-in Player (musiclib style) ══════════════ */
  function buildAPlayer(song) {
    if (!song.mp3) return div('');

    // inject CSS once
    if (!buildAPlayer._cssInjected) {
      buildAPlayer._cssInjected = true;
      var s = document.createElement('style');
      s.textContent = [
        ':root{--ym-pl-bg:rgba(210,210,218,0.88);--ym-pl-border:rgba(0,0,0,0.10);--ym-pl-text:#1d1d1f;--ym-pl-text2:#56616B;--ym-pl-text3:#626D77;--ym-pl-fill:#1d1d1f;--ym-pl-track:rgba(0,0,0,0.12);--ym-pl-btn:rgba(0,0,0,0.55);--ym-pl-btn-hover:rgba(0,0,0,0.08);--ym-pl-pp-bg:rgba(0,0,0,0.14);--ym-pl-pp-hover:rgba(0,0,0,0.22);--ym-pl-lrc-dim:rgba(0,0,0,0.22);}',
        '@media(prefers-color-scheme:dark){:root{--ym-pl-bg:rgba(20,20,24,0.92);--ym-pl-border:rgba(255,255,255,0.08);--ym-pl-text:#fff;--ym-pl-text2:#BDC5D0;--ym-pl-text3:#A6B1C0;--ym-pl-fill:#fff;--ym-pl-track:rgba(255,255,255,0.15);--ym-pl-btn:rgba(255,255,255,0.55);--ym-pl-btn-hover:rgba(255,255,255,0.09);--ym-pl-pp-bg:rgba(255,255,255,0.15);--ym-pl-pp-hover:rgba(255,255,255,0.24);--ym-pl-lrc-dim:rgba(255,255,255,0.25);}}',
        '.ym-pl{display:flex;flex-direction:column;align-items:stretch;gap:10px;background:var(--ym-pl-bg);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border-radius:18px;border:1px solid var(--ym-pl-border);margin:12px 0 8px;padding:14px 16px 12px;color:var(--ym-pl-text);overflow:hidden;}',
        '.ym-pl-stage{position:relative;display:flex;align-items:center;height:200px;overflow:hidden;}',
        '.ym-pl-cover-wrap{flex-shrink:0;width:130px;height:130px;position:absolute;left:50%;transform:translateX(-50%);transition:left .5s cubic-bezier(.4,0,.2,1),transform .5s cubic-bezier(.4,0,.2,1);z-index:2;}',
        '.ym-pl-stage.playing .ym-pl-cover-wrap{left:0;transform:translateX(0);}',
        '.ym-pl-cover{width:100%;height:100%;border-radius:14px;background:var(--ym-pl-track);display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--ym-pl-text3);overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.4);}',
        '.ym-pl-cover img{width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;}',
        '.ym-pl-lrc-panel{position:absolute;left:144px;right:0;top:0;bottom:0;height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;opacity:0;transform:translateX(16px);transition:opacity .5s ease .2s,transform .5s ease .2s;mask-image:linear-gradient(to bottom,transparent 0%,black 18%,black 82%,transparent 100%);-webkit-mask-image:linear-gradient(to bottom,transparent 0%,black 18%,black 82%,transparent 100%);scrollbar-width:none;}',
        '.ym-pl-lrc-panel::-webkit-scrollbar{display:none;}',
        '.ym-pl-stage.playing .ym-pl-lrc-panel{opacity:1;transform:translateX(0);}',
        '.ym-pl-lrc-inner{display:flex;flex-direction:column;align-items:center;gap:0;padding:50% 0;}',
        '.ym-pl-lrc-line{width:100%;text-align:center;font-size:clamp(13px,3.5vw,18px);line-height:1.8;padding:3px 4px;color:var(--ym-pl-lrc-dim);cursor:pointer;border-radius:6px;transition:color .3s ease,font-weight .3s ease;user-select:none;white-space:normal;word-break:break-word;}',
        '.ym-pl-lrc-line:hover{color:var(--ym-pl-text2);}',
        '.ym-pl-lrc-line.active{color:var(--ym-pl-text);font-size:clamp(15px,4vw,20px);font-weight:700;}',
        '.ym-pl-info{flex:1;min-width:0;}',
        '.ym-pl-title{font-size:14px;font-weight:600;color:var(--ym-pl-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.ym-pl-artist{font-size:12px;color:var(--ym-pl-text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}',
        '.ym-pl-prog-wrap{padding:10px 2px;cursor:pointer;margin:0 -2px;}',
        '.ym-pl-prog-bar{height:5px;border-radius:99px;background:var(--ym-pl-track);cursor:pointer;}',
        '.ym-pl-prog-fill{height:100%;background:var(--ym-pl-fill);border-radius:99px;width:0%;transition:width .4s linear;}',
        '.ym-pl-times{display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--ym-pl-text3);font-variant-numeric:tabular-nums;}',
        '.ym-pl-controls{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;}',
        '.ym-pl-btn{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;border:none;background:transparent;color:var(--ym-pl-btn);cursor:pointer;transition:color .15s,background .15s,transform .1s;}',
        '.ym-pl-btn:hover{color:var(--ym-pl-text);background:var(--ym-pl-btn-hover);}',
        '.ym-pl-btn:active{transform:scale(.88);}',
        '.ym-pl-pp{color:var(--ym-pl-text)!important;background:var(--ym-pl-pp-bg)!important;width:42px!important;height:42px!important;}',
        '.ym-pl-pp:hover{background:var(--ym-pl-pp-hover)!important;}',
        '.ym-pl-vol-wrap{display:flex;align-items:center;gap:8px;padding:0 2px;}',
        '.ym-pl-vol{flex:1;-webkit-appearance:none;appearance:none;height:4px;border-radius:99px;background:var(--ym-pl-track);outline:none;cursor:pointer;}',
        '.ym-pl-vol::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--ym-pl-fill);cursor:pointer;}',
        '.ym-pl{--ym-song-accent:#d8bd63;--ym-song-accent-soft:rgba(216,189,99,.24);--ym-song-accent-deep:rgba(15,18,27,.74);position:relative;isolation:isolate;gap:12px;padding:16px;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.42));box-shadow:0 12px 36px rgba(25,38,50,.10),0 1px 0 rgba(255,255,255,.5) inset;}',
        '.ym-pl::before{content:"";position:absolute;inset:-24px;z-index:-2;background-image:var(--ym-cover-img);background-size:cover;background-position:center;filter:blur(38px) saturate(1.18);opacity:.18;transform:scale(1.04);}',
        '.ym-pl::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background:radial-gradient(circle at 18% 8%,var(--ym-song-accent-soft),transparent 34%),linear-gradient(145deg,rgba(255,255,255,.10),transparent 55%);pointer-events:none;}',
        '.ym-pl-stage{height:auto;min-height:390px;display:flex;flex-direction:column;justify-content:center;gap:18px;overflow:visible;}',
        '.ym-pl-cover-wrap,.ym-pl-stage.playing .ym-pl-cover-wrap{position:relative;left:auto;width:min(78vw,310px);height:auto;aspect-ratio:1/1;transform:none;margin:0 auto;transition:transform .35s ease;}',
        '.ym-pl-cover{border-radius:28px;box-shadow:0 34px 92px rgba(0,0,0,.34),0 0 0 1px rgba(255,255,255,.16) inset;animation:ym-cover-in .62s cubic-bezier(.2,.8,.2,1) both;}',
        '.ym-pl-cover img{border-radius:28px;}',
        '.ym-pl-stage.playing .ym-pl-cover{animation:ym-cover-in .62s cubic-bezier(.2,.8,.2,1) both;}',
        '@keyframes ym-cover-in{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}',
        '@keyframes ym-cover-drift{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
        '.ym-pl-lrc-panel,.ym-pl-stage.playing .ym-pl-lrc-panel{position:relative;left:auto;right:auto;top:auto;bottom:auto;width:100%;height:210px;opacity:1;transform:none;}',
        '.ym-pl-lrc-inner{padding:92px 0 108px;}',
        '.ym-pl-lrc-line{font-size:clamp(17px,5.6vw,27px);line-height:1.38;padding:7px 10px;color:var(--ym-pl-text2);opacity:1;transition:color .34s ease,transform .34s cubic-bezier(.2,.8,.2,1),opacity .34s ease,filter .34s ease;}',
        '.ym-pl-lrc-line:hover{color:var(--ym-pl-text);opacity:1;}',
        '.ym-pl-lrc-line.active{font-size:clamp(21px,6.5vw,34px);color:var(--ym-pl-text);opacity:1;transform:scale(1.045);filter:drop-shadow(0 12px 28px var(--ym-song-accent-soft));}',
        '.ym-pl-spectrum{height:28px;display:flex;align-items:flex-end;justify-content:center;gap:5px;color:var(--ym-song-accent);}',
        '.ym-pl-spectrum i{width:4px;height:8px;border-radius:99px;background:currentColor;opacity:.34;}',
        '.ym-pl-stage.playing .ym-pl-spectrum i{animation:ym-spectrum 1s ease-in-out infinite;opacity:.86;}',
        '.ym-pl-spectrum i:nth-child(2){animation-delay:.12s}.ym-pl-spectrum i:nth-child(3){animation-delay:.24s}.ym-pl-spectrum i:nth-child(4){animation-delay:.08s}.ym-pl-spectrum i:nth-child(5){animation-delay:.18s}',
        '@keyframes ym-spectrum{0%,100%{height:7px}45%{height:25px}70%{height:13px}}',
        '.ym-pl-info,.ym-pl-prog-wrap,.ym-pl-controls,.ym-pl-vol-wrap{border-radius:22px;background:rgba(255,255,255,.44);border:1px solid rgba(255,255,255,.26);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}',
        '.ym-pl-info{padding:12px 14px;text-align:center;}',
        '.ym-pl-title{font-size:16px}.ym-pl-artist{font-size:12px;}',
        '.ym-pl-prog-wrap{padding:13px 12px;margin:0;}',
        '.ym-pl-controls{padding:8px;}',
        '.ym-pl-vol-wrap{padding:11px 12px;}',
        '.ym-pl-pp{background:linear-gradient(135deg,#fff,var(--ym-song-accent))!important;color:#101114!important;box-shadow:0 14px 34px var(--ym-song-accent-soft);}',
        '.ym-pl-btn{transition:transform .16s ease,background .16s ease,color .16s ease,box-shadow .16s ease;}',
        '.ym-pl-btn:hover{transform:translateY(-1px);}.ym-pl-btn:active{transform:scale(.92);}',
        '@media(prefers-color-scheme:dark){.ym-pl{background:linear-gradient(180deg,rgba(18,20,28,.82),rgba(12,14,20,.72));box-shadow:0 32px 96px rgba(0,0,0,.42),0 1px 0 rgba(255,255,255,.10) inset;}.ym-pl::before{opacity:.24}.ym-pl-info,.ym-pl-prog-wrap,.ym-pl-controls,.ym-pl-vol-wrap{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.10);}}',
        '@media(max-width:640px){.ym-pl{border-radius:24px;padding:14px;}.ym-pl-stage{min-height:72vh;}.ym-pl-cover-wrap,.ym-pl-stage.playing .ym-pl-cover-wrap{width:min(76vw,300px);}.ym-pl-lrc-panel,.ym-pl-stage.playing .ym-pl-lrc-panel{height:32vh;}.ym-pl-lrc-line{font-size:clamp(19px,6.2vw,28px);}.ym-pl-lrc-line.active{font-size:clamp(24px,7.8vw,36px);}.ym-pl-vol-wrap{display:none;}}',
        '@media(prefers-reduced-motion:reduce){.ym-pl-stage.playing .ym-pl-cover,.ym-pl-stage.playing .ym-pl-spectrum i{animation:none!important;}}',
        '.ym-pl{border-radius:22px;padding:14px;gap:10px;}',
        '.ym-pl-stage{min-height:0;height:auto;display:grid;grid-template-columns:132px minmax(0,1fr);align-items:center;gap:14px;}',
        '.ym-pl-cover-wrap,.ym-pl-stage.playing .ym-pl-cover-wrap{width:132px;margin:0;}',
        '.ym-pl-cover,.ym-pl-cover img{border-radius:18px;}',
        '.ym-pl-lrc-panel,.ym-pl-stage.playing .ym-pl-lrc-panel{height:168px;}',
        '.ym-pl-lrc-inner{padding:72px 0 84px;}',
        '.ym-pl-lrc-line{font-size:clamp(14px,2.6vw,18px);line-height:1.52;padding:4px 6px;text-align:left;}',
        '.ym-pl-lrc-line.active{font-size:clamp(16px,3vw,21px);transform:translateX(4px) scale(1.02);}',
        '.ym-pl-spectrum{grid-column:1/-1;height:18px;margin-top:-3px;}',
        '.ym-pl-stage.playing .ym-pl-spectrum i{animation-duration:1.15s;}',
        '@media(max-width:640px){.ym-pl{border-radius:20px;padding:12px;gap:9px;}.ym-pl-stage{min-height:0;grid-template-columns:88px minmax(0,1fr);gap:11px;}.ym-pl-cover-wrap,.ym-pl-stage.playing .ym-pl-cover-wrap{width:88px;}.ym-pl-cover,.ym-pl-cover img{border-radius:16px;}.ym-pl-lrc-panel,.ym-pl-stage.playing .ym-pl-lrc-panel{height:138px;}.ym-pl-lrc-inner{padding:58px 0 72px;}.ym-pl-lrc-line{font-size:14px;line-height:1.45;padding:3px 4px;text-align:left;}.ym-pl-lrc-line.active{font-size:17px;transform:translateX(3px) scale(1.015);}.ym-pl-spectrum{height:14px;}.ym-pl-info{padding:10px 12px;}.ym-pl-prog-wrap{padding:10px 8px;}.ym-pl-controls{padding:5px;}.ym-pl-btn{width:34px;height:34px;}.ym-pl-pp{width:40px!important;height:40px!important;}}',
      ].join('');
      document.head.appendChild(s);
    }

    var wrap = div('ym-pl');
    function applyAtmosphere(src){
      if(!src) return;
      wrap.style.setProperty('--ym-cover-img', 'url("'+String(src).replace(/"/g,'%22')+'")');
      var img=new Image();
      img.crossOrigin='anonymous';
      img.onload=function(){
        try{
          var c=document.createElement('canvas'), size=34;
          c.width=size;c.height=size;
          var ctx=c.getContext('2d',{willReadFrequently:true});
          ctx.drawImage(img,0,0,size,size);
          var data=ctx.getImageData(0,0,size,size).data;
          var r=0,g=0,b=0,n=0;
          for(var i=0;i<data.length;i+=16){
            var a=data[i+3], rr=data[i], gg=data[i+1], bb=data[i+2];
            var mx=Math.max(rr,gg,bb), mn=Math.min(rr,gg,bb);
            if(a<80 || mx<28 || mx-mn<12) continue;
            r+=rr;g+=gg;b+=bb;n++;
          }
          if(!n) return;
          r=Math.round(r/n);g=Math.round(g/n);b=Math.round(b/n);
          wrap.style.setProperty('--ym-song-accent','rgb('+r+','+g+','+b+')');
          wrap.style.setProperty('--ym-song-accent-soft','rgba('+r+','+g+','+b+',.28)');
        }catch(_){}
      };
      img.src=src;
    }
    applyAtmosphere(song.cover||'');

    // stage: cover + lyrics
    var stage = div('ym-pl-stage');
    var coverWrap = div('ym-pl-cover-wrap');
    var coverEl = div('ym-pl-cover');
    if (song.cover) {
      var img = document.createElement('img'); img.src = song.cover; img.alt = '';
      coverEl.appendChild(img);
    } else { coverEl.textContent = '♪'; }
    coverWrap.appendChild(coverEl);
    var lrcPanel = div('ym-pl-lrc-panel');
    var lrcInner = div('ym-pl-lrc-inner');
    lrcPanel.appendChild(lrcInner);
    stage.appendChild(coverWrap); stage.appendChild(lrcPanel);
    var spectrum = div('ym-pl-spectrum');
    spectrum.setAttribute('aria-hidden','true');
    spectrum.innerHTML='<i></i><i></i><i></i><i></i><i></i>';
    stage.appendChild(spectrum);
    wrap.appendChild(stage);

    // song info row
    var infoRow = div('');
    infoRow.style.cssText = 'display:flex;align-items:center;gap:12px;';
    var info = div('ym-pl-info');
    var titleEl = div('ym-pl-title'); titleEl.textContent = song.title || '';
    var artistEl = div('ym-pl-artist'); artistEl.textContent = song.artist || '';
    info.appendChild(titleEl); info.appendChild(artistEl);
    infoRow.appendChild(info);
    wrap.appendChild(infoRow);

    // progress
    var progWrap = div('ym-pl-prog-wrap');
    var progBar = div('ym-pl-prog-bar');
    var progFill = div('ym-pl-prog-fill');
    progBar.appendChild(progFill);
    var times = div('ym-pl-times');
    var curEl = document.createElement('span'); curEl.textContent = '0:00';
    var durEl = document.createElement('span'); durEl.textContent = '0:00';
    times.appendChild(curEl); times.appendChild(durEl);
    progWrap.appendChild(progBar); progWrap.appendChild(times);
    wrap.appendChild(progWrap);

    // controls
    function mkBtn(svgPath, w, h, label) {
      var b = div('ym-pl-btn'); b.setAttribute('aria-label', label);
      b.innerHTML = '<svg width="'+w+'" height="'+h+'" viewBox="0 0 24 24" fill="currentColor">'+svgPath+'</svg>';
      return b;
    }
    var btnBack = mkBtn('<path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="12" y="15.5" text-anchor="middle" font-size="5.5" fill="currentColor" font-family="system-ui,sans-serif" font-weight="600">15</text>',17,17,'后退15秒');
    var btnPlay = div('ym-pl-btn ym-pl-pp'); btnPlay.setAttribute('aria-label','播放');
    btnPlay.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>';
    var btnFwd = mkBtn('<path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="12" y="15.5" text-anchor="middle" font-size="5.5" fill="currentColor" font-family="system-ui,sans-serif" font-weight="600">15</text>',17,17,'前进15秒');
    var controls = div('ym-pl-controls');
    controls.appendChild(btnBack); controls.appendChild(btnPlay); controls.appendChild(btnFwd);
    wrap.appendChild(controls);

    // volume (hidden on touch devices — system volume keys handle it)
    var volWrap = div('ym-pl-vol-wrap');
    var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!isTouchDevice) {
      var volIconLo = document.createElement('span');
      volIconLo.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
      var volSlider = document.createElement('input');
      volSlider.className = 'ym-pl-vol'; volSlider.type = 'range'; volSlider.min = '0'; volSlider.max = '1'; volSlider.step = '0.02'; volSlider.value = '1';
      var volIconHi = document.createElement('span');
      volIconHi.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM18.5 12c0-2.77-1.5-5.15-3.75-6.45v12.9C16.99 17.14 18.5 14.77 18.5 12z"/></svg>';
      volWrap.appendChild(volIconLo); volWrap.appendChild(volSlider); volWrap.appendChild(volIconHi);
      volSlider.oninput = function(){ audio.volume = parseFloat(volSlider.value); };
      wrap.appendChild(volWrap);
    }

    // audio engine（挂进 wrap：不可见，但让宿主页面能 querySelector 到以便暂停）
    var audio = document.createElement('audio');
    audio.src = song.mp3;
    audio.style.display = 'none';   // display:none 不影响播放，避免成为可见 flex item
    wrap.appendChild(audio);
    var lrcData = [], lrcIdx = -1;

    function fmt(s) { var m=Math.floor(s/60),ss=Math.floor(s%60); return m+':'+(ss<10?'0':'')+ss; }
    function parseLrc(text) {
      var lines = [];
      text.split('\n').forEach(function(l){ var m=l.match(/^\[(\d+):(\d+\.\d+)\](.*)/); if(m) lines.push({time:parseInt(m[1])*60+parseFloat(m[2]),text:m[3].trim()}); });
      return lines.sort(function(a,b){return a.time-b.time;});
    }
    function renderLrc() {
      lrcInner.innerHTML = '';
      lrcPanel.scrollTop = 0;
      lrcData.forEach(function(l,i){
        var d = document.createElement('div'); d.className = 'ym-pl-lrc-line' + (i===0 ? ' active' : ''); d.textContent = l.text;
        d.onclick = function(){ audio.currentTime = l.time; };
        lrcInner.appendChild(d);
      });
      lrcIdx = lrcData.length ? 0 : -1;
    }
    function highlightLrc() {
      if (!lrcData.length) return;
      var t = audio.currentTime, idx = -1;
      lrcData.forEach(function(l,i){ if(l.time<=t) idx=i; });
      if (idx === lrcIdx) return;
      lrcIdx = idx;
      lrcInner.querySelectorAll('.ym-pl-lrc-line').forEach(function(r,i){ r.classList.toggle('active', i===idx); });
      if (idx >= 0) {
        var lines = lrcInner.querySelectorAll('.ym-pl-lrc-line');
        if (lines[idx]) lrcPanel.scrollTo({top: lines[idx].offsetTop - lrcPanel.offsetHeight/2 + lines[idx].offsetHeight/2, behavior:'smooth'});
      }
    }
    function updateBtn() {
      btnPlay.innerHTML = audio.paused
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h3v14H6V5zm9 0h3v14h-3V5z"/></svg>';
    }
    function updateProgress() {
      var dur = audio.duration||0, cur = audio.currentTime||0;
      curEl.textContent = fmt(cur); durEl.textContent = fmt(dur);
      progFill.style.width = (dur ? cur/dur*100 : 0) + '%';
      highlightLrc();
    }

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('play', function(){ stage.classList.add('playing'); updateBtn(); });
    audio.addEventListener('pause', updateBtn);

    btnPlay.onclick = function(){ audio.paused ? audio.play().catch(function(){}) : audio.pause(); };
    btnBack.onclick = function(){ audio.currentTime = Math.max(0, audio.currentTime-15); };
    btnFwd.onclick = function(){ audio.currentTime = Math.min(audio.duration||0, audio.currentTime+15); };
    // seek on click
    progWrap.addEventListener('click', function(e){
      if (!audio.duration) return;
      var r = progBar.getBoundingClientRect();
      audio.currentTime = Math.max(0, Math.min(1, (e.clientX-r.left)/r.width)) * audio.duration;
    });

    // load lrc
    if (song.lrc) {
      fetch(song.lrc).then(function(r){return r.text();}).then(function(text){
        lrcData = parseLrc(text); renderLrc();
      }).catch(function(){});
    }

    return wrap;
  }

  /* ══════════════ Build all sections ══════════════ */
  function buildSongs(songsArg) {
    var songs = songsArg || (C && C.songs) || [];
    if (!songs.length) return el('p',{class:'ym-meta',text:'本周暂无诗歌安排'});

    var wrap   = div('ym-songs-wrap');
    var tabBar = div('ym-song-tabs');
    var panels = [];

    songs.forEach(function(song, i){

      /* 复制图标（点击只复制，不切换 tab）*/
      var copyIcon = el('span',{class:'ym-song-tab-copy',title:'复制歌名',
        html:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
      });
      copyIcon.addEventListener('click', function(e){
        e.stopPropagation();
        navigator.clipboard.writeText(song.title).then(function(){
          var old = copyIcon.innerHTML;
          copyIcon.innerHTML = '&#10003;'; copyIcon.style.color = '#16a34a';
          setTimeout(function(){ copyIcon.innerHTML = old; copyIcon.style.color = ''; }, 1200);
        });
      });

      /* Tab 按钮：序号 + 歌名 + 复制 */
      var tab = el('button',{class:'ym-song-tab'+(i===0?' active':'')});
      tab.appendChild(el('span',{class:'ym-song-tab-num',text:(i+1<10?'0':'')+(i+1)}));
      tab.appendChild(el('span',{class:'ym-song-tab-title',text:song.title}));
      tab.appendChild(copyIcon);
      tabBar.appendChild(tab);

      /* 内容面板：播放器 + 移调卡 */
      var panel = div('ym-song-panel'+(i===0?' active':''));
      panel.appendChild(buildAPlayer(song));
      panel.appendChild(buildSongCard(song));
      wrap.appendChild(panel);

      panels.push({tab:tab, panel:panel});

      /* 切换逻辑 */
      tab.addEventListener('click', function(){
        panels.forEach(function(p){
          p.tab.classList.remove('active');
          p.panel.classList.remove('active');
        });
        tab.classList.add('active');
        panel.classList.add('active');
      });
    });

    wrap.insertBefore(tabBar, wrap.firstChild);
    return wrap;
  }

  /* ══════════════ Bible widget ══════════════ */
  function buildBible() {
    var w = div('');
    var bw = el('div',{class:'hb-bible'});
    bw.setAttribute('data-id','ym-bible-widget');
    bw.setAttribute('data-default', C.bibleRef||'？');
    bw.setAttribute('data-t2','NR06');
    bw.setAttribute('data-dual','1');
    w.appendChild(bw);
    return w;
  }

  /* ══════════════ PPT ══════════════ */
  var PPT_PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/';
  var _pptPdfLibrary;

  function loadPptPdfLibrary() {
    if (!_pptPdfLibrary) {
      _pptPdfLibrary = import(PPT_PDFJS_BASE + 'build/pdf.min.mjs').then(function(lib) {
        lib.GlobalWorkerOptions.workerSrc = PPT_PDFJS_BASE + 'build/pdf.worker.min.mjs';
        return lib;
      }).catch(function(error) {
        _pptPdfLibrary = null;
        throw error;
      });
    }
    return _pptPdfLibrary;
  }

  async function renderPptPdf(url, width) {
    var loadingTask, timer, cancelled = false;
    var rendering = (async function() {
      var lib = await loadPptPdfLibrary();
      if (cancelled) return null;
      loadingTask = lib.getDocument({
        url:url, isEvalSupported:false, disableAutoFetch:true, disableStream:true,
        cMapUrl:PPT_PDFJS_BASE + 'cmaps/', cMapPacked:true,
        standardFontDataUrl:PPT_PDFJS_BASE + 'standard_fonts/', wasmUrl:PPT_PDFJS_BASE + 'wasm/'
      });
      var pdf = await loadingTask.promise;
      var page = await pdf.getPage(1);
      var natural = page.getViewport({scale:1});
      var pixels = Math.min(1800, Math.max(360, width) * Math.min(window.devicePixelRatio || 1, 2));
      var viewport = page.getViewport({scale:pixels / natural.width});
      var canvas = el('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'), viewport:viewport}).promise;
      return canvas;
    })();
    try {
      return await Promise.race([rendering, new Promise(function(_, reject) {
        timer = setTimeout(function() { reject(new Error('PPT preview timed out')); }, 15000);
      })]);
    } finally {
      cancelled = true;
      clearTimeout(timer);
      if (loadingTask) await loadingTask.destroy().catch(function() {});
    }
  }

  function loadPptCover(ppt) {
    return new Promise(function(resolve, reject) {
      var image = el('img',{alt:ppt.label + ' · 第一页',decoding:'async'});
      var timer = setTimeout(function() { finish(new Error('PPT cover timed out')); }, 15000);
      function finish(error) {
        clearTimeout(timer);
        image.onload = image.onerror = null;
        if (error) reject(error); else resolve(image);
      }
      image.onload = function() { finish(); };
      image.onerror = function() { finish(new Error('PPT cover unavailable')); };
      image.src = ppt.previewUrl;
    });
  }

  function buildPptPreview(ppt) {
    var isPdf = false;
    try { isPdf = /\.pdf$/i.test(new URL(ppt.url, document.baseURI).pathname); } catch (_) {}
    var available = !!ppt.previewUrl || isPdf;
    var status = el('span',{class:'ppt-preview-status',text:available ? '正在加载第一页…' : '讲义 / 演示文件'});
    var icon = ymIcon('present');
    var preview = el('span',{class:'ppt-card-preview' + (available ? '' : ' is-unavailable'),'aria-busy':String(available)},[
      el('span',{class:'ppt-preview-fallback'},[
        el('span',{class:'ppt-preview-eyebrow'},[icon,el('span',{text:'YOUTH · 信息分享'})]),
        el('span',{class:'ppt-preview-title',text:ppt.label}),
        status
      ])
    ]);
    if (!available) return preview;
    function load() {
      var media = ppt.previewUrl ? loadPptCover(ppt) : renderPptPdf(ppt.url, preview.clientWidth || 900);
      media.then(function(element) {
        if (element.tagName === 'CANVAS') {
          element.setAttribute('role','img');
          element.setAttribute('aria-label',ppt.label + ' · 第一页');
        }
        preview.replaceChildren(element, el('span',{class:'ppt-preview-badge',text:'第 1 页','aria-hidden':'true'}));
        preview.classList.add('is-ready');
      }).catch(function() {
        status.textContent = '预览暂不可用';
        preview.classList.add('is-unavailable');
      }).finally(function() { preview.setAttribute('aria-busy','false'); });
    }
    if (typeof IntersectionObserver === 'undefined') load();
    else {
      var observer = new IntersectionObserver(function(entries) {
        if (!entries.some(function(entry) { return entry.isIntersecting; })) return;
        observer.disconnect();
        load();
      },{rootMargin:'300px'});
      observer.observe(preview);
    }
    return preview;
  }

  function buildPPT() {
    if(C.pptUrl){
      var label = C.pptLabel || '讲员 PPT';
      var ic = el('span',{class:'ppt-card-ic'});
      var svgIc = ymIcon('present'); if(svgIc) ic.appendChild(svgIc); else ic.textContent = '📑';
      return el('a',{class:'ppt-card',href:C.pptUrl,target:'_blank',rel:'noopener noreferrer'},[
        buildPptPreview({url:C.pptUrl,previewUrl:C.pptPreviewUrl,label:label}),
        el('span',{class:'ppt-card-details'},[
          ic,
          el('span',{class:'ppt-card-main'},[
            el('span',{class:'ppt-card-t',text:label}),
            el('span',{class:'ppt-card-s',text:'点击打开完整文件'}),
          ]),
          el('span',{class:'ppt-card-arrow',text:'↗','aria-hidden':'true'}),
        ])
      ]);
    }
    return el('p',{class:'ppt-empty',text:'本周暂未提供讲员 PPT 🙏'});
  }

  /* ══════════════ Replay ══════════════ */
  function normalizeVideoUrl(url) {
    if(!url) return url;
    try {
      var parsed = new URL(url, window.location.href);
      parsed.searchParams.delete('autoplay');
      return parsed.href;
    } catch (_) {
      return String(url).replace(/([?&])autoplay=1(&?)/, function(_, lead, tail){
        return tail ? lead : '';
      });
    }
  }

  function buildReplay() {
    if(C.replayUrl){
      var wrap = div('ym-iframe-wrap');
      var iframe = el('iframe',{src:normalizeVideoUrl(C.replayUrl),allowfullscreen:'true',allow:'accelerometer;clipboard-write;encrypted-media;gyroscope;picture-in-picture'});
      wrap.appendChild(iframe);
      return wrap;
    }
    return el('p',{class:'replay-tip',text:'本周暂未提供直播回放 🙏🏻'});
  }

  /* ══════════════ Anchor helper ══════════════ */
  function anchor(id){ var a=el('div',{id:id,tabindex:'-1',style:'scroll-margin-top:80px'}); return a; }

  /* ══════════════ HR ══════════════ */
  function hr(){ return el('hr',{class:'ym-hr'}); }

  /* ══════════════ Section title ══════════════ */
  function secTitle(txt, cls){
    var parts = ymSplitLabel(String(txt||''));
    var tone = /诗歌|敬拜/.test(parts.text) ? 'gold' : /圣经|信息/.test(parts.text) ? 'violet' : /游戏/.test(parts.text) ? 'rose' : /PPT|教程/.test(parts.text) ? 'teal' : 'blue';
    var wrap = el('div',{class:'ym-sec'+(cls?' '+cls:''), 'data-tone':tone});
    var h = el('div',{class:'ym-sec-h'},[ el('h2',{class:'k',style:'margin:0',text: parts.text || String(txt||'')}) ]);
    wrap.appendChild(h);
    wrap.appendChild(el('div',{class:'ym-sec-rule'}));
    return wrap;
  }

  function getSectionOrder() {
    var defaults = ['flow', 'songs', 'message', 'ppt', 'replay', 'game', 'action'];
    var valid = defaults.concat(['tutorial']);
    var raw = Array.isArray(C.sectionOrder) ? C.sectionOrder : [];
    var seen = {};
    var order = [];

    raw.forEach(function(name){
      var key = String(name || '').toLowerCase();
      if (key === 'schedule') key = 'flow';
      if (!valid.includes(key) || seen[key]) return;
      seen[key] = true;
      order.push(key);
    });

    if (C.tutorialUrl && !seen.tutorial) {
      seen.tutorial = true;
      order.push('tutorial');
    }

    defaults.forEach(function(key){
      if (!seen[key]) order.push(key);
    });

    return order;
  }

  function buildFlowSection() {
    var frag = document.createDocumentFragment();
    frag.appendChild(anchor('ym-flow'));
    frag.appendChild(buildSchedule());
    return frag;
  }

  function buildSongsSection() {
    var frag = document.createDocumentFragment();
    frag.appendChild(anchor('ym-songs'));
    frag.appendChild(secTitle('🎵 诗歌敬拜'));
    var roster = buildRoster();
    if (roster) frag.appendChild(roster);
    frag.appendChild(buildSongs());
    frag.appendChild(anchor('ym-score'));
    return frag;
  }

  function buildMessageSection() {
    var frag = document.createDocumentFragment();
    frag.appendChild(anchor('ym-message'));
    frag.appendChild(secTitle('📖 圣经分享', 'is-featured'));
    var metaDiv = div('ym-block is-featured ym-message-soft ym-tilt ym-reveal');
    metaDiv.innerHTML =
      '<div class="ym-meta is-featured">' +
        '<div class="ym-meta-row"><span class="ym-meta-label">讲员</span><span class="ym-meta-value">' + (C.speaker||'—') + '</span></div>' +
        '<div class="ym-meta-row"><span class="ym-meta-label">主题</span><span class="ym-meta-value">' + (C.topic||'—') + '</span></div>' +
      '</div>';
    frag.appendChild(metaDiv);
    frag.appendChild(buildBible());
    return frag;
  }

  function buildPptSection() {
    var frag = document.createDocumentFragment();
    frag.appendChild(anchor('ym-ppt'));
    frag.appendChild(secTitle('📑 讲员 PPT'));
    frag.appendChild(buildPPT());
    return frag;
  }

  function buildReplaySection() {
    var frag = document.createDocumentFragment();
    frag.appendChild(anchor('ym-replay'));
    frag.appendChild(secTitle('📺 直播回放'));
    frag.appendChild(buildReplay());
    return frag;
  }

  function buildTutorialSection() {
    var frag = document.createDocumentFragment();
    frag.appendChild(anchor('ym-tutorial'));
    frag.appendChild(secTitle(C.tutorialTitle || '🎬 视频教程'));
    if(C.tutorialUrl){
      var wrap = div('ym-iframe-wrap');
      var iframe = el('iframe',{src:normalizeVideoUrl(C.tutorialUrl),allowfullscreen:'true',allow:'accelerometer;clipboard-write;encrypted-media;gyroscope;picture-in-picture'});
      wrap.appendChild(iframe);
      frag.appendChild(wrap);
    } else {
      frag.appendChild(el('p',{class:'replay-tip',text:'本周暂未提供视频教程 🙏🏻'}));
    }
    return frag;
  }

  function buildGameSection() {
    var frag = document.createDocumentFragment();
    frag.appendChild(anchor('ym-game'));
    frag.appendChild(secTitle('🎮 游戏活动', 'is-featured'));
    var gameDiv = div('ym-block is-featured ym-game-soft ym-tilt ym-reveal');
    gameDiv.appendChild(el('p',{class:'ym-feature-copy',text:C.gameText}));
    frag.appendChild(gameDiv);
    return frag;
  }

  function buildActionSection() {
    var act = div('ym-action ym-reveal');
    act.innerHTML = '<strong>🙋 行动邀请</strong><br>欢迎邀请你身边的青年朋友一起来参加聚会。<br>如果你对敬拜、乐器或其他服事有感动，我们很欢迎你加入，也可以随时联系同工。<br><strong>一起服事，一起成长，我们等你！</strong>';
    return act;
  }

  /* ══════════════ Assemble page ══════════════ */
  function buildPage() {
    var frag = document.createDocumentFragment();
    var sectionBuilders = {
      flow: buildFlowSection,
      songs: buildSongsSection,
      message: buildMessageSection,
      ppt: buildPptSection,
      replay: buildReplaySection,
      tutorial: buildTutorialSection,
      game: buildGameSection,
      action: buildActionSection,
    };
    var sectionOrder = getSectionOrder();

    frag.appendChild(buildHero());
    frag.appendChild(hr());

    sectionOrder.forEach(function(section, index){
      var builder = sectionBuilders[section];
      if (!builder) return;
      frag.appendChild(builder());
      if (index < sectionOrder.length - 1) frag.appendChild(hr());
    });

    // Ring Coach Tour trigger
    frag.appendChild(el('div',{id:'rt5-enable'}));

    // bottom clearance so the last card / audio player clears the fixed FAB cluster + system safe area
    frag.appendChild(el('div',{class:'ym-bottom-safe','aria-hidden':'true'}));

    ROOT.appendChild(frag);
  }

  function setupYouthMotion(root) {
    if (!root || root.__ymMotionReady) return;
    root.__ymMotionReady = true;

    var reduceMotion = true;

    function eachNode(selector, fn) {
      Array.prototype.forEach.call(root.querySelectorAll(selector), fn);
    }

    function primeReveal(node) {
      if (!node || node.__ymRevealReady) return;
      node.__ymRevealReady = true;
      if (reduceMotion) {
        node.classList.add('in');
        return;
      }
      if (setupYouthMotion._revealObserver) setupYouthMotion._revealObserver.observe(node);
      else node.classList.add('in');
    }

    function primeTilt(node) {
      if (!node || node.__ymTiltReady || reduceMotion) return;
      node.__ymTiltReady = true;
      node.addEventListener('mousemove', function(e){
        var r = node.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        var rx = (0.5 - y) * 5.5;
        var ry = (x - 0.5) * 6.5;
        node.style.setProperty('--ym-spot-x', (x * 100).toFixed(1) + '%');
        node.style.setProperty('--ym-spot-y', (y * 100).toFixed(1) + '%');
        node.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-2px)';
      });
      node.addEventListener('mouseleave', function(){
        node.style.transform = '';
        node.style.removeProperty('--ym-spot-x');
        node.style.removeProperty('--ym-spot-y');
      });
    }

    if (!setupYouthMotion._revealObserver && 'IntersectionObserver' in window && !reduceMotion) {
      setupYouthMotion._revealObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          setupYouthMotion._revealObserver.unobserve(entry.target);
        });
      }, {threshold:0.12, rootMargin:'0px 0px -6% 0px'});
    }

    function scan(scope) {
      scope = scope || root;
      if (scope.nodeType !== 1 && scope.nodeType !== 9 && scope.nodeType !== 11) return;
      if (scope.classList) {
        if (scope.classList.contains('ym-reveal')) primeReveal(scope);
        if (scope.classList.contains('ym-tilt')) primeTilt(scope);
      }
      Array.prototype.forEach.call(scope.querySelectorAll ? scope.querySelectorAll('.ym-reveal') : [], primeReveal);
      Array.prototype.forEach.call(scope.querySelectorAll ? scope.querySelectorAll('.ym-tilt') : [], primeTilt);
    }

    scan(root);

    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function(muts){
        muts.forEach(function(m){
          Array.prototype.forEach.call(m.addedNodes || [], scan);
        });
      });
      mo.observe(root, {childList:true, subtree:true});
    } else {
      eachNode('.ym-reveal', function(n){ n.classList.add('in'); });
    }
  }

  /* ══════════════ 核心运行函数 ══════════════ */
  function _run(cfg, root) {
    C = cfg;
    ROOT = root;
    buildPage();
    setupYouthMotion(ROOT);
    initLightbox();
  }

  /* ══════════════ 对外 API（在 IIFE 内注册，可访问内部函数）══════════════ */

  /* 供其他引擎（如 camp-engine.js）复用诗歌渲染：
     传入 song id 数组（songs/<id>.json 的 id），内部逐个 fetch，
     复用 buildSongs/buildSongCard/buildAPlayer，
     返回 Promise<HTMLElement>（诗歌 tab + 播放器 + 和弦谱，观感与 weekly 一致）。 */
  /* 预览/测试用：直接传 song 对象数组渲染（跳过 fetch），与 buildSongSet 观感一致。 */
  window.YouthEngine.renderSongObjects = function(songs){
    _injectCSS();
    initLightbox();
    return buildSongs(Array.isArray(songs)?songs:[]);
  };
  window.YouthEngine.buildSongSet = function(songIds) {
    _injectCSS();
    initLightbox();
    var ids = Array.isArray(songIds) ? songIds : [];
    var songPromises = ids.map(function(id) {
      return fetch(SONGS_BASE + '/' + id + '.json')
        .then(function(r) {
          if (!r.ok) throw new Error('歌曲不存在: ' + id);
          return r.json();
        });
    });
    return Promise.all(songPromises).then(function(songs) {
      return buildSongs(songs);
    });
  };

  window.YouthEngine.render = function(weekId, root) {
    if (!root) root = document.getElementById('ym-root');
    if (!root) { console.error('[YM] root element not found'); return; }

    root.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--ym-ink2,#888);font-family:system-ui;"><div style="font-size:32px;margin-bottom:12px;">⏳</div><div>正在加载周刊...</div></div>';
    _injectCSS();

    fetch(YM_BASE + '/weekly/' + weekId + '.json')
      .then(function(r) {
        if (!r.ok) throw new Error('周刊不存在: ' + weekId);
        return r.json();
      })
      .then(function(weekly) {
        var songIds = weekly.songs || [];
        var songPromises = songIds.map(function(id) {
          return fetch(SONGS_BASE + '/' + id + '.json')
            .then(function(r) {
              if (!r.ok) throw new Error('歌曲不存在: ' + id);
              return r.json();
            });
        });
        return Promise.all(songPromises).then(function(songs) {
          weekly.songs = songs;
          return weekly;
        });
      })
      .then(function(cfg) {
        root.innerHTML = '';
        cfg.__weekId = weekId; // 「正在进行」标记的日期门槛（仅当天生效）
        _applyDefaults(cfg);
        _run(cfg, root);
      })
      .catch(function(err) {
        root.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#ef4444;font-family:system-ui;"><div style="font-size:32px;margin-bottom:12px;">❌</div><div>' + err.message + '</div></div>';
        console.error('[YM]', err);
      });
  };

  /* ══════════════ 向后兼容：自动运行模式 ══════════════ */
  if (window.YouthMeeting) {
    var C0 = window.YouthMeeting;
    var ROOT0 = document.getElementById('ym-root');
    if (C0 && ROOT0) {
      _applyDefaults(C0);
      _injectCSS();
      _run(C0, ROOT0);
    }
  }

})();
