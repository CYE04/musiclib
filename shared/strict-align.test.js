/* shared/strict-align.test.js — 纯函数单测（node shared/strict-align.test.js）
 * 无依赖，无 DOM。也顺带对全部真实歌库跑一遍 splitSlots 冒烟。 */
'use strict';
var SA = require('./strict-align.js');
var fs = require('fs'), path = require('path');

var pass = 0, fail = 0, fails = [];
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function t(name, got, want) {
  if (eq(got, want)) { pass++; }
  else { fail++; fails.push({ name: name, got: got, want: want }); }
}

/* ── splitSlots：音位切分 ───────────────────────────── */
t('基本音符', SA.splitSlots('1 2 3 4'), ['1', '2', '3', '4']);
t('小节线不占位', SA.splitSlots('1 2 | 3 4 |'), ['1', '2', '3', '4']);
t('增时线 - 算音位', SA.splitSlots('1 - 2 -'), ['1', '-', '2', '-']);
t('休止 0 算音位', SA.splitSlots('0 1 0 2'), ['0', '1', '0', '2']);
t('占位 sp 算音位', SA.splitSlots('1 sp 2 sp_'), ['1', 'sp', '2', 'sp_']);
t('连音线括号不占位', SA.splitSlots('( 1 2 ) 3'), ['1', '2', '3']);
t('跨小节连音线（|不占位、不断）', SA.splitSlots('( 2 | 3 )'), ['2', '3']);
t('嵌套连音线', SA.splitSlots('( ( 4 | 5 ) 5 )'), ['4', '5', '5']);
t('上下双音合成一个音位', SA.splitSlots('1 / 2 3'), ['1/2', '3']);
t('双音在中间', SA.splitSlots('1 2 / 3'), ['1', '2/3']);
t('三连音符 {3 } 不占位', SA.splitSlots('{3 1 2 3 }'), ['1', '2', '3']);
t('连音线 ~ 不占位', SA.splitSlots('1 ~ 2 ~2 3'), ['1', '2', '3']);
t('跨行连音 token ([ ]) 不占位', SA.splitSlots('([ 2 sp'), ['2', 'sp']);
t('跨行连音收口 ])', SA.splitSlots(']) 2 sp'), ['2', 'sp']);
t('跳房子 volta 不占位', SA.splitSlots('[v1 1 2 ]v'), ['1', '2']);
t('行内拍号 [ts:..] 不占位', SA.splitSlots('[ts:4/4] 1 2'), ['1', '2']);
t('带修饰符仍是单音位', SA.splitSlots("1'_ 7,__ #4 3·"), ["1'_", '7,__', '#4', '3·']);
t('延长号 ^ 后缀仍是音位', SA.splitSlots('5^ 6'), ['5^', '6']);
t('断梁标记 ! 不是音位', SA.splitSlots('1_ ! 1_'), ['1_', '1_']);
t('断梁 ! 不占对齐/不需@', SA.alignRow('1_ ! 1_', 'C D', '我 你').chords, ['C', 'D']);
t('断梁 ! 无警告', SA.alignRow('1_ ! 1_', 'C D', '我 你').warnings.length, 0);
t('裸 / 不成对则丢弃', SA.splitSlots('1 /'), ['1']);
t('空串', SA.splitSlots(''), []);
t('全空白', SA.splitSlots('   '), []);

/* ── alignRow：对位 + @ + 警告 ───────────────────────── */
var r1 = SA.alignRow('1 2 3 4', 'C @ @ D', '我 @ 爱 你');
t('对位-音位数', r1.slotCount, 4);
t('对位-和弦落位', r1.chords, ['C', null, null, 'D']);
t('对位-歌词落位(@转null)', r1.lyrics[0], ['我', null, '爱', '你']);
t('对位-无警告', r1.warnings.length, 0);

var r2 = SA.alignRow('1 2 | 3 4', 'C @ Am @', ['我 爱 你 主', '第 二 段 词']);
t('跨小节-和弦4位', r2.chords, ['C', null, 'Am', null]);
t('多行歌词-各自对位', r2.lyrics.length, 2);
t('多行歌词-第2行', r2.lyrics[1], ['第', '二', '段', '词']);

/* 拖腔：字在第一个音、后面 @ */
var r3 = SA.alignRow('( 1 2 ) 3', 'C @ @', '我 @ 主');
t('拖腔-括号不占位后 3 音位', r3.slotCount, 3);
t('拖腔-歌词', r3.lyrics[0], ['我', null, '主']);

/* 叠和弦逗号 */
t('叠和弦拆分(第一个在下)', SA.splitChordStack('C,G'), ['C', 'G']);
t('叠和弦-alignRow保留原token', SA.alignRow('1 2', 'C,G @').chords, ['C,G', null]);
t('单和弦拆分', SA.splitChordStack('Am7'), ['Am7']);
t('空叠和弦', SA.splitChordStack(null), []);

/* 数量不符：只警告、仍返回、指明第几个音位 */
var over = SA.alignRow('1 2 3', 'C D E F G');
t('超出-仍对满音位', over.chords, ['C', 'D', 'E']);
t('超出-有警告', over.warnings.length, 1);
t('超出-指明起点音位', over.warnings[0].slot, 4);
t('超出-kind', over.warnings[0].kind, 'over');

var under = SA.alignRow('1 2 3 4', 'C D');
t('不足-前两位对上、后两位null', under.chords, ['C', 'D', null, null]);
t('不足-有警告', under.warnings.length, 1);
t('不足-指明起点音位(第3个)', under.warnings[0].slot, 3);
t('不足-kind', under.warnings[0].kind, 'under');

/* 每行歌词各自独立报警 */
var multi = SA.alignRow('1 2 3', '@ @ @', ['我 爱 你', '短 词']);
t('多行-第2行不足独立报警', multi.warnings.filter(function (w) { return w.field === 'lyric2'; }).length, 1);
t('多行-第1行不报警', multi.warnings.filter(function (w) { return w.field === 'lyric'; }).length, 0);

/* strictLyricPlain：搜索/展示用纯文本（丢 @ 与音位空白，拉丁词间留空格） */
t('纯文本-中文丢@紧接', SA.strictLyricPlain('我 心 歌 @ 唱'), '我心歌唱');
t('纯文本-全@为空', SA.strictLyricPlain('@ @ @'), '');
t('纯文本-拉丁词间留空格', SA.strictLyricPlain('amazing grace @ now'), 'amazing grace now');
t('纯文本-中英混排', SA.strictLyricPlain('主 is @ love'), '主is love');
t('纯文本-空串', SA.strictLyricPlain(''), '');
t('纯文本-老串ㅤ不误伤', SA.strictLyricPlain('永ㅤ远'), '永ㅤ远');

/* ── tokenizeLyric：歌词智能分词（连写 / @ / 标点粘字 / 拉丁按空格）───────── */
t('连写-中文每字一位', SA.tokenizeLyric('我爱你'), ['我', '爱', '你']);
t('连写-@拖腔占位', SA.tokenizeLyric('我爱@你'), ['我', '爱', '@', '你']);
t('连写-ASCII标点粘前字', SA.tokenizeLyric('你,主啊!'), ['你,', '主', '啊!']);
t('连写-中文标点粘字', SA.tokenizeLyric('主啊，我来。'), ['主', '啊，', '我', '来。']);
t('老写法-每字空格结果一致', SA.tokenizeLyric('我 爱 你'), ['我', '爱', '你']);
t('空格分隔的标点也粘前字', SA.tokenizeLyric('你 ， 天'), ['你，', '天']);
t('拉丁按空格断音节', SA.tokenizeLyric('Je sus loves'), ['Je', 'sus', 'loves']);
t('拉丁整词占一位', SA.tokenizeLyric('Jesus'), ['Jesus']);
t('中英混排', SA.tokenizeLyric('耶稣Jesus'), ['耶', '稣', 'Jesus']);
t('撇号属词内', SA.tokenizeLyric("don't"), ["don't"]);
t('tokenizeLyric空串', SA.tokenizeLyric(''), []);
t('连写对位-歌词落位', SA.alignRow('1 2 3', 'C @ @', '我爱你').lyrics[0], ['我', '爱', '你']);
t('连写对位-@转null', SA.alignRow('1 2 3 4', '', '我爱@你').lyrics[0], ['我', '爱', null, '你']);
t('连写对位-无警告', SA.alignRow('1 2 3', 'C @ @', '我爱你').warnings.length, 0);
t('和弦不被智能拆分(仍按空格)', SA.alignRow('1 2', 'Am7 G').chords, ['Am7', 'G']);
t('纯文本-连写丢@', SA.strictLyricPlain('我爱@你'), '我爱你');

/* ── tokenizeChord：和弦内联 @ 免空格 ── */
t('和弦-老空格写法', SA.tokenizeChord('C @ @ @ G @'), ['C', '@', '@', '@', 'G', '@']);
t('和弦-内联@免空格', SA.tokenizeChord('C@@@G@'), ['C', '@', '@', '@', 'G', '@']);
t('和弦-混写', SA.tokenizeChord('C@@ @ G@'), ['C', '@', '@', '@', 'G', '@']);
t('和弦-多字母整体保留', SA.tokenizeChord('Am7@@ G'), ['Am7', '@', '@', 'G']);
t('和弦-逗号叠和弦不拆', SA.tokenizeChord('C,G@ Am'), ['C,G', '@', 'Am']);
t('和弦-斜杠低音', SA.tokenizeChord('C/G@@'), ['C/G', '@', '@']);
t('和弦-内联对位', SA.alignRow('1 2 3 3 5 6', 'C@@@G@').chords, ['C', null, null, null, 'G', null]);
t('和弦-空串', SA.tokenizeChord(''), []);

/* ── splitTrailingPunct：尾随标点拆分（悬挂渲染用）── */
t('尾随标点拆分', SA.splitTrailingPunct('说，'), { base: '说', punct: '，' });
t('无标点不拆', SA.splitTrailingPunct('说'), { base: '说', punct: '' });
t('多个尾标点', SA.splitTrailingPunct('来吧！」'), { base: '来吧', punct: '！」' });
t('全标点整体当base', SA.splitTrailingPunct('，'), { base: '，', punct: '' });
t('拉丁带标点', SA.splitTrailingPunct('Jesus,'), { base: 'Jesus', punct: ',' });

/* @ 绝不漏进结果 */
(function () {
  var res = SA.alignRow('1 2 3 4', '@ @ @ @', '@ @ @ @');
  var leaked = res.chords.concat(res.lyrics[0]).some(function (v) { return v === '@'; });
  t('@永不出现在返回值', leaked, false);
})();

/* ── 真实歌库冒烟：所有 seg.n 跑 splitSlots 不崩 ───────────── */
(function () {
  var dir = path.join(__dirname, '..', 'songs');
  var files;
  try { files = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.json'); }); }
  catch (e) { console.log('  (跳过歌库冒烟：' + e.message + ')'); return; }
  var songs = 0, segs = 0, totalSlots = 0, crashed = 0;
  files.forEach(function (f) {
    var d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return; }
    songs++;
    (d.sections || []).forEach(function (sec) {
      (sec.lines || []).forEach(function (line) {
        var arr = Array.isArray(line) ? line : (line.line || []);
        arr.forEach(function (seg) {
          if (!seg || typeof seg !== 'object') return;
          segs++;
          try { totalSlots += SA.splitSlots(seg.n || '').length; }
          catch (e) { crashed++; }
        });
      });
    });
  });
  t('歌库冒烟-无崩溃', crashed, 0);
  console.log('  冒烟：' + songs + ' 首 / ' + segs + ' 个 seg / ' + totalSlots + ' 个音位，0 崩溃');
})();

/* ── 汇总 ───────────────────────────── */
console.log('\n' + (fail === 0 ? '✅ ' : '❌ ') + pass + ' passed, ' + fail + ' failed');
fails.forEach(function (f) {
  console.log('  ✗ ' + f.name + '\n      got : ' + JSON.stringify(f.got) + '\n      want: ' + JSON.stringify(f.want));
});
process.exit(fail === 0 ? 0 : 1);
