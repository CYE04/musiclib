/* shared/strict-align.conformance.js — 副本一致性测试
 *   node shared/strict-align.conformance.js
 *
 * 为什么需要它：严格对位这套判定同时活在 5 个地方（权威 1 份 + 内联副本 4 份）。
 * 原来的 strict-align.test.js 只测权威那一份 —— 它测得很好，但测的是**没有任何页面在跑**的代码。
 * 真实发生过的事故形态：isBarNavTok（小节线/导航记号不算音位）先进了 musiclib.js，
 * 权威文件和它的 84 个测试对此一无所知，测试全绿，副本却已经分家。
 *
 * 这个脚本不改变任何人的写法，也不去消灭副本 —— 它只是把**同一套用例**
 * （直接复用 strict-align.test.js，一行不抄）灌进每一份副本各跑一遍。
 * 任何一份行为跑偏，这里立刻红。
 *
 * 副本为什么不能简单合并成一个文件：
 *   - musictool 活在 srcdoc iframe 的模板字符串里，反斜杠必须双写，物理上无法逐字共享；
 *     它用 barNavOf + isBarlineTok 走到同一个判定，写法不同、行为相同。
 *     所以这里比的是**行为**不是文本 —— 文本 diff 会天天误报，行为测试不会。
 *   - musiclib / youth 若改成 <script src> 真共享，会给引擎加一个加载顺序依赖，
 *     那是另一类风险（见 musiclib-react-migration/MIGRATION.md 的四个硬条件）。
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var BEGIN = '══ 内联 shared/strict-align.js';
var END = '══ /内联 strict-align（END）══';

/* musictool 不是逐字副本（srcdoc 模板里反斜杠双写，函数名带 sa 前缀，
   小节线判定走 barNavOf 而不是 isBarNavTok），纯函数层分散在两段。
   靠这两对标记抠，不需要 JS 解析器，也不用挪动它任何一行代码。 */
/* 标记刻意用纯 ASCII：musictool 是 srcdoc 模板字符串，非 ASCII 注释容易在编辑时
   被写成字面 \uXXXX（踩过），ASCII 标记不受这个坑影响。 */
var MT_REGIONS = [
  ['SA-CONFORMANCE-REGION-A-BEGIN', 'SA-CONFORMANCE-REGION-A-END'],
  ['SA-CONFORMANCE-REGION-B-BEGIN', 'SA-CONFORMANCE-REGION-B-END']
];

/* 名单里每一份都是"必须存在"的 —— 没有 optional。
   一份副本从名单里消失得是有人主动删掉这一行，而不是文件不在就静默跳过：
   真正上线的那份要是被跳过了，这个测试就等于没跑。
   （musiclib/musiclib.js 已于 2026-08 迁往独立仓库 CYE04/musiclib，
     它的接班人是下面的 musiclib-react-migration/public/musiclib.js。） */
var HOSTS = [
  { name: 'shared/strict-align.js（权威）', file: 'shared/strict-align.js', kind: 'module' },
  { name: 'youth-engine.js', file: 'youth-engine.js', kind: 'block' },
  { name: 'musiclib-react-migration/public/musiclib.js（线上跑的就是这份）', file: 'musiclib-react-migration/public/musiclib.js', kind: 'block' },
  { name: 'musictool/musictool.js', file: 'musictool/musictool.js', kind: 'musictool' }
];

/* ── 抽取 ───────────────────────────────────────────── */

function readHost(h) {
  var p = path.join(ROOT, h.file);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

/* 逐字内联块：切 BEGIN…END，原样 eval，拿 root.CecpStrictAlign */
function loadBlock(src, name) {
  var a = src.indexOf(BEGIN);
  var b = src.indexOf(END);
  if (a < 0 || b < 0) throw new Error('找不到 BEGIN/END 标记（' + name + '）');
  var block = src.slice(a - 3 < 0 ? 0 : src.lastIndexOf('/*', a), b + END.length + 3);
  var root = {};
  vm.runInNewContext(block, { globalThis: root, window: root, module: undefined });
  if (!root.CecpStrictAlign) throw new Error('块里没有暴露 CecpStrictAlign（' + name + '）');
  return { api: root.CecpStrictAlign, bytes: block.length };
}

function sliceBetween(src, begin, end, name) {
  var a = src.indexOf(begin);
  var b = src.indexOf(end, a + 1);
  if (a < 0 || b < 0) throw new Error('找不到标记「' + begin.slice(0, 24) + '…」（' + name + '）');
  return src.slice(src.indexOf('*/', a) + 2, b - 3 > 0 ? src.lastIndexOf('/*', b) : b);
}

function loadMusictool(src, name) {
  var code = MT_REGIONS.map(function (r) { return sliceBetween(src, r[0], r[1], name); }).join('\n');
  // srcdoc 模板里 \\s \\{ \\[ 是双写的，eval 前还原成真正的正则转义
  code = code.replace(/\\\\/g, '\\');
  var ctx = {};
  vm.runInNewContext(code + '\n;__api={' +
    'splitSlots:saSplitSlots, alignRow:saAlignRow, isDualAtom:saIsDualAtom,' +
    'tokenizeN:saTokenizeN, tokenizeLyric:saTokenizeLyric, tokenizeChord:saTokenizeChord,' +
    'splitChordStack:saSplitChordStack, splitTrailingPunct:saSplitTrailingPunct,' +
    '_timeSign:{normalizeTimeSignValue:normalizeTimeSignValue,' +
    'extractInlineTimeSignToken:extractInlineTimeSignToken}};', ctx);
  return { api: ctx.__api, bytes: code.length };
}

/* 某个副本可能天生就没有某个函数（例如 musictool 不需要 strictLyricPlain，它不做搜索）。
   给缺的补一个哨兵桩：碰到它的用例会失败，但会被归类为「无法评估」而不是「行为分家」——
   这两件事必须分开，否则报告会天天喊狼来了。 */
var MISSING = 'SA_MISSING_FN';

function fillMissing(api, refKeys) {
  var out = {}, lacks = [];
  refKeys.forEach(function (k) {
    if (api[k] !== undefined && api[k] !== null) out[k] = api[k];
    else { lacks.push(k); out[k] = function () { return MISSING; }; }
  });
  return { api: out, lacks: lacks };
}

function loadHost(h) {
  var src = readHost(h);
  if (src == null) return { skipped: '文件不存在' };
  if (h.kind === 'module') return { api: require(path.join(ROOT, h.file)), bytes: src.length };
  if (h.kind === 'block') return loadBlock(src, h.name);
  return loadMusictool(src, h.name);
}

/* ── 用同一套用例跑 ──────────────────────────────────── */
/* 直接复用 strict-align.test.js 的源码，把它 require 到的实现换成当前副本。
   一行用例都不重抄 —— 用例只有一处，永远不会两边打架。 */

var TEST_SRC = fs.readFileSync(path.join(__dirname, 'strict-align.test.js'), 'utf8')
  .replace(/process\.exit\([^)]*\)\s*;?/g, '');

function runCases(api) {
  var out = [];
  var ctx = {
    require: function (id) {
      if (id.indexOf('strict-align') >= 0) return api;
      return require(id);
    },
    console: { log: function (s) { out.push(String(s)); } },
    __dirname: __dirname,
    module: { exports: {} },
    Array: Array, JSON: JSON, String: String, Math: Math, Object: Object
  };
  ctx.exports = ctx.module.exports;
  vm.runInNewContext(TEST_SRC, ctx);
  return { pass: ctx.pass | 0, fail: ctx.fail | 0, fails: ctx.fails || [], log: out };
}

/* ── 主流程 ─────────────────────────────────────────── */

var rows = [], anyFail = false;
var REF_KEYS = Object.keys(require(path.join(ROOT, 'shared/strict-align.js')));

HOSTS.forEach(function (h) {
  var loaded;
  try { loaded = loadHost(h); }
  catch (e) { rows.push({ name: h.name, error: e.message }); anyFail = true; return; }

  if (loaded.skipped) {
    if (!h.optional) { rows.push({ name: h.name, error: loaded.skipped }); anyFail = true; }
    else rows.push({ name: h.name, skipped: loaded.skipped });
    return;
  }

  var filled = fillMissing(loaded.api, REF_KEYS);
  var r;
  try { r = runCases(filled.api); }
  catch (e) { rows.push({ name: h.name, error: '跑用例时抛异常：' + e.message }); anyFail = true; return; }

  var unevaluable = r.fails.filter(function (f) { return String(JSON.stringify(f.got)).indexOf(MISSING) >= 0; });
  var real = r.fails.filter(function (f) { return String(JSON.stringify(f.got)).indexOf(MISSING) < 0; });

  if (real.length) anyFail = true;
  rows.push({
    name: h.name, pass: r.pass, fail: real.length,
    fails: real, unevaluable: unevaluable.length, lacks: filled.lacks
  });
});

console.log('\n严格对位 · 副本一致性测试');
console.log('用例来源：shared/strict-align.test.js（同一套，灌进每一份副本）\n');

rows.forEach(function (r) {
  if (r.error) { console.log('  ❌ ' + r.name + '\n       ' + r.error); return; }
  if (r.skipped) { console.log('  ⏭  ' + r.name + '（' + r.skipped + '，可选副本）'); return; }
  var mark = r.fail === 0 ? '✅' : '❌';
  console.log('  ' + mark + ' ' + r.name + '  —  ' + r.pass + ' passed, ' + r.fail + ' failed'
    + (r.unevaluable ? '，' + r.unevaluable + ' 条无法评估' : ''));
  if (r.lacks && r.lacks.length) {
    console.log('       （此副本没有：' + r.lacks.join(', ') + '，相关用例已排除，不算分家）');
  }
  (r.fails || []).forEach(function (f) {
    console.log('       ✗ ' + f.name);
    console.log('           got : ' + JSON.stringify(f.got));
    console.log('           want: ' + JSON.stringify(f.want));
  });
});

/* 跨副本一致性：所有副本的 pass/fail 必须一模一样。
   某一份少通过几条，说明它的行为已经和别人分家了。 */
var counted = rows.filter(function (r) { return typeof r.pass === 'number'; });
/* 有效分 = 通过数 + 因缺函数而无法评估的条数。
   两份副本只要能评估的部分行为一致，有效分就该相等。 */
var sig = counted.map(function (r) { return (r.pass + r.unevaluable) + '/' + r.fail; });
var allSame = sig.every(function (s) { return s === sig[0]; });

console.log('');
if (!counted.length) {
  console.log('❌ 没有任何副本被成功加载');
  anyFail = true;
} else if (allSame && !anyFail) {
  console.log('✅ ' + counted.length + ' 份副本在可评估范围内行为完全一致（各 ' + sig[0].split('/')[0] + ' 条）');
} else {
  console.log('❌ 副本之间已经分家：' + counted.map(function (r, i) {
    return r.name.split('/').pop().split('（')[0] + '=' + sig[i];
  }).join('  '));
  anyFail = true;
}

process.exit(anyFail ? 1 : 0);
