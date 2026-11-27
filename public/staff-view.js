/* Isolated, optional staff rendering. No song or legacy score mutation. */
(function(root){
  'use strict';
  const loads=new Map();
  const version=new URL(document.currentScript?.src||location.href).searchParams.get('v');
  function script(base,file,globalName){
    if(root[globalName])return Promise.resolve(root[globalName]);
    const asset=new URL(file,base);
    if(version&&file!=='abcjs-basic-min.js')asset.searchParams.set('v',version);
    const url=asset.href;
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
  const SEC_LABEL_COLORS=[
    ['pre-chorus','prechorus','pre chorus','前副歌','导歌','#0d9488'],
    ['chorus','副歌','#e8590c'],
    ['verse','主歌','#2f6fdb'],
    ['bridge','桥段','桥','#7c3aed'],
    ['intro','前奏','#6b7280'],
    ['outro','ending','尾奏','尾声','#b45309']
  ];
  const SEC_LABEL_FALLBACK=['#db2777','#0891b2','#4f46e5','#65a30d','#9333ea','#0284c7'];
  function secLabelColor(text){
    const t=String(text||'').toLowerCase();
    for(let i=0;i<SEC_LABEL_COLORS.length;i++){
      const grp=SEC_LABEL_COLORS[i];
      for(let j=0;j<grp.length-1;j++){
        if(grp[j]&&t.indexOf(grp[j])>=0)return grp[grp.length-1];
      }
    }
    let h=0;
    for(let k=0;k<t.length;k++)h=(h*31+t.charCodeAt(k))%997;
    return SEC_LABEL_FALLBACK[h%SEC_LABEL_FALLBACK.length];
  }
  function maxMeasuresPerLine(ir){
    const counts=new Map();
    (ir&&ir.sections||[]).forEach(sec=>(sec.measures||[]).forEach(m=>{
      if(!m.events||!m.events.length)return;
      const k=m.srcLine||('sec:'+sec.si);
      counts.set(k,(counts.get(k)||0)+1);
    }));
    let max=0;
    counts.forEach(v=>{if(v>max)max=v;});
    return max;
  }
  function fitHeaderTexts(rendered,scoreWidth){
    const maxW=scoreWidth-16;
    if(maxW<=80)return;
    rendered.querySelectorAll('svg').forEach(svg=>{
      if(svg.querySelector('.abcjs-staff'))return;
      svg.querySelectorAll('text').forEach(t=>{
        let b;try{b=t.getBBox();}catch(_){return;}
        if(!b||b.width<=maxW)return;
        const cur=parseFloat(t.getAttribute('font-size')||getComputedStyle(t).fontSize)||13;
        const next=Math.max(9,cur*maxW/b.width);
        t.style.fontSize=next.toFixed(2)+'px';
        t.querySelectorAll('tspan').forEach(sp=>{
          if(sp.getAttribute('font-size')||sp.style.fontSize)sp.style.fontSize=next.toFixed(2)+'px';
        });
        try{
          if(t.getBBox().width>maxW){
            t.setAttribute('textLength',String(Math.floor(maxW)));
            t.setAttribute('lengthAdjust','spacingAndGlyphs');
          }
        }catch(_){}
      });
    });
  }
  function renderSectionLabels(rendered,ir,scoreWidth,useWrap){
    const allLabels=(ir&&ir.sections||[]).flatMap(sec=>sec.labels||[]);
    if(!allLabels.length)return;
    const svgs=Array.from(rendered.querySelectorAll('svg'));
    const staffSvgs=svgs.filter(svg=>svg.querySelector('.abcjs-staff'));
    const mmInfo=new Map();
    const orderedMm=[];
    staffSvgs.forEach(svg=>{
      svg.querySelectorAll('.abcjs-note, .abcjs-rest').forEach(el=>{
        const m=String(el.getAttribute('class')||'').match(/abcjs-mm\d+/g);
        if(!m)return;
        m.forEach(cls=>{
          if(!mmInfo.has(cls)){mmInfo.set(cls,{svg,cls});orderedMm.push(cls);}
        });
      });
    });
    const measureMap=new Map();
    const nonEmptyMeasures=[];
    const orderedSrcLines=[];
    (ir.sections||[]).forEach(sec=>(sec.measures||[]).forEach(m=>{
      if(!m.events||!m.events.length)return;
      nonEmptyMeasures.push(m);
      if(m.srcLine&&(!orderedSrcLines.length||orderedSrcLines[orderedSrcLines.length-1]!==m.srcLine)){
        if(orderedSrcLines.indexOf(m.srcLine)<0)orderedSrcLines.push(m.srcLine);
      }
    }));
    if(orderedMm.length===nonEmptyMeasures.length){
      nonEmptyMeasures.forEach((m,i)=>{
        const info=mmInfo.get(orderedMm[i]);
        if(info)measureMap.set(m.no,{svg:info.svg,cls:info.cls,measure:m});
      });
    }else{
      nonEmptyMeasures.forEach(m=>{
        const cls='abcjs-mm'+(m.no-1);
        const info=mmInfo.get(cls);
        if(info)measureMap.set(m.no,{svg:info.svg,cls:info.cls,measure:m});
      });
    }
    const srcLineSvg=new Map();
    if(!useWrap&&orderedSrcLines.length===staffSvgs.length){
      orderedSrcLines.forEach((sl,i)=>srcLineSvg.set(sl,staffSvgs[i]));
    }else{
      nonEmptyMeasures.forEach(m=>{
        if(!m.srcLine||srcLineSvg.has(m.srcLine))return;
        const info=measureMap.get(m.no);
        if(info)srcLineSvg.set(m.srcLine,info.svg);
      });
    }
    const bySvg=new Map();
    allLabels.forEach(lb=>{
      const info=lb.measureNo!=null?measureMap.get(lb.measureNo):null;
      const svg=(info&&info.svg)||srcLineSvg.get(lb.srcLine);
      if(!svg)return;
      if(!bySvg.has(svg))bySvg.set(svg,[]);
      bySvg.get(svg).push({lb,mmCls:info?info.cls:null,measure:info?info.measure:null});
    });
    if(!bySvg.size)return;
    const renderedRect=rendered.getBoundingClientRect();
    bySvg.forEach((entries,svg)=>{
      let sysNode=svg;
      while(sysNode&&sysNode.parentElement!==rendered)sysNode=sysNode.parentElement;
      if(!sysNode)return;
      const staffEl=svg.querySelector('.abcjs-staff');
      const staffBox=staffEl?staffEl.getBoundingClientRect():svg.getBoundingClientRect();
      const staffLeft=Math.max(0,staffBox.left-renderedRect.left);
      const staffRight=Math.min(scoreWidth,staffBox.right-renderedRect.left);
      const firstEv=svg.querySelector('.abcjs-note, .abcjs-rest');
      const musicLeft=firstEv?Math.max(staffLeft,firstEv.getBoundingClientRect().left-renderedRect.left-4):staffLeft;
      const musicW=Math.max(80,staffRight-musicLeft);
      const row=document.createElement('div');
      row.className='ml-staff-label-row';
      row.style.cssText='position:relative;width:'+scoreWidth+'px;height:20px;margin:2px 0 -4px;pointer-events:none;box-sizing:border-box;';
      rendered.insertBefore(row,sysNode);
      const items=entries.map((entry,idx)=>{
        const lb=entry.lb;
        const pill=document.createElement('span');
        const jump=lb.style==='jump';
        pill.className='ml-staff-label'+(jump?' ml-staff-label-jump':'');
        const color=secLabelColor(lb.text);
        const base='position:absolute;top:1px;display:inline-block;white-space:nowrap;line-height:1.35;font-size:11px;padding:1px 8px;border-radius:999px;box-sizing:border-box;letter-spacing:0.3px;';
        pill.style.cssText=jump
          ?(base+'font-style:italic;font-weight:600;color:'+color+';border:1px solid '+color+';background:rgba(247,244,238,0.92);')
          :(base+'font-weight:700;color:#ffffff;border:1px solid '+color+';background:'+color+';');
        pill.textContent=lb.text;
        row.appendChild(pill);
        const pillW=pill.offsetWidth||40;
        let x=null;
        if(entry.mmCls){
          const evEls=Array.from(svg.querySelectorAll('.'+entry.mmCls+'.abcjs-note, .'+entry.mmCls+'.abcjs-rest'));
          const barEls=Array.from(svg.querySelectorAll('.'+entry.mmCls+'.abcjs-bar'));
          if(lb.atBarEnd||lb.atEnd){
            const tgt=barEls.length?barEls[barEls.length-1]:(evEls.length?evEls[evEls.length-1]:null);
            if(tgt){
              const bx=tgt.getBoundingClientRect().right-renderedRect.left;
              x=(bx>staffRight-pillW*0.5)?(bx-pillW):(bx-pillW*0.7);
            }
          }else if(lb.eventIdx!=null&&evEls.length){
            let svgIdx=0;
            const evs=(entry.measure&&entry.measure.events)||[];
            for(let k=0;k<lb.eventIdx&&k<evs.length;k++){
              svgIdx+=(evs[k].pieces&&evs[k].pieces.length)||1;
            }
            svgIdx=Math.max(0,Math.min(evEls.length-1,svgIdx));
            x=evEls[svgIdx].getBoundingClientRect().left-renderedRect.left;
          }else if(evEls.length){
            x=evEls[0].getBoundingClientRect().left-renderedRect.left;
          }
        }
        if(x===null)x=musicLeft+(lb.xRatio||0)*musicW;
        return {pill,pillW,x:Math.max(staffLeft,Math.min(staffRight-pillW,x)),idx};
      });
      items.sort((a,b)=>(a.x-b.x)||(a.idx-b.idx));
      for(let i=1;i<items.length;i++){
        items[i].x=Math.max(items[i].x,items[i-1].x+items[i-1].pillW+6);
      }
      if(items.length){
        const last=items[items.length-1];
        if(last.x+last.pillW>staffRight){
          last.x=Math.max(staffLeft,staffRight-last.pillW);
          for(let i=items.length-2;i>=0;i--){
            items[i].x=Math.max(staffLeft,Math.min(items[i].x,items[i+1].x-items[i].pillW-6));
          }
        }
      }
      items.forEach(it=>{it.pill.style.left=Math.round(it.x)+'px';});
    });
  }
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
    Array.from(rendered.children).forEach(node=>{
      if(!node.classList.contains('ml-staff-label-row'))node.classList.add('ml-staff-system');
    });
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
        const useWrap=maxMeasuresPerLine(ir)>10;
        const source=abc.irToAbc(ir,useWrap?{lineBreaks:'auto',stretchLast:true}:{lineBreaks:'jianpu',stretchLast:0.38});
        const surface=document.createElement('div');surface.className='ml-staff-surface';
        surface.style.cssText='display:flex;flex-direction:column;gap:14px;color:#241C17;';
        const style=getComputedStyle(host);
        const pageWidth=width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
        const rendered=document.createElement('div');
        rendered.style.width=LAYOUT_WIDTH+'px';
        surface.appendChild(rendered);
        host.replaceChildren(surface);
        // 跟随简谱分行并按 A4 比例扩宽版面，保证换行与简谱一致、右侧对齐且不裁切标题。
        let scoreWidth=LAYOUT_WIDTH;
        const renderOpts={staffwidth:scoreWidth,responsive:'resize',add_classes:true,
          oneSvgPerLine:true,foregroundColor:'#241C17',
          paddingtop:10,paddingbottom:10,paddingleft:0,paddingright:0};
        if(useWrap)renderOpts.wrap={minSpacing:1,maxSpacing:2.7,preferredMeasuresPerLine:6};
        for(let attempt=0;attempt<8;attempt++){
          rendered.style.width=scoreWidth+'px';rendered.dataset.staffWidth=String(scoreWidth);
          renderOpts.staffwidth=scoreWidth;
          renderer.renderAbc(rendered,source,renderOpts);
          // abcjs assigns width:100% to the target; restore the canonical width before measuring.
          rendered.style.width=scoreWidth+'px';
          fitHeaderTexts(rendered,scoreWidth);
          renderSectionLabels(rendered,ir,scoreWidth,useWrap);
          const height=rendered.getBoundingClientRect().height;
          let nextWidth=scoreWidth;
          if(!useWrap){
            let maxStaffW=0;
            rendered.querySelectorAll('svg .abcjs-staff').forEach(st=>{
              try{const w=st.getBBox().width;if(w>maxStaffW)maxStaffW=w;}catch(_){}
            });
            if(maxStaffW>scoreWidth+6)nextWidth=Math.max(nextWidth,Math.ceil(maxStaffW)+8);
          }
          if(height>scoreWidth*CONTENT_RATIO){
            nextWidth=Math.max(nextWidth,useWrap
              ?Math.max(scoreWidth+80,Math.ceil(scoreWidth*Math.sqrt(height/(scoreWidth*CONTENT_RATIO))*1.05))
              :(Math.ceil(height/CONTENT_RATIO)+12));
          }
          if(nextWidth<=scoreWidth)break;
          scoreWidth=nextWidth;
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
