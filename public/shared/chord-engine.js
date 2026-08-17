/* ═══════════ CECP-CHORD-ENGINE v1 BEGIN ═══════════
   共享模块：和弦浏览器引擎（Chord Explorer）。
   点击歌词区 .p-chord 弹出底部面板：组成音 / 钢琴键盘 / 吉他把位 / 试听。

   本块在以下两个文件中逐字节相同（权威版本 = shared/chord-engine.js）：
     musiclib/musiclib.js / youth-engine.js
   修改流程：先改 shared/chord-engine.js，再同步两处，diff 校验一致。
   （本块不同步进 musictool.js，因此不受「块内禁止反斜杠」限制。）

   宿主依赖（两个宿主文件在本块之前的同一作用域内均已定义，逐字节同名）：
     parseKeyName(key)            -> {root,suf}
     needFlat(root,suf)           -> boolean（根据根音/大小调决定升降号拼写）
     trKeyName(key,st,useFlat)    -> 移调后的音名（宿主移调功能同款拼写规则）
     KEY_SET_SHARP                -> 12 个升号拼写音名表
   本引擎不自带任何升降号拼写规则，全部委托给以上宿主函数，
   保证弹出面板里的音名与移调功能显示的拼写完全一致。

   对外暴露：
     window.ChordEngine.open('G#m')     编程式打开面板
     window.ChordEngine.parseChord(sym) 解析和弦 -> ChordDefinition
     window.ChordEngine.getChord(sym)   解析 + 吉他把位（带缓存）
     <chord-explorer> / <chord-piano> / <chord-guitar-diagram> 自定义元素
   纯逻辑层（解析/乐理/把位/Store）不依赖 DOM，可在 Node 中单测。 */
var ChordEngine=(function(){
  'use strict';

  var VERSION='1.0.0';

  /* ───────────────────────── 常量 ─────────────────────────
     颜色不写死在绘图代码里：先读宿主 CSS 变量，读不到时用下面的回退色。
     语义色三档：root（根音，复用宿主 --accent）/ third（三音）/ ext（五音与延伸音）。 */
  var FALLBACK_LIGHT={
    bg:'#FFFDF9',bg2:'#F8F1E8',bg3:'#F3E8DC',
    text:'#241C17',text2:'#6F655D',text3:'#9A8F85',
    border:'#E9E0D8',borderMd:'rgba(87,63,45,.18)',
    accent:'#C76524',accentSoft:'#F8E7D8',
    third:'#3E6E9E',ext:'#5E8A55',
    keyWhite:'#FFFEFB',keyWhiteEdge:'#DCD2C6',keyBlack:'#2A2118'
  };
  var FALLBACK_DARK={
    bg:'#18201C',bg2:'#202A25',bg3:'#25312B',
    text:'#F5F1EA',text2:'#BCC4BF',text3:'#89948E',
    border:'rgba(255,255,255,.10)',borderMd:'rgba(255,255,255,.16)',
    accent:'#D77A38',accentSoft:'rgba(215,122,56,.20)',
    third:'#82AFD6',ext:'#96BE8C',
    keyWhite:'#EDE8DE',keyWhiteEdge:'#4A453C',keyBlack:'#12100C'
  };
  /* 吉他标准调弦（低音弦 -> 高音弦）的音级与 MIDI 音高 */
  var GUITAR_STRING_PC=[4,9,2,7,11,4];
  var GUITAR_STRING_MIDI=[40,45,50,55,59,64];
  /* 试听参数 */
  var STRUM_STAGGER_MS=48;      /* 吉他扫弦相邻弦触发间隔 */
  var PIANO_NOTE_SECONDS=1.9;   /* 钢琴音衰减时长 */
  var GUITAR_NOTE_SECONDS=1.5;  /* 吉他音衰减时长 */
  var FLASH_MS=420;             /* 按键/指法点按下反馈时长 */

  /* ───────────────────────── 极简 Store ─────────────────────────
     零依赖发布-订阅状态容器，供 <chord-explorer> 内部使用。 */

  /**
   * 创建一个极简 Store。
   * @param {Object} initialState 初始状态
   * @returns {{getState:function():Object, setState:function(Object):void, subscribe:function(Function):Function}}
   *   setState 做浅合并并通知订阅者；subscribe 返回取消订阅函数。
   */
  function createStore(initialState){
    var state=Object.assign({},initialState||{});
    var listeners=[];
    return {
      getState:function(){return state;},
      setState:function(partial){
        state=Object.assign({},state,partial||{});
        for(var i=0;i<listeners.length;i++){try{listeners[i](state);}catch(e){}}
      },
      subscribe:function(fn){
        listeners.push(fn);
        return function(){
          var i=listeners.indexOf(fn);
          if(i>=0)listeners.splice(i,1);
        };
      }
    };
  }

  /* ───────────────────────── 乐理层 ─────────────────────────
     宿主已有 trKeyName 等函数只处理「根音本身」的移调拼写；
     本层在其之上补充「由音程算出完整组成音列表」。 */

  /**
   * 求音名的音级（pitch class，0=C ... 11=B）。
   * 拼写委托宿主：先用 trKeyName 归一成升号拼写，再查 KEY_SET_SHARP。
   * @param {string} note 音名（如 'Ab'、'F#'）
   * @returns {number} 0~11；无法识别返回 -1
   */
  function pcOf(note){
    var parsed=parseKeyName(String(note||'').trim());
    var sharp=parseKeyName(trKeyName(parsed.root,0,false)).root;
    return KEY_SET_SHARP.indexOf(sharp);
  }

  /**
   * 根音整体的升降号偏好：
   * 写明升/降号的根音以用户看到的为准；自然音级根音沿用宿主 needFlat 规则。
   * @param {string} root 根音
   * @param {string} qualityId 性质 id（needFlat 靠它判断大小调）
   * @returns {boolean} true=偏好降号拼写
   */
  function rootPrefersFlat(root,qualityId){
    if(root.indexOf('b')>0)return true;
    if(root.indexOf('#')>0)return false;
    return needFlat(root,qualityId);
  }

  /**
   * 拼写某个组成音。
   * 降变度数（b3/b5/b7/b9…）强制降号、升变度数（#5/#9…）强制升号，
   * 自然度数跟随根音偏好——这样 C7 得到 Bb 而不是 A#，E 大三和弦得到 G#。
   * @param {string} root 根音
   * @param {number} interval 距根音的半音数
   * @param {string} degree 度数标签（'R'/'3'/'b7'/'#9'…）
   * @param {boolean} rootFlat 根音整体偏好
   * @returns {string} 音名
   */
  function spellChordTone(root,interval,degree,rootFlat){
    var flat=rootFlat;
    if(degree.indexOf('b')>=0)flat=true;
    else if(degree.indexOf('#')>=0)flat=false;
    return parseKeyName(trKeyName(root,interval,flat)).root;
  }

  /* 度数 -> 语义角色：root=根音 / third=三音（含挂留替代音）/ ext=五音与延伸音 */
  function degreeRole(degree){
    if(degree==='R')return 'root';
    if(degree==='3'||degree==='b3'||degree==='2'||degree==='4')return 'third';
    return 'ext';
  }

  /* ───────────────────────── 和弦性质表 ─────────────────────────
     [id, 英文名, 中文名, 音程(半音), 度数标签]。
     音程与度数一一对应；新增性质只需加一行，解析器无需改动。 */
  var QUALITY_ROWS=[
    ['','Major','大三和弦',[0,4,7],['R','3','5']],
    ['m','Minor','小三和弦',[0,3,7],['R','b3','5']],
    ['5','Power Chord','五度和弦',[0,7],['R','5']],
    ['6','Major 6th','大六和弦',[0,4,7,9],['R','3','5','6']],
    ['m6','Minor 6th','小六和弦',[0,3,7,9],['R','b3','5','6']],
    ['69','6/9','六九和弦',[0,4,7,9,14],['R','3','5','6','9']],
    ['7','Dominant 7th','属七和弦',[0,4,7,10],['R','3','5','b7']],
    ['maj7','Major 7th','大七和弦',[0,4,7,11],['R','3','5','7']],
    ['m7','Minor 7th','小七和弦',[0,3,7,10],['R','b3','5','b7']],
    ['mMaj7','Minor-Major 7th','小大七和弦',[0,3,7,11],['R','b3','5','7']],
    ['9','Dominant 9th','属九和弦',[0,4,7,10,14],['R','3','5','b7','9']],
    ['11','Dominant 11th','属十一和弦',[0,4,7,10,14,17],['R','3','5','b7','9','11']],
    ['13','Dominant 13th','属十三和弦',[0,4,7,10,14,21],['R','3','5','b7','9','13']],
    ['sus2','Suspended 2nd','挂二和弦',[0,2,7],['R','2','5']],
    ['sus4','Suspended 4th','挂四和弦',[0,5,7],['R','4','5']],
    ['7sus4','7th Suspended 4th','属七挂四和弦',[0,5,7,10],['R','4','5','b7']],
    ['add9','Added 9th','加九和弦',[0,4,7,14],['R','3','5','9']],
    ['madd9','Minor Added 9th','小加九和弦',[0,3,7,14],['R','b3','5','9']],
    ['dim','Diminished','减三和弦',[0,3,6],['R','b3','b5']],
    ['dim7','Diminished 7th','减七和弦',[0,3,6,9],['R','b3','b5','bb7']],
    ['aug','Augmented','增三和弦',[0,4,8],['R','3','#5']],
    ['aug7','Augmented 7th','增属七和弦',[0,4,8,10],['R','3','#5','b7']],
    ['m7b5','Half-Diminished','半减七和弦',[0,3,6,10],['R','b3','b5','b7']],
    ['7b5','Dominant 7th flat 5','属七降五和弦',[0,4,6,10],['R','3','b5','b7']],
    ['7#9','Dominant 7th sharp 9','属七升九和弦',[0,4,7,10,15],['R','3','5','b7','#9']],
    ['7b9','Dominant 7th flat 9','属七降九和弦',[0,4,7,10,13],['R','3','5','b7','b9']],
    ['maj9','Major 9th','大九和弦',[0,4,7,11,14],['R','3','5','7','9']],
    ['m9','Minor 9th','小九和弦',[0,3,7,10,14],['R','b3','5','b7','9']],
    ['maj13','Major 13th','大十三和弦',[0,4,7,11,14,21],['R','3','5','7','9','13']],
    ['m11','Minor 11th','小十一和弦',[0,3,7,10,14,17],['R','b3','5','b7','9','11']]
  ];
  var QUALITIES={};
  (function(){
    for(var i=0;i<QUALITY_ROWS.length;i++){
      var r=QUALITY_ROWS[i];
      QUALITIES[r[0]]={id:r[0],name:r[1],zh:r[2],intervals:r[3],degrees:r[4]};
    }
  })();

  /* 后缀别名 -> 性质 id。大小写敏感（'M'=大，'m'=小）。 */
  var SUFFIX_ALIASES={
    '':'','maj':'','M':'','major':'',
    'm':'m','min':'m','-':'m','minor':'m',
    '5':'5',
    '6':'6','maj6':'6','M6':'6',
    'm6':'m6','min6':'m6','-6':'m6',
    '69':'69','6/9':'69','6add9':'69',
    '7':'7','dom7':'7',
    'maj7':'maj7','M7':'maj7','Maj7':'maj7','ma7':'maj7','MA7':'maj7',
    'm7':'m7','min7':'m7','-7':'m7',
    'mMaj7':'mMaj7','mmaj7':'mMaj7','mM7':'mMaj7','minmaj7':'mMaj7','mMAJ7':'mMaj7','-maj7':'mMaj7',
    '9':'9','maj9':'maj9','M9':'maj9','m9':'m9','min9':'m9',
    '11':'11','m11':'m11','min11':'m11',
    '13':'13','maj13':'maj13','M13':'maj13',
    'sus':'sus4','sus4':'sus4','sus2':'sus2',
    '7sus4':'7sus4','7sus':'7sus4',
    '2':'add9','add2':'add9','add9':'add9',
    'madd9':'madd9','madd2':'madd9',
    'dim':'dim','o':'dim','°':'dim',
    'dim7':'dim7','o7':'dim7','°7':'dim7',
    'aug':'aug','+':'aug',
    'aug7':'aug7','7#5':'aug7','7+5':'aug7','+7':'aug7',
    'm7b5':'m7b5','ø':'m7b5','ø7':'m7b5','m7-5':'m7b5','min7b5':'m7b5',
    '7b5':'7b5','7-5':'7b5',
    '7#9':'7#9','7+9':'7#9',
    '7b9':'7b9','7-9':'7b9'
  };

  /* ───────────────────────── 解析器 ─────────────────────────
     思路：符号拆成「根音 + 性质后缀 + 斜杠低音」三段；
     后缀经别名表归一到性质 id，性质映射到一组音程；
     再由根音 + 音程 + 宿主拼写函数得到组成音。 */

  var NOTE_ONLY_RE=/^[A-G](?:#|b)?$/;
  var ROOT_SPLIT_RE=/^([A-G](?:#|b)?)(.*)$/;

  /** 清洗和弦文本：统一 ♯/♭ 全角字符、去掉排版占位空白（NBSP/全角空格/谚文填充符）。 */
  function cleanChordText(text){
    return String(text||'')
      .replace(/[♯＃]/g,'#')
      .replace(/♭/g,'b')
      .replace(/[ 　ㅤ]/g,' ')
      .trim();
  }

  /**
   * 解析和弦符号。
   * @param {string} symbol 和弦符号（如 'G#m'、'D/F#'、'Bb13'、'Cmaj7'）
   * @returns {?ChordDefinition} 解析失败返回 null（不抛异常，便于点击时静默忽略非和弦文本）
   *
   * ChordDefinition 结构：
   *   input        原始输入
   *   symbol       归一化符号（根音+性质id[+/低音]）
   *   root/bass    根音 / 斜杠低音（无低音为 null）
   *   rootPc/bassPc 音级
   *   quality      {id,name,zh,intervals,degrees}
   *   notes        [{name,degree,role,pc,midi}] 组成音（不含低音）
   *   bassNote     低音 {name,pc,midi} 或 null
   *   pianoMidis   钢琴试听/高亮用 MIDI 列表（低音在最前）
   */
  function parseChord(symbol){
    var raw=cleanChordText(symbol);
    if(!raw)return null;
    /* 取第一个空白前的记号（歌谱里可能带尾随占位空格） */
    raw=raw.split(/\s+/)[0];
    var m=raw.match(ROOT_SPLIT_RE);
    if(!m)return null;
    var root=m[1],rest=m[2]||'';
    /* 斜杠低音：只有 '/' 后是纯音名才算（避免把 6/9 当低音） */
    var bass=null;
    var slash=rest.lastIndexOf('/');
    if(slash>=0){
      var after=rest.slice(slash+1);
      if(NOTE_ONLY_RE.test(after)){bass=after;rest=rest.slice(0,slash);}
    }
    /* 后缀归一：去掉括号（如 7(#9) -> 7#9），查别名表 */
    var suffix=rest.replace(/[()]/g,'').trim();
    var qid=Object.prototype.hasOwnProperty.call(SUFFIX_ALIASES,suffix)?SUFFIX_ALIASES[suffix]:null;
    if(qid===null)return null;
    var quality=QUALITIES[qid];
    var rootPc=pcOf(root);
    if(rootPc<0)return null;
    var bassPc=bass!==null?pcOf(bass):-1;
    if(bass!==null&&bassPc<0)bass=null;
    var rootFlat=rootPrefersFlat(root,qid);
    /* 根音落在 C3~B4 之间：高根音降一个八度，避免延伸和弦爬得太高 */
    var rootMidi=(rootPc>=8?48:60)+rootPc;
    var notes=[];
    for(var i=0;i<quality.intervals.length;i++){
      var iv=quality.intervals[i],deg=quality.degrees[i];
      /* 根音永远保持用户看到的拼写，其余组成音按度数规则拼写 */
      var name=i===0?parseKeyName(root).root:spellChordTone(root,iv,deg,rootFlat);
      notes.push({name:name,degree:deg,role:degreeRole(deg),pc:(rootPc+iv)%12,midi:rootMidi+iv});
    }
    var bassNote=null;
    if(bass!==null&&bassPc!==rootPc){
      /* 低音放在根音下方一个八度以内 */
      bassNote={name:parseKeyName(bass).root,pc:bassPc,midi:rootMidi+((bassPc-rootPc+12)%12)-12};
    }
    var pianoMidis=(bassNote?[bassNote.midi]:[]).concat(notes.map(function(n){return n.midi;}));
    return {
      input:String(symbol||''),
      symbol:parseKeyName(root).root+qid+(bassNote?'/'+bassNote.name:''),
      root:parseKeyName(root).root,rootPc:rootPc,
      bass:bassNote?bassNote.name:null,bassPc:bassNote?bassPc:-1,
      quality:quality,useFlat:rootFlat,
      notes:notes,bassNote:bassNote,pianoMidis:pianoMidis
    };
  }

  /* ───────────────────────── 吉他把位数据 ─────────────────────────
     数据以 JS 字面量内嵌（而非独立 JSON 请求）：
     本块会同步进两个部署路径不同的宿主，内嵌可避免跨宿主的 fetch 路径
     问题，并随宿主 JS 一起被 Service Worker 预缓存，天然离线可用。
     指法为常见标准按法（参考通行吉他和弦手册整理，非复制任何单一数据库）。

     两类数据：
     1. OPEN_VOICINGS：开放把位（含空弦，不可平移），key = `${pc}|${qualityId}`。
     2. MOVABLE_SHAPES：可平移把位（CAGED 型/横按型），按性质分组；
        rel 为相对品位（0 = 基准品），rootString 为根音所在弦（0=低音E弦），
        rootRel 为根音在型内的相对品位；实际品位 = rel + baseFret。
     frets/fingers 均为低音弦->高音弦；fret -1=闷音(x)，0=空弦(o)；finger 0=空弦/不按。 */

  var OPEN_VOICINGS={
    '0|':[{frets:[-1,3,2,0,1,0],fingers:[0,3,2,0,1,0],caged:'C'}],
    '9|':[{frets:[-1,0,2,2,2,0],fingers:[0,0,1,2,3,0],caged:'A'}],
    '7|':[{frets:[3,2,0,0,0,3],fingers:[2,1,0,0,0,3],caged:'G'}],
    '4|':[{frets:[0,2,2,1,0,0],fingers:[0,2,3,1,0,0],caged:'E'}],
    '2|':[{frets:[-1,-1,0,2,3,2],fingers:[0,0,0,1,3,2],caged:'D'}],
    '9|m':[{frets:[-1,0,2,2,1,0],fingers:[0,0,2,3,1,0],caged:'Am'}],
    '4|m':[{frets:[0,2,2,0,0,0],fingers:[0,2,3,0,0,0],caged:'Em'}],
    '2|m':[{frets:[-1,-1,0,2,3,1],fingers:[0,0,0,2,3,1],caged:'Dm'}],
    '9|7':[{frets:[-1,0,2,0,2,0],fingers:[0,0,2,0,3,0]}],
    '11|7':[{frets:[-1,2,1,2,0,2],fingers:[0,2,1,3,0,4]}],
    '0|7':[{frets:[-1,3,2,3,1,0],fingers:[0,3,2,4,1,0]}],
    '2|7':[{frets:[-1,-1,0,2,1,2],fingers:[0,0,0,2,1,3]}],
    '4|7':[{frets:[0,2,0,1,0,0],fingers:[0,2,0,1,0,0]}],
    '7|7':[{frets:[3,2,0,0,0,1],fingers:[3,2,0,0,0,1]}],
    '9|m7':[{frets:[-1,0,2,0,1,0],fingers:[0,0,2,0,1,0]}],
    '4|m7':[{frets:[0,2,0,0,0,0],fingers:[0,2,0,0,0,0]}],
    '2|m7':[{frets:[-1,-1,0,2,1,1],fingers:[0,0,0,2,1,1],barre:{fret:1,from:4,to:5}}],
    '0|maj7':[{frets:[-1,3,2,0,0,0],fingers:[0,3,2,0,0,0]}],
    '9|maj7':[{frets:[-1,0,2,1,2,0],fingers:[0,0,2,1,3,0]}],
    '2|maj7':[{frets:[-1,-1,0,2,2,2],fingers:[0,0,0,1,2,3]}],
    '5|maj7':[{frets:[-1,-1,3,2,1,0],fingers:[0,0,3,2,1,0]}],
    '7|maj7':[{frets:[3,2,0,0,0,2],fingers:[2,1,0,0,0,3]}],
    '9|sus2':[{frets:[-1,0,2,2,0,0],fingers:[0,0,1,2,0,0]}],
    '2|sus2':[{frets:[-1,-1,0,2,3,0],fingers:[0,0,0,1,3,0]}],
    '9|sus4':[{frets:[-1,0,2,2,3,0],fingers:[0,0,1,2,3,0]}],
    '2|sus4':[{frets:[-1,-1,0,2,3,3],fingers:[0,0,0,1,3,4]}],
    '4|sus4':[{frets:[0,2,2,2,0,0],fingers:[0,2,3,4,0,0]}],
    '0|add9':[{frets:[-1,3,2,0,3,0],fingers:[0,2,1,0,3,0]}]
  };

  /* 常见斜杠和弦的专用开放把位，key = `${rootPc}|${qualityId}|${bassPc}` */
  var SLASH_OPEN_VOICINGS={
    '2||6':[{frets:[2,-1,0,2,3,2],fingers:[1,0,0,2,4,3]}],   /* D/F# */
    '7||11':[{frets:[-1,2,0,0,3,3],fingers:[0,1,0,0,3,4]}],  /* G/B  */
    '0||7':[{frets:[3,3,2,0,1,0],fingers:[3,4,2,0,1,0]}],    /* C/G  */
    '0||4':[{frets:[0,3,2,0,1,0],fingers:[0,3,2,0,1,0]}],    /* C/E  */
    '2||9':[{frets:[-1,0,0,2,3,2],fingers:[0,0,0,1,3,2]}],   /* D/A  */
    '9|m|7':[{frets:[3,0,2,2,1,0],fingers:[4,0,2,3,1,0]}]    /* Am/G */
  };

  var MOVABLE_SHAPES={
    '':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,2,2,1,0,0],fingers:[1,3,4,2,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,2,2,0],fingers:[0,1,2,3,4,1],barre:{rel:0,from:1,to:5}},
      {caged:'D',rootString:2,rootRel:0,rel:[-1,-1,0,2,3,2],fingers:[0,0,1,2,4,3]}
    ],
    'm':[
      {caged:'Em',rootString:0,rootRel:0,rel:[0,2,2,0,0,0],fingers:[1,3,4,1,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'Am',rootString:1,rootRel:0,rel:[-1,0,2,2,1,0],fingers:[0,1,3,4,2,1],barre:{rel:0,from:1,to:5}},
      {caged:'Dm',rootString:2,rootRel:0,rel:[-1,-1,0,2,3,1],fingers:[0,0,1,3,4,2]}
    ],
    '7':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,2,0,1,0,0],fingers:[1,3,1,2,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,0,2,0],fingers:[0,1,3,1,4,1],barre:{rel:0,from:1,to:5}}
    ],
    'm7':[
      {caged:'Em',rootString:0,rootRel:0,rel:[0,2,0,0,0,0],fingers:[1,3,1,1,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'Am',rootString:1,rootRel:0,rel:[-1,0,2,0,1,0],fingers:[0,1,3,1,2,1],barre:{rel:0,from:1,to:5}}
    ],
    'maj7':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,-1,1,1,0,-1],fingers:[2,0,3,4,1,0]},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,1,2,0],fingers:[0,1,3,2,4,1],barre:{rel:0,from:1,to:5}}
    ],
    'mMaj7':[
      {caged:'Am',rootString:1,rootRel:0,rel:[-1,0,2,1,1,0],fingers:[0,1,4,2,3,1],barre:{rel:0,from:1,to:5}}
    ],
    '6':[
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,2,2,2],fingers:[0,1,3,3,3,3],barre:{rel:2,from:2,to:5}}
    ],
    'm6':[
      {caged:'Em',rootString:0,rootRel:0,rel:[0,2,2,0,2,0],fingers:[1,3,4,1,2,1],barre:{rel:0,from:0,to:5}}
    ],
    '69':[
      {rootString:1,rootRel:1,rel:[-1,1,0,0,1,1],fingers:[0,2,1,1,3,4],barre:{rel:0,from:2,to:3}}
    ],
    '9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,1,1,1],fingers:[0,2,1,3,3,3],barre:{rel:1,from:3,to:5}}
    ],
    'm9':[
      {rootString:1,rootRel:2,rel:[-1,2,0,2,2,-1],fingers:[0,2,1,3,4,0]}
    ],
    'maj9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,2,1,-1],fingers:[0,2,1,4,3,0]}
    ],
    'add9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,-1,1,1],fingers:[0,2,1,0,3,4]}
    ],
    'sus2':[
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,2,0,0],fingers:[0,1,3,4,1,1],barre:{rel:0,from:1,to:5}}
    ],
    'sus4':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,2,2,2,0,0],fingers:[1,2,3,4,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,2,3,0],fingers:[0,1,2,3,4,1],barre:{rel:0,from:1,to:5}}
    ],
    '7sus4':[
      {caged:'E',rootString:0,rootRel:0,rel:[0,2,0,2,0,0],fingers:[1,3,1,4,1,1],barre:{rel:0,from:0,to:5}},
      {caged:'A',rootString:1,rootRel:0,rel:[-1,0,2,0,3,0],fingers:[0,1,3,1,4,1],barre:{rel:0,from:1,to:5}}
    ],
    'dim':[
      {rootString:1,rootRel:0,rel:[-1,0,1,2,1,-1],fingers:[0,1,2,4,3,0]}
    ],
    'dim7':[
      {rootString:2,rootRel:0,rel:[-1,-1,0,1,0,1],fingers:[0,0,1,3,2,4]}
    ],
    'aug':[
      {rootString:1,rootRel:2,rel:[-1,2,1,0,0,-1],fingers:[0,4,3,1,1,0],barre:{rel:0,from:3,to:4}}
    ],
    'aug7':[
      {rootString:0,rootRel:0,rel:[0,-1,0,1,1,-1],fingers:[1,0,2,3,4,0]}
    ],
    'm7b5':[
      {rootString:1,rootRel:0,rel:[-1,0,1,0,1,-1],fingers:[0,1,2,1,3,0],barre:{rel:0,from:1,to:3}},
      {rootString:0,rootRel:1,rel:[1,-1,1,1,0,-1],fingers:[2,0,3,4,1,0]}
    ],
    '7b5':[
      {rootString:0,rootRel:0,rel:[0,1,0,1,-1,-1],fingers:[1,2,1,3,0,0],barre:{rel:0,from:0,to:2}}
    ],
    '7#9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,1,2,-1],fingers:[0,2,1,3,4,0]}
    ],
    '7b9':[
      {rootString:1,rootRel:1,rel:[-1,1,0,1,0,-1],fingers:[0,2,1,3,1,0],barre:{rel:0,from:2,to:4}}
    ],
    '13':[
      {rootString:0,rootRel:0,rel:[0,-1,0,1,2,2],fingers:[1,0,1,2,3,4],barre:{rel:0,from:0,to:2}}
    ],
    'm11':[
      {rootString:0,rootRel:0,rel:[0,0,0,0,0,0],fingers:[1,1,1,1,1,1],barre:{rel:0,from:0,to:5}}
    ],
    '5':[
      {rootString:0,rootRel:0,rel:[0,2,2,-1,-1,-1],fingers:[1,3,4,0,0,0]},
      {rootString:1,rootRel:0,rel:[-1,0,2,2,-1,-1],fingers:[0,1,3,4,0,0]}
    ]
  };

  /** 把位的展示起始品：低把位从 1 品画起（带琴枕），高把位从最低按品画起。 */
  function displayBaseFret(frets){
    var maxF=0,minPos=99;
    for(var i=0;i<6;i++){
      if(frets[i]>0){if(frets[i]>maxF)maxF=frets[i];if(frets[i]<minPos)minPos=frets[i];}
    }
    if(maxF<=4)return 1;
    return minPos===99?1:minPos;
  }

  /** 把位对象收尾：补 baseFret/label/root 标记，供绘图与试听使用。 */
  function finishPosition(pos,rootPc){
    pos.baseFret=displayBaseFret(pos.frets);
    pos.rootPc=rootPc;
    /* 试听用 MIDI（低音弦 -> 高音弦，跳过闷音） */
    pos.midis=[];
    for(var i=0;i<6;i++){
      if(pos.frets[i]>=0)pos.midis.push(GUITAR_STRING_MIDI[i]+pos.frets[i]);
    }
    if(!pos.label){
      /* 开放把位 / CAGED 型名；两者都没有时留空，由 UI 只显示品位号 */
      pos.label=pos.open?'开放把位':(pos.caged?pos.caged+' 型':'');
    }
    return pos;
  }

  /**
   * 计算某根音+性质的吉他把位列表。
   * 开放把位优先，其余按基准品从低到高排列，最多返回 4 个。
   * @param {number} rootPc 根音音级
   * @param {string} qualityId 性质 id
   * @param {number} [bassPc] 斜杠低音音级（命中专用开放把位时优先返回）
   * @returns {Array<Object>} 把位数组（可能为空：该性质暂未收录吉他按法）
   */
  function guitarPositionsFor(rootPc,qualityId,bassPc){
    var out=[],seen={};
    function push(p){
      var sig=p.frets.join(',');
      if(seen[sig])return;
      seen[sig]=1;
      out.push(finishPosition(p,rootPc));
    }
    /* 1. 斜杠和弦专用开放把位 */
    if(bassPc!==undefined&&bassPc>=0){
      var sk=rootPc+'|'+qualityId+'|'+bassPc;
      var sv=SLASH_OPEN_VOICINGS[sk]||[];
      for(var s=0;s<sv.length;s++){
        push({frets:sv[s].frets.slice(),fingers:sv[s].fingers.slice(),barre:sv[s].barre||null,caged:sv[s].caged||'',open:true});
      }
    }
    /* 2. 开放把位 */
    var ov=OPEN_VOICINGS[rootPc+'|'+qualityId]||[];
    for(var o=0;o<ov.length;o++){
      push({frets:ov[o].frets.slice(),fingers:ov[o].fingers.slice(),barre:ov[o].barre||null,caged:ov[o].caged||'',open:true});
    }
    /* 3. 可平移把位：基准品 = 根音品位 - 型内根音相对品位（不足则升八度） */
    var shapes=MOVABLE_SHAPES[qualityId]||[];
    for(var i=0;i<shapes.length;i++){
      var sh=shapes[i];
      var f=(rootPc-GUITAR_STRING_PC[sh.rootString]+12)%12;
      var base=f-sh.rootRel;
      if(base<0)base+=12;
      var frets=[],fingers=[];
      for(var j=0;j<6;j++){
        if(sh.rel[j]<0){frets.push(-1);fingers.push(0);}
        else{
          var fr=sh.rel[j]+base;
          frets.push(fr);
          fingers.push(fr===0?0:sh.fingers[j]);
        }
      }
      var barre=null;
      if(sh.barre){
        var bf=sh.barre.rel+base;
        if(bf>0)barre={fret:bf,from:sh.barre.from,to:sh.barre.to};
      }
      push({frets:frets,fingers:fingers,barre:barre,caged:sh.caged||'',open:base===0});
    }
    out.sort(function(a,b){
      if(a.open!==b.open)return a.open?-1:1;
      return a.baseFret-b.baseFret;
    });
    return out.slice(0,4);
  }

  /* ───────────────────────── Repository ─────────────────────────
     统一入口：符号 -> {def, guitar}，Map 缓存避免重复解析/计算。 */
  var repoCache=new Map();

  /**
   * 读取和弦完整数据（解析结果 + 吉他把位），带缓存。
   * @param {string} symbol 和弦符号
   * @returns {?{def:Object, guitar:Array}} 解析失败返回 null
   */
  function getChord(symbol){
    var key=cleanChordText(symbol);
    if(!key)return null;
    if(repoCache.has(key))return repoCache.get(key);
    var def=parseChord(key);
    var entry=def?{def:def,guitar:guitarPositionsFor(def.rootPc,def.quality.id,def.bassPc)}:null;
    repoCache.set(key,entry);
    return entry;
  }

  /* ───────────────────────── 音频引擎（Web Audio 合成） ─────────────────────────
     MVP 用振荡器合成，零音频文件、天然离线、低延迟。
     接口化设计：将来可用同接口换成真实采样音色。 */
  var AudioEngine={
    _ctx:null,_master:null,
    /** 懒初始化 AudioContext（必须由用户手势触发的调用链进入）。 */
    _ensure:function(){
      if(typeof window==='undefined')return null;
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      if(!this._ctx){
        this._ctx=new AC();
        /* 压限器兜底，多音齐奏不削波 */
        this._master=this._ctx.createDynamicsCompressor();
        this._master.threshold.value=-16;
        this._master.connect(this._ctx.destination);
      }
      if(this._ctx.state==='suspended'){try{this._ctx.resume();}catch(e){}}
      return this._ctx;
    },
    _midiFreq:function(m){return 440*Math.pow(2,(m-69)/12);},
    /** 单音合成：双振荡器 + 低通 + 指数衰减包络。timbre: 'piano'|'guitar' */
    _voice:function(midi,when,timbre){
      var ctx=this._ctx,freq=this._midiFreq(midi);
      var isG=timbre==='guitar';
      var dur=isG?GUITAR_NOTE_SECONDS:PIANO_NOTE_SECONDS;
      var lp=ctx.createBiquadFilter();
      lp.type='lowpass';
      lp.frequency.value=isG?2300:3800;
      lp.Q.value=0.6;
      var gain=ctx.createGain();
      gain.gain.setValueAtTime(0.0001,when);
      gain.gain.linearRampToValueAtTime(isG?0.30:0.26,when+0.006);
      gain.gain.exponentialRampToValueAtTime(0.0008,when+dur);
      var o1=ctx.createOscillator();
      o1.type=isG?'sawtooth':'triangle';
      o1.frequency.value=freq;
      var o2=ctx.createOscillator();
      o2.type=isG?'triangle':'sine';
      o2.frequency.value=freq*(isG?1:2);
      o2.detune.value=isG?4:2;
      var g2=ctx.createGain();
      g2.gain.value=isG?0.5:0.35;
      o1.connect(lp);o2.connect(g2);g2.connect(lp);
      lp.connect(gain);gain.connect(this._master);
      o1.start(when);o2.start(when);
      o1.stop(when+dur+0.05);o2.stop(when+dur+0.05);
    },
    /**
     * 钢琴式播放：组成音同时触发。
     * @param {number[]} midis MIDI 音高列表
     * @returns {boolean} 环境不支持 Web Audio 时返回 false
     */
    playChord:function(midis){
      var ctx=this._ensure();
      if(!ctx||!midis||!midis.length)return false;
      var t=ctx.currentTime+0.02;
      for(var i=0;i<midis.length;i++)this._voice(midis[i],t,'piano');
      return true;
    },
    /**
     * 吉他扫弦：各弦按 STRUM_STAGGER_MS 间隔依次触发。
     * @param {number[]} midis 低音弦->高音弦的 MIDI 列表
     * @returns {number[]} 各音相对触发延时（ms），供 UI 同步动画；不支持时返回 []
     */
    strumGuitar:function(midis){
      var ctx=this._ensure();
      if(!ctx||!midis||!midis.length)return [];
      var t=ctx.currentTime+0.02,delays=[];
      for(var i=0;i<midis.length;i++){
        this._voice(midis[i],t+i*STRUM_STAGGER_MS/1000,'guitar');
        delays.push(i*STRUM_STAGGER_MS);
      }
      return delays;
    }
  };

  /* 对外 API（DOM 相关的 open/close 在下方 DOM 段里再挂上） */
  var API={
    version:VERSION,
    parseChord:parseChord,
    getChord:getChord,
    guitarPositionsFor:guitarPositionsFor,
    cleanChordText:cleanChordText,
    createStore:createStore,
    audio:AudioEngine,
    qualities:QUALITIES,
    open:function(){},
    close:function(){}
  };

  /* ═════════════════ 以下为 DOM/UI 段，Node 单测环境自动跳过 ═════════════════ */
  if(typeof window!=='undefined'&&typeof document!=='undefined'&&typeof customElements!=='undefined'){

    /* ── 主题工具：宿主 CSS 变量 -> 引擎内部 --ce-* 变量 ──
       宿主的主题变量定义在 #music-library 上（不在 :root），
       而面板挂在 body 下，无法靠继承拿到，因此在打开时把
       计算值复制到组件宿主元素上；读不到时按明暗回退。 */
    function isDarkTheme(){
      var attr=document.documentElement.getAttribute('data-resolved-theme');
      if(attr==='dark')return true;
      if(attr==='light')return false;
      return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    /* [引擎变量名, 宿主候选变量, 回退键] */
    var THEME_VAR_MAP=[
      ['--ce-bg',['--surface','--bg2'],'bg'],
      ['--ce-bg2',['--surface-secondary','--bg3'],'bg2'],
      ['--ce-bg3',['--surface-hover'],'bg3'],
      ['--ce-text',['--text-primary','--text'],'text'],
      ['--ce-text2',['--text-secondary','--text2'],'text2'],
      ['--ce-text3',['--text-muted','--text3'],'text3'],
      ['--ce-border',['--divider','--border'],'border'],
      ['--ce-border-md',['--border-md'],'borderMd'],
      ['--ce-accent',['--accent'],'accent'],
      ['--ce-accent-soft',['--accent-soft','--accent-light'],'accentSoft'],
      ['--ce-third',['--chord-third'],'third'],
      ['--ce-ext',['--chord-tension'],'ext']
    ];
    /**
     * 把宿主主题变量同步到元素（内联 --ce-*），主题切换/打开面板时调用。
     * @param {HTMLElement} host 目标元素（通常是 <chord-explorer>）
     */
    function syncThemeVars(host){
      var src=document.getElementById('music-library')||document.body;
      var cs=src?getComputedStyle(src):null;
      var fb=isDarkTheme()?FALLBACK_DARK:FALLBACK_LIGHT;
      for(var i=0;i<THEME_VAR_MAP.length;i++){
        var row=THEME_VAR_MAP[i],val='';
        for(var j=0;j<row[1].length&&!val;j++){
          if(cs)val=cs.getPropertyValue(row[1][j]).trim();
        }
        host.style.setProperty(row[0],val||fb[row[2]]);
      }
    }
    /** 组件内读取绘图色：优先 --ce-* 变量（含继承），否则按明暗回退。 */
    function paintColors(el){
      var cs=getComputedStyle(el);
      var fb=isDarkTheme()?FALLBACK_DARK:FALLBACK_LIGHT;
      function v(name,fbKey){var x=cs.getPropertyValue(name).trim();return x||fb[fbKey];}
      return {
        bg:v('--ce-bg','bg'),bg2:v('--ce-bg2','bg2'),
        text:v('--ce-text','text'),text2:v('--ce-text2','text2'),text3:v('--ce-text3','text3'),
        border:v('--ce-border','border'),borderMd:v('--ce-border-md','borderMd'),
        root:v('--ce-accent','accent'),third:v('--ce-third','third'),ext:v('--ce-ext','ext'),
        keyWhite:fb.keyWhite,keyWhiteEdge:fb.keyWhiteEdge,keyBlack:fb.keyBlack
      };
    }
    function roleColor(colors,role){
      return role==='root'?colors.root:(role==='third'?colors.third:colors.ext);
    }
    /** Canvas 通用：按容器宽度与 DPR 设定物理尺寸，返回 2D 上下文。 */
    function setupCanvas(canvas,cssW,cssH){
      var dpr=window.devicePixelRatio||1;
      canvas.width=Math.max(1,Math.round(cssW*dpr));
      canvas.height=Math.max(1,Math.round(cssH*dpr));
      canvas.style.width=cssW+'px';
      canvas.style.height=cssH+'px';
      var ctx=canvas.getContext('2d');
      ctx.setTransform(dpr,0,0,dpr,0,0);
      return ctx;
    }
    function roundRect(ctx,x,y,w,h,r){
      var rr=Math.min(r,w/2,h/2);
      ctx.beginPath();
      ctx.moveTo(x+rr,y);
      ctx.arcTo(x+w,y,x+w,y+h,rr);
      ctx.arcTo(x+w,y+h,x,y+h,rr);
      ctx.arcTo(x,y+h,x,y,rr);
      ctx.arcTo(x,y,x+w,y,rr);
      ctx.closePath();
    }
    /** 宿主主题切换（html[data-resolved-theme] 变化）时重绘：组件独立使用时也能跟随主题。 */
    function observeTheme(el,redraw){
      if(typeof MutationObserver==='undefined')return null;
      var mo=new MutationObserver(redraw);
      mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-resolved-theme','data-theme']});
      return mo;
    }

    var WHITE_PCS=[0,2,4,5,7,9,11];

    /* ────────────── <chord-piano>：Canvas 手绘钢琴键盘 ────────────── */
    /**
     * 钢琴键盘组件。用法：
     *   el.definition = ChordEngine.parseChord('G#m')   （或 setAttribute('chord','G#m')）
     *   el.flash(midis) 播放时按下反馈
     * 自动定位到覆盖和弦音的音区（含低音，至少两个完整八度）。
     */
    class ChordPianoEl extends HTMLElement{
      static get observedAttributes(){return ['chord'];}
      constructor(){
        super();
        this._def=null;
        this._pressed={};
        this._shadow=this.attachShadow({mode:'open'});
        this._shadow.innerHTML='<style>:host{display:block}canvas{display:block;width:100%}</style><canvas aria-hidden="true"></canvas>';
        this._canvas=this._shadow.querySelector('canvas');
        this._onResize=this._draw.bind(this);
      }
      connectedCallback(){
        if(typeof ResizeObserver!=='undefined'){
          this._ro=new ResizeObserver(this._onResize);
          this._ro.observe(this);
        }else{
          window.addEventListener('resize',this._onResize);
        }
        this._mo=observeTheme(this,this._onResize);
        this._draw();
      }
      disconnectedCallback(){
        if(this._ro){this._ro.disconnect();this._ro=null;}
        if(this._mo){this._mo.disconnect();this._mo=null;}
        window.removeEventListener('resize',this._onResize);
      }
      attributeChangedCallback(name,ov,nv){
        if(name==='chord')this.definition=parseChord(nv);
      }
      set definition(def){this._def=def;this._draw();}
      get definition(){return this._def;}
      /** 播放反馈：这批琴键短暂点亮。@param {number[]} midis */
      flash(midis){
        var self=this;
        for(var i=0;i<midis.length;i++)this._pressed[midis[i]]=1;
        this._draw();
        setTimeout(function(){self._pressed={};self._draw();},FLASH_MS);
      }
      /** 键盘音区窗口：整八度对齐，覆盖所有和弦音，至少两个八度。 */
      _window(){
        var midis=this._def?this._def.pianoMidis:[60,64,67];
        var lo=Math.min.apply(null,midis),hi=Math.max.apply(null,midis);
        var start=Math.floor(lo/12)*12;
        var end=Math.ceil((hi+1)/12)*12-1;
        while(end-start<23)end+=12;
        return {start:start,end:end};
      }
      _draw(){
        if(!this.isConnected)return;
        var w=this.clientWidth;
        if(w<40)return;
        var def=this._def,win=this._window();
        var colors=paintColors(this);
        /* 音名标注：pc -> {name,role} */
        var pcInfo={};
        if(def){
          for(var n=def.notes.length-1;n>=0;n--)pcInfo[def.notes[n].pc]={name:def.notes[n].name,role:def.notes[n].role};
          if(def.bassNote&&!pcInfo[def.bassNote.pc])pcInfo[def.bassNote.pc]={name:def.bassNote.name,role:'root'};
        }
        var inChord={};
        if(def)for(var q=0;q<def.pianoMidis.length;q++)inChord[def.pianoMidis[q]]=1;
        var whites=[];
        for(var m=win.start;m<=win.end;m++){
          if(WHITE_PCS.indexOf(m%12)>=0)whites.push(m);
        }
        var keyW=w/whites.length;
        var h=Math.max(96,Math.min(190,keyW*6.2));
        var ctx=setupCanvas(this._canvas,w,h);
        ctx.clearRect(0,0,w,h);
        /* 白键 */
        var xOf={};
        for(var i=0;i<whites.length;i++){
          var mw=whites[i],x=i*keyW;
          xOf[mw]=x;
          ctx.fillStyle=colors.keyWhite;
          roundRect(ctx,x+0.75,0,keyW-1.5,h,3);
          ctx.fill();
          ctx.strokeStyle=colors.keyWhiteEdge;
          ctx.lineWidth=1;
          ctx.stroke();
          if(inChord[mw]){
            var info=pcInfo[mw%12]||{};
            var c=roleColor(colors,this._pressed[mw]?'root':info.role||'ext');
            ctx.globalAlpha=this._pressed[mw]?0.34:0.16;
            ctx.fillStyle=roleColor(colors,info.role||'ext');
            roundRect(ctx,x+0.75,0,keyW-1.5,h,3);
            ctx.fill();
            ctx.globalAlpha=1;
            /* 键底音名药丸 */
            var r=Math.min(keyW*0.36,12);
            ctx.fillStyle=roleColor(colors,info.role||'ext');
            ctx.beginPath();
            ctx.arc(x+keyW/2,h-r-7,r,0,Math.PI*2);
            ctx.fill();
            ctx.fillStyle='#FFFFFF';
            ctx.font='600 '+Math.max(8,Math.min(11,r))+'px system-ui,sans-serif';
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText((pcInfo[mw%12]||{}).name||'',x+keyW/2,h-r-6.5);
          }
        }
        /* 黑键 */
        var bw=keyW*0.62,bh=h*0.62;
        for(var mb=win.start;mb<=win.end;mb++){
          if(WHITE_PCS.indexOf(mb%12)>=0)continue;
          var prevWhite=mb-1;
          if(xOf[prevWhite]===undefined)continue;
          var bx=xOf[prevWhite]+keyW-bw/2;
          ctx.fillStyle=colors.keyBlack;
          roundRect(ctx,bx,0,bw,bh,2.5);
          ctx.fill();
          if(inChord[mb]){
            var infoB=pcInfo[mb%12]||{};
            ctx.globalAlpha=this._pressed[mb]?0.55:0.35;
            ctx.fillStyle=roleColor(colors,infoB.role||'ext');
            roundRect(ctx,bx,0,bw,bh,2.5);
            ctx.fill();
            ctx.globalAlpha=1;
            var rb=Math.min(bw*0.44,10);
            ctx.fillStyle=roleColor(colors,infoB.role||'ext');
            ctx.beginPath();
            ctx.arc(bx+bw/2,bh-rb-5,rb,0,Math.PI*2);
            ctx.fill();
            ctx.fillStyle='#FFFFFF';
            ctx.font='600 '+Math.max(7,Math.min(10,rb))+'px system-ui,sans-serif';
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(infoB.name||'',bx+bw/2,bh-rb-4.5);
          }
        }
      }
    }
    if(!customElements.get('chord-piano'))customElements.define('chord-piano',ChordPianoEl);

    /* ────────────── <chord-guitar-diagram>：Canvas 手绘吉他指法图 ────────────── */
    /**
     * 吉他指法图组件。用法：
     *   el.setPosition(position)  （position 来自 getChord(...).guitar[i]）
     *   el.flashStrings(delays)   扫弦时逐弦点亮
     * 支持：按弦圆点(内含指法编号)、闷音 x、空弦 o、横按整条、根音标记、起始品位号。
     */
    class ChordGuitarEl extends HTMLElement{
      constructor(){
        super();
        this._pos=null;
        this._lit={};
        this._shadow=this.attachShadow({mode:'open'});
        this._shadow.innerHTML='<style>:host{display:block}canvas{display:block;width:100%}</style><canvas aria-hidden="true"></canvas>';
        this._canvas=this._shadow.querySelector('canvas');
        this._onResize=this._draw.bind(this);
      }
      connectedCallback(){
        if(typeof ResizeObserver!=='undefined'){
          this._ro=new ResizeObserver(this._onResize);
          this._ro.observe(this);
        }else{
          window.addEventListener('resize',this._onResize);
        }
        this._mo=observeTheme(this,this._onResize);
        this._draw();
      }
      disconnectedCallback(){
        if(this._ro){this._ro.disconnect();this._ro=null;}
        if(this._mo){this._mo.disconnect();this._mo=null;}
        window.removeEventListener('resize',this._onResize);
      }
      /** @param {Object} pos guitarPositionsFor 产出的把位对象 */
      setPosition(pos){this._pos=pos;this._draw();}
      /** 扫弦反馈：delays[i] 为第 i 根发声弦的延时（ms）。 */
      flashStrings(delays){
        var self=this,order=[];
        if(!this._pos)return;
        for(var i=0;i<6;i++)if(this._pos.frets[i]>=0)order.push(i);
        for(var k=0;k<order.length;k++){
          (function(stringIdx,delay){
            setTimeout(function(){
              self._lit[stringIdx]=1;self._draw();
              setTimeout(function(){delete self._lit[stringIdx];self._draw();},FLASH_MS);
            },delay);
          })(order[k],delays[k]||0);
        }
      }
      _draw(){
        if(!this.isConnected||!this._pos)return;
        var w=this.clientWidth;
        if(w<40)return;
        var pos=this._pos,colors=paintColors(this);
        var base=pos.baseFret;
        var maxRel=0;
        for(var i=0;i<6;i++)if(pos.frets[i]>0)maxRel=Math.max(maxRel,pos.frets[i]-base+1);
        var nFrets=Math.max(4,maxRel);
        /* 起始品位号需要的左侧留白：两位数品号（10 品以上）更宽，避免被画布裁切 */
        var padL=base>1?(base>=10?36:26):14,padR=10,padT=26,padB=12;
        var gridW=w-padL-padR;
        var fretH=Math.min(34,Math.max(22,gridW/4));
        var h=padT+fretH*nFrets+padB;
        var ctx=setupCanvas(this._canvas,w,h);
        ctx.clearRect(0,0,w,h);
        var sx=function(s){return padL+gridW*s/5;};
        var fy=function(f){return padT+fretH*f;};
        /* 品丝与弦 */
        ctx.strokeStyle=colors.border;
        ctx.lineWidth=1;
        for(var f=1;f<=nFrets;f++){
          ctx.beginPath();ctx.moveTo(sx(0),fy(f));ctx.lineTo(sx(5),fy(f));ctx.stroke();
        }
        for(var s=0;s<6;s++){
          ctx.strokeStyle=this._lit[s]?colors.root:colors.borderMd;
          ctx.lineWidth=this._lit[s]?2:1;
          ctx.beginPath();ctx.moveTo(sx(s),fy(0));ctx.lineTo(sx(s),fy(nFrets));ctx.stroke();
        }
        /* 琴枕（1 把位）或起始品位号 */
        if(base<=1){
          ctx.strokeStyle=colors.text;
          ctx.lineWidth=3;
          ctx.beginPath();ctx.moveTo(sx(0)-1,fy(0));ctx.lineTo(sx(5)+1,fy(0));ctx.stroke();
        }else{
          ctx.strokeStyle=colors.text2;
          ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(sx(0),fy(0));ctx.lineTo(sx(5),fy(0));ctx.stroke();
          ctx.fillStyle=colors.text2;
          ctx.font='600 11px system-ui,sans-serif';
          ctx.textAlign='right';ctx.textBaseline='middle';
          ctx.fillText(base+'品',padL-7,fy(0)+fretH/2);
        }
        /* 横按 */
        if(pos.barre){
          var bf=pos.barre.fret-base;
          if(bf>=0&&bf<nFrets){
            var by=fy(bf)+fretH/2;
            ctx.fillStyle=colors.text;
            ctx.globalAlpha=0.9;
            roundRect(ctx,sx(pos.barre.from)-7,by-6.5,sx(pos.barre.to)-sx(pos.barre.from)+14,13,6.5);
            ctx.fill();
            ctx.globalAlpha=1;
          }
        }
        /* 按弦点 / 空弦 / 闷音 */
        var dotR=Math.min(fretH*0.34,gridW/5*0.42);
        for(var st=0;st<6;st++){
          var fr=pos.frets[st];
          var topY=fy(0)-11;
          if(fr<0){
            /* 闷音 x */
            ctx.strokeStyle=colors.text3;
            ctx.lineWidth=1.6;
            ctx.beginPath();
            ctx.moveTo(sx(st)-4,topY-4);ctx.lineTo(sx(st)+4,topY+4);
            ctx.moveTo(sx(st)+4,topY-4);ctx.lineTo(sx(st)-4,topY+4);
            ctx.stroke();
            continue;
          }
          var isRoot=((GUITAR_STRING_PC[st]+fr)%12)===pos.rootPc;
          if(fr===0){
            /* 空弦 o；根音空弦用强调色 */
            ctx.strokeStyle=isRoot?colors.root:colors.text2;
            ctx.lineWidth=isRoot?2:1.6;
            ctx.beginPath();ctx.arc(sx(st),topY,4.5,0,Math.PI*2);ctx.stroke();
            continue;
          }
          var relF=fr-base;
          if(relF<0||relF>=nFrets)continue;
          var cy=fy(relF)+fretH/2;
          /* 横按覆盖到的音若与横按同品且无更高指编号，仅靠横按条表达，不再叠点 */
          var onBarre=pos.barre&&pos.barre.fret===fr&&st>=pos.barre.from&&st<=pos.barre.to&&pos.fingers[st]<=1;
          if(onBarre&&!isRoot)continue;
          ctx.fillStyle=isRoot?colors.root:colors.text;
          ctx.beginPath();ctx.arc(sx(st),cy,dotR,0,Math.PI*2);ctx.fill();
          if(this._lit[st]){
            ctx.strokeStyle=colors.root;
            ctx.lineWidth=2;
            ctx.beginPath();ctx.arc(sx(st),cy,dotR+2.5,0,Math.PI*2);ctx.stroke();
          }
          if(pos.fingers[st]>0){
            /* 指法数字与圆点填充色反色：根音点(强调色)配白字；
               普通点填充为 text 色，深色模式下是浅色，数字用 bg 色才可读 */
            ctx.fillStyle=isRoot?'#FFFFFF':colors.bg;
            ctx.font='600 '+Math.max(8,dotR)+'px system-ui,sans-serif';
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(String(pos.fingers[st]),sx(st),cy+0.5);
          }
        }
      }
    }
    if(!customElements.get('chord-guitar-diagram'))customElements.define('chord-guitar-diagram',ChordGuitarEl);

    /* ────────────── <chord-explorer>：底部弹出主面板 ────────────── */
    var EXPLORER_CSS=
      ':host{position:fixed;inset:0;z-index:2147482000;display:block;pointer-events:none;'+
        'font-family:Inter,"Noto Sans SC",-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",system-ui,sans-serif}'+
      '.backdrop{position:absolute;inset:0;background:rgba(18,13,9,.42);opacity:0;transition:opacity .22s ease;pointer-events:none}'+
      '.sheet{position:absolute;left:50%;bottom:0;transform:translate(-50%,103%);width:min(720px,100%);'+
        'max-height:min(86dvh,860px);box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain;'+
        'background:var(--ce-bg);color:var(--ce-text);border:1px solid var(--ce-border-md);border-bottom:none;'+
        'border-radius:18px 18px 0 0;box-shadow:0 -18px 60px rgba(0,0,0,.22);'+
        'padding:10px 20px calc(22px + env(safe-area-inset-bottom,0px));'+
        'transition:transform .24s cubic-bezier(.32,.72,.28,1);pointer-events:none}'+
      ':host(.open) .backdrop{opacity:1;pointer-events:auto}'+
      ':host(.open) .sheet{transform:translate(-50%,0);pointer-events:auto}'+
      '.grab{width:38px;height:4px;border-radius:2px;background:var(--ce-border-md);margin:2px auto 12px}'+
      '.head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding-right:38px}'+
      '.name{font-size:30px;font-weight:700;line-height:1.1}'+
      '.qual{font-size:13px;color:var(--ce-text2)}'+
      '.close{position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;'+
        'border:1px solid var(--ce-border);background:var(--ce-bg2);color:var(--ce-text2);'+
        'font-size:15px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}'+
      '.close:hover{background:var(--ce-bg3)}'+
      '.tones{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 4px}'+
      '.tone{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:44px;padding:7px 10px;'+
        'border-radius:10px;border:1px solid var(--ce-border);background:var(--ce-bg2)}'+
      '.tone b{font-size:16px;font-weight:700}'+
      '.tone i{font-style:normal;font-size:10.5px;color:var(--ce-text3)}'+
      '.tone.root b{color:var(--ce-accent)}.tone.third b{color:var(--ce-third)}.tone.ext b{color:var(--ce-ext)}'+
      '.bassnote{font-size:12px;color:var(--ce-text2);margin:6px 0 0}'+
      '.sec{margin-top:20px}'+
      '.sec-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}'+
      '.sec-t{font-size:12px;font-weight:600;letter-spacing:.08em;color:var(--ce-text3)}'+
      '.play{width:30px;height:30px;border-radius:50%;border:1px solid var(--ce-border-md);cursor:pointer;'+
        'background:var(--ce-accent-soft);color:var(--ce-accent);display:flex;align-items:center;justify-content:center;'+
        'transition:transform .12s ease}'+
      '.play:active{transform:scale(.9)}'+
      '.play svg{width:12px;height:12px;fill:currentColor}'+
      '.piano-card,.gcard{border:1px solid var(--ce-border);border-radius:14px;background:var(--ce-bg2);padding:12px}'+
      '.gwrap{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}'+
      '.gcard{flex:0 0 150px;display:flex;flex-direction:column;gap:6px}'+
      '.gmeta{display:flex;align-items:center;justify-content:space-between;gap:6px}'+
      '.glabel{font-size:11.5px;color:var(--ce-text2);font-weight:600}'+
      '.gempty{font-size:12.5px;color:var(--ce-text3);padding:6px 2px}'+
      '@media (max-width:480px){.name{font-size:26px}.gcard{flex-basis:138px}}';
    var PLAY_SVG='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.6c0-.5.55-.8.98-.55l7.02 4.4c.4.25.4.85 0 1.1l-7.02 4.4a.65.65 0 0 1-.98-.55z"/></svg>';

    /**
     * 和弦浏览器主组件（Bottom Sheet）。
     * 对外：el.open('G#m') / el.close() / setAttribute('chord','G#m')；
     * 打开/关闭时派发 'chord-open' / 'chord-close' CustomEvent（detail 为符号）。
     * 内部用极简 Store 管理当前 ChordDefinition，子组件订阅式刷新。
     */
    class ChordExplorerEl extends HTMLElement{
      static get observedAttributes(){return ['chord'];}
      constructor(){
        super();
        var self=this;
        this._store=createStore({entry:null,visible:false});
        this._shadow=this.attachShadow({mode:'open'});
        this._shadow.innerHTML=
          '<style>'+EXPLORER_CSS+'</style>'+
          '<div class="backdrop" part="backdrop"></div>'+
          '<div class="sheet" role="dialog" aria-modal="true" aria-label="和弦浏览器">'+
            '<div class="grab"></div>'+
            '<button class="close" aria-label="关闭">✕</button>'+
            '<div class="head"><span class="name"></span><span class="qual"></span></div>'+
            '<div class="tones"></div>'+
            '<div class="bassnote" hidden></div>'+
            '<div class="sec"><div class="sec-h"><span class="sec-t">钢琴</span>'+
              '<button class="play piano-play" aria-label="钢琴试听">'+PLAY_SVG+'</button></div>'+
              '<div class="piano-card"><chord-piano></chord-piano></div></div>'+
            '<div class="sec"><div class="sec-h"><span class="sec-t">吉他把位</span></div>'+
              '<div class="gwrap"></div><div class="gempty" hidden>该和弦性质的吉他把位暂未收录，可参考上方钢琴组成音。</div></div>'+
          '</div>';
        this._els={
          backdrop:this._shadow.querySelector('.backdrop'),
          sheet:this._shadow.querySelector('.sheet'),
          name:this._shadow.querySelector('.name'),
          qual:this._shadow.querySelector('.qual'),
          tones:this._shadow.querySelector('.tones'),
          bass:this._shadow.querySelector('.bassnote'),
          piano:this._shadow.querySelector('chord-piano'),
          pianoPlay:this._shadow.querySelector('.piano-play'),
          gwrap:this._shadow.querySelector('.gwrap'),
          gempty:this._shadow.querySelector('.gempty'),
          close:this._shadow.querySelector('.close')
        };
        this._els.backdrop.addEventListener('click',function(){self.close();});
        this._els.close.addEventListener('click',function(){self.close();});
        this._onKey=function(e){if(e.key==='Escape')self.close();};
        this._els.pianoPlay.addEventListener('click',function(){
          var st=self._store.getState();
          if(!st.entry)return;
          if(AudioEngine.playChord(st.entry.def.pianoMidis))self._els.piano.flash(st.entry.def.pianoMidis);
        });
        this._unsub=this._store.subscribe(this._render.bind(this));
        /* 宿主主题切换时同步变量并重绘 */
        if(typeof MutationObserver!=='undefined'){
          this._themeMo=new MutationObserver(function(){
            syncThemeVars(self);
            if(self._store.getState().visible)self._render(self._store.getState());
          });
          this._themeMo.observe(document.documentElement,{attributes:true,attributeFilter:['data-resolved-theme','data-theme']});
        }
      }
      attributeChangedCallback(name,ov,nv){
        if(name==='chord'&&nv)this.open(nv);
      }
      /**
       * 打开面板展示某和弦。
       * @param {string} symbol 和弦符号（可以带排版占位字符，内部会清洗）
       * @returns {boolean} 解析失败返回 false 且不打开
       */
      open(symbol){
        var entry=getChord(symbol);
        if(!entry)return false;
        syncThemeVars(this);
        this._store.setState({entry:entry,visible:true});
        document.addEventListener('keydown',this._onKey);
        this.dispatchEvent(new CustomEvent('chord-open',{detail:entry.def.symbol}));
        return true;
      }
      /** 关闭面板。 */
      close(){
        if(!this._store.getState().visible)return;
        this._store.setState({visible:false});
        document.removeEventListener('keydown',this._onKey);
        this.dispatchEvent(new CustomEvent('chord-close',{detail:null}));
      }
      _render(state){
        var els=this._els,self=this;
        this.classList.toggle('open',!!state.visible);
        if(!state.entry)return;
        var def=state.entry.def,positions=state.entry.guitar;
        els.name.textContent=def.root+def.quality.id+(def.bass?'/'+def.bass:'');
        els.qual.textContent=def.quality.zh+' · '+def.quality.name;
        /* 组成音 */
        els.tones.innerHTML='';
        for(var i=0;i<def.notes.length;i++){
          var n=def.notes[i];
          var chip=document.createElement('span');
          chip.className='tone '+n.role;
          chip.innerHTML='<b></b><i></i>';
          chip.querySelector('b').textContent=n.name;
          chip.querySelector('i').textContent=n.degree==='R'?'根音':n.degree;
          els.tones.appendChild(chip);
        }
        if(def.bassNote){
          els.bass.hidden=false;
          els.bass.textContent='斜杠和弦：低音 '+def.bassNote.name+' 由左手 / 贝斯演奏，右手按上方组成音。';
        }else{
          els.bass.hidden=true;
        }
        /* 钢琴 */
        els.piano.definition=def;
        /* 吉他把位 */
        els.gwrap.innerHTML='';
        els.gempty.hidden=positions.length>0;
        for(var p=0;p<positions.length;p++){
          (function(pos){
            var card=document.createElement('div');
            card.className='gcard';
            var diagram=document.createElement('chord-guitar-diagram');
            var meta=document.createElement('div');
            meta.className='gmeta';
            var label=document.createElement('span');
            label.className='glabel';
            var labelParts=[pos.label,pos.baseFret>1?pos.baseFret+'品':''].filter(Boolean);
            label.textContent=labelParts.join(' · ')||'开放把位';
            var btn=document.createElement('button');
            btn.className='play';
            btn.setAttribute('aria-label','吉他试听 '+pos.label);
            btn.innerHTML=PLAY_SVG;
            btn.addEventListener('click',function(){
              var delays=AudioEngine.strumGuitar(pos.midis);
              if(delays.length)diagram.flashStrings(delays);
            });
            meta.appendChild(label);
            meta.appendChild(btn);
            card.appendChild(diagram);
            card.appendChild(meta);
            els.gwrap.appendChild(card);
            diagram.setPosition(pos);
          })(positions[p]);
        }
      }
    }
    if(!customElements.get('chord-explorer'))customElements.define('chord-explorer',ChordExplorerEl);

    /* ────────────── 宿主歌词页集成 ──────────────
       约束（见阶段 7）：不改动 .p-chord 的创建/渲染逻辑；
       在稳定祖先上用事件委托（切调重渲染后监听依然有效）；
       读取节点当前 textContent（已移调文本），保证与用户所见一致。 */
    var explorerInstance=null;
    /** 懒创建全局唯一 <chord-explorer> 实例。 */
    function ensureExplorer(){
      if(explorerInstance&&explorerInstance.isConnected)return explorerInstance;
      explorerInstance=document.createElement('chord-explorer');
      (document.body||document.documentElement).appendChild(explorerInstance);
      return explorerInstance;
    }
    API.open=function(symbol){return ensureExplorer().open(symbol);};
    API.close=function(){if(explorerInstance)explorerInstance.close();};

    function setupHostIntegration(){
      if(window.__CECP_CHORD_ENGINE_WIRED__)return;
      window.__CECP_CHORD_ENGINE_WIRED__=true;
      /* 可点击视觉反馈：不改变布局尺寸 */
      var style=document.createElement('style');
      style.id='cecp-chord-engine-style';
      style.textContent=
        '.p-chord:not(.empty){cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .12s ease}'+
        '.p-chord:not(.empty):hover{opacity:.72}'+
        '.p-chord:not(.empty):active{opacity:.5}';
      (document.head||document.documentElement).appendChild(style);
      /* 事件委托挂在 document 上（#music-library 在两个宿主中都存在，
         但挂 document 同样稳定且不依赖挂载时序），命中后按当前文本打开。 */
      document.addEventListener('click',function(e){
        var target=e.target;
        if(!target||!target.closest)return;
        var el=target.closest('.p-chord');
        if(!el||el.classList.contains('empty'))return;
        /* 用户正在选择文本时不打断 */
        var sel=window.getSelection&&window.getSelection();
        if(sel&&String(sel).length)return;
        /* 一格内可能塞了多个和弦（CECP-CHORD-STYLE 把它们各自包成一个
           .chord-chip 彩色徽章）：点在具体某个 chip 上就只取该 chip 自己的
           文本，否则永远读到整个 .p-chord 拼接文本，只能解析出第一个和弦。 */
        var chip=target.closest('.chord-chip');
        var text=cleanChordText((chip&&el.contains(chip))?chip.textContent:el.textContent);
        if(!text)return;
        var entry=getChord(text);
        if(!entry)return; /* 非和弦文本静默忽略 */
        ensureExplorer().open(text);
      });
    }
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',setupHostIntegration);
    }else{
      setupHostIntegration();
    }
  }

  return API;
})();
if(typeof window!=='undefined'){window.ChordEngine=ChordEngine;}
/* ═══════════ CECP-CHORD-ENGINE v1 END ═══════════ */
