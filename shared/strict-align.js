/* ✦ Designed & Built by YuEn © 2025–2026 ✦ */

/* shared/strict-align.js — 严格对位（align:"strict"）纯函数层
 *
 * 作用：把 seg 的 `n`（简谱串）切成「音位」序列，再把 `chord` / `lyric*` 按下标
 * 一一对位。`@` = 该音位上没有内容。纯函数、无 DOM、无副作用；渲染/编辑层调它。
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ⚠️ 音位判定必须与三份 renderNStr 里的 `isDualAtom` + dual-merge 分词逐字一致： │
 * │   youth-engine.js (isDualAtom≈L1971)                                       │
 * │   musiclib/musiclib.js (isDualAtom≈L4183)                                   │
 * │   musictool/musictool.js (isDualAtom≈L3108, jianpuHTML 模板内)              │
 * │ 本文件是「同一套判定」的可复用拷贝，不是另写一套。四处改一处必须同步改。      │
 * │ 若 renderNStr 里的 isDualAtom 有改动，回来同步本文件并补测试。               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 已定规则（用户确认 2026-07-21）：
 *   - 音位 = dual-merge 分词后 `isDualAtom(tok)===true` 的 token。
 *   - 音符 1-7 / 休止 0 / 占位 sp / 增时线 - 都算音位（上面也要写 `@`）。
 *   - 小节线、连音线 ( )、连音线 ~、连音符 {3 {5 }、跳房子、行内拍号、分隔符 / 不是音位。
 *   - 上下双音 `X / Y` 合成一个音位。
 *   - `chord`/`lyric`/`lyric2..4` 都是「空格分隔 token 序列」，第 i 个对第 i 个音位；
 *     每行歌词各算各的；`@` = 空位；一个音位两个和弦用逗号 `C,G`（第一个在下：C 下 G 上）。
 *   - 数量对不上：只产出 warning，不抛错、不阻止保存；warning 必须指出第几个音位起错。
 */
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

  function isDualAtom(tk) {
    if (!tk || tk === '/' || tk === '／' || tk === '^' || tk.charAt(0) === '~') return false;
    if (tk === '(' || tk === ')' || tk === '([' || tk === '])' || tk === '}' || tk === '[v1' || tk === '[v2' || tk === ']v') return false;
    if (tk === '|' || tk === '||' || tk === '||/' || tk === '|]' || tk === '|:' || tk === ':|' || tk === '|:|') return false;
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

  /** 把一行 strict 歌词/字段串还原成"纯展示/搜索文本"：丢掉 `@`（空位）与音位间空白，
   *  相邻两个拉丁词之间保留一个空格。用于搜索 haystack、歌词面板、song.lyrics 拼接——
   *  strict 下 `@` 绝不能漏进展示或搜索串。老串（无空白可分/无 @）原样返回，安全。 */
  function strictLyricPlain(str) {
    var toks = parseFieldTokens(str), out = '';
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
    var toks = parseFieldTokens(raw);
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
    isDualAtom: isDualAtom,           // 导出仅供测试对拍；生产判定走 splitSlots
    _timeSign: { normalizeTimeSignValue: normalizeTimeSignValue, extractInlineTimeSignToken: extractInlineTimeSignToken }
  };
});
