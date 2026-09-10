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
  root.CecpStaffView={create(host,{base,onError}){
    let token=0,disposed=false,lastSong,lastKey,lastWidth=0,frame=0;
    async function render(song,key){
      lastSong=song;lastKey=key;
      const current=++token;
      try{
        const [jp,abc,renderer]=await Promise.all([
          script(base,'jp-ir.js','CecpJpIR'),script(base,'ir-to-abc.js','CecpIrToAbc'),script(base,'abcjs-basic-min.js','ABCJS')
        ]);
        if(disposed||current!==token||!host.isConnected||host.hidden)return;
        const width=host.clientWidth;
        if(width<=0)return;
        const ir=jp.songToIR(song,{key});
        const source=abc.irToAbc(ir);
        const surface=document.createElement('div');surface.className='ml-staff-surface';
        /* 断行**跟随简谱**：ir-to-abc 默认按 song JSON 的 lines[] 输出硬换行，
           五线谱与简谱逐行对照。所以这里**不能传 abcjs 的 wrap 选项**，会覆盖硬换行。

           版面宽度不跟面板走，取一个足够宽的下限再由 responsive:'resize' 整体缩放到面板
           —— 跟简谱那边的 A4 纸缩放同一套思路。abcjs 在 staffwidth 低于内容自然宽时
           会放弃两端对齐，所以下限必须够宽。全库实测满行极差：
             版面 700  → 最大 222px，44 首超 20px
             版面 880  → 最大 108px，8 首超 20px
             版面 1100 → 最大 6px，0 首超 20px      ← 采用
             版面 1400 → 最大 2px（再宽收益很小，缩放后字更小）
           简谱每行 3–6 小节占 92%，跟随分行后平均 4.4 小节/行。 */
        const layoutWidth=Math.max(1100,width-48);
        renderer.renderAbc(surface,source,{staffwidth:layoutWidth,responsive:'resize',add_classes:true,
          paddingtop:24,paddingbottom:24,paddingleft:24,paddingright:24});
        if(disposed||current!==token)return;
        host.replaceChildren(surface);lastWidth=width;
      }catch(error){if(!disposed&&current===token){onError(error);console.warn('Staff rendering failed',error);}}
    }
    const observer=new ResizeObserver(()=>{
      if(disposed||host.hidden||!lastSong||host.clientWidth<=0||host.clientWidth===lastWidth)return;
      cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>render(lastSong,lastKey));
    });observer.observe(host);
    return {render,cancel(){token++;cancelAnimationFrame(frame);},destroy(){disposed=true;token++;cancelAnimationFrame(frame);observer.disconnect();}};
  }};
})(window);
