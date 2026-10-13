/* Runs before CSS so every packaged editor page starts in the library's saved theme. */
(function () {
  'use strict';
  const key = 'cecp:musiclib:theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    let mode = 'system';
    try { mode = localStorage.getItem(key) || 'system'; } catch (_) {}
    const theme = mode === 'light' || mode === 'dark' ? mode : media.matches ? 'dark' : 'light';
    document.documentElement.dataset.resolvedTheme = theme;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = theme === 'dark' ? '#0E0E0E' : '#F4EFE7';
  }
  apply();
  window.addEventListener('storage', (event) => { if (event.key === key || event.key === null) apply(); });
  if (media.addEventListener) media.addEventListener('change', apply);
})();
