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
    row.style.display='inline-flex';
    var w=row.scrollWidth;
    row.style.display=prev;
    return w;
  });
  var maxW=0;
  widths.forEach(function(w){if(w>maxW)maxW=w;});
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
    plans.push({items:items,extra:extra,total:total});
  });
  plans.forEach(function(plan){
    plan.items.forEach(function(item){
      item.seg.style.marginRight=(item.base+plan.extra*item.w/plan.total)+'px';
      item.seg.setAttribute('data-ml-just','1');
    });
  });
  return plans.length;
}
/* ═══════════ CECP-JUSTIFY-ROWS v1 END ═══════════ */
