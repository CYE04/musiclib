import fs from 'node:fs';
import path from 'node:path';

const SONG_ID = /^[A-Za-z0-9_-]+$/;
const DEFAULT_ORIGIN = 'https://musiclib.cecp.it';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function normalizeCatalog(songs) {
  const unique = new Map();
  for (const song of songs) {
    if (!song || !SONG_ID.test(song.id || '')) continue;
    unique.set(song.id, {
      id: song.id,
      title: String(song.title || '诗歌'),
      artist: String(song.artist || song.source || ''),
      cover: String(song.cover || ''),
    });
  }
  return [...unique.values()].sort((first, second) => first.id.localeCompare(second.id));
}

export function readSongCatalog({ songsDirectory, catalogPath }) {
  if (!fs.existsSync(songsDirectory)) {
    if (!fs.existsSync(catalogPath)) throw new Error('歌曲分享目录缺失，请提供歌曲数据或 scripts/song-share-catalog.json。');
    return normalizeCatalog(JSON.parse(fs.readFileSync(catalogPath, 'utf8')));
  }
  const songs = fs.readdirSync(songsDirectory)
    .filter(name => name.endsWith('.json') && name !== 'test.json')
    .map(name => JSON.parse(fs.readFileSync(path.join(songsDirectory, name), 'utf8')));
  return normalizeCatalog(songs);
}

export function renderSongSharePage(html, song, { origin = DEFAULT_ORIGIN } = {}) {
  const siteOrigin = new URL(origin).origin;
  if (!/^https?:/.test(siteOrigin)) throw new Error('歌曲分享站点必须使用 HTTP 或 HTTPS 地址。');
  const songUrl = `${siteOrigin}/s/${encodeURIComponent(song.id)}/`;
  let imageUrl = `${siteOrigin}/icons/icon-512.png`;
  try {
    const cover = new URL(song.cover || imageUrl, siteOrigin);
    if (/^https?:$/.test(cover.protocol)) imageUrl = cover.href;
  } catch {}
  const title = song.artist ? `${song.title} — ${song.artist}` : song.title;
  const description = `在 CECP Music Library 收听《${song.title}》${song.artist ? ` · ${song.artist}` : ''}，查看歌词与歌谱。`;
  const tags = [
    '<base href="/">',
    `<title>${escapeHtml(title)} | CECP Music Library</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(songUrl)}">`,
    '<meta property="og:type" content="music.song">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    '<meta property="og:site_name" content="CECP Music Library">',
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(songUrl)}">`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(title)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
  ].join('\n    ');
  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:property|name)=["'](?:og:[^"']*|twitter:[^"']*|description)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<head\b[^>]*>/i, match => `${match}\n    ${tags}`);
}

export function generateSongSharePages({ outputDirectory, songs, origin }) {
  const html = fs.readFileSync(path.join(outputDirectory, 'index.html'), 'utf8');
  for (const song of normalizeCatalog(songs)) {
    const directory = path.join(outputDirectory, 's', song.id);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'index.html'), renderSongSharePage(html, song, { origin }));
  }
}

export function songSharePages() {
  let projectRoot;
  let outputDirectory;
  let songs;
  return {
    name: 'cecp-song-share-pages',
    apply: 'build',
    configResolved(config) {
      projectRoot = config.root;
      outputDirectory = path.resolve(projectRoot, config.build.outDir);
    },
    buildStart() {
      const catalogPath = path.join(projectRoot, 'scripts/song-share-catalog.json');
      songs = readSongCatalog({ songsDirectory: path.resolve(projectRoot, '../songs'), catalogPath });
      const catalog = JSON.stringify(songs, null, 2) + '\n';
      if (!fs.existsSync(catalogPath) || fs.readFileSync(catalogPath, 'utf8') !== catalog) {
        fs.writeFileSync(catalogPath, catalog);
      }
    },
    closeBundle() {
      generateSongSharePages({ outputDirectory, songs, origin: process.env.MUSICLIB_SHARE_ORIGIN || DEFAULT_ORIGIN });
      console.log(`  歌曲分享页面已生成：${songs.length} 首（静态 Open Graph）`);
    },
  };
}
