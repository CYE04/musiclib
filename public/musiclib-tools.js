/* Music library tools. The host retains ownership of song playback and audio. */
(function () {
  'use strict';

  const TOOLS = [
    { id: 'metro', title: '节拍器', description: '找到稳定的速度，练习节奏与合奏。', label: '库内使用' },
    { id: 'chords', title: '和弦查询', description: '查询与移调和弦，查看钢琴键位与吉他指法。', label: '库内使用' },
    { id: 'jf', title: '简谱编辑器', description: '整理旋律、节奏、和弦与歌词，制作简谱。', label: '新窗口' },
    { id: 'lrc', title: '歌词编辑器', description: '整理歌词与时间轴，制作同步歌词。', label: '新窗口' }
  ];
  const TOOL_ICONS = {metro:"metro",chords:"keyboard",jf:"score",lrc:"lrc"};
  const ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
  const QUALITIES = ['', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', 'add9', 'dim', 'aug'];
  const FOCUSABLE = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

  function create(options) {
    const { root, icon, createMetronome, stopMetronome, getSong, chordEngine, transposeChord } = options;
    let overlay, dialog, content, title, backButton;
    let visible = false, view = 'hub', session = null, navigation = null;
    let opener = null, scrollStyles = null, inertElements = [];
    let ownedExplorer = null, explorerOpener = null;

    function focus(element) {
      if (element && element.isConnected) element.focus({ preventScroll: true });
    }

    function focusable(container) {
      return Array.from(container.querySelectorAll(FOCUSABLE)).filter(element => element.getClientRects().length && !element.closest('[hidden],[inert]'));
    }

    function mount() {
      if (overlay) return;
      overlay = document.createElement('div');
      overlay.id = 'ml-tools';
      overlay.hidden = true;
      overlay.innerHTML = '<button id="ml-tools-backdrop" type="button" tabindex="-1" aria-label="关闭工具箱"></button>' +
        '<section id="ml-tools-dialog" role="dialog" aria-modal="true" aria-labelledby="ml-tools-title" tabindex="-1">' +
        '<header class="ml-tools-header"><button id="ml-tools-back" class="ml-tools-icon-button" type="button">' + icon('chevronLeft', 20) + '</button>' +
        '<div class="ml-tools-heading"><p>练习与创作</p><h2 id="ml-tools-title">工具箱</h2></div>' +
        '<button id="ml-tools-close" class="ml-tools-icon-button" type="button" aria-label="关闭工具箱">' + icon('close', 20) + '</button></header>' +
        '<div id="ml-tools-content"></div></section>';
      root.appendChild(overlay);
      dialog = overlay.querySelector('#ml-tools-dialog');
      content = overlay.querySelector('#ml-tools-content');
      title = overlay.querySelector('#ml-tools-title');
      backButton = overlay.querySelector('#ml-tools-back');
      overlay.querySelector('#ml-tools-close').addEventListener('click', close);
      overlay.querySelector('#ml-tools-backdrop').addEventListener('click', close);
      backButton.addEventListener('click', back);
      content.addEventListener('click', event => {
        const card = event.target.closest('[data-tool]');
        if (card && content.contains(card)) enter(card.dataset.tool);
      });
    }

    function lockPage() {
      if (scrollStyles) return;
      scrollStyles = { html: document.documentElement.style.overflow, body: document.body.style.overflow };
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      inertElements = Array.from(root.children).filter(element => element !== overlay).map(element => ({ element, inert: element.inert }));
      inertElements.forEach(item => { item.element.inert = true; });
    }

    function unlockPage() {
      if (!scrollStyles) return;
      document.documentElement.style.overflow = scrollStyles.html;
      document.body.style.overflow = scrollStyles.body;
      scrollStyles = null;
      inertElements.forEach(item => { item.element.inert = item.inert; });
      inertElements = [];
    }

    function stopTool() {
      stopMetronome();
      if (ownedExplorer && ownedExplorer.classList.contains('open')) ownedExplorer.close();
    }

    function show() {
      mount();
      visible = true;
      lockPage();
      overlay.hidden = false;
      overlay.classList.add('open');
      root.querySelectorAll('[data-nav="tools"],[data-act="tools"]').forEach(button => button.setAttribute('aria-expanded', 'true'));
    }

    function hide() {
      if (!visible) return;
      stopTool();
      visible = false;
      overlay.classList.remove('open');
      overlay.hidden = true;
      unlockPage();
      root.querySelectorAll('[data-nav="tools"],[data-act="tools"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
      focus(opener);
    }

    function push(nextView, depth) {
      try {
        history.pushState(Object.assign({}, history.state || {}, { __mlTools: { id: session.id, view: nextView, depth } }), '', session.url);
        session.depth = depth;
        return true;
      } catch (_) {
        session.depth = 0;
        return false;
      }
    }

    function open(nextOpener) {
      if (navigation) {
        navigation.reopen = nextOpener || opener;
        return;
      }
      if (visible) { focus(dialog); return; }
      opener = nextOpener || document.activeElement;
      session = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), url: location.href, depth: 0 };
      show();
      push('hub', 1);
      render('hub');
    }

    function close() {
      if (!visible && !navigation) return;
      hide();
      if (navigation) { navigation.closeAfterBack = true; return; }
      if (session.depth > 0) {
        navigation = { mode: 'close', id: session.id };
        history.go(-session.depth);
      }
    }

    function back() {
      if (!visible || navigation) return;
      if (ownedExplorer && ownedExplorer.classList.contains('open')) { ownedExplorer.close(); return; }
      if (!session.depth) {
        if (view === 'hub') hide(); else render('hub');
        return;
      }
      navigation = { mode: 'back', id: session.id };
      history.back();
    }

    function onHistory(event) {
      const marker = event.state && event.state.__mlTools;
      const belongs = session && marker && marker.id === session.id;
      if (!navigation && !visible && !belongs) return;
      // Host popstate handlers close the underlying song even for a tools-only transition.
      event.stopImmediatePropagation();
      const pending = navigation;
      navigation = null;
      if (pending && (pending.mode === 'close' || pending.closeAfterBack)) {
        if (belongs && marker.depth > 0) {
          navigation = { mode: 'close', id: session.id, reopen: pending.reopen };
          history.go(-marker.depth);
          return;
        }
        session.depth = 0;
        if (pending.reopen) open(pending.reopen);
        return;
      }
      if (belongs) {
        session.depth = marker.depth;
        show();
        render(marker.view);
      } else {
        session.depth = 0;
        hide();
      }
      if (pending && pending.reopen && !visible) open(pending.reopen);
    }

    function enter(nextView) {
      if (navigation || !TOOLS.some(tool => tool.id === nextView)) return;
      push(nextView, session.depth ? session.depth + 1 : 0);
      render(nextView);
    }

    function introduction(heading, description) {
      const section = document.createElement('div');
      section.className = 'ml-tools-intro';
      const headingElement = document.createElement('h3');
      headingElement.textContent = heading;
      const paragraph = document.createElement('p');
      paragraph.textContent = description;
      section.append(headingElement, paragraph);
      content.appendChild(section);
    }

    function render(nextView) {
      stopTool();
      view = TOOLS.some(tool => tool.id === nextView) ? nextView : 'hub';
      title.textContent = view === 'hub' ? '工具箱' : TOOLS.find(tool => tool.id === view).title;
      backButton.setAttribute('aria-label', view === 'hub' ? '返回诗歌库' : '返回工具箱');
      content.replaceChildren();
      content.scrollTop = 0;
      if (view === 'hub') renderHub();
      else if (view === 'metro') renderMetronome();
      else if (view === 'chords') renderChords();
      else renderEditor(view);
      focus(view === 'hub' ? content.querySelector('[data-tool]') : backButton);
    }

    function renderHub() {
      introduction('从练习到创作', '选一件顺手的工具。节拍器与和弦查询可直接使用，编辑器将在新窗口打开。');
      const grid = document.createElement('div');
      grid.className = 'ml-tools-grid';
      TOOLS.forEach(tool => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'ml-tools-card';
        card.dataset.tool = tool.id;
        card.innerHTML = '<span class="ml-tools-card-icon">' + icon(TOOL_ICONS[tool.id], 30) + '</span><span class="ml-tools-card-body"><strong>' + tool.title + '</strong><span>' + tool.description + '</span><small>' + tool.label + '</small></span><span class="ml-tools-card-arrow">' + icon('chevronRight', 18) + '</span>';
        grid.appendChild(card);
      });
      content.appendChild(grid);
      const note = document.createElement('p');
      note.className = 'ml-tools-note';
      note.textContent = '返回诗歌库后，可继续浏览当前歌曲。';
      content.appendChild(note);
    }

    function renderMetronome() {
      introduction('把节奏练稳', '先从舒适的速度开始，熟练后再逐步提速。每四拍的第一拍会加重提示。');
      const song = getSong();
      const songBpm = song && Number(song.bpm);
      const hasSongBpm = Number.isFinite(songBpm) && songBpm >= 30 && songBpm <= 240;
      const metronome = createMetronome(hasSongBpm ? Math.round(songBpm) : 72);
      const sub = metronome.querySelector('.ml-met-sub');
      if (sub) sub.textContent = '每分钟拍数（BPM） · 30–240';
      const hint = metronome.querySelector('.ml-met-hint');
      if (hint) hint.textContent = '点击开始打拍；用滑杆或 − / + 调整速度。音量设为 0 时可静音练习。';
      content.appendChild(metronome);
      if (hasSongBpm) {
        const preset = document.createElement('button');
        preset.type = 'button';
        preset.className = 'ml-tools-button ml-tools-secondary ml-tools-song-preset';
        preset.textContent = '使用当前歌曲速度 · ' + Math.round(songBpm) + ' BPM';
        preset.addEventListener('click', () => {
          const range = metronome.querySelector('.ml-met-range');
          range.value = String(Math.round(songBpm));
          range.dispatchEvent(new Event('input', { bubbles: true }));
        });
        content.appendChild(preset);
      }
      const note = document.createElement('div');
      note.className = 'ml-tools-tip';
      note.innerHTML = '<strong>练习小提示</strong><p>先数拍，再加入旋律。觉得吃力时降低速度，连续弹唱顺畅后再增加 5 BPM。</p><p>返回或关闭工具箱会停止这里的节拍器。</p>';
      content.appendChild(note);
    }

    function renderChords() {
      introduction('听见和弦，找到指法', '选择根音与类型，或输入一个和弦符号。支持升降音、延伸和弦与斜杠低音。');
      const engine = chordEngine();
      if (!engine || !engine.getChord) {
        const unavailable = document.createElement('p');
        unavailable.className = 'ml-tools-tip';
        unavailable.textContent = '和弦工具暂时未能加载，请关闭工具箱后重试。';
        content.appendChild(unavailable);
        return;
      }
      const form = document.createElement('form');
      form.id = 'ml-tools-chord-form';
      form.innerHTML = '<div class="ml-tools-field"><label for="ml-tools-chord-input">和弦符号</label><div class="ml-tools-search-row"><input id="ml-tools-chord-input" type="text" value="C" placeholder="例如 Cmaj7、G#m、D/F#" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="ml-tools-chord-help ml-tools-chord-error"><button class="ml-tools-button" type="submit">查询</button></div><p id="ml-tools-chord-help" class="ml-tools-field-help">大写字母表示根音，m 表示小和弦；例如 Am、Bb7。</p><p id="ml-tools-chord-error" role="alert" hidden></p></div>' +
        '<div class="ml-tools-select-row"><div class="ml-tools-field"><label for="ml-tools-chord-root">根音</label><select id="ml-tools-chord-root"></select></div><div class="ml-tools-field"><label for="ml-tools-chord-quality">和弦类型</label><select id="ml-tools-chord-quality"></select></div></div>' +
        '<div class="ml-tools-examples" aria-label="常见和弦"><span>试试看</span>' + ['C', 'Am', 'G', 'F', 'D/F#', 'Bbmaj7'].map(symbol => '<button type="button" class="ml-tools-example" data-chord="' + symbol + '">' + symbol + '</button>').join('') + '</div>';
      const input = form.querySelector('#ml-tools-chord-input');
      const rootSelect = form.querySelector('#ml-tools-chord-root');
      const qualitySelect = form.querySelector('#ml-tools-chord-quality');
      ROOTS.forEach(value => rootSelect.add(new Option(value, value)));
      QUALITIES.filter(value => engine.qualities[value]).forEach(value => qualitySelect.add(new Option(engine.qualities[value].zh + (value ? ' · ' + value : ''), value)));
      content.appendChild(form);
      const result = document.createElement('section');
      result.id = 'ml-tools-chord-result';
      result.setAttribute('aria-label', '和弦查询结果');
      const transposition = document.createElement('fieldset');
      transposition.id = 'ml-tools-transpose';
      transposition.innerHTML = '<legend>和弦移调</legend><div class="ml-tools-transpose-step"><button id="ml-tools-transpose-down" type="button" class="ml-tools-icon-button" aria-label="降低半音">−</button><div class="ml-tools-transpose-value"><output id="ml-tools-transpose-amount" aria-label="移调半音数">0</output><small>半音</small></div><button id="ml-tools-transpose-up" type="button" class="ml-tools-icon-button" aria-label="升高半音">+</button><button id="ml-tools-transpose-reset" type="button" class="ml-tools-button ml-tools-secondary" aria-label="还原移调">还原</button></div>' +
        '<div class="ml-tools-select-row"><div class="ml-tools-field"><label for="ml-tools-transpose-from">原调</label><select id="ml-tools-transpose-from"></select></div><div class="ml-tools-field"><label for="ml-tools-transpose-to">目标调</label><select id="ml-tools-transpose-to"></select></div></div><p id="ml-tools-transpose-summary" class="ml-tools-field-help" role="status" aria-live="polite"></p>';
      content.appendChild(transposition);
      content.appendChild(result);
      const fromKey = transposition.querySelector('#ml-tools-transpose-from');
      const toKey = transposition.querySelector('#ml-tools-transpose-to');
      const down = transposition.querySelector('#ml-tools-transpose-down');
      const up = transposition.querySelector('#ml-tools-transpose-up');
      const reset = transposition.querySelector('#ml-tools-transpose-reset');
      const amount = transposition.querySelector('#ml-tools-transpose-amount');
      const summary = transposition.querySelector('#ml-tools-transpose-summary');
      ROOTS.forEach(value => { fromKey.add(new Option(value, value)); toKey.add(new Option(value, value)); });
      const songKey = engine.parseChord(getSong()?.origKey || 'C');
      fromKey.value = songKey && ROOTS.includes(songKey.root) ? songKey.root : 'C';
      let sourceEntry = null, semitones = 0, keyMode = false;

      function transposeState(ready) {
        down.disabled = !ready || semitones <= -12;
        up.disabled = !ready || semitones >= 12;
        reset.disabled = !ready || (!semitones && !keyMode);
        fromKey.disabled = toKey.disabled = !ready;
      }
      function paintTransposition() {
        if (!sourceEntry) { transposeState(false); return; }
        const source = sourceEntry.def;
        const symbol = semitones || keyMode ? transposeChord(source, semitones, keyMode ? toKey.value : null) : source.symbol;
        const entry = engine.getChord(symbol);
        if (!entry) return;
        if (!keyMode) toKey.value = transposeChord(engine.getChord(fromKey.value).def, semitones, fromKey.value);
        amount.textContent = semitones > 0 ? '+' + semitones : semitones < 0 ? '−' + Math.abs(semitones) : '0';
        summary.textContent = semitones || source.symbol !== entry.def.symbol ? source.symbol + ' → ' + entry.def.symbol + (semitones ? ' · ' + (semitones > 0 ? '升 ' : '降 ') + Math.abs(semitones) + ' 个半音' : ' · 同音换调号') : '用 − / + 按半音调整，或选择原调与目标调。根音与斜杠低音一起移动。';
        transposeState(true);
        renderChordResult(engine, entry, result);
      }
      function changeKey() {
        keyMode = true;
        const from = engine.parseChord(fromKey.value).rootPc;
        const to = engine.parseChord(toKey.value).rootPc;
        semitones = (to - from + 18) % 12 - 6;
        paintTransposition();
      }
      fromKey.addEventListener('change', changeKey);
      toKey.addEventListener('change', changeKey);
      down.addEventListener('click', () => { semitones = Math.max(-12, semitones - 1); keyMode = false; paintTransposition(); });
      up.addEventListener('click', () => { semitones = Math.min(12, semitones + 1); keyMode = false; paintTransposition(); });
      reset.addEventListener('click', () => { semitones = 0; keyMode = false; paintTransposition(); });
      input.addEventListener('input', () => {
        const ready = !!sourceEntry && engine.cleanChordText(input.value) === sourceEntry.def.symbol;
        transposeState(ready);
        if (!ready) summary.textContent = '先查询输入的和弦，再进行移调。';
        else paintTransposition();
      });
      function query(symbol) {
        const cleaned = engine.cleanChordText(symbol);
        const entry = /\s/.test(cleaned) ? null : engine.getChord(cleaned);
        const error = form.querySelector('#ml-tools-chord-error');
        error.hidden = !!entry;
        input.setAttribute('aria-invalid', entry ? 'false' : 'true');
        if (!entry) {
          sourceEntry = null;
          semitones = 0;
          keyMode = false;
          amount.textContent = '0';
          toKey.value = fromKey.value;
          transposeState(false);
          summary.textContent = '查询有效和弦后即可移调。';
          error.textContent = cleaned ? '未识别这个和弦。请检查符号，例如 C、Am、Bb7 或 D/F#。' : '请输入一个和弦符号，例如 C 或 Am。';
          result.hidden = true;
          focus(input);
          return;
        }
        input.value = entry.def.symbol;
        rootSelect.value = entry.def.root;
        if (!Array.from(qualitySelect.options).some(option => option.value === entry.def.quality.id)) qualitySelect.add(new Option(entry.def.quality.zh + ' · ' + entry.def.quality.id, entry.def.quality.id));
        qualitySelect.value = entry.def.quality.id;
        result.hidden = false;
        sourceEntry = entry;
        semitones = 0;
        keyMode = false;
        paintTransposition();
      }
      form.addEventListener('submit', event => { event.preventDefault(); query(input.value); });
      const selectChord = () => query(rootSelect.value + qualitySelect.value);
      rootSelect.addEventListener('change', selectChord);
      qualitySelect.addEventListener('change', selectChord);
      form.addEventListener('click', event => {
        const example = event.target.closest('[data-chord]');
        if (example) query(example.dataset.chord);
      });
      query('C');
    }

    function renderChordResult(engine, entry, result) {
      const def = entry.def;
      result.replaceChildren();
      const heading = document.createElement('div');
      heading.className = 'ml-tools-chord-heading';
      const name = document.createElement('h3');
      name.textContent = def.symbol;
      const quality = document.createElement('p');
      quality.textContent = def.quality.zh + ' · ' + def.quality.name;
      heading.append(name, quality);
      result.appendChild(heading);
      const notes = document.createElement('div');
      notes.className = 'ml-tools-tones';
      notes.setAttribute('aria-label', '组成音');
      def.notes.forEach(note => {
        const chip = document.createElement('span');
        chip.className = 'ml-tools-tone' + (note.role === 'root' ? ' is-root' : '');
        const noteName = document.createElement('strong');
        noteName.textContent = note.name;
        const degree = document.createElement('small');
        degree.textContent = note.degree === 'R' ? '根音' : note.degree + ' 音';
        chip.append(noteName, degree);
        notes.appendChild(chip);
      });
      result.appendChild(notes);
      if (def.bassNote) {
        const bass = document.createElement('p');
        bass.className = 'ml-tools-field-help';
        bass.textContent = '低音 ' + def.bassNote.name + ' 由左手或贝斯演奏，右手使用上方组成音。';
        result.appendChild(bass);
      }
      const piano = document.createElement('chord-piano');
      piano.className = 'ml-tools-piano';
      piano.setAttribute('aria-label', def.symbol + ' 钢琴键位，组成音 ' + def.notes.map(note => note.name).join('、'));
      result.appendChild(piano);
      piano.definition = def;
      const actions = document.createElement('div');
      actions.className = 'ml-tools-result-actions';
      actions.innerHTML = '<button id="ml-tools-chord-play" type="button" class="ml-tools-button">' + icon('play', 16) + '钢琴试听</button><button id="ml-tools-chord-fingering" type="button" class="ml-tools-button ml-tools-secondary">查看指法' + icon('chevronRight', 16) + '</button>';
      const feedback = document.createElement('p');
      feedback.id = 'ml-tools-chord-feedback';
      feedback.className = 'ml-tools-field-help';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      actions.querySelector('#ml-tools-chord-play').addEventListener('click', () => {
        try {
          if (engine.audio.playChord(def.pianoMidis)) {
            piano.flash(def.pianoMidis);
            feedback.textContent = '正在试听 ' + def.symbol + '。';
          } else feedback.textContent = '此浏览器暂时无法播放试听，请检查声音权限或使用支持音频的浏览器。';
        } catch (_) {
          feedback.textContent = '试听未能播放，请检查浏览器声音权限后重试。';
        }
      });
      actions.querySelector('#ml-tools-chord-fingering').addEventListener('click', event => openFingering(engine, def.symbol, event.currentTarget));
      result.appendChild(actions);
      result.appendChild(feedback);
      const hint = document.createElement('p');
      hint.className = 'ml-tools-field-help';
      hint.textContent = entry.guitar.length ? '指法面板内可查看不同吉他把位，并试听扫弦。' : '此和弦暂未收录吉他把位，指法面板仍可查看钢琴组成音。';
      result.appendChild(hint);
    }

    function openFingering(engine, symbol, button) {
      if (!engine.open(symbol)) return;
      ownedExplorer = document.querySelector('chord-explorer.open');
      if (!ownedExplorer || !ownedExplorer.shadowRoot) return;
      explorerOpener = button;
      ownedExplorer.setAttribute('data-tools-owned', '');
      dialog.inert = true;
      dialog.setAttribute('aria-hidden', 'true');
      const shadow = ownedExplorer.shadowRoot;
      if (!shadow.querySelector('[data-tools-focus-style]')) {
        const style = document.createElement('style');
        style.dataset.toolsFocusStyle = '';
        style.textContent = ':host([data-tools-owned]) .close,:host([data-tools-owned]) .play{min-width:44px;min-height:44px;border-radius:10px}:host([data-tools-owned]) button:focus-visible{outline:2px solid var(--ce-accent);outline-offset:3px}@media(prefers-reduced-motion:reduce){:host([data-tools-owned]) .sheet,:host([data-tools-owned]) .backdrop,:host([data-tools-owned]) .play{transition:none}}';
        shadow.appendChild(style);
      }
      ownedExplorer.addEventListener('chord-close', onFingeringClose, { once: true });
      focus(shadow.querySelector('.close'));
    }

    function onFingeringClose() {
      if (ownedExplorer) ownedExplorer.removeAttribute('data-tools-owned');
      ownedExplorer = null;
      dialog.inert = false;
      dialog.removeAttribute('aria-hidden');
      if (visible) focus(explorerOpener);
      explorerOpener = null;
    }

    function renderEditor(id) {
      const isScore = id === 'jf';
      introduction(isScore ? '把旋律整理成简谱' : '让歌词跟上音乐', isScore ? '使用现有简谱编辑器，逐行录入旋律、节奏与歌词，再检查谱面。' : '使用现有歌词编辑器，整理段落与时间标记，让歌词按歌曲进度显示。');
      const preparation = document.createElement('section');
      preparation.className = 'ml-tools-tip';
      preparation.innerHTML = '<h4>开始前准备</h4><p>' + (isScore ? '准备好旋律或原始谱面、调号与拍号，以及对应歌词。先用一小段旋律熟悉编辑方式。' : '准备完整歌词；如果需要同步时间轴，再准备好对应音频和确定的歌曲版本。') + '</p>';
      content.appendChild(preparation);
      const steps = document.createElement('ol');
      steps.className = 'ml-tools-steps';
      const instructions = isScore ? [
        ['设置曲目信息', '填写标题，确认调号、拍号与速度。'],
        ['录入并查看预览', '按编辑器语法输入音符与节奏，逐句加入和弦和歌词。'],
        ['检查与导出', '核对音符、节拍与歌词对齐，再使用编辑器的导出功能。']
      ] : [
        ['整理歌词段落', '填写曲目信息，粘贴歌词并检查换行。'],
        ['标记每句时间', '播放对应音频，为每句歌词设置开始时间。'],
        ['预览与导出', '回放检查同步效果，再使用编辑器的导出功能。']
      ];
      instructions.forEach(([heading, detail]) => {
        const step = document.createElement('li');
        const stepTitle = document.createElement('strong');
        stepTitle.textContent = heading;
        const paragraph = document.createElement('p');
        paragraph.textContent = detail;
        step.append(stepTitle, paragraph);
        steps.appendChild(step);
      });
      content.appendChild(steps);
      const launch = document.createElement('div');
      launch.className = 'ml-tools-editor-launch';
      launch.innerHTML = '<a id="ml-tools-editor-open" class="ml-tools-button" href="./musictool/index.html?tool=' + id + '" target="_blank" rel="noopener">打开' + (isScore ? '简谱' : '歌词') + '编辑器' + icon('chevronRight', 18) + '</a><p>将在新窗口打开，诗歌库会保留当前浏览位置与播放状态。</p><p>进入后可从编辑器中的教程查看具体输入格式。</p>';
      content.appendChild(launch);
    }

    function trapFocus(event) {
      if (!visible || event.key !== 'Tab') return;
      const explorer = ownedExplorer && ownedExplorer.classList.contains('open') ? ownedExplorer : null;
      const container = explorer ? explorer.shadowRoot : dialog;
      const items = focusable(container);
      const active = explorer ? container.activeElement : document.activeElement;
      if (!items.length) { event.preventDefault(); focus(dialog); return; }
      const index = items.indexOf(active);
      if (event.shiftKey && index <= 0) { event.preventDefault(); focus(items[items.length - 1]); }
      else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); focus(items[0]); }
    }

    document.addEventListener('keydown', trapFocus, true);
    document.addEventListener('focusin', event => {
      if (!visible) return;
      if (ownedExplorer && ownedExplorer.classList.contains('open')) {
        if (event.target !== ownedExplorer) focus(ownedExplorer.shadowRoot.querySelector('.close'));
      } else if (!dialog.contains(event.target)) focus(dialog);
    }, true);
    window.addEventListener('popstate', onHistory, true);
    window.addEventListener('pagehide', stopTool);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopMetronome(); });
    return { open, close, back, isOpen: () => visible };
  }

  window.CECPMusicTools = { create };
})();
