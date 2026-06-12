(function(){
  window.CECP_LIBAPP = true;

  const Vue = window.Vue;
  if(!Vue || !Vue.createApp){
    const app = document.getElementById('app');
    if(app) app.innerHTML = '<main id="musiclib-vue-shell"><div id="music-library"><div id="ml-empty" style="display:block"><div id="ml-empty-msg">Vue 加载失败，请刷新重试</div></div></div></main>';
    return;
  }

  const { computed, createApp, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } = Vue;
  const ML_VER = 'vue-2026.06.12.1';
  const LOCAL_SONG_MANIFEST = './songs/manifest.json';
  const GITHUB_API = 'https://api.github.com/repos/CYE04/Cecp/contents/songs';
  const RAW_BASE = 'https://raw.githubusercontent.com/CYE04/Cecp/main/songs/';
  const HALO_BASE = 'https://cecp.it';
  const WECHAT = 'CYuen_290104';
  const SOURCE_RULES = [
    { name:'赞美之泉', patterns:['赞美之泉','stream of praise'] },
    { name:'约书亚乐团', patterns:['约书亚乐团','joshua band','约书亚'] },
    { name:'火把音乐', patterns:['火把音乐','torch music','torch worship'] },
    { name:'泥土音乐', patterns:['泥土音乐','soil music'] },
    { name:'小羊诗歌', patterns:['小羊诗歌','lamb music'] },
    { name:'生命河灵粮堂', patterns:['生命河','river of life'] },
    { name:'希尔颂', patterns:['hillsong'] },
    { name:'伯特利音乐', patterns:['bethel music','bethel'] },
    { name:'高地敬拜', patterns:['elevation worship','elevation'] },
    { name:'城市之光', patterns:['cityalight'] },
    { name:'激励者乐团', patterns:['planetshakers'] },
    { name:'其他', patterns:[] }
  ];
  const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const NOTES_FLAT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const ROOT_TO_INDEX = { C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11 };

  function resolveMediaUrl(url){
    if(!url) return '';
    if(/^https?:\/\//i.test(url)) return url;
    if(String(url).startsWith('/')) return HALO_BASE + url;
    return HALO_BASE + '/' + url;
  }
  function lower(value){ return String(value || '').trim().toLowerCase(); }
  function cleanText(value){ return String(value || '').replace(/\s+/g,' ').trim(); }
  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function escapeRegExp(value){ return String(value || '').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  function highlight(value, query){
    const text = escapeHtml(value || '');
    const q = cleanText(query);
    if(!q) return text;
    return text.replace(new RegExp('(' + escapeRegExp(q) + ')','gi'), '<mark class="ml-highlight">$1</mark>');
  }
  function detectSongSource(song){
    const artist = lower(song.artist);
    const direct = SOURCE_RULES.find(rule => rule.name !== '其他' && (lower(rule.name) === artist || rule.patterns.some(p => artist.includes(lower(p)))));
    if(direct) return direct.name;
    const haystack = [song.title, song.artist, song.sub, song.created].map(lower).join(' ');
    const matched = SOURCE_RULES.find(rule => rule.name !== '其他' && rule.patterns.some(p => haystack.includes(lower(p))));
    return matched ? matched.name : '其他';
  }
  function parseAlbumInfo(song){
    const sub = String(song.sub || '');
    const bracket = sub.match(/[【《](.*?)[】》]/);
    const year = sub.match(/(?:19|20)\d{2}/);
    return {
      album: cleanText(song.album || (bracket && bracket[1]) || song.source || '未标注专辑'),
      albumYear: year ? Number(year[0]) : 0
    };
  }
  function enrichSong(song){
    const source = detectSongSource(song);
    const albumInfo = parseAlbumInfo({ ...song, source });
    return {
      ...song,
      source,
      album: albumInfo.album,
      albumYear: albumInfo.albumYear,
      displayArtist: cleanText(song.artist || source || '未知来源'),
      cover: resolveMediaUrl(song.cover),
      mp3: resolveMediaUrl(song.mp3 || song.audio),
      lrc: resolveMediaUrl(song.lrc),
      scoreImg: resolveMediaUrl(song.scoreImg)
    };
  }
  function hasSongAudio(song){ return !!(song && song.mp3); }
  function hasLyricMatch(song, q){
    const haystack = (song.sections || [])
      .flatMap(sec => sec.lines || [])
      .flatMap(line => line || [])
      .map(seg => [seg.lyric, seg.lyric2, seg.lyric3, seg.lyric4].filter(Boolean).join(' '))
      .join(' ');
    return lower(haystack).includes(q);
  }
  function cardMeta(song){
    return [song.displayArtist, song.albumYear || '', song.origKey ? '原调 ' + song.origKey : ''].filter(Boolean).join(' · ') || '收录歌词、简谱与练习资料';
  }
  function lyricPreview(song){
    for(const sec of song.sections || []){
      for(const line of sec.lines || []){
        const text = (line || []).map(seg => seg.lyric || seg.lyric2 || '').join('');
        const clean = cleanText(text);
        if(clean && clean !== 'ㅤ') return clean;
      }
    }
    return song.sub || '愿今天的第一首歌，把心安静带到神面前。';
  }
  function daySeed(){
    const now = new Date();
    return Number(`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`);
  }
  function hashString(value){
    let h = 2166136261;
    for(const ch of String(value || '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }
  function parseKeyName(key){
    const m = String(key || '').trim().match(/^([A-G])([#b]?)(.*)$/);
    if(!m) return null;
    const root = m[1] + (m[2] || '');
    if(ROOT_TO_INDEX[root] == null) return null;
    return { idx: ROOT_TO_INDEX[root], suffix: m[3] || '' };
  }
  function stepKeyName(key, delta, useFlat){
    const parsed = parseKeyName(key);
    if(!parsed) return key || '';
    const notes = useFlat ? NOTES_FLAT : NOTES_SHARP;
    return notes[(parsed.idx + delta + 1200) % 12] + parsed.suffix;
  }
  function transposeChord(chord, delta, useFlat){
    return String(chord || '').replace(/[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|[0-9()+#b/-])*/g, token => {
      if(!token) return token;
      const parts = token.split('/');
      const main = stepKeyName(parts[0], delta, useFlat);
      return parts[1] ? main + '/' + stepKeyName(parts[1], delta, useFlat) : main;
    });
  }
  function parseLrc(text){
    return String(text || '').split(/\r?\n/).flatMap(line => {
      const tags = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
      const lyric = line.replace(/\[[^\]]+\]/g,'').trim();
      return tags.map(tag => ({
        time: Number(tag[1]) * 60 + Number(tag[2]) + Number('0.' + (tag[3] || 0)),
        text: lyric
      }));
    }).filter(item => item.text).sort((a,b) => a.time - b.time);
  }
  function formatTime(value){
    const t = Math.max(0, Number(value) || 0);
    return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  }
  function safeFileName(value){
    return String(value || 'song').replace(/[\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim().slice(0,80) || 'song';
  }

  createApp({
    setup(){
      const songs = ref([]);
      const loading = ref(true);
      const loadError = ref('');
      const query = ref('');
      const sourceFilter = ref('全部');
      const selected = ref(null);
      const selectedKey = ref('');
      const useFlat = ref(true);
      const toast = ref('');
      const lightbox = ref('');
      const audio = ref(null);
      const player = reactive({
        index:-1,
        playing:false,
        current:0,
        duration:0,
        expanded:false,
        sideMode:'song',
        sideCollapsed:false,
        repeat:false,
        shuffle:false,
        lrc:[],
        lyric:'歌词将在播放时显示',
        volume:1
      });
      const metronome = reactive({
        running:false,
        bpm:72,
        ctx:null,
        timer:null,
        next:0
      });

      const audioSongs = computed(() => songs.value.filter(hasSongAudio));
      const sources = computed(() => {
        const counts = songs.value.reduce((acc, song) => {
          const key = song.source || '其他';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        return [{ name:'全部', count:songs.value.length }].concat(
          Object.keys(counts)
            .sort((a,b) => counts[b] - counts[a] || a.localeCompare(b,'zh-Hans-CN'))
            .map(name => ({ name, count:counts[name] }))
        );
      });
      const filteredSongs = computed(() => {
        const q = lower(query.value);
        return songs.value.filter(song => {
          if(sourceFilter.value !== '全部' && (song.source || '其他') !== sourceFilter.value) return false;
          if(!q) return true;
          return [song.title, song.artist, song.source, song.album, song.sub].map(lower).some(v => v.includes(q)) || hasLyricMatch(song, q);
        });
      });
      const groupedSongs = computed(() => {
        const grouped = new Map();
        const byAlbum = sourceFilter.value !== '全部' && !query.value;
        filteredSongs.value.forEach(song => {
          const key = query.value ? '搜索结果' : byAlbum ? (song.album || '未标注专辑') : (song.source || '其他');
          if(!grouped.has(key)) grouped.set(key, []);
          grouped.get(key).push(song);
        });
        return Array.from(grouped.entries()).sort((a,b) => {
          if(query.value) return 0;
          if(sourceFilter.value === '全部') return b[1].length - a[1].length || a[0].localeCompare(b[0],'zh-Hans-CN');
          const ay = Math.max(...a[1].map(item => item.albumYear || 0), 0);
          const by = Math.max(...b[1].map(item => item.albumYear || 0), 0);
          if(ay !== by) return by - ay;
          return a[0].localeCompare(b[0],'zh-Hans-CN');
        }).map(([name, items]) => ({ name, items }));
      });
      const resultText = computed(() => {
        if(query.value) return `找到 ${filteredSongs.value.length} 首相关诗歌`;
        if(sourceFilter.value !== '全部') return `${sourceFilter.value} · ${filteredSongs.value.length} 首`;
        return `全部 ${songs.value.length} 首诗歌`;
      });
      const dailyPicks = computed(() => {
        const usable = songs.value.filter(song => song && song.id && song.title);
        return usable
          .slice()
          .sort((a,b) => (hashString(a.id) ^ daySeed()) - (hashString(b.id) ^ daySeed()))
          .slice(0,3);
      });
      const currentSong = computed(() => player.index >= 0 ? audioSongs.value[player.index] : null);
      const transposeDelta = computed(() => {
        if(!selected.value || !selectedKey.value) return 0;
        const orig = parseKeyName(selected.value.origKey);
        const cur = parseKeyName(selectedKey.value);
        if(!orig || !cur) return 0;
        return cur.idx - orig.idx;
      });
      const keyOptions = computed(() => {
        const notes = useFlat.value ? NOTES_FLAT : NOTES_SHARP;
        return notes.slice();
      });

      function showToast(message){
        toast.value = message;
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => { toast.value = ''; }, 1800);
      }
      async function loadLocalSongs(){
        const manifestRes = await fetch(LOCAL_SONG_MANIFEST + '?t=' + Date.now(), { cache:'no-store' });
        if(!manifestRes.ok) throw new Error('Local song manifest failed');
        const manifest = await manifestRes.json();
        const files = Array.isArray(manifest.files) ? manifest.files : [];
        if(!files.length) throw new Error('Local song manifest is empty');
        return Promise.all(files.map(file =>
          fetch('./songs/' + encodeURIComponent(file), { cache:'no-store' })
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        ));
      }
      async function loadRemoteSongs(){
        const res = await fetch(GITHUB_API + '?t=' + Date.now(), { cache:'no-store' });
        if(!res.ok) throw new Error('GitHub song list failed');
        const files = await res.json();
        const jsons = files.filter(file => file.name.endsWith('.json') && file.name !== 'test.json');
        return Promise.all(jsons.map(file =>
          fetch(RAW_BASE + file.name, { cache:'no-store' })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        ));
      }
      function applySongPayload(all){
        const next = all.filter(Boolean).map(enrichSong).sort((a,b) => String(a.title || '').localeCompare(String(b.title || ''),'zh-Hans-CN'));
        if(!next.length) throw new Error('No songs loaded');
        songs.value = next;
        const id = decodeURIComponent(location.hash.replace(/^#/,''));
        const match = songs.value.find(song => song.id === id);
        if(match && !selected.value) openSong(match, { fromUrl:true });
      }
      async function loadSongs(){
        loading.value = true;
        loadError.value = '';
        try{
          let loadedLocal = false;
          try{
            applySongPayload(await loadLocalSongs());
            loadedLocal = true;
          }catch(localErr){
            applySongPayload(await loadRemoteSongs());
          }
          if(loadedLocal){
            loadRemoteSongs()
              .then(remote => {
                const count = remote.filter(Boolean).length;
                if(count >= songs.value.length) applySongPayload(remote);
              })
              .catch(() => {});
          }
        }catch(err){
          loadError.value = '载入失败，请刷新重试';
        }finally{
          loading.value = false;
        }
      }
      function setSource(name){
        sourceFilter.value = name || '全部';
        query.value = '';
      }
      function focusSearch(){
        nextTick(() => document.getElementById('ml-search')?.focus());
      }
      function openSong(song, opts = {}){
        selected.value = song;
        selectedKey.value = song.origKey || 'C';
        metronome.bpm = Number(song.bpm || 72);
        if(!opts.fromUrl) history.pushState({ song:song.id }, '', '#' + encodeURIComponent(song.id));
        nextTick(() => document.getElementById('ml-detail-body')?.scrollTo?.(0,0));
      }
      function closeSong(fromPop = false){
        selected.value = null;
        stopMetronome();
        if(!fromPop && location.hash) history.pushState(null, '', location.pathname + location.search);
      }
      async function copyWechat(){
        try{
          await navigator.clipboard.writeText(WECHAT);
          showToast('微信号已复制');
        }catch(_){
          showToast('微信：' + WECHAT);
        }
      }
      async function shareSong(song){
        const url = new URL(location.href);
        url.hash = song.id;
        const data = { title:`${song.title} - CECP诗歌库`, text:song.title, url:url.href };
        try{
          if(navigator.share) await navigator.share(data);
          else{
            await navigator.clipboard.writeText(url.href);
            showToast('链接已复制');
          }
        }catch(_){}
      }
      function playSong(song, autoplay = true){
        if(!hasSongAudio(song)) return;
        const index = audioSongs.value.findIndex(item => item.id === song.id);
        if(index < 0) return;
        player.index = index;
        const el = audio.value;
        el.src = song.mp3;
        el.volume = player.volume;
        loadLrc(song);
        if(autoplay) el.play().catch(() => showToast('请点播放按钮开始音频'));
      }
      function playIndex(index, autoplay = true){
        if(!audioSongs.value.length) return;
        const next = (index + audioSongs.value.length) % audioSongs.value.length;
        playSong(audioSongs.value[next], autoplay);
      }
      function togglePlay(){
        const el = audio.value;
        if(!el.src){
          if(audioSongs.value[0]) playSong(audioSongs.value[0], true);
          return;
        }
        if(el.paused) el.play().catch(() => {});
        else el.pause();
      }
      function seekAudio(event){
        const el = audio.value;
        if(!el || !player.duration) return;
        const rect = event.currentTarget.getBoundingClientRect();
        el.currentTime = ((event.clientX - rect.left) / rect.width) * player.duration;
      }
      async function loadLrc(song){
        player.lrc = [];
        player.lyric = '歌词将在播放时显示';
        if(!song.lrc) return;
        try{
          const text = await fetch(song.lrc).then(res => res.text());
          player.lrc = parseLrc(text);
        }catch(_){}
      }
      function syncLyric(){
        let line = '歌词将在播放时显示';
        for(const item of player.lrc){
          if(item.time <= player.current) line = item.text;
          else break;
        }
        player.lyric = line;
      }
      function setVolume(value){
        player.volume = Number(value);
        if(audio.value) audio.value.volume = player.volume;
      }
      function openPlayer(){ player.expanded = true; }
      function closePlayer(){ player.expanded = false; }
      function setPlayerSide(mode){
        player.sideMode = mode;
        player.sideCollapsed = false;
      }
      function renderedSections(song){
        if(!song) return [];
        return (song.sections || []).map(sec => ({
          name: sec.name || song.title,
          lines: (sec.lines || []).map(line => (line || []).map(seg => ({
            chord: transposeChord(seg.chord || '', transposeDelta.value, useFlat.value),
            n: seg.n || '',
            lyric: [seg.lyric, seg.lyric2, seg.lyric3, seg.lyric4].filter(Boolean).join(' / ')
          })))
        }));
      }
      function scheduleBeat(){
        if(!metronome.running || !metronome.ctx) return;
        while(metronome.next < metronome.ctx.currentTime + 0.08){
          const osc = metronome.ctx.createOscillator();
          const gain = metronome.ctx.createGain();
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.001, metronome.next);
          gain.gain.exponentialRampToValueAtTime(0.24, metronome.next + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, metronome.next + 0.08);
          osc.connect(gain).connect(metronome.ctx.destination);
          osc.start(metronome.next);
          osc.stop(metronome.next + 0.09);
          metronome.next += 60 / Math.max(30, Math.min(240, Number(metronome.bpm) || 72));
        }
        metronome.timer = setTimeout(scheduleBeat, 25);
      }
      function startMetronome(){
        if(metronome.running) return;
        metronome.ctx = metronome.ctx || new (window.AudioContext || window.webkitAudioContext)();
        metronome.running = true;
        metronome.next = metronome.ctx.currentTime + 0.05;
        scheduleBeat();
      }
      function stopMetronome(){
        metronome.running = false;
        clearTimeout(metronome.timer);
      }
      function toggleMetronome(){
        metronome.running ? stopMetronome() : startMetronome();
      }
      async function exportScore(){
        const target = document.querySelector('.sw-score');
        if(!target) return;
        if(!window.html2canvas){
          showToast('正在载入导出工具');
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          }).catch(() => null);
        }
        if(!window.html2canvas){
          showToast('导出工具加载失败');
          return;
        }
        const canvas = await window.html2canvas(target, { backgroundColor:'#ffffff', scale:2, useCORS:true });
        canvas.toBlob(blob => {
          if(!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = safeFileName(selected.value?.title) + '.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        });
      }

      watch(sourceFilter, value => {
        if(value !== '全部' && !sources.value.some(item => item.name === value)) sourceFilter.value = '全部';
      });

      onMounted(() => {
        document.documentElement.classList.add('ml-fullscreen');
        document.body.classList.add('ml-fullscreen');
        document.head.insertAdjacentHTML('beforeend','<meta name="robots" content="noindex,nofollow"><meta name="googlebot" content="noindex,nofollow">');
        loadSongs();
        window.addEventListener('popstate', () => closeSong(true));
      });
      onBeforeUnmount(() => stopMetronome());

      return {
        ML_VER, WECHAT, audio, audioSongs, cardMeta, closePlayer, closeSong, copyWechat, currentSong,
        dailyPicks, exportScore, filteredSongs, focusSearch, formatTime, groupedSongs, hasSongAudio,
        highlight, lightbox, lyricPreview, loadError, loading, metronome, openPlayer, openSong, playIndex,
        player, playSong, query, renderedSections, resultText, seekAudio, selected, selectedKey, setPlayerSide,
        setSource, setVolume, shareSong, showToast, sourceFilter, sources, songs, stepKeyName, syncLyric,
        toast, toggleMetronome, togglePlay, transposeDelta, useFlat, keyOptions
      };
    },
    template: `
      <main id="musiclib-vue-shell">
        <div id="music-library" :data-ml-version="ML_VER">
          <div id="ml-header">
            <div id="ml-nav">
              <div id="ml-brand">
                <span class="ml-brand-dot"><img src="./olive-fellowship-logo.png" alt="橄榄树团契"></span>
                <span class="ml-brand-name">诗歌库</span>
              </div>
              <div id="ml-nav-actions">
                <button class="ml-nav-icon-btn" id="ml-nav-search" type="button" aria-label="聚焦搜索" @click="focusSearch">⌕</button>
              </div>
            </div>
            <div id="ml-hero">
              <h1 id="ml-title">诗歌库</h1>
              <div id="ml-subtitle">精选敬拜诗歌集合，含歌词、简谱、移调与音频练习。</div>
            </div>
            <section id="ml-worship-picks" class="ml-reveal" v-if="dailyPicks.length" aria-label="每日推荐">
              <div id="ml-wp-glow" aria-hidden="true"></div>
              <div id="ml-wp-bg" aria-hidden="true"></div>
              <div id="ml-wp-shell">
                <div id="ml-wp-hero">
                  <div class="ml-wp-eyebrow">今日推荐</div>
                  <div id="ml-wp-subtitle">今天推荐的三首诗歌</div>
                  <h2 id="ml-wp-title">{{ dailyPicks[0].title }}</h2>
                  <div id="ml-wp-artist">{{ dailyPicks[0].displayArtist }}</div>
                  <p id="ml-wp-lyric">{{ lyricPreview(dailyPicks[0]) }}</p>
                  <div id="ml-wp-tags">
                    <span class="ml-wp-tag" v-if="dailyPicks[0].origKey">{{ dailyPicks[0].origKey }}</span>
                    <span class="ml-wp-tag">{{ dailyPicks[0].source }}</span>
                  </div>
                  <div id="ml-wp-actions">
                    <button id="ml-wp-play" class="ml-wp-action is-primary" type="button" :disabled="!hasSongAudio(dailyPicks[0])" @click="playSong(dailyPicks[0])">
                      <span class="ml-wp-action-icon">▶</span><span>快速播放</span>
                    </button>
                    <button id="ml-wp-open" class="ml-wp-action" type="button" @click="openSong(dailyPicks[0])">
                      <span class="ml-wp-action-icon">↗</span><span>打开详情</span>
                    </button>
                  </div>
                </div>
                <div id="ml-wp-side">
                  <div id="ml-wp-greeting">
                    <span id="ml-wp-greeting-main">今日平安</span>
                    <strong id="ml-wp-greeting-sub">{{ new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) }} · 安静敬拜日</strong>
                  </div>
                  <div id="ml-wp-list">
                    <button class="ml-wp-card" type="button" v-for="song in dailyPicks" :key="song.id" @click="openSong(song)">
                      <span class="ml-wp-card-cover"><img v-if="song.cover" :src="song.cover" alt=""></span>
                      <span class="ml-wp-card-copy"><strong>{{ song.title }}</strong><small>{{ song.displayArtist }}</small></span>
                      <span class="ml-wp-card-tag">{{ song.origKey || song.source }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
            <div id="ml-search-row">
              <div id="ml-search-wrap">
                <span id="ml-search-icon">⌕</span>
                <input id="ml-search" v-model.trim="query" type="text" placeholder="搜索歌名、歌手或歌词..." autocomplete="off" autocorrect="off">
              </div>
              <div id="ml-count-wrap"><span class="ml-count-label">总数</span><strong id="ml-count">{{ songs.length }} 首</strong></div>
            </div>
            <div id="ml-source-bar">
              <button v-for="item in sources" :key="item.name" class="ml-source-chip" :class="{active:item.name===sourceFilter}" :data-source="item.name" type="button" @click="setSource(item.name)">
                <span class="ml-source-name">{{ item.name }}</span><strong>{{ item.count }}</strong>
              </button>
            </div>
          </div>

          <div id="ml-loading" v-if="loading"><div id="ml-spinner"></div>正在载入诗歌…</div>
          <div id="ml-loading" v-else-if="loadError"><div style="color:#ff3b30;font-size:14px">{{ loadError }}</div></div>
          <div id="ml-list-stage" v-show="!loading && !loadError && filteredSongs.length">
            <div id="ml-list-head">
              <div class="ml-section-label">全部诗歌</div>
              <div id="ml-result-count">{{ resultText }}</div>
            </div>
            <div id="ml-list" :class="{'is-grouped':!query}">
              <section class="ml-group" v-for="group in groupedSongs" :key="group.name">
                <div class="ml-group-head">
                  <div>
                    <div class="ml-group-kicker">{{ query ? '搜索' : sourceFilter === '全部' ? '歌手 / 团体' : '专辑' }}</div>
                    <div class="ml-group-title">{{ group.name }}</div>
                  </div>
                  <div class="ml-group-count">{{ group.items.length }} 首</div>
                </div>
                <div class="ml-group-grid">
                  <article class="ml-song-card ml-reveal" v-for="song in group.items" :key="song.id" :data-id="song.id" @click="openSong(song)">
                    <div class="ml-card-art">
                      <img v-if="song.cover" class="ml-cover" :src="song.cover" loading="lazy" alt="">
                      <div v-else class="ml-cover-placeholder">封面</div>
                    </div>
                    <div class="ml-card-body">
                      <div class="ml-song-overline" v-html="highlight(song.source, query)"></div>
                      <div class="ml-song-title" v-html="highlight(song.title, query)"></div>
                      <div class="ml-song-meta" v-html="highlight(cardMeta(song), query)"></div>
                      <div class="ml-song-tags">
                        <span class="ml-song-tag is-key" v-if="song.origKey">{{ song.origKey }}</span>
                        <span class="ml-song-tag" v-if="song.timeSign">{{ song.timeSign }}</span>
                        <span class="ml-song-tag" v-if="hasSongAudio(song)">音频</span>
                      </div>
                    </div>
                    <button class="ml-share-btn" type="button" title="分享" @click.stop="shareSong(song)">↗</button>
                    <button class="ml-mp-play-btn" type="button" title="播放" v-if="hasSongAudio(song)" @click.stop="playSong(song)">▶</button>
                  </article>
                </div>
              </section>
              <div id="ml-list-end"></div>
            </div>
          </div>

          <div id="ml-empty" v-show="!loading && !loadError && !filteredSongs.length">
            <div id="ml-empty-icon">♪</div>
            <div id="ml-empty-msg">找不到「<span id="ml-query-text">{{ query }}</span>」</div>
            <div id="ml-empty-sub">库里暂时还没有这首歌，你可以联系 YuEn 申请添加。</div>
            <button id="ml-contact" type="button" @click="copyWechat">复制微信号 YuEn</button>
          </div>

          <div id="ml-detail" :class="{open:!!selected}" v-if="selected">
            <div id="ml-detail-overlay"></div>
            <div id="ml-detail-swipe-hint"></div>
            <div id="ml-detail-header">
              <button id="ml-back" type="button" @click="closeSong()">‹ 返回</button>
              <div id="ml-detail-title">{{ selected.title }}</div>
            </div>
            <div id="ml-miniplayer" v-if="currentSong">
              <div id="ml-mp-stage">
                <div id="ml-mp-cover-wrap"><div id="ml-mp-cover"><img v-if="currentSong.cover" :src="currentSong.cover" alt=""><span v-else>♪</span></div></div>
                <div id="ml-mp-lrc-panel"><div id="ml-mp-lrc-inner">{{ player.lyric }}</div></div>
              </div>
              <div class="pl-song-row">
                <div class="pl-info"><div id="ml-mp-title" class="pl-title">{{ currentSong.title }}</div><div id="ml-mp-artist" class="pl-artist">{{ currentSong.displayArtist }}</div></div>
                <button class="pl-btn" id="ml-mp-expand" aria-label="展开播放器" @click="openPlayer">⤢</button>
              </div>
              <div class="pl-progress-wrap">
                <div class="pl-progress-bar" @click="seekAudio"><div class="pl-progress-fill" id="ml-mp-fill" :style="{width: player.duration ? (player.current/player.duration*100)+'%' : '0%'}"></div></div>
                <div class="pl-times"><span id="ml-mp-cur">{{ formatTime(player.current) }}</span><span id="ml-mp-dur">{{ formatTime(player.duration) }}</span></div>
              </div>
              <div class="pl-controls">
                <button class="pl-btn" id="ml-mp-prev" @click="playIndex(player.index-1)">‹</button>
                <button class="pl-btn pl-playpause" id="ml-mp-playpause" @click="togglePlay">{{ player.playing ? 'Ⅱ' : '▶' }}</button>
                <button class="pl-btn" id="ml-mp-next" @click="playIndex(player.index+1)">›</button>
                <button class="pl-btn pl-repeat" id="ml-mp-repeat" :class="{active:player.repeat}" @click="player.repeat=!player.repeat">↻</button>
              </div>
              <div class="pl-vol-wrap"><input class="pl-vol" id="ml-mp-vol" type="range" min="0" max="1" step="0.02" :value="player.volume" @input="setVolume($event.target.value)"></div>
            </div>
            <div id="ml-detail-body">
              <div class="sw-wrap">
                <div class="sw-panel-inner">
                  <div class="sw-head">
                    <img v-if="selected.cover" class="sw-cover-thumb" :src="selected.cover" alt="">
                    <div class="sw-info">
                      <div class="sw-kicker">{{ selected.source }}</div>
                      <h2>{{ selected.title }}</h2>
                      <p>{{ selected.sub || selected.displayArtist }}</p>
                      <div class="sw-pills">
                        <span class="sw-pill sw-kpill" v-if="selected.origKey">原调 {{ selected.origKey }}</span>
                        <span class="sw-pill" v-if="selected.timeSign">{{ selected.timeSign }}</span>
                        <span class="sw-pill" v-if="selected.bpm">{{ selected.bpm }} BPM</span>
                      </div>
                    </div>
                  </div>
                  <div class="sw-tools-row">
                    <button class="sw-pill" type="button" @click="shareSong(selected)">分享</button>
                    <button class="sw-pill" type="button" @click="exportScore">下载图片</button>
                    <button class="sw-pill" type="button" v-if="hasSongAudio(selected)" @click="playSong(selected)">播放</button>
                    <a class="sw-pill" v-if="selected.youtube" :href="selected.youtube" target="_blank" rel="noopener">YouTube</a>
                    <a class="sw-pill" v-if="selected.lrc" :href="selected.lrc" target="_blank" rel="noopener">LRC</a>
                  </div>
                </div>

                <div class="ml-met">
                  <div class="ml-met-head"><strong>节拍器</strong><button class="ml-met-toggle" type="button" @click="toggleMetronome">{{ metronome.running ? '停止' : '开始' }}</button></div>
                  <div class="ml-met-body">
                    <div class="ml-met-bpm">{{ metronome.bpm }}</div>
                    <input class="ml-met-range" type="range" min="40" max="220" step="1" v-model.number="metronome.bpm">
                  </div>
                </div>

                <div class="sw-panel-inner" v-if="selected.origKey">
                  <div class="sw-capo plain">
                    <div style="font-size:15px;flex-shrink:0">♬</div>
                    <div style="flex:1"><div class="sw-capo-t">当前调：{{ selectedKey }}</div><div class="sw-capo-s">原调 {{ selected.origKey }}，已移调 {{ transposeDelta }} 半音</div></div>
                    <div class="sw-capo-n">{{ useFlat ? '♭' : '#' }}</div>
                  </div>
                  <div class="sw-tools-row">
                    <button class="sw-kb" v-for="key in keyOptions" :key="key" type="button" :class="{on:key===selectedKey}" @click="selectedKey=key">{{ key }}</button>
                    <button class="sw-kb" type="button" @click="useFlat=!useFlat">{{ useFlat ? '♭' : '#' }}</button>
                  </div>
                </div>

                <div class="sw-score">
                  <div class="sw-score-head"><strong>简谱 / 歌词</strong><span class="sw-score-key">{{ selectedKey || selected.origKey }}</span></div>
                  <div class="sw-score-body">
                    <section class="sw-lsec" v-for="section in renderedSections(selected)" :key="section.name">
                      <div class="sw-lsec-name">{{ section.name }}</div>
                      <div class="prev-row" v-for="(line,lineIndex) in section.lines" :key="lineIndex">
                        <span class="jp-token" v-for="(seg,segIndex) in line" :key="segIndex">
                          <span class="jp-chord" v-if="seg.chord">{{ seg.chord }}</span>
                          <span class="jp-num">{{ seg.n }}</span>
                          <span class="jp-lyric">{{ seg.lyric }}</span>
                        </span>
                      </div>
                    </section>
                    <img v-if="selected.scoreImg" :src="selected.scoreImg" alt="谱图" @click="lightbox=selected.scoreImg">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="ml-player-view" :class="{open:player.expanded, 'side-collapsed':player.sideCollapsed}" @click.self="closePlayer">
            <div id="ml-player-view-top">
              <button id="ml-player-view-close" type="button" aria-label="收起播放器" @click="closePlayer">⌄</button>
              <div id="ml-player-view-now"><div id="ml-player-now-title">{{ currentSong?.title || '正在播放' }}</div><div id="ml-player-now-sub">{{ currentSong?.displayArtist }}</div></div>
              <button id="ml-player-view-menu" type="button" aria-label="播放设置" @click="player.sideCollapsed=!player.sideCollapsed">☰</button>
            </div>
            <div id="ml-player-view-grid">
              <aside id="ml-player-rail" aria-hidden="true">
                <button class="ml-player-rail-btn" :class="{active:player.sideMode==='song'}" type="button" @click="setPlayerSide('song')">♪</button>
                <button class="ml-player-rail-btn" :class="{active:player.sideMode==='queue'}" type="button" @click="setPlayerSide('queue')">≡</button>
              </aside>
              <section id="ml-player-lyrics">
                <div id="ml-player-lyrics-inner">
                  <div class="ml-player-lrc-line" v-for="(line,index) in player.lrc" :key="index" :class="{active:line.text===player.lyric}">{{ line.text }}</div>
                  <div class="ml-player-lrc-line active" v-if="!player.lrc.length">{{ player.lyric }}</div>
                </div>
              </section>
              <aside id="ml-player-side">
                <div id="ml-player-side-tabs">
                  <button class="ml-player-side-tab" :class="{active:player.sideMode==='song'}" id="ml-player-tab-song" type="button" @click="setPlayerSide('song')">歌曲</button>
                  <button class="ml-player-side-tab" :class="{active:player.sideMode==='queue'}" id="ml-player-tab-queue" type="button" @click="setPlayerSide('queue')">队列</button>
                </div>
                <div id="ml-player-side-song" v-show="player.sideMode==='song'">
                  <div id="ml-player-cover"><img v-if="currentSong?.cover" :src="currentSong.cover" alt=""><span v-else>♪</span></div>
                  <div id="ml-player-title">{{ currentSong?.title }}</div>
                  <div id="ml-player-artist">{{ currentSong?.displayArtist }}</div>
                </div>
                <div id="ml-player-side-queue" v-show="player.sideMode==='queue'">
                  <button class="ml-player-queue-item" v-for="(song,index) in audioSongs" :key="song.id" :class="{'is-active':index===player.index}" type="button" @click="playIndex(index)">
                    <span class="ml-player-queue-index">{{ index + 1 }}</span><span class="ml-player-queue-title">{{ song.title }}</span>
                  </button>
                </div>
              </aside>
            </div>
            <div id="ml-player-dock">
              <div id="ml-player-dock-song"><strong>{{ currentSong?.title }}</strong><span>{{ currentSong?.displayArtist }}</span></div>
              <div id="ml-player-dock-center">
                <div id="ml-player-controls">
                  <button class="ml-player-ctl" type="button" @click="playIndex(player.index-1)">‹</button>
                  <button class="ml-player-ctl is-main" id="ml-player-playpause" type="button" @click="togglePlay">{{ player.playing ? 'Ⅱ' : '▶' }}</button>
                  <button class="ml-player-ctl" type="button" @click="playIndex(player.index+1)">›</button>
                </div>
                <div id="ml-player-progress" @click="seekAudio"><div id="ml-player-progress-fill" :style="{width: player.duration ? (player.current/player.duration*100)+'%' : '0%'}"></div></div>
              </div>
              <div id="ml-player-dock-right"><input id="ml-player-dock-vol" type="range" min="0" max="1" step="0.02" :value="player.volume" @input="setVolume($event.target.value)"></div>
            </div>
          </div>

          <div id="ml-nowbar" :class="{'is-visible':!!currentSong,'is-playing':player.playing}" v-if="currentSong">
            <div id="ml-nowbar-bg" aria-hidden="true"></div>
            <div id="ml-nowbar-cover"><img v-if="currentSong.cover" :src="currentSong.cover" alt=""><span v-else>♪</span></div>
            <div id="ml-nowbar-main">
              <div id="ml-nowbar-title">{{ currentSong.title }}</div>
              <div id="ml-nowbar-artist">{{ currentSong.displayArtist }}</div>
              <div id="ml-nowbar-lyric">{{ player.lyric }}</div>
              <div id="ml-nowbar-progress" @click="seekAudio"><div id="ml-nowbar-fill" :style="{width: player.duration ? (player.current/player.duration*100)+'%' : '0%'}"></div></div>
            </div>
            <div id="ml-nowbar-controls">
              <button class="ml-nowbar-btn" id="ml-nowbar-prev" type="button" aria-label="上一首" @click="playIndex(player.index-1)">‹</button>
              <button class="ml-nowbar-btn is-main" id="ml-nowbar-playpause" type="button" aria-label="播放或暂停" @click="togglePlay">{{ player.playing ? 'Ⅱ' : '▶' }}</button>
              <button class="ml-nowbar-btn" id="ml-nowbar-next" type="button" aria-label="下一首" @click="playIndex(player.index+1)">›</button>
              <button class="ml-nowbar-btn" id="ml-nowbar-expand" type="button" aria-label="打开歌词" @click="openPlayer">☰</button>
            </div>
          </div>

          <div id="ml-lightbox" :class="{open:!!lightbox}" @click="lightbox=''">
            <button id="ml-lightbox-close" type="button">✕</button>
            <img id="ml-lightbox-img" :src="lightbox" alt="" @click.stop>
          </div>
          <div id="ml-toast" :class="{show:!!toast}">{{ toast }}</div>
          <audio ref="audio"
            @play="player.playing=true"
            @pause="player.playing=false"
            @loadedmetadata="player.duration=$event.target.duration||0"
            @timeupdate="player.current=$event.target.currentTime||0; syncLyric()"
            @ended="player.repeat ? playIndex(player.index,true) : playIndex(player.index+1,true)">
          </audio>
        </div>
      </main>
    `
  }).mount('#app');
})();
