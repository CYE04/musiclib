(function () {
  'use strict';

  function create({ root, icon, getLyrics, getFallbackLyrics, buildShareUrl }) {
    const typeDefaults = { font: 'handwriting', fontSize: 78, lineHeight: 1.5, letterSpacing: 0, align: 'left' };
    const dialog = document.createElement('dialog');
    dialog.id = 'ml-story-share';
    dialog.setAttribute('aria-labelledby', 'ml-story-title');
    dialog.innerHTML = `
      <header class="ml-story-header"><div><span class="ml-story-eyebrow">CECP MUSIC LIBRARY</span><h2 id="ml-story-title">分享</h2></div><button type="button" id="ml-story-close" aria-label="关闭分享">${icon('close', 20)}</button></header>
      <div class="ml-story-layout">
        <div class="ml-story-preview"><canvas id="ml-story-canvas" width="1080" height="1920" aria-label="分享卡片预览"></canvas><span>9:16 · 1080 × 1920</span></div>
        <div class="ml-story-editor">
          <div class="ml-story-segment" role="group" aria-label="分享内容"><button type="button" data-mode="lyrics" aria-pressed="true">歌词</button><button type="button" data-mode="cover" aria-pressed="false">封面</button></div>
          <p id="ml-story-no-lyrics" class="ml-story-help" hidden>这首歌暂时没有歌词，可分享封面卡片。</p>
          <section id="ml-story-lyrics-section"><details id="ml-story-lyrics-picker"><summary>选择歌词 <span id="ml-story-count"></span>${icon('chevronDown', 14)}</summary><p class="ml-story-help">选择 1–8 行，建议 2–4 行</p><div id="ml-story-lines"></div></details></section>
          <section id="ml-story-cover-section" hidden><h3>封面样式</h3><div class="ml-story-segment"><button type="button" data-template="minimal" aria-pressed="true">简约专辑版</button><button type="button" data-template="player" aria-pressed="false">音乐播放器版</button></div></section>
          <section><h3>背景 <span id="ml-story-background-name">暖色日落</span></h3><div id="ml-story-backgrounds" role="group" aria-label="卡片背景"></div></section>
          <section id="ml-story-typography"><details id="ml-story-type"><summary>文字样式 <span id="ml-story-font-name">灵动手写</span>${icon('chevronDown', 14)}</summary><div class="ml-story-type-controls">
            <div class="ml-story-segment ml-story-font-grid" role="group" aria-label="字体">${window.CECPStoryCard.fonts.map(font => `<button type="button" data-font="${font.id}" title="${font.label}" aria-pressed="${font.id === typeDefaults.font}">${font.shortLabel || font.label}</button>`).join('')}</div>
            <p id="ml-story-font-help" class="ml-story-help"></p>
            <label class="ml-story-range" for="ml-story-size">字号 <input type="range" id="ml-story-size" min="44" max="110" step="2" value="78"><output id="ml-story-size-value">78</output></label>
            <label class="ml-story-range" for="ml-story-spacing">行距 <input type="range" id="ml-story-spacing" min="1.2" max="2" step="0.05" value="1.5"><output id="ml-story-spacing-value">1.5</output></label>
            <label class="ml-story-range" for="ml-story-tracking">字距 <input type="range" id="ml-story-tracking" min="0" max="12" step="1" value="0"><output id="ml-story-tracking-value">0</output></label>
            <div id="ml-story-align-controls" class="ml-story-segment" role="group" aria-label="文字对齐"><button type="button" data-align="left" aria-pressed="true">偏左</button><button type="button" data-align="center" aria-pressed="false">居中</button></div>
            <div class="ml-story-type-footer"><p class="ml-story-help">文字较多时自动适配，保持留白。</p><button type="button" id="ml-story-reset-type">恢复默认</button></div>
          </div></details></section>
          <p id="ml-story-status" role="status" aria-live="polite"></p>
          <div class="ml-story-actions"><button type="button" id="ml-story-save" disabled>${icon('download', 17)}保存图片</button><button type="button" id="ml-story-send" disabled>${icon('share', 17)}分享图片</button></div>
          <div class="ml-story-link"><input id="ml-story-url" aria-label="歌曲分享链接" readonly><button type="button" id="ml-story-copy">复制歌曲链接</button></div>
          <p class="ml-story-help ml-story-instagram-help"><strong>添加可点击链接</strong><br>复制歌曲链接 → Instagram「链接贴纸」→ 粘贴。<br>贴纸文字可写「听这首诗歌 ↗」。</p>
          <p class="ml-story-help" id="ml-story-share-help"></p>
          <a id="ml-story-image-link" target="_blank" rel="noopener" hidden>打开原图 · 长按保存到照片</a>
        </div>
      </div>`;
    root.appendChild(dialog);
    const find = id => dialog.querySelector('#ml-story-' + id);
    const canvas = find('canvas');
    const status = find('status');
    const save = find('save');
    const send = find('send');
    let state = null;
    let revision = 0;
    let currentFile = null;
    let imageUrl = '';
    let returnFocus = null;
    let pushed = false;
    let timer = 0;
    let rendering = false;

    const normalizedLines = values => (values || []).map(value => String(value?.tx ?? value ?? '')
      .replace(/[\u3164\u200b\u00a0@]/g, ' ').trim()).filter(Boolean);

    function message(text) { status.textContent = text; }
    function clearFile() {
      currentFile = null;
      save.disabled = true;
      send.disabled = true;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = '';
      find('image-link').hidden = true;
    }
    function queueRender() {
      revision++;
      clearTimeout(timer);
      clearFile();
      if (state.mode === 'lyrics' && !state.selected.size) {
        message('请先选择至少一行歌词。');
        return;
      }
      message('正在准备高清图片…');
      timer = setTimeout(render, 80);
    }
    async function render() {
      if (rendering || !dialog.open || !state || (state.mode === 'lyrics' && !state.selected.size)) return;
      rendering = true;
      const token = revision;
      try {
        const selectedLines = state.lines.filter((_, index) => state.selected.has(index));
        const result = await window.CECPStoryCard.render(canvas, { ...state, lines: selectedLines });
        if (token !== revision || !dialog.open) return;
        const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG')), 'image/png'));
        if (token !== revision || !dialog.open) return;
        const name = String(state.song.title || state.song.id || 'CECP').replace(/[\\/:*?"<>|]/g, '-').slice(0, 70);
        currentFile = new File([blob], name + '-story.png', { type: 'image/png' });
        imageUrl = URL.createObjectURL(blob);
        find('image-link').href = imageUrl;
        save.disabled = false;
        send.disabled = false;
        let supported = false;
        try { supported = !!navigator.share && !!navigator.canShare?.({ files: [currentFile] }); } catch (_) {}
        find('share-help').textContent = supported ? '点击「分享图片」打开系统分享菜单，再选择应用。' : '此浏览器不支持直接分享图片，请保存图片并复制链接。';
        message(result?.coverFailed ? '封面无法载入，已使用渐变封面，仍可保存分享。' : result?.fontFallback ? '所选字体暂时不可用，已使用设备字体。' : '');
      } catch (_) {
        message('图片生成失败，请切换背景重试；仍可复制歌曲链接。');
      } finally {
        rendering = false;
        if (token !== revision && dialog.open) timer = setTimeout(render, 0);
      }
    }
    function syncControls() {
      dialog.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
      dialog.querySelectorAll('[data-template]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.template === state.template)));
      dialog.querySelectorAll('[data-align]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.align === state.align)));
      dialog.querySelectorAll('[data-font]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.font === state.font)));
      dialog.querySelectorAll('[data-background]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.background === state.background)));
      find('lyrics-section').hidden = state.mode !== 'lyrics';
      find('cover-section').hidden = state.mode !== 'cover';
      find('align-controls').hidden = state.mode !== 'lyrics';
      find('background-name').textContent = window.CECPStoryCard.backgrounds.find(item => item.id === state.background)?.label || '';
      find('count').textContent = `已选 ${state.selected.size} 行`;
      const font = window.CECPStoryCard.fonts.find(item => item.id === state.font);
      find('font-name').textContent = font?.label || '';
      find('font-help').textContent = font?.hint || '新字体首次选择时加载；中文、意大利语均可使用。';
      find('size').value = state.fontSize;
      find('spacing').value = state.lineHeight;
      find('tracking').value = state.letterSpacing;
      find('size-value').textContent = state.fontSize;
      find('spacing-value').textContent = Number(state.lineHeight).toFixed(2).replace(/0$/, '');
      find('tracking-value').textContent = state.letterSpacing;
    }
    function displayLines() {
      const list = find('lines');
      list.replaceChildren();
      find('no-lyrics').hidden = state.lines.length > 0;
      if (!state.lines.length) {
        state.mode = 'cover';
      }
      state.lines.forEach((line, index) => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = state.selected.has(index);
        const text = document.createElement('span');
        text.textContent = line;
        label.append(checkbox, text);
        checkbox.addEventListener('change', () => {
          state.edited = true;
          const characters = state.lines.filter((_, lineIndex) => state.selected.has(lineIndex)).join('').length;
          if (checkbox.checked && (state.selected.size >= 8 || characters + line.length > 700)) {
            checkbox.checked = false;
            message('最多选择 8 行、700 字，请选择较短片段。');
            return;
          }
          if (checkbox.checked) state.selected.add(index); else state.selected.delete(index);
          syncControls();
          queueRender();
        });
        list.appendChild(label);
      });
      syncControls();
      queueRender();
    }
    function initialSelection(lines) {
      const selected = new Set();
      let length = 0;
      lines.slice(0, 3).forEach((line, index) => {
        if (length + line.length <= 700) { selected.add(index); length += line.length; }
      });
      return selected;
    }
    function hide() {
      revision++;
      clearTimeout(timer);
      dialog.close();
      document.body.classList.remove('ml-story-lock');
      clearFile();
      returnFocus?.focus?.({ preventScroll: true });
    }
    function close() {
      if (!dialog.open) return;
      if (pushed && history.state?.__mlStoryShare) {
        history.back();
      } else { pushed = false; hide(); }
    }
    window.addEventListener('popstate', event => {
      if (!dialog.open) return;
      event.stopImmediatePropagation();
      pushed = false;
      hide();
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); } });
    find('close').addEventListener('click', close);
    dialog.querySelectorAll('[data-mode],[data-template],[data-align],[data-font]').forEach(button => button.addEventListener('click', () => {
      const property = button.dataset.mode ? 'mode' : button.dataset.template ? 'template' : button.dataset.font ? 'font' : 'align';
      state[property] = button.dataset[property];
      state.modeChosen = true;
      if (property === 'mode') state.background = state.mode === 'cover' || state.song.cover ? 'album' : 'sunset';
      syncControls();
      queueRender();
    }));
    find('reset-type').addEventListener('click', () => {
      Object.assign(state, typeDefaults);
      state.modeChosen = true;
      syncControls();
      queueRender();
    });
    for (const [control, property] of [['size', 'fontSize'], ['spacing', 'lineHeight'], ['tracking', 'letterSpacing']]) {
      find(control).addEventListener('input', () => {
        state[property] = Number(find(control).value);
        state.modeChosen = true;
        syncControls();
        queueRender();
      });
    }
    for (const background of window.CECPStoryCard.backgrounds) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.background = background.id;
      button.setAttribute('aria-label', background.label);
      button.title = background.label;
      const colors = background.colors || ['#b2bacb', '#f4c8a4'];
      button.style.background = `linear-gradient(160deg, ${colors.join(',')})`;
      if (background.id === 'album') {
        const thumbnail = document.createElement('img');
        thumbnail.alt = '';
        thumbnail.hidden = true;
        button.appendChild(thumbnail);
      }
      const mark = document.createElement('span');
      mark.textContent = background.id === 'album' ? '封面' : '✓';
      button.appendChild(mark);
      button.addEventListener('click', () => { state.modeChosen = true; state.background = background.id; syncControls(); queueRender(); });
      find('backgrounds').appendChild(button);
    }
    function download() {
      if (!currentFile || !imageUrl) return;
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = currentFile.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      find('image-link').hidden = false;
      message('已准备保存；若未下载，请打开原图并长按保存。');
    }
    save.addEventListener('click', download);
    send.addEventListener('click', async () => {
      if (!currentFile) return;
      let supported = false;
      try { supported = !!navigator.share && !!navigator.canShare?.({ files: [currentFile] }); } catch (_) {}
      if (!supported) { download(); message('请保存图片，并点击「复制歌曲链接」添加到 Instagram 链接贴纸。'); return; }
      try {
        const data = { files: [currentFile], title: state.song.title || 'CECP Music Library', text: find('url').value, url: find('url').value };
        let includeLink = false;
        try { includeLink = navigator.canShare(data); } catch (_) {}
        await navigator.share(includeLink ? data : { files: data.files, title: data.title });
        message(includeLink ? '图片和歌曲链接已交给系统分享。Instagram Story 如未显示链接，请使用下方链接贴纸提示。' : '图片已交给系统分享。请复制歌曲链接，在 Instagram 添加链接贴纸。');
      } catch (error) {
        if (error.name === 'AbortError') return;
        find('image-link').hidden = false;
        message('系统分享未完成，请使用「保存图片」和「复制歌曲链接」。');
      }
    });
    find('copy').addEventListener('click', async () => {
      const input = find('url');
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard');
        await navigator.clipboard.writeText(input.value);
        message('歌曲链接已复制，可粘贴到 Instagram 的链接贴纸。');
      } catch (_) {
        input.focus(); input.select(); input.setSelectionRange(0, input.value.length);
        let copied = false;
        try { copied = document.execCommand('copy'); } catch (_) {}
        message(copied ? '歌曲链接已复制。' : '请长按或手动复制已选中的歌曲链接。');
      }
    });
    return {
      isOpen: () => dialog.open,
      close,
      open(song) {
        returnFocus = document.activeElement;
        const lines = normalizedLines(getFallbackLyrics(song));
        state = { song, lines, selected: initialSelection(lines), mode: lines.length ? 'lyrics' : 'cover', background: song.cover || !lines.length ? 'album' : 'sunset', template: 'minimal', ...typeDefaults, edited: false, modeChosen: false };
        const thumbnail = dialog.querySelector('[data-background="album"] img');
        thumbnail.hidden = !song.cover;
        if (song.cover) thumbnail.src = song.cover; else thumbnail.removeAttribute('src');
        find('url').value = buildShareUrl(song.id);
        if (!dialog.open) {
          try { history.pushState({ ...history.state, __mlStoryShare: true }, '', location.href); pushed = true; } catch (_) { pushed = false; }
          dialog.showModal();
        }
        document.body.classList.add('ml-story-lock');
        find('lyrics-picker').open = false;
        find('type').open = false;
        displayLines();
        const opening = state;
        Promise.resolve(getLyrics(song)).then(values => {
          if (!dialog.open || state !== opening || state.edited) return;
          const loaded = normalizedLines(values);
          if (!loaded.length) return;
          const wasEmpty = !state.lines.length;
          state.lines = loaded;
          state.selected = initialSelection(loaded);
          if (wasEmpty && !state.modeChosen) { state.mode = 'lyrics'; state.background = song.cover ? 'album' : 'sunset'; }
          displayLines();
        }).catch(() => {});
      }
    };
  }
  window.CECPStoryShare = { create };
})();
