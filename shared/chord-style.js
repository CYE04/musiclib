/* ═══════════ CECP-CHORD-STYLE v1 BEGIN ═══════════
   共享模块：和弦文字视觉样式（按根音固定配色的填充 + 描边小片）。
   本块在以下三个文件中逐字节相同（权威版本 = shared/chord-style.js）：
     musiclib/musiclib.js / youth-engine.js / musictool/musictool.js
   修改流程：先改 shared/chord-style.js，再同步三处，diff 校验一致。
   注意：本块内禁止出现反斜杠字符
   （musictool.js 经 CMS 部署会丢失一层反斜杠），
   转义字符一律用 String.fromCharCode 构造。
   硬性约束：只做视觉，不改布局——和弦按等宽字体与歌词逐字对齐，
   因此不用 padding/border/margin，描边用 outline（不占布局空间），
   字号、行高、margin、min-height 全部继承宿主 .p-chord 原样。
   配色规则：同根音共用一色（G/G7/Gsus4/Gm 同色），12 音名 12 色，
   色相按半音序直接展开（pc*30°）：常见进行（I-IV-V、关系小调）
   的根音相距纯四/五度或小三度，映射后色差足够大，
   同一首歌里的常用和弦颜色能明显区分；
   填充色醒目但文字对比度优先：浅色主题浅底深字、深色主题深底浅字
   （同色相配对，保证和弦文字一眼可辨）；
   深浅主题分别取色：优先 html[data-resolved-theme]，
   无该属性的宿主回退 prefers-color-scheme。 */
var CHORD_STYLE_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
var CHORD_STYLE_SHARP=String.fromCharCode(0x266F);
var CHORD_STYLE_FLAT=String.fromCharCode(0x266D);
var CHORD_STYLE_GAPS=' '+String.fromCharCode(9)+String.fromCharCode(160)+String.fromCharCode(0x3164)+String.fromCharCode(0x3000);
function chordStyleIsGapChar(ch){
  return CHORD_STYLE_GAPS.indexOf(ch)>=0;
}
/* 根音 -> 半音音级（0..11）；找不到可识别根音时返回 -1（不上色）。
   规则：根音必须在 token 开头（允许若干前置左括号，兼容 "(C/G)"），
   根音（含变音记号）之后若紧跟小写字母，必须是合法和弦后缀首字母
   （m/s/a/d，如 m7、sus4、add9、dim），否则视为普通单词不上色——
   这样可排除写在 chord 字段里的 "Fine"、"Chorus"、"Coda"、
   "To Chorus" 这类段落标记文本。 */
function chordStylePitchClass(token){
  var s=String(token||'');
  var i=0;
  while(i<s.length&&s.charAt(i)==='(')i++;
  var ch=s.charAt(i);
  if(!Object.prototype.hasOwnProperty.call(CHORD_STYLE_PC,ch))return -1;
  var pc=CHORD_STYLE_PC[ch];
  var j=i+1;
  var nx=s.charAt(j);
  if(nx==='#'||nx===CHORD_STYLE_SHARP){pc=(pc+1)%12;j++;}
  else if(nx==='b'||nx===CHORD_STYLE_FLAT){pc=(pc+11)%12;j++;}
  var after=s.charAt(j);
  if(after>='a'&&after<='z'&&'msad'.indexOf(after)<0)return -1;
  return pc;
}
/* 音级 -> 色相：半音序直接展开再整体旋转，C=210°（蓝），确定性映射。 */
function chordStyleHue(pc){
  return (pc*30+210)%360;
}
function chordStyleEnsureCss(){
  if(typeof document==='undefined'||!document.head)return;
  if(document.getElementById('cecp-chord-style'))return;
  var st=document.createElement('style');
  st.id='cecp-chord-style';
  var light='',dark='',i,h;
  for(i=0;i<12;i++){
    h=chordStyleHue(i);
    light+='.chord-chip.chord-pc'+i+'{background:hsl('+h+',65%,86%);outline-color:hsl('+h+',48%,60%);color:hsl('+h+',90%,20%);}';
    dark+='.chord-chip.chord-pc'+i+'{background:hsl('+h+',42%,26%);outline-color:hsl('+h+',45%,48%);color:hsl('+h+',72%,84%);}';
  }
  var darkAttr=dark.split('.chord-chip.').join('html[data-resolved-theme="dark"] .chord-chip.');
  var darkAuto=dark.split('.chord-chip.').join('html:not([data-resolved-theme="light"]) .chord-chip.');
  st.textContent=
    '.chord-chip{border-radius:4px;outline:1px solid transparent;outline-offset:0;}'+
    light+darkAttr+
    '@media (prefers-color-scheme: dark){'+darkAuto+'}';
  document.head.appendChild(st);
}
/* 把一个文本节点按 gap 字符切成若干节点，返回 [{gap,node}...]；
   只有内容/gap 混排时才真正拆分 DOM。 */
function chordStyleSplitText(node){
  var s=node.nodeValue||'',pieces=[],cur='',curGap=null,out=[],i;
  for(i=0;i<s.length;i++){
    var g=chordStyleIsGapChar(s.charAt(i));
    if(curGap===null)curGap=g;
    if(g!==curGap){pieces.push({gap:curGap,text:cur});cur='';curGap=g;}
    cur+=s.charAt(i);
  }
  if(cur)pieces.push({gap:curGap,text:cur});
  if(pieces.length<=1){
    out.push({gap:pieces.length?pieces[0].gap:true,node:node});
    return out;
  }
  var parent=node.parentNode;
  for(i=0;i<pieces.length;i++){
    var tn=document.createTextNode(pieces[i].text);
    parent.insertBefore(tn,node);
    out.push({gap:pieces[i].gap,node:tn});
  }
  parent.removeChild(node);
  return out;
}
function chordChipWalk(parent){
  var nodes=[],n,i;
  for(n=parent.firstChild;n;n=n.nextSibling)nodes.push(n);
  var run=[];
  function flush(){
    if(!run.length)return;
    var text='',k;
    for(k=0;k<run.length;k++)text+=run[k].nodeValue;
    var pc=chordStylePitchClass(text);
    if(pc>=0){
      var chip=document.createElement('span');
      chip.className='chord-chip chord-pc'+pc;
      parent.insertBefore(chip,run[0]);
      for(k=0;k<run.length;k++)chip.appendChild(run[k]);
    }
    run=[];
  }
  for(i=0;i<nodes.length;i++){
    n=nodes[i];
    if(n.nodeType===3){
      var pieces=chordStyleSplitText(n);
      for(var j=0;j<pieces.length;j++){
        if(pieces[j].gap)flush();
        else run.push(pieces[j].node);
      }
    }else if(n.nodeType===1){
      flush();
      var c=' '+String(n.className||'')+' ';
      if(c.indexOf('gap')<0)chordChipWalk(n);
    }else{
      flush();
    }
  }
  flush();
}
/* 对一个 .p-chord 元素做视觉装饰：内容设置完成后调用。
   同一元素内多个和弦（以空白/占位分隔）各自成片、各自取色。 */
function chordChipDecorate(root){
  if(!root||root.nodeType!==1)return;
  var cls=' '+String(root.className||'')+' ';
  if(cls.indexOf(' empty ')>=0)return;
  if(root.querySelector&&root.querySelector('.chord-chip'))return;
  chordStyleEnsureCss();
  chordChipWalk(root);
}
/* ═══════════ CECP-CHORD-STYLE v1 END ═══════════ */
