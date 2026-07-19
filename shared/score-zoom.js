/* ═══════════ CECP-SCORE-ZOOM v1 BEGIN ═══════════
   全屏图片式查看器: 双指捏合缩放、拖动平移、点空白退出, 跟微信点图片一样。两种内容用同一套手势:
     ① 移调谱(.sw-lb-zoomable): 点谱 -> 克隆谱 DOM 放大(矢量, 放多大都清晰); 谱内点和弦照弹指法图
        (和弦点击是 CECP-CHORD-ENGINE 挂 document 的委托, 克隆后照样命中)。document 委托自动接管。
     ② 原图图片: 宿主调 window.CecpZoom.openImage(list, idx) 打开; 带上一张/下一张。
   本块在以下文件中逐字节相同(权威版本 = shared/score-zoom.js): musiclib/musiclib.js / youth-engine.js
   修改流程: 先改 shared/score-zoom.js, 再同步两处, diff 校验一致。
   自包含: 自注入 CSS + 懒建遮罩; z-index 2147481000 压在和弦图之下(点和弦时指法图弹在放大层之上)。
   谱样式在宿主里带作用域(musiclib 是 #music-library .prev-row, youth 全局), 故"谱"模式把遮罩挂进源谱的作用域根;
   "图片"模式无此依赖, 挂 body。量尺寸必须在 display 打开之后(display:none 量出来是 0)。 */
(function(){
  if(typeof document==='undefined'||window.__cecpScoreZoom)return;
  window.__cecpScoreZoom=true;
  var overlay=null,content=null,prevBtn=null,nextBtn=null,countEl=null;
  var mode='node',imgList=[],imgIdx=0;
  var s=1,tx=0,ty=0,minS=1,maxS=4,natW=1,natH=1;
  var pts={},pinch=null,pan=null,down=null,dragged=false;
  function injectCss(){
    if(document.getElementById('cecp-scorezoom-css'))return;
    var st=document.createElement('style');st.id='cecp-scorezoom-css';
    st.textContent=[
      '#cecp-scorezoom{position:fixed;inset:0;z-index:2147481000;display:none;overflow:hidden;background:var(--bg,#0b0f16);touch-action:none;cursor:zoom-out;-webkit-user-select:none;user-select:none;}',
      '#cecp-scorezoom.open{display:block;}',
      '#cecp-scorezoom .czoom-content{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform;width:max-content;padding:16px;box-sizing:border-box;}',
      '#cecp-scorezoom .czoom-content.czoom-img{padding:0;}',
      '#cecp-scorezoom .czoom-content.czoom-img img{display:block;max-width:none;}',
      '#cecp-scorezoom .czoom-nav{position:fixed;top:50%;transform:translateY(-50%);width:44px;height:66px;border:none;border-radius:12px;background:rgba(0,0,0,.34);color:#fff;font-size:30px;line-height:1;cursor:pointer;z-index:3;display:none;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;}',
      '#cecp-scorezoom .czoom-prev{left:10px;}#cecp-scorezoom .czoom-next{right:10px;}',
      '#cecp-scorezoom .czoom-count{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));left:0;right:0;text-align:center;font-size:13px;letter-spacing:1px;color:rgba(255,255,255,.62);font-family:"Noto Sans SC",sans-serif;pointer-events:none;display:none;z-index:3;}',
      '#cecp-scorezoom .czoom-hint{position:fixed;left:0;right:0;bottom:calc(12px + env(safe-area-inset-bottom,0px));text-align:center;font-size:12px;letter-spacing:1px;color:var(--text3,rgba(140,140,150,.72));font-family:"Noto Sans SC",sans-serif;pointer-events:none;}',
      '.sw-lb-zoomable{cursor:zoom-in;}'
    ].join('');
    (document.head||document.documentElement).appendChild(st);
  }
  function apply(){content.style.transform='translate('+tx+'px,'+ty+'px) scale('+s+')';}
  function clampPan(){
    var vw=window.innerWidth,vh=window.innerHeight,w=natW*s,h=natH*s;
    if(w<=vw)tx=(vw-w)/2; else tx=Math.min(0,Math.max(vw-w,tx));
    if(h<=vh)ty=(vh-h)/2; else ty=Math.min(12,Math.max(vh-h-12,ty));
  }
  function ensure(){
    if(overlay)return; injectCss();
    overlay=document.createElement('div');overlay.id='cecp-scorezoom';
    overlay.innerHTML='<div class="czoom-content sw-lb"></div>'+
      '<button class="czoom-nav czoom-prev" type="button" aria-label="上一张">‹</button>'+
      '<button class="czoom-nav czoom-next" type="button" aria-label="下一张">›</button>'+
      '<div class="czoom-count"></div>'+
      '<div class="czoom-hint">双指缩放 · 拖动平移 · 点空白退出</div>';
    content=overlay.querySelector('.czoom-content');
    prevBtn=overlay.querySelector('.czoom-prev');nextBtn=overlay.querySelector('.czoom-next');countEl=overlay.querySelector('.czoom-count');
    prevBtn.addEventListener('click',function(e){e.stopPropagation();nav(-1);});
    nextBtn.addEventListener('click',function(e){e.stopPropagation();nav(1);});
    bind();
  }
  function isOpen(){return overlay&&overlay.classList.contains('open');}
  function fitAndCenter(){
    content.style.transform='none';
    natW=content.offsetWidth||content.scrollWidth||1;
    natH=content.offsetHeight||content.scrollHeight||1;
    var vw=window.innerWidth,vh=window.innerHeight;
    if(mode==='image'){var f=Math.min((vw-16)/natW,(vh-64)/natH);if(!(f>0))f=1;f=Math.min(3,f);minS=f;s=f;maxS=f*4;}
    else{minS=Math.min(1,(vw-8)/natW);s=Math.max(minS,Math.min(2.4,(vw-8)/natW));maxS=Math.max(minS*4,s*4);}
    tx=0;ty=(mode==='image'?0:12);clampPan();apply();
  }
  function updateNav(){
    var multi=mode==='image'&&imgList.length>1;
    prevBtn.style.display=multi?'flex':'none';nextBtn.style.display=multi?'flex':'none';
    countEl.style.display=(mode==='image'&&imgList.length)?'block':'none';
    if(mode==='image'&&imgList.length)countEl.textContent=(imgIdx+1)+' / '+imgList.length;
  }
  function open(src){                                   // 谱模式
    ensure();
    var root=(src.closest&&src.closest('#music-library,#ym-root'))||document.body;
    if(overlay.parentNode!==root)root.appendChild(overlay);
    mode='node';imgList=[];
    content.className=('czoom-content '+src.className).replace('sw-lb-zoomable','').replace(/\s+/g,' ');
    content.innerHTML=src.innerHTML;
    overlay.classList.add('open');document.documentElement.style.overflow='hidden';
    updateNav();fitAndCenter();
  }
  function openImage(list,idx){                          // 图片模式(宿主调用)
    ensure();
    if(overlay.parentNode!==document.body)document.body.appendChild(overlay);
    imgList=(list||[]).filter(Boolean);if(!imgList.length)return;
    mode='image';imgIdx=Math.max(0,Math.min(imgList.length-1,idx||0));
    overlay.classList.add('open');document.documentElement.style.overflow='hidden';
    showImg();
  }
  function showImg(){
    content.className='czoom-content czoom-img';
    content.innerHTML='<img alt="原图">';
    var img=content.querySelector('img');
    img.onload=fitAndCenter;
    img.src=imgList[imgIdx];
    if(img.complete&&img.naturalWidth)fitAndCenter();
    updateNav();
  }
  function nav(d){if(mode!=='image'||imgList.length<2)return;imgIdx=(imgIdx+d+imgList.length)%imgList.length;showImg();}
  function close(){if(overlay){overlay.classList.remove('open');document.documentElement.style.overflow='';pts={};pinch=pan=down=null;}}
  function d2(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function mid(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  function zoomAt(ns,cx,cy){ns=Math.max(minS,Math.min(maxS,ns));var k=ns/s;tx=cx-(cx-tx)*k;ty=cy-(cy-ty)*k;s=ns;clampPan();apply();}
  function bind(){
    overlay.addEventListener('pointerdown',function(e){
      if(overlay.setPointerCapture)try{overlay.setPointerCapture(e.pointerId);}catch(_){}
      pts[e.pointerId]={x:e.clientX,y:e.clientY};
      var ids=Object.keys(pts);
      if(ids.length===1){pan={x:e.clientX,y:e.clientY,tx:tx,ty:ty};down={x:e.clientX,y:e.clientY,target:e.target};dragged=false;}
      else if(ids.length===2){var p=ids.map(function(i){return pts[i];});pinch={d:d2(p[0],p[1]),s:s};}
    });
    overlay.addEventListener('pointermove',function(e){
      if(!pts[e.pointerId])return;
      pts[e.pointerId]={x:e.clientX,y:e.clientY};
      var ids=Object.keys(pts);
      if(ids.length>=2&&pinch){e.preventDefault();var p=ids.map(function(i){return pts[i];});var m=mid(p[0],p[1]);zoomAt(pinch.s*(d2(p[0],p[1])/pinch.d),m.x,m.y);}
      else if(ids.length===1&&pan){var dx=e.clientX-pan.x,dy=e.clientY-pan.y;if(dragged||Math.abs(dx)>6||Math.abs(dy)>6){dragged=true;e.preventDefault();tx=pan.tx+dx;ty=pan.ty+dy;clampPan();apply();}}
    });
    function up(e){
      var single=Object.keys(pts).length===1;
      delete pts[e.pointerId];
      if(Object.keys(pts).length<2)pinch=null;
      if(Object.keys(pts).length===0){
        pan=null;
        if(single&&down&&!dragged){                     // 一次干净的点击
          var t=down.target;
          if(t&&t.closest&&(t.closest('.p-chord:not(.empty)')||t.closest('.czoom-nav'))){down=null;return;} // 和弦/翻页钮: 不退出
          close();                                       // 点空白/音符/歌词/图片 -> 退出
        }
        down=null;
      }
    }
    overlay.addEventListener('pointerup',up);
    overlay.addEventListener('pointercancel',up);
    overlay.addEventListener('dblclick',function(e){
      if(e.target.closest('.p-chord:not(.empty)')||e.target.closest('.czoom-nav'))return;e.preventDefault();
      var fit=(mode==='image')?minS:Math.max(minS,Math.min(2.4,(window.innerWidth-8)/natW));
      if(s>fit*1.05){s=fit;tx=0;ty=(mode==='image'?0:12);clampPan();apply();}else zoomAt(fit*2.2,e.clientX,e.clientY);
    });
  }
  document.addEventListener('click',function(e){       // 未放大时点谱 -> 打开(图片由宿主 openImage 触发)
    if(isOpen())return;
    var t=e.target;if(!t||!t.closest)return;
    if(t.closest('.p-chord:not(.empty)'))return;
    var box=t.closest('.sw-lb-zoomable');
    if(box&&box.textContent.trim())open(box);
  },false);
  document.addEventListener('keydown',function(e){if(!isOpen())return;if(e.key==='Escape')close();else if(mode==='image'&&e.key==='ArrowLeft')nav(-1);else if(mode==='image'&&e.key==='ArrowRight')nav(1);});
  window.addEventListener('resize',function(){if(isOpen()){clampPan();apply();}});
  window.CecpZoom={openImage:openImage};               // 宿主原图 lightbox 改调这个, 体验统一
})();
/* ═══════════ CECP-SCORE-ZOOM v1 END ═══════════ */
