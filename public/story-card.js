(function(){
  'use strict';

  const WIDTH=1080;
  const HEIGHT=1920;
  const SERIF='"Kaiti SC", "STKaiti", "KaiTi", "Songti SC", "Noto Serif CJK SC", Georgia, serif';
  const SANS='-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
  const HAND='"CECP Story Hand", '+SERIF;
  const scriptUrl=typeof document!=='undefined'?(document.currentScript?.src||document.baseURI):'';
  const fonts=[
    {id:'handwriting',label:'灵动手写',shortLabel:'手写',family:HAND,face:'CECP Story Hand',file:'MaShanZheng-Regular.ttf'},
    {id:'longcang',label:'清瘦行书',family:'"CECP Story Long Cang", '+SERIF,face:'CECP Story Long Cang',file:'LongCang-Regular.woff2'},
    {id:'xiaowei',label:'文艺宋体',family:'"CECP Story Xiao Wei", "Songti SC", Georgia, serif',face:'CECP Story Xiao Wei',file:'ZCOOLXiaoWei-Regular.woff2'},
    {id:'kuaile',label:'活泼童趣',family:'"CECP Story Kuai Le", '+SANS,face:'CECP Story Kuai Le',file:'ZCOOLKuaiLe-Regular.woff2'},
    {id:'huangyou',label:'复古窄体',family:'"CECP Story Huang You", '+SANS,face:'CECP Story Huang You',file:'ZCOOLQingKeHuangYou-Regular.woff2'},
    {id:'caveat',label:'拉丁手写',family:'"CECP Story Caveat", '+SERIF,face:'CECP Story Caveat',file:'Caveat-Variable.woff2',hint:'适合意大利语等拉丁文字；中文自动使用衬线字体。'},
    {id:'serif',label:'经典衬线',shortLabel:'衬线',family:SERIF},
    {id:'sans',label:'简约黑体',shortLabel:'简约',family:SANS}
  ];
  const fontLoads=new Map();
  const segmenter=typeof Intl!=='undefined'&&Intl.Segmenter?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
  const backgrounds=[
    {id:'sunset',label:'暖色日落',colors:['#8293af','#f3c6ac','#f9dfbf','#7f91a7']},
    {id:'night',label:'深蓝夜空',colors:['#071d2b','#153d50','#416174','#172c3b']},
    {id:'cream',label:'米白极简',colors:['#ede3d2','#f4ead9','#e6d5ba','#d3c2aa']},
    {id:'mist',label:'雾蓝渐变',colors:['#54768c','#acbec8','#d7d3ca','#75909f']},
    {id:'album',label:'封面延展',colors:['#283e53','#7c8999','#b6a79f','#344554']}
  ];
  const coverCache=new Map();

  function timeout(promise,milliseconds,fallback){
    let timer;
    return Promise.race([promise,new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),milliseconds);})])
      .finally(()=>clearTimeout(timer));
  }

  function loadFont(font){
    if(!font.file)return Promise.resolve(true);
    if(typeof FontFace!=='function'||!document.fonts?.add)return Promise.resolve(false);
    if(!fontLoads.has(font.id)){
      try{
        const source=new URL('./fonts/'+font.file,scriptUrl).href;
        const face=new FontFace(font.face,`url("${source}")`);
        const pending=face.load().then(loaded=>{
          document.fonts.add(loaded);
          return true;
        }).catch(()=>{fontLoads.delete(font.id);return false;});
        fontLoads.set(font.id,pending);
      }catch(_){return Promise.resolve(false);}
    }
    return timeout(fontLoads.get(font.id),8000,false);
  }

  async function loadCover(source){
    if(!source)return null;
    if(coverCache.has(source))return coverCache.get(source);
    const pending=new Promise(resolve=>{
      const cover=new Image();
      cover.crossOrigin='anonymous';
      cover.onload=()=>{
        try{
          const sample=document.createElement('canvas');
          sample.width=1;
          sample.height=1;
          const context=sample.getContext('2d');
          context.drawImage(cover,0,0,1,1);
          context.getImageData(0,0,1,1);
          resolve(cover.naturalWidth&&cover.naturalHeight?cover:null);
        }catch(error){resolve(null);}
      };
      cover.onerror=()=>resolve(null);
      cover.src=source;
    });
    const result=timeout(pending,7000,null);
    coverCache.set(source,result);
    if(coverCache.size>16)coverCache.delete(coverCache.keys().next().value);
    const image=await result;
    if(!image)coverCache.delete(source);
    return image;
  }

  function rounded(context,left,top,width,height,radius){
    const corner=Math.min(radius,width/2,height/2);
    context.beginPath();
    context.moveTo(left+corner,top);
    context.arcTo(left+width,top,left+width,top+height,corner);
    context.arcTo(left+width,top+height,left,top+height,corner);
    context.arcTo(left,top+height,left,top,corner);
    context.arcTo(left,top,left+width,top,corner);
    context.closePath();
  }

  function coverImage(context,cover,left,top,size,radius=24){
    context.save();
    rounded(context,left,top,size,size,radius);
    context.clip();
    if(cover){
      const side=Math.min(cover.naturalWidth,cover.naturalHeight);
      context.drawImage(cover,(cover.naturalWidth-side)/2,(cover.naturalHeight-side)/2,side,side,left,top,size,size);
    }else{
      const gradient=context.createLinearGradient(left,top,left+size,top+size);
      gradient.addColorStop(0,'#c6ad9b');
      gradient.addColorStop(.5,'#b5b5c3');
      gradient.addColorStop(1,'#607c93');
      context.fillStyle=gradient;
      context.fillRect(left,top,size,size);
      context.fillStyle='rgba(255,255,255,.78)';
      context.font=`${Math.round(size*.42)}px ${SERIF}`;
      context.textAlign='center';
      context.textBaseline='middle';
      context.fillText('♫',left+size/2,top+size/2,size*.75);
    }
    context.restore();
  }

  function paletteFromCover(cover){
    if(!cover)return backgrounds[4].colors;
    try{
      const sample=document.createElement('canvas');
      sample.width=3;
      sample.height=3;
      const context=sample.getContext('2d');
      context.drawImage(cover,0,0,3,3);
      const pixels=context.getImageData(0,0,3,3).data;
      return [0,16,24,32].map(index=>`rgb(${pixels[index]},${pixels[index+1]},${pixels[index+2]})`);
    }catch(error){return backgrounds[4].colors;}
  }

  function drawBackground(context,background,cover,isCover){
    const theme=backgrounds.find(item=>item.id===background)||backgrounds[0];
    const album=background==='album'&&cover;
    const colors=album?paletteFromCover(cover):theme.colors;
    const gradient=context.createLinearGradient(0,0,WIDTH,HEIGHT);
    colors.forEach((color,index)=>gradient.addColorStop(index/(colors.length-1),color));
    context.fillStyle=gradient;
    context.fillRect(0,0,WIDTH,HEIGHT);
    if(album){
      const artwork=document.createElement('canvas');
      artwork.width=WIDTH+108;
      artwork.height=HEIGHT+108;
      const artworkContext=artwork.getContext('2d');
      const ratio=Math.max(artwork.width/cover.naturalWidth,artwork.height/cover.naturalHeight);
      const width=cover.naturalWidth*ratio;
      const height=cover.naturalHeight*ratio;
      artworkContext.drawImage(cover,(artwork.width-width)/2,(artwork.height-height)/2,width,height);
      context.save();
      context.globalAlpha=.98;
      context.filter='blur(10px)';
      context.drawImage(artwork,-54,-54);
      context.restore();
    }
    if(!isCover&&background==='sunset'){
      const glow=context.createRadialGradient(810,920,20,810,920,730);
      glow.addColorStop(0,'rgba(255,241,208,.65)');
      glow.addColorStop(1,'rgba(255,238,205,0)');
      context.fillStyle=glow;
      context.fillRect(0,0,WIDTH,HEIGHT);
    }
    if(!isCover&&background==='night')drawNight(context);
    if(!isCover&&background!=='cream'&&background!=='album')drawHorizon(context,background);
    const veil=context.createLinearGradient(0,0,0,HEIGHT);
    veil.addColorStop(0,background==='album'?'rgba(8,15,24,.26)':isCover?'rgba(8,15,24,.15)':'rgba(255,255,255,.02)');
    if(background==='album'){
      veil.addColorStop(.35,'rgba(8,15,24,.42)');
      veil.addColorStop(.7,'rgba(8,15,24,.39)');
    }
    veil.addColorStop(1,isCover||background==='album'?'rgba(8,15,24,.67)':'rgba(13,25,39,.08)');
    context.fillStyle=veil;
    context.fillRect(0,0,WIDTH,HEIGHT);
    if(background==='cream'&&!isCover)drawGrain(context);
  }

  function drawNight(context){
    context.fillStyle='rgba(245,239,220,.52)';
    for(let index=0;index<43;index++){
      const left=70+((index*173)%940);
      const top=160+((index*127)%1130);
      context.beginPath();
      context.arc(left,top,index%7===0?1.8:.9,0,Math.PI*2);
      context.fill();
    }
    context.save();
    context.translate(848,286);
    context.rotate(-.48);
    context.fillStyle='rgba(255,244,213,.88)';
    context.beginPath();
    context.arc(0,0,37,0,Math.PI*2);
    context.fill();
    context.globalCompositeOperation='destination-out';
    context.beginPath();
    context.arc(-12,-8,33,0,Math.PI*2);
    context.fill();
    context.restore();
    context.save();
    context.globalCompositeOperation='destination-over';
    context.fillStyle='#102e40';
    context.fillRect(0,0,WIDTH,HEIGHT);
    context.restore();
  }

  function drawHorizon(context,background){
    const dark=background==='night';
    for(let layer=0;layer<4;layer++){
      const base=1280+layer*90;
      context.fillStyle=dark?`rgba(5,20,31,${.06+layer*.035})`:`rgba(53,75,101,${.04+layer*.025})`;
      context.beginPath();
      context.moveTo(0,HEIGHT);
      context.lineTo(0,base+105);
      context.bezierCurveTo(130,base-90,210,base+115,370,base+12);
      context.bezierCurveTo(530,base-90,655,base+150,810,base-5);
      context.bezierCurveTo(930,base-110,1000,base+20,WIDTH,base-90);
      context.lineTo(WIDTH,HEIGHT);
      context.closePath();
      context.fill();
    }
  }

  function drawGrain(context){
    context.fillStyle='rgba(94,69,42,.035)';
    for(let index=0;index<1800;index++)context.fillRect((index*811)%WIDTH,(index*677)%HEIGHT,1.4,1.4);
  }

  function textParts(value){
    const text=String(value||'');
    return segmenter?Array.from(segmenter.segment(text),part=>part.segment):text.match(/\P{Mark}\p{Mark}*|\p{Mark}+/gu)||[];
  }

  function textWidth(context,value,letterSpacing){
    if(!letterSpacing||'letterSpacing' in context)return context.measureText(value).width;
    const parts=textParts(value);
    return parts.reduce((width,part)=>width+context.measureText(part).width,0)+Math.max(0,parts.length-1)*letterSpacing;
  }

  function wrapText(context,value,maxWidth,letterSpacing){
    const output=[];
    String(value||'').split(/\r?\n/).forEach(paragraph=>{
      if(!paragraph.trim()){output.push('');return;}
      const tokens=paragraph.match(/[\u2e80-\uffff]|[^\s\u2e80-\uffff]+|\s+/gu)||[];
      let current='';
      tokens.forEach(token=>{
        if(textWidth(context,current+token,letterSpacing)<=maxWidth){current+=token;return;}
        if(current.trim()){output.push(current.trim());current='';}
        if(textWidth(context,token,letterSpacing)<=maxWidth){current=token.trimStart();return;}
        textParts(token).forEach(character=>{
          if(current&&textWidth(context,current+character,letterSpacing)>maxWidth){output.push(current);current='';}
          current+=character;
        });
      });
      if(current.trim())output.push(current.trim());
    });
    return output.length?output:[''];
  }

  function fitText(context,value,{width,height,maxSize,minSize=24,lineHeight=1.45,family=SERIF,maxLines=100,letterSpacing=0}){
    letterSpacing=Math.max(0,Math.min(12,Number(letterSpacing)||0));
    if('letterSpacing' in context)context.letterSpacing=letterSpacing+'px';
    let size=maxSize;
    let lines=[];
    while(size>=minSize){
      context.font=`${size}px ${family}`;
      lines=wrapText(context,value,width,letterSpacing);
      if(lines.length<=maxLines&&lines.length*size*lineHeight<=height)break;
      size-=2;
    }
    size=Math.max(minSize,size);
    context.font=`${size}px ${family}`;
    lines=wrapText(context,value,width,letterSpacing);
    const limit=Math.max(1,Math.min(maxLines,Math.floor(height/(size*lineHeight))));
    if(lines.length>limit){
      lines=lines.slice(0,limit);
      let last=lines[limit-1];
      while(last&&textWidth(context,last+'…',letterSpacing)>width)last=textParts(last).slice(0,-1).join('');
      lines[limit-1]=last+'…';
    }
    return {lines,size,lineHeight:size*lineHeight,height:lines.length*size*lineHeight,letterSpacing};
  }

  function drawText(context,layout,left,top,{color,align='left',family=SERIF,weight=''}){
    context.fillStyle=color;
    context.textAlign=align;
    context.textBaseline='top';
    context.font=`${weight?weight+' ':''}${layout.size}px ${family}`;
    if('letterSpacing' in context)context.letterSpacing=layout.letterSpacing+'px';
    layout.lines.forEach((line,index)=>{
      const lineTop=top+index*layout.lineHeight;
      if(!layout.letterSpacing||'letterSpacing' in context){context.fillText(line,left,lineTop);return;}
      let cursor=left-(align==='center'?textWidth(context,line,layout.letterSpacing)/2:0);
      context.textAlign='left';
      textParts(line).forEach(part=>{
        context.fillText(part,cursor,lineTop);
        cursor+=context.measureText(part).width+layout.letterSpacing;
      });
    });
  }

  function drawBrand(context,color,top=1740){
    context.fillStyle=color;
    context.font=`23px ${SANS}`;
    context.textAlign='center';
    context.textBaseline='top';
    context.fillText('CECP Music Library',WIDTH/2,top);
  }

  function drawLyrics(context,{song,lines,cover,background,align,font,fontSize,lineHeight,letterSpacing}){
    const dark=background==='night'||background==='album';
    const foreground=dark?'#f8f4e9':'#30343b';
    const secondary=dark?'rgba(248,244,233,.64)':'rgba(48,52,59,.62)';
    const text=(Array.isArray(lines)?lines.join('\n'):String(lines||'')).trim()||song.title||'让诗歌，陪伴每一天';
    const family=font.family;
    const maxSize=Math.max(44,Math.min(110,Number(fontSize)||78));
    const spacing=Math.max(1.2,Math.min(2,Number(lineHeight)||1.5));
    const layout=fitText(context,text.slice(0,1400),{width:824,height:800,maxSize,minSize:24,lineHeight:spacing,family,letterSpacing});
    const left=align==='center'?WIDTH/2:128;
    const top=330+(800-layout.height)*.4;
    drawText(context,layout,left,top,{color:foreground,align,family});
    const dividerTop=Math.min(1240,Math.max(1110,top+layout.height+105));
    context.fillStyle=secondary;
    context.fillRect(align==='center'?514:128,dividerTop,52,2);
    const title=fitText(context,song.title,{width:824,height:100,maxSize:34,minSize:24,lineHeight:1.35,maxLines:2,family:SANS});
    drawText(context,title,left,dividerTop+48,{color:secondary,align,family:SANS});
    const artist=fitText(context,song.artist,{width:824,height:76,maxSize:28,minSize:22,lineHeight:1.35,maxLines:2,family:SANS});
    drawText(context,artist,left,dividerTop+58+title.height,{color:secondary,align,family:SANS});
    context.fillStyle=dark?'rgba(255,255,255,.07)':'rgba(255,255,255,.17)';
    rounded(context,102,1560,876,150,26);
    context.fill();
    coverImage(context,cover,122,1579,112,16);
    const footerTitle=fitText(context,song.title,{width:690,height:65,maxSize:31,minSize:23,lineHeight:1.15,maxLines:2,family:SANS});
    drawText(context,footerTitle,258,1590,{color:foreground,family:SANS});
    const footerArtist=fitText(context,song.artist,{width:690,height:37,maxSize:24,minSize:19,lineHeight:1.2,maxLines:1,family:SANS});
    drawText(context,footerArtist,258,1598+footerTitle.height,{color:secondary,family:SANS});
    drawBrand(context,secondary);
  }

  function drawControls(context){
    context.strokeStyle='rgba(255,255,255,.28)';
    context.lineWidth=4;
    context.lineCap='round';
    context.beginPath();
    context.moveTo(164,1430);
    context.lineTo(916,1430);
    context.stroke();
    context.strokeStyle='rgba(255,255,255,.9)';
    context.beginPath();
    context.moveTo(164,1430);
    context.lineTo(384,1430);
    context.stroke();
    context.fillStyle='#fff';
    context.beginPath();
    context.arc(384,1430,6,0,Math.PI*2);
    context.fill();
    [355,725].forEach((left,index)=>{
      const direction=index?1:-1;
      context.beginPath();
      context.moveTo(left+direction*18,1540);
      context.lineTo(left-direction*12,1520);
      context.lineTo(left-direction*12,1560);
      context.closePath();
      context.fill();
      context.fillRect(left+direction*22-3,1520,6,40);
    });
    context.fillRect(520,1514,12,52);
    context.fillRect(548,1514,12,52);
  }

  function drawAlbum(context,{song,cover,template,font,fontSize,lineHeight,letterSpacing}){
    const isPlayer=template==='player';
    const coverSize=isPlayer?792:690;
    const coverTop=isPlayer?300:375;
    context.save();
    context.shadowColor='rgba(0,0,0,.26)';
    context.shadowBlur=90;
    context.shadowOffsetY=26;
    rounded(context,(WIDTH-coverSize)/2,coverTop,coverSize,coverSize,32);
    context.fillStyle='rgba(0,0,0,.08)';
    context.fill();
    context.restore();
    coverImage(context,cover,(WIDTH-coverSize)/2,coverTop,coverSize,32);
    const family=font.family;
    const scale=Math.max(44,Math.min(110,Number(fontSize)||78))/78;
    const spacing=Math.max(1.2,Math.min(2,Number(lineHeight)||1.5))-.2;
    const title=fitText(context,song.title,{width:792,height:isPlayer?140:172,maxSize:(isPlayer?54:58)*scale,minSize:30,lineHeight:spacing,maxLines:isPlayer?2:3,family,letterSpacing});
    const titleTop=coverTop+coverSize+78;
    drawText(context,title,isPlayer?144:WIDTH/2,titleTop,{color:'#fff',align:isPlayer?'left':'center',family});
    const artist=fitText(context,song.artist,{width:792,height:85,maxSize:33,minSize:23,lineHeight:1.3,maxLines:2,family:SANS});
    drawText(context,artist,isPlayer?144:WIDTH/2,titleTop+title.height+22,{color:'rgba(255,255,255,.7)',align:isPlayer?'left':'center',family:SANS});
    if(isPlayer)drawControls(context);
    drawBrand(context,'rgba(255,255,255,.6)');
  }

  async function render(canvas,options={}){
    if(!canvas||typeof canvas.getContext!=='function')throw new Error('分享图片画布不可用');
    const supplied=options.song||{};
    const song={title:String(supplied.title||supplied.name||'未命名诗歌'),artist:String(supplied.displayArtist||supplied.artist||supplied.source||supplied.author||supplied.singer||'CECP Music Library')};
    const source=supplied.cover||supplied.coverUrl||supplied.cover_url||supplied.artwork||'';
    const mode=options.mode==='cover'?'cover':'lyrics';
    const font=fonts.find(item=>item.id===options.font)||fonts.find(item=>item.id===(mode==='cover'?'sans':'serif'));
    const fontReady=typeof document!=='undefined'&&document.fonts?document.fonts.ready.then(()=>true,()=>false):Promise.resolve(true);
    const [cover,fontsLoaded,selectedFontLoaded]=await Promise.all([loadCover(source),timeout(fontReady,2500,false),loadFont(font)]);
    canvas.width=WIDTH;
    canvas.height=HEIGHT;
    const context=canvas.getContext('2d');
    if(!context)throw new Error('此浏览器无法生成分享图片');
    context.imageSmoothingEnabled=true;
    context.imageSmoothingQuality='high';
    const background=backgrounds.some(item=>item.id===options.background)?options.background:'sunset';
    drawBackground(context,background,cover,mode==='cover');
    if(mode==='cover')drawAlbum(context,{song,cover,template:options.template,font,fontSize:options.fontSize,lineHeight:options.lineHeight,letterSpacing:options.letterSpacing});
    else drawLyrics(context,{song,cover,lines:options.lines,background,align:options.align==='center'?'center':'left',font,fontSize:options.fontSize,lineHeight:options.lineHeight,letterSpacing:options.letterSpacing});
    return {coverFailed:!!source&&!cover,fontFallback:!fontsLoaded||!selectedFontLoaded};
  }

  window.CECPStoryCard={render,backgrounds,fonts};
})();
