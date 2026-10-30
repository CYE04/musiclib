(function (global) {
  'use strict';
  if (global.CecpMusiclibI18n) return;

  const STORAGE_KEY = 'cecp:musiclib:language';
  const languages = Object.freeze([
    Object.freeze({ code: 'zh', label: '中文', htmlLang: 'zh-CN' }),
    Object.freeze({ code: 'it', label: 'Italiano', htmlLang: 'it' }),
    Object.freeze({ code: 'en', label: 'English', htmlLang: 'en' }),
  ]);
  const dictionaries = Object.freeze({
    zh: Object.freeze({
      "nav.label": "手机和平板导航",
      "common.cancel": "取消",
      "common.save": "保存",
      "desktop.nowPlaying": "正在播放侧栏",
      "player.resumeRequired": "播放被中断，请点播放继续",
      "workspace.closeNowPlaying": "关闭正在播放侧栏",
      "workspace.collapseSidebar": "收起侧边栏",
      "workspace.expandSidebar": "展开侧边栏",
      "workspace.lyricsPreview": "歌词预览",
      "playlists.mine": "我的歌单",
      "playlists.create": "新建歌单",
      "playlists.name": "歌单名称",
      "playlists.rename": "重命名",
      "playlists.delete": "删除歌单",
      "playlists.confirmDelete": "确认删除",
      "playlists.deleteConfirm": "确定删除“{name}”？这不会删除歌库中的歌曲。",
      "playlists.localNote": "歌单保存在此设备的浏览器中，重新打开后仍可使用；不会自动同步到其他设备。",
      "playlists.addHint": "点击“添加歌曲”，或在歌曲旁选择“保存到歌单”。",
      "playlists.addSong": "添加歌曲",
      "playlists.addSongs": "添加歌曲",
      "playlists.added": "已添加",
      "playlists.all": "所有歌单",
      "playlists.createAndSave": "新建并添加",
      "playlists.created": "歌单已创建",
      "playlists.emptyDescription": "把练习、主日敬拜或喜欢的诗歌整理在一起。",
      "playlists.emptyTitle": "还没有自己的歌单",
      "playlists.error": "歌单暂时无法读取或保存，请稍后重试。",
      "playlists.first": "创建你的第一个歌单",
      "playlists.libraryTitle": "我的歌库",
      "playlists.moveDown": "下移",
      "playlists.moveUp": "上移",
      "playlists.noAudio": "这个歌单暂时没有可播放的音频，仍可查看歌谱。",
      "playlists.noListsForSave": "先为这首歌创建一个歌单。",
      "playlists.noSearchResults": "没有找到匹配的诗歌。",
      "playlists.notFound": "此歌单不存在。",
      "playlists.play": "播放歌单",
      "playlists.removeSong": "移除歌曲",
      "playlists.saveSong": "保存到歌单",
      "playlists.saved": "已保存到歌单",
      "playlists.searchCount": "找到 {count} 首；显示前 40 首",
      "playlists.searchSongs": "搜索歌库，添加诗歌",
      "playlists.songCount": "{count} 首诗歌",
      "playlists.unavailable": "歌曲暂不可用",
      "home.songUnit": "首诗歌",
      "home.favoriteUnit": "收藏",
      "home.serviceUnit": "本堂唱过",
      "home.viewAll": "查看全部",
      "home.morning": "早安",
      "home.afternoon": "下午好",
      "home.evening": "晚上好",
      "search.results": "找到 {count} 首相关诗歌",
      "search.recent": "最近搜索",
      "filter.all": "全部",
      "filter.favorites": "收藏",
      "filter.service": "本堂唱过",
      "filter.recent": "最近练过",
      "filter.artist": "作者 / 团队",

      'nav.yourLibrary': '我的歌库', 'nav.home': '首页', 'nav.library': '诗歌库', 'nav.more': '更多',
      'nav.playlist': '播放列表', 'nav.favorites': '收藏', 'nav.tools': '工具',
      'nav.projection': '投影模式', 'nav.search': '搜索', 'nav.theme': '主题', 'nav.language': '语言',
      'theme.system': '跟随系统', 'theme.light': '浅色', 'theme.dark': '深色',
      'theme.switch': '切换主题', 'theme.options': '跟随系统 / 浅色 / 深色',
      'language.zh': '中文', 'language.it': 'Italiano', 'language.en': 'English',
      'menu.title': '更多功能', 'menu.close': '关闭菜单',
      'header.library': '诗歌库', 'header.brand': 'CECP 诗歌库',
      'header.subtitle': '敬拜练习 · 歌谱 · 音频', 'header.practice': '敬拜练习',
      'header.searchPlaceholder': '搜索歌名、拼音、歌手、歌词、主题…',
      'header.clearSearch': '清空搜索', 'header.filter': '筛选诗歌', 'header.weather': '今日天气',
      'home.favorites': '收藏', 'home.recent': '继续练习', 'home.allSongs': '全部诗歌',
      'home.recommendations': '每日推荐', 'home.today': '今日推荐',
      'home.recommendedSongs': '今天推荐的三首诗歌', 'home.quickPlay': '快速播放',
      'home.viewScore': '查看歌谱', 'home.albums': '专辑', 'home.allAlbums': '全部专辑',
      'home.artists': '作者 / 团队', 'home.allArtists': '全部作者', 'home.serviceUsed': '本堂唱过',
      'home.songCount': '{count} 首诗歌',
      'queue.title': '播放列表', 'queue.empty': '当前还没有可播放队列', 'queue.clear': '清空播放列表',
      'queue.shuffleAll': '随机播放全部', 'queue.shufflePlaylist': '随机播放列表',
      'queue.nowPlaying': '正在播放', 'queue.next': '接下来播放', 'queue.played': '已播过',
      'queue.songCount': '{count} 首',
      'common.close': '关闭', 'common.back': '返回', 'common.search': '搜索',
      'common.reset': '重置', 'common.done': '完成', 'common.all': '全部',
      'common.clearAll': '全部清除', 'common.loading': '正在载入…',
      'player.play': '播放', 'player.pause': '暂停', 'player.playPause': '播放或暂停',
      'player.next': '下一首', 'player.previous': '上一首', 'player.queue': '播放队列',
      'player.lyrics': '歌词', 'player.noLyrics': '还没有歌词',
      'player.shuffle': '随机播放', 'player.repeat': '单曲循环', 'player.nowPlaying': '正在播放',
      'tools.title': '工具箱', 'tools.open': '打开工具箱',
    }),
    it: Object.freeze({
      "nav.label": "Navigazione mobile e tablet",
      "common.cancel": "Annulla",
      "common.save": "Salva",
      "desktop.nowPlaying": "Pannello in riproduzione",
      "player.resumeRequired": "Riproduzione interrotta. Premi Play per continuare.",
      "workspace.closeNowPlaying": "Chiudi il pannello di riproduzione",
      "workspace.collapseSidebar": "Comprimi barra laterale",
      "workspace.expandSidebar": "Espandi barra laterale",
      "workspace.lyricsPreview": "Anteprima testo",
      "playlists.mine": "Le mie playlist",
      "playlists.create": "Crea playlist",
      "playlists.name": "Nome della playlist",
      "playlists.rename": "Rinomina",
      "playlists.delete": "Elimina playlist",
      "playlists.confirmDelete": "Conferma eliminazione",
      "playlists.deleteConfirm": "Eliminare “{name}”? I canti nella libreria rimarranno disponibili.",
      "playlists.localNote": "Le playlist vengono salvate nel browser di questo dispositivo. Restano disponibili alla riapertura e non si sincronizzano automaticamente con altri dispositivi.",
      "playlists.addHint": "Premi “Aggiungi canti” oppure salva un canto in una playlist.",
      "playlists.addSong": "Aggiungi canto",
      "playlists.addSongs": "Aggiungi canti",
      "playlists.added": "Aggiunto",
      "playlists.all": "Tutte le playlist",
      "playlists.createAndSave": "Crea e aggiungi",
      "playlists.created": "Playlist creata",
      "playlists.emptyDescription": "Raccogli i canti per le prove, la lode della domenica o i tuoi preferiti.",
      "playlists.emptyTitle": "Non hai ancora una playlist",
      "playlists.error": "Impossibile leggere o salvare la playlist. Riprova.",
      "playlists.first": "Crea la tua prima playlist",
      "playlists.libraryTitle": "La tua libreria",
      "playlists.moveDown": "Sposta giù",
      "playlists.moveUp": "Sposta su",
      "playlists.noAudio": "Questa playlist non contiene audio riproducibile. Puoi comunque aprire gli spartiti.",
      "playlists.noListsForSave": "Crea una playlist per questo canto.",
      "playlists.noSearchResults": "Nessun canto corrispondente.",
      "playlists.notFound": "Questa playlist non esiste.",
      "playlists.play": "Riproduci playlist",
      "playlists.removeSong": "Rimuovi canto",
      "playlists.saveSong": "Salva nella playlist",
      "playlists.saved": "Salvato nella playlist",
      "playlists.searchCount": "{count} canti trovati; primi 40 visualizzati",
      "playlists.searchSongs": "Cerca nella libreria e aggiungi canti",
      "playlists.songCount": "{count} canti",
      "playlists.unavailable": "Canto non disponibile",
      "home.songUnit": "canti",
      "home.favoriteUnit": "preferiti",
      "home.serviceUnit": "cantati in chiesa",
      "home.viewAll": "Mostra tutto",
      "home.morning": "Buongiorno",
      "home.afternoon": "Buon pomeriggio",
      "home.evening": "Buonasera",
      "search.results": "{count} canti trovati",
      "search.recent": "Ricerche recenti",
      "filter.all": "Tutti",
      "filter.favorites": "Preferiti",
      "filter.service": "Cantati in chiesa",
      "filter.recent": "Provati di recente",
      "filter.artist": "Autori / Gruppi",

      'nav.yourLibrary': 'La tua libreria', 'nav.home': 'Home', 'nav.library': 'Canti', 'nav.more': 'Altro',
      'nav.playlist': 'Playlist', 'nav.favorites': 'Preferiti', 'nav.tools': 'Strumenti',
      'nav.projection': 'Proiezione', 'nav.search': 'Cerca', 'nav.theme': 'Tema', 'nav.language': 'Lingua',
      'theme.system': 'Sistema', 'theme.light': 'Chiaro', 'theme.dark': 'Scuro',
      'theme.switch': 'Cambia tema', 'theme.options': 'Sistema / Chiaro / Scuro',
      'language.zh': '中文', 'language.it': 'Italiano', 'language.en': 'English',
      'menu.title': 'Altre funzioni', 'menu.close': 'Chiudi menu',
      'header.library': 'Canti', 'header.brand': 'CECP · Canti',
      'header.subtitle': 'Prove di lode · Spartiti · Audio', 'header.practice': 'Prove di lode',
      'header.searchPlaceholder': 'Cerca titolo, pinyin, artista, testo o tema…',
      'header.clearSearch': 'Cancella ricerca', 'header.filter': 'Filtra canti', 'header.weather': 'Meteo di oggi',
      'home.favorites': 'Preferiti', 'home.recent': 'Riprendi le prove', 'home.allSongs': 'Tutti i canti',
      'home.recommendations': 'Consigli del giorno', 'home.today': 'Consigli di oggi',
      'home.recommendedSongs': 'Tre canti per oggi', 'home.quickPlay': 'Ascolta',
      'home.viewScore': 'Apri spartito', 'home.albums': 'Album', 'home.allAlbums': 'Tutti gli album',
      'home.artists': 'Autori / Gruppi', 'home.allArtists': 'Tutti gli autori', 'home.serviceUsed': 'Cantati in chiesa',
      'home.songCount': 'Canti: {count}',
      'queue.title': 'Playlist', 'queue.empty': 'La coda di riproduzione è vuota', 'queue.clear': 'Svuota playlist',
      'queue.shuffleAll': 'Tutti in ordine casuale', 'queue.shufflePlaylist': 'Playlist in ordine casuale',
      'queue.nowPlaying': 'In riproduzione', 'queue.next': 'Prossimi', 'queue.played': 'Già ascoltati',
      'queue.songCount': 'Canti: {count}',
      'common.close': 'Chiudi', 'common.back': 'Indietro', 'common.search': 'Cerca',
      'common.reset': 'Ripristina', 'common.done': 'Fine', 'common.all': 'Tutti',
      'common.clearAll': 'Cancella tutto', 'common.loading': 'Caricamento…',
      'player.play': 'Riproduci', 'player.pause': 'Pausa', 'player.playPause': 'Riproduci o metti in pausa',
      'player.next': 'Successivo', 'player.previous': 'Precedente', 'player.queue': 'Coda di riproduzione',
      'player.lyrics': 'Testo', 'player.noLyrics': 'Testo non ancora disponibile',
      'player.shuffle': 'Riproduzione casuale', 'player.repeat': 'Ripeti brano', 'player.nowPlaying': 'In riproduzione',
      'tools.title': 'Strumenti', 'tools.open': 'Apri strumenti',
    }),
    en: Object.freeze({
      "nav.label": "Mobile and tablet navigation",
      "common.cancel": "Cancel",
      "common.save": "Save",
      "desktop.nowPlaying": "Now playing sidebar",
      "player.resumeRequired": "Playback was interrupted. Press Play to continue.",
      "workspace.closeNowPlaying": "Close now playing sidebar",
      "workspace.collapseSidebar": "Collapse sidebar",
      "workspace.expandSidebar": "Expand sidebar",
      "workspace.lyricsPreview": "Lyrics preview",
      "playlists.mine": "My playlists",
      "playlists.create": "Create playlist",
      "playlists.name": "Playlist name",
      "playlists.rename": "Rename",
      "playlists.delete": "Delete playlist",
      "playlists.confirmDelete": "Confirm deletion",
      "playlists.deleteConfirm": "Delete “{name}”? Songs in the library will remain available.",
      "playlists.localNote": "Playlists are saved in this device’s browser and remain available when you reopen it. They do not automatically sync to other devices.",
      "playlists.addHint": "Choose “Add songs”, or use “Save to playlist” beside a song.",
      "playlists.addSong": "Add song",
      "playlists.addSongs": "Add songs",
      "playlists.added": "Added",
      "playlists.all": "All playlists",
      "playlists.createAndSave": "Create and add",
      "playlists.created": "Playlist created",
      "playlists.emptyDescription": "Organize songs for practice, Sunday worship, or your favorites.",
      "playlists.emptyTitle": "No playlists yet",
      "playlists.error": "Unable to read or save the playlist. Please try again.",
      "playlists.first": "Create your first playlist",
      "playlists.libraryTitle": "Your Library",
      "playlists.moveDown": "Move down",
      "playlists.moveUp": "Move up",
      "playlists.noAudio": "This playlist has no playable audio yet. You can still view the scores.",
      "playlists.noListsForSave": "Create a playlist for this song first.",
      "playlists.noSearchResults": "No matching songs found.",
      "playlists.notFound": "This playlist does not exist.",
      "playlists.play": "Play playlist",
      "playlists.removeSong": "Remove song",
      "playlists.saveSong": "Save to playlist",
      "playlists.saved": "Saved to playlist",
      "playlists.searchCount": "{count} songs found; showing the first 40",
      "playlists.searchSongs": "Search the library to add songs",
      "playlists.songCount": "{count} songs",
      "playlists.unavailable": "Song unavailable",
      "home.songUnit": "songs",
      "home.favoriteUnit": "favorites",
      "home.serviceUnit": "sung in church",
      "home.viewAll": "View all",
      "home.morning": "Good morning",
      "home.afternoon": "Good afternoon",
      "home.evening": "Good evening",
      "search.results": "{count} matching songs",
      "search.recent": "Recent searches",
      "filter.all": "All",
      "filter.favorites": "Favorites",
      "filter.service": "Sung in church",
      "filter.recent": "Recently practiced",
      "filter.artist": "Artists / Groups",

      'nav.yourLibrary': 'Your Library', 'nav.home': 'Home', 'nav.library': 'Library', 'nav.more': 'More',
      'nav.playlist': 'Playlist', 'nav.favorites': 'Favorites', 'nav.tools': 'Tools',
      'nav.projection': 'Projection', 'nav.search': 'Search', 'nav.theme': 'Theme', 'nav.language': 'Language',
      'theme.system': 'System', 'theme.light': 'Light', 'theme.dark': 'Dark',
      'theme.switch': 'Change theme', 'theme.options': 'System / Light / Dark',
      'language.zh': '中文', 'language.it': 'Italiano', 'language.en': 'English',
      'menu.title': 'More features', 'menu.close': 'Close menu',
      'header.library': 'Music Library', 'header.brand': 'CECP Music Library',
      'header.subtitle': 'Worship practice · Scores · Audio', 'header.practice': 'Worship practice',
      'header.searchPlaceholder': 'Search title, pinyin, artist, lyrics or theme…',
      'header.clearSearch': 'Clear search', 'header.filter': 'Filter songs', 'header.weather': "Today's weather",
      'home.favorites': 'Favorites', 'home.recent': 'Continue practicing', 'home.allSongs': 'All songs',
      'home.recommendations': 'Daily picks', 'home.today': "Today's picks",
      'home.recommendedSongs': 'Three songs for today', 'home.quickPlay': 'Play',
      'home.viewScore': 'View score', 'home.albums': 'Albums', 'home.allAlbums': 'All albums',
      'home.artists': 'Artists / Groups', 'home.allArtists': 'All artists', 'home.serviceUsed': 'Sung in church',
      'home.songCount': 'Songs: {count}',
      'queue.title': 'Playlist', 'queue.empty': 'Your playback queue is empty', 'queue.clear': 'Clear playlist',
      'queue.shuffleAll': 'Shuffle all', 'queue.shufflePlaylist': 'Shuffle playlist',
      'queue.nowPlaying': 'Now playing', 'queue.next': 'Up next', 'queue.played': 'Previously played',
      'queue.songCount': 'Songs: {count}',
      'common.close': 'Close', 'common.back': 'Back', 'common.search': 'Search',
      'common.reset': 'Reset', 'common.done': 'Done', 'common.all': 'All',
      'common.clearAll': 'Clear all', 'common.loading': 'Loading…',
      'player.play': 'Play', 'player.pause': 'Pause', 'player.playPause': 'Play or pause',
      'player.next': 'Next song', 'player.previous': 'Previous song', 'player.queue': 'Playback queue',
      'player.lyrics': 'Lyrics', 'player.noLyrics': 'Lyrics are not available yet',
      'player.shuffle': 'Shuffle', 'player.repeat': 'Repeat song', 'player.nowPlaying': 'Now playing',
      'tools.title': 'Toolbox', 'tools.open': 'Open toolbox',
    }),
  });
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  let language = 'zh';
  try {
    const saved = global.localStorage.getItem(STORAGE_KEY);
    if (owns(dictionaries, saved)) language = saved;
  } catch (_) { /* The selected language also works without persistent storage. */ }

  function t(key, vars) {
    const name = String(key);
    const dictionary = dictionaries[language];
    const value = owns(dictionary, name) ? dictionary[name] :
      (owns(dictionaries.zh, name) ? dictionaries.zh[name] : name);
    return value.replace(/\{(\w+)\}/g, (token, field) =>
      vars && owns(vars, field) ? String(vars[field]) : token);
  }

  function syncDocumentLanguage() {
    if (global.document && global.document.documentElement) {
      global.document.documentElement.lang = languages.find(item => item.code === language).htmlLang;
    }
  }

  function apply(root) {
    const scope = root || global.document;
    if (!scope) return scope;
    const bindings = [
      ['data-i18n', null],
      ['data-i18n-placeholder', 'placeholder'],
      ['data-i18n-label', 'aria-label'],
      ['data-i18n-title', 'title'],
    ];
    const selector = bindings.map(([attribute]) => '[' + attribute + ']').join(',');
    const nodes = [];
    if (scope.hasAttribute && bindings.some(([attribute]) => scope.hasAttribute(attribute))) nodes.push(scope);
    if (scope.querySelectorAll) nodes.push(...scope.querySelectorAll(selector));
    for (const node of nodes) {
      for (const [attribute, target] of bindings) {
        if (!node.hasAttribute(attribute)) continue;
        const key = node.getAttribute(attribute);
        if (!key) continue;
        const text = t(key);
        if (target) node.setAttribute(target, text);
        else node.textContent = text;
      }
    }
    return scope;
  }

  function setLanguage(next) {
    if (!owns(dictionaries, next)) return language;
    const changed = language !== next;
    language = next;
    try { global.localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
    syncDocumentLanguage();
    apply(global.document);
    if (changed) {
      global.dispatchEvent(new global.CustomEvent('cecp:languagechange', { detail: { language } }));
    }
    return language;
  }

  global.CecpMusiclibI18n = Object.freeze({
    t, getLanguage: () => language, setLanguage, apply,
    languages, dictionaries, storageKey: STORAGE_KEY,
  });
  syncDocumentLanguage();
})(window);
