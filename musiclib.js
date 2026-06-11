/* ✦ Designed & Built by YuEn © 2025–2026 ✦ */
/* CECP Music Library v3.3 */
(function(){
  const ML_VER='2026.05.23.1';
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
  const WECHAT='CYuen_290104';
  const INTERNAL_KEY='cecp2026';
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
      s.onerror=()=>{ if(!/cye04\.github\.io\/musiclib\/musiclib\.css/.test(s.href)) s.href='https://cye04.github.io/musiclib/musiclib/musiclib.css?v='+encodeURIComponent(ML_VER); };
    }catch(_){
      s.href='musiclib.css?v='+encodeURIComponent(ML_VER);
      s.onerror=()=>{ s.href='https://cye04.github.io/musiclib/musiclib/musiclib.css?v='+encodeURIComponent(ML_VER); };
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

  let songs=[],query='',sourceFilter='全部';
  let _apLoaded=false,_ap=null;
  let _audioCtx=null,_metroTimer=null,_metroNext=0,_metroRunning=false,_metroBpm=72;
  let _themeObserver=null;
  let _detailStatePushed=false;
  let _revealObserver=null,_weatherCache=null;

  root.innerHTML=`
    <div id="ml-header">
      <div id="ml-nav">
        <div id="ml-brand">
          <span class="ml-brand-dot"><img src="${LOGO_SRC}" alt="橄榄树团契"></span>
          <span class="ml-brand-name">诗歌库</span>
        </div>
        <div id="ml-nav-actions">
          <button class="ml-nav-icon-btn" id="ml-nav-search" type="button" aria-label="聚焦搜索">⌕</button>
          <button class="ml-nav-icon-btn" id="ml-nav-theme" type="button" aria-label="切换深浅主题">◐</button>
        </div>
      </div>
      <div id="ml-hero">
        <h1 id="ml-title">诗歌库</h1>
        <div id="ml-subtitle">精选敬拜诗歌集合，含歌词、简谱、移调与音频练习。</div>
      </div>
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
                <span class="ml-wp-action-icon">▶</span>
                <span>快速播放</span>
              </button>
              <button id="ml-wp-open" class="ml-wp-action" type="button" disabled>
                <span class="ml-wp-action-icon">↗</span>
                <span>打开详情</span>
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
      <div id="ml-search-row">
        <div id="ml-search-wrap">
          <span id="ml-search-icon">⌕</span>
          <input id="ml-search" type="text" placeholder="搜索歌名、歌手或歌词..." autocomplete="off" autocorrect="off"/>
        </div>
        <div id="ml-count-wrap">
          <span class="ml-count-label">总数</span>
          <strong id="ml-count"></strong>
        </div>
      </div>
      <div id="ml-source-bar"></div>
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
      <div id="ml-detail-header">
        <button id="ml-back">‹ 返回</button>
        <div id="ml-detail-title"></div>
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
        <button class="pl-btn" id="ml-mp-expand" aria-label="展开播放器"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M21 3l-7 7"/><path d="M9 21H3v-6"/><path d="M3 21l7-7"/></svg></button>
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
      <div class="pl-vol-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
        <input class="pl-vol" id="ml-mp-vol" type="range" min="0" max="1" step="0.02" value="1">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM18.5 12c0-2.77-1.5-5.15-3.75-6.45v12.9C16.99 17.14 18.5 14.77 18.5 12z"/></svg>
      </div>
    </div>

      <div id="ml-detail-body"></div>
    </div>
    <div id="ml-player-view">
      <div id="ml-player-view-top">
        <button id="ml-player-view-close" type="button" aria-label="收起播放器"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
        <div id="ml-player-view-now">
          <div id="ml-player-now-title">正在播放</div>
          <div id="ml-player-now-sub"></div>
        </div>
        <button id="ml-player-view-menu" type="button" aria-label="播放设置"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg></button>
      </div>
      <div id="ml-player-view-grid">
        <aside id="ml-player-rail" aria-hidden="true">
          <button class="ml-player-rail-btn active" type="button" aria-label="歌曲面板"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="5" width="4" height="14" rx="1"/><rect x="10" y="5" width="4" height="14" rx="1"/><rect x="16" y="5" width="4" height="14" rx="1"/></svg></button>
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
          <span class="ml-player-vol-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></span>
          <input id="ml-player-dock-vol" type="range" min="0" max="1" step="0.02" value="1">
        </div>
      </div>
    </div>
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
    <div id="ml-lightbox">
      <button id="ml-lightbox-close">✕</button>
      <img id="ml-lightbox-img" src="" alt="">
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
    root.insertBefore(listNotice, $('ml-header'));

    const detailNotice=document.createElement('button');
    detailNotice.id='ml-detail-notice';
    detailNotice.type='button';
    detailNotice.setAttribute('aria-label','版权与申请新歌说明');
    detailNotice.innerHTML=noticeHTML;
    detail.insertBefore(detailNotice, $('ml-detail-body'));

    const modal=document.createElement('div');
    modal.id='ml-notice-modal';
    modal.innerHTML=`
      <div id="ml-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="ml-notice-modal-title">
        <button id="ml-notice-close" type="button" aria-label="关闭">✕</button>
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

    const mbLyric=$('ml-mb-lyric');
    if(mbLyric) mbLyric.textContent='';
  })();

  syncHaloTheme();
  observeThemeChanges();

  $('ml-search').addEventListener('input',e=>{query=e.target.value.trim();render();});
  $('ml-back').addEventListener('click',closeDetail);
  $('ml-nav-search')?.addEventListener('click',()=>{$('ml-search')?.focus();});
  bindWorshipPicksEffects();
  updateWorshipGreeting();
  setInterval(updateWorshipGreeting,60000);
  $('ml-nav-theme')?.addEventListener('click',()=>{
    const rootEl=document.documentElement;
    if(!rootEl) return;
    rootEl.classList.toggle('dark');
    syncHaloTheme();
  });

  function showToast(text){
    const t=$('ml-toast');
    if(!t) return;
    t.textContent=text;
    t.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer=setTimeout(()=>t.classList.remove('show'),1800);
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

  $('ml-lightbox').addEventListener('click',e=>{
    if(e.target===e.currentTarget||e.target.id==='ml-lightbox-close') $('ml-lightbox').classList.remove('open');
  });
  $('ml-lightbox-img').addEventListener('click',e=>e.stopPropagation());

  function openLightbox(src){$('ml-lightbox-img').src=src;$('ml-lightbox').classList.add('open');}

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

  function nodeToPngBlobByHtml2Canvas(node,bgColor){
    return loadHtml2Canvas()
      .then(html2canvas=>{
        const dpr=Math.max(1,window.devicePixelRatio||1);
        return html2canvas(node,{
          backgroundColor:bgColor||'#ffffff',
          scale:Math.min(2,dpr),
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

  function nodeToPngBlobRobust(node,bgColor){
    return nodeToPngBlobByHtml2Canvas(node,bgColor).catch(primaryErr=>{
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
    detail.style.transform='';
    detail.classList.remove('swiping');
    $('ml-detail-overlay').style.opacity='0';
    _detailStatePushed=false;
    setSongUrl('', true);
  }

  function tryColor(el, prop){
    if(!el)return '';
    const v=getComputedStyle(el).getPropertyValue(prop).trim();
    return v && v!=='transparent' && v!=='rgba(0, 0, 0, 0)' ? v : '';
  }

  function getThemeGuess(){
    const cs=getComputedStyle(document.body);
    const bg=cs.backgroundColor || 'rgb(255,255,255)';
    const m=bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m)return 'light';
    const avg=(+m[1] + +m[2] + +m[3]) / 3;
    return avg < 120 ? 'dark' : 'light';
  }

  function syncHaloTheme(){
    const rb=root.style;
    const body=document.body, html=document.documentElement;
    const mode=getThemeGuess();

    const bg = tryColor(body,'--theme-bg') || tryColor(html,'--theme-bg') || tryColor(body,'background-color') || (mode==='dark'?'#0b0b0d':'#f5f5f7');
    const bg2 = tryColor(body,'--card-bg') || tryColor(html,'--card-bg') || tryColor(body,'--halo-card-bg') || (mode==='dark'?'#17171a':'#ffffff');
    const bg3 = tryColor(body,'--muted-bg') || tryColor(html,'--muted-bg') || (mode==='dark'?'#222227':'#ececf1');
    const text = tryColor(body,'--theme-text') || tryColor(html,'--theme-text') || tryColor(body,'color') || (mode==='dark'?'#f5f7fb':'#1d1d1f');
    const text2 = tryColor(body,'--theme-text-secondary') || tryColor(html,'--theme-text-secondary') || (mode==='dark'?'rgba(245,247,251,.68)':'#6e6e73');
    const text3 = tryColor(body,'--theme-text-tertiary') || tryColor(html,'--theme-text-tertiary') || (mode==='dark'?'rgba(245,247,251,.36)':'#aeaeb2');
    const accent = tryColor(body,'--theme-primary') || tryColor(html,'--theme-primary') || tryColor(body,'--halo-accent') || (mode==='dark'?'#7c9cff':'#007aff');
    const border = tryColor(body,'--theme-border') || tryColor(html,'--theme-border') || (mode==='dark'?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)');
    const borderMd = tryColor(body,'--theme-border-strong') || tryColor(html,'--theme-border-strong') || (mode==='dark'?'rgba(255,255,255,.13)':'rgba(0,0,0,.13)');

    rb.setProperty('--halo-bg', bg);
    rb.setProperty('--halo-bg2', bg2);
    rb.setProperty('--halo-bg3', bg3);
    rb.setProperty('--halo-text', text);
    rb.setProperty('--halo-text2', text2);
    rb.setProperty('--halo-text3', text3);
    rb.setProperty('--halo-accent', accent);
    rb.setProperty('--halo-border', border);
    rb.setProperty('--halo-border-md', borderMd);
    rb.setProperty('--halo-accent-light', colorMix(accent, 0.16));
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
    _themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
    _themeObserver.observe(document.body,{attributes:true,attributeFilter:['class','style','data-theme']});
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',syncHaloTheme);
  }

  async function loadSongs(){
    try{
      const res=await fetch(GITHUB_API+'?t='+Date.now(),{cache:'no-store'});if(!res.ok)throw 0;
      const files=await res.json();
      const jsons=files.filter(f=>f.name.endsWith('.json')&&f.name!=='test.json');
      const all=await Promise.all(jsons.map(f=>fetch(RAW_BASE+f.name,{cache:'no-store'}).then(r=>r.json()).catch(()=>null)));
      songs=all.filter(Boolean).map(enrichSong);
      $('ml-loading').style.display='none';
      $('ml-count').textContent=songs.length+' 首';
      renderWorshipPicks();
      render();
      openSongFromUrl();
    }catch(e){
      $('ml-loading').innerHTML='<div style="color:#ff3b30;font-size:14px">载入失败，请刷新重试</div>';
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
        const cleaned=cleanText(text.replace(/[ㅤ|，,。.!！?？、]/g,' '));
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
    if(!_mpSongs.length) _mpSongs=songs.filter(hasSongAudio);
    let idx=_mpSongs.findIndex(x=>x.id===song.id);
    if(idx<0){ _mpSongs=[song].concat(_mpSongs); idx=0; }
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
      if(text) sub.textContent=now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})+' · '+text;
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
  function enrichSong(song){
    const source=detectSongSource(song);
    const {album,albumYear}=parseAlbumInfo(Object.assign({},song,{source}));
    return Object.assign({},song,{
      source,
      album,
      albumYear,
      displayArtist:(song.artist||source||'未知来源').trim()
    });
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
  function hi(t,q){
    if(!q||!t)return t||'';
    return t.replace(new RegExp(`(${escapeRegExp(q)})`,'gi'),'<mark class="ml-highlight">$1</mark>');
  }
  function renderSourceBar(){
    const bar=$('ml-source-bar');
    if(!bar) return;
    const counts=songs.reduce((acc,s)=>{
      const key=s.source||'其他';
      acc[key]=(acc[key]||0)+1;
      return acc;
    },{});
    const items=[{name:'全部',count:songs.length}].concat(
      Object.keys(counts)
        .sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b,'zh-Hans-CN'))
        .map(name=>({name,count:counts[name]}))
    );
    if(sourceFilter!=='全部' && !counts[sourceFilter]) sourceFilter='全部';
    bar.innerHTML=items.map(item=>`
      <button class="ml-source-chip${item.name===sourceFilter?' active':''}" data-source="${item.name}" type="button">
        <span class="ml-source-name">${item.name}</span>
        <strong>${item.count}</strong>
      </button>
    `).join('');
    bar.querySelectorAll('.ml-source-chip').forEach(btn=>{
      btn.addEventListener('click',()=>{
        sourceFilter=btn.dataset.source||'全部';
        render();
      });
    });
  }

  function render(){
    const list=$('ml-list'),empty=$('ml-empty'),q=query.toLowerCase();
    renderSourceBar();
    const filtered=songs.filter(s=>{
      const sourceOk=sourceFilter==='全部'||(s.source||'其他')===sourceFilter;
      if(!sourceOk) return false;
      if(!q) return true;
      return (s.title||'').toLowerCase().includes(q)
        || (s.artist||'').toLowerCase().includes(q)
        || (s.source||'').toLowerCase().includes(q)
        || (s.album||'').toLowerCase().includes(q)
        || (s.sub||'').toLowerCase().includes(q)
        || hasLyricMatch(s,q);
    });
    if(!filtered.length){
      $('ml-result-count').textContent=q
        ? `找到 0 首相关诗歌`
        : sourceFilter==='全部'
          ? `全部 ${songs.length} 首诗歌`
          : `${sourceFilter} · 0 首`;
      list.innerHTML='';$('ml-query-text').textContent=query;empty.style.display='block';
      list.classList.remove('is-grouped');
      $('ml-list-stage').style.display='none';
    }else{
      empty.style.display='none';
      $('ml-list-stage').style.display='';
      if(q){
        $('ml-result-count').textContent=`找到 ${filtered.length} 首相关诗歌`;
        list.classList.remove('is-grouped');
        list.innerHTML=filtered.map(s=>cardHTML(s,q)).join('')+'<div id="ml-list-end"></div>';
      }else if(sourceFilter!=='全部'){
        const grouped=new Map();
        filtered.forEach(song=>{
          const key=song.album||'未标注专辑';
          if(!grouped.has(key)) grouped.set(key,[]);
          grouped.get(key).push(song);
        });
        $('ml-result-count').textContent=`${sourceFilter} · ${grouped.size} 组专辑 · ${filtered.length} 首`;
        list.classList.add('is-grouped');
        list.innerHTML=Array.from(grouped.entries())
          .sort((a,b)=>{
            const ay=Math.max(...a[1].map(item=>+(item.albumYear||0)),0);
            const by=Math.max(...b[1].map(item=>+(item.albumYear||0)),0);
            const aUnknown=a[0]==='未标注专辑';
            const bUnknown=b[0]==='未标注专辑';
            if(aUnknown!==bUnknown) return aUnknown?1:-1;
            if(ay!==by) return by-ay;
            return a[0].localeCompare(b[0],'zh-Hans-CN');
          })
          .map(([name,items])=>`
            <section class="ml-group">
              <div class="ml-group-head">
                <div>
                  <div class="ml-group-kicker">专辑</div>
                  <div class="ml-group-title">${name}</div>
                </div>
                <div class="ml-group-count">${items.length} 首</div>
              </div>
              <div class="ml-group-grid">
                ${items.map(s=>cardHTML(s,q)).join('')}
              </div>
            </section>
          `).join('')+'<div id="ml-list-end"></div>';
      }else{
        $('ml-result-count').textContent=`全部 ${songs.length} 首诗歌`;
        list.classList.add('is-grouped');
        const grouped=new Map();
        filtered.forEach(song=>{
          const key=song.source||'其他';
          if(!grouped.has(key)) grouped.set(key,[]);
          grouped.get(key).push(song);
        });
        list.innerHTML=Array.from(grouped.entries())
          .sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],'zh-Hans-CN'))
          .map(([name,items])=>`
            <section class="ml-group">
              <div class="ml-group-head">
                <div>
                  <div class="ml-group-kicker">歌手 / 团体</div>
                  <div class="ml-group-title">${name}</div>
                </div>
                <div class="ml-group-count">${items.length} 首</div>
              </div>
              <div class="ml-group-grid">
                ${items.map(s=>cardHTML(s,q)).join('')}
              </div>
            </section>
          `).join('')+'<div id="ml-list-end"></div>';
      }
      _mpSongs = songs.filter(hasSongAudio);
      _mpRenderQueue();
      list.querySelectorAll('.ml-song-card').forEach(el=>{
        el.addEventListener('click',()=>{const s=songs.find(x=>x.id===el.dataset.id);if(s)openDetail(s);});

        const shareBtn=document.createElement('button');
        shareBtn.className='ml-share-btn';
        shareBtn.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
        shareBtn.title='分享';
        shareBtn.onclick=e=>{
          e.stopPropagation();
          const s=songs.find(x=>x.id===el.dataset.id);
          if(s) shareSong(s);
        };
        el.appendChild(shareBtn);

        const playBtn=document.createElement('button');
        playBtn.className='ml-mp-play-btn';
        playBtn.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>`;
        playBtn.title='播放';
        playBtn.onclick=e=>{
          e.stopPropagation();
          const s=songs.find(x=>x.id===el.dataset.id);
          if(!hasSongAudio(s)) return;
          const idx=_mpSongs.findIndex(x=>x.id===s.id);
          if(idx>=0) _mpPlayIdx(idx,true);
        };
        el.appendChild(playBtn);
      });
    }
    observeRevealItems();
  }

  function cardHTML(s,q){
    const cover=s.cover
      ?`<img class="ml-cover" src="${s.cover}" loading="lazy" onerror="this.outerHTML='<div class=\\'ml-cover-placeholder\\'>♪</div>'">`
      :`<div class="ml-cover-placeholder">封面</div>`;
    const overline=getSongCardOverline(s);
    const meta=getSongCardMeta(s);
    const tags=[
      s.origKey?`<span class="ml-song-tag is-key">${s.origKey}</span>`:'',
      s.timeSign?`<span class="ml-song-tag">${s.timeSign}</span>`:'',
      hasSongAudio(s)?`<span class="ml-song-tag">音频</span>`:''
    ].filter(Boolean).join('');
    return`<div class="ml-song-card ml-reveal" data-id="${s.id}">
      <div class="ml-card-art">${cover}</div>
      <div class="ml-card-body">
        <div class="ml-song-overline">${hi(overline,q)}</div>
        <div class="ml-song-title">${hi(s.title,q)}</div>
        <div class="ml-song-meta">${hi(meta||'收录歌词、简谱与练习资料',q)}</div>
        <div class="ml-song-tags">${tags}</div>
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
  function trChordToken(ch,st,useFlat){
    const raw=String(ch||'');
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

  let _mpAudio=null,_mpSongs=[],_mpIdx=-1,_mpLoop=false,_mpShuffle=false,_mpLrc=[],_mpLrcIdx=-1,_mpCoverFallback='',_mpExpanded=false,_mpSideMode='song',_mpSideCollapsed=false;

  function _mpFmt(t){
    if(!isFinite(t)) return '0:00';
    const m=Math.floor(t/60), s=Math.floor(t%60);
    return m+':'+String(s).padStart(2,'0');
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
  function _mpSetExpanded(open){
    const pv=$('ml-player-view');
    if(!pv) return;
    _mpExpanded=!!open;
    pv.classList.toggle('open',_mpExpanded);
    pv.classList.toggle('side-collapsed',!!_mpSideCollapsed);
    document.body.style.overflow=_mpExpanded?'hidden':'';
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
  function _mpRenderQueue(){
    const box=$('ml-player-queue-list');
    const empty=$('ml-player-queue-empty');
    if(!box) return;
    box.innerHTML='';
    if(!_mpSongs.length){
      if(empty) empty.hidden=false;
      return;
    }
    if(empty) empty.hidden=true;
    _mpSongs.forEach((song,i)=>{
      const row=document.createElement('button');
      row.type='button';
      row.className='ml-player-queue-item'+(i===_mpIdx?' is-active':'');
      row.innerHTML=`
        <span class="ml-player-queue-index">${i+1}</span>
        <span class="ml-player-queue-main">
          <span class="ml-player-queue-title">${song.title||'未命名歌曲'}</span>
          <span class="ml-player-queue-artist">${song.artist||song.source||'诗歌'}</span>
        </span>
      `;
      row.addEventListener('click',()=>_mpPlayIdx(i,true));
      box.appendChild(row);
    });
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
      _mpLrc.forEach((it,i)=>{
        const d=document.createElement('div');
        d.className=lineClass+(i===0?' active':'');
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
  function _mpSyncLrc(cur){
    if(!_mpLrc.length) return;
    let idx=0;
    for(let i=0;i<_mpLrc.length;i++){
      if(cur>=_mpLrc[i].t) idx=i; else break;
    }
    if(idx===_mpLrcIdx) return;
    _mpLrcIdx=idx;
    function sync(innerId,panelId){
      const inner=$(innerId), panel=$(panelId);
      if(!inner || !panel) return;
      [...inner.children].forEach((el,i)=>el.classList.toggle('active', i===idx));
      const active=inner.children[idx];
      if(active){
        const y=active.offsetTop - panel.clientHeight/2 + active.clientHeight/2;
        panel.scrollTo({ top: Math.max(0,y), behavior:'smooth' });
      }
    }
    sync('ml-mp-lrc-inner','ml-mp-lrc-panel');
    sync('ml-player-lyrics-inner','ml-player-lyrics');
    const nbLyric=$('ml-nowbar-lyric');
    if(nbLyric) nbLyric.textContent=_mpLrc[idx]?.tx || '…';
  }
  function _mpBind(){
    if(_mpAudio) return;
    _mpAudio=$('ml-mp-audio');
    if(!_mpAudio) return;
    const mv=$('ml-mp-vol'); if(mv) mv.value=String(_mpAudio.volume||1);
    const dv=$('ml-player-dock-vol'); if(dv) dv.value=String(_mpAudio.volume||1);

    _mpAudio.addEventListener('loadedmetadata',()=>{
      $('ml-mp-dur').textContent=_mpFmt(_mpAudio.duration);
      const xd=$('ml-player-dur'); if(xd) xd.textContent=_mpFmt(_mpAudio.duration);
    });
    _mpAudio.addEventListener('timeupdate',()=>{
      $('ml-mp-cur').textContent=_mpFmt(_mpAudio.currentTime);
      const xc=$('ml-player-cur'); if(xc) xc.textContent=_mpFmt(_mpAudio.currentTime);
      const dur=_mpAudio.duration||0;
      $('ml-mp-fill').style.width=dur?((_mpAudio.currentTime/dur)*100)+'%':'0%';
      const xf=$('ml-player-fill'); if(xf) xf.style.width=dur?((_mpAudio.currentTime/dur)*100)+'%':'0%';
      const nf=$('ml-nowbar-fill'); if(nf) nf.style.width=dur?((_mpAudio.currentTime/dur)*100)+'%':'0%';
      _mpSyncLrc(_mpAudio.currentTime);
    });
    _mpAudio.addEventListener('play',()=>_mpSetPlayUI(true));
    _mpAudio.addEventListener('pause',()=>_mpSetPlayUI(false));
    _mpAudio.addEventListener('ended',()=>{
      if(_mpLoop){
        _mpAudio.currentTime=0;
        _mpAudio.play().catch(()=>{});
      }else{
        _mpPlayIdx(_mpNextIdxFrom(_mpIdx),true);
      }
    });

    $('ml-mp-playpause')?.addEventListener('click',()=>{
      if(!_mpAudio.src) return;
      if(_mpAudio.paused) _mpAudio.play().catch(()=>{});
      else _mpAudio.pause();
    });
    $('ml-player-playpause')?.addEventListener('click',()=>{
      if(!_mpAudio.src) return;
      if(_mpAudio.paused) _mpAudio.play().catch(()=>{});
      else _mpAudio.pause();
    });
    $('ml-nowbar-playpause')?.addEventListener('click',()=>{
      if(!_mpAudio.src) return;
      if(_mpAudio.paused) _mpAudio.play().catch(()=>{});
      else _mpAudio.pause();
    });
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
    $('ml-nowbar-expand')?.addEventListener('click',()=>_mpSetExpanded(true));
    $('ml-miniplayer')?.addEventListener('click',e=>{
      if(e.target.closest('.pl-btn, .pl-progress-wrap, .pl-vol-wrap, #ml-mp-expand, .pl-vol')) return;
      _mpSetExpanded(true);
    });
    $('ml-mp-expand')?.addEventListener('click',()=>_mpSetExpanded(true));
    $('ml-player-view-close')?.addEventListener('click',()=>_mpSetExpanded(false));
    $('ml-player-view')?.addEventListener('click',e=>{ if(e.target.id==='ml-player-view') _mpSetExpanded(false); });
    $('ml-player-tab-song')?.addEventListener('click',()=>{_mpSideCollapsed=false;_mpSetSideMode('song');_mpSetExpanded(true);});
    $('ml-player-tab-queue')?.addEventListener('click',()=>{_mpSideCollapsed=false;_mpSetSideMode('queue');_mpSetExpanded(true);});
    $('ml-player-view-menu')?.addEventListener('click',()=>{
      _mpSideCollapsed=!_mpSideCollapsed;
      _mpSetExpanded(true);
    });
    const railBtns=document.querySelectorAll('#ml-player-rail .ml-player-rail-btn');
    if(railBtns[0]){
      railBtns[0].addEventListener('click',()=>{
        _mpSideCollapsed=false;
        _mpSetSideMode('song');
        _mpSetExpanded(true);
      });
    }
    if(railBtns[1]){
      railBtns[1].addEventListener('click',()=>{
        _mpSideCollapsed=false;
        _mpSetSideMode('queue');
        _mpSetExpanded(true);
      });
    }
    document.addEventListener('keydown',e=>{
      const t=e.target;
      const typing=t&&((t.tagName==='INPUT')||(t.tagName==='TEXTAREA')||t.isContentEditable);
      if(e.key==='Escape'&&_mpExpanded){
        _mpSetExpanded(false);
        return;
      }
      if(typing || !_mpAudio) return;
      if(e.code==='Space'){
        e.preventDefault();
        if(!_mpAudio.src) return;
        if(_mpAudio.paused) _mpAudio.play().catch(()=>{});
        else _mpAudio.pause();
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
        _mpSetSideMode('queue');
        _mpSetExpanded(true);
      }else if((e.key==='s'||e.key==='S') && _mpExpanded){
        _mpSideCollapsed=false;
        _mpSetSideMode('song');
        _mpSetExpanded(true);
      }
    });
    _mpSetSideMode(_mpSideMode);
    _mpRenderQueue();
    _mpSyncModeUI();
  }

  function _mpPlayIdx(idx,autoplay){
    _mpBind();
    if(!_mpSongs.length) return;
    if(idx<0) idx=_mpSongs.length-1;
    if(idx>=_mpSongs.length) idx=0;
    _mpIdx=idx;
    const s=_mpSongs[idx];
    if(!s) return;
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
    _mpAudio.src=resolveMediaUrl(s.mp3)||'';
    $('ml-mp-cur').textContent='0:00';
    $('ml-mp-dur').textContent='0:00';
    $('ml-mp-fill').style.width='0%';
    const xcur=$('ml-player-cur'); if(xcur) xcur.textContent='0:00';
    const xdur=$('ml-player-dur'); if(xdur) xdur.textContent='0:00';
    const xfill=$('ml-player-fill'); if(xfill) xfill.style.width='0%';
    const nfill=$('ml-nowbar-fill'); if(nfill) nfill.style.width='0%';
    _mpLrc=[]; _mpLrcIdx=-1; _mpRenderLrc();
    _mpRenderQueue();
    if(s.lrc){
      fetch(s.lrc).then(r=>r.text()).then(text=>{
        _mpLrc=_mpParseLrc(text); _mpRenderLrc();
      }).catch(()=>{});
    }
    if(autoplay) _mpAudio.play().catch(()=>{});
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
      if(_audioCtx){
        const o=_audioCtx.createOscillator(),g=_audioCtx.createGain();
        o.type='sine'; o.frequency.value=beat%4===0?1200:900;
        g.gain.value=0.0001;
        o.connect(g); g.connect(_audioCtx.destination);
        const now=_audioCtx.currentTime;
        g.gain.exponentialRampToValueAtTime(0.15, now+0.005);
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
    body.appendChild(range);body.appendChild(hint);
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
      overlay.style.opacity=String(Math.max(0,1-dx/(window.innerWidth*0.9)));
      e.preventDefault();
    },{passive:false});
    function end(){
      if(!started) return;
      started=false;
      if(!dragging){
        panel.style.transform=''; overlay.style.opacity=''; return;
      }
      if(dx>Math.min(140,window.innerWidth*0.28)){
        panel.style.transition='transform .22s ease, opacity .22s ease';
        panel.style.transform=`translateX(${window.innerWidth}px)`;
        overlay.style.opacity='0';
        setTimeout(()=>{
          panel.style.transition='';
          closeDetail();
        },220);
      }else{
        panel.style.transition='transform .22s ease, opacity .22s ease';
        panel.style.transform='';
        overlay.style.opacity='';
        setTimeout(()=>{panel.style.transition='';panel.classList.remove('swiping');},220);
      }
      dragging=false; dx=0;
    }
    panel.addEventListener('touchend',end,{passive:true});
    panel.addEventListener('touchcancel',end,{passive:true});

    window.addEventListener('popstate',()=>{
      if(panel.classList.contains('open')) closeDetail(true);
    });
  }

  function openDetail(s,opts={}){
    destroyAP();
    stopMetronome();
    syncHaloTheme();

    _mpBind();
    if(hasSongAudio(s)){
      const idx=_mpSongs.findIndex(x=>x.id===s.id);
      const isSameSong = (idx>=0 && idx===_mpIdx);
      if(!isSameSong){
        if(idx>=0) _mpIdx=idx; else { _mpSongs=[s]; _mpIdx=0; }
        _mpRenderQueue();
        _mpLrc=[]; _mpLrcIdx=-1;
        _mpAudio.src=resolveMediaUrl(s.mp3)||'';
        if(s.lrc) fetch(s.lrc).then(r=>r.text()).then(text=>{_mpLrc=_mpParseLrc(text);_mpRenderLrc();}).catch(()=>{});
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

    let curKey=s.origKey||'C';
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
    body.appendChild(wrap);

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
      renderKeyButtons();
      renderScore();
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

    const shareBtn=document.createElement('button');
    shareBtn.className='sw-pill';
    shareBtn.type='button';
    shareBtn.style.cssText='font-size:12px;padding:5px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;';
    shareBtn.textContent='🔗 分享';
    shareBtn.addEventListener('click',()=>shareSong(s));
    toolsRow.appendChild(shareBtn);

    const exportBtn=document.createElement('button');
    exportBtn.className='sw-pill';
    exportBtn.type='button';
    exportBtn.style.cssText='font-size:12px;padding:5px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;';
    exportBtn.textContent='🖼 下载图片';
    exportBtn.addEventListener('click',()=>{
      if(exportBtn.disabled) return;
      const old=exportBtn.textContent;
      exportBtn.disabled=true;
      exportBtn.style.opacity='.65';
      exportBtn.textContent='生成中...';
      exportTransposePanel(lbDiv,{
        title:s.title||'transpose',
        key:curKey,
        song:s,
        a4:true,
        bgColor:'#ffffff',
        tight:true,
        width:Math.max(560,Math.ceil(wrap.getBoundingClientRect().width||0)||900)
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
      lrc.style.cssText='font-size:12px;padding:5px 12px;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px;';
      lrc.textContent='📝 LRC';toolsRow.appendChild(lrc);
    }
    if(toolsRow.children.length){tools.appendChild(toolsRow);body.appendChild(tools);}

    body.appendChild(createMetronome(s.bpm || 72));

    let scoreKeyBadge=null;
    if(s.scoreImg){
      const scoreDiv=document.createElement('div');scoreDiv.className='sw-score';
      const scoreTop=document.createElement('div');scoreTop.className='sw-score-top';
      scoreKeyBadge=document.createElement('span');scoreKeyBadge.className='sw-score-key';scoreKeyBadge.textContent='1 = '+curKey;
      const lbl=document.createElement('span');lbl.className='sw-score-lbl';lbl.textContent='简谱原稿';
      scoreTop.appendChild(lbl);scoreTop.appendChild(scoreKeyBadge);
      const img=document.createElement('img');img.src=s.scoreImg;img.loading='lazy';img.alt='简谱';
      img.addEventListener('click',()=>openLightbox(s.scoreImg));
      scoreDiv.appendChild(scoreTop);scoreDiv.appendChild(img);
      body.appendChild(scoreDiv);
    }

    function renderScore(){
      const info=calcCapo(curKey,s.origKey||'C'),st=info.st,useFlat=preferFlat;
      kPill.textContent='1 = '+curKey;
      if(scoreKeyBadge)scoreKeyBadge.textContent='1 = '+curKey;
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
            const segEl=_div('prev-seg');
            const chord=document.createElement('div');
            chord.className='p-chord'+(seg.chord?'':' empty');
            setChordContent(chord,seg.chord?trChord(seg.chord,st,useFlat):'\u00a0');
            segEl.appendChild(chord);
            segEl.appendChild(renderNStr(seg.n||'',{inlineTimeSign:getSegInlineTimeSign(seg)}));
            const lyric=document.createElement('div');lyric.className='p-lyric'+((!Array.isArray(line)&&line.b)?' bold':'');setLyricContent(lyric,normLyricText(seg.lyric));
            segEl.appendChild(lyric);
            if(seg.lyric2){const ly2=document.createElement('div');ly2.className='p-lyric p-lyric2'+((!Array.isArray(line)&&line.b)?' bold':'');setLyricContent(ly2,normLyricText(seg.lyric2));segEl.appendChild(ly2);}
            if(seg.lyric3){const ly3=document.createElement('div');ly3.className='p-lyric p-lyric3'+((!Array.isArray(line)&&line.b)?' bold':'');setLyricContent(ly3,normLyricText(seg.lyric3));segEl.appendChild(ly3);}
            if(seg.lyric4){const ly4=document.createElement('div');ly4.className='p-lyric p-lyric4'+((!Array.isArray(line)&&line.b)?' bold':'');setLyricContent(ly4,normLyricText(seg.lyric4));segEl.appendChild(ly4);}
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
    renderScore();
    scheduleFitRows();
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
    detail.scrollTop=0;
  }

  attachSwipeBack();
  loadSongs();
})();
