(function (global) {
  'use strict';
  if (global.CECPPlaylists) return;

  const STORAGE_KEY = 'cecp:musiclib:playlists:v1';
  const MAX_PLAYLISTS = 1000;
  const MAX_SONGS = 10000;
  class PlaylistError extends Error {
    constructor(code, message, cause) {
      super(message);
      this.name = 'PlaylistError';
      this.code = code;
      if (cause) this.cause = cause;
    }
  }
  const copy = record => record ? { ...record, songIds: record.songIds.slice() } : null;
  const validId = id => typeof id === 'string' && id.trim().length > 0 && id.length <= 200;
  function playlistName(value) {
    if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > 80) {
      throw new PlaylistError('invalid_name', '歌单名称不能为空，且不能超过 80 个字符。');
    }
    return value.trim();
  }
  function songIds(value) {
    if (!Array.isArray(value) || value.length > MAX_SONGS || value.some(id => !validId(id))) {
      throw new PlaylistError('invalid_songs', '歌曲列表必须包含有效的歌曲 ID，且不能超过 10000 首。');
    }
    return [...new Set(value)];
  }
  function createStore(options = {}) {
    const clock = options.now || (() => Date.now());
    const makeId = options.makeId || (() => global.crypto?.randomUUID?.() || 'pl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
    const error = (code, message, cause) => new PlaylistError(code, message, cause);
    function report(operation) {
      try { return operation(); }
      catch (failure) {
        try { options.onError?.(failure); } catch (_) { /* Error reporting cannot hide the original failure. */ }
        throw failure;
      }
    }
    function storage() {
      try {
        const target = options.storage === undefined ? global.localStorage : options.storage;
        if (!target || typeof target.getItem !== 'function' || typeof target.setItem !== 'function') throw new Error('Storage is unavailable');
        return target;
      } catch (cause) { throw error('storage_read', '无法读取本机歌单存储。请检查浏览器的存储权限。', cause); }
    }
    function load() {
      let raw;
      try { raw = storage().getItem(STORAGE_KEY); }
      catch (cause) {
        if (cause instanceof PlaylistError) throw cause;
        throw error('storage_read', '无法读取已保存的歌单。', cause);
      }
      if (raw === null) return [];
      try {
        const data = JSON.parse(raw);
        if (!data || data.version !== 1 || !Array.isArray(data.playlists) || data.playlists.length > MAX_PLAYLISTS) throw new Error('Invalid playlist envelope');
        const ids = new Set();
        return data.playlists.map(record => {
          if (!record || !validId(record.id) || ids.has(record.id) || playlistName(record.name) !== record.name ||
            !Number.isFinite(record.createdAt) || record.createdAt < 0 || !Number.isFinite(record.updatedAt) || record.updatedAt < record.createdAt) {
            throw new Error('Invalid playlist record');
          }
          ids.add(record.id);
          const normalized = songIds(record.songIds);
          if (normalized.length !== record.songIds.length) throw new Error('Duplicate song IDs');
          return { id: record.id, name: record.name, songIds: normalized, createdAt: record.createdAt, updatedAt: record.updatedAt };
        });
      } catch (cause) {
        // Never replace a damaged or newer saved value with an empty collection.
        throw error('corrupt_storage', '已保存的歌单数据无法读取，原始数据已保留。', cause);
      }
    }
    function timestamp(previous = 0) {
      const value = clock();
      if (!Number.isFinite(value) || value < 0) throw error('invalid_clock', '歌单保存时间无效。');
      return Math.max(previous, value);
    }
    function save(records, action, id) {
      try { storage().setItem(STORAGE_KEY, JSON.stringify({ version: 1, playlists: records })); }
      catch (cause) { throw error('storage_write', '歌单未能保存，可能是本机存储空间不足或浏览器禁止保存。', cause); }
      // Only announce a successful durable write. Event consumers receive a copy.
      try {
        global.dispatchEvent?.(new global.CustomEvent('cecp:playlistschange', {
          detail: { action, id, playlist: copy(records.find(record => record.id === id)) },
        }));
      } catch (_) { /* The saved record remains valid if a host cannot dispatch events. */ }
    }
    function requireId(id) {
      if (!validId(id)) throw error('invalid_id', '歌单 ID 无效。');
      return id;
    }
    function change(id, action, update) {
      const records = load();
      const record = records.find(item => item.id === requireId(id));
      if (!record) throw error('not_found', '此歌单不存在，可能已被删除。');
      if (update(record) !== false) {
        record.updatedAt = timestamp(record.updatedAt);
        save(records, action, id);
      }
      return copy(record);
    }
    return Object.freeze({
      storageKey: STORAGE_KEY,
      list: () => report(() => load().map(copy)),
      get: id => report(() => copy(load().find(record => record.id === requireId(id)))),
      create: name => report(() => {
        const normalized = playlistName(name), records = load();
        if (records.length >= MAX_PLAYLISTS) throw error('limit', '歌单数量已达到上限。');
        let id;
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = makeId();
          if (validId(candidate) && !records.some(record => record.id === candidate)) { id = candidate; break; }
        }
        if (!id) throw error('id_collision', '无法创建唯一的歌单 ID，请重试。');
        const at = timestamp();
        const record = { id, name: normalized, songIds: [], createdAt: at, updatedAt: at };
        records.push(record); save(records, 'create', id);
        return copy(record);
      }),
      rename: (id, name) => report(() => {
        const normalized = playlistName(name);
        return change(id, 'rename', record => { if (record.name === normalized) return false; record.name = normalized; });
      }),
      remove: id => report(() => {
        requireId(id);
        const records = load(), index = records.findIndex(record => record.id === id);
        if (index < 0) return false;
        records.splice(index, 1); save(records, 'remove', id); return true;
      }),
      addSongs: (id, ids) => report(() => {
        const additions = songIds(ids);
        return change(id, 'addSongs', record => {
          const next = [...new Set([...record.songIds, ...additions])];
          if (next.length > MAX_SONGS) throw error('limit', '单个歌单不能超过 10000 首歌。');
          if (next.length === record.songIds.length) return false;
          record.songIds = next;
        });
      }),
      removeSong: (id, songId) => report(() => {
        if (!validId(songId)) throw error('invalid_songs', '歌曲 ID 无效。');
        return change(id, 'removeSong', record => {
          const index = record.songIds.indexOf(songId);
          if (index < 0) return false;
          record.songIds.splice(index, 1);
        });
      }),
      moveSong: (id, from, to) => report(() => change(id, 'moveSong', record => {
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= record.songIds.length || to >= record.songIds.length) {
          throw error('invalid_position', '歌曲排序位置无效。');
        }
        if (from === to) return false;
        const [songId] = record.songIds.splice(from, 1); record.songIds.splice(to, 0, songId);
      })),
    });
  }
  global.CECPPlaylists = Object.freeze({ createStore, storageKey: STORAGE_KEY, PlaylistError });
})(window);
