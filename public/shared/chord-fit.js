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
