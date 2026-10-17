/* Isolated, optional staff rendering. No song or legacy score mutation. */
(function(root){
  'use strict';
  const loads=new Map();
  function script(base,file,globalName){
    if(root[globalName])return Promise.resolve(root[globalName]);
    const url=new URL(file,base).href;
    if(!loads.has(url))loads.set(url,new Promise((resolve,reject)=>{
      const node=document.createElement('script');node.src=url;
      node.onload=()=>{if(root[globalName])resolve(root[globalName]);else{loads.delete(url);node.remove();reject(new Error(file+' missing global'));}};
      node.onerror=()=>{loads.delete(url);node.remove();reject(new Error(file+' load failed'));};
      document.head.appendChild(node);
    }));
    return loads.get(url);
  }
  /* 坏小节角标：把「拍数对不上」的小节在谱面上标出来。
     abcjs 的 add_classes 会给每个元素挂 abcjs-mm<N>（N 是 0 基小节序号，
     实测个数与 IR 小节数一一对应），据此定位。
     角标是 absolute 覆盖层，不参与 abcjs 布局，也不改 SVG。 */
  function countBadMeasures(jp,ir){
    if(!jp||!ir)return 0;
    try{ const s=jp.summarize(ir); return (s&&s.rows)?s.rows.length:0; }catch(e){ return 0; }
  }

  function markBadMeasures(host,surface,jp,ir){
    let sum; try{ sum=jp.summarize(ir); }catch(e){ return; }
    if(!sum||!sum.rows||!sum.rows.length)return;
    const svg=surface.querySelector('svg'); if(!svg)return;
    const layer=document.createElement('div');
    layer.className='ml-staff-warn-layer';
    const hostRect=host.getBoundingClientRect();
    let placed=0;
    sum.rows.forEach(r=>{
      const els=surface.querySelectorAll('.abcjs-mm'+(r.no-1));
      if(!els.length)return;
      let left=Infinity,top=Infinity;
      els.forEach(e=>{ const b=e.getBoundingClientRect(); if(!b.width&&!b.height)return;
        if(b.left<left)left=b.left; if(b.top<top)top=b.top; });
      if(!isFinite(left))return;
      const dot=document.createElement('span');
      dot.className='ml-staff-warn';
      dot.textContent='!';
      dot.title='第 '+r.no+' 小节：实际 '+r.beats+' 拍，应有 '+r.expected+' 拍（'+r.cat+'）';
      dot.style.left=Math.round(left-hostRect.left)+'px';
      dot.style.top=Math.round(top-hostRect.top-14)+'px';
      layer.appendChild(dot); placed++;
    });
    if(placed)host.appendChild(layer);
  }

  const PAPER_WIDTH=794,PAPER_MARGIN=24,LAYOUT_WIDTH=PAPER_WIDTH-2*PAPER_MARGIN;
  const CONTENT_RATIO=(PAPER_WIDTH*297/210-2*PAPER_MARGIN)/LAYOUT_WIDTH;
  function fitPaper(surface,width){
    const page=surface.querySelector('.ml-staff-page');
    const content=surface.querySelector('.ml-staff-page-content');
    const canvas=surface.querySelector('.ml-staff-canvas');
    page.style.width=width+'px';page.style.height=(width*297/210)+'px';
    page.style.padding=(width*PAPER_MARGIN/PAPER_WIDTH)+'px';
    const scoreWidth=Number(canvas.dataset.staffWidth);
    const scale=Math.min(content.clientWidth/scoreWidth,content.clientHeight/Number(canvas.dataset.staffHeight));
    canvas.style.transform='scale('+scale+')';
    canvas.style.left=Math.max(0,(content.clientWidth-scoreWidth*scale)/2)+'px';
  }
  function makePaper(surface,rendered,width){
    rendered.className='ml-staff-canvas';
    rendered.dataset.staffHeight=String(Math.ceil(rendered.getBoundingClientRect().height));
    Array.from(rendered.children).forEach(node=>node.classList.add('ml-staff-system'));
    const page=document.createElement('div');page.className='ml-staff-page';
    page.style.cssText='box-sizing:border-box;position:relative;background:#f7f4ee;color:#241C17;';
    const content=document.createElement('div');content.className='ml-staff-page-content';
    content.style.cssText='position:relative;width:100%;height:100%;overflow:hidden;';
    page.appendChild(content);surface.appendChild(page);content.appendChild(rendered);
    rendered.style.position='absolute';rendered.style.top='0';rendered.style.transformOrigin='top left';
    fitPaper(surface,width);
  }

  root.CecpStaffView={create(host,{base,onError}){
    let token=0,disposed=false,lastSong,lastKey,lastWidth=0,frame=0;
    /* 坏小节角标默认**关**：它是修谱用的提示，不是给唱的人看的。
       宿主用 setWarnings(on) 开关，开关时不重渲染谱面，只加/删覆盖层。 */
    let warnOn=false,lastIr=null,lastSurface=null,lastJp=null;
    /* opts.chordFlat = 宿主的 preferFlat（移调面板里的 ♭/# 开关）。
       不传的话 jp-ir 会按目标调推一个默认值，但用户手动切过 ♭/# 就会与简谱对不上。 */
    let lastOpts={};
    async function render(song,key,opts){
      lastSong=song;lastKey=key;lastOpts=opts||{};
      const current=++token;
      try{
        const [jp,abc,renderer]=await Promise.all([
          script(base,'jp-ir.js','CecpJpIR'),script(base,'ir-to-abc.js','CecpIrToAbc'),script(base,'abcjs-basic-min.js','ABCJS')
        ]);
        if(disposed||current!==token||!host.isConnected||host.hidden)return;
        const width=host.clientWidth;
        if(width<=0)return;
        const ir=jp.songToIR(song,{key,chordFlat:lastOpts.chordFlat});
        const source=abc.irToAbc(ir,{lineBreaks:'auto',stretchLast:true});
        const surface=document.createElement('div');surface.className='ml-staff-surface';
        surface.style.cssText='display:flex;flex-direction:column;gap:14px;color:#241C17;';
        const style=getComputedStyle(host);
        const pageWidth=width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
        const rendered=document.createElement('div');
        rendered.style.width=LAYOUT_WIDTH+'px';
        surface.appendChild(rendered);
        host.replaceChildren(surface);
        // Reflow long scores into wider systems before fitting, so height never wastes the page width.
        let scoreWidth=LAYOUT_WIDTH;
        for(let attempt=0;attempt<8;attempt++){
          rendered.style.width=scoreWidth+'px';rendered.dataset.staffWidth=String(scoreWidth);
          renderer.renderAbc(rendered,source,{staffwidth:scoreWidth,responsive:'resize',add_classes:true,
            oneSvgPerLine:true,foregroundColor:'#241C17',
            wrap:{minSpacing:1,maxSpacing:2.7,preferredMeasuresPerLine:6},
            paddingtop:10,paddingbottom:10,paddingleft:0,paddingright:0});
          // abcjs assigns width:100% to the target; restore the canonical width before measuring.
          rendered.style.width=scoreWidth+'px';
          const height=rendered.getBoundingClientRect().height;
          if(height<=scoreWidth*CONTENT_RATIO)break;
          scoreWidth=Math.max(scoreWidth+80,Math.ceil(scoreWidth*Math.sqrt(height/(scoreWidth*CONTENT_RATIO))*1.05));
        }
        if(disposed||current!==token)return;
        makePaper(surface,rendered,pageWidth);lastWidth=width;
        lastIr=ir;lastSurface=surface;lastJp=jp;
        if(warnOn)markBadMeasures(host,surface,jp,ir);
      }catch(error){if(!disposed&&current===token){onError(error);console.warn('Staff rendering failed',error);}}
    }
    const observer=new ResizeObserver(()=>{
      if(disposed||host.hidden||!lastSong||host.clientWidth<=0||host.clientWidth===lastWidth)return;
      cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
        if(!lastSurface?.isConnected)return;
        const style=getComputedStyle(host),width=host.clientWidth;
        fitPaper(lastSurface,width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0));lastWidth=width;
        host.querySelector('.ml-staff-warn-layer')?.remove();
        if(warnOn)markBadMeasures(host,lastSurface,lastJp,lastIr);
      });
    });observer.observe(host);
    function setWarnings(on){
      warnOn=!!on;
      const old=host.querySelector('.ml-staff-warn-layer');
      if(old)old.remove();
      if(warnOn&&lastIr&&lastSurface&&lastJp)markBadMeasures(host,lastSurface,lastJp,lastIr);
      return countBadMeasures(lastJp,lastIr);
    }
    /* 给宿主用来决定「有没有必要显示这个开关」 */
    function warnCount(){ return countBadMeasures(lastJp,lastIr); }
    return {render,setWarnings,warnCount,cancel(){token++;cancelAnimationFrame(frame);},destroy(){disposed=true;token++;cancelAnimationFrame(frame);observer.disconnect();}};
  }};
})(window);
