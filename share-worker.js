const SONG_SOURCE = 'https://raw.githubusercontent.com/CYE04/songs/main/';
const SONG_PATH = /^\/s\/([A-Za-z0-9_-]{1,128})\/?$/;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

async function readLimitedText(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('Share response exceeds size limit');
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new Error('Share response exceeds size limit');
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function renderShareHtml(html, song, id, origin) {
  const title = String(song.title || '诗歌').slice(0, 300);
  const artist = String(song.artist || song.source || '').slice(0, 300);
  const heading = artist ? `${title} — ${artist}` : title;
  const songUrl = `${origin}/s/${id}/`;
  let image = `${origin}/icons/icon-512.png`;
  try {
    const cover = new URL(song.cover || image, origin);
    if (/^https?:$/.test(cover.protocol)) image = cover.href;
  } catch (_) {}
  const description = `在 CECP Music Library 收听《${title}》${artist ? ` · ${artist}` : ''}，查看歌词与歌谱。`;
  const properties = {
    'og:type': 'music.song', 'og:title': heading, 'og:site_name': 'CECP Music Library',
    'og:description': description, 'og:url': songUrl, 'og:image': image, 'og:image:alt': heading,
  };
  const names = { description, 'twitter:card': 'summary_large_image', 'twitter:title': heading, 'twitter:description': description, 'twitter:image': image };
  const tags = [
    '<base href="/">',
    `<title>${escapeHtml(heading)} | CECP Music Library</title>`,
    `<link rel="canonical" href="${escapeHtml(songUrl)}">`,
    ...Object.entries(properties).map(([property, content]) => `<meta property="${property}" content="${escapeHtml(content)}">`),
    ...Object.entries(names).map(([name, content]) => `<meta name="${name}" content="${escapeHtml(content)}">`),
  ].join('\n');
  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:property|name)=["'](?:og:[^"']*|twitter:[^"']*|description)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<head\b[^>]*>/i, match => `${match}\n${tags}`);
}

function errorResponse(status, method, id = '') {
  const missing = status === 404;
  const title = missing ? '找不到这首诗歌' : '分享预览暂时不可用';
  const message = missing ? '这首诗歌可能已移除，请返回诗歌库查找。' : '请稍后重试，或直接进入诗歌库打开歌曲。';
  const link = '/?key=cecp2026' + (id ? '&song=' + encodeURIComponent(id) : '');
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} · CECP Music Library</title><style>body{margin:0;padding:32px;background:#151515;color:#f5f1eb;font:16px/1.8 system-ui,sans-serif}main{max-width:520px;margin:20vh auto}h1{font-size:24px}p{color:#bbb}a{display:inline-block;color:#ffa66b;padding:12px 0}</style></head><body><main><h1>${title}</h1><p>${message}</p><a href="${escapeHtml(link)}">进入 CECP Music Library</a></main></body></html>`;
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };
  if (status === 503) headers['Retry-After'] = '60';
  return new Response(method === 'HEAD' ? null : html, { status, headers });
}

export async function handleShareRequest(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/s/')) return env.ASSETS.fetch(request);
  const match = url.pathname.match(SONG_PATH);
  if (!match) return errorResponse(404, request.method);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
  }
  const id = match[1];
  try {
    const source = await fetcher(SONG_SOURCE + id + '.json', {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000),
      cf: { cacheEverything: true, cacheTtl: 300, cacheTtlByStatus: { '200-299': 300, '400-599': -1 } },
    });
    if (source.status === 404) return errorResponse(404, request.method);
    if (!source.ok) throw new Error('Song source unavailable');
    const song = JSON.parse(await readLimitedText(source, 1024 * 1024));
    if (!song || Array.isArray(song) || typeof song !== 'object' || (song.id && song.id !== id)) throw new Error('Invalid song data');
    const shell = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: { Accept: 'text/html' } }));
    if (!shell.ok || !shell.headers.get('content-type')?.includes('text/html')) throw new Error('Library shell unavailable');
    const html = renderShareHtml(await readLimitedText(shell, 128 * 1024), song, id, url.origin);
    const headers = new Headers(shell.headers);
    for (const name of ['etag', 'last-modified', 'content-length', 'content-encoding']) headers.delete(name);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'public, max-age=0, s-maxage=300');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(request.method === 'HEAD' ? null : html, { headers });
  } catch (_) {
    return errorResponse(503, request.method, id);
  }
}

export default {
  fetch(request, env) { return handleShareRequest(request, env); },
};
