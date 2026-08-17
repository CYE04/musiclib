/* ═══════════ CECP-SCORE-INK v1 BEGIN ═══════════
   共享模块：移调谱自由笔记（GoodNotes 式 canvas 墨迹层）。
   权威版本 = shared/score-ink.js；宿主：musiclib.js / youth-engine.js（两处逐字节同步）。
   核心算法移植自 cecp-intercom/cecp.js 的 ink 层（bindInkPointer/drawStroke/
   penWidthFactor/eraseAt/pushInkOp），砍掉 WebSocket 同步/激光笔/文字框/形状工具；
   新增：按住不动自动拉直（GoodNotes 的「画线不松手变直线」）与按钮悬停/长按提示。

   设计约束：
   - 引擎(渲染谱面的代码)零改动：canvas 是谱容器里的一个 absolute 覆盖层，
     不参与 fitRows 测量，不影响任何几何。宿主只需在重渲染谱面后调 attach()。
   - 墨迹按「歌 + 调」分桶存 localStorage（cecp-score-ink:<songId>@<key>）：
     移调后排版完全不同，各画各的，跟 intercom 的 currentSongKey 同思路。
   - 坐标归一化到谱容器宽高，重放按当前尺寸缩放；排版随宽度变化时可能有偏移，
     这是练习标记的已知限制（intercom 同样如此）。
   - v1 已知限制：墨迹不进 PNG 导出、不进全屏放大器（两者走克隆，canvas 位图不随克隆走）。
   - 工具条按钮由宿主自己画（musiclib 用 .sw-ico-btn，youth 用自己的风格），
     本块只提供引擎 API + 提示气泡助手，不写死任何宿主类名。 */
function scoreInkCreate(opts){
  var host=opts.host;                       /* 谱容器（canvas 挂进去 absolute 盖住它） */
  var getKey=opts.getKey;                   /* ()=>'songId@F' 当前存储键 */
  var onState=opts.onState||function(){};   /* 工具/撤销可用性变化时回调宿主刷按钮 */
  /* 笔的各项参数照搬 cecp-intercom 的 ink 层（GoodNotes 那套）：
       pen   笔型 fountain(钢笔,有粗细变化) / ball(圆珠笔,恒定) / brush(画笔,更粗更软)
       width 笔尖粗细       press 压力灵敏度(0=完全恒定)
       flat  笔尖扁平度(0=圆头, 1=凿头, 按行笔方向变宽窄)
       stab  画笔稳定性(把落点往上一点拉, 磨掉手抖)
     荧光笔独立一套 hlWidth/hlAlpha，跟笔互不影响。 */
  var S={tool:'none',color:'#C0392B',strokes:[],undoStack:[],redoStack:[],
         pen:'fountain',width:2.4,press:0.5,flat:0,stab:0.2,
         hlWidth:11,hlAlpha:0.34,
         /* 形状 / 文字（照 intercom：形状四选 + 可填充；文字是落在谱上的文本框） */
         shape:'line',shapeWidth:3,shapeFill:false,fontSize:18,
         /* 橡皮三态：fine 精细 / std 标准 / stroke 笔画（碰到整根删） */
         eraseType:'std',eraseSize:1,eraseHlOnly:false,eraseFilter:{pen:true,hl:true},
         /* 每个工具各自记住自己的颜色（GoodNotes/intercom 都是这样） */
         colors:{pen:'#C0392B',hl:'#E9C46A',shape:'#1D5FBF',text:'#262626'}};
  var PEN_W=2.4,HL_W=11,HL_ALPHA=0.34;
  var ERASE_SIZES=[0.011,0.018,0.034];      /* 橡皮半径三档（归一化到谱宽），中档=原值 */
  var PEN_TYPES=[{id:'fountain',name:'钢笔'},{id:'ball',name:'圆珠笔'},{id:'brush',name:'画笔'}];
  var NIB=-Math.PI/4;                       /* 凿头笔尖的朝向 */
  function eraseR(){return ERASE_SIZES[Math.max(0,Math.min(ERASE_SIZES.length-1,S.eraseSize|0))];}
  var HOLD_MS=550,HOLD_EPS_PX=3.5;          /* 按住不动 0.55s 拉直 / 3.5 CSS px 内算"没动" */
  var SNAP_MIN_PTS=3,SNAP_MIN_PX=18;        /* 点太少(点按)或线太短的不拉直 */
  var FLASH_MS=180;                         /* 变直那一下的粗细脉冲时长 */
  var canvas=null,ctx=null,box={w:1,h:1},drawing=null,raf=0,holdTimer=0;
  var lastPt=null,lastMoveAt=0,holdAnchor=null,flashAt=0,eraseDrag=false,hoverPt=null;
  var saveTimer=0,ro=null,destroyed=false;

  function storeKey(){return 'cecp-score-ink:'+getKey();}
  /* 笔的设置跨歌通用，单独存一把（墨迹本身是按「歌+调」分桶的，两者别混）。 */
  var OPTS_KEY='cecp-score-ink-opts';
  function persistOpts(){
    try{localStorage.setItem(OPTS_KEY,JSON.stringify(api.getOpts()));}catch(_){}
  }
  function loadOpts(){
    try{
      var o=JSON.parse(localStorage.getItem(OPTS_KEY)||'null');
      if(o&&typeof o==='object'){
        if(o.pen)S.pen=o.pen;
        if(o.width!=null)S.width=+o.width||PEN_W;
        if(o.press!=null)S.press=+o.press;
        if(o.flat!=null)S.flat=+o.flat;
        if(o.stab!=null)S.stab=+o.stab;
        if(o.hlWidth!=null)S.hlWidth=+o.hlWidth||HL_W;
        if(o.hlAlpha!=null)S.hlAlpha=+o.hlAlpha;
        if(o.eraseSize!=null)S.eraseSize=o.eraseSize|0;
        if(o.eraseType)S.eraseType=o.eraseType;
        if(o.eraseHlOnly!=null)S.eraseHlOnly=!!o.eraseHlOnly;
        if(o.shape)S.shape=o.shape;
        if(o.shapeWidth!=null)S.shapeWidth=+o.shapeWidth;
        if(o.shapeFill!=null)S.shapeFill=!!o.shapeFill;
        if(o.fontSize!=null)S.fontSize=+o.fontSize;
        if(o.colors){['pen','hl','shape','text'].forEach(function(t){if(o.colors[t])S.colors[t]=o.colors[t];});}
        if(o.eraseFilter){
          if(o.eraseFilter.pen!=null)S.eraseFilter.pen=!!o.eraseFilter.pen;
          if(o.eraseFilter.hl!=null)S.eraseFilter.hl=!!o.eraseFilter.hl;
        }
      }
    }catch(_){}
  }
  function ensureCanvas(){
    if(canvas&&canvas.isConnected)return;
    if(canvas){try{canvas.remove();}catch(_){}}
    canvas=document.createElement('canvas');
    canvas.className='cecp-ink-layer';
    canvas.style.cssText='position:absolute;inset:0;z-index:30;touch-action:none;';
    if(getComputedStyle(host).position==='static')host.style.position='relative';
    host.appendChild(canvas);
    ctx=canvas.getContext('2d');
    bindPointer();
    syncInteractive();
  }
  function resize(){
    if(!canvas)return;
    /* ⚠️ 必须用「布局尺寸」(clientWidth/Height，transform 之前)，不能用
       getBoundingClientRect()(transform 之后的视觉尺寸)。谱容器常带 transform:scale(…)
       (A4 纸适配、fitRows 缩放)，而 canvas 就活在那个被缩放的坐标系里 ——
       拿视觉尺寸去设 style.width 等于再缩一次：实测 host 视觉 623px 时 canvas 只有
       496px(=623×0.7957)，画布盖不满谱、归一化坐标整体偏 0.043，橡皮永远擦不中。
       用 clientWidth 而不是 offsetWidth：canvas 是 inset:0 的绝对定位子节点，
       包含块是宿主的 padding box —— clientWidth 正好是它，offsetWidth 还含 border。
       今天 .sw-lb 没 border 两者相等，加了就会错。 */
    var r=host.getBoundingClientRect();
    var w=Math.max(1,host.clientWidth||r.width),h=Math.max(1,host.clientHeight||r.height);
    box={w:w,h:h};
    var dpr=Math.min(2.5,window.devicePixelRatio||1);
    /* ⚠️ 面积上限：改用布局尺寸后 box.h 不再是「视口高」而是「整首歌高」(常见 1200~4000px)，
       dpr 2.5 下位图能到 2500×10000 = 25M 像素，超过 iOS Safari 的 canvas 面积上限
       (约 16.7M) 整块会直接变空白 —— 比它想修的 bug 更难查。按面积把 dpr 夹回来，
       CSS 尺寸不变、只是位图密度降一点，长歌上肉眼几乎看不出。 */
    var MAX_AREA=15200000;                     /* 留约 5% 余量，别顶着 16.7M 的天花板 */
    if(w*h*dpr*dpr>MAX_AREA)dpr=Math.sqrt(MAX_AREA/(w*h));
    canvas.width=Math.max(1,Math.floor(w*dpr));   /* floor 不 round：宁可少一行像素也别反超 */
    canvas.height=Math.max(1,Math.floor(h*dpr));
    /* style 尺寸必须显式设成布局尺寸：canvas 的 width 属性会兼作 CSS 尺寸，
       不设的话位图宽会把 inset:0 顶掉，画布反而撑成两倍。 */
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    /* 变换从「实际位图尺寸 ÷ 布局尺寸」反推，而不是用 dpr —— 上面夹紧和取整之后
       两者可能已经对不上，用 dpr 会让墨迹整体错位。这样写永远自洽。 */
    ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
    redraw();
  }
  /* 粗细跟着谱宽缩放：手机上和桌面看着一样粗（intercom 的 inkScale 同思路） */
  function scale(){return Math.max(0.5,Math.min(1.6,box.w/900));}

  /* 变直那一下的「啪」：只作用于刚被拉直的这一笔，粗细脉冲 FLASH_MS 后归位。
     不引任何动画库——脉冲期间靠 scheduleRedraw 自己续帧，t 到 1 自动停。
     只动 lineWidth，颜色与透明度一律不碰（荧光笔的 alpha 保持 HL_ALPHA）。 */
  function flashBoost(s){
    if(s!==drawing||!s.snapped||!flashAt)return 1;
    var t=(Date.now()-flashAt)/FLASH_MS;
    if(t>=1){flashAt=0;return 1;}
    if(t<0)t=0;
    var e=(1-t)*(1-t);                      /* 起手最粗、快速收回 */
    scheduleRedraw();
    return 1+((s.tool==='hl')?0.35:0.85)*e;  /* 荧光笔本来就粗，幅度小一半 */
  }

  function drawStroke(s){
    var pts=s.pts||[];if(!pts.length)return;
    var P=pts.map(function(p){return [p[0]*box.w,p[1]*box.h,p[2]==null?1:p[2]];});
    var k=scale();
    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle=s.color;
    var pen=s.pen||'fountain';
    var base=s.width*k*flashBoost(s);
    /* 三种笔型的观感差别（照搬 intercom）：画笔更粗更软、圆珠笔略实、钢笔默认 */
    if(s.tool==='hl'){ctx.globalAlpha=s.alpha||HL_ALPHA;}
    else if(pen==='brush'){ctx.globalAlpha=0.86;base=s.width*1.45*k*flashBoost(s);}
    else if(pen==='ball'){ctx.globalAlpha=0.97;}
    var varying=(s.tool==='pen'&&pen!=='ball');   /* 圆珠笔恒定粗细 */
    var flat=s.flat||0;
    /* 文字：落在谱上的一段文本（照 intercom，存的是归一化左上角 + 字号） */
    if(s.tool==='text'){
      ctx.globalAlpha=1;
      ctx.fillStyle=s.color;
      ctx.textBaseline='top';
      var fs=Math.max(9,(s.fontSize||18)*k);
      ctx.font='600 '+fs+'px -apple-system,BlinkMacSystemFont,"Noto Sans SC",sans-serif';
      String(s.text||'').split('\n').forEach(function(line,li){
        ctx.fillText(line,P[0][0],P[0][1]+li*fs*1.28);
      });
      ctx.restore();return;
    }
    /* 形状：直线 / 矩形 / 椭圆 / 箭头（起点 P[0] → 终点 P[末]） */
    if(s.shape&&P.length>=2){
      var A=P[0],B2=P[P.length-1];
      ctx.lineWidth=Math.max(0.5,base);
      ctx.beginPath();
      if(s.shape==='line'){ctx.moveTo(A[0],A[1]);ctx.lineTo(B2[0],B2[1]);}
      else if(s.shape==='rect'){ctx.rect(A[0],A[1],B2[0]-A[0],B2[1]-A[1]);}
      else if(s.shape==='ellipse'){
        ctx.ellipse((A[0]+B2[0])/2,(A[1]+B2[1])/2,
          Math.abs(B2[0]-A[0])/2,Math.abs(B2[1]-A[1])/2,0,0,Math.PI*2);
      }else if(s.shape==='arrow'){
        ctx.moveTo(A[0],A[1]);ctx.lineTo(B2[0],B2[1]);
        var ang=Math.atan2(B2[1]-A[1],B2[0]-A[0]),hh=Math.max(9,base*3);
        ctx.moveTo(B2[0],B2[1]);ctx.lineTo(B2[0]-hh*Math.cos(ang-0.42),B2[1]-hh*Math.sin(ang-0.42));
        ctx.moveTo(B2[0],B2[1]);ctx.lineTo(B2[0]-hh*Math.cos(ang+0.42),B2[1]-hh*Math.sin(ang+0.42));
      }
      /* 闭合图形可填充（GoodNotes 的「填充颜色」），淡一点免得盖住谱 */
      if(s.fill&&(s.shape==='rect'||s.shape==='ellipse')){
        ctx.save();ctx.globalAlpha=(ctx.globalAlpha||1)*0.22;
        ctx.fillStyle=s.color;ctx.fill();ctx.restore();
      }
      ctx.stroke();ctx.restore();return;
    }
    if(P.length<3){
      ctx.lineWidth=base;
      ctx.beginPath();ctx.moveTo(P[0][0],P[0][1]);
      for(var i=1;i<P.length;i++)ctx.lineTo(P[i][0],P[i][1]);
      if(P.length===1)ctx.lineTo(P[0][0]+0.1,P[0][1]+0.1);
      ctx.stroke();ctx.restore();return;
    }
    /* ⚠️ 粗细不变的笔画（荧光笔、圆珠笔）必须「整条一次画完」，不能逐段 stroke。
       逐段画时每段都是独立的 beginPath+stroke，半透明的荧光笔在每个接头处会被
       叠加两遍、再配上圆头线帽，看起来就是一串珠子（用户报的「一点一点的」）。
       这条快速路径是 intercom drawStroke 里就有的，之前漏搬了。 */
    if(!varying&&!flat){
      ctx.lineWidth=base;
      ctx.beginPath();
      ctx.moveTo(P[0][0],P[0][1]);
      for(var q=1;q<P.length-1;q++){
        ctx.quadraticCurveTo(P[q][0],P[q][1],(P[q][0]+P[q+1][0])/2,(P[q][1]+P[q+1][1])/2);
      }
      ctx.lineTo(P[P.length-1][0],P[P.length-1][1]);
      ctx.stroke();ctx.restore();return;
    }
    /* 逐段二次贝塞尔取中点：既平滑又支持粗细渐变（照抄 intercom drawStroke） */
    var prevM=[(P[0][0]+P[1][0])/2,(P[0][1]+P[1][1])/2];
    ctx.beginPath();ctx.moveTo(P[0][0],P[0][1]);ctx.lineTo(prevM[0],prevM[1]);
    ctx.lineWidth=Math.max(0.35,base*(varying?(P[0][2]||1):1));ctx.stroke();
    for(var j=1;j<P.length-1;j++){
      var m1=[(P[j][0]+P[j+1][0])/2,(P[j][1]+P[j+1][1])/2];
      var lw=base*(varying?(P[j][2]||1):1);
      /* 凿头笔尖：线宽随「行笔方向与笔尖朝向的夹角」变化，
         顺着笔尖方向走最细、垂直最粗 —— 书法笔的观感。 */
      if(flat){
        var th=Math.atan2(m1[1]-prevM[1],m1[0]-prevM[0]);
        lw*=1-flat*0.82*(1-Math.abs(Math.sin(th-NIB)));
      }
      ctx.lineWidth=Math.max(0.35,lw);
      ctx.beginPath();ctx.moveTo(prevM[0],prevM[1]);
      ctx.quadraticCurveTo(P[j][0],P[j][1],m1[0],m1[1]);ctx.stroke();
      prevM=m1;
    }
    ctx.beginPath();
    ctx.lineWidth=Math.max(0.35,base*(varying?(P[P.length-1][2]||1):1));
    ctx.moveTo(prevM[0],prevM[1]);ctx.lineTo(P[P.length-1][0],P[P.length-1][1]);
    ctx.stroke();ctx.restore();
  }
  function redraw(){
    if(!ctx)return;
    ctx.clearRect(0,0,box.w,box.h);
    for(var i=0;i<S.strokes.length;i++)drawStroke(S.strokes[i]);
    if(drawing)drawStroke(drawing);
    drawEraseRing();
  }
  /* 橡皮光标：画一个跟实际判定半径等大的圈。
     系统光标(cell/crosshair)完全看不出擦除范围有多大，三档大小也就没了意义；
     画在画布上还有个好处——触屏和触控笔也看得见，CSS cursor 在触屏上根本不显示。 */
  function drawEraseRing(){
    if(S.tool!=='erase'||!hoverPt||!ctx)return;
    var r=eraseR()*(S.eraseType==='fine'?0.45:1)*box.w;
    ctx.save();
    ctx.beginPath();
    ctx.arc(hoverPt[0]*box.w,hoverPt[1]*box.h,r,0,Math.PI*2);
    /* 双色描边：深浅底上都看得见，不用管主题 */
    ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.stroke();
    ctx.lineWidth=1.4;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.stroke();
    ctx.restore();
  }
  function scheduleRedraw(){
    if(raf)return;
    raf=requestAnimationFrame(function(){raf=0;if(!destroyed)redraw();});
  }

  /* 每个采样点的粗细系数：真压感优先，退回「快=细、慢=粗」（intercom penWidthFactor） */
  function widthFactor(ev,p,prev){
    if(S.tool!=='pen')return 1;
    if(S.pen==='ball')return 1;                     /* 圆珠笔恒定 */
    var f;
    var pr=(typeof ev.pressure==='number'&&ev.pressure>0&&ev.pressure!==0.5)?ev.pressure:-1;
    if(pr>=0){f=0.4+pr*1.25;}                       /* 真压感（Apple Pencil） */
    else{
      var dx=(p[0]-prev[0])*box.w,dy=(p[1]-prev[1])*box.h;
      var v=Math.sqrt(dx*dx+dy*dy);
      f=1.3-Math.min(1,v/22)*0.8;                   /* 没压感就用「划得越快越细」 */
    }
    if(S.pen==='brush')f=0.65+(f-0.65)*1.4;         /* 画笔的变化更夸张 */
    /* 压力灵敏度 = 这个变化生效多少；0 就完全恒定 */
    return Math.max(0.18,1+(f-1)*(S.press==null?0.5:S.press));
  }

  /* 点到线段距离的整笔命中（橡皮=碰到就整根删，GoodNotes 的「笔画橡皮擦」） */
  function strokeHit(st,p,r){
    var pts=st.pts||[],ar=box.w/(box.h||1);
    function segDist(a,b){
      var ax=a[0],ay=a[1]/(ar||1)*ar,bx=b[0],by=b[1];
      var px=p[0],py=p[1];
      var vx=bx-ax,vy=(by-ay);
      var t=((px-ax)*vx+(py-ay)*vy)/((vx*vx+vy*vy)||1e-9);
      t=Math.max(0,Math.min(1,t));
      var qx=ax+vx*t,qy=ay+vy*t;
      var dx=px-qx,dy=(py-qy)*(box.h/box.w);
      return Math.sqrt(dx*dx+dy*dy);
    }
    if(pts.length===1)return segDist(pts[0],pts[0])<r;
    for(var i=0;i<pts.length-1;i++)if(segDist(pts[i],pts[i+1])<r)return true;
    return false;
  }
  /* 橡皮三态（照 intercom）：
       fine   精细 —— 判定半径缩到 45%，擦得很准
       std    标准 —— 局部擦：把碰到的点挖掉，一条拆成若干段
       stroke 笔画 —— 碰到就整根删
     「只擦荧光笔」开着时其它笔迹一律跳过；文字和形状没法半截擦，碰到就整个删。 */
  function eraseAt(p){
    var et=S.eraseType||'std';
    var r=eraseR()*(et==='fine'?0.45:1);
    var hlOnly=!!S.eraseHlOnly;
    function erasable(st){
      if(hlOnly)return st.tool==='hl';
      var kind=(st.tool==='hl')?'hl':'pen';
      return !(S.eraseFilter&&S.eraseFilter[kind]===false);
    }
    function hit(st){return erasable(st)&&strokeHit(st,p,r);}
    if(et==='stroke'){
      var gone=[];
      S.strokes=S.strokes.filter(function(st){
        if(!hit(st))return true;
        gone.push(st);return false;
      });
      if(gone.length){pushOp({del:gone,add:[]});scheduleRedraw();persist();}
      return;
    }
    /* 局部擦：按点判定，挖掉碰到的点，剩下的连续段各自成为一条新笔画 */
    var ar=box.w/(box.h||1);
    function near(q){
      var dx=q[0]-p[0],dy=(q[1]-p[1])/(ar||1);
      return Math.sqrt(dx*dx+dy*dy)<r;
    }
    var changed=false,out=[],delOld=[],addNew=[];
    S.strokes.forEach(function(st){
      if(!hit(st)){out.push(st);return;}
      changed=true;delOld.push(st);
      if(st.tool==='text'||st.shape)return;      /* 文字/形状：碰到整个删 */
      var seg=[];
      (st.pts||[]).forEach(function(q){
        if(near(q)){
          if(seg.length>1){var f=splitStroke(st,seg);out.push(f);addNew.push(f);}
          seg=[];
        }else seg.push(q);
      });
      if(seg.length>1){var f2=splitStroke(st,seg);out.push(f2);addNew.push(f2);}
    });
    if(changed){
      S.strokes=out;pushOp({del:delOld,add:addNew});scheduleRedraw();persist();
    }
  }
  function splitStroke(src,pts){
    return {id:nid(),tool:src.tool,color:src.color,width:src.width,
      alpha:src.alpha,pen:src.pen,flat:src.flat,pts:pts.slice()};
  }

  /* 文字工具：在点的位置长出一个 textarea，写完（失焦或 Esc）落成一条 text 笔画。
     直接用真实 textarea 而不是自绘输入，中文输入法、光标、选中全都免费得到。 */
  function openTextBox(p){
    if(!canvas||!canvas.parentNode)return;
    var k=scale(),fs=Math.max(9,(S.fontSize||18)*k);
    var ta=document.createElement('textarea');
    ta.className='cecp-ink-text';
    ta.setAttribute('aria-label','在谱上写字');
    ta.style.cssText='position:absolute;z-index:31;margin:0;padding:2px 4px;border:1px dashed '
      +toolColor('text')+';border-radius:4px;background:transparent;resize:none;overflow:hidden;'
      +'outline:none;line-height:1.28;white-space:pre;min-width:2em;'
      +'left:'+(p[0]*box.w)+'px;top:'+(p[1]*box.h)+'px;'
      +'font:600 '+fs+'px -apple-system,BlinkMacSystemFont,"Noto Sans SC",sans-serif;'
      +'color:'+toolColor('text')+';';
    canvas.parentNode.appendChild(ta);
    var fit=function(){ta.style.height='0px';ta.style.height=ta.scrollHeight+'px';
      ta.style.width='0px';ta.style.width=(ta.scrollWidth+8)+'px';};
    ta.addEventListener('input',fit);
    var done=false;
    function commit(){
      if(done)return;done=true;
      var txt=ta.value.replace(/\s+$/,'');
      try{ta.remove();}catch(_){}
      if(!txt)return;
      var st={id:nid(),tool:'text',color:toolColor('text'),text:txt,
        fontSize:S.fontSize,width:1,pts:[[p[0],p[1],1]]};
      S.strokes.push(st);pushOp({del:[],add:[st]});
      scheduleRedraw();persist();onState(api);
    }
    ta.addEventListener('blur',commit);
    ta.addEventListener('keydown',function(e){
      if(e.key==='Escape'){e.preventDefault();ta.value='';commit();}
    });
    setTimeout(function(){try{ta.focus();fit();}catch(_){}} ,0);
  }

  function pushOp(op){
    if(!op||(!(op.del||[]).length&&!(op.add||[]).length))return;
    S.undoStack.push(op);
    if(S.undoStack.length>60)S.undoStack.shift();
    S.redoStack.length=0;
    onState(api);
  }
  function applyOp(op,reverse){
    var remove=reverse?(op.add||[]):(op.del||[]);
    var restore=reverse?(op.del||[]):(op.add||[]);
    var kill={};remove.forEach(function(x){kill[x.id]=1;});
    S.strokes=S.strokes.filter(function(x){return !kill[x.id];});
    restore.forEach(function(x){S.strokes.push(x);});
    scheduleRedraw();persist();onState(api);
  }

  function persist(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      try{
        if(S.strokes.length)localStorage.setItem(storeKey(),JSON.stringify({v:1,strokes:S.strokes}));
        else localStorage.removeItem(storeKey());
      }catch(_){}
    },250);
  }
  function load(){
    S.strokes=[];S.undoStack=[];S.redoStack=[];
    try{
      var raw=localStorage.getItem(storeKey());
      if(raw){var d=JSON.parse(raw);if(d&&d.strokes)S.strokes=d.strokes;}
    }catch(_){}
    onState(api);
  }

  function nid(){return 'ink'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
  function norm(ev){
    var r=host.getBoundingClientRect();
    return [(ev.clientX-r.left)/(r.width||1),(ev.clientY-r.top)/(r.height||1)];
  }
  /* 按住不动自动拉直（GoodNotes）：笔尖不抬、原地停住 HOLD_MS，整笔瞬间换成
     起点→当前点的直线；之后继续拖只动终点，抬笔落定。
     用「一个可重置的 setTimeout」而不是轮询：触发时刻精确落在最后一次有效移动
     + HOLD_MS（轮询是 HOLD_MS+[0,110) 的随机值，手感发飘，GoodNotes 的"准"就来自这个确定性）。
     ⚠️ setTimeout 和 setInterval 被后台标签降频的规则完全一样，换定时器种类躲不掉，
     所以 pointermove 里再兜一次时间比对：定时器晚到时只要还有事件进来就立刻补判。
     真机按笔时页面必在前台，降频不成立；降频只影响自动化测试。 */
  /* 触控笔的「临时橡皮」判定：笔尾(32) 或 笔杆侧键(2)。
     只认 pointerType==='pen'，免得鼠标右键/中键被误判成橡皮。 */
  function penErase(ev){
    if(!ev||ev.pointerType!=='pen')return false;
    var b=ev.buttons||0;
    return !!(b&32)||!!(b&2);
  }
  /* 每个工具各自记住颜色；老数据里只有单个 color 时回退到它 */
  function toolColor(t){
    var c=S.colors&&S.colors[t];
    return c||S.color;
  }
  function holdDue(){
    return !!drawing&&!drawing.snapped&&(Date.now()-lastMoveAt)>=HOLD_MS;
  }
  function snapStraight(){
    if(!drawing||drawing.snapped)return false;
    var pts=drawing.pts;
    if(pts.length<SNAP_MIN_PTS)return false;        /* 就是个点按，不算一笔 */
    var a=pts[0],b=pts[pts.length-1];
    var dx=(b[0]-a[0])*box.w,dy=(b[1]-a[1])*box.h;
    if(Math.sqrt(dx*dx+dy*dy)<SNAP_MIN_PX)return false;   /* 太短，别拉 */
    drawing.snapped=true;
    drawing.pts=[[a[0],a[1],1],[b[0],b[1],1]];
    flashAt=Date.now();                             /* 触发"啪"一下的粗细脉冲 */
    scheduleRedraw();
    return true;
  }
  function armHold(){
    clearTimeout(holdTimer);holdTimer=0;
    if(!drawing||drawing.snapped)return;
    var wait=HOLD_MS-(Date.now()-lastMoveAt);
    holdTimer=setTimeout(function(){
      holdTimer=0;
      if(!drawing||drawing.snapped)return;
      if(holdDue())snapStraight();else armHold();    /* 期间又动过：按剩余时间再等 */
    },wait>0?wait:0);
  }
  /* 收一个采样点（普通 pointermove 与 getCoalescedEvents 走同一条路，避免两份逻辑跑偏）。 */
  function addSample(ev){
    if(!drawing||drawing.snapped)return;
    var p=norm(ev);
    var lastP=drawing.pts[drawing.pts.length-1];
    /* 画笔稳定性：把落点往上一个点拉回一些，手抖就被磨掉（GoodNotes 的「画笔稳定性」）。
       必须放在「丢掉过密点」之前 —— 先平滑再抽稀，否则磨出来的点又被当成密点丢了。 */
    var st=S.stab||0;
    if(st>0&&S.tool!=='erase'){
      var k2=1-st*0.8;
      p=[lastP[0]+(p[0]-lastP[0])*k2,lastP[1]+(p[1]-lastP[1])*k2];
    }
    var dx=p[0]-lastP[0],dy=p[1]-lastP[1];
    if(dx*dx+dy*dy<0.0000045)return;              /* 太密的点丢掉（intercom 同款阈值） */
    /* 「有没有动」必须按 CSS px 算：归一化的 y 除的是谱高，长谱里 0.006 能到 20+px、
       手机的 x 却只有 2.2px（box.w≈360），各向异性导致手指按住不动的抖动一直在刷新
       计时器，拉直因此几乎永远触发不了。
       而且要跟「停住那一刻的锚点」比、不跟上一个采样点比——否则慢慢匀速画的线
       每一步都够小，会被误判成没动而强行拉直。 */
    var ax=(p[0]-holdAnchor[0])*box.w,ay=(p[1]-holdAnchor[1])*box.h;
    if(Math.sqrt(ax*ax+ay*ay)>HOLD_EPS_PX){
      lastMoveAt=Date.now();holdAnchor=p;armHold();
    }
    drawing.pts.push([p[0],p[1],widthFactor(ev,p,lastP)]);
    lastPt=p;
  }

  function bindPointer(){
    canvas.addEventListener('pointerdown',function(ev){
      if(S.tool==='none'&&!penErase(ev))return;
      ev.preventDefault();
      try{canvas.setPointerCapture(ev.pointerId);}catch(_){}
      var p=norm(ev);
      /* 触控笔的侧键 / 笔尾橡皮：按住期间临时当橡皮用，松开自动回到原工具。
         这是标准 PointerEvent，S Pen / 小米笔 / Surface Pen / Wacom 都报：
           buttons & 32 = 笔尾（把笔翻过来擦）
           buttons & 2  = 笔杆侧键
         ⚠️ Apple Pencil 的双击/捏握做不到 —— 那是 iPadOS 的 UIPencilInteraction，
         只给原生 app，Safari 完全不暴露给网页，没有任何绕法。 */
      if(penErase(ev)){eraseAt(p);eraseDrag=true;return;}
      if(S.tool==='erase'){eraseAt(p);return;}
      if(S.tool==='text'){openTextBox(p);return;}
      /* 笔型/扁平度随笔画一起存：改了设置不会把已经画好的笔画一起变样，
         跟 GoodNotes 一致（每一笔记住自己是用什么笔画的）。 */
      drawing={id:nid(),tool:S.tool,color:toolColor(S.tool),
        width:S.tool==='hl'?S.hlWidth:(S.tool==='shape'?S.shapeWidth:S.width),
        alpha:S.tool==='hl'?S.hlAlpha:1,
        pen:(S.tool==='hl'||S.tool==='shape')?undefined:S.pen,
        flat:(S.tool==='hl'||S.tool==='shape')?0:S.flat,
        shape:S.tool==='shape'?S.shape:undefined,
        fill:S.tool==='shape'?!!S.shapeFill:undefined,
        pts:[[p[0],p[1],1]]};
      lastPt=p;lastMoveAt=Date.now();holdAnchor=p;flashAt=0;
      if(S.tool!=='shape')armHold();      /* 形状本来就是直的，不需要按住拉直 */
    });
    canvas.addEventListener('pointermove',function(ev){
      /* 橡皮的圈要跟着指针走：不按下也记录位置 */
      if(S.tool==='erase'){hoverPt=norm(ev);scheduleRedraw();}
      /* 侧键/笔尾按住期间：一路擦，不管当前选的是什么工具 */
      if(eraseDrag||penErase(ev)){
        if(ev.buttons){eraseDrag=true;ev.preventDefault();eraseAt(norm(ev));return;}
        eraseDrag=false;
      }
      if(S.tool==='none')return;
      var p=norm(ev);
      if(S.tool==='erase'){if(ev.buttons)eraseAt(p);return;}
      if(!drawing)return;
      ev.preventDefault();
      /* 形状：起点固定，终点跟着手指走，一直是两点 */
      if(drawing.shape){
        drawing.pts[1]=[p[0],p[1],1];
        scheduleRedraw();return;
      }
      if(holdDue())snapStraight();                  /* 定时器被降频/晚到的兜底：有事件就补判 */
      /* 高频采样：Apple Pencil 采到 240Hz，而 pointermove 只派发 60~120Hz，
         中间的点被浏览器合并掉了。getCoalescedEvents() 把它们全取回来逐个入笔，
         快速划线时的折线感明显减少。intercom 没做这一步，这里比它更顺。
         浏览器不支持时自动退回单点，行为不变。 */
      if(!drawing.snapped&&!drawing.shape&&ev.getCoalescedEvents){
        var co=null;
        try{co=ev.getCoalescedEvents();}catch(_){co=null;}
        if(co&&co.length>1){
          for(var ci=0;ci<co.length;ci++)addSample(co[ci]);
          return;
        }
      }
      if(drawing.snapped){                          /* 已拉直：只动终点 */
        drawing.pts[1]=[p[0],p[1],1];
        lastMoveAt=Date.now();
        scheduleRedraw();return;
      }
      addSample(ev);
      scheduleRedraw();
    });
    var finish=function(){
      clearTimeout(holdTimer);holdTimer=0;
      flashAt=0;holdAnchor=null;
      var d=drawing;drawing=null;
      if(!d)return;
      if(d.pts.length<2)d.pts.push([d.pts[0][0]+0.001,d.pts[0][1]+0.001,1]);
      delete d.snapped;
      S.strokes.push(d);
      pushOp({del:[],add:[d]});
      scheduleRedraw();persist();
    };
    canvas.addEventListener('pointerup',finish);
    canvas.addEventListener('pointercancel',finish);
  }
  function syncInteractive(){
    if(!canvas)return;
    /* 没选工具时画布完全不吃事件：谱照常滚、和弦照常点 */
    canvas.style.pointerEvents=(S.tool==='none')?'none':'auto';
    canvas.style.cursor=S.tool==='erase'?'none':(S.tool==='none'?'':'crosshair');
    if(S.tool!=='erase'){hoverPt=null;scheduleRedraw();}
  }

  var api={
    attach:function(){                      /* 谱面重渲染(移调/初次)后调用：幂等 */
      if(destroyed)return;
      ensureCanvas();
      if(!ro&&typeof ResizeObserver!=='undefined'){
        ro=new ResizeObserver(function(){resize();});
        ro.observe(host);
      }
      resize();load();scheduleRedraw();
    },
    setTool:function(t){S.tool=(S.tool===t)?'none':t;syncInteractive();onState(api);},
    getTool:function(){return S.tool;},
    setColor:function(c){
      /* 颜色写进「当前工具」的槽位：每个工具各自记住自己的颜色（intercom/GoodNotes 同款）。
         S.color 仍同步更新，作为老数据/未知工具的回退。 */
      S.color=c;
      var t=(S.tool==='none')?'pen':S.tool;
      if(S.colors[t]!==undefined)S.colors[t]=c;
      if(S.tool==='none')S.tool='pen';
      persistOpts();syncInteractive();onState(api);
    },
    getToolColor:function(t){return toolColor(t||S.tool);},
    /* 笔/荧光笔/橡皮的各项设置。只改设置不动已有笔画（每一笔记住自己是用什么笔画的）。 */
    penTypes:function(){return PEN_TYPES.slice();},
    eraseSizes:function(){return ERASE_SIZES.length;},
    getOpts:function(){
      return {pen:S.pen,width:S.width,press:S.press,flat:S.flat,stab:S.stab,
              hlWidth:S.hlWidth,hlAlpha:S.hlAlpha,
              shape:S.shape,shapeWidth:S.shapeWidth,shapeFill:!!S.shapeFill,fontSize:S.fontSize,
              eraseType:S.eraseType,eraseSize:S.eraseSize,eraseHlOnly:!!S.eraseHlOnly,
              eraseFilter:{pen:S.eraseFilter.pen!==false,hl:S.eraseFilter.hl!==false},
              colors:{pen:S.colors.pen,hl:S.colors.hl,shape:S.colors.shape,text:S.colors.text}};
    },
    setOpts:function(o){
      if(!o)return;
      if(o.pen)S.pen=o.pen;
      if(o.width!=null)S.width=Math.max(0.6,Math.min(14,+o.width||PEN_W));
      if(o.press!=null)S.press=Math.max(0,Math.min(1,+o.press));
      if(o.flat!=null)S.flat=Math.max(0,Math.min(1,+o.flat));
      if(o.stab!=null)S.stab=Math.max(0,Math.min(1,+o.stab));
      if(o.hlWidth!=null)S.hlWidth=Math.max(4,Math.min(30,+o.hlWidth||HL_W));
      if(o.hlAlpha!=null)S.hlAlpha=Math.max(0.1,Math.min(0.9,+o.hlAlpha));
      if(o.shape)S.shape=o.shape;
      if(o.shapeWidth!=null)S.shapeWidth=Math.max(0.6,Math.min(14,+o.shapeWidth||3));
      if(o.shapeFill!=null)S.shapeFill=!!o.shapeFill;
      if(o.fontSize!=null)S.fontSize=Math.max(10,Math.min(64,+o.fontSize||18));
      if(o.eraseType)S.eraseType=o.eraseType;
      if(o.eraseHlOnly!=null)S.eraseHlOnly=!!o.eraseHlOnly;
      if(o.eraseSize!=null)S.eraseSize=Math.max(0,Math.min(ERASE_SIZES.length-1,o.eraseSize|0));
      if(o.eraseFilter){
        if(o.eraseFilter.pen!=null)S.eraseFilter.pen=!!o.eraseFilter.pen;
        if(o.eraseFilter.hl!=null)S.eraseFilter.hl=!!o.eraseFilter.hl;
      }
      if(o.colors){
        ['pen','hl','shape','text'].forEach(function(t){
          if(o.colors[t])S.colors[t]=o.colors[t];
        });
      }
      persistOpts();onState(api);
    },
    /* 给设置面板画实时预览用：按当前参数在任意 canvas 上画一条示例笔画 */
    previewTo:function(cv,tool){
      if(!cv)return;
      var c2=cv.getContext('2d'),W=cv.width,H=cv.height;
      c2.clearRect(0,0,W,H);
      var pts=[],i,n=34;
      for(i=0;i<=n;i++){
        var t=i/n;
        pts.push([0.08+t*0.84,0.5+Math.sin(t*Math.PI*1.9)*0.30,
          /* 用速度模型造一条有粗细起伏的示例，跟真笔一个公式 */
          Math.max(0.18,1+((1.3-Math.min(1,(Math.abs(Math.cos(t*Math.PI*1.9))*14)/22)*0.8)-1)*(S.press==null?0.5:S.press))]);
      }
      var isHl=(tool==='hl');
      var s={tool:isHl?'hl':'pen',color:S.color,
             width:isHl?S.hlWidth:S.width,alpha:isHl?S.hlAlpha:1,
             pen:isHl?undefined:S.pen,flat:isHl?0:S.flat,pts:pts};
      var savedBox=box,savedCtx=ctx;
      box={w:W,h:H};ctx=c2;
      try{drawStroke(s);}finally{box=savedBox;ctx=savedCtx;}
    },
    getColor:function(){return S.color;},
    undo:function(){var op=S.undoStack.pop();if(op){S.redoStack.push(op);applyOp(op,true);}},
    redo:function(){var op=S.redoStack.pop();if(op){S.undoStack.push(op);applyOp(op,false);}},
    canUndo:function(){return S.undoStack.length>0;},
    canRedo:function(){return S.redoStack.length>0;},
    clearAll:function(){
      if(!S.strokes.length)return;
      var gone=S.strokes.slice();
      S.strokes=[];pushOp({del:gone,add:[]});scheduleRedraw();persist();
    },
    hasStrokes:function(){return S.strokes.length>0;},
    reload:function(){load();scheduleRedraw();},   /* 调变了：换存储桶重读 */
    /* 只给验证用：控制台里直接看 hold 状态机，不必靠真实计时去猜 */
    __hold:function(){
      return {ms:HOLD_MS,epsPx:HOLD_EPS_PX,minPts:SNAP_MIN_PTS,minPx:SNAP_MIN_PX,
        drawing:!!drawing,snapped:!!(drawing&&drawing.snapped),
        pts:drawing?drawing.pts.length:0,
        sinceMove:drawing?(Date.now()-lastMoveAt):-1,
        armed:!!holdTimer,due:holdDue(),box:{w:box.w,h:box.h}};
    },
    destroy:function(){
      destroyed=true;clearTimeout(holdTimer);clearTimeout(saveTimer);
      if(ro){try{ro.disconnect();}catch(_){}ro=null;}
      if(canvas){try{canvas.remove();}catch(_){}canvas=null;}
    }
  };
  loadOpts();          /* 笔的设置跨歌记住，建 api 之后立刻读回 */
  return api;
}

/* 按钮提示气泡：桌面悬停 350ms / 触屏长按 480ms 显示按钮用途。
   一个页面共用一个气泡节点。不吃掉任何点击。 */
/* 导出用：把克隆体里的空白墨迹画布换成实时画布的位图。
   canvas 的像素不随 cloneNode 走，克隆出来永远是空的 —— 这就是为什么
   墨迹一直进不了导出的 PNG。换成 <img src=toDataURL> 之后 html2canvas 能正常拍到。
   墨迹坐标本来就归一化到谱容器，所以图片按 100%/100% 拉满新盒子＝正确的变换：
   导出会按 max-content 重新排版，盒子变了，笔记跟着等比缩放，相对位置不变。
   返回 Promise，等图片解码完再让调用方去截图（data: URL 也不是同步可用的）。 */
function scoreInkPrepareExport(cloneRoot,liveRoot){
  if(!cloneRoot)return Promise.resolve();
  var clones=cloneRoot.querySelectorAll('.cecp-ink-layer');
  if(!clones.length)return Promise.resolve();
  var lives=(liveRoot||document).querySelectorAll('.cecp-ink-layer');
  var waits=[];
  for(var i=0;i<clones.length;i++){
    var c=clones[i],src=lives[i]||null,url='';
    if(src&&src.width&&src.height){
      try{url=src.toDataURL('image/png');}catch(_){url='';}
    }
    if(!url){                                   /* 没有墨迹就直接摘掉空画布 */
      if(c.parentNode)c.parentNode.removeChild(c);
      continue;
    }
    var img=document.createElement('img');
    img.alt='';
    img.style.cssText='position:absolute;inset:0;width:100%;height:100%;'
      +'object-fit:fill;pointer-events:none;';
    img.src=url;
    if(c.parentNode)c.parentNode.replaceChild(img,c);
    waits.push(img.decode?img.decode().catch(function(){}):Promise.resolve());
  }
  return Promise.all(waits);
}

function scoreInkTipBind(btn,label){
  var tip=document.getElementById('cecp-ink-tip');
  if(!tip){
    tip=document.createElement('div');
    tip.id='cecp-ink-tip';
    tip.style.cssText='position:fixed;z-index:100005;padding:5px 10px;border-radius:8px;'+
      'background:rgba(28,24,20,.92);color:#fff;font-size:12px;line-height:1.4;'+
      'pointer-events:none;opacity:0;transition:opacity .12s ease;white-space:nowrap;';
    document.body.appendChild(tip);
  }
  var showTimer=0,hideTimer=0;
  function show(){
    var r=btn.getBoundingClientRect();
    tip.textContent=label;
    tip.style.left=Math.max(6,Math.min(window.innerWidth-tip.offsetWidth-6,r.left+r.width/2-tip.offsetWidth/2))+'px';
    tip.style.top=(r.top-34<6?r.bottom+8:r.top-34)+'px';
    tip.style.opacity='1';
    clearTimeout(hideTimer);
    hideTimer=setTimeout(hide,2200);
  }
  function hide(){tip.style.opacity='0';}
  btn.addEventListener('mouseenter',function(){showTimer=setTimeout(show,350);});
  btn.addEventListener('mouseleave',function(){clearTimeout(showTimer);hide();});
  btn.addEventListener('touchstart',function(){showTimer=setTimeout(show,480);},{passive:true});
  btn.addEventListener('touchend',function(){clearTimeout(showTimer);},{passive:true});
  btn.addEventListener('touchmove',function(){clearTimeout(showTimer);},{passive:true});
}
/* ═══════════ CECP-SCORE-INK v1 END ═══════════ */
