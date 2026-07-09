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
  var base='display:inline-block;position:absolute;left:'+dx+'px;top:16px;white-space:nowrap;line-height:1.4;font-size:0.58em;padding:0 7px;border-radius:999px;box-sizing:border-box;letter-spacing:0.4px;z-index:2;';
  if(jump){
    tag.style.cssText=base+'font-style:italic;font-weight:600;color:'+color+';border:1px solid '+color+';background:transparent;opacity:0.92;';
  }else{
    tag.style.cssText=base+'font-weight:700;color:#ffffff;border:1px solid '+color+';background:'+color+';';
  }
  tag.textContent=String(seg.label||'');
  holder.appendChild(tag);
  if(typeof requestAnimationFrame==='function'){
    requestAnimationFrame(function(){
      if(!holder.isConnected)return;
      var scope=holder.closest?holder.closest('.prev-row'):null;
      if(!scope)return;
      var pillH=tag.offsetHeight||13;
      var band=pillH+SEC_LABEL_TOP_GAP_PX*2;
      var chords=scope.querySelectorAll('.p-chord');
      for(var i=0;i<chords.length;i++){
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
        tag.style.top=((cr.bottom-hr.top)/scale+SEC_LABEL_TOP_GAP_PX)+'px';
      }
    });
  }
  return holder;
}
/* ═══════════ CECP-SONG-EXT v1 END ═══════════ */
