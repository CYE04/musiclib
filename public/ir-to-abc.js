/* ✦ Designed & Built by YuEn © 2025–2026 ✦ */

/* shared/ir-to-abc.js — IR（shared/jp-ir.js）→ ABC 文本
 *
 * 规格见 musiclib-react-migration/STAFF_MODE_PLAN.md §6。
 * 纯函数、无 DOM。渲染交给 abcjs。
 *
 * 时值：IR 用 1/32 为单位，所以 ABC 头写 `L:1/32`，数字可直接照抄。
 * 选 1/32 而不是 1/16 是因为曲库有附点十六分音符（1/16 下是 1.5，非整数）。
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  if (root) root.CecpIrToAbc = mod;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
  'use strict';

  var SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  var FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  var KEY_ACC = {
    'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
    'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6, 'Cb': -7
  };

  /** 调号给某个字母音的固有升降（G 大调里 F 是 +1）。 */
  function keySigAlter(key, letter) {
    var n = KEY_ACC[key];
    if (n == null) n = 0;
    if (n > 0) return SHARP_ORDER.slice(0, n).indexOf(letter) >= 0 ? 1 : 0;
    if (n < 0) return FLAT_ORDER.slice(0, -n).indexOf(letter) >= 0 ? -1 : 0;
    return 0;
  }

  function accSymbol(alter) {
    if (alter === 0) return '=';
    if (alter === 1) return '^';
    if (alter === 2) return '^^';
    if (alter === -1) return '_';
    if (alter === -2) return '__';
    return '';
  }

  /** 绝对音高 → ABC 音名。C4=`C`，C5=`c`，C6=`c'`，C3=`C,` */
  function abcNoteName(step, octave) {
    if (octave >= 5) {
      var s = step.toLowerCase();
      for (var i = 5; i < octave; i++) s += "'";
      return s;
    }
    var t = step;
    for (var j = octave; j < 4; j++) t += ',';
    return t;
  }

  /**
   * @param {object} ir  jp-ir 产出的 IR
   * @param {object} [opts] { octaveShift:number|null, lyrics:boolean, wrapMeasures:number }
   */
  function irToAbc(ir, opts) {
    opts = opts || {};
    var key = ir.meta.key;
    var shift = (opts.octaveShift == null) ? (ir.meta.octaveShift || 0) : opts.octaveShift;
    /* 歌词默认**开**。strict 歌是精确对位；非 strict 歌走「括号组=一字多音」规则，
       实测 97.1% 精确（见 jp-ir 的 assignLooseLyrics）。 */
    var wantLyrics = (opts.lyrics !== false) && ir.meta.lyricsAvailable !== 'none';
    /* 有几段词：扫一遍看哪几行有内容 */
    var verseCount = 0;
    if (wantLyrics) {
      ir.sections.forEach(function (sec) {
        sec.measures.forEach(function (m) {
          m.events.forEach(function (e) {
            if (!e.lyrics) return;
            for (var r = 0; r < e.lyrics.length; r++) if (e.lyrics[r]) verseCount = Math.max(verseCount, r + 1);
          });
        });
      });
    }
    if (!verseCount) wantLyrics = false;
    /* 每行几小节：**默认不硬换行**（Infinity），交给 abcjs 按实际宽度自己排。
       理由：abcjs 有最小宽度，`staffwidth` 低于内容自然宽时它就放弃两端对齐、
       按自然宽排 —— 硬编码每行 4 小节在窄面板（<600px）上必然排不齐，
       实测满行极差 208px。去掉硬换行并让渲染端传 `wrap` 选项后极差降到 1px。
       渲染端必须配合传 abcjs 的 wrap 参数，否则会排成一条超长的单行。 */
    /* 断行策略：
         'jianpu'（默认）—— **跟随简谱的分行**，五线谱与简谱逐行对照。
                             实测简谱分行 99% 落在小节线上，每行 3–6 小节占 92%。
         'auto'           —— 不硬换行，交给 abcjs 的 wrap 按宽度自己排。
       用 'jianpu' 时渲染端**不要**传 abcjs 的 wrap 选项，否则硬换行会被覆盖。 */
    var lineMode = opts.lineBreaks || 'jianpu';
    var perLine = opts.wrapMeasures || Infinity;

    var out = [];
    /* 行末对齐：abcjs 本来就把每行撑满 staffwidth，只有**段落末行**是短的
       （全库 634 行里 45 行短，其中 41 行不到半宽）。
       `%%stretchlast N` 的语义是「空白比例小于 N 才拉」，即 N = 最多允许拉多少。
       取 0.38 是为了跟简谱那边的既有约定对齐 —— shared/justify-rows.js 的
       「自然宽 < 0.62×最大宽 的行保持左对齐」，1 - 0.62 = 0.38。
       传 stretchLast:true 可全部拉满（会把 40 条很短的行撑得很散），
       传 false 则完全不拉。 */
    var stretch = (opts.stretchLast === undefined) ? 0.38 : opts.stretchLast;
    if (stretch !== false) out.push('%%stretchlast ' + (stretch === true ? 'true' : stretch));
    out.push('X:1');
    out.push('T:' + (ir.meta.title || '').replace(/[\r\n]/g, ' '));
    if (ir.meta.artist) out.push('C:' + ir.meta.artist.replace(/[\r\n]/g, ' '));
    out.push('M:' + ir.meta.timeSign);
    out.push('L:1/32');
    out.push('Q:1/4=' + (ir.meta.bpm || 72));
    out.push('K:' + key);

    ir.sections.forEach(function (sec) {
      if (sec.name) out.push('%%text ' + sec.name.replace(/[\r\n]/g, ' '));
      var body = '', measuresOnLine = 0, curTs = ir.meta.timeSign;
      var words = [];
      for (var vi = 0; vi < verseCount; vi++) words.push('');
      var accState = {};                                     // 小节内临时记号状态

      function flushLine() {
        if (!body.trim()) { body = ''; resetWords(); measuresOnLine = 0; return; }
        out.push(body.trim());
        if (wantLyrics) {
          words.forEach(function (w) {
            /* 整行都是占位（`*` `_` `|` 空格）就不输出这一段 —— 免得多出一条空词行 */
            if (/[^*_|\s]/.test(w)) out.push('w: ' + w.trim());
          });
        }
        body = ''; resetWords(); measuresOnLine = 0;
      }
      function resetWords() { for (var q = 0; q < words.length; q++) words[q] = ''; }

      var lastSrcLine = null;
      sec.measures.forEach(function (m) {
        if (!m.events.length && m.openBarline === 'none' && !m.volta) return;

        /* 跟随简谱分行：来源行一变就断一次 */
        if (lineMode === 'jianpu' && m.srcLine && lastSrcLine && m.srcLine !== lastSrcLine) flushLine();
        if (m.srcLine) lastSrcLine = m.srcLine;

        if (m.timeSign !== curTs) { body += '[M:' + m.timeSign + ']'; curTs = m.timeSign; }
        if (m.openBarline === 'repeat-start') body += '|:';
        if (m.volta) {
          /* ABC 的跳房子括号只接受数字/数字列表（`[1` `[2` `[1,2` `[1-3`）。
             曲库里有 `[v:从前奏接Bridge]` `[v:最后一遍]` 这种任意文字标签，
             直接写进 `[` 会被当成和弦括号解析，产生一串 Unknown character。
             文字标签改成谱面上方的文本标注，信息不丢、语法也合法。 */
          var vl = String(m.volta);
          if (/^[0-9]+([,\-][0-9]+)*$/.test(vl)) body += '[' + vl + ' ';
          else body += '"^' + vl.replace(/"/g, '') + '"';
        }
        accState = {};                                       // 小节线重置临时记号

        m.events.forEach(function (e) {
          if (e.beamBreakBefore) body += ' ';
          if (e.chordSymbol) body += '"' + String(e.chordSymbol).replace(/"/g, '') + '"';
          (e.slurStarts || []).forEach(function () { body += '('; });
          if (e.fermata) body += 'H';                        // ABC 的装饰记号是**前缀**

          e.pieces.forEach(function (piece, pi) {
            var head = '';
            if (e.kind === 'rest' || !e.pitches.length) {
              head = 'z' + (piece.units === 1 ? '' : piece.units);
            } else {
              var parts = e.pitches.map(function (p) {
                var oct = p.octave + shift;
                var want = p.alter;
                var have = (accState[p.step + oct] !== undefined) ? accState[p.step + oct] : keySigAlter(key, p.step);
                var acc = '';
                if (want !== have) { acc = accSymbol(want); accState[p.step + oct] = want; }
                return acc + abcNoteName(p.step, oct);
              });
              head = (parts.length > 1 ? '[' + parts.join('') + ']' : parts[0]) + (piece.units === 1 ? '' : piece.units);
            }
            body += head;
            /* 拆出来的片段之间必须用 tie 连成一个音 */
            if (pi < e.pieces.length - 1) body += '-';
          });

          /* ⚠️ ABC 语法顺序：延音线 `-` 必须**紧跟音符**，在收圆滑线 `)` 之前。
             写成 `d4)-` 会被 abcjs 当成 "Unknown character ignored" 丢掉。 */
          if (e.tieStart) body += '-';
          (e.slurStops || []).forEach(function () { body += ')'; });
          body += ' ';

          if (wantLyrics && e.kind !== 'rest') {
            for (var vr = 0; vr < verseCount; vr++) {
              var syl = (e.lyrics && e.lyrics[vr]) ? String(e.lyrics[vr]) : null;
              /* `_` = 上一个字继续唱到这个音（melisma / 延音线后半段）
                 `*` = 这个音没有字
                 ABC 的 w: 行里，音节按音符顺序对齐，休止符不参与 */
              words[vr] += (e._melisma ? '_' : (syl || '*')) + ' ';
            }
          }
        });

        var close = m.closeBarline;
        body += (close === 'double' ? '|| ' : close === 'final' ? '|] '
          : close === 'repeat-end' ? ':| ' : '| ');
        /* w: 行也放一条 `|`：ABC 用它在小节线处重新对齐音节。
           某个小节字数对不上时，错位止步于该小节，不会往后传染整首歌。 */
        if (wantLyrics) for (var wb = 0; wb < verseCount; wb++) words[wb] += '| ';
        measuresOnLine++;
        if (measuresOnLine >= perLine) flushLine();
      });
      flushLine();
    });

    return out.join('\n') + '\n';
  }

  return { irToAbc: irToAbc, keySigAlter: keySigAlter, abcNoteName: abcNoteName };
});
