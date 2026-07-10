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
