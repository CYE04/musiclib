/* ═══════════ CECP-LYRIC-HL v1 BEGIN ═══════════
   共享模块：歌词荧光笔标记（本地持久化，仅歌词行可标记）。
   本块在以下两个文件中逐字节相同（权威版本 = shared/lyric-hl.js）：
     musiclib/musiclib.js / youth-engine.js
   （本期不含 musictool.js，但仍遵守共享块「禁止反斜杠」约定，
   转义一律用 String.fromCharCode，便于未来同步。）
   修改流程：先改 shared/lyric-hl.js，再同步两处，diff 校验一致。
   设计要点：
   - 只有 .p-lyric（含 lyric2/3/4，均带 .p-lyric 类）可被标记；
     .p-chord / .p-n 不参与。最小单位 = 一个 .prev-seg 里的一个歌词元素。
   - 标记直接写在元素上（data-hl 属性 + 注入 CSS 背景色），是真实
     DOM 样式，html2canvas 导出自动带上；导出前另有
     lyricHlPrepareExport 把颜色内联成白底可辨的实色。
   - 存储用 localStorage，键 cecp-lyric-hl:<songId>，值为内容坐标
     [[行号,分段号,歌词行号,颜色号],...]，与 DOM 实例无关；每次
     renderScore 重建 DOM 后由宿主调用 lyricHlApply 重放，坐标越界
     的标记静默忽略。
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
    return (data&&Object.prototype.toString.call(data.marks)==='[object Array]')?data.marks:[];
  }catch(_){return [];}
}
function lyricHlSave(songId,marks){
  try{
    var key=LYRIC_HL_PREFIX+String(songId||'');
    if(marks&&marks.length)localStorage.setItem(key,JSON.stringify({v:1,marks:marks}));
    else localStorage.removeItem(key);
  }catch(_){}
}
function lyricHlEnsureCss(){
  if(typeof document==='undefined'||!document.head)return;
  if(document.getElementById('cecp-lyric-hl-style'))return;
  var st=document.createElement('style');
  st.id='cecp-lyric-hl-style';
  var base='.p-lyric[data-hl]{border-radius:3px;box-decoration-break:clone;}',i;
  var light='',dark='';
  for(i=0;i<LYRIC_HL_COLORS.length;i++){
    light+='.p-lyric[data-hl="'+i+'"]{background-color:'+LYRIC_HL_COLORS[i].solid+';}';
    dark+='.p-lyric[data-hl="'+i+'"]{background-color:'+LYRIC_HL_COLORS[i].dark+';}';
  }
  var darkAttr=dark.split('.p-lyric[').join('html[data-resolved-theme="dark"] .p-lyric[');
  var darkAuto=dark.split('.p-lyric[').join('html:not([data-resolved-theme="light"]) .p-lyric[');
  st.textContent=
    base+light+darkAttr+
    '@media (prefers-color-scheme: dark){'+darkAuto+'}'+
    '.lyric-hl-marking{touch-action:none;-webkit-user-select:none;user-select:none;}'+
    '.lyric-hl-marking .p-lyric{cursor:crosshair;}';
  document.head.appendChild(st);
}
/* 元素 -> 内容坐标 {row,seg,line}；不属于歌词区时返回 null */
function lyricHlCoordOf(root,el){
  if(!el||!el.closest)return null;
  var lyric=el.closest('.p-lyric');
  if(!lyric||!root.contains(lyric))return null;
  var row=lyric.closest('.sw-lrow');
  var seg=lyric.closest('.prev-seg');
  if(!row||!seg)return null;
  var r=Array.prototype.indexOf.call(root.querySelectorAll('.sw-lrow'),row);
  var sIdx=Array.prototype.indexOf.call(row.querySelectorAll('.prev-seg'),seg);
  var lIdx=Array.prototype.indexOf.call(seg.querySelectorAll('.p-lyric'),lyric);
  if(r<0||sIdx<0||lIdx<0)return null;
  return {row:r,seg:sIdx,line:lIdx,el:lyric};
}
/* 内容坐标 -> 当前 DOM 节点；越界返回 null（内容被编辑过的兜底） */
function lyricHlNodeAt(root,row,seg,line){
  var rows=root.querySelectorAll('.sw-lrow');
  if(row<0||row>=rows.length)return null;
  var segs=rows[row].querySelectorAll('.prev-seg');
  if(seg<0||seg>=segs.length)return null;
  var lyrics=segs[seg].querySelectorAll('.p-lyric');
  if(line<0||line>=lyrics.length)return null;
  return lyrics[line];
}
/* 渲染完成后重放：清掉旧标记属性，再按存储坐标重新打上 */
function lyricHlApply(root,songId){
  if(!root||!root.querySelectorAll)return;
  lyricHlEnsureCss();
  Array.prototype.forEach.call(root.querySelectorAll('.p-lyric[data-hl]'),function(el){
    el.removeAttribute('data-hl');
  });
  var marks=lyricHlLoad(songId);
  for(var i=0;i<marks.length;i++){
    var m=marks[i];
    if(!m||m.length<4)continue;
    var c=m[3];
    if(!(c>=0&&c<LYRIC_HL_COLORS.length))continue;
    var el=lyricHlNodeAt(root,m[0],m[1],m[2]);
    if(el)el.setAttribute('data-hl',String(c));
  }
}
/* 更新一处标记：colorIdx 为 null 时表示擦除 */
function lyricHlSet(root,songId,coord,colorIdx){
  var marks=lyricHlLoad(songId),out=[],found=false,i;
  for(i=0;i<marks.length;i++){
    var m=marks[i];
    if(m&&m[0]===coord.row&&m[1]===coord.seg&&m[2]===coord.line){
      found=true;
      if(colorIdx!=null)out.push([coord.row,coord.seg,coord.line,colorIdx]);
    }else out.push(m);
  }
  if(!found&&colorIdx!=null)out.push([coord.row,coord.seg,coord.line,colorIdx]);
  lyricHlSave(songId,out);
  if(coord.el){
    if(colorIdx!=null)coord.el.setAttribute('data-hl',String(colorIdx));
    else coord.el.removeAttribute('data-hl');
  }
}
/* 导出前调用：把标记颜色内联成白底实色（live 深色模式的半透明变体
   在纯白导出底上会太淡），并保证优先级高于导出置黑逻辑 */
function lyricHlPrepareExport(scope){
  if(!scope||!scope.querySelectorAll)return;
  Array.prototype.forEach.call(scope.querySelectorAll('.p-lyric[data-hl]'),function(el){
    var idx=parseInt(el.getAttribute('data-hl'),10);
    if(idx>=0&&idx<LYRIC_HL_COLORS.length){
      el.style.setProperty('background-color',LYRIC_HL_COLORS[idx].solid,'important');
      el.style.setProperty('border-radius','3px');
    }
  });
}
/* 荧光笔控制条：笔开关 + 5 色 + 清空。宿主把返回的元素插进工具行，
   并在每次 renderScore 末尾调用 lyricHlApply。root = 歌词区根节点
   （innerHTML 会被重建但节点本身持久），getSongId 惰性取歌曲 id。 */
function lyricHlCreateController(root,getSongId){
  lyricHlEnsureCss();
  var active=false;
  var colorIdx=0;
  try{
    var savedPen=parseInt(localStorage.getItem(LYRIC_HL_PEN_KEY),10);
    if(savedPen>=0&&savedPen<LYRIC_HL_COLORS.length)colorIdx=savedPen;
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
      dots[i].style.boxShadow=(i===colorIdx)?'0 0 0 2px rgba(128,128,128,0.9)':'none';
      dots[i].style.transform=(i===colorIdx)?'scale(1.15)':'none';
    }
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
  /* 笔迹手势：开启时 pointer capture，滑过的歌词逐段上色；
     起笔落在「已是当前色」的分段 => 本次笔画为擦除模式（toggle） */
  var stroke=null;
  function strokeApply(target){
    var coord=lyricHlCoordOf(root,target);
    if(!coord)return;
    var k=coord.row+'_'+coord.seg+'_'+coord.line;
    if(stroke.seen[k])return;
    stroke.seen[k]=true;
    lyricHlSet(root,getSongId(),coord,stroke.erase?null:colorIdx);
  }
  root.addEventListener('pointerdown',function(e){
    if(!active)return;
    var coord=lyricHlCoordOf(root,e.target);
    if(!coord)return;
    e.preventDefault();
    try{root.setPointerCapture(e.pointerId);}catch(_){}
    stroke={erase:coord.el.getAttribute('data-hl')===String(colorIdx),seen:{}};
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
/* ═══════════ CECP-LYRIC-HL v1 END ═══════════ */
