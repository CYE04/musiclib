/* 歌库专属包装；原编辑器作为经典脚本先完整加载，保留它的输入、草稿和导出逻辑。 */
(function () {
  'use strict';
  const root = document.getElementById('music-toolbox');
  if (!root) return;
  const THEME_KEY = 'cecp:musiclib:theme';
  const EDITOR_CACHE = 'cecp-musiclib-editor-v1';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const frame = document.getElementById('mt-jf-iframe');
  const dialogDocuments = new WeakSet();

  function installDialogs(doc, descriptions) {
    if (dialogDocuments.has(doc)) return;
    dialogDocuments.add(doc);
    const focusableSelector = 'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const dialogs = descriptions.map((description) => {
      const overlay = doc.getElementById(description.id);
      const box = overlay && overlay.querySelector(description.box);
      if (!box) return null;
      const title = box.querySelector(description.title);
      if (title && !title.id) title.id = description.id + '-title';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      if (title) box.setAttribute('aria-labelledby', title.id);
      box.tabIndex = -1;
      return { ...description, overlay, box, open: false, opener: null };
    }).filter(Boolean);
    let active = null;
    let lastTrigger = null;
    let inertElements = [];
    const visible = (element) => element && element.isConnected && element.getClientRects().length > 0;
    const controls = (dialog) => [...dialog.box.querySelectorAll(focusableSelector)].filter(visible);
    function focusDialog(dialog) {
      const target = dialog.box.querySelector(dialog.initial) || controls(dialog)[0] || dialog.box;
      target.focus();
    }
    function isolateDialog(dialog) {
      for (const item of inertElements) item.element.inert = item.inert;
      inertElements = [];
      if (!dialog) return;
      let branch = dialog.overlay;
      while (branch.parentElement) {
        for (const element of branch.parentElement.children) {
          if (element === branch) continue;
          inertElements.push({ element, inert: element.inert });
          element.inert = true;
        }
        if (branch.parentElement === doc.body) break;
        branch = branch.parentElement;
      }
    }
    function syncDialogs() {
      let opened = null;
      let closed = null;
      for (const dialog of dialogs) {
        const open = dialog.overlay.classList.contains('open');
        if (open === dialog.open) continue;
        dialog.open = open;
        if (open) {
          const focused = doc.activeElement;
          dialog.opener = visible(focused) && focused !== doc.body && !dialog.overlay.contains(focused) ? focused : visible(lastTrigger) ? lastTrigger : doc.querySelector(dialog.openerSelector);
          opened = dialog;
        } else if (dialog === active) closed = dialog;
      }
      active = opened || (active && active.open ? active : dialogs.find((dialog) => dialog.open)) || null;
      isolateDialog(active);
      if (opened) focusDialog(opened);
      else if (closed && !active && visible(closed.opener)) closed.opener.focus();
      else if (closed && active) focusDialog(active);
    }
    doc.addEventListener('click', (event) => {
      const target = event.target.closest('button,a,[role="button"]');
      if (target && (!active || !active.overlay.contains(target))) lastTrigger = target;
    }, true);
    doc.addEventListener('focusin', (event) => {
      if (active && active.open && !active.overlay.contains(event.target)) focusDialog(active);
    }, true);
    doc.addEventListener('keydown', (event) => {
      if (!active || !active.overlay.classList.contains('open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        active.overlay.querySelector(active.close).click();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = controls(active);
      const first = items[0] || active.box;
      const last = items[items.length - 1] || active.box;
      if (!items.length || (event.shiftKey && doc.activeElement === first) || (!event.shiftKey && doc.activeElement === last) || !active.box.contains(doc.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
      event.stopImmediatePropagation();
    }, true);
    const observer = new MutationObserver(syncDialogs);
    for (const dialog of dialogs) observer.observe(dialog.overlay, { attributes: true, attributeFilter: ['class'] });
    syncDialogs();
  }

  function resolvedTheme() {
    let mode = 'system';
    try { mode = localStorage.getItem(THEME_KEY) || 'system'; } catch (_) {}
    return mode === 'dark' || mode === 'light' ? mode : media.matches ? 'dark' : 'light';
  }

  function applyFrameTheme() {
    const doc = frame && frame.contentDocument;
    if (!doc || !doc.head || !doc.getElementById('previewWrap')) return;
    doc.documentElement.dataset.resolvedTheme = resolvedTheme();
    let style = doc.getElementById('cecp-editor-frame-style');
    if (!style) {
      style = doc.createElement('link');
      style.id = 'cecp-editor-frame-style';
      style.rel = 'stylesheet';
      style.href = new URL('./editor-adapter.css', location.href).href;
      doc.head.appendChild(style);
    }
    doc.documentElement.classList.add('cecp-editor-frame');
    installDialogs(doc, [
      { id: 'importOverlay', box: '.import-box', title: '.import-label', initial: '#importTA', close: '.import-cancel', openerSelector: '[data-action="import"]' },
      { id: 'lyfillOverlay', box: '.lyfill-box', title: '.lyfill-label', initial: '#lyfillTA', close: '.lyfill-cancel', openerSelector: '[data-action="bulk-lyric"]' },
      { id: 'checkOverlay', box: '.check-box', title: '.check-title', initial: '.lyfill-cancel', close: '.lyfill-cancel', openerSelector: '[data-action="check"]' },
    ]);
  }

  function applyTheme() {
    const theme = resolvedTheme();
    document.documentElement.dataset.resolvedTheme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0E0E0E' : '#F4EFE7';
    applyFrameTheme();
  }

  function makeCardsAccessible() {
    for (const id of ['jf', 'lrc']) {
      const card = document.getElementById('mt-card-' + id);
      if (!card) continue;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        card.click();
      });
    }
    const back = document.getElementById('mt-back');
    if (back) back.textContent = '← 工具箱';
    const toggle = document.getElementById('mt-toggle');
    if (toggle) {
      toggle.tabIndex = 0;
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-label', '自动滚动歌词');
      const updateToggle = () => toggle.setAttribute('aria-checked', String(toggle.classList.contains('on')));
      toggle.addEventListener('click', updateToggle);
      toggle.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        toggle.click();
      });
      updateToggle();
    }
  }

  async function prepareOfflineEditor() {
    if (!('serviceWorker' in navigator) || !('caches' in window)) return;
    const status = document.getElementById('cecp-editor-offline');
    try {
      const scope = new URL('../', location.href);
      let registration = await navigator.serviceWorker.getRegistration(scope.href);
      if (!registration) registration = await navigator.serviceWorker.register(new URL('../sw.js', location.href).href, { scope: scope.pathname });
      await navigator.serviceWorker.ready;
      const cache = await caches.open(EDITOR_CACHE);
      // 只准备编辑器本身；图鉴和其渲染器在打开图鉴时由 SW 缓存。
      const names = ['index.html', 'theme-init.js', 'musictool.js', 'musictool.css', 'editor-adapter.js', 'editor-adapter.css'];
      await cache.addAll(names.map((name) => new URL('./' + name, location.href).href));
      status.textContent = '可离线使用';
    } catch (_) {
      status.textContent = navigator.onLine ? '' : '离线准备未完成';
    }
  }

  if (frame) {
    frame.title = '简谱编辑器';
    frame.addEventListener('load', applyFrameTheme);
  }
  window.addEventListener('storage', (event) => { if (event.key === THEME_KEY || event.key === null) applyTheme(); });
  if (media.addEventListener) media.addEventListener('change', applyTheme);
  applyTheme();
  makeCardsAccessible();
  installDialogs(document, [
    { id: 'mt-modal-info', box: '.mt-modal-box', title: '.mt-modal-title', initial: '#mt-meta-ar', close: '#mt-info-cancel', openerSelector: '#mt-btn-info' },
    { id: 'mt-modal-create', box: '.mt-modal-box', title: '.mt-modal-title', initial: '#mt-create-ta', close: '#mt-create-cancel', openerSelector: '#mt-btn-create' },
    { id: 'mt-modal-txt', box: '.mt-modal-box', title: '.mt-modal-title', initial: '#mt-txt-ta', close: '#mt-txt-cancel', openerSelector: '#mt-btn-txt' },
    { id: 'mt-tut', box: '.mt-tut-box', title: '#mt-tut-title', initial: '#mt-tut-next', close: '#mt-tut-close', openerSelector: '#mt-help-btn' },
  ]);
  const requestedTool = new URLSearchParams(location.search).get('tool');
  if (requestedTool === 'jf' || requestedTool === 'lrc') {
    const card = document.getElementById('mt-card-' + requestedTool);
    if (card) card.click();
  }
  prepareOfflineEditor();
})();
