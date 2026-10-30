(function (global) {
  'use strict';
  if (global.CECPMusicWorkspace) return;

  function create(options) {
    const root = options.root;
    const icon = (name, size = 20) => options.icon(name, size);
    const T = (key, fallback, vars) => options.t ? options.t(key, fallback, vars) : fallback.replace(/\{(\w+)\}/g, (token, key) => vars && key in vars ? String(vars[key]) : token);
    const sc = (selector, scope = root) => scope.querySelector(selector);
    const store = global.CECPPlaylists.createStore();
    let selectedId = null, modalMode = '', returnFocus = null, modalSong = null, modalPlaylistId = null;
    let readError = '', modalQuery = '', sidebarCollapsed = false, rightPanelHidden = false, nowSignature = '';
    const songs = () => options.getSongs() || [];
    const catalog = () => new Map(songs().map(song => [song.id, song]));
    const canPlay = song => !!(song && typeof song.mp3 === 'string' && song.mp3.trim());
    function el(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function button(text, action, { className = '', glyph, label, disabled = false } = {}) {
      const node = el('button', className); node.type = 'button';
      if (glyph) { const graphic = el('span', 'ml-personal-icon'); graphic.innerHTML = icon(glyph); node.appendChild(graphic); }
      if (text) node.appendChild(el('span', '', text));
      if (label) node.setAttribute('aria-label', label);
      node.disabled = disabled;
      if (action) node.addEventListener('click', action);
      return node;
    }
    function toast(message) { options.onToast?.(message); }
    function report(error, inline) {
      const message = error?.message || T('playlists.error', '歌单暂时无法读取或保存，请稍后重试。');
      if (inline) { inline.textContent = message; inline.hidden = false; }
      else toast(message);
      return null;
    }
    function operation(fn, inline) { try { return fn(); } catch (error) { return report(error, inline); } }
    function list() {
      try { const records = store.list(); readError = ''; return records; }
      catch (error) { readError = error.message; return []; }
    }
    function art(song, className = 'ml-personal-cover') {
      const holder = el('span', className);
      if (song?.cover) {
        const img = document.createElement('img'); img.src = song.cover; img.alt = ''; img.loading = 'lazy';
        img.addEventListener('error', () => { img.remove(); holder.innerHTML = icon('queue', 24); }, { once: true });
        holder.appendChild(img);
      } else holder.innerHTML = icon('queue', 24);
      return holder;
    }
    function playlistArt(playlist) {
      const found = catalog();
      const covers = playlist.songIds.map(id => found.get(id)).filter(song => song?.cover).slice(0, 4);
      const holder = el('span', 'ml-personal-playlist-art');
      if (covers.length) {
        holder.classList.toggle('has-grid', covers.length >= 4);
        (covers.length >= 4 ? covers : covers.slice(0, 1)).forEach(song => holder.appendChild(art(song)));
      } else holder.innerHTML = icon('queue', 26);
      return holder;
    }
    function findPlaylist(id) { return list().find(item => item.id === id) || null; }
    function localNote() { return el('p', 'ml-personal-local-note', T('playlists.localNote', '歌单保存在此设备的浏览器中，重新打开后仍可使用；不会自动同步到其他设备。')); }
    function playPlaylist(playlist, startId) {
      const found = catalog();
      let ids = playlist.songIds.filter(id => canPlay(found.get(id)));
      if (startId && ids.includes(startId)) { const at = ids.indexOf(startId); ids = ids.slice(at).concat(ids.slice(0, at)); }
      if (!ids.length) { toast(T('playlists.noAudio', '这个歌单暂时没有可播放的音频，仍可查看歌谱。')); return; }
      options.onPlayQueue(ids);
    }

    // Existing sidebar is the navigation owner; append only the new personal section.
    const sidebar = sc('#ml-sidebar');
    if (sidebar) {
      const nav = sc('#ml-side-nav');
      const navButton = button(T('playlists.mine', '我的歌单'), () => open(), { className: 'ml-side-link', glyph: 'listMusic' });
      navButton.id = 'ml-side-personal'; navButton.dataset.workspaceNav = 'personal'; nav?.appendChild(navButton);
      const toggle = button('', () => setSidebarCollapsed(!sidebarCollapsed), { glyph: 'collapse', label: T('workspace.collapseSidebar', '收起侧边栏') });
      toggle.id = 'ml-sidebar-toggle';
      sc('#ml-sidebar-brand')?.appendChild(toggle);
      const section = el('section', 'ml-personal-sidebar'); section.id = 'ml-personal-sidebar';
      const heading = el('div', 'ml-personal-sidebar-head');
      heading.append(el('h2', '', T('playlists.mine', '我的歌单')), button('', () => openCreate(), { glyph: 'plus', label: T('playlists.create', '新建歌单') }));
      const contents = el('div', 'ml-personal-sidebar-list'); contents.id = 'ml-personal-sidebar-list';
      section.append(heading, contents);
      sidebar.insertBefore(section, sc('#ml-side-profile'));
    }
    const dockLinks = sc('#ml-dock-links');
    if (dockLinks) {
      const entry = button(T('playlists.mine', '我的歌单'), () => { options.onCloseDock?.(); open(); }, { className: 'ml-dock-action', glyph: 'listMusic' });
      entry.id = 'ml-dock-personal'; dockLinks.insertBefore(entry, dockLinks.firstChild);
    }
    const page = el('section', 'ml-personal-page'); page.id = 'ml-user-playlists'; page.hidden = true;
    page.setAttribute('aria-label', T('playlists.mine', '我的歌单'));
    root.appendChild(page);

    const overlay = el('div', 'ml-personal-editor'); overlay.id = 'ml-personal-editor'; overlay.hidden = true;
    const backdrop = button('', () => closeDialog(), { className: 'ml-personal-backdrop', label: T('common.close', '关闭') });
    backdrop.tabIndex = -1;
    const dialog = el('section', 'ml-personal-dialog'); dialog.id = 'ml-personal-dialog'; dialog.tabIndex = -1;
    dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', 'ml-personal-editor-title');
    overlay.append(backdrop, dialog); root.appendChild(overlay);

    const now = el('aside', 'ml-desktop-now'); now.id = 'ml-desktop-now'; now.hidden = true;
    now.setAttribute('aria-label', T('player.nowPlaying', '正在播放')); root.appendChild(now);
    function setSidebarCollapsed(collapsed) {
      sidebarCollapsed = !!collapsed; root.classList.toggle('ml-sidebar-collapsed', sidebarCollapsed);
      try { global.localStorage.setItem('cecp:musiclib:sidebar-collapsed', String(sidebarCollapsed)); } catch (_) {}
      const node = sc('#ml-sidebar-toggle');
      if (node) { node.setAttribute('aria-expanded', String(!sidebarCollapsed)); node.setAttribute('aria-label', T(sidebarCollapsed ? 'workspace.expandSidebar' : 'workspace.collapseSidebar', sidebarCollapsed ? '展开侧边栏' : '收起侧边栏')); }
    }
    try { sidebarCollapsed = global.localStorage.getItem('cecp:musiclib:sidebar-collapsed') === 'true'; } catch (_) {}
    setSidebarCollapsed(sidebarCollapsed);

    function renderSidebar(records) {
      const container = sc('#ml-personal-sidebar-list'); if (!container) return;
      container.replaceChildren();
      if (readError) { container.appendChild(el('p', 'ml-personal-error', readError)); return; }
      if (!records.length) { container.appendChild(el('p', 'ml-personal-sidebar-empty', T('playlists.emptyTitle', '还没有自己的歌单'))); return; }
      records.forEach(record => {
        const item = button('', () => open(record.id), { className: 'ml-personal-sidebar-item', label: record.name });
        item.dataset.playlistId = record.id;
        item.classList.toggle('active', !page.hidden && selectedId === record.id);
        item.append(playlistArt(record), el('span', 'ml-personal-sidebar-name', record.name));
        item.title = record.name; container.appendChild(item);
      });
    }
    function renderPage(records) {
      page.replaceChildren();
      const selected = records.find(record => record.id === selectedId);
      if (selectedId && !selected) selectedId = null;
      const header = el('header', 'ml-personal-page-head');
      const copy = el('div', 'ml-personal-page-copy');
      if (selected) copy.appendChild(button(T('playlists.all', '所有歌单'), () => open(), { className: 'ml-personal-back', glyph: 'chevronLeft' }));
      copy.appendChild(el('p', 'ml-personal-eyebrow', T('playlists.mine', '我的歌单')));
      copy.appendChild(el('h1', '', selected ? selected.name : T('playlists.libraryTitle', '为每一次敬拜，留一份歌单')));
      header.append(copy, button(T('playlists.create', '新建歌单'), () => openCreate(), { className: 'ml-personal-primary', glyph: 'plus', disabled: !!readError }));
      page.append(header, localNote());
      if (!selected) {
        const libraryNav = el('nav', 'ml-personal-library-nav');
        libraryNav.setAttribute('aria-label', T('nav.yourLibrary', '我的歌库'));
        libraryNav.append(
          button(T('nav.library', '诗歌库'), () => options.onNavigate?.('library'), { glyph: 'library' }),
          button(T('nav.favorites', '收藏'), () => options.onNavigate?.('favorites'), { glyph: 'heart' })
        );
        page.appendChild(libraryNav);
      }
      if (readError) { const message = el('p', 'ml-personal-error', readError); message.setAttribute('role', 'alert'); page.appendChild(message); return; }
      if (!selected) {
        const grid = el('div', 'ml-personal-grid');
        if (!records.length) {
          const empty = el('div', 'ml-personal-empty');
          empty.append(el('h2', '', T('playlists.emptyTitle', '还没有自己的歌单')), el('p', '', T('playlists.emptyDescription', '把练习、主日敬拜或喜欢的诗歌整理在一起。')));
          page.appendChild(empty);
        } else records.forEach(record => {
          const card = button('', () => open(record.id), { className: 'ml-personal-card' });
          card.dataset.playlistId = record.id;
          card.append(playlistArt(record), el('strong', '', record.name), el('small', '', T('playlists.songCount', '{count} 首诗歌', { count: record.songIds.length })));
          grid.appendChild(card);
        });
        page.appendChild(grid); return;
      }
      const toolbar = el('div', 'ml-personal-toolbar');
      toolbar.append(
        button(T('playlists.play', '播放歌单'), () => playPlaylist(selected), { className: 'ml-personal-primary', glyph: 'play', disabled: !selected.songIds.some(id => canPlay(catalog().get(id))) }),
        button(T('playlists.addSongs', '添加歌曲'), () => showDialog('add', { playlistId: selected.id }), { glyph: 'plus' }),
        button(T('playlists.rename', '重命名'), () => showDialog('rename', { playlistId: selected.id })),
        button(T('playlists.delete', '删除歌单'), () => showDialog('delete', { playlistId: selected.id }), { className: 'ml-personal-danger' })
      );
      page.append(toolbar, el('p', 'ml-personal-count', T('playlists.songCount', '{count} 首诗歌', { count: selected.songIds.length })));
      if (!selected.songIds.length) { page.appendChild(el('p', 'ml-personal-empty', T('playlists.addHint', '点击“添加歌曲”，或在歌曲旁选择“保存到歌单”。'))); return; }
      const found = catalog(), rows = el('div', 'ml-personal-tracks');
      selected.songIds.forEach((id, index) => {
        const song = found.get(id), title = song?.title || T('playlists.unavailable', '歌曲暂不可用');
        const row = el('div', 'ml-personal-track'); row.dataset.songId = id;
        const ordinal = el('span', 'ml-personal-track-number', String(index + 1));
        const name = button('', song ? () => options.onOpenSong(song) : null, { className: 'ml-personal-track-open', disabled: !song });
        name.append(art(song), el('span', 'ml-personal-track-copy'));
        name.lastChild.append(el('strong', '', title), el('small', '', song ? (song.artist || song.source || '') : id));
        const actions = el('div', 'ml-personal-track-actions');
        if (canPlay(song)) actions.appendChild(button('', () => playPlaylist(selected, id), { glyph: 'play', label: T('player.play', '播放') + ' · ' + title }));
        actions.append(
          button('', () => operation(() => store.moveSong(selected.id, index, index - 1)), { className: 'ml-personal-move-up', glyph: 'chevronDown', label: T('playlists.moveUp', '上移'), disabled: index === 0 }),
          button('', () => operation(() => store.moveSong(selected.id, index, index + 1)), { glyph: 'chevronDown', label: T('playlists.moveDown', '下移'), disabled: index === selected.songIds.length - 1 }),
          button('', () => operation(() => store.removeSong(selected.id, id)), { glyph: 'close', label: T('playlists.removeSong', '移除歌曲') + ' · ' + title })
        );
        row.append(ordinal, name, actions); rows.appendChild(row);
      });
      page.appendChild(rows);
    }
    function refresh() {
      // These controls are mounted once, unlike the data-driven list/page.
      const relabel = (id, text) => {
        const node = sc(id); if (!node) return;
        const label = [...node.querySelectorAll('span')].find(child => !child.classList.contains('ml-personal-icon'));
        if (label) label.textContent = text;
      };
      relabel('#ml-side-personal', T('playlists.mine', '我的歌单'));
      const personalNav=sc('#ml-side-personal');if(personalNav){personalNav.setAttribute('aria-label',T('playlists.mine','我的歌单'));personalNav.title=T('playlists.mine','我的歌单');}
      relabel('#ml-dock-personal', T('playlists.mine', '我的歌单'));
      const heading = sc('.ml-personal-sidebar-head');
      if (heading) { heading.querySelector('h2').textContent = T('playlists.mine', '我的歌单'); heading.querySelector('button').setAttribute('aria-label', T('playlists.create', '新建歌单')); }
      page.setAttribute('aria-label', T('playlists.mine', '我的歌单'));
      now.setAttribute('aria-label', T('player.nowPlaying', '正在播放'));
      const toggle = sc('#ml-sidebar-toggle');
      if (toggle) toggle.setAttribute('aria-label', T(sidebarCollapsed ? 'workspace.expandSidebar' : 'workspace.collapseSidebar', sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'));
      const records = list(); renderSidebar(records); if (!page.hidden) renderPage(records);
      const entry = sc('#ml-side-personal');
      if (entry) { entry.classList.toggle('active', !page.hidden); if (!page.hidden) entry.setAttribute('aria-current', 'page'); else entry.removeAttribute('aria-current'); }
      if (modalMode === 'add') renderAddResults();
    }
    function open(id) {
      options.onCloseDock?.(); selectedId = id || null; page.hidden = false;
      options.onViewPlaylists?.(selectedId); refresh();
      const scroller = root.scrollHeight > root.clientHeight + 1 ? root : document.scrollingElement;
      scroller?.scrollTo?.({ top: 0, behavior: 'auto' });
    }
    function openCreate(song) { showDialog('create', { song }); }
    function saveSong(songOrId) {
      const song = typeof songOrId === 'string' ? catalog().get(songOrId) : songOrId;
      if (!song?.id) return;
      showDialog('save', { song });
    }
    function closeDialog(restoreFocus = true) {
      if (!modalMode) return;
      overlay.hidden = true; modalMode = ''; modalSong = null; modalPlaylistId = null; modalQuery = '';
      root.classList.remove('ml-personal-dialog-open');
      if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
    function showDialog(mode, { song = null, playlistId = null } = {}) {
      options.onCloseDock?.();
      if (!modalMode) returnFocus = document.activeElement;
      modalMode = mode; modalSong = song; modalPlaylistId = playlistId; modalQuery = '';
      overlay.hidden = false; root.classList.add('ml-personal-dialog-open'); renderDialog();
      (sc('input', dialog) || dialog).focus({ preventScroll: true });
    }
    function inputField(labelText, initial = '') {
      const label = el('label', 'ml-personal-field'); label.appendChild(el('span', '', labelText));
      const input = document.createElement('input'); input.type = 'text'; input.value = initial; input.maxLength = 80; input.autocomplete = 'off';
      label.appendChild(input); return { label, input };
    }
    function renderDialog() {
      dialog.replaceChildren();
      const record = modalPlaylistId ? findPlaylist(modalPlaylistId) : null;
      const names = {
        create: ['playlists.create', '新建歌单'], rename: ['playlists.rename', '重命名'],
        delete: ['playlists.delete', '删除歌单'], save: ['playlists.saveSong', '保存到歌单'], add: ['playlists.addSongs', '添加歌曲'],
      };
      const [key, fallback] = names[modalMode];
      const head = el('header', 'ml-personal-dialog-head'), title = el('h2', '', T(key, fallback)); title.id = 'ml-personal-editor-title';
      head.append(title, button('', () => closeDialog(), { glyph: 'close', label: T('common.close', '关闭') }));
      dialog.append(head, localNote());
      const errorBox = el('p', 'ml-personal-error'); errorBox.id = 'ml-personal-editor-error'; errorBox.hidden = true; errorBox.setAttribute('role', 'alert');
      dialog.appendChild(errorBox);
      if (modalMode === 'delete') {
        if (!record) { report(new Error(readError || T('playlists.notFound', '此歌单不存在。')), errorBox); return; }
        dialog.appendChild(el('p', '', T('playlists.deleteConfirm', '确定删除“{name}”？这不会删除歌库中的歌曲。', { name: record.name })));
        const actions = el('div', 'ml-personal-dialog-actions');
        actions.append(button(T('common.cancel', '取消'), () => closeDialog()), button(T('playlists.confirmDelete', '确认删除'), () => {
          if (operation(() => store.remove(record.id), errorBox)) { closeDialog(); if (selectedId === record.id) selectedId = null; refresh(); }
        }, { className: 'ml-personal-danger' })); dialog.appendChild(actions); return;
      }
      if (modalMode === 'add') {
        if (!record) { report(new Error(readError || T('playlists.notFound', '此歌单不存在。')), errorBox); return; }
        dialog.appendChild(el('p', '', record.name));
        const search = inputField(T('playlists.searchSongs', '搜索歌库，添加诗歌'));
        search.input.type = 'search'; search.input.maxLength = 200; search.input.id = 'ml-personal-song-search';
        search.input.addEventListener('input', () => { modalQuery = search.input.value; renderAddResults(); });
        const results = el('div', 'ml-personal-search-results'); results.id = 'ml-personal-search-results';
        dialog.append(search.label, results, button(T('common.done', '完成'), () => closeDialog(), { className: 'ml-personal-primary' })); renderAddResults(); return;
      }
      if (modalMode === 'save') {
        dialog.appendChild(el('p', 'ml-personal-saving-song', modalSong?.title || ''));
        const records = list(), choices = el('div', 'ml-personal-save-options');
        if (readError) { report(new Error(readError), errorBox); return; }
        if (!records.length) choices.appendChild(el('p', '', T('playlists.noListsForSave', '先给你的第一个歌单取个名字。')));
        records.forEach(record => {
          const included = record.songIds.includes(modalSong.id);
          const choose = button(record.name, () => {
            if (operation(() => store.addSongs(record.id, [modalSong.id]), errorBox)) { closeDialog(); toast(T('playlists.saved', '已保存到歌单')); }
          }, { className: 'ml-personal-save-option', glyph: included ? 'check' : 'plus', disabled: included });
          if (included) choose.appendChild(el('small', '', T('playlists.added', '已添加')));
          choices.appendChild(choose);
        }); dialog.appendChild(choices);
      }
      const form = el('form', 'ml-personal-name-form');
      const field = inputField(T('playlists.name', '歌单名称'), modalMode === 'rename' ? record?.name || '' : '');
      field.input.id = 'ml-personal-name'; field.input.required = true; field.input.setAttribute('aria-describedby', errorBox.id);
      const actions = el('div', 'ml-personal-dialog-actions');
      const submit = button(T(modalMode === 'rename' ? 'common.save' : (modalSong ? 'playlists.createAndSave' : 'playlists.create'), modalMode === 'rename' ? '保存' : (modalSong ? '新建并添加' : '新建歌单')), null, { className: 'ml-personal-primary' }); submit.type = 'submit';
      actions.append(button(T('common.cancel', '取消'), () => closeDialog()), submit); form.append(field.label, actions);
      form.addEventListener('submit', event => {
        event.preventDefault();
        const mode = modalMode, songToAdd = modalSong;
        const saved = operation(() => {
          if (mode === 'rename') return store.rename(modalPlaylistId, field.input.value);
          const created = store.create(field.input.value);
          if (songToAdd) return store.addSongs(created.id, [songToAdd.id]);
          return created;
        }, errorBox);
        if (!saved) return;
        closeDialog();
        if (mode !== 'save') open(saved.id); else refresh();
        toast(T(songToAdd ? 'playlists.saved' : 'playlists.created', songToAdd ? '已保存到歌单' : '歌单已创建'));
      }); dialog.appendChild(form);
    }
    function renderAddResults() {
      const container = sc('#ml-personal-search-results'); if (!container || modalMode !== 'add') return;
      container.replaceChildren(); const playlist = findPlaylist(modalPlaylistId); if (!playlist) return;
      const term = modalQuery.trim().toLocaleLowerCase();
      const matches = songs().filter(song => !term || [song.title, song.artist, song.source, song.album].some(value => String(value || '').toLocaleLowerCase().includes(term)));
      if (!matches.length) { container.appendChild(el('p', '', T('playlists.noSearchResults', '没有找到匹配的诗歌。'))); return; }
      container.appendChild(el('p', 'ml-personal-search-count', T('playlists.searchCount', '找到 {count} 首；显示前 40 首', { count: matches.length })));
      matches.slice(0, 40).forEach(song => {
        const included = playlist.songIds.includes(song.id), row = el('div', 'ml-personal-search-row');
        const label = el('span', 'ml-personal-search-copy'); label.append(el('strong', '', song.title), el('small', '', song.artist || song.source || ''));
        row.append(art(song), label, button('', () => operation(() => store.addSongs(playlist.id, [song.id]), sc('#ml-personal-editor-error')), { glyph: included ? 'check' : 'plus', disabled: included, label: T(included ? 'playlists.added' : 'playlists.addSong', included ? '已添加' : '添加歌曲') + ' · ' + song.title }));
        container.appendChild(row);
      });
    }
    function handleEscape() { if (!modalMode) return false; closeDialog(); return true; }
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusables = [...dialog.querySelectorAll('button,input')].filter(node => !node.disabled && !node.closest('[hidden]'));
      const first = focusables[0], last = focusables.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
    });
    document.addEventListener('focusin', event => { if (modalMode && !dialog.contains(event.target)) dialog.focus({ preventScroll: true }); });
    function refreshNowPlaying() {
      if (document.hidden) return;
      const candidate = options.getCurrentSong?.();
      const song = candidate && String(candidate.id || '').trim() && String(candidate.title || '').trim() ? candidate : null;
      const lyricLines = (options.getLyrics?.() || []).map(line => typeof line === 'string' ? line : line?.tx || '').filter(Boolean).slice(0, 12);
      const signature = JSON.stringify([song?.id, song?.title, song?.cover, song?.artist, song?.source, !!options.isPlaying?.(), rightPanelHidden, lyricLines, T('player.nowPlaying', '正在播放')]);
      const visible = !!song && !rightPanelHidden;
      now.hidden = !visible;
      root.classList.toggle('ml-has-desktop-now', visible);
      if (signature === nowSignature) return;
      nowSignature = signature; now.replaceChildren();
      if (!song) return;
      const header = el('header', 'ml-desktop-now-head');
      header.append(el('h2', '', T('player.nowPlaying', '正在播放')), button('', () => { rightPanelHidden = true; refreshNowPlaying(); }, { glyph: 'close', label: T('workspace.closeNowPlaying', '关闭正在播放侧栏') }));
      const cover = button('', () => options.onOpenSong(song), { className: 'ml-desktop-now-art', label: T('home.viewScore', '查看歌谱') }); cover.appendChild(art(song, 'ml-desktop-cover'));
      const title = el('h3', '', song.title || ''), artist = el('p', 'ml-desktop-now-artist', song.artist || song.source || '');
      const actions = el('div', 'ml-desktop-now-actions');
      actions.append(
        button('', () => options.onPlayPause(), { glyph: options.isPlaying?.() ? 'pause' : 'play', label: T(options.isPlaying?.() ? 'player.pause' : 'player.play', options.isPlaying?.() ? '暂停' : '播放') }),
        button(T('home.viewScore', '查看歌谱'), () => options.onOpenSong(song), { glyph: 'score' }),
        button('', () => saveSong(song), { glyph: 'plus', label: T('playlists.saveSong', '保存到歌单') })
      );
      const lyrics = el('section', 'ml-desktop-now-lyrics'); lyrics.appendChild(el('h4', '', T('workspace.lyricsPreview', '歌词预览')));
      const lines = lyricLines;
      if (lines.length) lines.forEach(line => lyrics.appendChild(el('p', '', line)));
      else lyrics.appendChild(el('p', 'ml-desktop-empty-lyrics', T('player.noLyrics', '还没有歌词')));
      now.append(header, cover, title, artist, actions, lyrics);
    }
    function toggleNowPlaying() { rightPanelHidden = !rightPanelHidden; refreshNowPlaying(); }
    global.addEventListener('cecp:playlistschange', refresh);
    global.addEventListener('cecp:languagechange', () => { refresh(); refreshNowPlaying(); if (modalMode) renderDialog(); });
    global.addEventListener('storage', event => { if (event.key === store.storageKey) refresh(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshNowPlaying(); });
    refresh(); refreshNowPlaying();
    return Object.freeze({ refresh, refreshNowPlaying, open, openCreate, saveSong, isDialogOpen: () => !!modalMode, closeDialog, handleEscape, toggleNowPlaying, setSidebarCollapsed, getSelectedId: () => selectedId });
  }
  global.CECPMusicWorkspace = Object.freeze({ create });
})(window);
