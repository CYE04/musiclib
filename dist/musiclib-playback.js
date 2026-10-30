(function (global) {
  'use strict';

  function create(options) {
    const audio = options.audio;
    if (!audio || !audio.addEventListener) throw new TypeError('A media element is required');
    const doc = options.document || global.document;
    const win = options.window || global;
    const now = options.now || (() => Date.now());
    const clock = options.timers || global;
    const online = options.isOnline || (() => !global.navigator || global.navigator.onLine !== false);
    const listeners = [];
    const stallMs = options.stallMs || 15000;
    const maxReloads = options.maxReloads ?? 2;
    const maxPlayRetries = options.maxPlayRetries ?? 3;
    let wantsPlayback = false, phase = 'paused', blocked = false, destroyed = false;
    let generation = 0, request = 0, source = '', position = 0, lastProgress = now();
    let reloads = 0, playRetries = 0, nativePauseRetries = 0;
    let timer = null, due = Infinity, pendingRestore = null, restoreGeneration = 0;
    let context = null, contextListener = null, resumePromise = null;

    function getState() {
      return {
        phase, wantsPlayback, blocked, reloads, playRetries, nativePauseRetries,
        time: Number(audio.currentTime) || 0, paused: !!audio.paused,
        ended: !!audio.ended, readyState: audio.readyState, errorCode: audio.error?.code || null,
        context: context?.state || 'native', hidden: !!doc?.hidden,
        hasSource: !!audio.src, online: online(),
      };
    }
    function report(event) { try { options.onDiagnostic?.(event, getState()); } catch (_) {} }
    function setPhase(next) {
      if (phase === next) return;
      phase = next;
      try { options.onState?.(getState()); } catch (_) {}
    }
    function on(target, event, callback) {
      if (!target?.addEventListener) return;
      target.addEventListener(event, callback);
      listeners.push(() => target.removeEventListener(event, callback));
    }
    function clearTimer() {
      if (timer !== null) clock.clearTimeout(timer);
      timer = null; due = Infinity;
    }
    function cancelRestore() {
      restoreGeneration++;
      if (pendingRestore) pendingRestore();
      pendingRestore = null;
    }
    function schedule(delay = 4000) {
      if (destroyed || !wantsPlayback || blocked) return;
      const nextDue = now() + delay;
      if (timer !== null && due <= nextDue) return;
      clearTimer(); due = nextDue;
      timer = clock.setTimeout(() => {
        timer = null; due = Infinity;
        void recover('watchdog');
        schedule();
      }, delay);
    }
    function syncSource() {
      const next = audio.src || '';
      if (next === source) return;
      source = next; generation++; request++;
      cancelRestore(); reloads = 0; playRetries = 0; nativePauseRetries = 0;
      position = Number(audio.currentTime) || 0; lastProgress = now();
    }
    function systemInterrupted() {
      // Where available this prevents competing with phone calls/other audio focus.
      try { return options.getAudioSession?.()?.state === 'interrupted'; } catch (_) { return false; }
    }
    function resumeContext() {
      refreshContext();
      if (!context || context.state === 'running') return Promise.resolve(true);
      if (!['suspended', 'interrupted'].includes(context.state)) return Promise.resolve(false);
      if (systemInterrupted()) return Promise.resolve(false);
      if (resumePromise) return resumePromise;
      let result;
      try { result = context.resume(); } catch (error) { result = Promise.reject(error); }
      const current = context;
      resumePromise = Promise.resolve(result).then(() => current.state === 'running').catch(error => {
        report('context-resume-error:' + (error?.name || 'Error'));
        return false;
      }).finally(() => { resumePromise = null; });
      return resumePromise;
    }
    function refreshContext() {
      const next = options.getAudioContext?.() || null;
      if (context === next) return;
      if (context && contextListener) context.removeEventListener('statechange', contextListener);
      context = next; resumePromise = null;
      if (!context?.addEventListener) return;
      contextListener = () => {
        report('context-state');
        if (wantsPlayback && !blocked) void recover('context-state');
      };
      context.addEventListener('statechange', contextListener);
    }
    function attemptPlay(reason, automatic) {
      if (destroyed || !wantsPlayback || blocked || !audio.src) return Promise.resolve(false);
      if (automatic && systemInterrupted()) { setPhase('interrupted'); return Promise.resolve(false); }
      const owner = generation, id = ++request, selected = source;
      // Do not await context.resume(): explicit media play must retain its user gesture.
      void resumeContext();
      report('play-request:' + reason);
      let result;
      try { result = audio.play(); } catch (error) { result = Promise.reject(error); }
      return Promise.resolve(result).then(() => {
        if (destroyed || owner !== generation || id !== request || selected !== source || !wantsPlayback) return false;
        setPhase(audio.paused ? 'interrupted' : 'playing');
        schedule();
        return !audio.paused;
      }).catch(error => {
        if (destroyed || owner !== generation || id !== request || !wantsPlayback) return false;
        const name = error?.name || 'Error';
        report('play-error:' + name);
        if (name === 'NotAllowedError' || name === 'NotSupportedError') {
          blocked = true; clearTimer(); cancelRestore();
          setPhase(name === 'NotAllowedError' ? 'needs-user' : 'error');
        } else if (name !== 'AbortError') {
          setPhase(online() ? 'interrupted' : 'offline'); schedule(1500);
        }
        return false;
      });
    }
    function play(reason = 'user') {
      if (destroyed || !audio.src) return Promise.resolve(false);
      syncSource();
      wantsPlayback = true; blocked = false;
      reloads = 0; playRetries = 0; nativePauseRetries = 0;
      lastProgress = now(); position = Number(audio.currentTime) || 0;
      setPhase('loading'); schedule();
      return attemptPlay(reason, false);
    }
    function pause(reason = 'user') {
      wantsPlayback = false; generation++; request++;
      clearTimer(); cancelRestore();
      setPhase('paused'); report('pause-request:' + reason);
      audio.pause();
    }
    function prepareTrack(reason = 'track-change') {
      wantsPlayback = false; blocked = false; generation++; request++;
      clearTimer(); cancelRestore();
      source = ''; reloads = 0; playRetries = 0; nativePauseRetries = 0;
      position = 0; lastProgress = now(); setPhase('paused'); report(reason);
    }
    function reconnect(reason) {
      if (pendingRestore) return Promise.resolve(false);
      if (reloads >= maxReloads || playRetries >= maxPlayRetries) {
        blocked = true; clearTimer(); setPhase('needs-user'); report('recovery-exhausted');
        return Promise.resolve(false);
      }
      reloads++; playRetries++;
      const selected = source, owner = generation, restoreOwner = ++restoreGeneration;
      const savedPosition = Number(audio.currentTime) || position;
      const rate = audio.playbackRate, volume = audio.volume, muted = audio.muted;
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', restore);
        audio.removeEventListener('error', cleanup);
        if (pendingRestore === cleanup) pendingRestore = null;
      };
      const restore = () => {
        cleanup();
        if (destroyed || owner !== generation || restoreOwner !== restoreGeneration || audio.src !== selected || !wantsPlayback) return;
        try {
          audio.currentTime = Number.isFinite(audio.duration) ? Math.min(savedPosition, Math.max(0, audio.duration - .05)) : savedPosition;
          audio.playbackRate = rate; audio.volume = volume; audio.muted = muted;
        } catch (_) { report('position-restore-failed'); }
        position = savedPosition; lastProgress = now();
      };
      pendingRestore = cleanup;
      audio.addEventListener('loadedmetadata', restore);
      audio.addEventListener('error', cleanup);
      lastProgress = now(); setPhase('recovering'); report('stream-reconnect:' + reason);
      try { audio.load(); } catch (_) { cleanup(); return Promise.resolve(false); }
      // A pending seek survives resource selection in supporting browsers; metadata
      // performs the definitive restore. No cache-busting URL or object URL is used.
      try { audio.currentTime = savedPosition; } catch (_) {}
      return attemptPlay('stream-recovery', true);
    }
    function recover(reason = 'manual') {
      if (destroyed || !wantsPlayback || blocked || !audio.src || audio.ended) return Promise.resolve(false);
      syncSource(); refreshContext();
      if (systemInterrupted()) { setPhase('interrupted'); return Promise.resolve(false); }
      if (context && context.state !== 'running') {
        const owner = generation;
        setPhase('interrupted');
        // Reloading a healthy media stream cannot fix a suspended processing graph.
        return resumeContext().then(ok => {
          if (!ok || !wantsPlayback || destroyed || owner !== generation) return false;
          if (audio.paused && playRetries < maxPlayRetries) { playRetries++; return attemptPlay('context-recovery', true); }
          return !audio.paused;
        });
      }
      if (!online()) { setPhase('offline'); return Promise.resolve(false); }
      if (pendingRestore && now() - lastProgress >= stallMs) cancelRestore();
      const current = Number(audio.currentTime) || 0;
      if (Math.abs(current - position) > .05) { position = current; lastProgress = now(); }
      const code = audio.error?.code || 0;
      if (code === 3 || code === 4) {
        blocked = true; clearTimer(); cancelRestore(); setPhase('error'); report('unsupported-media:' + code);
        return Promise.resolve(false);
      }
      if (code === 2) return reconnect('network-error');
      if (audio.paused) {
        // In-app and Media Session pause controls must call pause() first. A bare
        // native pause has no portable cause field: make at most one background
        // attempt, then wait for a positive foreground/network/context signal.
        const signal = ['pageshow', 'visible', 'online', 'canplay', 'context-state', 'manual'].includes(reason);
        if (playRetries >= maxPlayRetries || (!signal && nativePauseRetries >= 1)) return Promise.resolve(false);
        if (!signal) nativePauseRetries++;
        playRetries++; lastProgress = now();
        return attemptPlay('interruption-recovery', true);
      }
      if (now() - lastProgress >= stallMs) return reconnect('stalled-clock');
      return Promise.resolve(true);
    }
    on(audio, 'playing', () => {
      if (!wantsPlayback) return;
      position = Number(audio.currentTime) || 0; lastProgress = now();
      setPhase('playing'); schedule();
    });
    on(audio, 'timeupdate', () => {
      const current = Number(audio.currentTime) || 0;
      if (Math.abs(current - position) > .05) { position = current; lastProgress = now(); }
    });
    on(audio, 'pause', () => {
      if (!wantsPlayback || destroyed || audio.ended || pendingRestore || !audio.paused) return;
      setPhase('interrupted'); report('native-pause'); schedule(1200);
    });
    for (const event of ['waiting', 'stalled']) on(audio, event, () => {
      if (!wantsPlayback || destroyed) return;
      setPhase('buffering'); report(event); schedule();
    });
    on(audio, 'error', () => {
      if (!wantsPlayback || destroyed) return;
      report('media-error'); schedule(500);
    });
    on(audio, 'canplay', () => { if (wantsPlayback && (audio.paused || audio.error)) void recover('canplay'); });
    on(audio, 'ended', () => { clearTimer(); cancelRestore(); setPhase('ended'); });
    on(doc, 'visibilitychange', () => {
      report(doc.hidden ? 'hidden' : 'visible');
      if (!doc.hidden) void recover('visible');
      else if (wantsPlayback) void resumeContext();
    });
    on(win, 'pageshow', () => { void recover('pageshow'); });
    on(win, 'online', () => { void recover('online'); });
    refreshContext();

    return {
      play, pause, prepareTrack, recover, refreshContext, getState,
      destroy() {
        if (destroyed) return;
        destroyed = true; wantsPlayback = false; generation++; request++;
        clearTimer(); cancelRestore(); listeners.forEach(remove => remove());
        if (context && contextListener) context.removeEventListener('statechange', contextListener);
      },
    };
  }

  global.CECPPlaybackController = Object.freeze({ create });
})(window);
