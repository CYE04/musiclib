/* ✦ Designed & Built by YuEn © 2025–2026 ✦ */
/* CECP Music Library v3.3 */
(function(){
  const ML_VER='2026.07.08.04-metro-volume';
  const GITHUB_API='https://api.github.com/repos/CYE04/Cecp/contents/songs';
  const RAW_BASE='https://raw.githubusercontent.com/CYE04/Cecp/main/songs/';
  const HALO_BASE='https://cecp.it';
  function resolveMediaUrl(url){
    if(!url) return '';
    if(/^https?:\/\//i.test(url)) return url;
    if(String(url).startsWith('/')) return HALO_BASE+url;
    return HALO_BASE+'/'+url;
  }
  const LOGO_SRC=(function(){
    try{
      const cur=document.currentScript && document.currentScript.src ? new URL(document.currentScript.src, location.href) : null;
      return cur ? new URL('olive-fellowship-logo.png', cur.href).href : 'olive-fellowship-logo.png';
    }catch(_){
      return 'musiclib/olive-fellowship-logo.png';
    }
  })();
  const TRANSPOSE_LOGO_SRC=(function(){
    try{
      const cur=document.currentScript && document.currentScript.src ? new URL(document.currentScript.src, location.href) : null;
      return cur ? new URL('cecp-olive-logo.svg', cur.href).href : 'cecp-olive-logo.svg';
    }catch(_){
      return 'cecp-olive-logo.svg';
    }
  })();
  const SOUNDTOUCH_PROCESSOR_URL=(function(){
    try{
      const cur=document.currentScript && document.currentScript.src ? new URL(document.currentScript.src, location.href) : null;
      return cur ? new URL('soundtouch-processor.js', cur.href).href : new URL('soundtouch-processor.js', location.href).href;
    }catch(_){
      return 'soundtouch-processor.js';
    }
  })();
  const WECHAT='CYuen_290104';
  const INTERNAL_KEY='cecp2026';
  const THEME_KEY='cecp:musiclib:theme';
  const SONG_STATE_KEY='cecp:musiclib:song-state:v1';
  const SEARCH_HISTORY_KEY='cecp:musiclib:search-history:v1';
  const THEME_MODES=['system','light','dark'];
  const SLOW_BPM_MAX=99;
  const FAST_BPM_MIN=100;
  const QUICK_FILTERS=[
    {id:'全部',label:'全部',match:()=>true},
    {id:'快歌',label:'快歌',match:s=>{const bpm=getSongBpm(s);return Number.isFinite(bpm)&&bpm>=FAST_BPM_MIN;}},
    {id:'慢歌',label:'慢歌',match:s=>{const bpm=getSongBpm(s);return Number.isFinite(bpm)&&bpm<=SLOW_BPM_MAX;}},
    {id:'本堂',label:'本堂',match:s=>!!getSongState(s.id).serviceUsed},
    {id:'收藏',label:'收藏',visible:false,match:s=>!!getSongState(s.id).favorite}
  ];
  const HOME_CATEGORIES=[
    {id:'快歌',label:'快歌',tone:'sky'},
    {id:'慢歌',label:'慢歌',tone:'sage'},
    {id:'收藏',label:'收藏',tone:'violet'}
  ];
  const SOURCE_RULES=[
    {name:'赞美之泉',patterns:['赞美之泉','stream of praise']},
    {name:'约书亚乐团',patterns:['约书亚乐团','joshua band','约书亚']},
    {name:'火把音乐',patterns:['火把音乐','torch music','torch worship']},
    {name:'泥土音乐',patterns:['泥土音乐','soil music']},
    {name:'小羊诗歌',patterns:['小羊诗歌','lamb music']},
    {name:'生命河灵粮堂',patterns:['生命河','river of life']},
    {name:'希尔颂',patterns:['hillsong']},
    {name:'伯特利音乐',patterns:['bethel music','bethel']},
    {name:'高地敬拜',patterns:['elevation worship','elevation']},
    {name:'城市之光',patterns:['cityalight']},
    {name:'激励者乐团',patterns:['planetshakers']},
    {name:'其他',patterns:[]}
  ];

  if(!document.getElementById('ml-style')){
    const s=document.createElement('link');s.id='ml-style';s.rel='stylesheet';
    try{
      const cur=document.currentScript && document.currentScript.src ? new URL(document.currentScript.src, location.href) : null;
      const cssUrl=cur ? new URL('musiclib.css', cur.href) : new URL('musiclib.css', location.href);
      cssUrl.searchParams.set('v',ML_VER);
      s.href=cssUrl.href;
      s.onerror=()=>{ if(!/cye04\.github\.io\/musiclib\/musiclib\.css/.test(s.href)) s.href='https://cye04.github.io/musiclib/musiclib.css?v='+encodeURIComponent(ML_VER); };
    }catch(_){
      s.href='musiclib.css?v='+encodeURIComponent(ML_VER);
      s.onerror=()=>{ s.href='https://cye04.github.io/musiclib/musiclib.css?v='+encodeURIComponent(ML_VER); };
    }
    document.head.appendChild(s);
  }

  const root=document.getElementById('music-library');
  if(!root)return;
  document.documentElement.classList.add('ml-fullscreen');
  if(document.body) document.body.classList.add('ml-fullscreen');
  root.setAttribute('data-ml-version',ML_VER);
  try{console.info('[musiclib] loaded version',ML_VER);}catch(_){}
  ensureNoIndexMeta();
  if(!hasInternalKey()){
    renderInternalOnlyNotice();
    return;
  }

  let songs=[],query='',sourceFilter='全部',intentFilter='全部',_activeDetailSongId='',_detailReturnScroll=0;
  let searchHistory=loadSearchHistory(),_searchHistoryTimer=null;
  let _apLoaded=false,_ap=null;
  let _audioCtx=null,_metroTimer=null,_metroNext=0,_metroRunning=false,_metroBpm=72;
  let _themeObserver=null;
  let _detailStatePushed=false;
  let _revealObserver=null,_weatherCache=null;
  let _pullRefreshing=false;

  function icon(name,size=18){
    const common=`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
    const filled=`width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"`;
    const map={
      home:`<svg ${common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
      search:`<svg ${common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
      library:`<svg ${common}><path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5Z"/><path d="M8 7h6"/><path d="M8 11h7"/></svg>`,
      queue:`<svg ${common}><path d="M4 6h12"/><path d="M4 12h10"/><path d="M4 18h8"/><path d="M18 14v6"/><path d="M15 17h6"/></svg>`,
      heart:`<svg ${common}><path d="M20.8 8.6c0 5.2-8.8 11.4-8.8 11.4S3.2 13.8 3.2 8.6a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6Z"/></svg>`,
      heartFill:`<svg ${filled}><path d="M12 21s-8.8-6.2-8.8-12.4A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.8 2.6C20.8 14.8 12 21 12 21Z"/></svg>`,
      check:`<svg ${common}><path d="M20 6 9 17l-5-5"/></svg>`,
      settings:`<svg ${common}><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.07A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.07 14H3a2 2 0 1 1 0-4h.07A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.07V3a2 2 0 1 1 4 0v.07A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.37 9c.25.61.84 1 1.56 1H21a2 2 0 1 1 0 4h-.07A1.7 1.7 0 0 0 19.4 15Z"/></svg>`,
      user:`<svg ${common}><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
      play:`<svg ${filled}><path d="M8 5.14v14l11-7-11-7Z"/></svg>`,
      score:`<svg ${common}><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>`,
      close:`<svg class="ml-motion-icon ml-motion-icon-close" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path class="ml-motion-line ml-motion-line-a" d="M6 6 18 18"/><path class="ml-motion-line ml-motion-line-b" d="M18 6 6 18"/></svg>`,
      collapse:`<svg class="ml-motion-icon ml-motion-icon-collapse" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
      theme:`<svg ${common}><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>`,
      more:`<svg ${common}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>`,
      chevronLeft:`<svg ${common}><path d="m15 18-6-6 6-6"/></svg>`,
      sun:`<svg ${common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
      system:`<svg ${common}><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`,
      listMusic:`<svg ${common}><path d="M4 6h10"/><path d="M4 10h10"/><path d="M4 14h7"/><path d="M16 5v11"/><path d="m16 8 4-1v8"/><circle cx="14" cy="18" r="2"/><circle cx="18" cy="16" r="2"/></svg>`,
      chevronDown:`<svg ${common}><path d="m6 9 6 6 6-6"/></svg>`,
      rotateCcw:`<svg ${common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
      refreshCcw:`<svg ${common}><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.4-2.6L20 11"/><path d="M17.9 15a7 7 0 0 1-11.4 2.6L4 13"/></svg>`,
      minus:`<svg ${common}><path d="M5 12h14"/></svg>`,
      plus:`<svg ${common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
      timerReset:`<svg ${common}><path d="M10 2h4"/><path d="M12 14v-4"/><circle cx="12" cy="14" r="8"/><path d="m4 4 2.5 2.5"/><path d="M3 9V4h5"/></svg>`,
      crosshair:`<svg ${common}><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/></svg>`,
      flag:`<svg ${common}><path d="M5 21V4"/><path d="M5 4h11l-1 4 1 4H5"/></svg>`,
      arrowLeftRight:`<svg ${common}><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>`,
      skipBack:`<svg ${common}><path d="M19 20 9 12l10-8v16Z"/><path d="M5 19V5"/></svg>`,
      rewind:`<svg ${common}><path d="m11 19-9-7 9-7v14Z"/><path d="m22 19-9-7 9-7v14Z"/></svg>`,
      pause:`<svg ${filled}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
      fastForward:`<svg ${common}><path d="m13 5 9 7-9 7V5Z"/><path d="m2 5 9 7-9 7V5Z"/></svg>`,
      circleHelp:`<svg ${common}><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-.9.6-1.5 1.1-1.5 2.2"/><path d="M12 17h.01"/></svg>`,
      circlePlay:`<svg ${common}><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/></svg>`
    };
    return map[name]||map.more;
  }

  root.innerHTML=`
    <aside id="ml-sidebar" aria-label="诗歌库导航">
      <div id="ml-sidebar-brand">
        <span class="ml-brand-dot"><img src="${LOGO_SRC}" alt="橄榄树团契"></span>
        <span>
          <strong>CECP 诗歌库</strong>
          <small>Worship Library</small>
        </span>
      </div>
      <nav id="ml-side-nav" aria-label="主要页面">
        <button class="ml-side-link active" type="button" data-nav="home">${icon('home')}<span>首页</span></button>
        <button class="ml-side-link" type="button" data-nav="search">${icon('search')}<span>搜索</span></button>
        <button class="ml-side-link" type="button" data-nav="library">${icon('library')}<span>诗歌库</span></button>
        <button class="ml-side-link" type="button" data-nav="playlist">${icon('queue')}<span>播放列表</span></button>
        <button class="ml-side-link" type="button" data-nav="favorites">${icon('heart')}<span>收藏</span></button>
      </nav>
      <button id="ml-side-profile" type="button" aria-label="切换主题">
        <span class="ml-profile-avatar">${icon('theme',17)}</span>
        <span><strong>主题切换</strong><small>跟随系统 / 浅色 / 深色</small></span>
      </button>
    </aside>
    <div id="ml-header">
      <div id="ml-nav">
        <div id="ml-brand">
          <span class="ml-brand-dot"><img src="${LOGO_SRC}" alt="橄榄树团契"></span>
          <span class="ml-brand-copy">
            <span class="ml-brand-name">CECP 诗歌库</span>
            <span class="ml-brand-sub">敬拜练习 · 歌谱 · 音频</span>
          </span>
        </div>
        <div id="ml-nav-actions">
          <button class="ml-weather-pill" id="ml-weather-pill" type="button" aria-label="今日天气">Padova · --°C</button>
          <button class="ml-nav-icon-btn" id="ml-nav-search" type="button" aria-label="聚焦搜索">${icon('search')}</button>
          <button class="ml-nav-icon-btn" id="ml-nav-theme" type="button" aria-label="切换深浅主题">${icon('system')}</button>
        </div>
      </div>
      <div id="ml-hero">
        <div class="ml-hero-copy">
          <div id="ml-header-kicker">CECP MUSIC LIBRARY</div>
          <h1 id="ml-title">今天想唱什么?</h1>
          <div id="ml-subtitle">搜索歌名、歌手、歌词、调性与主题，快速找到敬拜练习需要的诗歌。</div>
        </div>
        <div id="ml-hero-meta">
          <div class="ml-hero-chip"><span class="ml-hero-chip-label">歌曲</span><strong id="ml-hero-song-count">--</strong></div>
          <div class="ml-hero-chip"><span class="ml-hero-chip-label">收藏</span><strong id="ml-hero-fav-count">0</strong></div>
          <div class="ml-hero-chip"><span class="ml-hero-chip-label">本堂</span><strong id="ml-hero-service-count">0</strong></div>
        </div>
      </div>
      <div id="ml-search-row">
        <div id="ml-search-wrap">
          <span id="ml-search-icon">${icon('search')}</span>
          <input id="ml-search" type="search" placeholder="搜索歌名、拼音、歌手、歌词、主题..." autocomplete="off" autocorrect="off"/>
          <button id="ml-search-clear" type="button" aria-label="清空搜索" hidden>${icon('close',16)}</button>
        </div>
        <button id="ml-search-submit" type="button" aria-label="搜索">${icon('search',20)}</button>
        <div id="ml-count-wrap">
          <span class="ml-count-label">总数</span>
          <strong id="ml-count"></strong>
        </div>
      </div>
      <div id="ml-search-history" hidden></div>
      <section id="ml-worship-picks" class="ml-reveal" aria-label="每日推荐">
        <div id="ml-wp-glow" aria-hidden="true"></div>
        <div id="ml-wp-bg" aria-hidden="true"></div>
        <div id="ml-wp-shell">
          <div id="ml-wp-hero">
            <div class="ml-wp-eyebrow">今日推荐</div>
            <div id="ml-wp-subtitle">今天推荐的三首诗歌</div>
            <h2 id="ml-wp-title">正在预备今日敬拜推荐</h2>
            <div id="ml-wp-artist">今日推荐</div>
            <p id="ml-wp-lyric">愿今天的第一首歌，把心安静带到神面前。</p>
            <div id="ml-wp-tags"></div>
            <div id="ml-wp-actions">
              <button id="ml-wp-play" class="ml-wp-action is-primary" type="button" disabled>
                <span class="ml-wp-action-icon">${icon('play',15)}</span>
                <span>快速播放</span>
              </button>
              <button id="ml-wp-open" class="ml-wp-action" type="button" disabled>
                <span class="ml-wp-action-icon">${icon('score',15)}</span>
                <span>查看歌谱</span>
              </button>
            </div>
          </div>
          <div id="ml-wp-side">
            <div id="ml-wp-greeting">
              <span id="ml-wp-greeting-main">今日平安</span>
              <strong id="ml-wp-greeting-sub">正在读取今日时间</strong>
            </div>
            <div id="ml-wp-list"></div>
          </div>
        </div>
      </section>
      <div id="ml-home-grid">
        <section class="ml-home-panel" id="ml-recent-panel" aria-label="最近使用">
          <div class="ml-panel-head">
            <div>
              <div class="ml-section-label">最近使用</div>
              <h2>继续上次练习</h2>
            </div>
            <button class="ml-panel-link" type="button" data-nav="library">查看全部</button>
          </div>
          <div id="ml-recent-list" class="ml-compact-list"></div>
        </section>
        <section class="ml-home-panel" id="ml-category-panel" aria-label="快捷分类">
          <div class="ml-panel-head">
            <div>
              <div class="ml-section-label">快捷分类</div>
              <h2>按服事场景找歌</h2>
            </div>
          </div>
          <div id="ml-category-grid"></div>
        </section>
      </div>
      <div id="ml-filter-section">
        <div id="ml-filter-section-head">
          <div class="ml-section-label">筛选诗歌</div>
          <h2>全部歌曲</h2>
        </div>
        <div id="ml-filter-bar" aria-label="快捷筛选"></div>
      </div>
    </div>
    <div id="ml-loading"><div id="ml-spinner"></div>正在载入诗歌…</div>
    <div id="ml-list-stage">
      <div id="ml-list-head">
        <div class="ml-section-label">全部诗歌</div>
        <div id="ml-result-count">全部诗歌</div>
      </div>
      <div id="ml-list"></div>
    </div>
    <div id="ml-empty">
      <div id="ml-empty-icon">🎵</div>
      <div id="ml-empty-msg">找不到「<span id="ml-query-text"></span>」</div>
      <div id="ml-empty-sub">库里暂时还没有这首歌，你可以联系 YuEn 申请添加。</div>
      <button id="ml-contact">💬 复制微信号 YuEn</button>
    </div>
    <div id="ml-detail">
      <div id="ml-detail-overlay"></div>
      <div id="ml-detail-swipe-hint"></div>
      <section id="ml-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="ml-detail-title">
      <div id="ml-detail-header">
        <button id="ml-back" type="button">${icon('chevronLeft')}<span>返回</span></button>
        <div id="ml-detail-title"></div>
        <div id="ml-detail-actions">
          <button id="ml-detail-service" class="ml-detail-action" type="button" aria-label="标记本堂唱过">${icon('check',16)}<span>本堂</span></button>
          <button id="ml-detail-favorite" class="ml-detail-action" type="button" aria-label="收藏诗歌">${icon('heart',16)}</button>
          <button id="ml-detail-more" class="ml-detail-action" type="button" aria-label="更多操作">${icon('more',16)}</button>
        </div>
      </div>
      <div id="ml-miniplayer">
        <audio id="ml-mp-audio"></audio>
        <div id="ml-mp-stage">
          <div id="ml-mp-cover-wrap">
            <div id="ml-mp-cover"><span>♪</span></div>
          </div>
          <div id="ml-mp-lrc-panel">
            <div id="ml-mp-lrc-inner"></div>
          </div>
        </div>
      <div class="pl-song-row">
        <div class="pl-info">
          <div id="ml-mp-title" class="pl-title"></div>
          <div id="ml-mp-artist" class="pl-artist"></div>
        </div>
        <button class="pl-btn" id="ml-mp-expand" type="button" aria-label="全屏查看歌词" title="全屏查看歌词"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M21 3l-7 7"/><path d="M9 21H3v-6"/><path d="M3 21l7-7"/></svg></button>
      </div>
      <div class="pl-progress-wrap">
        <div class="pl-progress-bar"><div class="pl-progress-fill" id="ml-mp-fill"></div></div>
        <div class="pl-times"><span id="ml-mp-cur">0:00</span><span id="ml-mp-dur">0:00</span></div>
      </div>
      <div class="pl-controls">
        <button class="pl-btn" id="ml-mp-seek-back" aria-label="后退15秒"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="12" y="15.5" text-anchor="middle" font-size="5.5" fill="currentColor" font-family="system-ui,sans-serif" font-weight="600">15</text></svg></button>
        <button class="pl-btn" id="ml-mp-prev" aria-label="上一首"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1zm3.2 5.65 7.1-4.8A.43.43 0 0 1 17 7.2v9.6a.43.43 0 0 1-.7.35L9.2 12.35a.43.43 0 0 1 0-.7z"/></svg></button>
        <button class="pl-btn pl-playpause" id="ml-mp-playpause" aria-label="播放"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg></button>
        <button class="pl-btn" id="ml-mp-next" aria-label="下一首"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 6a1 1 0 0 0-1 1v10a1 1 0 1 0 2 0V7a1 1 0 0 0-1-1zm-3.2 5.65-7.1-4.8A.43.43 0 0 0 7 7.2v9.6a.43.43 0 0 0 .7.35l7.1-4.8a.43.43 0 0 0 0-.7z"/></svg></button>
        <button class="pl-btn" id="ml-mp-seek-fwd" aria-label="前进15秒"><svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="12" y="15.5" text-anchor="middle" font-size="5.5" fill="currentColor" font-family="system-ui,sans-serif" font-weight="600">15</text></svg></button>
        <button class="pl-btn pl-repeat" id="ml-mp-repeat" aria-label="循环"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></button>
      </div>
      <button class="ml-audio-tool" id="ml-mp-pitch-open" type="button" aria-label="打开 MP3 变调面板">
        <span class="ml-audio-tool-k">MP3</span>
        <span class="ml-audio-tool-v">变调</span>
        <span class="ml-audio-tool-mode">OFF</span>
      </button>
      <div class="pl-vol-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
        <input class="pl-vol" id="ml-mp-vol" type="range" min="0" max="1" step="0.02" value="1">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM18.5 12c0-2.77-1.5-5.15-3.75-6.45v12.9C16.99 17.14 18.5 14.77 18.5 12z"/></svg>
      </div>
    </div>

      <div id="ml-detail-body"></div>
      </section>
    </div>
    <div id="ml-player-view">
      <div id="ml-player-view-top">
        <button id="ml-player-view-close" class="ml-motion-close-btn" type="button" aria-label="收起播放器">${icon('collapse',20)}</button>
        <div id="ml-player-view-now">
          <div id="ml-player-now-title">正在播放</div>
          <div id="ml-player-now-sub"></div>
        </div>
        <button id="ml-player-view-menu" type="button" aria-label="歌词" title="歌词"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h8"/><path d="M7 11h10"/><path d="M9 16h6"/></svg></button>
      </div>
      <div id="ml-player-view-grid">
        <aside id="ml-player-rail" aria-hidden="true">
          <button class="ml-player-rail-btn active" type="button" aria-label="歌词"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h8"/><path d="M7 11h10"/><path d="M9 16h6"/></svg></button>
          <button class="ml-player-rail-btn" type="button" aria-label="队列面板"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/><line x1="18" y1="10" x2="18" y2="20"/><line x1="13" y1="15" x2="23" y2="15"/></svg></button>
          <div class="ml-player-rail-dot"></div>
          <div class="ml-player-rail-dot"></div>
          <div class="ml-player-rail-dot"></div>
        </aside>
        <section id="ml-player-lyrics">
          <div id="ml-player-lyrics-inner"></div>
        </section>
        <aside id="ml-player-side">
          <div id="ml-player-side-tabs">
            <button class="ml-player-side-tab active" id="ml-player-tab-song" type="button">歌曲</button>
            <button class="ml-player-side-tab" id="ml-player-tab-queue" type="button">队列</button>
          </div>
          <div id="ml-player-side-song">
            <div id="ml-player-cover"><span>♪</span></div>
            <div id="ml-player-title"></div>
            <div id="ml-player-artist"></div>
            <div id="ml-player-actions">
              <button class="ml-player-icon-btn" type="button" aria-label="收藏"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 8.6c0 5.2-8.8 11.4-8.8 11.4S3.2 13.8 3.2 8.6a4.8 4.8 0 0 1 8.8-2.6 4.8 4.8 0 0 1 8.8 2.6z"/></svg></button>
              <button class="ml-player-icon-btn" type="button" aria-label="分享"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg></button>
            </div>
            <div id="ml-player-pills">
              <span id="ml-player-key" class="ml-player-pill"></span>
              <span id="ml-player-bpm" class="ml-player-pill"></span>
            </div>
          </div>
          <div id="ml-player-side-queue" hidden>
            <div id="ml-player-queue-empty">当前还没有可播放队列</div>
            <div id="ml-player-queue-list"></div>
          </div>
        </aside>
      </div>
      <div id="ml-player-dock">
        <div id="ml-player-dock-song">
          <div id="ml-player-dock-cover"><span>♪</span></div>
          <div id="ml-player-dock-meta">
            <div id="ml-player-dock-title"></div>
            <div id="ml-player-dock-artist"></div>
          </div>
        </div>
        <div id="ml-player-dock-center">
          <div id="ml-player-controls">
            <button class="ml-player-ctl is-ghost" id="ml-player-shuffle" type="button" aria-label="随机播放"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg></button>
            <button class="ml-player-ctl" id="ml-player-prev" type="button" aria-label="上一首"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1zm3.2 5.65 7.1-4.8A.43.43 0 0 1 17 7.2v9.6a.43.43 0 0 1-.7.35L9.2 12.35a.43.43 0 0 1 0-.7z"/></svg></button>
            <button class="ml-player-ctl is-main" id="ml-player-playpause" type="button" aria-label="播放"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg></button>
            <button class="ml-player-ctl" id="ml-player-next" type="button" aria-label="下一首"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 6a1 1 0 0 0-1 1v10a1 1 0 1 0 2 0V7a1 1 0 0 0-1-1zm-3.2 5.65-7.1-4.8A.43.43 0 0 0 7 7.2v9.6a.43.43 0 0 0 .7.35l7.1-4.8a.43.43 0 0 0 0-.7z"/></svg></button>
            <button class="ml-player-ctl is-ghost" id="ml-player-repeat-toggle" type="button" aria-label="循环"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></button>
          </div>
          <div class="ml-player-progress-wrap">
            <span id="ml-player-cur">0:00</span>
            <div class="ml-player-progress-bar" id="ml-player-progress"><div class="ml-player-progress-fill" id="ml-player-fill"></div></div>
            <span id="ml-player-dur">0:00</span>
          </div>
        </div>
        <div id="ml-player-dock-right">
          <button class="ml-audio-tool ml-audio-tool-dock" id="ml-player-pitch-open" type="button" aria-label="打开 MP3 变调面板">
            <span class="ml-audio-tool-k">MP3</span>
            <span class="ml-audio-tool-v">变调</span>
            <span class="ml-audio-tool-mode">OFF</span>
          </button>
          <span class="ml-player-vol-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></span>
          <input id="ml-player-dock-vol" type="range" min="0" max="1" step="0.02" value="1">
        </div>
      </div>
    </div>
    <div id="ml-audio-panel-backdrop" hidden></div>
    <section id="ml-audio-panel" hidden aria-label="MP3 变调面板">
      <div id="ml-audio-panel-head">
        <button class="ml-audio-panel-head-btn ml-ap-icon-btn ml-ap-motion-list" id="ml-audio-panel-menu" type="button" aria-label="播放列表">${icon('listMusic',21)}</button>
        <div class="ml-audio-panel-icons" aria-hidden="true">✧✦</div>
        <div id="ml-audio-panel-title">
          <span class="ml-audio-panel-brandmark"><img src="${TRANSPOSE_LOGO_SRC}" alt=""></span>
          <span>CECP Transpose</span>
        </div>
        <button class="ml-audio-panel-head-btn ml-motion-close-btn" id="ml-audio-panel-close" type="button" aria-label="关闭 CECP Transpose">${icon('close',22)}</button>
      </div>
      <button id="ml-audio-panel-play" type="button">
        <span>Start playback</span>
        <span id="ml-audio-panel-play-icon">${icon('circlePlay',21)}</span>
      </button>
      <div class="ml-audio-panel-row" data-control="transpose">
        <div class="ml-audio-panel-rowtop">
          <span>Transpose</span>
          <strong id="ml-audio-transpose-value">0</strong>
          <button id="ml-audio-transpose-reset" class="ml-ap-icon-btn ml-ap-motion-reset" type="button" aria-label="重置半音">${icon('rotateCcw',20)}</button>
        </div>
        <div class="ml-audio-panel-control">
          <button id="ml-audio-transpose-down" class="ml-ap-icon-btn ml-ap-motion-minus" type="button" aria-label="降半音">${icon('minus',22)}</button>
          <input id="ml-audio-transpose-range" type="range" min="-12" max="12" step="1" value="0">
          <button id="ml-audio-transpose-up" class="ml-ap-icon-btn ml-ap-motion-plus" type="button" aria-label="升半音">${icon('plus',22)}</button>
        </div>
      </div>
      <div class="ml-audio-panel-row" data-control="pitch">
        <div class="ml-audio-panel-rowtop">
          <span>Pitch</span>
          <strong id="ml-audio-pitch-value">0</strong>
          <button id="ml-audio-pitch-reset" class="ml-ap-icon-btn ml-ap-motion-reset" type="button" aria-label="重置音高细调">${icon('rotateCcw',20)}</button>
        </div>
        <div class="ml-audio-panel-control">
          <button id="ml-audio-pitch-down" class="ml-ap-icon-btn ml-ap-motion-minus" type="button" aria-label="音高降低">${icon('minus',22)}</button>
          <input id="ml-audio-pitch-range" type="range" min="-100" max="100" step="1" value="0">
          <button id="ml-audio-pitch-up" class="ml-ap-icon-btn ml-ap-motion-plus" type="button" aria-label="音高升高">${icon('plus',22)}</button>
        </div>
      </div>
      <div class="ml-audio-panel-row" data-control="speed">
        <div class="ml-audio-panel-rowtop">
          <span>Speed <strong id="ml-audio-speed-value">100%</strong></span>
          <span>Tempo <strong id="ml-audio-tempo-value">bpm</strong></span>
          <button id="ml-audio-speed-reset" class="ml-ap-icon-btn ml-ap-motion-reset" type="button" aria-label="重置速度">${icon('rotateCcw',20)}</button>
        </div>
        <div class="ml-audio-panel-control">
          <button id="ml-audio-speed-down" class="ml-ap-icon-btn ml-ap-motion-minus" type="button" aria-label="降低速度">${icon('minus',22)}</button>
          <input id="ml-audio-speed-range" type="range" min="25" max="400" step="5" value="100">
          <button id="ml-audio-speed-up" class="ml-ap-icon-btn ml-ap-motion-plus" type="button" aria-label="提高速度">${icon('plus',22)}</button>
        </div>
        <div class="ml-audio-speed-presets" aria-label="常用速度">
          <button type="button" data-speed="0.5">50%</button>
          <button type="button" data-speed="0.75">75%</button>
          <button type="button" data-speed="1">100%</button>
          <button type="button" data-speed="1.25">125%</button>
          <button type="button" data-speed="1.5">150%</button>
          <button type="button" data-speed="2">200%</button>
        </div>
      </div>
      <div class="ml-audio-panel-row" data-control="loop">
        <div class="ml-audio-panel-rowtop">
          <span>Loop</span>
          <div class="ml-audio-loop-actions">
            <button id="ml-audio-loop-toggle" class="ml-audio-loop-switch" type="button" aria-label="开启 A/B 循环" aria-pressed="false">
              <span class="ml-audio-loop-switch-text">OFF</span>
              <span class="ml-audio-loop-switch-knob" aria-hidden="true"></span>
            </button>
            <button id="ml-audio-loop-use-current" class="ml-ap-icon-btn ml-ap-motion-target ml-loop-action-btn" type="button" aria-label="用当前位置补齐 A/B">
              ${icon('crosshair',19)}<span class="ml-loop-action-label">当前</span>
            </button>
            <button id="ml-audio-loop-swap" class="ml-ap-icon-btn ml-ap-motion-swap ml-loop-action-btn" type="button" aria-label="交换 A/B 点">
              ${icon('arrowLeftRight',19)}<span class="ml-loop-action-label">交换</span>
            </button>
            <button id="ml-audio-reset-all" class="ml-ap-icon-btn ml-ap-motion-reset ml-loop-action-btn" type="button" aria-label="恢复全部练习设置">
              ${icon('refreshCcw',19)}<span class="ml-loop-action-label">恢复</span>
            </button>
          </div>
        </div>
        <div id="ml-audio-loop-grid">
          <div class="ml-audio-loop-point" data-point="a">
            <button id="ml-audio-loop-a" class="ml-audio-loop-mark ml-ap-icon-btn ml-ap-motion-mark" type="button" aria-label="设置 A 点">${icon('flag',18)}</button>
            <input id="ml-audio-loop-a-time" class="ml-audio-loop-time" type="text" inputmode="decimal" value="00:00.0" aria-label="A 点时间">
            <button id="ml-audio-loop-a-jump" class="ml-audio-loop-jump ml-ap-icon-btn ml-ap-motion-left" type="button" aria-label="跳到 A 点">${icon('skipBack',18)}</button>
            <input id="ml-audio-loop-a-label" class="ml-audio-loop-label" type="text" value="marker 1" aria-label="A 点标记名称">
          </div>
          <div class="ml-audio-loop-point" data-point="b">
            <button id="ml-audio-loop-b" class="ml-audio-loop-mark ml-ap-icon-btn ml-ap-motion-mark" type="button" aria-label="设置 B 点">${icon('flag',18)}</button>
            <input id="ml-audio-loop-b-time" class="ml-audio-loop-time" type="text" inputmode="decimal" value="00:30.0" aria-label="B 点时间">
            <button id="ml-audio-loop-b-jump" class="ml-audio-loop-jump ml-ap-icon-btn ml-ap-motion-right" type="button" aria-label="跳到 B 点">${icon('fastForward',18)}</button>
            <input id="ml-audio-loop-b-label" class="ml-audio-loop-label" type="text" value="marker 2" aria-label="B 点标记名称">
          </div>
        </div>
        <div id="ml-audio-loop-message" role="status" aria-live="polite"></div>
      </div>
      <div id="ml-audio-panel-foot">
        <button id="ml-audio-panel-prev" class="ml-ap-icon-btn ml-ap-motion-left" type="button" aria-label="上一首">${icon('skipBack',21)}</button>
        <button id="ml-audio-panel-back" class="ml-ap-icon-btn ml-ap-motion-left" type="button" aria-label="后退">${icon('rewind',21)}</button>
        <button id="ml-audio-panel-main" class="ml-ap-icon-btn ml-ap-motion-main" type="button" aria-label="播放或暂停">${icon('play',21)}</button>
        <button id="ml-audio-panel-forward" class="ml-ap-icon-btn ml-ap-motion-right" type="button" aria-label="前进">${icon('fastForward',21)}</button>
        <button id="ml-audio-panel-help" class="ml-ap-icon-btn ml-ap-motion-help" type="button" aria-label="帮助">${icon('circleHelp',21)}</button>
      </div>
      <div id="ml-audio-panel-time">00:00 / 00:00</div>
      <div id="ml-audio-panel-status">Start media...</div>
    </section>
    <div id="ml-nowbar" aria-label="正在播放">
      <div id="ml-nowbar-bg" aria-hidden="true"></div>
      <div id="ml-nowbar-cover"><span>♪</span></div>
      <div id="ml-nowbar-main">
        <div id="ml-nowbar-title">正在播放</div>
        <div id="ml-nowbar-artist"></div>
        <div id="ml-nowbar-lyric">歌词将在播放时显示</div>
        <div id="ml-nowbar-progress"><div id="ml-nowbar-fill"></div></div>
      </div>
      <div id="ml-nowbar-controls">
        <button class="ml-nowbar-btn" id="ml-nowbar-prev" type="button" aria-label="上一首">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6a1 1 0 0 1 1 1v10a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1zm3.2 5.65 7.1-4.8A.43.43 0 0 1 17 7.2v9.6a.43.43 0 0 1-.7.35L9.2 12.35a.43.43 0 0 1 0-.7z"/></svg>
        </button>
        <button class="ml-nowbar-btn is-main" id="ml-nowbar-playpause" type="button" aria-label="播放或暂停">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>
        </button>
        <button class="ml-nowbar-btn" id="ml-nowbar-next" type="button" aria-label="下一首">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 6a1 1 0 0 0-1 1v10a1 1 0 1 0 2 0V7a1 1 0 0 0-1-1zm-3.2 5.65-7.1-4.8A.43.43 0 0 0 7 7.2v9.6a.43.43 0 0 0 .7.35l7.1-4.8a.43.43 0 0 0 0-.7z"/></svg>
        </button>
        <button class="ml-nowbar-btn" id="ml-nowbar-expand" type="button" aria-label="打开歌词">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>
        </button>
      </div>
    </div>
    <nav id="ml-bottom-nav" aria-label="手机底部导航">
      <button class="ml-bottom-link active" type="button" data-nav="home">${icon('home')}<span>首页</span></button>
      <button class="ml-bottom-link" type="button" data-nav="search">${icon('search')}<span>搜索</span></button>
      <button class="ml-bottom-link" type="button" data-nav="playlist">${icon('queue')}<span>播放列表</span></button>
      <button class="ml-bottom-link" type="button" data-nav="favorites">${icon('heart')}<span>收藏</span></button>
    </nav>
    <div id="ml-playlist-drawer" hidden>
      <button id="ml-playlist-backdrop" type="button" aria-label="关闭播放列表"></button>
      <section id="ml-playlist-panel" aria-label="播放列表">
        <div id="ml-playlist-head">
          <div>
            <div class="ml-section-label">播放列表</div>
            <h2>当前队列</h2>
          </div>
          <div id="ml-playlist-actions">
            <button id="ml-playlist-clear" type="button">清空</button>
            <button id="ml-playlist-close" class="ml-motion-close-btn" type="button" aria-label="关闭播放列表">${icon('close',18)}</button>
          </div>
        </div>
        <div id="ml-playlist-now"></div>
        <div id="ml-playlist-empty">当前还没有歌曲。点击歌曲卡片上的播放按钮，会加入这里并开始播放。</div>
        <div id="ml-playlist-list"></div>
      </section>
    </div>
    <div id="ml-lightbox">
      <button id="ml-lightbox-close" class="ml-motion-close-btn" type="button" aria-label="关闭图片预览">${icon('close',22)}</button>
      <button id="ml-lightbox-prev" class="ml-lightbox-nav" type="button" aria-label="上一张">‹</button>
      <img id="ml-lightbox-img" src="" alt="">
      <button id="ml-lightbox-next" class="ml-lightbox-nav" type="button" aria-label="下一张">›</button>
      <div id="ml-lightbox-toolbar">
        <span id="ml-lightbox-count">1 / 1</span>
        <button id="ml-lightbox-reset" type="button">原始大小</button>
        <a id="ml-lightbox-open" href="#" target="_blank" rel="noopener">打开原图</a>
      </div>
    </div>
  `;

  const $=id=>document.getElementById(id);
  const detail=$('ml-detail');

  (function buildNoticeUI(){
    const noticeHTML=`
      <div class="ml-notice-track">
        <div class="ml-notice-item"><span class="ml-notice-dot"></span><span>本页面所展示之诗歌内容，仅作为学习、练习与敬拜辅助之用；其歌词、曲谱、音频及相关版权均归原权利人所有。若你需要其他歌曲，欢迎联系 <span class="ml-notice-name">YuEn</span>。</span></div>
        <div class="ml-notice-item" aria-hidden="true"><span class="ml-notice-dot"></span><span>本页面所展示之诗歌内容，仅作为学习、练习与敬拜辅助之用；其歌词、曲谱、音频及相关版权均归原权利人所有。若你需要其他歌曲，欢迎联系 <span class="ml-notice-name">YuEn</span>。</span></div>
      </div>`;

    const listNotice=document.createElement('button');
    listNotice.id='ml-notice';
    listNotice.type='button';
    listNotice.setAttribute('aria-label','版权与申请新歌说明');
    listNotice.innerHTML=noticeHTML;
    // Keep the copyright notice inside the main header area, directly
    // below the complete search section (including optional search history).
    // This preserves the fixed sidebar and prevents the notice from becoming
    // a separate top-level grid row above the page content.
    const noticeAnchor=$('ml-search-history') || $('ml-search-row');
    if(noticeAnchor) noticeAnchor.insertAdjacentElement('afterend',listNotice);
    else ($('ml-header') || root).appendChild(listNotice);

    const detailNotice=document.createElement('button');
    detailNotice.id='ml-detail-notice';
    detailNotice.type='button';
    detailNotice.setAttribute('aria-label','版权与申请新歌说明');
    detailNotice.innerHTML=noticeHTML;
    ($('ml-detail-dialog')||detail).insertBefore(detailNotice, $('ml-detail-body'));

    const modal=document.createElement('div');
    modal.id='ml-notice-modal';
    modal.innerHTML=`
      <div id="ml-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="ml-notice-modal-title">
        <button id="ml-notice-close" class="ml-motion-close-btn" type="button" aria-label="关闭">${icon('close',20)}</button>
        <div id="ml-notice-kicker">COPYRIGHT NOTICE</div>
        <h2 id="ml-notice-modal-title">诗歌版权与申请新歌</h2>
        <div id="ml-notice-copy">本站所展示之诗歌、歌词、曲谱、音频及相关资料，其著作权及相关权利均归原权利人所有。本站内容仅用于教会内部诗歌练习、学习与敬拜辅助，不以营利为目的。若相关权利人认为本站任何内容涉及侵权，请与我们联系，我们将在核实后及时处理、修改或下架相关内容。</div>
        <div id="ml-notice-sub">需要申请新歌练习可联系 <strong>YuEn</strong>。制作一首歌通常需要约 <strong>1–2 小时</strong>，请尽量提前说明。</div>
        <div id="ml-notice-actions">
          <button class="ml-notice-action is-copy" id="ml-copy-wechat" type="button">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 4C5.36 4 2 6.92 2 10.5c0 2.04 1.06 3.86 2.72 5.08L4 18l2.5-1.25A8.6 8.6 0 0 0 9.5 17c.17 0 .34 0 .5-.01A5.7 5.7 0 0 1 9.5 15c0-3.04 2.69-5.5 6-5.5.17 0 .34 0 .5.01C15.41 6.67 12.73 4 9.5 4zm8 7c-2.76 0-5 1.79-5 4s2.24 4 5 4c.72 0 1.4-.14 2-.38L22 20l-.62-1.86A3.93 3.93 0 0 0 22.5 15c0-2.21-2.24-4-5-4z"/></svg>
            <span class="ml-notice-action-title">复制微信号 YuEn</span>
          </button>
          <button class="ml-notice-action" id="ml-open-ins" type="button">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            <span class="ml-notice-action-title">打开 YuEn 的 Instagram</span>
          </button>
          <button class="ml-notice-action" id="ml-open-church-ins" type="button">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            <span class="ml-notice-action-title">教会青年 Instagram</span>
          </button>
        </div>
      </div>`;
    root.appendChild(modal);

    const toast=document.createElement('div');
    toast.id='ml-toast';
    root.appendChild(toast);

    const refresher=document.createElement('div');
    refresher.id='ml-pull-refresh';
    refresher.setAttribute('aria-live','polite');
    refresher.innerHTML='<span class="ml-pull-spinner"></span><span id="ml-pull-refresh-text">下拉刷新</span>';
    root.appendChild(refresher);

    const mbLyric=$('ml-mb-lyric');
    if(mbLyric) mbLyric.textContent='';
  })();

  initMusicTheme();
  syncHaloTheme();
  observeThemeChanges();
  renderSearchHistory();
  renderQuickFilters();

  let _searchDebounce=0,_lastRenderedQuery=null;
  $('ml-search').addEventListener('input',e=>{
    query=e.target.value.trim();
    updateSearchControls();
    scheduleRememberSearch(query);
    clearTimeout(_searchDebounce);
    _searchDebounce=setTimeout(()=>{
      if(query===_lastRenderedQuery) return;
      _lastRenderedQuery=query;
      render();
    },120);
  });
  $('ml-search').addEventListener('keydown',e=>{
    if(e.key==='Enter') rememberSearchTerm(query);
  });
  $('ml-search-submit')?.addEventListener('click',()=>{
    rememberSearchTerm(query);
    render();
  });
  $('ml-search-clear')?.addEventListener('click',()=>{
    query='';
    const input=$('ml-search');
    if(input){ input.value=''; input.focus(); }
    updateSearchControls();
    render();
  });
  $('ml-back').addEventListener('click',closeDetail);
  $('ml-detail-overlay')?.addEventListener('click',()=>closeDetail());
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape') return;
    if($('ml-lightbox')?.classList.contains('open')){
      $('ml-lightbox').classList.remove('open');
      return;
    }
    if($('ml-playlist-drawer')?.classList.contains('open')){
      _mpSetPlaylistOpen(false);
      return;
    }
    if(detail?.classList.contains('open')){
      closeDetail();
    }
  });
  $('ml-nav-search')?.addEventListener('click',()=>{$('ml-search')?.focus();});
  $('ml-nav-settings')?.addEventListener('click',cycleMusicTheme);
  $('ml-side-profile')?.addEventListener('click',cycleMusicTheme);
  $('ml-weather-pill')?.addEventListener('click',updateWorshipGreeting);
  $('ml-playlist-backdrop')?.addEventListener('click',()=>_mpSetPlaylistOpen(false));
  $('ml-playlist-close')?.addEventListener('click',()=>_mpSetPlaylistOpen(false));
  $('ml-playlist-clear')?.addEventListener('click',_mpClearQueue);
  root.querySelectorAll('[data-nav]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const nav=e.currentTarget.dataset.nav;
      if(nav) handleNav(nav);
    });
  });
  $('ml-detail-favorite')?.addEventListener('click',()=>{
    const song=songs.find(s=>s.id===_activeDetailSongId);
    if(song) toggleFavorite(song);
  });
  $('ml-detail-service')?.addEventListener('click',()=>{
    const song=songs.find(s=>s.id===_activeDetailSongId);
    if(song) toggleServiceUsed(song);
  });
  $('ml-detail-more')?.addEventListener('click',()=>{
    const song=songs.find(s=>s.id===_activeDetailSongId);
    if(song) shareSong(song);
  });
  bindWorshipPicksEffects();
  updateWorshipGreeting();
  setInterval(updateWorshipGreeting,60000);
  $('ml-nav-theme')?.addEventListener('click',cycleMusicTheme);

  function showToast(text){
    const t=$('ml-toast');
    if(!t) return;
    t.textContent=text;
    t.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer=setTimeout(()=>t.classList.remove('show'),1800);
  }

  function attachPullToRefresh(){
    const indicator=$('ml-pull-refresh');
    const label=$('ml-pull-refresh-text');
    if(!indicator||!label) return;
    let startY=0,pull=0,tracking=false,ready=false;
    const maxPull=104,threshold=72;
    function isBlockedTarget(target){
      if(_pullRefreshing) return true;
      if(detail?.classList.contains('open')) return true;
      if($('ml-notice-modal')?.classList.contains('open')) return true;
      if($('ml-lightbox')?.classList.contains('open')) return true;
      if($('ml-player-view')?.classList.contains('is-open')) return true;
      if(target.closest('input,textarea,select,button,a,[contenteditable="true"],#ml-nowbar,#ml-miniplayer')) return true;
      return false;
    }
    function reset(){
      tracking=false; ready=false; pull=0;
      indicator.classList.remove('ready','pulling');
      indicator.style.transform='';
      label.textContent='下拉刷新';
    }
    function finish(text){
      label.textContent=text;
      setTimeout(()=>{
        _pullRefreshing=false;
        indicator.classList.remove('refreshing');
        reset();
      },650);
    }
    async function refresh(){
      _pullRefreshing=true;
      indicator.classList.remove('ready','pulling');
      indicator.classList.add('refreshing');
      indicator.style.transform='translate(-50%,18px)';
      label.textContent='正在刷新';
      try{
        if(navigator.serviceWorker?.getRegistration){
          const reg=await navigator.serviceWorker.getRegistration();
          await reg?.update?.();
        }
        await loadSongs({refresh:true});
        finish('已刷新');
      }catch(_){
        finish('刷新失败');
        showToast('刷新失败，请稍后重试');
      }
    }
    root.addEventListener('touchstart',e=>{
      if(isBlockedTarget(e.target)) return;
      if(root.scrollTop>2) return;
      const t=e.touches&&e.touches[0];
      if(!t) return;
      startY=t.clientY; pull=0; tracking=true; ready=false;
    },{passive:true});
    root.addEventListener('touchmove',e=>{
      if(!tracking) return;
      const t=e.touches&&e.touches[0];
      if(!t) return;
      const dy=t.clientY-startY;
      if(dy<=0){ reset(); return; }
      if(root.scrollTop>2){ reset(); return; }
      pull=Math.min(maxPull,dy*0.46);
      ready=pull>=threshold;
      indicator.classList.add('pulling');
      indicator.classList.toggle('ready',ready);
      indicator.style.transform=`translate(-50%,${Math.max(0,pull-46)}px)`;
      label.textContent=ready?'松开刷新':'下拉刷新';
      if(pull>8) e.preventDefault();
    },{passive:false});
    const end=()=>{
      if(!tracking) return;
      if(ready) refresh();
      else reset();
    };
    root.addEventListener('touchend',end,{passive:true});
    root.addEventListener('touchcancel',reset,{passive:true});
  }

  async function copyText(text, msg){
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
      }else{
        const ta=document.createElement('textarea');
        ta.value=text;
        ta.setAttribute('readonly','');
        ta.style.cssText='position:fixed;left:-9999px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      showToast(msg||'已复制');
    }catch(_){
      showToast('复制失败，请手动复制');
    }
  }

  function openNoticeModal(){
    $('ml-notice-modal')?.classList.add('open');
    document.body.style.overflow='hidden';
  }
  function closeNoticeModal(){
    $('ml-notice-modal')?.classList.remove('open');
    document.body.style.overflow='';
  }

  $('ml-contact').addEventListener('click',()=>copyText(WECHAT,'微信号已复制'));
  $('ml-notice')?.addEventListener('click',openNoticeModal);
  $('ml-detail-notice')?.addEventListener('click',openNoticeModal);
  $('ml-copy-wechat')?.addEventListener('click',()=>copyText(WECHAT,'微信号已复制'));
  $('ml-open-ins')?.addEventListener('click',()=>window.open('https://www.instagram.com/_yuen0129/','_blank','noopener'));
  $('ml-open-church-ins')?.addEventListener('click',()=>window.open('https://www.instagram.com/cecp.it_youth/','_blank','noopener'));
  $('ml-notice-close')?.addEventListener('click',closeNoticeModal);
  $('ml-notice-modal')?.addEventListener('click',e=>{ if(e.target===e.currentTarget) closeNoticeModal(); });

  let _lightboxImages=[],_lightboxIndex=0,_lightboxZoom=false;
  $('ml-lightbox').addEventListener('click',e=>{
    if(e.target===e.currentTarget||(e.target.closest&&e.target.closest('#ml-lightbox-close'))) $('ml-lightbox').classList.remove('open');
  });
  $('ml-lightbox-img').addEventListener('click',e=>e.stopPropagation());
  $('ml-lightbox-img').addEventListener('dblclick',()=>{
    _lightboxZoom=!_lightboxZoom;
    $('ml-lightbox').classList.toggle('is-zoomed',_lightboxZoom);
  });
  $('ml-lightbox-prev')?.addEventListener('click',e=>{ e.stopPropagation(); showLightboxImage(_lightboxIndex-1); });
  $('ml-lightbox-next')?.addEventListener('click',e=>{ e.stopPropagation(); showLightboxImage(_lightboxIndex+1); });
  $('ml-lightbox-reset')?.addEventListener('click',e=>{ e.stopPropagation(); _lightboxZoom=false; $('ml-lightbox').classList.remove('is-zoomed'); });

  function showLightboxImage(index){
    if(!_lightboxImages.length) return;
    _lightboxIndex=(index+_lightboxImages.length)%_lightboxImages.length;
    const src=_lightboxImages[_lightboxIndex];
    const img=$('ml-lightbox-img');
    img.src=src;
    img.alt='原始图片谱 '+(_lightboxIndex+1);
    $('ml-lightbox-count').textContent=(_lightboxIndex+1)+' / '+_lightboxImages.length;
    $('ml-lightbox-open').href=src;
    $('ml-lightbox-prev').hidden=_lightboxImages.length<=1;
    $('ml-lightbox-next').hidden=_lightboxImages.length<=1;
  }

  function openLightbox(src,list){
    _lightboxImages=(Array.isArray(list)&&list.length?list:[src]).filter(Boolean);
    _lightboxIndex=Math.max(0,_lightboxImages.indexOf(src));
    _lightboxZoom=false;
    $('ml-lightbox').classList.remove('is-zoomed');
    showLightboxImage(_lightboxIndex);
    $('ml-lightbox').classList.add('open');
  }

  function getSongIdFromUrl(){
    try{
      const u=new URL(location.href);
      return u.searchParams.get('song')||'';
    }catch(_){
      return '';
    }
  }

  function buildSongUrl(songId){
    try{
      const u=new URL(location.href);
      if(songId) u.searchParams.set('song', songId);
      else u.searchParams.delete('song');
      return u.toString();
    }catch(_){
      return location.href;
    }
  }

  function setSongUrl(songId, replaceOnly=true){
    try{
      const nextUrl=buildSongUrl(songId);
      const nextState=Object.assign({}, history.state||{}, {
        __mlSongId: songId||'',
        __mlDetail: !!songId
      });
      (replaceOnly?history.replaceState:history.pushState).call(history, nextState, '', nextUrl);
    }catch(_){ }
  }

  function shareSong(song){
    const urlText=buildSongUrl(song.id);
    const title=song.title||'诗歌';
    if(navigator.share){
      navigator.share({ title, url:urlText }).then(()=>{
        showToast('分享成功');
      }).catch(()=>{
        copyText(urlText,'链接已复制');
      });
    }else{
      copyText(urlText,'链接已复制');
    }
  }

  function safeFileName(name){
    return String(name||'song')
      .trim()
      .replace(/[\\/:*?"<>|]+/g,'-')
      .replace(/\s+/g,'_')
      .replace(/\.+$/,'')
      .slice(0,80) || 'song';
  }

  function esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  let _h2cPromise=null;
  function loadHtml2Canvas(){
    if(window.html2canvas) return Promise.resolve(window.html2canvas);
    if(_h2cPromise) return _h2cPromise;
    _h2cPromise=new Promise((resolve,reject)=>{
      const inject=(src,next)=>{
        const s=document.createElement('script');
        s.src=src;
        s.async=true;
        s.onload=()=>{
          if(window.html2canvas) resolve(window.html2canvas);
          else if(next) inject(next,null);
          else reject(new Error('html2canvas unavailable'));
        };
        s.onerror=()=>{
          s.remove();
          if(next) inject(next,null);
          else reject(new Error('html2canvas load failed'));
        };
        document.head.appendChild(s);
      };
      inject(
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
      );
    });
    return _h2cPromise;
  }

  function canvasToPngBlob(canvas){
    return new Promise((resolve,reject)=>{
      if(canvas.toBlob){
        canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('png conversion failed')),'image/png');
      }else{
        try{
          const dataUrl=canvas.toDataURL('image/png');
          const bin=atob(dataUrl.split(',')[1]||'');
          const arr=new Uint8Array(bin.length);
          for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
          resolve(new Blob([arr],{type:'image/png'}));
        }catch(err){ reject(err); }
      }
    });
  }

  function parseRgba(str){
    const m=String(str||'').match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if(!m) return null;
    return {r:+m[1],g:+m[2],b:+m[3],a:(m[4]===undefined?1:+m[4])};
  }

  function resolveExportBackground(node,preferred){
    if(preferred) return preferred;
    let cur=node;
    while(cur&&cur.nodeType===1){
      const c=getComputedStyle(cur).backgroundColor;
      const p=parseRgba(c);
      if(p&&p.a>0.98) return c;
      cur=cur.parentElement;
    }
    const bodyBg=getComputedStyle(document.body||document.documentElement).backgroundColor;
    const bp=parseRgba(bodyBg);
    if(bp&&bp.a>0.2) return bodyBg;
    return '#ffffff';
  }

  function nodeToPngBlobByHtml2Canvas(node,bgColor,opts){
    return loadHtml2Canvas()
      .then(html2canvas=>{
        const dpr=Math.max(1,window.devicePixelRatio||1);
        const scale=(opts&&isFinite(opts.scale)&&opts.scale>0)?opts.scale:Math.min(2,dpr);
        return html2canvas(node,{
          backgroundColor:bgColor||'#ffffff',
          scale,
          foreignObjectRendering:false,
          useCORS:true,
          logging:false
        });
      })
      .then(canvasToPngBlob);
  }

  function cloneWithComputedStyle(node){
    const cloned=node.cloneNode(true);
    const sync=(src,dst)=>{
      if(!src||!dst) return;
      if(src.nodeType===1&&dst.nodeType===1){
        const cs=getComputedStyle(src);
        for(let i=0;i<cs.length;i++){
          const prop=cs[i];
          dst.style.setProperty(prop,cs.getPropertyValue(prop),cs.getPropertyPriority(prop));
        }
      }
      const sKids=src.childNodes||[];
      const dKids=dst.childNodes||[];
      for(let k=0;k<sKids.length;k++){
        if(dKids[k]) sync(sKids[k],dKids[k]);
      }
    };
    sync(node,cloned);
    return cloned;
  }

  function nodeToPngBlob(node,bgColor){
    return new Promise((resolve,reject)=>{
      if(!node){ reject(new Error('empty node')); return; }
      const rect=node.getBoundingClientRect();
      const width=Math.max(1,Math.ceil(rect.width));
      const height=Math.max(1,Math.ceil(rect.height));
      const snap=cloneWithComputedStyle(node);
      snap.style.width=width+'px';
      snap.style.maxWidth='none';
      const html=new XMLSerializer().serializeToString(snap);
      const bg=bgColor||'transparent';
      const foreign=[
        `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:${bg};">`,
        html,
        '</div>'
      ].join('');
      const svg=[
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<foreignObject width="100%" height="100%">${foreign}</foreignObject>`,
        '</svg>'
      ].join('');
      const svgBlob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
      const svgUrl=URL.createObjectURL(svgBlob);
      const img=new Image();
      img.onload=()=>{
        URL.revokeObjectURL(svgUrl);
        const maxSide=4096;
        let scale=Math.min(2,maxSide/width,maxSide/height);
        if(!isFinite(scale)||scale<=0) scale=1;
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(width*scale));
        canvas.height=Math.max(1,Math.round(height*scale));
        const ctx=canvas.getContext('2d');
        if(!ctx){ reject(new Error('canvas unavailable')); return; }
        if(bg!=='transparent'){ ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height); }
        ctx.setTransform(scale,0,0,scale,0,0);
        ctx.drawImage(img,0,0,width,height);
        canvasToPngBlob(canvas).then(resolve).catch(reject);
      };
      img.onerror=()=>{
        URL.revokeObjectURL(svgUrl);
        reject(new Error('svg render failed'));
      };
      img.src=svgUrl;
    });
  }

  function nodeToPngBlobByTextFallback(node,bgColor){
    return new Promise((resolve,reject)=>{
      try{
        const entries=[];
        const secs=node.querySelectorAll('.sw-lsec');
        secs.forEach(sec=>{
          let secName=(sec.querySelector('.sw-lsec-name')||{}).textContent||'';
          secName=secName.replace(/\s+/g,' ').trim();
          if(secName) entries.push({type:'sec',text:`[${secName}]`});
          sec.querySelectorAll('.sw-lrow').forEach(row=>{
            let chordLine='';
            let jianpuLine='';
            let lyricLine='';
            row.querySelectorAll('.prev-seg').forEach(seg=>{
              const chord=((seg.querySelector('.p-chord')||{}).textContent||'').replace(/\u00a0/g,' ');
              const jianpu=((seg.querySelector('.p-n')||{}).textContent||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
              const lyric=((seg.querySelector('.p-lyric')||{}).textContent||'').replace(/\u00a0/g,' ');
              chordLine+=(chord||' ')+'  ';
              jianpuLine+=(jianpu||' ')+'  ';
              lyricLine+=(lyric||' ')+'  ';
            });
            if(chordLine.trim()) entries.push({type:'chord',text:chordLine.trimEnd()});
            if(jianpuLine.trim()) entries.push({type:'jianpu',text:jianpuLine.trimEnd()});
            if(lyricLine.trim()) entries.push({type:'lyric',text:lyricLine.trimEnd()});
          });
          entries.push({type:'gap',text:''});
        });
        if(!entries.length) entries.push({type:'sec',text:'[Transpose]'});

        const toLuma=color=>{
          const c=String(color||'').trim().toLowerCase();
          let r=255,g=255,b=255,m=null;
          m=c.match(/^#([0-9a-f]{3})$/i);
          if(m){
            r=parseInt(m[1].charAt(0)+m[1].charAt(0),16);
            g=parseInt(m[1].charAt(1)+m[1].charAt(1),16);
            b=parseInt(m[1].charAt(2)+m[1].charAt(2),16);
            return 0.2126*r+0.7152*g+0.0722*b;
          }
          m=c.match(/^#([0-9a-f]{6})$/i);
          if(m){
            r=parseInt(m[1].slice(0,2),16);
            g=parseInt(m[1].slice(2,4),16);
            b=parseInt(m[1].slice(4,6),16);
            return 0.2126*r+0.7152*g+0.0722*b;
          }
          m=c.match(/^rgba?\(([^)]+)\)$/i);
          if(m){
            const parts=m[1].split(',');
            if(parts.length>=3){
              r=parseFloat(parts[0])||0;
              g=parseFloat(parts[1])||0;
              b=parseFloat(parts[2])||0;
            }
          }
          return 0.2126*r+0.7152*g+0.0722*b;
        };
        const isDarkBg=toLuma(bgColor||'#ffffff')<140;

        const fontFor=type=>{
          if(type==='sec') return '700 18px "Noto Serif SC","PingFang SC",serif';
          if(type==='jianpu') return '700 18px "Space Mono","DM Mono",monospace';
          if(type==='lyric') return '500 19px "Noto Serif SC","PingFang SC",serif';
          return '700 14px "Space Mono","DM Mono",monospace';
        };
        const lhFor=type=>{
          if(type==='sec') return 30;
          if(type==='jianpu') return 26;
          if(type==='lyric') return 28;
          if(type==='gap') return 14;
          return 24;
        };
        const colorFor=type=>{
          if(type==='sec') return isDarkBg ? '#a6b3cf' : '#8a5a3b';
          if(type==='lyric'||type==='jianpu') return isDarkBg ? '#e5e7eb' : '#2d2a26';
          return isDarkBg ? '#f59e0b' : '#c2410c';
        };

        const pad=26;
        const measure=document.createElement('canvas').getContext('2d');
        let maxW=0,totalH=pad*2;
        entries.forEach(e=>{
          measure.font=fontFor(e.type);
          const w=measure.measureText(e.text||' ').width;
          if(w>maxW) maxW=w;
          totalH+=lhFor(e.type);
        });

        const canvas=document.createElement('canvas');
        canvas.width=Math.max(720,Math.ceil(maxW+pad*2));
        canvas.height=Math.max(480,Math.ceil(totalH));
        const ctx=canvas.getContext('2d');
        if(!ctx){ reject(new Error('canvas unavailable')); return; }
        ctx.fillStyle=bgColor||'#ffffff';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        let y=pad;
        entries.forEach(e=>{
          ctx.font=fontFor(e.type);
          ctx.fillStyle=colorFor(e.type);
          ctx.textBaseline='top';
          ctx.fillText(e.text||'',pad,y);
          y+=lhFor(e.type);
        });
        canvasToPngBlob(canvas).then(resolve).catch(reject);
      }catch(err){ reject(err); }
    });
  }

  function nodeToPngBlobRobust(node,bgColor,opts){
    return nodeToPngBlobByHtml2Canvas(node,bgColor,opts).catch(primaryErr=>{
      try{ console.warn('[musiclib] html2canvas export failed, fallback to svg',primaryErr); }catch(_){}
      return nodeToPngBlob(node,bgColor).catch(secondErr=>{
        try{ console.warn('[musiclib] svg export failed, fallback to text canvas',secondErr); }catch(_){}
        return nodeToPngBlobByTextFallback(node,bgColor);
      });
    });
  }

  function saveBlobAs(blob,filename){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),800);
  }

  function withExportJpFix(scope,work){
    const touched=[];
    const setStyle=(el,prop,val,pri='')=>{
      touched.push([el,prop,el.style.getPropertyValue(prop),el.style.getPropertyPriority(prop)]);
      el.style.setProperty(prop,val,pri);
    };
    const styleUnderlineLine=(line,isU2)=>{
      setStyle(line,'display','block');
      setStyle(line,'position','absolute');
      setStyle(line,'left','0');
      setStyle(line,'right','0');
      setStyle(line,'bottom',isU2?'0':'3px');
      setStyle(line,'height','1.5px');
      setStyle(line,'background','currentColor');
      setStyle(line,'margin-top','0');
      setStyle(line,'align-self','auto');
      setStyle(line,'pointer-events','none');
      setStyle(line,'z-index','1');
    };
    const addTempLine=(wrap,isU2,beforeNode)=>{
      const ln=document.createElement('span');
      ln.className=isU2?'jp-u2-line':'jp-u1-line';
      ln.setAttribute('data-export-temp-line','1');
      wrap.insertBefore(ln,beforeNode||null);
      return ln;
    };
    const nextPaint=()=>new Promise(resolve=>{
      requestAnimationFrame(()=>requestAnimationFrame(resolve));
    });

    // If legacy renderer left border-bottom on number row, convert it to underline element for export.
    scope.querySelectorAll('.jp-lines-wrap').forEach(wrap=>{
      const row=wrap.querySelector('.jp-num-row');
      if(!row) return;
      const cs=getComputedStyle(row);
      const hadBorder=(parseFloat(cs.borderBottomWidth||'0')>0)&&(cs.borderBottomStyle!=='none');
      const hasU1=!!wrap.querySelector('.jp-u1-line');
      if(hadBorder && !hasU1){
        const beforeU2=wrap.querySelector('.jp-u2-line');
        addTempLine(wrap,false,beforeU2||null);
      }
    });

    scope.querySelectorAll('.jp-num-row').forEach(row=>{
      setStyle(row,'padding-bottom','8px');
      setStyle(row,'border-bottom','none');
      setStyle(row,'min-height','1.15em');
      setStyle(row,'display','inline-flex');
      setStyle(row,'align-items','center');
      setStyle(row,'justify-content','center');
    });
    scope.querySelectorAll('.jp-num').forEach(num=>{
      setStyle(num,'line-height','1');
      setStyle(num,'display','inline-block');
      setStyle(num,'vertical-align','baseline');
    });
    scope.querySelectorAll('.jp-plain-sym.is-dash').forEach(d=>{
      setStyle(d,'top','-0.08em');
      setStyle(d,'height','1em');
      setStyle(d,'display','inline-flex');
      setStyle(d,'align-items','center');
      setStyle(d,'justify-content','center');
      setStyle(d,'line-height','1');
      setStyle(d,'font-size','19px');
      setStyle(d,'transform','none');
    });
    scope.querySelectorAll('.jp-aug').forEach(a=>{
      setStyle(a,'top','50%');
      setStyle(a,'transform','translateY(-50%)');
      setStyle(a,'right','-0.46em');
      setStyle(a,'line-height','1');
      setStyle(a,'display','inline-block');
    });
    scope.querySelectorAll('.jp-u1-line,.jp-u2-line').forEach(line=>{
      styleUnderlineLine(line,line.classList.contains('jp-u2-line'));
    });

    return nextPaint()
      .then(work)
      .finally(()=>{
        for(let i=touched.length-1;i>=0;i--){
          const [el,prop,old,pri]=touched[i];
          if(old) el.style.setProperty(prop,old,pri||'');
          else el.style.removeProperty(prop);
        }
        scope.querySelectorAll('[data-export-temp-line="1"]').forEach(n=>n.remove());
      });
  }

  function buildExportClone(panelInner,opt={}){
    const rect=panelInner.getBoundingClientRect();
    const mount=(panelInner&&panelInner.closest&&panelInner.closest('#music-library')) || document.body;
    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none;';
    const clone=panelInner.cloneNode(true);
    if(opt.tight){
      clone.style.display='inline-block';
      clone.style.width='max-content';
      clone.style.minWidth='0';
    }else{
      clone.style.width=Math.max(1,Math.ceil(rect.width))+'px';
    }
    clone.style.maxWidth='none';
    clone.style.margin='0';
    clone.style.transform='none';
    host.appendChild(clone);
    mount.appendChild(host);
    if(opt.tight){
      const tightW=Math.max(1,Math.ceil(clone.scrollWidth||rect.width||0));
      clone.style.width=tightW+'px';
    }
    return {
      node:clone,
      cleanup:()=>host.remove()
    };
  }

  function loadImageForExport(src){
    return new Promise(resolve=>{
      if(!src){ resolve(null); return; }
      const img=new Image();
      img.crossOrigin='anonymous';
      img.onload=()=>resolve(img);
      img.onerror=()=>{
        const fallback=new Image();
        fallback.onload=()=>resolve(fallback);
        fallback.onerror=()=>resolve(null);
        fallback.src=src;
      };
      img.src=src;
    });
  }

  function blobToImage(blob){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(blob);
      const img=new Image();
      img.onload=()=>{ URL.revokeObjectURL(url); resolve(img); };
      img.onerror=err=>{ URL.revokeObjectURL(url); reject(err); };
      img.src=url;
    });
  }

  function makeExportTextBlack(scope){
    if(!scope||!scope.querySelectorAll) return;
    if(!scope.querySelector('[data-export-symbol-fix="1"]')){
      const style=document.createElement('style');
      style.setAttribute('data-export-symbol-fix','1');
      style.textContent=[
        '.jp-slur,.jp-slur-open,.jp-slur-close,.jp-tuplet{padding-top:22px!important;overflow:visible!important;}',
        '.jp-slur::before{top:3px!important;left:12%!important;right:12%!important;height:11px!important;border-top:2.4px solid #111!important;border-left:2.4px solid #111!important;border-right:2.4px solid #111!important;background:transparent!important;z-index:2!important;}',
        '.jp-slur-open::before{top:3px!important;left:12%!important;right:-4px!important;height:11px!important;border-top:2.4px solid #111!important;border-left:2.4px solid #111!important;background:transparent!important;z-index:2!important;}',
        '.jp-slur-close::before{top:3px!important;left:-4px!important;right:12%!important;height:11px!important;border-top:2.4px solid #111!important;border-right:2.4px solid #111!important;background:transparent!important;z-index:2!important;}',
        '.jp-tuplet-br{top:3px!important;left:2px!important;right:2px!important;height:11px!important;border-top:2.4px solid #111!important;border-left:2.4px solid #111!important;border-right:2.4px solid #111!important;background:transparent!important;z-index:1!important;}',
        '.jp-tuplet-num{top:-4px!important;font-size:10px!important;line-height:1!important;padding:0 5px!important;background:#fff!important;color:#111!important;-webkit-text-fill-color:#111!important;z-index:4!important;}'
      ].join('\n');
      scope.insertBefore(style,scope.firstChild);
    }
    const nodes=[scope].concat(Array.from(scope.querySelectorAll('*')));
    nodes.forEach(n=>{
      if(!n.style) return;
      n.style.setProperty('color','#111','important');
      n.style.setProperty('-webkit-text-fill-color','#111','important');
      n.style.setProperty('border-color','#111','important');
      n.style.setProperty('text-shadow','none','important');
    });
    scope.querySelectorAll('.jp-u1-line,.jp-u2-line,.jp-dash-line').forEach(n=>{
      n.style.setProperty('background','#111','important');
    });
  }

  function composeA4SongImage(scoreBlob,opt={}){
    return Promise.all([blobToImage(scoreBlob),loadImageForExport(LOGO_SRC)]).then(([scoreImg,logoImg])=>{
      const W=2000,H=2828;
      const canvas=document.createElement('canvas');
      canvas.width=W; canvas.height=H;
      const ctx=canvas.getContext('2d');
      if(!ctx) throw new Error('canvas unavailable');
      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,W,H);

      const song=opt.song||{};
      const title=song.title||opt.title||'';
      const subtitle=[song.artist,song.sub].filter(Boolean).join('  ');
      const leftLines=[song.bpm?'♪ = '+song.bpm:'','1= '+(opt.key||song.origKey||'C')+'  '+(song.timeSign||'4/4')].filter(Boolean);

      ctx.fillStyle='#111';
      ctx.textBaseline='top';
      ctx.font='600 24px "DM Mono","Space Mono",monospace';
      leftLines.forEach((line,i)=>ctx.fillText(line,260,130+i*34));
      ctx.textAlign='center';
      ctx.font='900 38px "Noto Serif SC","Songti SC","PingFang SC",serif';
      ctx.fillText(title,W/2,128);
      if(subtitle){
        ctx.font='500 22px "Noto Serif SC","Songti SC","PingFang SC",serif';
        ctx.fillText(subtitle,W/2,182);
      }
      ctx.textAlign='left';

      const area={x:150,y:250,w:1700,h:2460};
      const scale=Math.min(area.w/scoreImg.width,area.h/scoreImg.height);
      const drawW=scoreImg.width*scale;
      const drawH=scoreImg.height*scale;
      const drawX=area.x+(area.w-drawW)/2;
      const drawY=area.y;
      ctx.drawImage(scoreImg,drawX,drawY,drawW,drawH);

      if(logoImg){
        const logoW=1180;
        const logoH=logoW*(logoImg.naturalHeight||logoImg.height)/(logoImg.naturalWidth||logoImg.width);
        ctx.save();
        ctx.globalAlpha=0.07;
        ctx.drawImage(logoImg,(W-logoW)/2,(H-logoH)/2,logoW,logoH);
        ctx.restore();
      }
      return canvasToPngBlob(canvas);
    });
  }

  function normalizeExportNotation(scope){
    if(!scope||!scope.querySelectorAll) return;
    scope.querySelectorAll('.jp-lines-wrap').forEach(wrap=>{
      wrap.style.position='relative';
      wrap.style.paddingBottom='12px';
      wrap.style.overflow='visible';

      const row=wrap.querySelector('.jp-num-row');
      if(!row) return;
      const cs=getComputedStyle(row);
      const hadBorder=(parseFloat(cs.borderBottomWidth||'0')>0)&&(cs.borderBottomStyle!=='none');
      row.style.borderBottom='none';
      row.style.paddingBottom='0';
      row.style.minHeight='1.15em';
      row.style.display='inline-flex';
      row.style.alignItems='center';
      row.style.justifyContent='center';

      if(hadBorder && !wrap.querySelector('.jp-u1-line')){
        const ul=document.createElement('span');
        ul.className='jp-u1-line';
        wrap.appendChild(ul);
      }

      wrap.querySelectorAll('.jp-u1-line,.jp-u2-line').forEach(line=>{
        line.style.display='block';
        line.style.position='absolute';
        line.style.left='0';
        line.style.right='0';
        line.style.bottom=line.classList.contains('jp-u2-line')?'0':'4px';
        line.style.height='1.5px';
        line.style.background='currentColor';
        line.style.margin='0';
        line.style.pointerEvents='none';
      });
    });

    scope.querySelectorAll('.jp-num').forEach(num=>{
      num.style.lineHeight='1';
      num.style.display='inline-block';
      num.style.verticalAlign='baseline';
      num.style.height='1em';
      num.style.position='relative';
      num.style.top='-0.12em';
    });
    scope.querySelectorAll('.jp-plain-sym.is-dash').forEach(d=>{
      d.style.position='relative';
      d.style.top='-0.12em';
      d.style.height='1em';
      d.style.display='inline-flex';
      d.style.alignItems='center';
      d.style.justifyContent='center';
      d.style.lineHeight='1';
      d.style.fontSize='19px';
      d.style.transform='none';
      d.style.overflow='visible';
      let dashLine=d.querySelector('.jp-dash-line');
      if(!dashLine){
        dashLine=document.createElement('span');
        dashLine.className='jp-dash-line';
        d.textContent='';
        d.appendChild(dashLine);
      }
      styleJpDashLineEl(dashLine);
    });
    scope.querySelectorAll('.jp-aug').forEach(a=>{
      a.style.position='absolute';
      a.style.top='50%';
      a.style.right='-0.46em';
      a.style.transform='translateY(-50%)';
      a.style.lineHeight='1';
      a.style.display='inline-block';
    });
  }

  function waitPaint2(){
    return new Promise(resolve=>{
      requestAnimationFrame(()=>requestAnimationFrame(resolve));
    });
  }

  function exportTransposePanel(panelInner,opt={}){
    if(!panelInner) return Promise.reject(new Error('panel missing'));
    const bg=resolveExportBackground(panelInner,opt.bgColor);
    const waitFonts=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
    return waitFonts
      .then(()=>{
        const snap=buildExportClone(panelInner,{tight:!!opt.tight});
        if(opt.hideTransposeOptions){
          const keyZone=snap.node.querySelector('.sw-ks');
          if(keyZone) keyZone.remove();
        }
        normalizeExportNotation(snap.node);
        if(opt.a4) makeExportTextBlack(snap.node);
        lyricHlPrepareExport(snap.node);
        if(opt.a4) snap.node.style.setProperty('background','#ffffff','important');
        return waitPaint2()
          .then(()=>nodeToPngBlobRobust(snap.node,bg))
          .then(blob=>opt.a4?composeA4SongImage(blob,opt):blob)
          .finally(()=>snap.cleanup());
      })
      .then(blob=>{
        const base=safeFileName(opt.title||'transpose');
        const key=safeFileName(opt.key||'');
        const filename=base+(key?('_'+key):'')+'.png';
        saveBlobAs(blob,filename);
      });
  }


  /* ══════════ 单图导出：整首缩放进一张固定尺寸 PNG（纯白底） ══════════
     取代此前的「A4 分页多页 PDF」方案，核心规则：
     - 只输出一张 PNG，默认 A4 竖版基准（2000x2828，1:1.414）；
     - 不做「先截原尺寸长图再缩小贴上」（位图降采样会发虚），而是把
       目标缩放比例直接交给 html2canvas 的 scale 渲染参数，文字按
       最终尺寸矢量光栅化，缩小后依然清晰；
     - 最小可读字号下限：歌词在成图里的字高不低于 minLyricPx
       （24px，约合 A4 打印 9pt）。竖版压到下限仍放不下时，不再继续
       压小，而改用 A4 横版（2828x2000）+ 歌词区双栏排版，用宽度换
       高度；双栏断点由 CSS break-inside 控制，只落在整行之间；
       宽度上限即横版双栏，不再进一步拉宽；
     - 背景永远纯白 #ffffff，不跟随深浅主题；导出前把荧光笔标记
       内联为白底可辨的实色（lyricHlPrepareExport）。
     resolveExportBackground 不再参与本路径，仅保留给旧版
     exportTransposePanel 兜底（该路径调用方也固定传白底）。 */
  const EXPORT_FIT={
    portrait:{W:2000,H:2828},
    landscape:{W:2828,H:2000},
    headerH:250,bottomH:118,sideM:150,
    minLyricPx:24,maxScale:2.6
  };
  function exportMeasureLyricFont(scope){
    const el=scope.querySelector('.p-lyric');
    if(!el)return 19;
    const fs=parseFloat(getComputedStyle(el).fontSize);
    return isFinite(fs)&&fs>0?fs:19;
  }
  function exportApplyTwoColumns(clone,baseW){
    const st=document.createElement('style');
    st.setAttribute('data-export-columns','1');
    st.textContent='.sw-lline{break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}.sw-lsec{break-inside:auto;}';
    clone.insertBefore(st,clone.firstChild);
    clone.style.columnCount='2';
    clone.style.columnGap='64px';
    clone.style.columnFill='balance';
    clone.style.width=Math.ceil(baseW*2+64)+'px';
  }
  function composeFittedSongImage(scoreBlob,opt,page){
    return Promise.all([blobToImage(scoreBlob),loadImageForExport(LOGO_SRC)]).then(([scoreImg,logoImg])=>{
      const W=page.W,H=page.H;
      const canvas=document.createElement('canvas');
      canvas.width=W;canvas.height=H;
      const ctx=canvas.getContext('2d');
      if(!ctx)throw new Error('canvas unavailable');
      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,W,H);
      const song=opt.song||{};
      const title=song.title||opt.title||'';
      const subtitle=[song.artist,song.sub].filter(Boolean).join('  ');
      const leftLines=[song.bpm?'♪ = '+song.bpm:'','1= '+(opt.key||song.origKey||'C')+'  '+(song.timeSign||'4/4')].filter(Boolean);
      ctx.fillStyle='#111';
      ctx.textBaseline='top';
      ctx.font='600 24px "DM Mono","Space Mono",monospace';
      leftLines.forEach((line,i)=>ctx.fillText(line,260,130+i*34));
      ctx.textAlign='center';
      ctx.font='900 38px "Noto Serif SC","Songti SC","PingFang SC",serif';
      ctx.fillText(title,W/2,128);
      if(subtitle){
        ctx.font='500 22px "Noto Serif SC","Songti SC","PingFang SC",serif';
        ctx.fillText(subtitle,W/2,182);
      }
      ctx.textAlign='left';
      const area={x:EXPORT_FIT.sideM,y:EXPORT_FIT.headerH,w:W-EXPORT_FIT.sideM*2,h:H-EXPORT_FIT.headerH-EXPORT_FIT.bottomH};
      // 正常路径下截图已按目标比例渲染，s≈1（无重采样）；
      // 命中 SVG/文本兜底渲染时尺寸不同，此处兜底缩放到适配。
      const s=Math.min(area.w/scoreImg.width,area.h/scoreImg.height,1.001);
      const drawW=scoreImg.width*s,drawH=scoreImg.height*s;
      ctx.drawImage(scoreImg,area.x+(area.w-drawW)/2,area.y,drawW,drawH);
      if(logoImg){
        const logoW=1180;
        const logoH=logoW*(logoImg.naturalHeight||logoImg.height)/(logoImg.naturalWidth||logoImg.width);
        ctx.save();
        ctx.globalAlpha=0.07;
        ctx.drawImage(logoImg,(W-logoW)/2,(H-logoH)/2,logoW,logoH);
        ctx.restore();
      }
      return canvasToPngBlob(canvas);
    });
  }
  function exportSongAsFittedPng(panelInner,opt={}){
    if(!panelInner)return Promise.reject(new Error('panel missing'));
    const waitFonts=(document.fonts&&document.fonts.ready)?document.fonts.ready:Promise.resolve();
    const keyPart=safeFileName(opt.key||'');
    const stem=safeFileName(opt.title||'transpose')+(keyPart?('_'+keyPart):'');
    return waitFonts.then(()=>{
      const snap=buildExportClone(panelInner,{tight:!!opt.tight});
      if(opt.hideTransposeOptions){
        const keyZone=snap.node.querySelector('.sw-ks');
        if(keyZone) keyZone.remove();
      }
      normalizeExportNotation(snap.node);
      makeExportTextBlack(snap.node);
      lyricHlPrepareExport(snap.node);
      snap.node.style.setProperty('background','#ffffff','important');
      return waitPaint2()
        .then(()=>{
          const r1=snap.node.getBoundingClientRect();
          const cw=Math.max(1,r1.width),ch=Math.max(1,r1.height);
          const lyricPx=exportMeasureLyricFont(snap.node);
          const P=EXPORT_FIT.portrait;
          const sPort=Math.min(
            (P.W-EXPORT_FIT.sideM*2)/cw,
            (P.H-EXPORT_FIT.headerH-EXPORT_FIT.bottomH)/ch,
            EXPORT_FIT.maxScale
          );
          if(sPort*lyricPx>=EXPORT_FIT.minLyricPx){
            return nodeToPngBlobRobust(snap.node,'#ffffff',{scale:sPort}).then(blob=>({blob,page:P}));
          }
          exportApplyTwoColumns(snap.node,cw);
          return waitPaint2().then(()=>{
            const r2=snap.node.getBoundingClientRect();
            const cw2=Math.max(1,r2.width),ch2=Math.max(1,r2.height);
            const L=EXPORT_FIT.landscape;
            const sLand=Math.min(
              (L.W-EXPORT_FIT.sideM*2)/cw2,
              (L.H-EXPORT_FIT.headerH-EXPORT_FIT.bottomH)/ch2,
              EXPORT_FIT.maxScale
            );
            return nodeToPngBlobRobust(snap.node,'#ffffff',{scale:sLand}).then(blob=>({blob,page:L}));
          });
        })
        .finally(()=>snap.cleanup());
    }).then(({blob,page})=>composeFittedSongImage(blob,opt,page))
      .then(png=>saveBlobAs(png,stem+'.png'));
  }

  function openSongFromUrl(){
    const songId=getSongIdFromUrl();
    if(!songId||!songs.length) return;
    const target=songs.find(x=>x.id===songId);
    if(target) openDetail(target,{fromUrl:true});
  }

  function closeDetail(fromPop){
    if(!fromPop && _detailStatePushed){
      history.back();
      return;
    }
    if(window._mlFitCleanup){
      window._mlFitCleanup();
      window._mlFitCleanup=null;
      window._mlFitObs=null;
    }
    destroyAP();
    stopMetronome();
    _mpSetExpanded(false);
    detail.classList.remove('open');
    root.classList.remove('ml-has-detail-open');
    document.body.classList.remove('ml-detail-lock');
    detail.style.transform='';
    detail.classList.remove('swiping');
    const overlay=$('ml-detail-overlay');
    if(overlay) overlay.style.opacity='';
    _detailStatePushed=false;
    _activeDetailSongId='';
    setSongUrl('', true);
    requestAnimationFrame(()=>{
      root.scrollTo({top:_detailReturnScroll||0,left:0,behavior:'auto'});
    });
  }

  function tryColor(el, prop){
    if(!el)return '';
    const v=getComputedStyle(el).getPropertyValue(prop).trim();
    return v && v!=='transparent' && v!=='rgba(0, 0, 0, 0)' ? v : '';
  }

  function getStoredTheme(){
    try{
      const stored=localStorage.getItem(THEME_KEY)||'system';
      return THEME_MODES.includes(stored)?stored:'system';
    }catch(_){
      return 'system';
    }
  }

  function getResolvedTheme(mode=getStoredTheme()){
    if(mode==='light'||mode==='dark') return mode;
    try{
      return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
    }catch(_){
      return 'light';
    }
  }

  function applyMusicTheme(mode=getStoredTheme(),persist=false){
    const resolved=getResolvedTheme(mode);
    const html=document.documentElement;
    html.setAttribute('data-theme',mode);
    html.setAttribute('data-resolved-theme',resolved);
    if(persist){
      try{ localStorage.setItem(THEME_KEY,mode); }catch(_){}
    }
    const meta=document.querySelector('meta[name="theme-color"]:not([media])')||document.createElement('meta');
    meta.setAttribute('name','theme-color');
    meta.setAttribute('content',resolved==='dark'?'#070b16':'#F4EFE7');
    if(!meta.parentNode) document.head.appendChild(meta);
    const btn=$('ml-nav-theme');
    if(btn){
      const label=mode==='system'?'跟随系统':mode==='light'?'浅色':'深色';
      btn.innerHTML=mode==='system'?icon('system'):mode==='light'?icon('sun'):icon('theme');
      btn.setAttribute('aria-label','主题：'+label+'，点击切换');
      btn.title='主题：'+label;
    }
    syncHaloTheme();
  }

  function initMusicTheme(){
    applyMusicTheme(getStoredTheme(),false);
  }

  function cycleMusicTheme(){
    const cur=getStoredTheme();
    const next=THEME_MODES[(THEME_MODES.indexOf(cur)+1)%THEME_MODES.length]||'system';
    applyMusicTheme(next,true);
    showToast(next==='system'?'主题跟随系统':next==='light'?'已切换浅色主题':'已切换深色主题');
  }

  function syncHaloTheme(){
    const rb=root.style;
    const html=document.documentElement;
    const mode=html.getAttribute('data-resolved-theme')||getResolvedTheme();
    const dark=mode==='dark';

    const palette=dark ? {
      bg:'#070b16',
      bg2:'#0a101f',
      bg3:'#0b1732',
      accent:'#e8c765',
      accentHover:'#f3d67a',
      accentSoft:'rgba(232,199,101,.16)',
      text:'#f7f3e8',
      text2:'rgba(247,243,232,.72)',
      text3:'rgba(247,243,232,.46)',
      border:'rgba(255,255,255,0.14)',
      borderMd:'rgba(255,255,255,0.24)',
      shadow:'0 18px 48px rgba(0,0,0,.28),0 1px 0 rgba(255,255,255,.04) inset',
      hero:'radial-gradient(circle at top left, rgba(232,199,101,.2), transparent 28%),linear-gradient(135deg,#070b16 0%,#0b1732 58%,#060915 100%)',
      panel:'rgba(10,16,31,.72)',
      chip:'rgba(16,26,48,.92)',
      card:'linear-gradient(180deg,rgba(16,26,48,.94),rgba(10,16,31,.96))',
      cardHover:'linear-gradient(180deg,rgba(20,33,59,.98),rgba(12,20,38,.98))',
      detail:'radial-gradient(circle at top, rgba(232,199,101,.12), transparent 26%),linear-gradient(180deg,#0b1732 0%,#070b16 100%)'
    } : {
      bg:'#F4EFE7',
      bg2:'#FFFDF9',
      bg3:'#EEE6DB',
      accent:'#C76524',
      accentHover:'#A9501A',
      accentSoft:'#F8E7D8',
      text:'#241C17',
      text2:'#6F655D',
      text3:'#9A8F85',
      border:'#E9E0D8',
      borderMd:'rgba(87,63,45,.18)',
      shadow:'0 1px 2px rgba(58,39,28,.05),0 18px 44px rgba(83,54,35,.08)',
      hero:'radial-gradient(circle at top left, rgba(255,255,255,.78), transparent 34%),linear-gradient(135deg,#fffdf9 0%,#f4efe7 54%,#eee6db 100%)',
      panel:'rgba(255,253,249,.76)',
      chip:'rgba(255,253,249,.9)',
      card:'linear-gradient(180deg,rgba(255,253,249,.96),rgba(248,241,232,.94))',
      cardHover:'linear-gradient(180deg,#fffdf9,#f8f1e8)',
      detail:'radial-gradient(circle at top, rgba(255,255,255,.78), transparent 30%),linear-gradient(180deg,#fffdf9 0%,#f4efe7 100%)'
    };

    rb.setProperty('--halo-bg', palette.bg);
    rb.setProperty('--halo-bg2', palette.bg2);
    rb.setProperty('--halo-bg3', palette.bg3);
    rb.setProperty('--halo-text', palette.text);
    rb.setProperty('--halo-text2', palette.text2);
    rb.setProperty('--halo-text3', palette.text3);
    rb.setProperty('--halo-accent', palette.accent);
    rb.setProperty('--halo-accent-hover', palette.accentHover);
    rb.setProperty('--halo-border', palette.border);
    rb.setProperty('--halo-border-md', palette.borderMd);
    rb.setProperty('--halo-accent-light', palette.accentSoft);
    rb.setProperty('--halo-shadow', palette.shadow);
    rb.setProperty('--hero-grad', palette.hero);
    rb.setProperty('--hero-panel', palette.panel);
    rb.setProperty('--hero-chip-bg', palette.chip);
    rb.setProperty('--card-grad', palette.card);
    rb.setProperty('--card-hover', palette.cardHover);
    rb.setProperty('--detail-grad', palette.detail);
    root.dataset.theme=mode;
  }

  function colorMix(color, alpha){
    if(color.startsWith('rgb')){
      const m=color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if(m)return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
    }
    if(color.startsWith('#')){
      const hex=color.slice(1);
      const full=hex.length===3?hex.split('').map(x=>x+x).join(''):hex;
      const r=parseInt(full.slice(0,2),16),g=parseInt(full.slice(2,4),16),b=parseInt(full.slice(4,6),16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgba(0,122,255,${alpha})`;
  }

  function observeThemeChanges(){
    if(_themeObserver)_themeObserver.disconnect();
    _themeObserver=new MutationObserver(()=>syncHaloTheme());
    _themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme','data-resolved-theme']});
    _themeObserver.observe(document.body,{attributes:true,attributeFilter:['class','style','data-theme']});
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>applyMusicTheme(getStoredTheme(),false));
  }

  async function loadSongs(opts={}){
    try{
      if(opts.refresh) showToast('正在刷新诗歌库');
      const res=await fetch(GITHUB_API+'?t='+Date.now(),{cache:'no-store'});if(!res.ok)throw 0;
      const files=await res.json();
      const jsons=files.filter(f=>f.name.endsWith('.json')&&f.name!=='test.json');
      const all=await Promise.all(jsons.map(f=>fetch(RAW_BASE+f.name,{cache:'no-store'}).then(r=>r.json()).catch(()=>null)));
      songs=all.filter(Boolean).map(enrichSong);
      $('ml-loading').style.display='none';
      $('ml-count').textContent=songs.length+' 首';
      renderWorshipPicks();
      renderHomePanels();
      renderQuickFilters();
      render();
      window.dispatchEvent(new CustomEvent('cecp:musiclib-songs-loaded',{detail:{songs:songs.slice()}}));
      openSongFromUrl();
      if(opts.refresh) showToast('诗歌库已刷新');
    }catch(e){
      if(!opts.refresh) $('ml-loading').innerHTML='<div style="color:#ff3b30;font-size:14px">载入失败，请刷新重试</div>';
      throw e;
    }
  }

  function hasLyricMatch(s,q){
    for(const sec of s.sections||[])for(const line of sec.lines||[]){
      const arr=Array.isArray(line)?line:(line.line||[]);
      for(const c of arr)if((c.lyric||'').toLowerCase().includes(q)||(c.lyric2||'').toLowerCase().includes(q)||(c.lyric3||'').toLowerCase().includes(q)||(c.lyric4||'').toLowerCase().includes(q))return true;
    }return false;
  }
  function lower(v){ return String(v||'').trim().toLowerCase(); }
  function escapeRegExp(v){ return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function cleanText(v){ return String(v||'').replace(/\s+/g,' ').trim(); }
  function detectSongSource(song){
    const artist=(song.artist||'').trim();
    const haystack=lower([song.artist,song.sub,song.title].filter(Boolean).join(' '));
    if(artist){
      const direct=SOURCE_RULES.find(rule=>rule.name!=='其他' && (lower(rule.name)===lower(artist) || rule.patterns.some(p=>lower(artist).includes(lower(p)))));
      if(direct) return direct.name;
      return artist;
    }
    const matched=SOURCE_RULES.find(rule=>rule.name!=='其他' && rule.patterns.some(p=>haystack.includes(lower(p))));
    return matched ? matched.name : '其他';
  }
  function parseAlbumInfo(song){
    const sub=cleanText(song.sub);
    const explicitAlbum=cleanText(song.album);
    const explicitYear=cleanText(song.albumYear);
    if(explicitAlbum){
      return {
        album:cleanText(explicitAlbum.replace(/\s*[（(]\d{4}[）)]\s*$/,'')),
        albumYear:explicitYear
      };
    }
    if(!sub) return {album:'',albumYear:''};

    let album='';
    let year='';
    let m=sub.match(/[【《]([^】》]+)[】》]\s*[（(]?(\d{4})?[）)]?/);
    if(m){
      album=cleanText(m[1]);
      year=m[2]||'';
    }

    if(!year){
      m=sub.match(/[（(【《]?(20\d{2})[）)】》]?/);
      if(m) year=m[1]||'';
    }

    if(album){
      return {album,albumYear:year};
    }
    return {album:'',albumYear:year};
  }
  function getAlbumBase(song){
    const album=cleanText(song.album);
    const year=cleanText(song.albumYear);
    if(!album) return '';
    if(!year) return album;
    return cleanText(album.replace(new RegExp(`[（(]?${escapeRegExp(year)}[）)]?$`),''));
  }
  function getSongSubDetails(song){
    let details=cleanText(song.sub);
    if(!details) return '';
    const source=cleanText(song.displayArtist||song.artist||song.source);
    const albumBase=getAlbumBase(song);
    const year=cleanText(song.albumYear);

    if(source) details=details.replace(new RegExp(`^${escapeRegExp(source)}\\s*`),'').trim();
    if(albumBase && year){
      details=details
        .replace(new RegExp(`^[【《]?${escapeRegExp(albumBase)}[】》]?\\s*[（(【《]?${escapeRegExp(year)}[）)】》]?\\s*`),'')
        .replace(new RegExp(`^(?:儿童)?专辑\\s+${escapeRegExp(albumBase)}\\s+${escapeRegExp(year)}\\s*`,'i'),'')
        .trim();
    }
    if(albumBase){
      details=details.replace(new RegExp(`^[【《]?${escapeRegExp(albumBase)}[】》]?\\s*`),'').trim();
    }
    if(year){
      details=details.replace(new RegExp(`^[（(【《]?${escapeRegExp(year)}[）)】》]?\\s*`),'').trim();
    }
    return details.replace(/^[·•｜|/，、,:：;\-\s]+/,'').trim();
  }
  function getSongCardOverline(song){
    return song.album || song.source || song.displayArtist || '诗歌';
  }
  function getSongCardMeta(song){
    const meta=[];
    if(song.displayArtist) meta.push(song.displayArtist);
    const details=getSongSubDetails(song);
    if(details) meta.push(details);
    return meta.join(' · ');
  }
  function getSongDetailSub(song){
    return song.album || song.sub || song.displayArtist || '用于练习、学习与敬拜辅助';
  }
  function getSongDetailNote(song){
    if(!song.album) return '';
    const meta=[];
    if(song.displayArtist) meta.push(song.displayArtist);
    const details=getSongSubDetails(song);
    if(details) meta.push(details);
    return meta.join(' · ');
  }
  function getWorshipDayKey(){
    try{
      return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    }catch(_){
      return new Date().toISOString().slice(0,10);
    }
  }
  function hashString(str){
    let h=2166136261;
    for(let i=0;i<str.length;i++){
      h^=str.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }
  function seededRandom(seed){
    let t=seed>>>0;
    return function(){
      t+=0x6D2B79F5;
      let r=Math.imul(t^(t>>>15),1|t);
      r^=r+Math.imul(r^(r>>>7),61|r);
      return ((r^(r>>>14))>>>0)/4294967296;
    };
  }
  function getDailyWorshipPicks(){
    const day=getWorshipDayKey();
    const cacheKey='cecp:musiclib:worship-picks:'+day;
    const usable=songs.filter(s=>s&&s.id&&s.title).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    if(!usable.length) return {day,picks:[]};
    try{
      const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');
      if(cached&&cached.day===day&&Array.isArray(cached.ids)){
        const picks=cached.ids.map(id=>usable.find(s=>s.id===id)).filter(Boolean);
        if(picks.length) return {day,picks:picks.slice(0,Math.min(3,usable.length))};
      }
    }catch(_){}

    const rand=seededRandom(hashString('CECP-WORSHIP-PICKS:'+day));
    const pool=usable.slice();
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(rand()*(i+1));
      const tmp=pool[i]; pool[i]=pool[j]; pool[j]=tmp;
    }
    const picks=pool.slice(0,Math.min(3,pool.length));
    try{
      Object.keys(localStorage).forEach(key=>{
        if(key.startsWith('cecp:musiclib:worship-picks:')&&!key.endsWith(day)) localStorage.removeItem(key);
      });
      localStorage.setItem(cacheKey,JSON.stringify({day,ids:picks.map(s=>s.id),savedAt:Date.now()}));
    }catch(_){}
    return {day,picks};
  }
  function getSongLyricHighlight(song){
    for(const sec of song.sections||[]){
      for(const line of sec.lines||[]){
        const arr=Array.isArray(line)?line:(line.line||[]);
        const text=arr.map(c=>cleanText(c.lyric||c.lyric2||'')).join('');
        const cleaned=cleanText(text.split(SP_TOKEN).join(' ').replace(/[ㅤ|，,。.!！?？、]/g,' '));
        if(cleaned&&cleaned.length>=6) return cleaned.length>34?cleaned.slice(0,34)+'…':cleaned;
      }
    }
    return song.sub||'愿这首歌帮助你安静、敬拜与祷告。';
  }
  function getWorshipTags(song,index){
    return [
      `今日第 ${index+1} 首`,
      song.origKey?`调性 ${song.origKey}`:'',
      song.bpm?`速度 ${song.bpm}`:'',
      hasSongAudio(song)?'有音频':''
    ].filter(Boolean);
  }
  function setWorshipHero(song,index){
    const section=$('ml-worship-picks');
    if(!section||!song) return;
    section.dataset.activeId=song.id;
    section.style.setProperty('--wp-cover',song.cover?`url("${String(song.cover).replace(/"/g,'\\"')}")`:'none');
    $('ml-wp-title').textContent=song.title||'今日敬拜推荐';
    $('ml-wp-artist').textContent=song.displayArtist||song.artist||song.source||'诗歌';
    $('ml-wp-lyric').textContent=getSongLyricHighlight(song);
    $('ml-wp-tags').innerHTML=getWorshipTags(song,index).map(t=>`<span>${t}</span>`).join('');
    $('ml-wp-play').disabled=!hasSongAudio(song);
    $('ml-wp-open').disabled=false;
  }
  function renderWorshipPicks(){
    const box=$('ml-worship-picks'),list=$('ml-wp-list');
    if(!box||!list) return;
    const {day,picks}=getDailyWorshipPicks();
    box.dataset.day=day;
    if(!picks.length){
      list.innerHTML='<div class="ml-wp-card is-empty">今日推荐正在载入</div>';
      return;
    }
    setWorshipHero(picks[0],0);
    list.innerHTML=picks.map((song,index)=>`
      <button class="ml-wp-card${index===0?' active':''} ml-reveal is-visible" type="button" data-id="${song.id}">
        <span class="ml-wp-card-cover">${song.cover?`<img src="${song.cover}" alt="" loading="lazy">`:'<span>♪</span>'}</span>
        <span class="ml-wp-card-copy">
          <span class="ml-wp-card-kicker">推荐 0${index+1}</span>
          <strong>${song.title||'未命名诗歌'}</strong>
          <small>${song.displayArtist||song.artist||song.source||'诗歌'}</small>
        </span>
        <span class="ml-wp-card-tag">${song.origKey?`调性 ${song.origKey}`:(song.bpm?`速度 ${song.bpm}`:'今日推荐')}</span>
      </button>
    `).join('');
    list.querySelectorAll('.ml-wp-card[data-id]').forEach((btn,index)=>{
      btn.addEventListener('click',()=>{
        const song=picks.find(s=>s.id===btn.dataset.id);
        if(!song) return;
        list.querySelectorAll('.ml-wp-card').forEach(el=>el.classList.remove('active'));
        btn.classList.add('active');
        setWorshipHero(song,index);
      });
    });
    if($('ml-wp-play')) $('ml-wp-play').onclick=()=>{
      const song=songs.find(s=>s.id===box.dataset.activeId);
      if(song) playWorshipPick(song);
    };
    if($('ml-wp-open')) $('ml-wp-open').onclick=()=>{
      const song=songs.find(s=>s.id===box.dataset.activeId);
      if(song) openDetail(song);
    };
    observeRevealItems();
  }
  function playWorshipPick(song){
    if(!hasSongAudio(song)) return;
    _mpBind();
    const idx=_mpAddToQueue(song);
    _mpPlayIdx(idx,true);
  }
  function bindWorshipPicksEffects(){
    const box=$('ml-worship-picks');
    if(!box) return;
    box.addEventListener('pointermove',e=>{
      const r=box.getBoundingClientRect();
      box.style.setProperty('--wp-mx',((e.clientX-r.left)/Math.max(r.width,1)*100).toFixed(2)+'%');
      box.style.setProperty('--wp-my',((e.clientY-r.top)/Math.max(r.height,1)*100).toFixed(2)+'%');
    });
    observeRevealItems();
  }
  function observeRevealItems(){
    const items=root.querySelectorAll('.ml-reveal:not(.is-visible)');
    if(!items.length) return;
    if(!_revealObserver){
      _revealObserver=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            _revealObserver.unobserve(entry.target);
          }
        });
      },{threshold:.16,rootMargin:'0px 0px -6% 0px'});
    }
    items.forEach(el=>_revealObserver.observe(el));
  }
  function updateWorshipGreeting(){
    const main=$('ml-wp-greeting-main'),sub=$('ml-wp-greeting-sub');
    if(!main||!sub) return;
    const now=new Date();
    const h=now.getHours();
    const greeting=h<5?'夜深平安':h<11?'早安，今日推荐已更新':h<17?'午后平安':h<21?'晚上好，今日推荐已更新':'夜晚平安';
    main.textContent=greeting;
    sub.textContent=now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})+' · 正在同步今日天气';
    loadWorshipWeather().then(text=>{
      if(text){
        sub.textContent=now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})+' · Padova · '+text;
        const pill=$('ml-weather-pill');
        if(pill) pill.textContent='Padova · '+text;
      }
    }).catch(()=>{ sub.textContent=now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})+' · 安静敬拜日'; });
  }
  async function loadWorshipWeather(){
    const now=Date.now();
    if(_weatherCache&&now-_weatherCache.at<30*60*1000) return _weatherCache.text;
    const pos=await new Promise(resolve=>{
      if(!navigator.geolocation) return resolve({lat:45.4064,lon:11.8768});
      navigator.geolocation.getCurrentPosition(
        p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),
        ()=>resolve({lat:45.4064,lon:11.8768}),
        {maximumAge:60*60*1000,timeout:1800}
      );
    });
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${pos.lat.toFixed(3)}&longitude=${pos.lon.toFixed(3)}&current=temperature_2m,weather_code&timezone=auto`;
    const data=await fetch(url,{cache:'no-store'}).then(r=>r.ok?r.json():null);
    const cur=data&&data.current;
    if(!cur) return '';
    const label=weatherCodeLabel(cur.weather_code);
    const text=`${label} ${Math.round(cur.temperature_2m)}°C`;
    _weatherCache={at:now,text};
    return text;
  }
  function weatherCodeLabel(code){
    code=Number(code);
    if(code===0) return '晴朗';
    if([1,2,3].includes(code)) return '多云';
    if([45,48].includes(code)) return '有雾';
    if((code>=51&&code<=67)||(code>=80&&code<=82)) return '有雨';
    if(code>=71&&code<=77) return '有雪';
    if(code>=95) return '雷雨';
    return '今日天气';
  }
  /* ── 拼音搜索(增强,字典加载失败自动降级为原有搜索) ── */
  function buildPinyinIndex(song){
    try{
      if(typeof window.cecpPinyinOf!=='function')return {};
      const text=[song.title,song.artist,song.sub].filter(Boolean).join(' ');
      const syl=[];
      for(const ch of text){
        const py=window.cecpPinyinOf(ch);
        if(py)syl.push(py);
        else if(/[a-z0-9]/i.test(ch))syl.push(ch.toLowerCase());
      }
      if(!syl.length)return {};
      return {
        _pySyl:syl,
        _pyFull:syl.join(''),
        _pyInit:syl.map(s2=>s2.charAt(0)).join('')
      };
    }catch(_){return {};}
  }
  function pyPrefixMatch(syl,qn){
    const n=syl.length;
    function go(i,pos){
      if(pos>=qn.length)return true;
      if(i>=n)return false;
      const p=syl[i];
      const max=Math.min(p.length,qn.length-pos);
      for(let k=max;k>=1;k--){
        if(p.slice(0,k)===qn.slice(pos,pos+k)&&go(i+1,pos+k))return true;
      }
      return false;
    }
    for(let s2=0;s2<n;s2++){if(go(s2,0))return true;}
    return false;
  }
  function pyNearSubstring(hay,needle){
    // needle 与 hay 的某个子串编辑距离 ≤1(容忍打错/漏打/多打一个字母)
    const n=hay.length,m=needle.length;
    for(let st=0;st<n;st++){
      let i=st,j=0,err=0;
      while(j<m){
        if(i<n&&hay.charAt(i)===needle.charAt(j)){i++;j++;continue;}
        if(err)break;
        err=1;
        if(i<n&&i+1<=n&&hay.charAt(i+1)===needle.charAt(j)){i+=2;j++;continue;} // hay 多一个字符
        if(j+1<=m&&i<n&&hay.charAt(i)===needle.charAt(j+1)){i++;j+=2;continue;} // needle 多一个字符
        i++;j++; // 替换
      }
      if(j>=m)return true;
    }
    return false;
  }
  function pinyinQueryMatch(s,q){
    try{
      const qn=String(q||'').replace(/[^a-z0-9]/g,'');
      if(qn.length<2||!s._pyFull)return false;
      if(s._pyFull.includes(qn)||s._pyInit.includes(qn))return true;
      if(pyPrefixMatch(s._pySyl,qn))return true;
      if(qn.length>=4&&pyNearSubstring(s._pyFull,qn))return true;
      return false;
    }catch(_){return false;}
  }
  function enrichSong(song){
    const source=detectSongSource(song);
    const {album,albumYear}=parseAlbumInfo(Object.assign({},song,{source}));
    return Object.assign({},song,{
      source,
      album,
      albumYear,
      displayArtist:(song.artist||source||'未知来源').trim()
    },buildPinyinIndex(song));
  }
  function ensureNoIndexMeta(){
    [
      ['robots','noindex,nofollow'],
      ['googlebot','noindex,nofollow']
    ].forEach(([name,content])=>{
      let meta=document.head.querySelector(`meta[name="${name}"]`);
      if(!meta){
        meta=document.createElement('meta');
        meta.setAttribute('name',name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content',content);
    });
  }
  function hasInternalKey(){
    try{
      if(window.CECP_LIBAPP===true) return true;
      return new URLSearchParams(location.search).get('key')===INTERNAL_KEY;
    }catch(_){
      return false;
    }
  }
  function renderInternalOnlyNotice(){
    root.innerHTML=`
      <div id="ml-header">
        <div id="ml-nav">
          <div id="ml-brand">
            <span class="ml-brand-dot"><img src="${LOGO_SRC}" alt="橄榄树团契"></span>
            <span class="ml-brand-name">诗歌库</span>
          </div>
        </div>
        <div id="ml-hero">
          <h1 id="ml-title">诗歌库</h1>
          <div id="ml-subtitle">本诗歌库仅供 CECP 教会内部敬拜练习使用。请联系 YuEn 获取内部链接：微信 ${WECHAT}，Instagram @_yuen0129。</div>
        </div>
      </div>
      <div id="ml-empty" style="display:block">
        <div id="ml-empty-icon">♪</div>
        <div id="ml-empty-msg">请联系 YuEn 获取诗歌库内部链接</div>
        <div id="ml-empty-sub">微信：${WECHAT}　Instagram：@_yuen0129</div>
        <div style="margin-top:18px;font-size:14px;color:var(--text3);line-height:1.7;">本页面不会加载歌曲列表、歌词或音频资源。</div>
      </div>
    `;
  }
  function hasSongAudio(song){
    return !!(song&&song.mp3);
  }
  function getSongBpm(song){
    const raw=String(song?.bpm??'').trim();
    const match=raw.match(/\d+(?:\.\d+)?/);
    return match?Number(match[0]):NaN;
  }
  function hasRenderableScore(song){
    return !!(song&&Array.isArray(song.sections)&&song.sections.some(sec=>Array.isArray(sec.lines)&&sec.lines.length));
  }
  function normalizeScoreImages(song){
    if(!song) return [];
    const raw= song.scoreImg ?? song.scoreIMG ?? song.scoreIMGs ?? song.scoreImages ?? song.score;
    const list=Array.isArray(raw)?raw:(raw?[raw]:[]);
    const looksLikeImagePath=value=>{
      const v=String(value||'').trim();
      if(!v) return false;
      if(/^(https?:|data:image\/|blob:)/i.test(v)) return true;
      if(/\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(v)) return true;
      if(/^\.{0,2}\//.test(v)&&/(score|sheet|image|img|upload|resource|resouces)/i.test(v)) return true;
      return false;
    };
    return list
      .map(item=>{
        if(typeof item==='string') return item;
        if(item&&typeof item==='object') return item.url||item.src||item.href||item.path||'';
        return '';
      })
      .map(v=>String(v||'').trim())
      .filter(looksLikeImagePath)
      .filter(Boolean)
      .map(resolveMediaUrl);
  }
  function getSongState(songId){
    if(!songId) return {};
    try{
      const all=JSON.parse(localStorage.getItem(SONG_STATE_KEY)||'{}')||{};
      return all[songId]||{};
    }catch(_){
      return {};
    }
  }
  function setSongState(songId,patch){
    if(!songId) return;
    try{
      const all=JSON.parse(localStorage.getItem(SONG_STATE_KEY)||'{}')||{};
      all[songId]=Object.assign({},all[songId]||{},patch,{updatedAt:Date.now()});
      localStorage.setItem(SONG_STATE_KEY,JSON.stringify(all));
    }catch(_){}
  }
  function getAllSongStates(){
    try{
      return JSON.parse(localStorage.getItem(SONG_STATE_KEY)||'{}')||{};
    }catch(_){
      return {};
    }
  }
  function loadSearchHistory(){
    try{
      const arr=JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)||'[]');
      return Array.isArray(arr)?arr.filter(Boolean).slice(0,8):[];
    }catch(_){
      return [];
    }
  }
  function saveSearchHistory(){
    try{ localStorage.setItem(SEARCH_HISTORY_KEY,JSON.stringify(searchHistory.slice(0,8))); }catch(_){}
  }
  function rememberSearchTerm(term){
    const t=cleanText(term);
    if(!t || t.length<1) return;
    searchHistory=[t].concat(searchHistory.filter(x=>x!==t)).slice(0,8);
    saveSearchHistory();
    renderSearchHistory();
  }
  function scheduleRememberSearch(term){
    clearTimeout(_searchHistoryTimer);
    if(!term) return;
    _searchHistoryTimer=setTimeout(()=>rememberSearchTerm(term),900);
  }
  function renderSearchHistory(){
    const box=$('ml-search-history');
    if(!box) return;
    if(!searchHistory.length){
      box.hidden=true;
      box.innerHTML='';
      return;
    }
    box.hidden=false;
    box.innerHTML=`
      <span>最近搜索</span>
      ${searchHistory.map(item=>`<button type="button" data-search="${esc(item)}">${esc(item)}</button>`).join('')}
      <button type="button" class="is-clear" data-clear-history="1">清空</button>
    `;
    box.querySelectorAll('[data-search]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        query=btn.dataset.search||'';
        const input=$('ml-search');
        if(input) input.value=query;
        intentFilter='全部';
        updateSearchControls();
        render();
      });
    });
    box.querySelector('[data-clear-history]')?.addEventListener('click',()=>{
      searchHistory=[];
      saveSearchHistory();
      renderSearchHistory();
    });
  }
  function updateSearchControls(){
    const clear=$('ml-search-clear');
    if(clear) clear.hidden=!query;
  }
  function filterByIntent(song){
    const item=QUICK_FILTERS.find(x=>x.id===intentFilter);
    return item ? item.match(song) : true;
  }
  function quickFilterCount(id){
    const item=QUICK_FILTERS.find(x=>x.id===id);
    if(!item) return 0;
    return songs.filter(s=>item.match(s)).length;
  }
  function setIntentFilter(next,opts={}){
    intentFilter=next||'全部';
    if(opts.resetSource) sourceFilter='全部';
    if(opts.clearQuery){
      query='';
      const input=$('ml-search');
      if(input) input.value='';
      updateSearchControls();
    }
    render();
    if(opts.scrollList){
      $('ml-list-stage')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }
  function renderQuickFilters(){
    const bar=$('ml-filter-bar');
    if(!bar) return;
    const sourceItems=getArtistFilterItems();
    const base=QUICK_FILTERS.filter(item=>item.visible!==false).map(item=>{
      const count=quickFilterCount(item.id);
      const disabled=(item.id!=='全部'&&count===0);
      const active=item.id===intentFilter&&sourceFilter==='全部';
      return `<button class="ml-filter-chip${active?' active':''}" type="button" data-filter="${item.id}" ${disabled?'disabled':''}>
        <span>${item.label}</span><strong>${count}</strong>
      </button>`;
    }).join('');
    const artists=sourceItems.map(item=>`
      <button class="ml-filter-chip ml-artist-chip${item.name===sourceFilter?' active':''}" type="button" data-source="${esc(item.name)}">
        <span>${esc(item.name)}</span><strong>${item.count}</strong>
      </button>
    `).join('');
    bar.innerHTML=base+(artists?'<span class="ml-filter-divider" aria-hidden="true"></span>'+artists:'');
    bar.querySelectorAll('[data-filter]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        setIntentFilter(btn.dataset.filter||'全部',{resetSource:true,scrollList:false});
      });
    });
    bar.querySelectorAll('[data-source]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        sourceFilter=btn.dataset.source||'全部';
        intentFilter='全部';
        render();
      });
    });
  }
  function getArtistFilterItems(){
    const counts=songs.reduce((acc,s)=>{
      const key=(s.displayArtist||s.source||s.artist||'').trim();
      if(!key||key==='其他') return acc;
      acc[key]=(acc[key]||0)+1;
      return acc;
    },{});
    if(sourceFilter!=='全部'&&!counts[sourceFilter]) sourceFilter='全部';
    return Object.keys(counts)
      .sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b,'zh-Hans-CN'))
      .map(name=>({name,count:counts[name]}));
  }
  function formatRelativeTime(ts){
    if(!ts) return '';
    const diff=Math.max(0,Date.now()-Number(ts));
    const min=Math.floor(diff/60000);
    if(min<1) return '刚刚';
    if(min<60) return min+' 分钟前';
    const hr=Math.floor(min/60);
    if(hr<24) return hr+' 小时前';
    const day=Math.floor(hr/24);
    if(day<8) return day+' 天前';
    try{return new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit'}).format(new Date(Number(ts)));}catch(_){return '';}
  }
  function renderHomePanels(){
    const states=getAllSongStates();
    const heroCount=$('ml-hero-song-count');
    const favCount=$('ml-hero-fav-count');
    const serviceCount=$('ml-hero-service-count');
    if(heroCount) heroCount.textContent=String(songs.length||0);
    if(favCount) favCount.textContent=String(Object.values(states).filter(x=>x&&x.favorite).length);
    if(serviceCount) serviceCount.textContent=String(Object.values(states).filter(x=>x&&x.serviceUsed).length);

    const recentBox=$('ml-recent-list');
    if(recentBox){
      const recent=songs
        .map(song=>({song,state:states[song.id]||{},at:Math.max(Number(states[song.id]?.openedAt||0),Number(states[song.id]?.playedAt||0))}))
        .filter(item=>item.at)
        .sort((a,b)=>b.at-a.at)
        .slice(0,4);
      recentBox.innerHTML=recent.length ? recent.map(({song,state,at})=>`
        <button type="button" class="ml-compact-row" data-id="${song.id}">
          <span class="ml-row-title">${esc(song.title||'未命名诗歌')}</span>
          <span class="ml-row-meta">${state.lastKey?`上次 ${esc(state.lastKey)} · `:''}${formatRelativeTime(at)}</span>
          <strong>${esc(state.lastKey||song.origKey||'--')}</strong>
        </button>
      `).join('') : '<div class="ml-panel-empty">打开一首歌后，这里会显示最近使用。</div>';
      recentBox.querySelectorAll('[data-id]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const song=songs.find(s=>s.id===btn.dataset.id);
          if(song) openDetail(song);
        });
      });
    }

    const categoryGrid=$('ml-category-grid');
    if(categoryGrid){
      const categories=HOME_CATEGORIES
        .map(item=>Object.assign({},item,{count:quickFilterCount(item.id)}))
        .filter(item=>item.count>0 || item.id==='收藏')
        .slice(0,6);
      categoryGrid.innerHTML=categories.length ? categories.map(item=>`
        <button class="ml-category-card is-${item.tone}" type="button" data-filter="${item.id}" ${item.count===0?'disabled':''}>
          <span class="ml-category-icon">${icon(item.id==='收藏'?'heart':item.id==='快歌'?'play':item.id==='慢歌'?'theme':item.id==='圣餐'?'score':'library',18)}</span>
          <strong>${item.label}</strong>
          <small>${item.count} 首</small>
        </button>
      `).join('') : '<div class="ml-panel-empty">暂无可用分类。</div>';
      categoryGrid.querySelectorAll('[data-filter]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          setIntentFilter(btn.dataset.filter||'全部',{resetSource:true,scrollList:true});
        });
      });
    }
  }
  function updateDetailStateButtons(song){
    if(!song) return;
    const state=getSongState(song.id);
    const fav=$('ml-detail-favorite');
    const svc=$('ml-detail-service');
    if(fav){
      fav.classList.toggle('is-active',!!state.favorite);
      fav.innerHTML=state.favorite?icon('heartFill',16):icon('heart',16);
      fav.setAttribute('aria-label',state.favorite?'取消收藏':'收藏诗歌');
    }
    if(svc){
      svc.classList.toggle('is-active',!!state.serviceUsed);
      svc.innerHTML=icon('check',16)+'<span>'+(state.serviceUsed?'已唱过':'本堂')+'</span>';
      svc.setAttribute('aria-label',state.serviceUsed?'取消本堂唱过':'标记本堂唱过');
    }
  }
  function toggleFavorite(song){
    if(!song) return;
    const state=getSongState(song.id);
    setSongState(song.id,{favorite:!state.favorite,favoriteAt:!state.favorite?Date.now():state.favoriteAt||0});
    showToast(!state.favorite?'已加入收藏':'已取消收藏');
    renderHomePanels();
    updateDetailStateButtons(song);
    render();
  }
  function toggleServiceUsed(song){
    if(!song) return;
    const state=getSongState(song.id);
    const next=!state.serviceUsed;
    setSongState(song.id,{
      serviceUsed:next,
      serviceUsedAt:next?Date.now():state.serviceUsedAt||0,
      serviceCount:next?(Number(state.serviceCount||0)+1):Number(state.serviceCount||0)
    });
    showToast(next?'已标记本堂唱过':'已取消本堂标记');
    renderHomePanels();
    updateDetailStateButtons(song);
    render();
  }
  function syncNavActive(mode){
    root.dataset.nav=mode||'home';
    root.querySelectorAll('[data-nav]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.nav===(mode||'home'));
    });
  }
  function handleNav(mode){
    if(mode==='search'){
      syncNavActive('search');
      root.scrollTo({top:0,behavior:'smooth'});
      setTimeout(()=>{$('ml-search')?.focus();},120);
      return;
    }
    if(mode==='favorites'){
      syncNavActive('favorites');
      setIntentFilter('收藏',{resetSource:true,scrollList:true});
      return;
    }
    if(mode==='service'){
      syncNavActive('library');
      setIntentFilter('全部',{resetSource:true,scrollList:true});
      return;
    }
    if(mode==='playlist'){
      syncNavActive('playlist');
      _mpSetPlaylistOpen(true);
      return;
    }
    if(mode==='settings'){
      cycleMusicTheme();
      return;
    }
    syncNavActive(mode==='library'?'library':'home');
    setIntentFilter('全部',{clearQuery:mode!=='library',resetSource:mode!=='library',scrollList:mode==='library'});
  }
  function hi(t,q){
    if(!q||!t)return t||'';
    return t.replace(new RegExp(`(${escapeRegExp(q)})`,'gi'),'<mark class="ml-highlight">$1</mark>');
  }
  function renderSourceBar(){
    const bar=$('ml-source-bar');
    if(!bar) return;
    bar.hidden=true;
    bar.innerHTML='';
  }

  function render(){
    const list=$('ml-list'),empty=$('ml-empty'),q=query.toLowerCase();
    renderSourceBar();
    renderQuickFilters();
    renderHomePanels();
    updateSearchControls();
    const filtered=songs.filter(s=>{
      const artistKey=(s.displayArtist||s.source||s.artist||'').trim();
      const sourceOk=sourceFilter==='全部'||artistKey===sourceFilter;
      const intentOk=filterByIntent(s);
      if(!sourceOk) return false;
      if(!intentOk) return false;
      if(!q) return true;
      return (s.title||'').toLowerCase().includes(q)
        || (s.artist||'').toLowerCase().includes(q)
        || (s.source||'').toLowerCase().includes(q)
        || (s.album||'').toLowerCase().includes(q)
        || (s.sub||'').toLowerCase().includes(q)
        || hasLyricMatch(s,q)
        || pinyinQueryMatch(s,q);
    });
    if(!filtered.length){
      $('ml-result-count').textContent=q
        ? `找到 0 首相关诗歌`
        : sourceFilter==='全部'
          ? `${intentFilter==='全部'?'全部':intentFilter} · 0 首`
          : `${sourceFilter} · ${intentFilter==='全部'?'全部':intentFilter} · 0 首`;
      list.innerHTML='';$('ml-query-text').textContent=query;empty.style.display='block';
      list.classList.remove('is-grouped');
      $('ml-list-stage').style.display='none';
    }else{
      empty.style.display='none';
      $('ml-list-stage').style.display='';
      list.classList.remove('is-grouped');
      if(q){
        $('ml-result-count').textContent=`找到 ${filtered.length} 首相关诗歌`;
      }else if(sourceFilter!=='全部'){
        $('ml-result-count').textContent=`${sourceFilter}${intentFilter==='全部'?'':' · '+intentFilter} · ${filtered.length} 首`;
      }else{
        $('ml-result-count').textContent=`${intentFilter==='全部'?'全部':intentFilter} ${filtered.length} 首诗歌`;
      }
      const shouldGroup=!q;
      if(shouldGroup){
        list.classList.add('is-grouped');
        list.dataset.groupMode=sourceFilter!=='全部'?'album':'artist';
        list.innerHTML=renderGroupedSongList(filtered,q)+(filtered.length?'<div id="ml-list-end"></div>':'');
      }else{
        list.classList.remove('is-grouped');
        delete list.dataset.groupMode;
        list.innerHTML=filtered.map(s=>cardHTML(s,q)).join('')+'<div id="ml-list-end"></div>';
      }
      _mpRenderQueue();
      list.querySelectorAll('.ml-song-card').forEach(el=>{
        el.addEventListener('click',()=>{const s=songs.find(x=>x.id===el.dataset.id);if(s)openDetail(s);});

        el.querySelector('.ml-card-favorite')?.addEventListener('click',e=>{
          e.stopPropagation();
          const s=songs.find(x=>x.id===el.dataset.id);
          if(s) toggleFavorite(s);
        });

        el.querySelector('.ml-card-service')?.addEventListener('click',e=>{
          e.stopPropagation();
          const s=songs.find(x=>x.id===el.dataset.id);
          if(s) toggleServiceUsed(s);
        });

        el.querySelector('.ml-card-share')?.addEventListener('click',e=>{
          e.stopPropagation();
          const s=songs.find(x=>x.id===el.dataset.id);
          if(s) shareSong(s);
        });

        el.querySelector('.ml-card-play')?.addEventListener('click',e=>{
          e.preventDefault();
          e.stopPropagation();
          const s=songs.find(x=>x.id===el.dataset.id);
          if(!hasSongAudio(s)) return;
          playSongNow(s);
        });

        el.querySelector('.ml-card-queue')?.addEventListener('click',e=>{
          e.preventDefault();
          e.stopPropagation();
          const s=songs.find(x=>x.id===el.dataset.id);
          if(!hasSongAudio(s)) return;
          addSongToPlaylist(s);
        });
      });
    }
    observeRevealItems();
  }

  function getArtistGroupName(song){
    return cleanText(song.displayArtist||song.source||song.artist)||'其他';
  }
  function getAlbumGroupName(song){
    return cleanText(song.album)||'单曲与其他';
  }
  function sourceSortIndex(name){
    const idx=SOURCE_RULES.findIndex(rule=>rule.name===name);
    return idx<0?999:idx;
  }
  function sortSongsForGroup(items){
    return items.slice().sort((a,b)=>{
      const yearA=Number(a.albumYear||0),yearB=Number(b.albumYear||0);
      if(yearA!==yearB) return yearB-yearA;
      return String(a.title||'').localeCompare(String(b.title||''),'zh-Hans-CN',{numeric:true});
    });
  }
  function groupSongsBy(items,keyFn){
    const map=new Map();
    items.forEach(song=>{
      const key=keyFn(song);
      if(!map.has(key)) map.set(key,[]);
      map.get(key).push(song);
    });
    return Array.from(map.entries()).map(([name,groupSongs])=>({name,songs:sortSongsForGroup(groupSongs)}));
  }
  function groupCoverHTML(group,mode){
    const first=group.songs.find(song=>song.cover)||group.songs[0];
    if(mode==='album'&&first&&first.cover){
      return `<div class="ml-group-cover"><img src="${esc(first.cover)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='♪'"></div>`;
    }
    const label=cleanText(group.name);
    const initial=(label&&label!=='单曲与其他')?Array.from(label)[0]:'♪';
    return `<div class="ml-group-cover is-letter" aria-hidden="true">${esc(initial)}</div>`;
  }
  function renderGroupedSongList(items,q){
    const mode=sourceFilter!=='全部'?'album':'artist';
    let groups=groupSongsBy(items,mode==='album'?getAlbumGroupName:getArtistGroupName);
    if(mode==='artist'){
      groups.sort((a,b)=>{
        const ai=sourceSortIndex(a.name),bi=sourceSortIndex(b.name);
        if(ai!==bi) return ai-bi;
        if(a.songs.length!==b.songs.length) return b.songs.length-a.songs.length;
        return a.name.localeCompare(b.name,'zh-Hans-CN');
      });
    }else{
      groups.sort((a,b)=>{
        const ay=Math.max(...a.songs.map(s=>Number(s.albumYear||0))),by=Math.max(...b.songs.map(s=>Number(s.albumYear||0)));
        if(ay!==by) return by-ay;
        if(a.name==='单曲与其他') return 1;
        if(b.name==='单曲与其他') return -1;
        return a.name.localeCompare(b.name,'zh-Hans-CN',{numeric:true});
      });
    }
    return groups.map(group=>{
      const years=Array.from(new Set(group.songs.map(s=>cleanText(s.albumYear)).filter(Boolean))).sort((a,b)=>Number(b)-Number(a));
      const subtitle=mode==='album'
        ? [sourceFilter,years[0]||''].filter(Boolean).join(' · ')
        : '作者 / 团队';
      return `<section class="ml-group ml-group--${mode}" data-group="${esc(group.name)}">
        <div class="ml-group-head">
          <div class="ml-group-head-main">
            ${groupCoverHTML(group,mode)}
            <div class="ml-group-copy">
              <div class="ml-group-kicker">${mode==='album'?'专辑':'作者'}</div>
              <h3 class="ml-group-title">${esc(group.name)}</h3>
              <div class="ml-group-subtitle">${esc(subtitle)}</div>
            </div>
          </div>
          <span class="ml-group-count">${group.songs.length} 首</span>
        </div>
        <div class="ml-group-grid">${group.songs.map(song=>cardHTML(song,q)).join('')}</div>
      </section>`;
    }).join('');
  }

  function cardHTML(s,q){
    const state=getSongState(s.id);
    const cover=s.cover
      ?`<img class="ml-cover" src="${s.cover}" loading="lazy" onerror="this.outerHTML='<div class=\\'ml-cover-placeholder\\'>♪</div>'">`
      :`<div class="ml-cover-placeholder">封面</div>`;
    const overline=getSongCardOverline(s);
    const meta=getSongCardMeta(s);
    const primaryTags=[
      s.origKey?`<span class="ml-song-tag is-key">${s.origKey}</span>`:'',
      s.timeSign?`<span class="ml-song-tag">${s.timeSign}</span>`:'',
      s.bpm?`<span class="ml-song-tag">${s.bpm}</span>`:''
    ].filter(Boolean).join('');
    const secondaryTags=[
      hasSongAudio(s)?`<span class="ml-song-tag is-audio">音频</span>`:'',
      state.serviceUsed?`<span class="ml-song-tag is-service">本堂</span>`:'',
      state.favorite?`<span class="ml-song-tag is-fav">收藏</span>`:''
    ].filter(Boolean).join('');
    return`<div class="ml-song-card ml-reveal" data-id="${s.id}">
      <div class="ml-card-art">${cover}</div>
      <div class="ml-card-body">
        <div class="ml-song-overline">${hi(overline,q)}</div>
        <div class="ml-song-title">${hi(s.title,q)}</div>
        <div class="ml-song-meta">${hi(meta||'收录歌词、简谱与练习资料',q)}</div>
        <div class="ml-song-tags">
          <div class="ml-song-tags-row ml-song-tags-primary">${primaryTags}</div>
          <div class="ml-song-tags-row ml-song-tags-secondary${secondaryTags?'':' is-empty'}">${secondaryTags}</div>
        </div>
      </div>
      <div class="ml-card-actions" aria-label="诗歌快捷操作">
        <button class="ml-card-play" type="button" ${hasSongAudio(s)?'':'disabled'} aria-label="播放">${icon('play',15)}<span>播放</span></button>
        <button class="ml-card-queue" type="button" ${hasSongAudio(s)?'':'disabled'} aria-label="添加到播放列表">${icon('queue',15)}</button>
        <button class="ml-card-share" type="button" aria-label="更多 / 分享">${icon('more',15)}</button>
        <button class="ml-card-favorite${state.favorite?' is-active':''}" type="button" aria-label="${state.favorite?'取消收藏':'收藏'}">${state.favorite?icon('heartFill',14):icon('heart',14)}</button>
      </div>
    </div>`;
  }

  function _div(cls){const d=document.createElement('div');d.className=cls;return d;}

  function getVoltaStartLabel(nStr){
    if(!nStr) return '';
    var m=nStr.match(/\[v:([^\]\s]+)\]/);
    if(m&&m[1]) return m[1];
    if(nStr.indexOf('[v1')>=0) return '1';
    if(nStr.indexOf('[v2')>=0) return '2';
    return '';
  }
  function hasVoltaEnd(nStr){
    return !!(nStr&&nStr.indexOf(']v')>=0);
  }
  function normalizeTimeSignValue(sig){
    const m=String(sig||'').trim().replace(/\s+/g,'').replace(/\uFF0F/g,'/').match(/^(\d{1,2})\/(\d{1,2})$/);
    return m?(m[1]+'/'+m[2]):'';
  }
  function extractInlineTimeSignToken(tok){
    const m=String(tok||'').trim().match(/^\[(?:ts|timesign|meter):([^\]]+)\]$/i);
    return m?normalizeTimeSignValue(m[1]):'';
  }
  function getSegInlineTimeSign(seg){
    if(!seg)return '';
    return normalizeTimeSignValue(seg.timeSign||seg.ts||seg.meter||'');
  }
  function makeBarline(tok){
    const o=document.createElement('span');
    o.style.cssText='display:inline-flex;flex-direction:column;align-items:flex-start;vertical-align:bottom;';
    const top=document.createElement('span');top.style.height='12px';o.appendChild(top);
    const mid=document.createElement('span');mid.style.cssText='display:inline-flex;align-items:stretch;height:26px;';
    function thin(){const l=document.createElement('span');l.style.cssText='width:1.5px;background:currentColor;flex-shrink:0;';return l;}
    function thick(){const l=document.createElement('span');l.style.cssText='width:3.5px;background:currentColor;flex-shrink:0;';return l;}
    function gap(px){const g=document.createElement('span');g.style.cssText='width:'+px+'px;flex-shrink:0;';return g;}
    function dots(){const d=document.createElement('span');d.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:6px;flex-shrink:0;';const d1=document.createElement('span');d1.style.cssText='width:3px;height:3px;border-radius:50%;background:currentColor;';const d2=document.createElement('span');d2.style.cssText='width:3px;height:3px;border-radius:50%;background:currentColor;';d.appendChild(d1);d.appendChild(d2);return d;}
    if(tok==='|'){mid.appendChild(thin());}
    else if(tok==='||'){mid.appendChild(thin());mid.appendChild(gap(2));mid.appendChild(thin());}
    else if(tok==='||/'||tok==='|]'){mid.appendChild(thin());mid.appendChild(gap(2));mid.appendChild(thick());}
    else if(tok==='|:'){mid.appendChild(thin());mid.appendChild(gap(1));mid.appendChild(thick());mid.appendChild(gap(3));mid.appendChild(dots());}
    else if(tok===':|'){mid.appendChild(dots());mid.appendChild(gap(3));mid.appendChild(thick());mid.appendChild(gap(1));mid.appendChild(thin());}
    else if(tok==='|:|'){mid.appendChild(dots());mid.appendChild(gap(3));mid.appendChild(thick());mid.appendChild(gap(1));mid.appendChild(thick());mid.appendChild(gap(3));mid.appendChild(dots());}
    o.appendChild(mid);
    const bot=document.createElement('span');bot.style.height='16px';o.appendChild(bot);
    return o;
  }
  function makeTimeSignature(sig){
    const norm=normalizeTimeSignValue(sig);
    if(!norm) return document.createDocumentFragment();
    const parts=norm.split('/');
    const o=document.createElement('span');o.className='jp-timesig';o.setAttribute('data-ts',norm);
    const topPad=document.createElement('span');topPad.className='jp-timesig-pad jp-timesig-pad-top';o.appendChild(topPad);
    const stack=document.createElement('span');stack.className='jp-timesig-stack';
    const top=document.createElement('span');top.className='jp-timesig-top';top.textContent=parts[0];
    const bot=document.createElement('span');bot.className='jp-timesig-bot';bot.textContent=parts[1];
    stack.appendChild(top);stack.appendChild(bot);o.appendChild(stack);
    const botPad=document.createElement('span');botPad.className='jp-timesig-pad jp-timesig-pad-bot';o.appendChild(botPad);
    return o;
  }
  function makeJpPlain(sym){
    const pl=document.createElement('span');pl.className='jp-plain';
    const t=document.createElement('span');t.className='jp-plain-top';pl.appendChild(t);
    const s=document.createElement('span');s.className='jp-plain-sym'+(sym==='-'?' is-dash':'');s.textContent=sym;pl.appendChild(s);
    s.style.display='inline-flex';
    s.style.alignItems='center';
    s.style.justifyContent='center';
    s.style.width='1em';
    s.style.height='1em';
    if(sym==='-'){
      s.style.fontSize='19px';
      s.style.position='relative';
      s.style.top='-0.12em';
      s.style.lineHeight='1';
      s.style.overflow='visible';
      s.textContent='';
      const dashLine=document.createElement('span');
      dashLine.className='jp-dash-line';
      styleJpDashLineEl(dashLine);
      s.appendChild(dashLine);
    }
    const b=document.createElement('span');b.className='jp-plain-bot';pl.appendChild(b);
    return pl;
  }
  function setDots(el,cnt){
    el.innerHTML='';
    for(var i=0;i<cnt;i++){const d=document.createElement('span');d.textContent='·';el.appendChild(d);}
  }
  function styleJpNumEl(el){
    if(!el)return;
    el.style.display='inline-flex';
    el.style.alignItems='center';
    el.style.justifyContent='center';
    el.style.textAlign='center';
    el.style.width='1em';
    el.style.height='1em';
    el.style.position='relative';
    el.style.top='-0.12em';
  }
  function styleJpAugEl(el){
    if(!el)return;
    el.style.position='absolute';
    el.style.right='-0.46em';
    el.style.top='50%';
    el.style.transform='translateY(-50%)';
    el.style.pointerEvents='none';
  }
  function styleJpAccEl(el){
    if(!el)return;
    el.style.position='absolute';
    el.style.left='-0.32em';
    el.style.top='-0.08em';
    el.style.transform='none';
    el.style.fontSize='12px';
    el.style.fontWeight='700';
    el.style.lineHeight='1';
    el.style.pointerEvents='none';
  }
  function styleJpDashLineEl(el){
    if(!el)return;
    el.style.position='absolute';
    el.style.left='0.22em';
    el.style.right='0.22em';
    el.style.top='50%';
    el.style.height='1.5px';
    el.style.transform='translateY(-50%)';
    el.style.background='currentColor';
    el.style.borderRadius='2px';
    el.style.pointerEvents='none';
  }
  function makeJpUnderlineLine(level){
    const ln=document.createElement('span');
    ln.className=level===2?'jp-u2-line':'jp-u1-line';
    ln.style.display='block';
    ln.style.position='absolute';
    ln.style.left='0';
    ln.style.right='0';
    ln.style.bottom=level===2?'0':'3px';
    ln.style.height='1.5px';
    ln.style.background='currentColor';
    ln.style.marginTop='0';
    ln.style.alignSelf='auto';
    ln.style.pointerEvents='none';
    ln.style.zIndex='1';
    return ln;
  }
  function parseDualJpToken(tok){
    var raw=String(tok||'').replace(/\uFF0F/g,'/');
    var idx=raw.indexOf('/');
    if(idx<0||idx!==raw.lastIndexOf('/'))return null;
    var top=raw.slice(0,idx).trim();
    var bot=raw.slice(idx+1).trim();
    if(!top&&!bot)return null;
    return {top:top||'sp',bot:bot||'sp'};
  }
  function makeDualJpToken(pair){
    const w=document.createElement('span');w.className='jp-dual';
    const t=document.createElement('span');t.className='jp-dual-top';t.appendChild(parseJpToken(pair.top,{inDual:true}));w.appendChild(t);
    const b=document.createElement('span');b.className='jp-dual-bot';b.appendChild(parseJpToken(pair.bot,{inDual:true}));w.appendChild(b);
    return w;
  }
  function parseJpToken(tok,opts){
    opts=opts||{};
    tok=String(tok||'');
    if(tok==='|'||tok==='||'||tok==='||/'||tok==='|]'||tok==='|:'||tok===':|'||tok==='|:|')return makeBarline(tok);
    const dual=!opts.inDual?parseDualJpToken(tok):null;
    if(dual)return makeDualJpToken(dual);
    if(!tok||tok==='-'||tok===' ')return makeJpPlain(tok);
    var hasFermata=false;
    if(tok.slice(-1)==='^'){hasFermata=true;tok=tok.slice(0,-1);}
    if(tok==='sp'||tok==='sp_'||tok==='sp__'){
      const fake=tok==='sp__'?'0__':tok==='sp_'?'0_':'0';
      const e2=parseJpToken(fake);
      const ns=e2.querySelector('.jp-num')||e2.querySelector('.jp-plain-sym');
      if(ns)ns.style.visibility='hidden';
      return e2;
    }
    var zm=tok.match(/^(0·?)(_*)$/);
    if(zm){
      var wz=document.createElement('span');wz.className='jp-wrap';
      var tdz=document.createElement('span');tdz.className='jp-dot-top';wz.appendChild(tdz);
      var lwz=document.createElement('span');lwz.className='jp-lines-wrap';
      var nrz=document.createElement('span');nrz.className='jp-num-row';
      var nsz=document.createElement('span');nsz.className='jp-num';nsz.textContent='0';styleJpNumEl(nsz);nrz.appendChild(nsz);
      if(zm[1].indexOf('\u00b7')>-1){var agz=document.createElement('span');agz.className='jp-aug';agz.textContent='·';styleJpAugEl(agz);nsz.appendChild(agz);}
      var ulz=zm[2].length;
      lwz.appendChild(nrz);
      if(ulz>=1)lwz.appendChild(makeJpUnderlineLine(1));
      if(ulz===2)lwz.appendChild(makeJpUnderlineLine(2));
      wz.appendChild(lwz);
      var bdz=document.createElement('span');bdz.className='jp-dot-bot';wz.appendChild(bdz);
      return wz;
    }
    let num=tok,isHigh=0,isLow=0,isDot=false,uline=0;
    if(num.slice(-2)==='__'){uline=2;num=num.slice(0,-2);} else if(num.slice(-1)==='_'){uline=1;num=num.slice(0,-1);}
    if(num.indexOf('\u00b7')>-1){isDot=true;num=num.replace(/\u00b7/g,'');}
    const hm=num.match(/^(.+?)('+)$/);if(hm){isHigh=hm[2].length;num=hm[1];}
    const lm=num.match(/^(.+?)(,+)$/);if(lm){isLow=lm[2].length;num=lm[1];}
    var acc='';
    const am=num.match(/^([#b\u266f\u266d\u266e=])([0-7])$/);
    if(am){acc=am[1]==='#'?'\u266f':am[1]==='b'?'\u266d':am[1]==='='?'\u266e':am[1];num=am[2];}
    var w=document.createElement('span');w.className='jp-wrap'+(acc?' has-acc':'');
    if(acc)w.style.minWidth='1.35em';
    var td=document.createElement('span');td.className='jp-dot-top';setDots(td,isHigh>=2?2:isHigh);w.appendChild(td);
    var lw2=document.createElement('span');lw2.className='jp-lines-wrap';
    var numRow=document.createElement('span');numRow.className='jp-num-row';
    if(acc){var ac=document.createElement('span');ac.className='jp-acc';ac.textContent=acc;styleJpAccEl(ac);numRow.appendChild(ac);}
    var ns2=document.createElement('span');ns2.className='jp-num';ns2.textContent=num;styleJpNumEl(ns2);numRow.appendChild(ns2);
    if(isDot){var dot=document.createElement('span');dot.className='jp-aug';dot.textContent='·';styleJpAugEl(dot);ns2.appendChild(dot);}
    lw2.appendChild(numRow);
    if(uline>=1)lw2.appendChild(makeJpUnderlineLine(1));
    if(uline===2)lw2.appendChild(makeJpUnderlineLine(2));
    w.appendChild(lw2);
    var bot=document.createElement('span');bot.className='jp-dot-bot';setDots(bot,isLow>=2?2:isLow);w.appendChild(bot);
    if(hasFermata){var fw=document.createElement('span');fw.className='jp-fermata';fw.appendChild(w);return fw;}
    return w;
  }

  function makeTuplet(n){
    var w=document.createElement('span');w.className='jp-tuplet';
    var br=document.createElement('span');br.className='jp-tuplet-br';w.appendChild(br);
    var nm=document.createElement('span');nm.className='jp-tuplet-num';nm.textContent=String(n);w.appendChild(nm);
    return w;
  }
  function renderNStr(nStr,opts){
    opts=opts||{};
    var d=document.createElement('div');d.className='p-n';
    var headTimeSign=normalizeTimeSignValue(opts.inlineTimeSign||'');
    if(headTimeSign)d.appendChild(makeTimeSignature(headTimeSign));
    if(!nStr||!nStr.trim())return d;
    function appendRenderedTok(parent,tk){
      var inlineTs=extractInlineTimeSignToken(tk);
      parent.appendChild(inlineTs?makeTimeSignature(inlineTs):parseJpToken(tk));
    }
    function isDualAtom(tk){
      if(!tk||tk==='/'||tk==='／')return false;
      if(tk==='('||tk===')'||tk==='(['||tk==='])'||tk==='}'||tk==='[v1'||tk==='[v2'||tk===']v')return false;
      if(tk==='|'||tk==='||'||tk==='||/'||tk==='|]'||tk==='|:'||tk===':|'||tk==='|:|')return false;
      if(/^\{(3|5)$/.test(tk))return false;
      if(extractInlineTimeSignToken(tk))return false;
      if(/^\[v:(.+)\]$/.test(tk))return false;
      return true;
    }
    var rawToks=nStr.trim().split(/\s+/),toks=[],ti=0;
    while(ti<rawToks.length){
      if(ti+2<rawToks.length && (rawToks[ti+1]==='/'||rawToks[ti+1]==='／') && isDualAtom(rawToks[ti]) && isDualAtom(rawToks[ti+2])){
        toks.push(rawToks[ti]+'/'+rawToks[ti+2]);
        ti+=3;
        continue;
      }
      toks.push(rawToks[ti]);
      ti++;
    }
    var i=0;
    while(i<toks.length){
      var t=toks[i];
      var inlineTs=extractInlineTimeSignToken(t);
      if(inlineTs){d.appendChild(makeTimeSignature(inlineTs));i++;continue;}
      if(t==='('){var sl=document.createElement('span');sl.className='jp-slur';i++;while(i<toks.length&&toks[i]!==')')appendRenderedTok(sl,toks[i++]);d.appendChild(sl);i++;continue;}
      if(t==='(['){var so=document.createElement('span');so.className='jp-slur-open';i++;while(i<toks.length&&toks[i]!=='])')appendRenderedTok(so,toks[i++]);if(i<toks.length)i++;d.appendChild(so);continue;}
      if(t==='])'){var sc=document.createElement('span');sc.className='jp-slur-close';i++;if(i<toks.length)appendRenderedTok(sc,toks[i++]);d.appendChild(sc);continue;}
      if(t==='[v1'||t==='[v2'||t===']v'||/^\[v:(.+)\]$/.test(t)){i++;continue;}
      var tm2=t.match(/^\{(3|5)$/);if(tm2){var tn=parseInt(tm2[1],10);var tp=makeTuplet(tn);i++;while(i<toks.length&&toks[i]!=='}')appendRenderedTok(tp,toks[i++]);d.appendChild(tp);i++;continue;}
      if(t==='}'){i++;continue;}
      appendRenderedTok(d,t);i++;
    }
    return d;
  }

  const NOTE_MAP={C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
  const NOTES_SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const NOTES_FLAT =['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const FLAT_KEYS=new Set(['F','Bb','Eb','Ab','Db','Gb','Cb']);
  const USE_FLAT_MINOR_ROOTS=new Set(['D','G','C','F','Bb','Eb']);
  const KEY_SET_FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const KEY_SET_SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const ENHARMONIC_FLAT={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
  const ENHARMONIC_SHARP={Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
  function parseKeyName(key){
    const k=(key||'').trim();
    if(!k)return {root:'C',suf:''};
    const m=k.match(/^([A-G](?:#|b)?)(.*)$/);
    if(!m)return {root:k,suf:''};
    return {root:m[1],suf:m[2]||''};
  }
  function needFlat(root,suf){
    const minor=/m(?!aj)/i.test(suf);
    if(minor) return USE_FLAT_MINOR_ROOTS.has(root);
    return FLAT_KEYS.has(root);
  }
  function trKeyName(key,st,useFlat){
    const {root,suf}=parseKeyName(key);
    if(NOTE_MAP[root]===undefined)return key;
    const n=(NOTE_MAP[root]+st+120)%12;
    const flat=(useFlat!==undefined)?useFlat:needFlat(root,suf);
    const nr=flat?NOTES_FLAT[n]:NOTES_SHARP[n];
    return nr+suf;
  }
  function trBass(bass,st,useFlat){
    return trKeyName(bass,st,useFlat);
  }
  function normLyricText(text){
    return String(text||'');
  }
  const IS_APPLE_DEVICE=/Mac|iPad|iPhone|iPod/.test(navigator.platform||'')||/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent||'');
  const GAP_CANDIDATES=['\u3164','\u3000','\u2003','\u00a0'];
  const GAP_CHAR_CACHE=new Map();
  const GAP_WIDTH_CACHE=new Map();
  function pickRenderableGapChar(el){
    if(!el||!document.body)return '\u3000';
    const cs=getComputedStyle(el);
    const key=[cs.font,cs.letterSpacing,cs.wordSpacing,cs.lineHeight].join('|');
    if(GAP_CHAR_CACHE.has(key))return GAP_CHAR_CACHE.get(key);
    const probe=document.createElement('span');
    probe.style.cssText='position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:pre;pointer-events:none;';
    probe.style.font=cs.font;
    probe.style.letterSpacing=cs.letterSpacing;
    probe.style.wordSpacing=cs.wordSpacing;
    probe.style.lineHeight=cs.lineHeight;
    document.body.appendChild(probe);
    let pick='\u3000';
    for(const ch of GAP_CANDIDATES){
      probe.textContent=ch;
      if(probe.getBoundingClientRect().width>0.2){pick=ch;break;}
    }
    probe.remove();
    GAP_CHAR_CACHE.set(key,pick);
    return pick;
  }
  function measureGapWidth(el,sample){
    if(!el||!document.body)return 0;
    const cs=getComputedStyle(el);
    const key=[sample,cs.font,cs.letterSpacing,cs.wordSpacing,cs.lineHeight].join('|');
    if(GAP_WIDTH_CACHE.has(key))return GAP_WIDTH_CACHE.get(key);
    const probe=document.createElement('span');
    probe.style.cssText='position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:pre;pointer-events:none;';
    probe.style.font=cs.font;
    probe.style.letterSpacing=cs.letterSpacing;
    probe.style.wordSpacing=cs.wordSpacing;
    probe.style.lineHeight=cs.lineHeight;
    probe.textContent=sample;
    document.body.appendChild(probe);
    const w=probe.getBoundingClientRect().width;
    probe.remove();
    GAP_WIDTH_CACHE.set(key,w);
    return w;
  }
  function appendGapNode(el,cls,width,ch){
    const gap=document.createElement('span');
    gap.className=cls;
    gap.setAttribute('aria-hidden','true');
    if(width>0){
      gap.style.display='inline-block';
      gap.style.width=width+'px';
      gap.textContent=' ';
    }else{
      gap.textContent=ch;
    }
    el.appendChild(gap);
  }
  function normalizeRenderableGapText(el,text){
    return String(text||'').replace(/\u3164/g,pickRenderableGapChar(el));
  }
  function setChordContent(el,text){
    const raw=String(text||'');
    if(!IS_APPLE_DEVICE){
      el.textContent=normalizeRenderableGapText(el,raw);
      return;
    }
    const gapWidth=measureGapWidth(el,'0');
    el.textContent='';
    for(const ch of raw){
      if(ch==='\u3164') appendGapNode(el,'chord-gap',gapWidth,ch);
      else el.appendChild(document.createTextNode(ch));
    }
  }
  function setLyricContent(el,text){
    const raw=String(text||'');
    const gapChar=pickRenderableGapChar(el);
    const gapWidth=IS_APPLE_DEVICE?measureGapWidth(el,'我'):0;
    el.textContent='';
    for(const ch of raw){
      if(ch==='\u3164'){
        appendGapNode(el,'lyric-gap',gapWidth,gapChar);
      }else{
        el.appendChild(document.createTextNode(ch));
      }
    }
  }
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
        var text=cleanChordText(el.textContent);
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
  /* 合法和弦 token 判定（同 CECP-CHORD-STYLE chordStylePitchClass 的思路）：
     根音 A-G 须在 token 开头（允许前置括号），可跟 #/b，
     其后若为小写字母则首字母限 m/s/a/d ——
     排除写在 chord 字段里的 "Fine"/"To Chorus" 等段落标记。 */
  function isChordLikeToken(token){
    const s=String(token||'').trim();
    let i=0;
    while(i<s.length&&s.charAt(i)==='(')i++;
    const ch=s.charAt(i);
    if(ch<'A'||ch>'G')return false;
    let j=i+1;
    const nx=s.charAt(j);
    if(nx==='#'||nx==='b')j++;
    const after=s.charAt(j);
    if(after>='a'&&after<='z'&&'msad'.indexOf(after)<0)return false;
    return true;
  }
  function trChordToken(ch,st,useFlat){
    const raw=String(ch||'');
    if(!isChordLikeToken(raw))return raw;
    const m=raw.match(/^([A-G](?:#|b)?)([^A-G]*)(.*)$/);
    if(m && m[1] && !m[3]){
      let rest=m[2]||'';
      rest=rest.replace(/\/\s*([A-G](?:#|b)?)/g,(a,b)=>'/'+trBass(b,st,useFlat));
      return trKeyName(m[1],st,useFlat)+rest;
    }
    return raw.replace(/(^|[^A-Za-z#b])([A-G](?:#|b)?)(maj|min|dim|aug|sus|add|m(?!aj)|[0-9+\-#b°øº⁰¹²³⁴⁵⁶⁷⁸⁹]*)(\/\s*([A-G](?:#|b)?))?(?=$|[^A-Za-z#b])/g,function(_,lead,root,suf,bassPart,bassRoot){
      let out=trKeyName(root,st,useFlat)+(suf||'');
      if(bassPart)out+='/'+trBass(bassRoot,st,useFlat);
      return lead+out;
    });
  }
  function resizeChordGap(gap,len){
    const chars=[...String(gap||'')].map(ch=>ch==='\u3164'?'\u3000':ch);
    if(!chars.length||len<=0)return '';
    let out='';
    for(let i=0;i<len;i++)out+=chars[i%chars.length];
    return out;
  }
  function trChord(ch,st,useFlat){
    if(!ch)return ch;
    const parts=String(ch).split(/([ \t\u3164]+)/);
    let out='';
    for(let i=0;i<parts.length;i++){
      const part=parts[i];
      if(!/[^\s\u3164]/.test(part)){out+=part;continue;}
      const tr=trChordToken(part,st,useFlat);
      out+=tr;
      if(i+1<parts.length&&/[ \t\u3164]+/.test(parts[i+1])){
        const gap=parts[i+1];
        let nextLen=Math.max(0,[...gap].length + ([...part].length - [...tr].length));
        if(nextLen===0 && i+2<parts.length && /[^\s\u3164]/.test(parts[i+2]))nextLen=1;
        out+=resizeChordGap(gap,nextLen);
        i++;
      }
    }
    return out;
  }
  function calcCapo(target,orig){
    const {root:targetRoot,suf:targetSuf}=parseKeyName(target);
    const {root:origRoot}=parseKeyName(orig);
    const t=NOTE_MAP[targetRoot], o=NOTE_MAP[origRoot];
    if(t===undefined||o===undefined)return {st:0,capo:0,playKey:target};
    const st=(t-o+12)%12;
    let best=null;
    ['C','D','E','F','G','A','B'].forEach(function(pk){
      const c=(t-NOTE_MAP[pk]+12)%12;
      if(c<=7 && (!best || c<best.capo)) best={playKey:pk+targetSuf,capo:c};
    });
    return {st, capo:best?best.capo:0, playKey:best?best.playKey:target};
  }
  function stepKeyName(key,delta,useFlat){
    const parsed=parseKeyName(key);
    const n=NOTE_MAP[parsed.root];
    if(n===undefined)return key;
    const roots=useFlat?NOTES_FLAT:NOTES_SHARP;
    return roots[(n+delta+120)%12]+parsed.suf;
  }
  function enharmonicKeyName(key,useFlat){
    const parsed=parseKeyName(key);
    const root=useFlat?(ENHARMONIC_FLAT[parsed.root]||parsed.root):(ENHARMONIC_SHARP[parsed.root]||parsed.root);
    return root+parsed.suf;
  }

  let _mpAudio=null,_mpSongs=[],_mpIdx=-1,_mpLoop=false,_mpShuffle=false,_mpLrc=[],_mpLrcIdx=-1,_mpLrcTimed=false,_mpCurrentSong=null,_mpCoverFallback='',_mpExpanded=false,_mpSideMode='song',_mpSideCollapsed=false,_mpLyricsOpen=true,_mpPlayRequestId=0,_mpReturnUrl='';
  let _mpAudioCtx=null,_mpPitchGraph=null,_mpPitchGraphPromise=null,_mpPitchGraphFailed=false,_mpPitchSemi=0,_mpFinePitch=0,_mpSpeed=1,_mpPitchMode='off',_mpPitchStore=null,_mpPitchWarned=false;
  let _mpAbLoop=false,_mpLoopA=0,_mpLoopB=30,_mpPanelOpen=false;
  const MP_PITCH_KEY='cecp:musiclib:audio-pitch:v1';
  const MP_PITCH_MIN=-12;
  const MP_PITCH_MAX=12;

  function _mpFmt(t){
    if(!isFinite(t)) return '0:00';
    const m=Math.floor(t/60), s=Math.floor(t%60);
    return m+':'+String(s).padStart(2,'0');
  }
  function _mpClampPitch(v){
    return Math.max(MP_PITCH_MIN,Math.min(MP_PITCH_MAX,parseInt(v,10)||0));
  }
  function _mpClampFinePitch(v){
    return Math.max(-100,Math.min(100,parseInt(v,10)||0));
  }
  function _mpClampSpeed(v){
    return Math.max(0.25,Math.min(4,parseFloat(v)||1));
  }
  function _mpTotalPitch(){
    return _mpClampPitch(_mpPitchSemi)+(_mpClampFinePitch(_mpFinePitch)/100);
  }
  function _mpPitchText(v){
    v=_mpClampPitch(v);
    return v>0?'+'+v:String(v);
  }
  function _mpFinePitchText(v){
    v=_mpClampFinePitch(v);
    return v>0?'+'+v:String(v);
  }
  function _mpSpeedText(v){
    return Math.round(_mpClampSpeed(v)*100)+'%';
  }
  function _mpLoadPitchStore(){
    if(_mpPitchStore) return _mpPitchStore;
    try{
      _mpPitchStore=JSON.parse(localStorage.getItem(MP_PITCH_KEY)||'{}')||{};
    }catch(_){
      _mpPitchStore={};
    }
    return _mpPitchStore;
  }
  function _mpSaveSongPitch(songId,value){
    if(!songId) return;
    const store=_mpLoadPitchStore();
    const next={
      transpose:_mpClampPitch(value),
      pitch:_mpClampFinePitch(_mpFinePitch),
      speed:Math.round(_mpClampSpeed(_mpSpeed)*100)
    };
    if(next.transpose||next.pitch||next.speed!==100) store[songId]=next;
    else delete store[songId];
    try{ localStorage.setItem(MP_PITCH_KEY,JSON.stringify(store)); }catch(_){}
  }
  function _mpSongPitchSettings(song){
    const id=song&&song.id;
    const raw=id?_mpLoadPitchStore()[id]:null;
    if(typeof raw==='number') return {transpose:_mpClampPitch(raw),pitch:0,speed:100};
    if(raw&&typeof raw==='object'){
      return {
        transpose:_mpClampPitch(raw.transpose),
        pitch:_mpClampFinePitch(raw.pitch),
        speed:Math.round(_mpClampSpeed((raw.speed||100)/100)*100)
      };
    }
    return {transpose:0,pitch:0,speed:100};
  }
  function _mpSetPitchUi(value,mode){
    const trans=_mpClampPitch(value);
    const fine=_mpClampFinePitch(_mpFinePitch);
    const speed=_mpClampSpeed(_mpSpeed);
    const active=trans!==0||fine!==0||Math.round(speed*100)!==100;
    const displayMode=(mode==='off'&&Math.round(speed*100)!==100)?'rate':mode;
    document.querySelectorAll('.ml-audio-tool').forEach(el=>{
      el.classList.toggle('is-shifted',active);
      el.classList.toggle('is-native',mode==='limited');
      el.classList.toggle('is-pro',mode==='pro');
      el.classList.toggle('is-rate',false);
      el.classList.toggle('is-loading',mode==='loading');
      el.classList.toggle('is-limited',mode==='limited');
      el.dataset.pitchMode=displayMode||'off';
      el.title=mode==='pro'?'SoundTouch 独立变调':(mode==='loading'?'正在启动音频处理':'MP3 练习控制');
      const v=el.querySelector('.ml-audio-tool-v');
      const tag=el.querySelector('.ml-audio-tool-mode');
      if(v) v.textContent=active ? `调性 ${_mpPitchText(trans)} · Pitch ${_mpFinePitchText(fine)} · ${_mpSpeedText(speed)}` : '练习';
      if(tag) tag.textContent=mode==='pro'?'PRO':(mode==='loading'?'…':(mode==='limited'?'ERR':'OFF'));
    });
    const set=(id,val)=>{ const el=$(id); if(el) el.textContent=val; };
    const setVal=(id,val)=>{ const el=$(id); if(el) el.value=String(val); };
    set('ml-audio-transpose-value',_mpPitchText(trans));
    set('ml-audio-pitch-value',_mpFinePitchText(fine));
    set('ml-audio-speed-value',_mpSpeedText(speed));
    setVal('ml-audio-transpose-range',trans);
    setVal('ml-audio-pitch-range',fine);
    setVal('ml-audio-speed-range',Math.round(speed*100));
    const song=_mpSongs[_mpIdx]||{};
    const bpm=parseInt(song.bpm,10);
    set('ml-audio-tempo-value',bpm?`${Math.round(bpm*speed)} bpm`:'— bpm');
    const transRow=document.querySelector('#ml-audio-panel .ml-audio-panel-row[data-control="transpose"]');
    const speedRow=document.querySelector('#ml-audio-panel .ml-audio-panel-row[data-control="speed"]');
    const pitchRow=document.querySelector('#ml-audio-panel .ml-audio-panel-row[data-control="pitch"]');
    const loopRow=document.querySelector('#ml-audio-panel .ml-audio-panel-row[data-control="loop"]');
    if(transRow) transRow.classList.toggle('is-active',trans!==0);
    if(pitchRow) pitchRow.classList.toggle('is-active',fine!==0);
    if(speedRow) speedRow.classList.toggle('is-active',Math.round(speed*100)!==100);
    if(loopRow) loopRow.classList.toggle('is-active',!!_mpAbLoop);
    document.querySelectorAll('.ml-audio-speed-presets button').forEach(btn=>{
      const preset=_mpClampSpeed(btn.dataset.speed);
      btn.classList.toggle('active',Math.round(preset*100)===Math.round(speed*100));
    });
    _mpSyncPanelPlaybackUi();
  }
  function _mpSetParam(param,value){
    if(!param) return;
    try{
      const now=_mpAudioCtx?_mpAudioCtx.currentTime:0;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value,now,0.012);
    }catch(_){
      try{ param.value=value; }catch(__){}
    }
  }
  async function _mpCanReadCurrentAudio(){
    if(!_mpAudio) return false;
    const src=_mpAudio.currentSrc||_mpAudio.src||'';
    if(!src) return false;
    try{
      const url=new URL(src,location.href);
      if(url.origin===location.origin) return true;
      if(_mpAudio.crossOrigin!=='anonymous') return false;
      const response=await fetch(url.href,{method:'HEAD',mode:'cors',cache:'no-store',credentials:'omit'});
      return response.ok;
    }catch(err){
      try{ console.warn('[musiclib] CORS audio check failed',err); }catch(_){}
      return false;
    }
  }
  function _mpCreateSoundTouchNode(ctx){
    return new AudioWorkletNode(ctx,'soundtouch-processor',{
      numberOfInputs:1,
      numberOfOutputs:1,
      outputChannelCount:[2],
      processorOptions:{sampleBufferType:'circular',interpolationStrategy:'lanczos'}
    });
  }
  function _mpEnsurePitchGraph(){
    if(!_mpAudio) return Promise.resolve(false);
    if(_mpPitchGraph&&_mpPitchGraph.ready) return Promise.resolve(true);
    if(_mpPitchGraphPromise) return _mpPitchGraphPromise;
    if(_mpPitchGraphFailed) return Promise.resolve(false);
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC||!window.AudioWorkletNode) return Promise.resolve(false);

    _mpPitchGraphPromise=(async()=>{
      const readable=await _mpCanReadCurrentAudio();
      if(!readable) throw new Error('Audio CORS is not available');

      _mpAudioCtx=_mpAudioCtx||new AC({latencyHint:'playback'});
      await _mpAudioCtx.audioWorklet.addModule(SOUNDTOUCH_PROCESSOR_URL);

      const source=_mpAudioCtx.createMediaElementSource(_mpAudio);
      const dry=_mpAudioCtx.createGain();
      const wet=_mpAudioCtx.createGain();
      const limiter=_mpAudioCtx.createDynamicsCompressor();
      const node=_mpCreateSoundTouchNode(_mpAudioCtx);

      dry.gain.value=1;
      wet.gain.value=0;
      limiter.threshold.value=-3;
      limiter.knee.value=6;
      limiter.ratio.value=12;
      limiter.attack.value=0.004;
      limiter.release.value=0.12;

      source.connect(dry);
      dry.connect(_mpAudioCtx.destination);
      source.connect(node);
      node.connect(wet);
      wet.connect(limiter);
      limiter.connect(_mpAudioCtx.destination);

      _mpPitchGraph={source,dry,wet,node,limiter,ready:true,warmed:false,lastMetrics:null};
      node.port.onmessage=event=>{
        const data=event&&event.data;
        if(!data||data.type!=='metrics'||!_mpPitchGraph||_mpPitchGraph.node!==node) return;
        _mpPitchGraph.lastMetrics=data;
        const hasAudio=Number(data.outputPeak)>0.00005||Number(data.outputRms)>0.00002;
        if(!_mpPitchGraph.warmed&&hasAudio&&Number(data.blockCount)>=80){
          _mpPitchGraph.warmed=true;
          if(Math.abs(_mpTotalPitch())>0.0001) _mpPitchMode='pro';
          _mpApplyPitch();
        }
      };
      node.onprocessorerror=()=>{
        if(!_mpPitchGraph||_mpPitchGraph.node!==node) return;
        _mpPitchGraph.warmed=false;
        _mpPitchMode='limited';
        _mpApplyPitch();
        showToast('音频处理器发生错误，已自动恢复原声');
      };
      if(_mpAudioCtx.state==='suspended') await _mpAudioCtx.resume();
      return true;
    })().catch(err=>{
      _mpPitchGraphFailed=true;
      if(!_mpPitchWarned){
        _mpPitchWarned=true;
        try{ console.error('[musiclib] SoundTouch pitch processor unavailable',err); }catch(_){}
      }
      return false;
    }).finally(()=>{
      _mpPitchGraphPromise=null;
    });
    return _mpPitchGraphPromise;
  }
  function _mpApplyPitch(){
    const semi=_mpClampPitch(_mpPitchSemi);
    const total=_mpTotalPitch();
    const speed=_mpClampSpeed(_mpSpeed);
    const shifted=Math.abs(total)>0.0001 && _mpPitchMode==='pro' && _mpPitchGraph&&_mpPitchGraph.ready&&_mpPitchGraph.warmed;

    _mpSetPitchUi(semi,_mpPitchMode);
    if(_mpAudio){
      try{ _mpAudio.playbackRate=speed; }catch(_){}
      try{ _mpAudio.preservesPitch=!shifted; }catch(_){}
      try{ _mpAudio.mozPreservesPitch=!shifted; }catch(_){}
      try{ _mpAudio.webkitPreservesPitch=!shifted; }catch(_){}
    }
    if(!_mpPitchGraph||!_mpPitchGraph.ready) return;

    _mpSetParam(_mpPitchGraph.node.parameters.get('pitch'),1);
    _mpSetParam(_mpPitchGraph.node.parameters.get('pitchSemitones'),total);
    _mpSetParam(_mpPitchGraph.node.parameters.get('playbackRate'),speed);

    const now=_mpAudioCtx.currentTime;
    const switchAt=now;
    try{
      _mpPitchGraph.dry.gain.cancelScheduledValues(now);
      _mpPitchGraph.wet.gain.cancelScheduledValues(now);
      _mpPitchGraph.dry.gain.setTargetAtTime(shifted?0:1,switchAt,0.055);
      _mpPitchGraph.wet.gain.setTargetAtTime(shifted?1:0,switchAt,0.055);
    }catch(_){
      _mpPitchGraph.dry.gain.value=shifted?0:1;
      _mpPitchGraph.wet.gain.value=shifted?1:0;
    }
  }
  function _mpSetPitch(value,save=true){
    _mpPitchSemi=_mpClampPitch(value);
    const total=_mpTotalPitch();
    if(save){
      const song=_mpSongs[_mpIdx]||_mpCurrentSong;
      _mpSaveSongPitch(song&&song.id,_mpPitchSemi);
    }
    if(Math.abs(total)<0.0001){
      _mpPitchMode='off';
      _mpApplyPitch();
      return true;
    }

    _mpPitchMode='loading';
    _mpApplyPitch();
    _mpEnsurePitchGraph().then(ok=>{
      if(Math.abs(_mpTotalPitch())<0.0001){
        _mpPitchMode='off';
      }else if(!ok){
        _mpPitchMode='limited';
      }else{
        _mpPitchMode=(_mpPitchGraph&&_mpPitchGraph.warmed)?'pro':'loading';
      }
      _mpApplyPitch();
      if(!ok&&save) showToast('变调处理未启动，请确认 soundtouch-processor.js 已上传');
    });
    return true;
  }
  function _mpNudgePitch(delta){
    _mpSetPitch(_mpPitchSemi+delta,true);
  }
  function _mpSetFinePitch(value,save=true){
    _mpFinePitch=_mpClampFinePitch(value);
    _mpSetPitch(_mpPitchSemi,save);
  }
  function _mpSetSpeed(value,save=true){
    _mpSpeed=_mpClampSpeed(value);
    if(save){
      const song=_mpSongs[_mpIdx];
      _mpSaveSongPitch(song&&song.id,_mpPitchSemi);
    }
    _mpApplyPitch();
  }
  function _mpApplySongPitchSettings(song,save=false){
    const settings=_mpSongPitchSettings(song);
    _mpPitchSemi=settings.transpose;
    _mpFinePitch=settings.pitch;
    _mpSpeed=_mpClampSpeed(settings.speed/100);
    _mpSetPitch(_mpPitchSemi,save);
  }
  function _mpPrepareAudioSrc(url){
    if(!_mpAudio) return url||'';
    const next=url||'';
    try{
      const mediaUrl=new URL(next,location.href);
      const isAllowedCecpAudio=mediaUrl.hostname==='cecp.it' && mediaUrl.pathname.startsWith('/upload/');
      const needsCors=mediaUrl.origin!==location.origin && isAllowedCecpAudio;
      if(needsCors){
        _mpAudio.crossOrigin='anonymous';
        _mpAudio.setAttribute('crossorigin','anonymous');
      }else if(mediaUrl.origin===location.origin){
        _mpAudio.removeAttribute('crossorigin');
        _mpAudio.crossOrigin=null;
      }else{
        _mpAudio.removeAttribute('crossorigin');
        _mpAudio.crossOrigin=null;
      }
    }catch(_){
      try{
        _mpAudio.removeAttribute('crossorigin');
        _mpAudio.crossOrigin=null;
      }catch(__){}
    }
    return next;
  }
  function _mpSetCover(src){
    const el=$('ml-mp-cover');
    const xl=$('ml-player-cover');
    const dl=$('ml-player-dock-cover');
    const nb=$('ml-nowbar-cover');
    if(!el) return;
    if(src){
      el.innerHTML=`<img src="${src}" alt="">`;
      if(xl) xl.innerHTML=`<img src="${src}" alt="">`;
      if(dl) dl.innerHTML=`<img src="${src}" alt="">`;
      if(nb) nb.innerHTML=`<img src="${src}" alt="">`;
    }else{
      el.innerHTML='<span>♪</span>';
      if(xl) xl.innerHTML='<span>♪</span>';
      if(dl) dl.innerHTML='<span>♪</span>';
      if(nb) nb.innerHTML='<span>♪</span>';
    }
  }
  function _mpGetReturnUrl(){
    return window.location.pathname+window.location.search+window.location.hash;
  }
  function _mpRememberReturnUrl(){
    _mpReturnUrl=_mpGetReturnUrl();
  }
  function _mpRestoreReturnUrl(){
    if(!_mpReturnUrl) return;
    try{
      if(_mpGetReturnUrl()!==_mpReturnUrl){
        history.replaceState(history.state||null,'',_mpReturnUrl);
      }
    }catch(_){}
  }
  function _mpCloseExpandedFromHistory(){
    const pv=$('ml-player-view');
    _mpExpanded=false;
    if(pv){
      pv.classList.remove('open');
      pv.classList.toggle('side-collapsed',!!_mpSideCollapsed);
    }
    document.body.style.overflow='';
    _mpRestoreReturnUrl();
  }
  function _mpSetExpanded(open){
    const pv=$('ml-player-view');
    if(!pv) return;
    const wasExpanded=_mpExpanded;
    if(!open && wasExpanded && history.state && history.state.__mlPlayerView){
      try{ history.back(); }catch(e){}
      return;
    }
    _mpExpanded=!!open;
    pv.classList.toggle('open',_mpExpanded);
    pv.classList.toggle('side-collapsed',!!_mpSideCollapsed);
    document.body.style.overflow=_mpExpanded?'hidden':'';
    if(_mpExpanded&&!wasExpanded){
      _mpRememberReturnUrl();
      try{
        history.pushState(
          Object.assign({},history.state||{},{__mlPlayerView:true,__mlSongId:getSongIdFromUrl()||(_mpCurrentSong&&_mpCurrentSong.id)||''}),
          '',
          _mpReturnUrl||location.href
        );
      }catch(e){}
    }else if(!_mpExpanded&&wasExpanded){
      _mpRestoreReturnUrl();
    }
  }
  function _mpSetSideMode(mode){
    _mpSideMode=(mode==='queue')?'queue':'song';
    const tabSong=$('ml-player-tab-song');
    const tabQueue=$('ml-player-tab-queue');
    const panelSong=$('ml-player-side-song');
    const panelQueue=$('ml-player-side-queue');
    if(tabSong) tabSong.classList.toggle('active',_mpSideMode==='song');
    if(tabQueue) tabQueue.classList.toggle('active',_mpSideMode==='queue');
    if(panelSong) panelSong.hidden=_mpSideMode!=='song';
    if(panelQueue) panelQueue.hidden=_mpSideMode!=='queue';
  }
  function _mpHashColor(seed){
    const palette=['#D77A38','#C76524','#B86B47','#BA8B42','#6F9A75','#669A9C','#8C7AB8','#B96D78'];
    const text=String(seed||'CECP');
    let h=0;
    for(let i=0;i<text.length;i++) h=((h<<5)-h+text.charCodeAt(i))|0;
    return palette[Math.abs(h)%palette.length];
  }
  function _mpNormalizeHexColor(raw){
    const v=String(raw||'').trim();
    if(!v) return '';
    const hex=v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if(hex){
      let h=hex[1];
      if(h.length===3) h=h.split('').map(ch=>ch+ch).join('');
      return '#'+h.toUpperCase();
    }
    const rgb=v.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
    if(rgb){
      return '#'+[rgb[1],rgb[2],rgb[3]].map(n=>Math.max(0,Math.min(255,Number(n)||0)).toString(16).padStart(2,'0')).join('').toUpperCase();
    }
    return '';
  }
  function _mpHexToRgb(hex){
    const h=_mpNormalizeHexColor(hex).slice(1);
    if(h.length!==6) return null;
    return {
      r:parseInt(h.slice(0,2),16),
      g:parseInt(h.slice(2,4),16),
      b:parseInt(h.slice(4,6),16)
    };
  }
  function _mpSongAccent(song){
    const fields=['scoreColor','scoreBg','scoreBackground','backgroundColor','themeColor','dominantColor','coverColor','color'];
    for(const key of fields){
      const normalized=_mpNormalizeHexColor(song&&song[key]);
      if(normalized) return normalized;
    }
    return _mpHashColor((song&&song.cover)||(song&&song.scoreIMG)||(song&&song.title)||(song&&song.id));
  }
  function _mpApplyPlayerAccent(song){
    const color=_mpSongAccent(song);
    const rgb=_mpHexToRgb(color)||{r:215,g:122,b:56};
    const soft=`rgba(${rgb.r},${rgb.g},${rgb.b},0.20)`;
    const tint=`rgba(${rgb.r},${rgb.g},${rgb.b},0.14)`;
    ['music-library','ml-miniplayer','ml-player-view','ml-nowbar','ml-playlist-panel'].forEach(id=>{
      const el=$(id);
      if(!el) return;
      el.style.setProperty('--player-accent',color);
      el.style.setProperty('--player-accent-soft',soft);
      el.style.setProperty('--player-surface-tint',tint);
    });
  }
  function _mpSetLyricsMode(open){
    _mpLyricsOpen=!!open;
    const pv=$('ml-player-view');
    if(pv){
      pv.classList.toggle('lyrics-open',_mpLyricsOpen);
      pv.setAttribute('data-player-view',_mpLyricsOpen?'lyrics':'cover');
    }
    const btn=$('ml-player-view-menu');
    if(btn){
      btn.classList.toggle('is-active',_mpLyricsOpen);
      btn.setAttribute('aria-pressed',String(_mpLyricsOpen));
      btn.setAttribute('aria-label',_mpLyricsOpen?'关闭歌词':'打开歌词');
      btn.title=_mpLyricsOpen?'关闭歌词':'打开歌词';
    }
    const railBtns=document.querySelectorAll('#ml-player-rail .ml-player-rail-btn');
    if(railBtns[0]) railBtns[0].classList.toggle('active',_mpLyricsOpen);
    if(_mpLyricsOpen){
      if(!_mpLrc.length && _mpCurrentSong) _mpUseFallbackLyrics(_mpCurrentSong);
      else _mpRenderLrc();
      if(_mpAudio) _mpSyncLrc(_mpAudio.currentTime||0);
      requestAnimationFrame(()=>{
        const panel=$('ml-player-lyrics');
        const active=panel&&panel.querySelector('.ml-player-lrc-line.active');
        if(active) active.scrollIntoView({block:'center',behavior:'auto'});
        else if(panel) panel.scrollTop=0;
      });
    }
  }
  function _mpAddToQueue(song,silent=false){
    if(!song||!hasSongAudio(song)) return -1;
    _mpBind();
    let idx=_mpSongs.findIndex(x=>x.id===song.id);
    if(idx<0){
      _mpSongs.push(song);
      idx=_mpSongs.length-1;
      if(!silent) showToast('已加入播放列表');
    }else if(!silent){
      showToast('已在播放列表');
    }
    _mpRenderQueue();
    return idx;
  }
  // "播放"：立即播放该歌曲，绝不修改播放列表 / 播放队列。
  // 如果该歌曲已在队列中，直接定位播放；否则仅作为"当前播放"，不插入队列。
  function playSongNow(song){
    if(!song||!hasSongAudio(song)) return;
    _mpBind();
    const idx=_mpSongs.findIndex(x=>x.id===song.id);
    if(idx>=0){
      _mpPlayIdx(idx,true);
    }else{
      _mpIdx=-1;
      _mpLoadAndPlaySong(song,true);
    }
  }
  // "添加到播放列表"：只入队，不播放、不打断当前播放。
  function addSongToPlaylist(song){
    return _mpAddToQueue(song,false);
  }
  function _mpRemoveQueueIndex(idx){
    if(idx<0||idx>=_mpSongs.length) return;
    const removingCurrent=idx===_mpIdx;
    _mpSongs.splice(idx,1);
    if(!_mpSongs.length){
      _mpIdx=-1;
      if(_mpAudio){_mpPlayRequestId++;_mpAudio.pause();_mpAudio.removeAttribute('src');_mpAudio.load();}
      _mpLrc=[];_mpLrcIdx=-1;_mpRenderLrc();
      _mpSetPlayUI(false);
    }else{
      if(idx<_mpIdx) _mpIdx-=1;
      if(removingCurrent) _mpPlayIdx(Math.min(idx,_mpSongs.length-1),false);
    }
    _mpRenderQueue();
  }
  function _mpMoveQueueIndex(idx,dir){
    const next=idx+dir;
    if(idx<0||next<0||idx>=_mpSongs.length||next>=_mpSongs.length) return;
    const item=_mpSongs[idx];
    _mpSongs[idx]=_mpSongs[next];
    _mpSongs[next]=item;
    if(_mpIdx===idx) _mpIdx=next;
    else if(_mpIdx===next) _mpIdx=idx;
    _mpRenderQueue();
  }
  function _mpClearQueue(){
    _mpSongs=[];
    _mpIdx=-1;
    if(_mpAudio){_mpPlayRequestId++;_mpAudio.pause();_mpAudio.removeAttribute('src');_mpAudio.load();}
    _mpLrc=[];_mpLrcIdx=-1;_mpRenderLrc();
    _mpSetPlayUI(false);
    _mpRenderQueue();
    showToast('播放列表已清空');
  }
  function _mpSetPlaylistOpen(open){
    const drawer=$('ml-playlist-drawer');
    if(!drawer) return;
    drawer.hidden=!open;
    drawer.classList.toggle('open',!!open);
    root.classList.toggle('ml-playlist-open',!!open);
    _mpRenderPlaylist();
  }
  function _mpRenderPlaylist(){
    const list=$('ml-playlist-list');
    const empty=$('ml-playlist-empty');
    const now=$('ml-playlist-now');
    const clear=$('ml-playlist-clear');
    if(!list) return;
    list.innerHTML='';
    if(clear) clear.disabled=!_mpSongs.length;
    if(now){
      const cur=_mpSongs[_mpIdx];
      now.innerHTML=cur?`<span>正在播放</span><strong>${esc(cur.title||'未命名歌曲')}</strong><small>${esc(cur.artist||cur.source||'诗歌')}</small>`:'';
      now.hidden=!cur;
    }
    if(!_mpSongs.length){
      if(empty) empty.hidden=false;
      return;
    }
    if(empty) empty.hidden=true;
    _mpSongs.forEach((song,i)=>{
      const row=document.createElement('div');
      row.className='ml-playlist-item'+(i===_mpIdx?' is-active':'');
      row.innerHTML=`
        <button class="ml-playlist-main" type="button" data-action="play">
          <span class="ml-playlist-index">${i+1}</span>
          <span class="ml-playlist-meta">
            <strong>${esc(song.title||'未命名歌曲')}</strong>
            <small>${esc(song.artist||song.source||'诗歌')}</small>
          </span>
        </button>
        <div class="ml-playlist-row-actions">
          <button type="button" data-action="up" ${i===0?'disabled':''}>上移</button>
          <button type="button" data-action="down" ${i===_mpSongs.length-1?'disabled':''}>下移</button>
          <button type="button" data-action="remove">移除</button>
        </div>
      `;
      row.querySelector('[data-action="play"]')?.addEventListener('click',()=>_mpPlayIdx(i,true));
      row.querySelector('[data-action="up"]')?.addEventListener('click',()=>_mpMoveQueueIndex(i,-1));
      row.querySelector('[data-action="down"]')?.addEventListener('click',()=>_mpMoveQueueIndex(i,1));
      row.querySelector('[data-action="remove"]')?.addEventListener('click',()=>_mpRemoveQueueIndex(i));
      list.appendChild(row);
    });
  }
  function _mpRenderQueue(){
    const box=$('ml-player-queue-list');
    const empty=$('ml-player-queue-empty');
    if(box) box.innerHTML='';
    if(!_mpSongs.length){
      if(empty) empty.hidden=false;
      _mpRenderPlaylist();
      return;
    }
    if(empty) empty.hidden=true;
    _mpSongs.forEach((song,i)=>{
      if(!box) return;
      const row=document.createElement('div');
      row.className='ml-player-queue-item'+(i===_mpIdx?' is-active':'');
      row.innerHTML=`
        <button class="ml-player-queue-main" type="button">
          <span class="ml-player-queue-index">${i+1}</span>
          <span>
            <span class="ml-player-queue-title">${esc(song.title||'未命名歌曲')}</span>
            <span class="ml-player-queue-artist">${esc(song.artist||song.source||'诗歌')}</span>
          </span>
        </button>
        <button class="ml-player-queue-remove" type="button" aria-label="从播放列表移除">移除</button>
      `;
      row.querySelector('.ml-player-queue-main')?.addEventListener('click',()=>_mpPlayIdx(i,true));
      row.querySelector('.ml-player-queue-remove')?.addEventListener('click',()=>_mpRemoveQueueIndex(i));
      box.appendChild(row);
    });
    _mpRenderPlaylist();
  }
  function _mpSyncModeUI(){
    const r1=$('ml-mp-repeat');
    const r2=$('ml-player-repeat-toggle');
    const s2=$('ml-player-shuffle');
    if(r1) r1.classList.toggle('on',!!_mpLoop);
    if(r2) r2.classList.toggle('on',!!_mpLoop);
    if(s2) s2.classList.toggle('on',!!_mpShuffle);
  }
  function _mpNextIdxFrom(cur){
    if(!_mpSongs.length) return 0;
    if(_mpShuffle){
      if(_mpSongs.length===1) return 0;
      let n=cur;
      while(n===cur) n=Math.floor(Math.random()*_mpSongs.length);
      return n;
    }
    let n=cur+1;
    if(n>=_mpSongs.length) n=0;
    return n;
  }
  function _mpSetPlayUI(isPlaying){
    const btn=$('ml-mp-playpause');
    const xbtn=$('ml-player-playpause');
    const stage=$('ml-mp-stage');
    if(btn){
      btn.innerHTML=isPlaying
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5h3v14H8zm5 0h3v14h-3z"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
    }
    if(xbtn){
      xbtn.innerHTML=isPlaying
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5h3v14H8zm5 0h3v14h-3z"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
    }
    if(stage) stage.classList.toggle('playing', !!isPlaying);
    const nowbar=$('ml-nowbar');
    const nbtn=$('ml-nowbar-playpause');
    if(nowbar){
      nowbar.classList.toggle('is-playing',!!isPlaying);
      if(_mpAudio&&_mpAudio.src) nowbar.classList.add('is-visible');
    }
    if(nbtn){
      nbtn.innerHTML=isPlaying
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5h3v14H8zm5 0h3v14h-3z"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
    }
  }
  function _mpParseLrc(text){
    const arr=[];
    String(text||'').split(/\r?\n/).forEach(line=>{
      const m=line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
      if(m){
        arr.push({ t:(+m[1])*60 + parseFloat(m[2]), tx:(m[3]||'').trim() });
      }
    });
    return arr.sort((a,b)=>a.t-b.t);
  }
  function _mpExtractPlainLyrics(song){
    const lines=[];
    const push=value=>{
      const tx=spStripTokens(value).replace(/<[^>]*>/g,'').replace(/\u00a0/g,' ').trim();
      if(tx && !lines.includes(tx)) lines.push(tx);
    };
    for(const sec of (song&&song.sections)||[]){
      if(sec&&sec.title) push(sec.title);
      for(const row of (sec&&sec.lines)||[]){
        const segs=Array.isArray(row)?row:((row&&row.line)||[]);
        const primary=[];
        const secondary=[];
        for(const seg of segs){
          if(!seg) continue;
          const a=String(seg.lyric||'').trim();
          const b=String(seg.lyric2||'').trim();
          const c=String(seg.lyric3||'').trim();
          const d=String(seg.lyric4||'').trim();
          if(a) primary.push(a);
          if(b) secondary.push(b);
          if(c) secondary.push(c);
          if(d) secondary.push(d);
        }
        push(primary.join(''));
        for(const tx of secondary) push(tx);
      }
    }
    if(!lines.length && song){
      push(song.lyrics);
      push(song.lyric);
      push(song.sub);
    }
    return lines.map(tx=>({t:null,tx}));
  }
  function _mpUseFallbackLyrics(song){
    _mpLrc=_mpExtractPlainLyrics(song);
    _mpLrcTimed=false;
    _mpLrcIdx=-1;
    _mpRenderLrc();
  }
  function _mpRenderLrc(){
    function paint(innerId,panelId,lineClass){
      const inner=$(innerId);
      const panel=$(panelId);
      if(!inner) return;
      inner.innerHTML='';
      if(!_mpLrc.length){
        inner.innerHTML=`<div class="${lineClass}">暂无歌词</div>`;
        const nbLyric=$('ml-nowbar-lyric');
        if(nbLyric) nbLyric.textContent='暂无歌词';
        return;
      }
      inner.classList.toggle('is-static',!_mpLrcTimed);
      _mpLrc.forEach((it,i)=>{
        const d=document.createElement('div');
        d.className=lineClass+(i===0?' active':'')+(!_mpLrcTimed?' is-static':'');
        d.textContent=it.tx || '…';
        d.addEventListener('click',()=>{
          if(_mpAudio && isFinite(_mpLrc[i].t)) _mpAudio.currentTime=_mpLrc[i].t;
        });
        inner.appendChild(d);
      });
      if(panel) panel.scrollTop=0;
    }
    paint('ml-mp-lrc-inner','ml-mp-lrc-panel','ml-mp-lrc-line');
    paint('ml-player-lyrics-inner','ml-player-lyrics','ml-player-lrc-line');
    _mpLrcIdx=0;
    const nbLyric=$('ml-nowbar-lyric');
    if(nbLyric) nbLyric.textContent=_mpLrc[0]?.tx || '歌词将在播放时显示';
  }
  function _mpSyncLrc(cur,force=false){
    if(!_mpLrc.length) return;
    let idx=0;
    if(_mpLrcTimed){
      for(let i=0;i<_mpLrc.length;i++){
        if(cur>=_mpLrc[i].t) idx=i; else break;
      }
    }else{
      // No timestamped LRC: keep the lyrics moving with playback using
      // an even, duration-based estimate rather than leaving the page static.
      const dur=Number(_mpAudio&&_mpAudio.duration);
      if(Number.isFinite(dur)&&dur>0){
        const progress=Math.max(0,Math.min(0.999999,(Number(cur)||0)/dur));
        idx=Math.min(_mpLrc.length-1,Math.floor(progress*_mpLrc.length));
      }else{
        idx=Math.max(0,Math.min(_mpLrc.length-1,_mpLrcIdx<0?0:_mpLrcIdx));
      }
    }
    const needsPaint=force||idx!==_mpLrcIdx||!document.querySelector('#ml-player-lyrics-inner .active');
    if(!needsPaint) return;
    _mpLrcIdx=idx;
    function sync(innerId,panelId){
      const inner=$(innerId), panel=$(panelId);
      if(!inner || !panel) return;
      [...inner.children].forEach((el,i)=>el.classList.toggle('active', i===idx));
      const active=inner.children[idx];
      if(active){
        const y=active.offsetTop - panel.clientHeight/2 + active.clientHeight/2;
        const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(!reduceMotion&&window.gsap){
          window.gsap.to(panel,{scrollTop:Math.max(0,y),duration:.55,ease:'power3.out',overwrite:'auto'});
        }else{
          panel.scrollTo({ top: Math.max(0,y), behavior:reduceMotion?'auto':'smooth' });
        }
      }
    }
    sync('ml-mp-lrc-inner','ml-mp-lrc-panel');
    sync('ml-player-lyrics-inner','ml-player-lyrics');
    const nbLyric=$('ml-nowbar-lyric');
    if(nbLyric) nbLyric.textContent=_mpLrc[idx]?.tx || '…';
  }
  function _mpFmtMs(t){
    if(t==null||!isFinite(t)) return '--:--.-';
    const m=Math.floor(t/60);
    const s=(t%60).toFixed(1).padStart(4,'0');
    return `${String(m).padStart(2,'0')}:${s}`;
  }
  function _mpParseLoopTime(value){
    const raw=String(value||'').trim();
    if(!raw) return NaN;
    if(/^\d+(?:\.\d+)?$/.test(raw)) return Math.max(0,parseFloat(raw));
    const parts=raw.split(':').map(part=>part.trim());
    if(parts.length===2 && parts.every(Boolean)){
      const m=parseInt(parts[0],10);
      const s=parseFloat(parts[1]);
      if(Number.isFinite(m)&&Number.isFinite(s)&&s>=0) return Math.max(0,m*60+s);
    }
    if(parts.length===3 && parts.every(Boolean)){
      const h=parseInt(parts[0],10);
      const m=parseInt(parts[1],10);
      const s=parseFloat(parts[2]);
      if(Number.isFinite(h)&&Number.isFinite(m)&&Number.isFinite(s)&&m>=0&&s>=0) return Math.max(0,h*3600+m*60+s);
    }
    return NaN;
  }
  function _mpSetLoopInput(which,value){
    const input=$(which==='a'?'ml-audio-loop-a-time':'ml-audio-loop-b-time');
    if(input) input.value=_mpFmtMs(value);
  }
  function _mpSyncPanelTime(){
    const time=$('ml-audio-panel-time');
    if(!time) return;
    const cur=_mpAudio?(_mpAudio.currentTime||0):0;
    const dur=_mpAudio?(_mpAudio.duration||0):0;
    time.textContent=`${_mpFmt(cur)} / ${_mpFmt(dur)}`;
  }
  function _mpLoopIsValid(){
    return Number.isFinite(_mpLoopA)&&Number.isFinite(_mpLoopB)&&_mpLoopB>_mpLoopA;
  }
  function _mpSetLoopMessage(text,isError=false){
    const msg=$('ml-audio-loop-message');
    if(!msg) return;
    msg.textContent=text||'';
    msg.classList.toggle('is-error',!!isError);
  }
  function _mpSyncPanelPlaybackUi(){
    const play=$('ml-audio-panel-play');
    const main=$('ml-audio-panel-main');
    const status=$('ml-audio-panel-status');
    const has=!!(_mpAudio&&_mpAudio.src);
    const playing=has&&!_mpAudio.paused;
    if(play){
      const label=play.querySelector('span');
      const stateIcon=$('ml-audio-panel-play-icon');
      if(label) label.textContent=playing?'Pause playback':'Start playback';
      if(stateIcon) stateIcon.innerHTML=playing?icon('pause',21):icon('circlePlay',21);
      play.classList.toggle('is-playing',playing);
    }
    if(main){
      main.innerHTML=playing?icon('pause',21):icon('play',21);
      main.classList.toggle('is-playing',playing);
    }
    if(status){
      const mode=_mpPitchMode==='pro'?'SoundTouch active':(_mpPitchMode==='loading'?'Starting processor...':(_mpPitchMode==='limited'?'Processor unavailable':'Start media...'));
      status.textContent=has ? mode : 'Start media...';
    }
    const loopBtn=$('ml-audio-loop-toggle');
    if(loopBtn){
      const enabled=!!_mpAbLoop;
      loopBtn.classList.toggle('active',enabled);
      loopBtn.setAttribute('aria-pressed',String(enabled));
      loopBtn.setAttribute('aria-label',enabled?'关闭 A/B 循环':'开启 A/B 循环');
      loopBtn.title=enabled?'Loop ON · 点击关闭':'Loop OFF · 点击开启';
      const switchText=loopBtn.querySelector('.ml-audio-loop-switch-text');
      if(switchText) switchText.textContent=enabled?'ON':'OFF';
    }
    _mpSetLoopInput('a',_mpLoopA);
    _mpSetLoopInput('b',_mpLoopB);
    _mpSyncPanelTime();
    const loopRow=document.querySelector('#ml-audio-panel .ml-audio-panel-row[data-control="loop"]');
    if(loopRow) loopRow.classList.toggle('is-active',!!_mpAbLoop);
  }
  function _mpSetPanelOpen(open){
    _mpPanelOpen=!!open;
    const panel=$('ml-audio-panel');
    const backdrop=$('ml-audio-panel-backdrop');
    if(!panel||!backdrop) return;
    panel.hidden=!_mpPanelOpen;
    backdrop.hidden=!_mpPanelOpen;
    panel.classList.toggle('open',_mpPanelOpen);
    backdrop.classList.toggle('open',_mpPanelOpen);
    if(_mpPanelOpen) _mpSetPitchUi(_mpPitchSemi,_mpPitchMode);
  }
  function _mpSetLoopPoint(which){
    if(!_mpAudio||!_mpAudio.src){
      _mpSetLoopMessage('请先打开一首可播放的 MP3。',true);
      showToast('请先打开一首可播放的 MP3');
      return;
    }
    const cur=Math.max(0,_mpAudio.currentTime||0);
    if(which==='a'){
      _mpLoopA=cur;
      _mpSetLoopMessage('已设置 A 点');
    }else{
      _mpLoopB=cur;
      _mpSetLoopMessage('已设置 B 点');
    }
    if(Number.isFinite(_mpLoopA)&&Number.isFinite(_mpLoopB)&&_mpLoopB<=_mpLoopA){
      _mpAbLoop=false;
      _mpSetLoopMessage('B 点必须晚于 A 点，请重新设置。',true);
      showToast('B 点必须晚于 A 点');
    }
    _mpSyncPanelPlaybackUi();
  }
  function _mpCommitLoopInput(which){
    const input=$(which==='a'?'ml-audio-loop-a-time':'ml-audio-loop-b-time');
    if(!input) return;
    const next=_mpParseLoopTime(input.value);
    if(!Number.isFinite(next)){
      _mpSetLoopMessage('时间格式无效，请输入 00:30.0 或秒数。',true);
      showToast('Loop 时间格式无效');
      _mpSyncPanelPlaybackUi();
      return;
    }
    if(which==='a') _mpLoopA=next;
    else _mpLoopB=next;
    if(Number.isFinite(_mpLoopA)&&Number.isFinite(_mpLoopB)&&_mpLoopB<=_mpLoopA){
      _mpAbLoop=false;
      _mpSetLoopMessage('B 点必须晚于 A 点，请重新设置。',true);
      showToast('B 点必须晚于 A 点');
    }else{
      _mpSetLoopMessage(`${which==='a'?'A':'B'} 点已更新`);
    }
    _mpSyncPanelPlaybackUi();
  }
  function _mpJumpLoopPoint(which){
    if(!_mpAudio||!_mpAudio.src) return;
    const t=which==='a'?_mpLoopA:_mpLoopB;
    if(!Number.isFinite(t)){
      _mpSetLoopMessage(`请先设置 ${which==='a'?'A':'B'} 点。`,true);
      return;
    }
    _mpAudio.currentTime=Math.max(0,Math.min(_mpAudio.duration||1e9,t));
  }
  function _mpToggleAbLoop(){
    if(_mpAbLoop){
      _mpAbLoop=false;
      _mpSetLoopMessage('循环已关闭');
      _mpSyncPanelPlaybackUi();
      return;
    }
    if(!_mpLoopIsValid()){
      _mpAbLoop=false;
      _mpSetLoopMessage('请先设置有效的 A/B 区间，且 B 必须晚于 A。',true);
      showToast('请先设置有效的 A/B 循环');
      _mpSyncPanelPlaybackUi();
      return;
    }
    _mpAbLoop=true;
    _mpSetLoopMessage('循环已开启');
    _mpSyncPanelPlaybackUi();
  }
  function _mpClearAbLoop(){
    _mpAbLoop=false;
    _mpLoopA=0;
    _mpLoopB=30;
    _mpSetLoopMessage('循环已清除');
    _mpSyncPanelPlaybackUi();
  }
  function _mpUseCurrentForLoop(){
    if(!_mpAudio||!_mpAudio.src){
      _mpSetLoopMessage('请先打开一首可播放的 MP3。',true);
      showToast('请先打开一首可播放的 MP3');
      return;
    }
    const cur=Math.max(0,_mpAudio.currentTime||0);
    if(!Number.isFinite(_mpLoopA)){
      _mpLoopA=cur;
      _mpSetLoopMessage('已用当前位置设置 A 点');
    }else{
      _mpLoopB=cur;
      _mpSetLoopMessage('已用当前位置设置 B 点');
    }
    if(Number.isFinite(_mpLoopA)&&Number.isFinite(_mpLoopB)&&_mpLoopB<=_mpLoopA){
      _mpAbLoop=false;
      _mpSetLoopMessage('B 点必须晚于 A 点，请重新设置。',true);
      showToast('B 点必须晚于 A 点');
    }
    _mpSyncPanelPlaybackUi();
  }
  function _mpSwapLoopPoints(){
    const oldA=_mpLoopA;
    _mpLoopA=_mpLoopB;
    _mpLoopB=oldA;
    if(Number.isFinite(_mpLoopA)&&Number.isFinite(_mpLoopB)&&_mpLoopB<=_mpLoopA){
      _mpAbLoop=false;
      _mpSetLoopMessage('交换后 B 点不晚于 A 点，循环已关闭。',true);
    }else{
      _mpSetLoopMessage('A/B 点已交换');
    }
    _mpSyncPanelPlaybackUi();
  }
  function _mpResetAudioPractice(){
    _mpPitchSemi=0;
    _mpFinePitch=0;
    _mpSpeed=1;
    _mpPitchMode='off';
    _mpClearAbLoop();
    const song=_mpSongs[_mpIdx];
    _mpSaveSongPitch(song&&song.id,0);
    _mpApplyPitch();
    showToast('练习设置已全部重置');
  }
  function _mpHandlePlayError(err,context){
    if(err&&err.name==='AbortError') return;
    try{ console.warn('[musiclib] audio play failed',context||'',err); }catch(_){}
    const name=err&&err.name;
    if(name==='NotAllowedError'){
      showToast('播放被浏览器拦截，请再点一次播放');
    }else if(name==='NotSupportedError'){
      showToast('音频格式暂时无法播放');
    }else{
      showToast('音频还没准备好，请再点一次');
    }
    _mpSetPlayUI(false);
    _mpSyncPanelPlaybackUi();
  }
  function _mpRequestPlay(context){
    if(!_mpAudio||!_mpAudio.src) return Promise.resolve(false);
    const req=++_mpPlayRequestId;
    if(_mpAudio.readyState===0){
      try{ _mpAudio.load(); }catch(_){}
    }
    if(_mpAudioCtx&&_mpAudioCtx.state==='suspended'){
      try{ _mpAudioCtx.resume().catch(()=>{}); }catch(_){}
    }
    try{
      const p=_mpAudio.play();
      if(p&&typeof p.then==='function'){
        return p.then(()=>true).catch(err=>{
          if(req===_mpPlayRequestId) _mpHandlePlayError(err,context);
          return false;
        });
      }
      return Promise.resolve(true);
    }catch(err){
      _mpHandlePlayError(err,context);
      return Promise.resolve(false);
    }
  }
  function _mpTogglePlayback(context){
    if(!_mpAudio||!_mpAudio.src) return;
    if(_mpAudio.paused) void _mpRequestPlay(context||'toggle');
    else{
      _mpPlayRequestId++;
      _mpAudio.pause();
    }
  }
  function _mpHandleAbLoop(){
    if(!_mpAbLoop||!_mpLoopIsValid()||!_mpAudio||!_mpAudio.src) return;
    if((_mpAudio.currentTime||0)>=_mpLoopB){
      _mpAudio.currentTime=Math.max(0,_mpLoopA||0);
      if(_mpAudio.paused) void _mpRequestPlay('ab-loop');
    }
  }
  function _mpBind(){
    if(_mpAudio) return;
    _mpAudio=$('ml-mp-audio');
    if(!_mpAudio) return;
    _mpAudio.preload='auto';
    const mv=$('ml-mp-vol'); if(mv) mv.value=String(_mpAudio.volume||1);
    const dv=$('ml-player-dock-vol'); if(dv) dv.value=String(_mpAudio.volume||1);

    _mpAudio.addEventListener('loadedmetadata',()=>{
      $('ml-mp-dur').textContent=_mpFmt(_mpAudio.duration);
      const xd=$('ml-player-dur'); if(xd) xd.textContent=_mpFmt(_mpAudio.duration);
      _mpSyncPanelTime();
    });
    _mpAudio.addEventListener('timeupdate',()=>{
      $('ml-mp-cur').textContent=_mpFmt(_mpAudio.currentTime);
      const xc=$('ml-player-cur'); if(xc) xc.textContent=_mpFmt(_mpAudio.currentTime);
      const dur=_mpAudio.duration||0;
      $('ml-mp-fill').style.width=dur?((_mpAudio.currentTime/dur)*100)+'%':'0%';
      const xf=$('ml-player-fill'); if(xf) xf.style.width=dur?((_mpAudio.currentTime/dur)*100)+'%':'0%';
      const nf=$('ml-nowbar-fill'); if(nf) nf.style.width=dur?((_mpAudio.currentTime/dur)*100)+'%':'0%';
      _mpSyncLrc(_mpAudio.currentTime);
      _mpHandleAbLoop();
      _mpSyncPanelTime();
    });
    _mpAudio.addEventListener('play',()=>{
      if(_mpAudioCtx&&_mpAudioCtx.state==='suspended') _mpAudioCtx.resume().catch(()=>{});
      _mpSetPlayUI(true);
      _mpSyncPanelPlaybackUi();
    });
    _mpAudio.addEventListener('pause',()=>{_mpSetPlayUI(false);_mpSyncPanelPlaybackUi();});
    _mpAudio.addEventListener('ended',()=>{
      if(_mpLoop){
        _mpAudio.currentTime=0;
        void _mpRequestPlay('repeat');
      }else{
        _mpPlayIdx(_mpNextIdxFrom(_mpIdx),true);
      }
    });

    $('ml-mp-playpause')?.addEventListener('click',()=>_mpTogglePlayback('mini'));
    $('ml-player-playpause')?.addEventListener('click',()=>_mpTogglePlayback('player'));
    $('ml-nowbar-playpause')?.addEventListener('click',()=>_mpTogglePlayback('nowbar'));
    $('ml-mp-prev')?.addEventListener('click',()=>_mpPlayIdx(_mpIdx-1,true));
    $('ml-mp-next')?.addEventListener('click',()=>_mpPlayIdx(_mpNextIdxFrom(_mpIdx),true));
    $('ml-player-prev')?.addEventListener('click',()=>_mpPlayIdx(_mpIdx-1,true));
    $('ml-player-next')?.addEventListener('click',()=>_mpPlayIdx(_mpNextIdxFrom(_mpIdx),true));
    $('ml-nowbar-prev')?.addEventListener('click',()=>_mpPlayIdx(_mpIdx-1,true));
    $('ml-nowbar-next')?.addEventListener('click',()=>_mpPlayIdx(_mpNextIdxFrom(_mpIdx),true));
    $('ml-mp-seek-back')?.addEventListener('click',()=>{
      if(!_mpAudio.src) return;
      _mpAudio.currentTime=Math.max(0, (_mpAudio.currentTime||0)-15);
    });
    $('ml-mp-seek-fwd')?.addEventListener('click',()=>{
      if(!_mpAudio.src) return;
      _mpAudio.currentTime=Math.min(_mpAudio.duration||1e9, (_mpAudio.currentTime||0)+15);
    });
    $('ml-mp-repeat')?.addEventListener('click',e=>{
      _mpLoop=!_mpLoop;
      _mpSyncModeUI();
    });
    $('ml-player-repeat-toggle')?.addEventListener('click',()=>{
      _mpLoop=!_mpLoop;
      _mpSyncModeUI();
    });
    $('ml-player-shuffle')?.addEventListener('click',()=>{
      _mpShuffle=!_mpShuffle;
      _mpSyncModeUI();
    });
    $('ml-mp-pitch-open')?.addEventListener('click',e=>{e.stopPropagation();_mpSetPanelOpen(true);});
    $('ml-player-pitch-open')?.addEventListener('click',e=>{e.stopPropagation();_mpSetPanelOpen(true);});
    $('ml-audio-panel-backdrop')?.addEventListener('click',()=>_mpSetPanelOpen(false));
    $('ml-audio-panel-close')?.addEventListener('click',()=>_mpSetPanelOpen(false));
    $('ml-audio-panel-play')?.addEventListener('click',()=>_mpTogglePlayback('audio-panel'));
    $('ml-audio-panel-main')?.addEventListener('click',()=>_mpTogglePlayback('audio-panel-main'));
    $('ml-audio-panel-prev')?.addEventListener('click',()=>_mpPlayIdx(_mpIdx-1,true));
    $('ml-audio-panel-back')?.addEventListener('click',()=>{ if(_mpAudio?.src) _mpAudio.currentTime=Math.max(0,(_mpAudio.currentTime||0)-5); });
    $('ml-audio-panel-forward')?.addEventListener('click',()=>{ if(_mpAudio?.src) _mpAudio.currentTime=Math.min(_mpAudio.duration||1e9,(_mpAudio.currentTime||0)+5); });
    $('ml-audio-panel-help')?.addEventListener('click',()=>showToast('调性、速度和 A/B 循环都会保留当前播放位置'));
    $('ml-audio-transpose-down')?.addEventListener('click',()=>_mpNudgePitch(-1));
    $('ml-audio-transpose-up')?.addEventListener('click',()=>_mpNudgePitch(1));
    $('ml-audio-transpose-reset')?.addEventListener('click',()=>_mpSetPitch(0,true));
    $('ml-audio-transpose-range')?.addEventListener('input',e=>_mpSetPitch(e.target.value,true));
    $('ml-audio-pitch-down')?.addEventListener('click',()=>_mpSetFinePitch(_mpFinePitch-1,true));
    $('ml-audio-pitch-up')?.addEventListener('click',()=>_mpSetFinePitch(_mpFinePitch+1,true));
    $('ml-audio-pitch-reset')?.addEventListener('click',()=>_mpSetFinePitch(0,true));
    $('ml-audio-pitch-range')?.addEventListener('input',e=>_mpSetFinePitch(e.target.value,true));
    $('ml-audio-speed-down')?.addEventListener('click',()=>_mpSetSpeed(_mpSpeed-0.05,true));
    $('ml-audio-speed-up')?.addEventListener('click',()=>_mpSetSpeed(_mpSpeed+0.05,true));
    $('ml-audio-speed-reset')?.addEventListener('click',()=>_mpSetSpeed(1,true));
    $('ml-audio-speed-range')?.addEventListener('input',e=>_mpSetSpeed((parseInt(e.target.value,10)||100)/100,true));
    document.querySelectorAll('.ml-audio-speed-presets button').forEach(btn=>{
      btn.addEventListener('click',()=>_mpSetSpeed(btn.dataset.speed,true));
    });
    $('ml-audio-loop-toggle')?.addEventListener('click',_mpToggleAbLoop);
    $('ml-audio-loop-reset')?.addEventListener('click',_mpClearAbLoop);
    $('ml-audio-loop-a')?.addEventListener('click',()=>_mpSetLoopPoint('a'));
    $('ml-audio-loop-b')?.addEventListener('click',()=>_mpSetLoopPoint('b'));
    $('ml-audio-loop-a-time')?.addEventListener('change',()=>_mpCommitLoopInput('a'));
    $('ml-audio-loop-b-time')?.addEventListener('change',()=>_mpCommitLoopInput('b'));
    $('ml-audio-loop-a-time')?.addEventListener('keydown',e=>{ if(e.key==='Enter') _mpCommitLoopInput('a'); });
    $('ml-audio-loop-b-time')?.addEventListener('keydown',e=>{ if(e.key==='Enter') _mpCommitLoopInput('b'); });
    $('ml-audio-loop-a-jump')?.addEventListener('click',()=>_mpJumpLoopPoint('a'));
    $('ml-audio-loop-b-jump')?.addEventListener('click',()=>_mpJumpLoopPoint('b'));
    $('ml-audio-loop-use-current')?.addEventListener('click',_mpUseCurrentForLoop);
    $('ml-audio-loop-swap')?.addEventListener('click',_mpSwapLoopPoints);
    $('ml-audio-reset-all')?.addEventListener('click',_mpResetAudioPractice);
    $('ml-mp-vol')?.addEventListener('input',e=>{
      const v=parseFloat(e.target.value||'1');
      _mpAudio.volume=v;
      const dv=$('ml-player-dock-vol'); if(dv) dv.value=String(v);
    });
    $('ml-player-dock-vol')?.addEventListener('input',e=>{
      const v=parseFloat(e.target.value||'1');
      _mpAudio.volume=v;
      const mv=$('ml-mp-vol'); if(mv) mv.value=String(v);
    });
    document.querySelector('.pl-progress-bar')?.addEventListener('click',e=>{
      if(!_mpAudio.src || !_mpAudio.duration) return;
      const r=e.currentTarget.getBoundingClientRect();
      const p=Math.max(0, Math.min(1, (e.clientX-r.left)/r.width));
      _mpAudio.currentTime=_mpAudio.duration*p;
    });
    $('ml-player-progress')?.addEventListener('click',e=>{
      if(!_mpAudio.src || !_mpAudio.duration) return;
      const r=e.currentTarget.getBoundingClientRect();
      const p=Math.max(0, Math.min(1, (e.clientX-r.left)/r.width));
      _mpAudio.currentTime=_mpAudio.duration*p;
    });
    $('ml-nowbar-progress')?.addEventListener('click',e=>{
      if(!_mpAudio.src || !_mpAudio.duration) return;
      const r=e.currentTarget.getBoundingClientRect();
      const p=Math.max(0, Math.min(1, (e.clientX-r.left)/r.width));
      _mpAudio.currentTime=_mpAudio.duration*p;
    });
    $('ml-nowbar-expand')?.addEventListener('click',()=>{
      _mpSetExpanded(true);
      _mpSetLyricsMode(true);
    });
    $('ml-miniplayer')?.addEventListener('click',e=>{
      if(e.target.closest('.pl-btn, .pl-progress-wrap, .pl-vol-wrap, #ml-mp-expand, .pl-vol, .ml-audio-tool')) return;
      _mpSetExpanded(true);
    });
    $('ml-mp-expand')?.addEventListener('click',(e)=>{
      e.preventDefault();
      e.stopPropagation();
      _mpSideCollapsed=true;
      _mpSetLyricsMode(true);
      _mpSetExpanded(true);
      requestAnimationFrame(()=>{
        const pv=$('ml-player-view');
        if(pv){
          pv.classList.add('open','lyrics-open','side-collapsed');
          pv.setAttribute('data-player-view','lyrics');
        }
        _mpSyncLrc(_mpAudio?.currentTime||0,true);
      });
    });
    $('ml-player-view-close')?.addEventListener('click',()=>_mpSetExpanded(false));
    $('ml-player-view')?.addEventListener('click',e=>{ if(e.target.id==='ml-player-view') _mpSetExpanded(false); });
    $('ml-player-tab-song')?.addEventListener('click',()=>{_mpSideCollapsed=false;_mpSetLyricsMode(false);_mpSetSideMode('song');_mpSetExpanded(true);});
    $('ml-player-tab-queue')?.addEventListener('click',()=>{_mpSideCollapsed=false;_mpSetLyricsMode(false);_mpSetSideMode('queue');_mpSetExpanded(true);});
    $('ml-player-view-menu')?.addEventListener('click',()=>{
      _mpSetExpanded(true);
      const next=!_mpLyricsOpen;
      if(!next){
        _mpSideCollapsed=false;
        _mpSetSideMode('song');
      }
      _mpSetLyricsMode(next);
    });
    const railBtns=document.querySelectorAll('#ml-player-rail .ml-player-rail-btn');
    if(railBtns[0]){
      railBtns[0].addEventListener('click',()=>{
        _mpSetExpanded(true);
        _mpSetLyricsMode(true);
      });
    }
    if(railBtns[1]){
      railBtns[1].addEventListener('click',()=>{
        _mpSideCollapsed=false;
        _mpSetLyricsMode(false);
        _mpSetSideMode('queue');
        _mpSetExpanded(true);
      });
    }
    document.addEventListener('keydown',e=>{
      const t=e.target;
      const typing=t&&((t.tagName==='INPUT')||(t.tagName==='TEXTAREA')||t.isContentEditable);
      if(e.key==='Escape'&&_mpPanelOpen){
        _mpSetPanelOpen(false);
        return;
      }
      if(e.key==='Escape'&&_mpExpanded){
        _mpSetExpanded(false);
        return;
      }
      if(typing || !_mpAudio) return;
      if(e.code==='Space'){
        e.preventDefault();
        _mpTogglePlayback('keyboard');
      }else if(e.key==='ArrowRight'){
        if(!_mpAudio.src) return;
        _mpAudio.currentTime=Math.min(_mpAudio.duration||1e9, (_mpAudio.currentTime||0)+5);
      }else if(e.key==='ArrowLeft'){
        if(!_mpAudio.src) return;
        _mpAudio.currentTime=Math.max(0, (_mpAudio.currentTime||0)-5);
      }else if((e.key==='ArrowUp' || e.key==='ArrowDown') && _mpExpanded){
        const delta=e.key==='ArrowUp'?0.05:-0.05;
        const v=Math.max(0,Math.min(1,(_mpAudio.volume||0)+delta));
        _mpAudio.volume=v;
        const mv=$('ml-mp-vol'); if(mv) mv.value=String(v);
        const dv=$('ml-player-dock-vol'); if(dv) dv.value=String(v);
      }else if((e.key==='q'||e.key==='Q') && _mpExpanded){
        _mpSideCollapsed=false;
        _mpSetLyricsMode(false);
        _mpSetSideMode('queue');
        _mpSetExpanded(true);
      }else if((e.key==='s'||e.key==='S') && _mpExpanded){
        _mpSideCollapsed=false;
        _mpSetLyricsMode(false);
        _mpSetSideMode('song');
        _mpSetExpanded(true);
      }
    });
    _mpSetSideMode(_mpSideMode);
    _mpSetLyricsMode(_mpLyricsOpen);
    const handleFullscreenChange=()=>{
      const fs=document.fullscreenElement||document.webkitFullscreenElement;
      if(!fs&&_mpExpanded) _mpRestoreReturnUrl();
    };
    document.addEventListener('fullscreenchange',handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange',handleFullscreenChange);
    _mpRenderQueue();
    _mpSyncModeUI();
    _mpSetPitchUi(_mpPitchSemi);
  }

  function _mpPlayIdx(idx,autoplay){
    _mpBind();
    if(!_mpSongs.length) return;
    if(idx<0) idx=_mpSongs.length-1;
    if(idx>=_mpSongs.length) idx=0;
    _mpIdx=idx;
    const s=_mpSongs[idx];
    if(!s) return;
    _mpLoadAndPlaySong(s,autoplay);
  }

  // 加载并播放指定歌曲到播放器。不修改 _mpSongs / _mpIdx（由调用方决定）。
  function _mpLoadAndPlaySong(s,autoplay){
    if(!s) return;
    _mpCurrentSong=s;
    setSongState(s.id,{playedAt:Date.now(),lastKey:getSongState(s.id).lastKey||s.origKey||'C'});
    renderHomePanels();
    const mini=$('ml-miniplayer');
    if(mini) mini.classList.add('has-mp3');
    const nowbar=$('ml-nowbar');
    if(nowbar) nowbar.classList.add('is-visible');
    $('ml-mp-title').textContent=s.title||'';
    $('ml-mp-artist').textContent=s.artist||'';
    const xt=$('ml-player-title'); if(xt) xt.textContent=s.title||'';
    const xa=$('ml-player-artist'); if(xa) xa.textContent=s.artist||'';
    const dt=$('ml-player-dock-title'); if(dt) dt.textContent=s.title||'';
    const da=$('ml-player-dock-artist'); if(da) da.textContent=s.artist||'';
    const nt=$('ml-nowbar-title'); if(nt) nt.textContent=s.title||'';
    const na=$('ml-nowbar-artist'); if(na) na.textContent=s.artist||s.source||'诗歌';
    const xk=$('ml-player-key'); if(xk) xk.textContent='调: '+(s.origKey||'—');
    const xb=$('ml-player-bpm'); if(xb) xb.textContent='速度: '+(s.bpm||'—');
    const xnt=$('ml-player-now-title'); if(xnt) xnt.textContent=s.title||'正在播放';
    const xns=$('ml-player-now-sub'); if(xns) xns.textContent=s.artist||s.source||'诗歌';
    _mpSetCover(s.cover||'');
    _mpApplyPlayerAccent(s);
    _mpPlayRequestId++;
    if(!_mpPitchGraph){
      _mpPitchGraphFailed=false;
      _mpPitchGraphPromise=null;
    }
    const nextAudioSrc=_mpPrepareAudioSrc(resolveMediaUrl(s.mp3));
    _mpAudio.src=nextAudioSrc;
    _mpAudio.load();
    _mpApplySongPitchSettings(s,false);
    $('ml-mp-cur').textContent='0:00';
    $('ml-mp-dur').textContent='0:00';
    $('ml-mp-fill').style.width='0%';
    const xcur=$('ml-player-cur'); if(xcur) xcur.textContent='0:00';
    const xdur=$('ml-player-dur'); if(xdur) xdur.textContent='0:00';
    const xfill=$('ml-player-fill'); if(xfill) xfill.style.width='0%';
    const nfill=$('ml-nowbar-fill'); if(nfill) nfill.style.width='0%';
    _mpLrc=[]; _mpLrcIdx=-1; _mpLrcTimed=false;
    _mpUseFallbackLyrics(s);
    _mpRenderQueue();
    if(s.lrc){
      fetch(resolveMediaUrl(s.lrc)).then(r=>{
        if(!r.ok) throw new Error('LRC '+r.status);
        return r.text();
      }).then(text=>{
        const parsed=_mpParseLrc(text);
        if(parsed.length){
          _mpLrc=parsed;
          _mpLrcTimed=true;
          _mpLrcIdx=-1;
          _mpRenderLrc();
          if(_mpAudio) _mpSyncLrc(_mpAudio.currentTime||0);
        }else{
          _mpUseFallbackLyrics(s);
        }
      }).catch(()=>_mpUseFallbackLyrics(s));
    }
    if(autoplay){
      void _mpRequestPlay('load-song');
    }
  }

  function destroyAP(){}

  function stopMetronome(){
    _metroRunning=false;
    if(_metroTimer){clearInterval(_metroTimer);_metroTimer=null;}
    const btn=document.querySelector('.ml-met-toggle');
    if(btn){btn.textContent='开始';btn.classList.add('off');}
  }

  function startMetronome(bpm){
    stopMetronome();
    _metroBpm=Math.max(30,Math.min(240,parseInt(bpm||72,10)||72));
    const bpmNum=document.querySelector('.ml-met-bpm-num');
    let beat=0;
    function tick(){
      if(!_audioCtx){
        const AC=window.AudioContext||window.webkitAudioContext;
        if(AC) _audioCtx=new AC();
      }
      if(_audioCtx&&_metroVolPct()>0){
        const o=_audioCtx.createOscillator(),g=_audioCtx.createGain();
        o.type='sine'; o.frequency.value=beat%4===0?1200:900;
        g.gain.value=0.0001;
        o.connect(g); g.connect(_audioCtx.destination);
        const now=_audioCtx.currentTime;
        g.gain.exponentialRampToValueAtTime(Math.max(0.001,0.30*(_metroVolPct()/100)), now+0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, now+0.08);
        o.start(now); o.stop(now+0.09);
      }
      if(bpmNum){bpmNum.style.opacity='.45';requestAnimationFrame(()=>{bpmNum.style.opacity='';});}
      beat++;
    }
    tick();
    _metroRunning=true;
    _metroTimer=setInterval(tick,60000/_metroBpm);
    const btn=document.querySelector('.ml-met-toggle');
    if(btn){btn.textContent='停止';btn.classList.remove('off');}
  }

  const METRO_VOL_KEY='cecp-metro-vol';
  function _metroVolPct(){
    try{
      const v=parseInt(localStorage.getItem(METRO_VOL_KEY),10);
      if(isFinite(v)&&v>=0&&v<=200) return v;
    }catch(_){}
    return 100;
  }
  function _metroSetVolPct(v){
    try{localStorage.setItem(METRO_VOL_KEY,String(Math.max(0,Math.min(200,Math.round(v)))));}catch(_){}
  }
  function createMetronome(defaultBpm){
    const wrap=document.createElement('div');wrap.className='ml-met';
    const top=document.createElement('div');top.className='ml-met-top';
    const leftDiv=document.createElement('div');
    const titleEl=document.createElement('div');titleEl.className='ml-met-title';titleEl.textContent='节拍器';
    const subEl=document.createElement('div');subEl.className='ml-met-sub';subEl.textContent='跟随这首歌的节奏，也可以手动调整';
    leftDiv.appendChild(titleEl);leftDiv.appendChild(subEl);
    const toggle=document.createElement('button');
    toggle.className='ml-met-toggle off';toggle.type='button';toggle.textContent='开始';
    top.appendChild(leftDiv);top.appendChild(toggle);
    const body=document.createElement('div');body.className='ml-met-body';
    const bpmEl=document.createElement('div');bpmEl.className='ml-met-bpm';
    const bpmNum=document.createElement('span');bpmNum.className='ml-met-bpm-num';bpmNum.textContent=String(defaultBpm||72);
    const bpmSmall=document.createElement('small');bpmSmall.textContent=' 速度';
    bpmEl.appendChild(bpmNum);bpmEl.appendChild(bpmSmall);
    const minusBtn=document.createElement('button');minusBtn.className='ml-met-btn';minusBtn.type='button';minusBtn.textContent='−';
    const plusBtn=document.createElement('button');plusBtn.className='ml-met-btn';plusBtn.type='button';plusBtn.textContent='+';
    const resetBtn=document.createElement('button');resetBtn.className='ml-met-btn';resetBtn.type='button';resetBtn.title='重置';
    resetBtn.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
    const range=document.createElement('input');
    range.className='ml-met-range';range.type='range';
    range.min='30';range.max='240';range.value=String(defaultBpm||72);
    const hint=document.createElement('div');hint.className='ml-met-hint';
    hint.textContent='点开始即可打拍。滑杆可细调，± 可快速调节。';
    body.appendChild(bpmEl);body.appendChild(minusBtn);body.appendChild(plusBtn);body.appendChild(resetBtn);
    body.appendChild(range);
    const volRow=document.createElement('div');volRow.className='ml-met-volrow';
    const volIcon=document.createElement('span');volIcon.className='ml-met-vol-icon';volIcon.textContent='\u{1F50A}';
    const volRange=document.createElement('input');
    volRange.className='ml-met-vol-range';volRange.type='range';
    volRange.min='0';volRange.max='200';volRange.step='5';volRange.value=String(_metroVolPct());
    volRange.setAttribute('aria-label','节拍器音量');
    const volVal=document.createElement('span');volVal.className='ml-met-vol-val';volVal.textContent=_metroVolPct()+'%';
    volRange.oninput=()=>{
      _metroSetVolPct(parseInt(volRange.value,10)||0);
      volVal.textContent=_metroVolPct()+'%';
      volIcon.textContent=_metroVolPct()===0?'\u{1F507}':'\u{1F50A}';
    };
    volRow.appendChild(volIcon);volRow.appendChild(volRange);volRow.appendChild(volVal);
    body.appendChild(volRow);
    body.appendChild(hint);
    wrap.appendChild(top);wrap.appendChild(body);
    const getBpm=()=>Math.max(30,Math.min(240,parseInt(range.value,10)||72));
    const updateDisplay=()=>{bpmNum.textContent=String(getBpm());range.value=String(getBpm());};
    minusBtn.onclick=()=>{range.value=String(getBpm()-1);updateDisplay();if(_metroRunning)startMetronome(getBpm());};
    plusBtn.onclick=()=>{range.value=String(getBpm()+1);updateDisplay();if(_metroRunning)startMetronome(getBpm());};
    resetBtn.onclick=()=>{range.value=String(defaultBpm||72);updateDisplay();if(_metroRunning)startMetronome(getBpm());};
    range.oninput=()=>{updateDisplay();if(_metroRunning)startMetronome(getBpm());};
    toggle.onclick=()=>{if(_metroRunning){stopMetronome();}else{startMetronome(getBpm());}};
    return wrap;
  }

  function attachSwipeBack(){
    const panel=detail;
    const overlay=$('ml-detail-overlay');
    let sx=0,sy=0,dx=0,dragging=false,started=false;
    function canStart(t){
      if(!panel.classList.contains('open')) return false;
      const header=t.closest('#ml-detail-header');
      const body=t.closest('#ml-detail');
      if(header) return true;
      if(!body) return false;
      const scroller=t.closest('#ml-detail-body');
      if(scroller && scroller.scrollTop>0) return false;
      const dialog=t.closest('#ml-detail-dialog');
      if(dialog && dialog.scrollTop>0) return false;
      return (window.innerWidth<=900);
    }
    panel.addEventListener('touchstart',e=>{
      if(!canStart(e.target)) return;
      const t=e.touches[0];
      sx=t.clientX; sy=t.clientY; dx=0; dragging=false; started=true;
      panel.classList.remove('swiping');
    },{passive:true});
    panel.addEventListener('touchmove',e=>{
      if(!started) return;
      const t=e.touches[0];
      const mx=t.clientX-sx, my=t.clientY-sy;
      if(!dragging){
        if(Math.abs(mx)>10 && Math.abs(mx)>Math.abs(my) && mx>0) dragging=true;
        else if(Math.abs(my)>10) { started=false; return; }
      }
      if(!dragging) return;
      dx=Math.max(0,mx);
      panel.classList.add('swiping');
      panel.style.transform=`translateX(${dx}px)`;
      if(overlay) overlay.style.opacity=String(Math.max(0,1-dx/(window.innerWidth*0.9)));
      e.preventDefault();
    },{passive:false});
    function end(){
      if(!started) return;
      started=false;
      if(!dragging){
        panel.style.transform='';
        if(overlay) overlay.style.opacity='';
        return;
      }
      if(dx>Math.min(140,window.innerWidth*0.28)){
        panel.style.transition='transform .22s ease, opacity .22s ease';
        panel.style.transform=`translateX(${window.innerWidth}px)`;
        if(overlay) overlay.style.opacity='0';
        setTimeout(()=>{
          panel.style.transition='';
          closeDetail();
        },220);
      }else{
        panel.style.transition='transform .22s ease, opacity .22s ease';
        panel.style.transform='';
        if(overlay) overlay.style.opacity='';
        setTimeout(()=>{panel.style.transition='';panel.classList.remove('swiping');},220);
      }
      dragging=false; dx=0;
    }
    panel.addEventListener('touchend',end,{passive:true});
    panel.addEventListener('touchcancel',end,{passive:true});

    window.addEventListener('popstate',()=>{
      if(_mpExpanded) return;
      if(panel.classList.contains('open')) closeDetail(true);
    });
    window.addEventListener('popstate',()=>{
      if(_mpExpanded&&(!history.state||!history.state.__mlPlayerView)){
        _mpCloseExpandedFromHistory();
      }
    });
  }

  /* ── GSAP 动效(增强;gsap 未加载或系统偏好"减少动态效果"时零影响) ── */
  function fxReady(){
    try{
      return !!window.gsap && !(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }catch(_){return false;}
  }
  function fxDetailEnter(){
    if(!fxReady())return;
    try{
      const dlg=$('ml-detail-dialog');
      if(!dlg)return;
      const targets=[...dlg.children].filter(el=>el&&el.offsetHeight>0).slice(0,8);
      if(!targets.length)return;
      window.gsap.fromTo(targets,
        {opacity:0,y:16},
        {opacity:1,y:0,duration:.5,ease:'power3.out',stagger:.07,clearProps:'opacity,transform',overwrite:'auto'});
    }catch(_){}
  }
  function fxAttachPressFeedback(){
    if(!window.gsap)return;
    const SELECTOR='.ml-song-card,.ml-wp-card,.ml-compact-row,.sw-kb,.ml-view-mode button,.sw-tog,.ml-filter-chip,.ml-card-play';
    root.addEventListener('pointerdown',e=>{
      if(!fxReady())return;
      const t=e.target.closest?e.target.closest(SELECTOR):null;
      if(!t)return;
      const prevTransition=t.style.transition;
      t.style.transition='none';
      window.gsap.to(t,{scale:.965,duration:.13,ease:'power2.out',overwrite:'auto'});
      const release=()=>{
        window.gsap.to(t,{scale:1,duration:.35,ease:'back.out(2.2)',overwrite:'auto',clearProps:'scale',
          onComplete:()=>{t.style.transition=prevTransition;}});
      };
      t.addEventListener('pointerup',release,{once:true});
      t.addEventListener('pointercancel',release,{once:true});
      t.addEventListener('pointerleave',release,{once:true});
    },{passive:true});
  }

  function openDetail(s,opts={}){
    destroyAP();
    stopMetronome();
    syncHaloTheme();
    if(!detail.classList.contains('open')){
      _detailReturnScroll=root.scrollTop||window.scrollY||0;
    }
    _activeDetailSongId=s.id||'';
    setSongState(s.id,{openedAt:Date.now()});
    updateDetailStateButtons(s);
    renderHomePanels();

    _mpBind();
    if(hasSongAudio(s)){
      let idx=_mpSongs.findIndex(x=>x.id===s.id);
      if(idx<0) idx=_mpAddToQueue(s,true);
      const isSameSong = (idx>=0 && idx===_mpIdx);
      if(!isSameSong){
        _mpIdx=idx;
        _mpRenderQueue();
        _mpLrc=[]; _mpLrcIdx=-1;
        _mpPlayRequestId++;
        _mpAudio.src=_mpPrepareAudioSrc(resolveMediaUrl(s.mp3));
        _mpApplySongPitchSettings(s,false);
        if(s.lrc){
          fetch(resolveMediaUrl(s.lrc)).then(r=>{
            if(!r.ok) throw new Error('LRC '+r.status);
            return r.text();
          }).then(text=>{
            const parsed=_mpParseLrc(text);
            if(parsed.length){
              _mpLrc=parsed;
              _mpLrcTimed=true;
              _mpLrcIdx=-1;
              _mpRenderLrc();
              _mpSyncLrc(_mpAudio.currentTime||0,true);
            }else{
              _mpUseFallbackLyrics(s);
              _mpSyncLrc(_mpAudio.currentTime||0,true);
            }
          }).catch(()=>{
            _mpUseFallbackLyrics(s);
            _mpSyncLrc(_mpAudio.currentTime||0,true);
          });
        }else{
          _mpUseFallbackLyrics(s);
          _mpSyncLrc(_mpAudio.currentTime||0,true);
        }
      }else{
        _mpSetPitchUi(_mpPitchSemi);
      }
      const titleEl=document.getElementById('ml-mp-title');
      const artistEl=document.getElementById('ml-mp-artist');
      if(titleEl) titleEl.textContent=s.title||'';
      if(artistEl) artistEl.textContent=s.artist||'';
      const xt=document.getElementById('ml-player-title');
      const xa=document.getElementById('ml-player-artist');
      const xk=document.getElementById('ml-player-key');
      const xb=document.getElementById('ml-player-bpm');
      const xnt=document.getElementById('ml-player-now-title');
      const xns=document.getElementById('ml-player-now-sub');
      if(xt) xt.textContent=s.title||'';
      if(xa) xa.textContent=s.artist||'';
      if(xk) xk.textContent='调: '+(s.origKey||'—');
      if(xb) xb.textContent='速度: '+(s.bpm||'—');
      if(xnt) xnt.textContent=s.title||'正在播放';
      if(xns) xns.textContent=s.artist||s.source||'诗歌';
      _mpSetCover(s.cover||null);
      _mpApplyPlayerAccent(s);
      const stage=document.getElementById('ml-mp-stage');
      if(stage) stage.classList.toggle('playing', !_mpAudio.paused);
      if(isSameSong && _mpLrc.length && !document.getElementById('ml-mp-lrc-inner')?.children.length){
        _mpRenderLrc();
      }
      const detailPlayer=document.getElementById('ml-miniplayer');
      if(detailPlayer) detailPlayer.classList.add('has-mp3');
    } else {
      const detailPlayer=document.getElementById('ml-miniplayer');
      if(detailPlayer) detailPlayer.classList.remove('has-mp3');
    }
    const fromUrl=!!opts.fromUrl;
    if(!fromUrl){
      try{
        history.pushState(Object.assign({}, history.state||{}, {__mlDetail:true,__mlSongId:s.id}), '', buildSongUrl(s.id));
        _detailStatePushed=true;
      }catch(err){}
    }else{
      _detailStatePushed=false;
      setSongUrl(s.id, true);
    }
    $('ml-detail-title').textContent=s.title||'';
    const body=$('ml-detail-body');
    body.innerHTML='';

    const songState=getSongState(s.id);
    const hasRenderedScore=hasRenderableScore(s);
    const scoreImages=normalizeScoreImages(s);
    const hasImageScore=scoreImages.length>0;
    let curKey=songState.lastKey||s.origKey||'C';
    let preferFlat=FLAT_KEYS.has(parseKeyName(curKey).root);

    const wrap=document.createElement('div');wrap.className='sw-wrap';
    const kPill=document.createElement('span');kPill.className='sw-pill sw-kpill';kPill.textContent='1 = '+curKey;

    const coverThumb=document.createElement(s.cover?'img':'div');
    coverThumb.className='sw-cover-thumb';
    if(s.cover){coverThumb.src=s.cover;coverThumb.alt=s.title||'';}
    else{coverThumb.textContent='♪';}

    const infoDiv=document.createElement('div');infoDiv.className='sw-info';
    const detailNote=getSongDetailNote(s);
    infoDiv.innerHTML=`<div class="sw-eyebrow">${s.displayArtist||s.source||'诗歌库'}</div>
      <div class="sw-title">${s.title||''}</div>
      <div class="sw-sub">${getSongDetailSub(s)}</div>
      ${detailNote?`<div class="sw-note">${detailNote}</div>`:''}`;
    const pillsDiv=document.createElement('div');pillsDiv.className='sw-pills';
    pillsDiv.appendChild(kPill);
    if(s.timeSign){const p=document.createElement('span');p.className='sw-pill';p.textContent=s.timeSign;pillsDiv.appendChild(p);}
    if(s.bpm){const p=document.createElement('span');p.className='sw-pill';p.textContent='♩ = '+s.bpm;pillsDiv.appendChild(p);}
    infoDiv.appendChild(pillsDiv);

    const titleRow=document.createElement('div');titleRow.className='sw-title-row';
    titleRow.appendChild(coverThumb);titleRow.appendChild(infoDiv);

    const togBtn=document.createElement('button');togBtn.className='sw-tog';
    togBtn.innerHTML='<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg> 移调';
    const hd=document.createElement('div');hd.className='sw-hd';
    hd.appendChild(titleRow);hd.appendChild(togBtn);wrap.appendChild(hd);

    const kg=document.createElement('div');kg.className='sw-kg';
    const capoEl=document.createElement('div');
    capoEl.className='sw-capo plain';
    capoEl.innerHTML=`<div style="font-size:15px;flex-shrink:0">🎸</div>
      <div style="flex:1"><div class="sw-capo-t"></div><div class="sw-capo-s"></div></div>
      <div class="sw-capo-n"></div>`;
    const lbDiv=document.createElement('div');lbDiv.className='sw-lb';

    const ksDiv=document.createElement('div');ksDiv.className='sw-ks';
    const slabel=document.createElement('div');slabel.className='sw-slabel';slabel.textContent='目标调';
    const quickKeys=document.createElement('div');quickKeys.className='sw-kg sw-key-actions';
    ksDiv.appendChild(slabel);ksDiv.appendChild(quickKeys);ksDiv.appendChild(kg);
    const panelInner=document.createElement('div');panelInner.className='sw-panel-inner';
    panelInner.appendChild(ksDiv);panelInner.appendChild(capoEl);panelInner.appendChild(lbDiv);
    const panel=document.createElement('div');panel.className='sw-panel';panel.appendChild(panelInner);wrap.appendChild(panel);

    const scoreModeShell=document.createElement('section');
    scoreModeShell.className='ml-score-stack';
    const imagePanel=document.createElement('div');
    imagePanel.className='ml-score-image-panel';
    const emptyPanel=document.createElement('div');
    emptyPanel.className='ml-score-empty';
    emptyPanel.textContent='这首歌暂时没有可显示的歌谱。';
    wrap.hidden=!hasRenderedScore;

    /* ── 显示模式:简谱 / 歌词 / 并排(纯附加,默认 = 现状) ── */
    const VIEW_MODE_KEY='cecp:musiclib:view-mode:v1';
    const lyricsPanel=document.createElement('div');
    lyricsPanel.className='ml-lyrics-panel';
    let lyricsLineCount=0;
    const splitLyricLines=text=>{
      const rough=[];
      let buf='';
      for(const ch of text){
        buf+=ch;
        if('。；;！!？?'.indexOf(ch)>=0){rough.push(buf.trim());buf='';}
      }
      if(buf.trim())rough.push(buf.trim());
      const out=[];
      rough.forEach(line=>{
        if([...line].length<=20){out.push(line);return;}
        const parts=line.split(/([，,、])/);
        let cur='';
        for(let i=0;i<parts.length;i+=2){
          const seg2=parts[i]+(parts[i+1]||'');
          if(cur&&[...cur+seg2].length>18){out.push(cur.trim());cur=seg2;}
          else cur+=seg2;
        }
        if(cur.trim())out.push(cur.trim());
      });
      return out.filter(Boolean);
    };
    (s.sections||[]).forEach(sec=>{
      const secEl=document.createElement('div');secEl.className='ml-lyrics-sec';
      if(sec&&sec.name){
        const nm=document.createElement('div');nm.className='ml-lyrics-sec-name';nm.textContent=sec.name;secEl.appendChild(nm);
      }
      const rowTexts=[];
      for(const row of (sec&&sec.lines)||[]){
        const segs=Array.isArray(row)?row:((row&&row.line)||[]);
        const tx=segs.map(seg=>{
          if(!seg||typeof seg!=='object'||typeof seg.label==='string')return '';
          return spStripTokens(seg.lyric||'');
        }).join('').replace(/[ㅤ　]+/g,'').replace(/ {2,}/g,' ').trim();
        if(tx)rowTexts.push(tx);
      }
      if(!rowTexts.length)return;
      splitLyricLines(rowTexts.join('')).forEach(lineText=>{
        const le=document.createElement('div');le.className='ml-lyrics-line';le.textContent=lineText;secEl.appendChild(le);
        lyricsLineCount++;
      });
      lyricsPanel.appendChild(secEl);
    });
    const scoreMain=document.createElement('div');
    scoreMain.className='ml-score-main';
    scoreMain.appendChild(wrap);
    scoreMain.appendChild(lyricsPanel);
    const canSwitchView=hasRenderedScore&&lyricsLineCount>0;
    const modeBar=document.createElement('div');
    modeBar.className='ml-view-mode';
    const modeBtns={};
    function applyViewMode(mode,persist){
      const m=(mode==='lyrics'||mode==='side')?mode:'score';
      scoreModeShell.classList.toggle('mode-lyrics',m==='lyrics');
      scoreModeShell.classList.toggle('mode-side',m==='side');
      Object.keys(modeBtns).forEach(k=>modeBtns[k].classList.toggle('on',k===m));
      if(persist){try{localStorage.setItem(VIEW_MODE_KEY,m);}catch(_){}}
      try{scheduleFitRows();}catch(_){}
    }
    if(canSwitchView){
      [['score','简谱'],['lyrics','歌词'],['side','并排']].forEach(([m,label])=>{
        const b=document.createElement('button');
        b.type='button';b.textContent=label;
        b.addEventListener('click',()=>applyViewMode(m,true));
        modeBtns[m]=b;modeBar.appendChild(b);
      });
      scoreModeShell.appendChild(modeBar);
    }
    scoreModeShell.appendChild(scoreMain);
    if(hasImageScore) scoreModeShell.appendChild(imagePanel);
    if(!hasRenderedScore&&!hasImageScore) scoreModeShell.appendChild(emptyPanel);
    body.appendChild(scoreModeShell);
    if(canSwitchView){
      let storedMode='score';
      try{storedMode=localStorage.getItem(VIEW_MODE_KEY)||'score';}catch(_){}
      requestAnimationFrame(()=>applyViewMode(storedMode,false));
    }

    let fitRaf=0;
    const getViewportBox=()=>{
      const vv=window.visualViewport;
      return vv?{
        width:vv.width||window.innerWidth||document.documentElement.clientWidth||0,
        height:vv.height||window.innerHeight||document.documentElement.clientHeight||0,
        offsetTop:vv.offsetTop||0
      }:{
        width:window.innerWidth||document.documentElement.clientWidth||0,
        height:window.innerHeight||document.documentElement.clientHeight||0,
        offsetTop:0
      };
    };
    const shouldUseScreenHeightFit=()=>{
      const coarse=window.matchMedia?window.matchMedia('(pointer: coarse)').matches:false;
      const noHover=window.matchMedia?window.matchMedia('(hover: none)').matches:false;
      const touchPoints=navigator.maxTouchPoints||0;
      return coarse||(noHover&&touchPoints>0);
    };
    const getAvailableScoreHeight=()=>{
      const viewport=getViewportBox();
      const header=document.getElementById('ml-detail-header');
      const headerHeight=header?header.getBoundingClientRect().height:0;
      const chromeHeight=Math.max(0,panelInner.scrollHeight-lbDiv.scrollHeight);
      return Math.max(0,viewport.height-headerHeight-chromeHeight);
    };
    const resetScoreFit=()=>{
      lbDiv.style.transform='';
      lbDiv.style.transformOrigin='';
      lbDiv.style.width='';
      lbDiv.style.marginBottom='';
      lbDiv.style.padding='8px 18px 16px 8px';
      lbDiv.style.boxSizing='border-box';
      if(lbDiv.parentElement)lbDiv.parentElement.style.overflow='hidden';
    };
    const normalizePreviewRowHeights=()=>{
      lbDiv.querySelectorAll('.prev-row').forEach(row=>{
        row.style.setProperty('--row-note-height','0px');
        let maxH=0;
        row.querySelectorAll('.p-n').forEach(noteLane=>{
          maxH=Math.max(maxH,Math.ceil(noteLane.getBoundingClientRect().height||0));
        });
        if(maxH)row.style.setProperty('--row-note-height',maxH+'px');
      });
    };
    const measureNaturalScore=()=>{
      let maxW=0;
      lbDiv.querySelectorAll('.sw-lrow').forEach(row=>{
        const prevDisplay=row.style.display;
        row.style.display='inline-flex';
        if(row.scrollWidth>maxW)maxW=row.scrollWidth;
        row.style.display=prevDisplay;
      });
      if(!maxW)return null;
      const naturalWidth=maxW+24;
      lbDiv.style.width=naturalWidth+'px';
      const naturalHeight=lbDiv.scrollHeight;
      if(!naturalHeight)return null;
      return { width:naturalWidth,height:naturalHeight };
    };
    const scheduleFitRows=()=>{
      cancelAnimationFrame(fitRaf);
      fitRaf=requestAnimationFrame(()=>{
        fitRaf=0;
        fitRows();
      });
    };

    togBtn.addEventListener('click',()=>{
      panel.classList.toggle('open');
      togBtn.classList.toggle('on',panel.classList.contains('open'));
      scheduleFitRows();
    });

    function setCurrentKey(nextKey,flatMode){
      if(flatMode!==undefined)preferFlat=flatMode;
      curKey=nextKey;
      setSongState(s.id,{lastKey:curKey});
      renderHomePanels();
      renderKeyButtons();
      renderScore();
      if(fxReady()){
        try{window.gsap.fromTo(lbDiv,{opacity:.32},{opacity:1,duration:.28,ease:'power2.out',clearProps:'opacity',overwrite:'auto'});}catch(_){}
      }
    }
    function addQuickKey(label,handler){
      const b=document.createElement('button');
      b.className='sw-kb';
      b.type='button';
      b.textContent=label;
      b.addEventListener('click',handler);
      quickKeys.appendChild(b);
      return b;
    }
    addQuickKey('-1',()=>setCurrentKey(stepKeyName(curKey,-1,preferFlat)));
    addQuickKey('原调',()=>setCurrentKey(s.origKey||'C',FLAT_KEYS.has(parseKeyName(s.origKey||'C').root)));
    addQuickKey('+1',()=>setCurrentKey(stepKeyName(curKey,1,preferFlat)));
    const enharmBtn=addQuickKey(preferFlat?'♭':'#',()=>{
      preferFlat=!preferFlat;
      curKey=enharmonicKeyName(curKey,preferFlat);
      enharmBtn.textContent=preferFlat?'♭':'#';
      setCurrentKey(curKey,preferFlat);
    });
    function renderKeyButtons(){
      kg.innerHTML='';
      const keys=preferFlat?KEY_SET_FLAT:KEY_SET_SHARP;
      keys.forEach(k=>{
        const b=document.createElement('button');
        b.className='sw-kb'+(k===curKey?' on':'');
        b.type='button';
        b.textContent=k;
        b.addEventListener('click',()=>setCurrentKey(k,preferFlat));
        kg.appendChild(b);
      });
      enharmBtn.textContent=preferFlat?'♭':'#';
    }
    renderKeyButtons();

    const tools=document.createElement('div');tools.className='sw-tools';
    const toolsRow=document.createElement('div');toolsRow.className='sw-tools-row';
    toolsRow.appendChild(lyricHlCreateController(lbDiv,()=>s.id));

    const shareBtn=document.createElement('button');
    shareBtn.className='sw-pill';
    shareBtn.type='button';
    shareBtn.textContent='🔗 分享';
    shareBtn.addEventListener('click',()=>shareSong(s));
    toolsRow.appendChild(shareBtn);

    const exportBtn=document.createElement('button');
    exportBtn.className='sw-pill';
    exportBtn.type='button';
    exportBtn.textContent='🖼 下载图片';
    exportBtn.addEventListener('click',()=>{
      if(exportBtn.disabled) return;
      const old=exportBtn.textContent;
      exportBtn.disabled=true;
      exportBtn.style.opacity='.65';
      exportBtn.textContent='生成中...';
      const exportOpts={
        title:s.title||'transpose',
        key:curKey,
        song:s,
        a4:true,
        bgColor:'#ffffff',
        tight:true,
        width:Math.max(560,Math.ceil(wrap.getBoundingClientRect().width||0)||900)
      };
      exportSongAsFittedPng(lbDiv,exportOpts).catch(err=>{
        try{ console.warn('[musiclib] fitted export failed, fallback to legacy single image',err); }catch(_){}
        return exportTransposePanel(lbDiv,exportOpts);
      }).then(()=>{
        showToast('图片已下载');
        exportBtn.textContent='已下载';
      }).catch(err=>{
        showToast('导出失败，请重试');
        exportBtn.textContent='下载失败';
        try{ console.error('[musiclib] export transpose image failed',err); }catch(_){}
      }).finally(()=>{
        setTimeout(()=>{
          exportBtn.disabled=false;
          exportBtn.style.opacity='';
          exportBtn.textContent=old;
        },1200);
      });
    });
    toolsRow.appendChild(exportBtn);

    if(s.youtube){
      const yt=document.createElement('a');yt.className='yt-btn';yt.href=s.youtube;yt.target='_blank';yt.title='YouTube';
      yt.innerHTML='<svg viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>';
      toolsRow.appendChild(yt);
    }
    if(s.lrc){
      const lrc=document.createElement('a');lrc.className='sw-pill';
      lrc.href=s.lrc;lrc.target='_blank';
      lrc.textContent='📝 LRC';toolsRow.appendChild(lrc);
    }
    if(hasRenderedScore&&toolsRow.children.length){tools.appendChild(toolsRow);scoreModeShell.insertBefore(tools,scoreMain);}

    if(hasRenderedScore) scoreModeShell.insertBefore(createMetronome(s.bpm || 72),scoreMain);

    function renderImageScore(){
      imagePanel.innerHTML='';
      if(!hasImageScore) return;
      const scoreDiv=document.createElement('div');
      scoreDiv.className='sw-score ml-score-image-score';
      const scoreTop=document.createElement('div');
      scoreTop.className='sw-score-top';
      const lbl=document.createElement('span');
      lbl.className='sw-score-lbl';
      lbl.textContent='原图谱';
      const keyBadge=document.createElement('span');
      keyBadge.className='sw-score-key';
      keyBadge.textContent='原调 '+(s.origKey||'—');
      scoreTop.appendChild(lbl);
      scoreTop.appendChild(keyBadge);
      scoreDiv.appendChild(scoreTop);
      const hint=document.createElement('div');
      hint.className='ml-score-image-hint';
      hint.textContent='图片谱保持原始内容，不会随当前调移调。';
      scoreDiv.appendChild(hint);
      scoreImages.forEach((src,index)=>{
        const page=document.createElement('figure');
        page.className='ml-score-image-page';
        const cap=document.createElement('figcaption');
        cap.textContent=scoreImages.length>1?`第 ${index+1} / ${scoreImages.length} 页`:'原始图片谱';
        const img=document.createElement('img');
        img.src=src;
        img.loading='lazy';
        img.alt=(s.title||'诗歌')+' 原图谱 '+(index+1);
        img.addEventListener('load',()=>page.classList.add('is-loaded'));
        img.addEventListener('error',()=>{
          page.classList.add('is-error');
          const err=document.createElement('div');
          err.className='ml-score-image-error';
          err.textContent='这张图片谱加载失败，可以尝试打开原图。';
          page.appendChild(err);
        },{once:true});
        img.addEventListener('click',()=>openLightbox(src,scoreImages));
        const actions=document.createElement('div');
        actions.className='ml-score-image-actions';
        const open=document.createElement('a');
        open.href=src;
        open.target='_blank';
        open.rel='noopener';
        open.textContent='打开原图';
        actions.appendChild(open);
        page.appendChild(cap);
        page.appendChild(img);
        page.appendChild(actions);
        scoreDiv.appendChild(page);
      });
      imagePanel.appendChild(scoreDiv);
    }
    renderImageScore();

    function renderScore(){
      const info=calcCapo(curKey,s.origKey||'C'),st=info.st,useFlat=preferFlat;
      kPill.textContent='1 = '+curKey;
      if(curKey===(s.origKey||'C')){
        capoEl.className='sw-capo plain';
        capoEl.querySelector('.sw-capo-t').textContent='原调演奏';
        capoEl.querySelector('.sw-capo-s').textContent='不需要变调夹';
        capoEl.querySelector('.sw-capo-n').textContent='—';
      }else if(info.capo===0){
        capoEl.className='sw-capo plain';
        capoEl.querySelector('.sw-capo-t').textContent='不需要变调夹';
        capoEl.querySelector('.sw-capo-s').textContent='按 '+info.playKey+' 调指法演奏';
        capoEl.querySelector('.sw-capo-n').textContent='开放';
      }else{
        capoEl.className='sw-capo';
        capoEl.querySelector('.sw-capo-t').textContent='变调夹夹第 '+info.capo+' 格';
        capoEl.querySelector('.sw-capo-s').textContent='按 '+info.playKey+' 调指法 → 实际 '+curKey;
        capoEl.querySelector('.sw-capo-n').textContent=info.capo;
      }
      lbDiv.innerHTML='';
      for(const sec of s.sections||[]){
        const se=_div('sw-lsec');
        const sn=_div('sw-lsec-name');sn.textContent=sec.name||'';se.appendChild(sn);
        for(const line of sec.lines||[]){
          const le=_div('sw-lline');const row=_div('sw-lrow prev-row'+((!Array.isArray(line)&&line.b)?' bold':''));
          const segs=Array.isArray(line)?line:(line.line||[]);
          let voltaWrap=null;
          for(const seg of segs){
            if(!segIsRenderableBlock(seg))continue;
            if(segIsLabelBlock(seg)){(voltaWrap||row).appendChild(segRenderLabelBlock(seg,row));continue;}
            const segEl=_div('prev-seg');
            const chord=document.createElement('div');
            chord.className='p-chord'+(seg.chord?'':' empty');
            setChordContentEx(chord,seg.chord?trChordEx(seg.chord,st,useFlat,trChord):'\u00a0',setChordContent);
            chordChipDecorate(chord);
            segEl.appendChild(chord);
            segEl.appendChild(renderNStr(seg.n||'',{inlineTimeSign:getSegInlineTimeSign(seg)}));
            const lyric=document.createElement('div');lyric.className='p-lyric'+((!Array.isArray(line)&&line.b)?' bold':'');setLyricContentEx(lyric,normLyricText(seg.lyric),setLyricContent);
            segEl.appendChild(lyric);
            if(seg.lyric2){const ly2=document.createElement('div');ly2.className='p-lyric p-lyric2'+((!Array.isArray(line)&&line.b)?' bold':'');setLyricContentEx(ly2,normLyricText(seg.lyric2),setLyricContent);segEl.appendChild(ly2);}
            if(seg.lyric3){const ly3=document.createElement('div');ly3.className='p-lyric p-lyric3'+((!Array.isArray(line)&&line.b)?' bold':'');setLyricContentEx(ly3,normLyricText(seg.lyric3),setLyricContent);segEl.appendChild(ly3);}
            if(seg.lyric4){const ly4=document.createElement('div');ly4.className='p-lyric p-lyric4'+((!Array.isArray(line)&&line.b)?' bold':'');setLyricContentEx(ly4,normLyricText(seg.lyric4),setLyricContent);segEl.appendChild(ly4);}
            const _vn=getVoltaStartLabel(seg.n);
            if(_vn){
              row.classList.add('has-volta');
              voltaWrap=document.createElement('span');
              voltaWrap.className='prev-volta';
              voltaWrap.setAttribute('data-v',_vn+'.');
            }
            (voltaWrap||row).appendChild(segEl);
            if(voltaWrap&&hasVoltaEnd(seg.n)){voltaWrap.classList.add('closed');row.appendChild(voltaWrap);voltaWrap=null;}
          }
          if(voltaWrap)row.appendChild(voltaWrap);
          le.appendChild(row);se.appendChild(le);
        }
        lbDiv.appendChild(se);
      }
      lyricHlApply(lbDiv,s.id);
      scheduleFitRows();
    }
    function fitRows(){
      resetScoreFit();
      normalizePreviewRowHeights();
      const parent=lbDiv.parentElement;
      if(!parent||!lbDiv.isConnected)return;

      const natural=measureNaturalScore();
      if(!natural)return;

      const availableWidth=parent.clientWidth||natural.width;
      if(!availableWidth)return;

      let scaleX=availableWidth/natural.width;
      if(!isFinite(scaleX)||scaleX<=0)scaleX=1;
      let scaleY=scaleX;
      if(shouldUseScreenHeightFit()){
        const availableHeight=getAvailableScoreHeight();
        if(availableHeight>0){
          const fittedHeight=natural.height*scaleX;
          if(fittedHeight>availableHeight){
            scaleY=scaleX*(availableHeight/fittedHeight);
          }
        }
      }
      if(!isFinite(scaleY)||scaleY<=0)scaleY=scaleX;

      lbDiv.style.transform='scale('+scaleX+','+scaleY+')';
      lbDiv.style.transformOrigin='left top';
      lbDiv.style.width=natural.width+'px';
      lbDiv.style.marginBottom=(natural.height*(scaleY-1)+18)+'px';
    }
    if(hasRenderedScore){
      renderScore();
      scheduleFitRows();
    }
    if(window._mlFitCleanup)window._mlFitCleanup();
    const onViewportChange=()=>scheduleFitRows();
    const onPanelTransitionEnd=e=>{
      if(e.target===panel&&e.propertyName==='max-height')scheduleFitRows();
    };
    const vv=window.visualViewport;
    const fitObs=new ResizeObserver(scheduleFitRows);
    fitObs.observe(panelInner);
    panel.addEventListener('transitionend',onPanelTransitionEnd);
    window.addEventListener('resize',onViewportChange,{ passive:true });
    window.addEventListener('orientationchange',onViewportChange,{ passive:true });
    if(vv){
      vv.addEventListener('resize',onViewportChange,{ passive:true });
      vv.addEventListener('scroll',onViewportChange,{ passive:true });
    }
    if(document.fonts&&document.fonts.ready){
      document.fonts.ready.then(()=>{
        if(lbDiv.isConnected)scheduleFitRows();
      }).catch(()=>{});
    }
    window._mlFitObs=fitObs;
    window._mlFitCleanup=()=>{
      cancelAnimationFrame(fitRaf);
      fitObs.disconnect();
      panel.removeEventListener('transitionend',onPanelTransitionEnd);
      window.removeEventListener('resize',onViewportChange);
      window.removeEventListener('orientationchange',onViewportChange);
      if(vv){
        vv.removeEventListener('resize',onViewportChange);
        vv.removeEventListener('scroll',onViewportChange);
      }
    };

    detail.classList.add('open');
    root.classList.add('ml-has-detail-open');
    document.body.classList.add('ml-detail-lock');
    detail.scrollTop=0;
    $('ml-detail-dialog')?.scrollTo?.({top:0,left:0});
    fxDetailEnter();
  }

  attachSwipeBack();
  attachPullToRefresh();
  fxAttachPressFeedback();
  window.__CECP_MUSICLIB_ENGINE__={
    version:ML_VER,
    getSongs:()=>songs.slice(),
    getQuery:()=>query,
    setQuery(value){
      query=String(value||'').trim();
      const input=$('ml-search');
      if(input) input.value=query;
      render();
    },
    getSourceFilter:()=>sourceFilter,
    setSourceFilter(value){
      sourceFilter=String(value||'全部')||'全部';
      render();
    },
    render,
    renderWorshipPicks,
    openDetail(songOrId,opts={}){
      const song=typeof songOrId==='string' ? songs.find(s=>s.id===songOrId) : songOrId;
      if(song) openDetail(song,opts);
    },
    closeDetail,
    shareSong(songOrId){
      const song=typeof songOrId==='string' ? songs.find(s=>s.id===songOrId) : songOrId;
      if(song) shareSong(song);
    },
    playSong(songOrId,autoplay=true){
      const song=typeof songOrId==='string' ? songs.find(s=>s.id===songOrId) : songOrId;
      if(!song||!hasSongAudio(song)) return;
      if(autoplay) playSongNow(song);
      else{
        const idx=_mpSongs.findIndex(s=>s.id===song.id);
        if(idx>=0) _mpPlayIdx(idx,false);
        else { _mpIdx=-1; _mpLoadAndPlaySong(song,false); }
      }
    },
    playSongNow(songOrId){
      const song=typeof songOrId==='string' ? songs.find(s=>s.id===songOrId) : songOrId;
      if(song) playSongNow(song);
    },
    addSongToPlaylist(songOrId){
      const song=typeof songOrId==='string' ? songs.find(s=>s.id===songOrId) : songOrId;
      if(song) return addSongToPlaylist(song);
    },
    hasSongAudio,
    cardHTML,
    enrichSong
  };
  window.dispatchEvent(new CustomEvent('cecp:musiclib-engine-ready',{detail:window.__CECP_MUSICLIB_ENGINE__}));
  loadSongs();
})();
