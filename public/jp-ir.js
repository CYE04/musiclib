/* ✦ Designed & Built by YuEn © 2025–2026 ✦ */

/* shared/jp-ir.js — 简谱 JSON → 五线谱语义模型（IR）的纯函数层
 *
 * 作用：把一首歌的 `n` / `chord` / `lyric*` 翻译成「小节 → 事件」的语义模型，
 * 供五线谱渲染（ABC / MusicXML / MIDI 适配器）消费。
 * 纯函数、无 DOM、无副作用、**绝不修改入参**。
 *
 * 规格：见 musiclib-react-migration/STAFF_MODE_PLAN.md §4（IR 结构）与 §5（六个硬点）。
 * 进度与决策：见 musiclib-react-migration/STAFF_MODE_MEMORY.md。
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ ⚠️ 音位分词一律走 shared/strict-align.js 的 tokenizeN / splitSlots，       │
 * │   **本文件只读不改它**。那份与三份 renderNStr 逐字节对应，四处同步。        │
 * │ ⚠️ 本文件不属于「三宿主逐字节内联」的共享块体系 —— 它是独立 <script>，      │
 * │   没有同步义务。若将来要内联进 musictool，才需遵守「块内禁止反斜杠」的约定。  │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * 时值单位：**1 个单位 = 1/32 音符**。四分音符 = 8。
 * 选 1/32 而不是 1/16，是因为曲库里有附点十六分音符（`3·__` 等 5 处），
 * 在 1/16 基准下它 = 1.5 个单位，不是整数。见 PLAN §6.1。
 */
(function (root, factory) {
  var SA = null;
  if (typeof module !== 'undefined' && module.exports) SA = require('./strict-align.js');
  else if (root) SA = root.CecpStrictAlign;
  var mod = factory(SA);
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  if (root) root.CecpJpIR = mod;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function (SA) {
  'use strict';

  if (!SA) throw new Error('jp-ir: 需要先加载 shared/strict-align.js');

  /* ── 常量 ─────────────────────────────────────────────────────────────── */

  var Q = 8;                                    // 四分音符 = 8 个 1/32 单位
  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];     // 大调各音级相对主音的半音数
  var ACC_ALTER = { '#': 1, '♯': 1, 'b': -1, '♭': -1, '=': 0, '♮': 0, '': null };

  /* 可用单个音符符号表达的时值（1/32 单位）。附点由 dots 字段表示。 */
  var DURABLE = [
    { d: 64, dots: 0 }, { d: 48, dots: 1 }, { d: 32, dots: 0 }, { d: 24, dots: 1 },
    { d: 16, dots: 0 }, { d: 12, dots: 1 }, { d: 8, dots: 0 }, { d: 6, dots: 1 },
    { d: 4, dots: 0 }, { d: 3, dots: 1 }, { d: 2, dots: 0 }, { d: 1, dots: 0 }
  ];

  /* 与 strict-align.js 的 isBarNavTok 同一套表（那边没导出，这里照抄，不改那边） */
  var BARS = { '|': 1, '||': 1, '||/': 1, '|]': 1, '|:': 1, ':|': 1, '|:|': 1 };
  var NAVS = ['fine', 'dc', 'ds', 'coda', 'segno'];

  /* ── 小工具 ───────────────────────────────────────────────────────────── */

  function normKey(k) {
    var m = String(k == null ? '' : k).trim().match(/^([A-Ga-g])([#b♯♭]?)$/);
    if (!m) return null;
    var letter = m[1].toUpperCase();
    var acc = m[2].replace('♯', '#').replace('♭', 'b');
    return { letter: letter, acc: acc, pc: (LETTER_PC[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12 };
  }

  /* 和弦名清洗：`{sp}`（CECP-SONG-EXT 的显式占位符）与 `ㅤ`(U+3164)/全角空格
     都是**排版占位**，不是和弦的一部分。不洗掉会渲染成 `Dm7{sp}`、`{sp}{sp}{sp}G`。 */
  function cleanChord(t) {
    var v = String(t == null ? '' : t).replace(/\{sp\}/g, '').replace(/[\u3164\u3000\s]+/g, '').trim();
    return v || null;
  }

  function parseTimeSign(ts) {
    var v = SA._timeSign.normalizeTimeSignValue(ts);
    if (!v) return null;
    var p = v.split('/');
    return { text: v, num: +p[0], den: +p[1], unitsPerMeasure: (+p[0]) * (32 / (+p[1])) };
  }

  /** 拆出小节线 / 导航记号。返回 {bar, nav} —— 任一可为 null。 */
  function splitBarNav(tk) {
    var t = String(tk == null ? '' : tk);
    if (BARS[t]) return { bar: t, nav: null };
    for (var i = 0; i < NAVS.length; i++) {
      var n = NAVS[i];
      if (t.length > n.length && t.slice(-n.length).toLowerCase() === n) {
        var pre = t.slice(0, t.length - n.length);
        if (BARS[pre]) return { bar: pre, nav: n };
        if (pre === '*') return { bar: null, nav: n };
      }
      if (t.toLowerCase() === n) return { bar: null, nav: n };
    }
    return { bar: null, nav: null };
  }

  function barlineRole(bar) {
    switch (bar) {
      case '||': return { close: 'double', open: 'none' };
      case '||/': case '|]': return { close: 'final', open: 'none' };
      case '|:': return { close: 'normal', open: 'repeat-start' };
      case ':|': return { close: 'repeat-end', open: 'none' };
      case '|:|': return { close: 'repeat-end', open: 'repeat-start' };
      default: return { close: 'normal', open: 'none' };
    }
  }

  /* ── 音位 token 解析 ──────────────────────────────────────────────────── */

  /* 音符：[临时记号] 数字 [八度记号] [附点] [下划线] [附点] [延长记号]
     附点允许出现在下划线前或后（曲库两种写法都有：`5·_` 与 `5_·`）。 */
  var NOTE_RE = /^([#b=♯♭♮]?)([0-7])([',’]*)(·?)(_{0,2})(·?)(\^?)$/;

  /**
   * 解析一个音位 token。返回 null 表示无法识别（调用方要记 warning）。
   * @returns {{kind:'note'|'rest'|'spacer'|'dash', units:number, dots:0|1,
   *            degree?:number, octaveMarks?:number, accidental?:string, fermata?:boolean}}
   */
  function parseSlotToken(tok) {
    var t = String(tok == null ? '' : tok).trim();
    if (!t) return null;
    if (t === '-') return { kind: 'dash', units: Q, dots: 0 };

    var m = t.match(/^sp(_{0,2})$/);
    if (m) return { kind: 'spacer', units: 0, dots: 0, underlines: m[1].length };

    m = t.match(NOTE_RE);
    if (!m) return null;
    var acc = m[1], degree = +m[2], octStr = m[3];
    var dotted = !!(m[4] || m[6]);
    var underlines = m[5].length;
    var fermata = !!m[7];

    var units = Q >> underlines;                 // 8 / 4 / 2
    var dots = dotted ? 1 : 0;
    if (dotted) units = units * 1.5;             // 1/32 基准下恒为整数（最小 2*1.5=3）

    var oct = 0;
    for (var i = 0; i < octStr.length; i++) oct += (octStr[i] === ',') ? -1 : 1;

    return {
      kind: degree === 0 ? 'rest' : 'note',
      units: units, dots: dots, degree: degree, octaveMarks: oct,
      accidental: acc.replace('♯', '#').replace('♭', 'b').replace('♮', '='),
      fermata: fermata
    };
  }

  /** 音级 + 八度 + 临时记号 → 绝对音高。主音落在第 4 八度。 */
  function pitchOf(parsed, keyInfo) {
    var tonicLetterIdx = LETTERS.indexOf(keyInfo.letter);
    var absLetterIdx = tonicLetterIdx + (parsed.degree - 1) + 7 * parsed.octaveMarks;
    var step = LETTERS[((absLetterIdx % 7) + 7) % 7];
    var octave = 4 + Math.floor(absLetterIdx / 7);

    var explicit = ACC_ALTER[parsed.accidental];
    var pc = (keyInfo.pc + MAJOR_STEPS[parsed.degree - 1] + (explicit || 0) + 120) % 12;
    if (explicit === 0) pc = (LETTER_PC[step] + 120) % 12;      // `=` 还原号：就是本位音

    var alter = pc - LETTER_PC[step];
    while (alter > 6) alter -= 12;
    while (alter < -6) alter += 12;

    return {
      step: step, alter: alter, octave: octave,
      midi: (octave + 1) * 12 + LETTER_PC[step] + alter,
      explicitAccidental: parsed.accidental || null
    };
  }

  /** 两个事件的音高是否完全相同（延音线成立的前提）。 */
  function samePitchEvents(a, b) {
    if (!a || !b) return false;
    if (!a.pitches.length || a.pitches.length !== b.pitches.length) return false;
    return a.pitches.every(function (p, k) {
      var q = b.pitches[k];
      return p.step === q.step && p.alter === q.alter && p.octave === q.octave;
    });
  }

  /** 把一个时值拆成「可用单音符表达」的片段序列（跨片段用 tie 连）。 */
  function splitDurable(units) {
    var out = [], left = units, guard = 0;
    while (left > 0 && guard++ < 16) {
      var picked = null;
      for (var i = 0; i < DURABLE.length; i++) {
        if (DURABLE[i].d <= left) { picked = DURABLE[i]; break; }
      }
      if (!picked) break;
      out.push({ units: picked.d, dots: picked.dots });
      left -= picked.d;
    }
    return { pieces: out, remainder: left };
  }

  /* ── 主转换 ───────────────────────────────────────────────────────────── */

  /**
   * @param {object} song  歌曲 JSON（**不会被修改**）
   * @param {object} [opts] { key: '目标调，默认 song.origKey' }
   */
  function songToIR(song, opts) {
    opts = opts || {};
    var warnings = [];
    function warn(code, msg, where) {
      warnings.push({ code: code, msg: msg, where: where || null });
    }

    var srcKey = String((song && song.origKey) || 'C');
    var keyName = String(opts.key || srcKey);
    var keyInfo = normKey(keyName);
    if (!keyInfo) { warn('BAD_KEY', '调名无法解析：' + keyName + '，退回 C', null); keyInfo = normKey('C'); }
    /* 规范化：曲库里有写成小写的（test.json 的 "b"），直接塞进 ABC 的 K: 会被当成参数名 */
    keyName = keyInfo.letter + keyInfo.acc;

    var songTs = parseTimeSign((song && song.timeSign) || '4/4');
    if (!songTs) { warn('BAD_TIMESIGN', '拍号无法解析，退回 4/4', null); songTs = parseTimeSign('4/4'); }

    var isStrict = !!(song && song.align === 'strict');

    /* ── 1. 把整首歌摊平成带出处的 token 流 ───────────────────────────── */
    var flat = [];
    var cellLyrics = {};        // 'si/li/ci' -> [lyric, lyric2, lyric3, lyric4]（非 strict 后处理用）
    (song && song.sections || []).forEach(function (sec, si) {
      flat.push({ type: 'section', name: (sec && sec.name) || '', si: si });
      (sec && sec.lines || []).forEach(function (line, li) {
        var segs = Array.isArray(line) ? line : ((line && line.line) || []);
        segs.forEach(function (seg, ci) {
          if (!seg || typeof seg !== 'object') return;
          if (typeof seg.label === 'string') return;                 // 段落标记块，不产音

          var where = { si: si, li: li, ci: ci };

          if (!isStrict) cellLyrics[si + '/' + li + '/' + ci] = [seg.lyric, seg.lyric2, seg.lyric3, seg.lyric4];
          var cellTs = SA._timeSign.normalizeTimeSignValue(seg.timeSign || seg.ts || seg.meter || '');
          if (cellTs) flat.push({ type: 'timesign', value: cellTs, where: where });

          if (!seg.n) {
            /* 无 n 的格子：lyric 是竖线时当作一条小节线（曲库里 77 处，5 首歌） */
            if (/[|｜]/.test(String(seg.lyric || ''))) flat.push({ type: 'bar', bar: '|', where: where });
            return;
          }

          var toks = SA.tokenizeN(seg.n);
          var slotIdx = 0;
          var aligned = null;
          var looseChord = null;
          if (isStrict) {
            aligned = SA.alignRow(seg.n, seg.chord || '', [seg.lyric || '', seg.lyric2 || '', seg.lyric3 || '', seg.lyric4 || '']);
          } else {
            /* 非 strict 歌没有下标语义（和弦靠 ㅤ 的测量宽度定位），但和弦对乐手太重要，
               不能整个丢掉。实测非 strict 的有和弦 cell 里 97.4% 只有一个和弦，
               所以按「本 cell 的发声音位上均匀铺开」处理：单和弦落在第一个音上（准确），
               多和弦均匀分布（近似）。歌词不这么做——歌词错一格就读不通，和弦错一格还能弹。 */
            var chTokens = SA.tokenizeChord(String(seg.chord || '').replace(/\{sp\}/g, ' '))
              .map(cleanChord)
              .filter(function (t) { return t && t !== '@'; });
            if (chTokens.length) {
              var sounding = SA.splitSlots(seg.n).filter(function (t) { return t !== '-' && !/^sp/.test(t); }).length;
              if (sounding > 0) {
                looseChord = {};
                for (var ci2 = 0; ci2 < chTokens.length; ci2++) {
                  looseChord[Math.floor(ci2 * sounding / chTokens.length)] = chTokens[ci2];
                }
              }
            }
          }
          var soundIdx = 0;

          toks.forEach(function (tk, ti) {
            var w = { si: si, li: li, ci: ci, ti: ti };
            if (SA.isDualAtom(tk)) {
              var payload = { type: 'slot', tok: tk, where: w };
              if (aligned) {
                payload.chord = cleanChord(aligned.chords[slotIdx]);
                payload.lyrics = aligned.lyrics.map(function (row) { return row[slotIdx] || null; });
              } else if (looseChord) {
                var isSounding = (tk !== '-' && !/^sp/.test(tk));
                if (isSounding) { if (looseChord[soundIdx] != null) payload.chord = looseChord[soundIdx]; soundIdx++; }
              }
              slotIdx++;
              flat.push(payload);
              return;
            }
            /* 结构 token */
            var its = SA._timeSign.extractInlineTimeSignToken(tk);
            if (its) { flat.push({ type: 'timesign', value: its, where: w }); return; }
            var bn = splitBarNav(tk);
            if (bn.bar || bn.nav) { flat.push({ type: 'bar', bar: bn.bar, nav: bn.nav, where: w }); return; }
            if (tk === '(') { flat.push({ type: 'slur', op: 'open', cross: false, where: w }); return; }
            if (tk === ')') { flat.push({ type: 'slur', op: 'close', cross: false, where: w }); return; }
            if (tk === '([') { flat.push({ type: 'slur', op: 'open', cross: true, where: w }); return; }
            if (tk === '])') { flat.push({ type: 'slur', op: 'close', cross: true, where: w }); return; }
            if (/^\{[35]$/.test(tk)) { flat.push({ type: 'tuplet', op: 'open', num: +tk.slice(1), where: w }); return; }
            if (tk === '}') { flat.push({ type: 'tuplet', op: 'close', where: w }); return; }
            if (tk === '[v1' || tk === '[v2') { flat.push({ type: 'volta', op: 'open', label: tk.slice(2), where: w }); return; }
            var vm = tk.match(/^\[v:(.+)\]$/);
            if (vm) { flat.push({ type: 'volta', op: 'open', label: vm[1], where: w }); return; }
            if (tk === ']v') { flat.push({ type: 'volta', op: 'close', where: w }); return; }
            if (tk === '!') { flat.push({ type: 'beambreak', where: w }); return; }
            if (tk.charAt(0) === '~') {
              var span = /^~(\d+)$/.test(tk) ? +tk.slice(1) : tk.length;
              flat.push({ type: 'tie', span: span, where: w }); return;
            }
            warn('UNKNOWN_TOKEN', '无法识别的结构 token：' + JSON.stringify(tk), w);
          });
        });
      });
    });

    /* ── 2. 走一遍 token 流，装配小节与事件 ───────────────────────────── */
    var sections = [];
    var curSection = null;
    var curMeasure = null;
    var measureNo = 0;
    var curTs = songTs;
    var pendingOpen = 'none';
    var pendingVolta = null;
    var voltaNeedsMark = false;
    var pendingBeamBreak = false;
    var pendingSlurOpen = [];
    var slurStack = [];
    var slurSeq = 0;
    var tupletOpen = null;
    var lastEventGlobal = null;      // 跨小节延音用
    var eventSeq = [];               // 全部事件的顺序表（`~` 找左端点用）
    var pendingTie = null;           // 等待右端点的 `~`
    var lastMeasureGlobal = null;
    var stats = { slots: 0, parsed: 0, dual: 0, tie: 0, tuplet: 0, crossSlur: 0 };
    var meterChanges = [];

    function newSection(name, si) {
      curSection = { name: name, si: si, measures: [] };
      sections.push(curSection);
    }
    function newMeasure(where) {
      if (!curSection) newSection('', 0);
      curMeasure = {
        no: ++measureNo, timeSign: curTs.text,
        openBarline: pendingOpen, closeBarline: null,
        volta: voltaNeedsMark ? pendingVolta : null, nav: null,
        unitsExpected: curTs.unitsPerMeasure, unitsActual: 0,
        ok: null, hasTuplet: false, hasDual: false, events: [], where: where || null
      };
      pendingOpen = 'none';
      if (voltaNeedsMark) voltaNeedsMark = false;
      curSection.measures.push(curMeasure);
    }
    function ensureMeasure(where) { if (!curMeasure) newMeasure(where); }

    function closeMeasure(bar, nav) {
      if (!curMeasure) return;
      var role = barlineRole(bar || '|');
      curMeasure.closeBarline = role.close;
      if (nav) curMeasure.nav = nav;
      curMeasure.unitsActual = curMeasure.events.reduce(function (a, e) { return a + e.units; }, 0);
      curMeasure.ok = Math.abs(curMeasure.unitsActual - curMeasure.unitsExpected) < 1e-9;
      pendingOpen = role.open;
      lastMeasureGlobal = curMeasure;
      curMeasure = null;
    }

    function pushEvent(ev) {
      ensureMeasure(ev.src);
      if (pendingBeamBreak) { ev.beamBreakBefore = true; pendingBeamBreak = false; }
      if (pendingSlurOpen.length) { ev.slurStarts = pendingSlurOpen.slice(); pendingSlurOpen = []; }
      if (tupletOpen) { ev.tuplet = { num: tupletOpen.num, pos: tupletOpen.first ? 'start' : 'mid' }; tupletOpen.first = false; curMeasure.hasTuplet = true; }
      var split = splitDurable(ev.units);
      ev.pieces = split.pieces;
      if (split.remainder > 0) warn('DUR_UNREPRESENTABLE', '时值 ' + ev.units + '/32 无法拆成标准音符（余 ' + split.remainder + '）', ev.src);
      curMeasure.events.push(ev);
      eventSeq.push(ev);
      /* 结算等待中的 `~`：右端点必须同高 */
      if (pendingTie && ev.kind !== 'rest') {
        if (samePitchEvents(pendingTie.from, ev)) { pendingTie.from.tieStart = true; ev.tieStop = true; }
        else warn('TIE_PITCH_MISMATCH', '连音线两端音高不同，按非延音线处理', pendingTie.where);
        pendingTie = null;
      }
      lastEventGlobal = ev;
      return ev;
    }

    flat.forEach(function (item) {
      if (item.type === 'section') {
        if (curMeasure) closeMeasure('|', null);
        newSection(item.name, item.si);
        return;
      }
      if (item.type === 'timesign') {
        if (curMeasure && curMeasure.events.length) closeMeasure('|', null);
        var ts = parseTimeSign(item.value);
        if (ts) {
          /* 变拍按标准语义**持续到下一次变拍**。曲库里 bengpaobufangqi 标了 2/4 后
             又标回 4/4（正确写法）；只标一次不回去的，后续小节会大面积对不上——
             那是真实的数据缺漏，体检要把它报出来，不是在这里猜。 */
          if (ts.text !== curTs.text) meterChanges.push({ from: curTs.text, to: ts.text, where: item.where });
          curTs = ts;
        } else warn('BAD_TIMESIGN', '行内拍号无法解析：' + item.value, item.where);
        return;
      }
      if (item.type === 'bar') { ensureMeasure(item.where); closeMeasure(item.bar, item.nav); return; }
      if (item.type === 'volta') {
        if (item.op === 'open') {
          /* 跳房子括号只画在区间的**第一个**小节上，之后的小节归属同一个括号。
             早期写法给区间内每个小节都挂了标签，渲染出来是一串连续的 [1 [1 [1。 */
          pendingVolta = item.label;
          voltaNeedsMark = true;
          if (curMeasure && !curMeasure.volta) { curMeasure.volta = item.label; voltaNeedsMark = false; }
        } else { pendingVolta = null; voltaNeedsMark = false; }
        return;
      }
      if (item.type === 'beambreak') { pendingBeamBreak = true; return; }
      if (item.type === 'slur') {
        if (item.op === 'open') {
          var sid = ++slurSeq;
          pendingSlurOpen.push(sid);
          slurStack.push({ id: sid, cross: item.cross, where: item.where });
          if (item.cross) stats.crossSlur++;
        }
        else {
          /* `])` 是「跨小节圆滑线的收尾半弧」，按 spec §4.2 可以独立出现：
             ① `([` 在本 cell 内没有 `])` 时延伸到 cell 结束，之后的 `])` 就没有栈内伙伴；
             ② 反复结构里 `[v1 ])` 与 `[v2 ])` 会成对关掉同一个 `([`。
             所以未配对的 `])` 属正常数据，只有未配对的 `)` 才是真的不平衡。 */
          if (!slurStack.length) {
            if (!item.cross) { warn('SLUR_UNBALANCED', '多出一个圆滑线收尾 `)`', item.where); return; }
            var evsX = curMeasure && curMeasure.events;
            var tgtX = (evsX && evsX.length) ? evsX[evsX.length - 1] : lastEventGlobal;
            if (tgtX) { tgtX.slurStops = tgtX.slurStops || []; tgtX.slurStops.push(-1); }  // -1 = 无配对的收尾半弧
            stats.crossSlur++;
            return;
          }
          var open = slurStack.pop();
          var evs = curMeasure && curMeasure.events;
          var tgt = (evs && evs.length) ? evs[evs.length - 1] : lastEventGlobal;
          if (tgt) { tgt.slurStops = tgt.slurStops || []; tgt.slurStops.push(open.id); }
          if (open.cross || item.cross) stats.crossSlur++;
        }
        return;
      }
      if (item.type === 'tuplet') {
        if (item.op === 'open') { tupletOpen = { num: item.num, first: true }; stats.tuplet++; }
        else {
          var e2 = curMeasure && curMeasure.events;
          if (e2 && e2.length && e2[e2.length - 1].tuplet) e2[e2.length - 1].tuplet.pos = 'stop';
          tupletOpen = null;
        }
        return;
      }
      if (item.type === 'tie') {
        /* `~` = 从左边的音连到右边的音（延音线）。`~2` / `~~` 表示左端点往回数 2 个音。
           ⚠️ 只在左边打 tieStart 是不够的：右边那个音必须**同高**，延音线才成立。
           音高不同的话 ABC 的 `-` 闭合不了，abcjs 会画出一条横跨整行的悬空弧
           （SVG 里表现为 abcjs-start-edge + abcjs-end-edge，实测 20 处）。 */
        stats.tie++;
        var span = Math.max(1, item.span || 1);
        var anchor = eventSeq[eventSeq.length - span] || null;
        if (!anchor) { warn('TIE_NO_ANCHOR', '连音线左边没有音符', item.where); return; }
        pendingTie = { from: anchor, where: item.where };
        return;
      }

      /* ── 音位 ── */
      stats.slots++;
      var tok = item.tok;
      var dualSides = null;
      if (/[\/／]/.test(tok) && tok.length > 2) {
        var parts = tok.split(/[\/／]/);
        dualSides = [parts[0] || 'sp', parts[1] || 'sp'];
      }

      var parsed, pitches = [], units, dots, fermata = false;

      if (dualSides) {
        stats.dual++;
        var top = parseSlotToken(dualSides[0]);
        var bot = parseSlotToken(dualSides[1]);
        if (!top && !bot) { warn('UNPARSED_SLOT', '双音两侧都无法解析：' + tok, item.where); return; }
        /* PLAN §5.4：时值取【下声部】。全曲库实测拍数正确率 25/25。 */
        var ruler = bot || top;
        if (top && bot && bot.units > top.units) warn('DUAL_DUR_ANOMALY', '双音下声部时值大于上声部：' + tok, item.where);
        units = ruler.units; dots = ruler.dots;
        [top, bot].forEach(function (p) {
          if (p && p.kind === 'note') { pitches.push(pitchOf(p, keyInfo)); if (p.fermata) fermata = true; }
        });
        pitches.sort(function (a, b) { return a.midi - b.midi; });   // ABC 和弦惯例：低音在前
        parsed = ruler;
        if (curMeasure) curMeasure.hasDual = true; else { ensureMeasure(item.where); curMeasure.hasDual = true; }
        stats.parsed++;
      } else {
        parsed = parseSlotToken(tok);
        if (!parsed) { warn('UNPARSED_SLOT', '无法解析的音位：' + JSON.stringify(tok), item.where); return; }
        stats.parsed++;

        if (parsed.kind === 'spacer') return;                 // PLAN §5「sp 全部丢弃」

        if (parsed.kind === 'dash') {
          /* PLAN §5.1：增时线并入前一个事件；跨小节则拆成 tie */
          if (curMeasure && curMeasure.events.length) {
            var last = curMeasure.events[curMeasure.events.length - 1];
            last.units += Q;
            var re = splitDurable(last.units);
            last.pieces = re.pieces;
            if (re.remainder > 0) warn('DUR_UNREPRESENTABLE', '延长后时值 ' + last.units + '/32 无法表达', item.where);
            return;
          }
          if (lastEventGlobal && lastEventGlobal.kind !== 'rest') {
            lastEventGlobal.tieStart = true;
            ensureMeasure(item.where);
            pushEvent({
              kind: lastEventGlobal.kind, pitches: lastEventGlobal.pitches.slice(),
              units: Q, dots: 0, tieStop: true, tieStart: false,
              chordSymbol: null, lyrics: null, fermata: false, src: item.where
            });
            return;
          }
          if (lastEventGlobal && lastEventGlobal.kind === 'rest') {
            ensureMeasure(item.where);
            pushEvent({ kind: 'rest', pitches: [], units: Q, dots: 0, chordSymbol: null, lyrics: null, fermata: false, src: item.where });
            return;
          }
          warn('DASH_NO_ANCHOR', '增时线前面没有可延长的音，按休止处理', item.where);
          ensureMeasure(item.where);
          pushEvent({ kind: 'rest', pitches: [], units: Q, dots: 0, chordSymbol: null, lyrics: null, fermata: false, src: item.where });
          return;
        }

        units = parsed.units; dots = parsed.dots; fermata = parsed.fermata;
        if (parsed.kind === 'note') pitches.push(pitchOf(parsed, keyInfo));
      }

      pushEvent({
        kind: pitches.length > 1 ? 'chordstack' : (pitches.length ? 'note' : 'rest'),
        pitches: pitches, units: units, dots: dots,
        tieStart: false, tieStop: false, fermata: fermata,
        chordSymbol: item.chord || null,
        lyrics: item.lyrics || null,
        src: item.where
      });
    });
    if (curMeasure) closeMeasure('|', null);

    /* 每个小节标注它来自 JSON 的哪一行 —— 供 ir-to-abc 做「跟随简谱分行」。
       实测全曲库只有 1.0% 的小节跨 JSON 行（24/2402），所以按第一个事件的出处归行即可。 */
    sections.forEach(function (sec) {
      sec.measures.forEach(function (m) {
        var first = null;
        for (var i = 0; i < m.events.length; i++) { if (m.events[i].src) { first = m.events[i].src; break; } }
        m.srcLine = first ? (first.si + '/' + first.li) : null;
      });
    });

    /* ── 3. 弱起（anacrusis）配对：与相邻不完整小节相加恰好成一整小节的，不算错 ── */
    var allMeasures = [];
    sections.forEach(function (sec) { sec.measures.forEach(function (m) { allMeasures.push(m); }); });
    allMeasures.forEach(function (m, i) {
      m.anacrusisPair = false;
      if (m.ok !== false) return;
      [allMeasures[i - 1], allMeasures[i + 1]].forEach(function (nb) {
        if (!nb || nb.ok !== false || m.anacrusisPair) return;
        if (Math.abs(nb.unitsActual + m.unitsActual - m.unitsExpected) < 1e-9) m.anacrusisPair = true;
      });
    });

    /* ── 4. 音域中位数 → 整体八度平移建议（PLAN §5.6） ─────────────────── */
    var midis = [];
    allMeasures.forEach(function (m) {
      m.events.forEach(function (e) { e.pitches.forEach(function (p) { midis.push(p.midi); }); });
    });
    var octaveShift = 0;
    if (midis.length) {
      midis.sort(function (a, b) { return a - b; });
      var median = midis[Math.floor(midis.length / 2)];
      octaveShift = Math.round((71 - median) / 12);          // 71 = B4，五线谱中央区
    }

    var ir = {
      meta: {
        id: (song && song.id) || '', title: (song && song.title) || '', artist: (song && song.artist) || '',
        key: keyName, sourceKey: srcKey, timeSign: songTs.text, bpm: (song && song.bpm) || 72,
        lyricsAvailable: isStrict ? 'strict' : 'loose',       // PLAN §5.5：strict=精确，loose=97.1% 精确
        octaveShift: octaveShift,
        meterChanges: meterChanges,
        unitsPerQuarter: Q
      },
      stats: stats,
      warnings: warnings,
      sections: sections
    };

    /* 圆滑线配平：ABC 表达不了「半条弧」，而且括号必须**按发射顺序**良构。
       两类问题都要清掉：
         ① 未配对 —— `([` 延伸到 cell 结束却没等到 `])`；反复分支里两个 `])` 关同一个 `([`。
         ② 顺序颠倒 —— 收弧挂到了比开弧更早的音符上（开弧在 pending 状态等下一个音，
            收弧却回头挂到上一小节的末音），生成的 ABC 会出现 `)` 先于 `(`。
       做法：按事件顺序走一遍栈，栈上没有的收弧丢掉，走完还没收的开弧也丢掉。
       实测这样处理后 79 首的 ABC 括号全部良构。 */
    var degenerate = 0;
    (function balanceSlurs() {
      var flat = [];
      sections.forEach(function (sec) {
        sec.measures.forEach(function (m) { m.events.forEach(function (e) { flat.push(e); }); });
      });
      var stack = [], keep = {}, startAt = {};
      flat.forEach(function (e, idx) {
        (e.slurStarts || []).forEach(function (id) { stack.push(id); startAt[id] = idx; });
        var stops = e.slurStops || [];
        var kept = [];
        stops.forEach(function (id) {
          if (id <= 0) return;                                  // 无配对的收尾半弧
          var at = stack.lastIndexOf(id);
          if (at < 0) return;                                   // 栈上没有 → 顺序颠倒或重复收
          stack.splice(at, 1);
          /* 退化圆滑线：开收落在**同一个音**上（简谱里像 `( 5 sp )`、`( 5 - )`，
             sp 丢弃、增时线并入之后组里只剩一个事件）。ABC 写成 `(G4)` 时 abcjs
             找不到第二个端点，会把弧画到行边缘 —— 就是那条横跨整行的长弧。
             实测全曲库 180 条（占圆滑线 13.1%，43 首歌）。直接丢掉。 */
          if (startAt[id] === idx) { degenerate++; return; }
          kept.push(id); keep[id] = 1;
        });
        e.slurStops = kept;
      });
      flat.forEach(function (e) {
        if (e.slurStarts) e.slurStarts = e.slurStarts.filter(function (id) { return keep[id]; });
      });
      if (degenerate) stats.degenerateSlurs = degenerate;
    })();

    /* 跨小节的「其实是延音线的弧线」默认就地认掉（用户决策 2026-09-09）。
       传 {crossBarTies:false} 可关掉——只给对照演示用，生产别关。 */
    if (opts.crossBarTies !== false) {
      var r = resolveCrossBarSlurs(ir, 'smart');
      ir.stats.ties = r.converted;
      ir.stats.slurs = r.kept;
    } else { ir.stats.ties = 0; ir.stats.slurs = 0; }

    /* 延音线兜底校验：ABC 的 `-` 只有在**下一个音同高**时才能闭合。
       闭合不了的话 abcjs 会画一条横跨整行、两端不接音符的悬空弧
       （SVG class 里同时出现 abcjs-start-edge 和 abcjs-end-edge）。
       这里把所有闭合不了的 tieStart 清掉 —— 不论它是哪一步打上的。 */
    (function validateTies() {
      var flat = [];
      sections.forEach(function (sec) {
        sec.measures.forEach(function (m) { m.events.forEach(function (e) { flat.push(e); }); });
      });
      flat.forEach(function (e, i) {
        if (!e.tieStart) return;
        if (samePitchEvents(e, flat[i + 1])) return;
        e.tieStart = false;
        if (flat[i + 1]) flat[i + 1].tieStop = false;
        warn('TIE_DANGLING', '延音线右端点不同高或不存在，已取消（否则会画出悬空长弧）', e.src || null);
      });
    })();

    /* strict 歌的 melisma：延音线后半段不吃字，ABC 里写 `_`。
       同样必须排在 resolveCrossBarSlurs 之后 —— tieStop 是那一步才打上的。 */
    if (ir.meta.lyricsAvailable === 'strict') sections.forEach(function (sec) {
      sec.measures.forEach(function (m) {
        m.events.forEach(function (e) { e._melisma = (e.kind !== 'rest') && !!e.tieStop; });
      });
    });

    /* ⚠️ 顺序要求：歌词对位**必须**排在 balanceSlurs + resolveCrossBarSlurs 之后。
       它靠圆滑线结构判断 melisma，而那两步会整理括号、把跨小节同音弧线转成延音线。
       排在前面会看到未整理的结构 —— 实测准确率从 97.1% 掉到 91.5%。 */
    /* ── 非 strict 歌的歌词对位 ────────────────────────────────────────
       2026-09-09 实测修正：早先判定「一字多音在非 strict 数据里无标记、无法还原」，
       **这个判断是错的**。标记一直都在 —— 就是 `( )` 括号组本身：
       简谱里一个字唱多个音时，那几个音会被括号括起来。

       规则：括号组内**只有第一个音吃字**，其余音是 melisma 续音（ABC 的 `_`）。
       休止不吃字；延音线后半段（tieStop）也不吃字（唱的还是同一个字）。

       全曲库实测（59 首非 strict 歌，3440 个有词 cell）：
         按「每个发声音位一个字」        74.8% 精确
         按「括号组=一字多音」           97.1% 精确  ← 采用
       按歌：45/59 首 ≥95%，54/59 ≥90%，最差的一首也有 85%。 */
    if (ir.meta.lyricsAvailable === 'loose') (function assignLooseLyrics() {
      var byCell = {};
      sections.forEach(function (sec) {
        sec.measures.forEach(function (m) {
          var depth = 0;
          m.events.forEach(function (e) {
            var starts = (e.slurStarts || []).length, stops = (e.slurStops || []).length;
            var insideAlready = depth > 0;
            depth += starts;
            e._takesSyllable = (e.kind !== 'rest') && !e.tieStop && !insideAlready;
            e._melisma = (e.kind !== 'rest') && (e.tieStop || insideAlready);
            depth -= stops; if (depth < 0) depth = 0;
            if (e.src) {
              var k = e.src.si + '/' + e.src.li + '/' + e.src.ci;
              (byCell[k] = byCell[k] || []).push(e);
            }
          });
        });
      });
      Object.keys(byCell).forEach(function (k) {
        var raw = cellLyrics[k];
        if (!raw) return;
        var rows = [];
        for (var r = 0; r < 4; r++) {
          var txt = String(raw[r] == null ? '' : raw[r]).replace(/\{sp\}/g, '').replace(/[\u3164\u3000]/g, '');
          rows.push(txt.trim() ? SA.tokenizeLyric(txt) : []);
        }
        if (!rows.some(function (x) { return x.length; })) return;
        var takers = byCell[k].filter(function (e) { return e._takesSyllable; });
        takers.forEach(function (e, i) {
          e.lyrics = rows.map(function (row) { return row[i] || null; });
        });
        var n = takers.length;
        rows.forEach(function (row, r) {
          /* 只对**有内容**的歌词行核对字数。某个 cell 只有 lyric2 没有 lyric
             （第二段词的替换句）是正常写法，不该报警。 */
          if (row.length > 0 && row.length !== n) {
            warn('LYRIC_COUNT', '歌词' + (r ? r + 1 : '') + ' 有 ' + row.length + ' 字，需词音位 ' + n + ' 个',
              { si: +k.split('/')[0], li: +k.split('/')[1], ci: +k.split('/')[2] });
          }
        });
      });
    })();


    return ir;
  }

  /**
   * 把「其实是延音线的圆滑线」认出来。
   *
   * 背景（2026-09-09 实测全曲库 450 个跨小节 ( ) 组）：
   *   89% 两端同音  → 是**延音线**（一个音跨过小节线继续唱）
   *    9% 括号在小节线后立即收尾，右边没音 → 只是收尾半弧，丢掉
   *    2% 两端异音  → 才是真正的圆滑线
   * 简谱没法用增时线 `-` 跨小节，所以用弧线连两个同音的音符表示「按住不放」。
   * 判定用的是延音线的定义本身：**弧线两端相邻 + 音高相同**。
   *
   * @param {'smart'|'slur'} policy  'slur' = 一律当圆滑线（只给对照演示用）
   */
  function resolveCrossBarSlurs(ir, policy) {
    var converted = 0, kept = 0;
    if (policy === 'slur') return { converted: 0, kept: 0 };

    var flat = [];
    ir.sections.forEach(function (sec, si) {
      sec.measures.forEach(function (m, mi) {
        m.events.forEach(function (e) { flat.push({ e: e, si: si, mi: mi, no: m.no }); });
      });
    });
    var startOf = {}, stopOf = {};
    flat.forEach(function (x, i) {
      (x.e.slurStarts || []).forEach(function (id) { startOf[id] = i; });
      (x.e.slurStops || []).forEach(function (id) { if (id > 0) stopOf[id] = i; });
    });

    function samePitch(a, b) {
      if (!a.pitches.length || a.pitches.length !== b.pitches.length) return false;
      return a.pitches.every(function (p, k) {
        var q = b.pitches[k];
        return p.step === q.step && p.alter === q.alter && p.octave === q.octave;
      });
    }

    Object.keys(startOf).forEach(function (id) {
      var i = startOf[id], j = stopOf[id];
      if (j == null) return;
      if (j !== i + 1) { kept++; return; }                       // 端点不相邻 → 乐句圆滑线
      var A = flat[i].e, B = flat[j].e;
      /* 只认**跨小节**的。小节内部同音相邻的弧线没有证据说明它是延音线
         —— 简谱在小节内要延长会写增时线 `-` 或附点，用弧线更可能是符尾/乐句记号。
         跨小节则不同：增时线跨不过小节线，只能用弧线，实测 89% 两端同音。 */
      if (flat[i].si === flat[j].si && flat[i].mi === flat[j].mi) { kept++; return; }
      if (A.kind === 'rest' || B.kind === 'rest') { kept++; return; }
      if (!samePitch(A, B)) { kept++; return; }                  // 音高不同 → 真圆滑线
      /* 同音相邻 → 延音线 */
      A.tieStart = true; B.tieStop = true;
      A.slurStarts = (A.slurStarts || []).filter(function (x) { return String(x) !== String(id); });
      B.slurStops = (B.slurStops || []).filter(function (x) { return String(x) !== String(id); });
      A.tieFromSlur = true;
      converted++;
    });
    return { converted: converted, kept: kept };
  }

  /** 汇总统计（体检报告用）。first/last 小节按弱起惯例不参与拍数核对。 */
  function summarize(ir) {
    var all = [];
    ir.sections.forEach(function (s) { s.measures.forEach(function (m) { all.push(m); }); });
    var out = { total: 0, exact: 0, anacrusis: 0, suspicious: 0, skipped: 0, rows: [] };
    all.forEach(function (m, i) {
      if (i === 0 || i === all.length - 1) { out.skipped++; return; }
      if (!m.events.length) { out.skipped++; return; }
      if (m.hasTuplet) { out.skipped++; return; }             // 连音符时值非整数，另行核对
      out.total++;
      if (m.ok) { out.exact++; return; }
      if (m.anacrusisPair) { out.anacrusis++; return; }
      out.suspicious++;
      var beats = m.unitsActual / Q, exp = m.unitsExpected / Q;
      var cat = (m.unitsActual === 0) ? '空小节(0拍)'
        : (Math.abs(m.unitsActual - m.unitsExpected * 2) < 1e-9) ? '恰好2倍(漏小节线)'
          : (m.unitsActual > m.unitsExpected) ? '超出' : '不足';
      out.rows.push({ no: m.no, beats: beats, expected: exp, cat: cat, where: m.where, timeSign: m.timeSign });
    });
    return out;
  }

  return {
    songToIR: songToIR,
    summarize: summarize,
    resolveCrossBarSlurs: resolveCrossBarSlurs,
    /* 以下导出供单测与体检脚本使用 */
    parseSlotToken: parseSlotToken,
    pitchOf: pitchOf,
    splitDurable: splitDurable,
    splitBarNav: splitBarNav,
    normKey: normKey,
    parseTimeSign: parseTimeSign,
    UNITS_PER_QUARTER: Q
  };
});
