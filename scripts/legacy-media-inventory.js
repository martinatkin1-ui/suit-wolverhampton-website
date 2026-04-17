/**
 * Legacy media inventory for suitrecoverywolverhampton.com (Squarespace).
 * Fetches HTML from sitemap URLs (or fallback list), extracts images / video hints / embeds,
 * writes data/legacy-media-manifest.json for mapping into programmes.json, EJS, or CMS.
 *
 * Usage:
 *   node scripts/legacy-media-inventory.js
 *   node scripts/legacy-media-inventory.js --max=40
 *   node scripts/legacy-media-inventory.js --no-sitemap
 *
 * Ethics: polite delay between requests; identify as migration tooling.
 */

const fs = require('fs');
const path = require('path');

const BASE = 'https://www.suitrecoverywolverhampton.com';
const DELAY_MS = 650;
/* Squarespace returns 406 for some bots on sitemap; use a normal browser UA for reliable fetches. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'legacy-media-manifest.json');
const URLS_FILE = path.join(__dirname, 'legacy-urls.json');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchText(url, accept = 'text/html,application/xhtml+xml,*/*') {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: accept },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function normalizeImageUrl(u) {
  if (!u || typeof u !== 'string') return null;
  let s = u.trim();
  if (s.startsWith('//')) s = 'https:' + s;
  if (!s.startsWith('http')) return null;
  // Strip Squarespace size params for dedupe key (keep full URL in output)
  const noQuery = s.split('?')[0];
  return { full: s, key: noQuery };
}

function extractFromHtml(html, pageUrl) {
  const images = [];
  const seen = new Set();

  const pushImg = (raw, context) => {
    const n = normalizeImageUrl(raw);
    if (!n) return;
    if (seen.has(n.key)) return;
    seen.add(n.key);
    images.push({ src: n.full, dedupeKey: n.key, context });
  };

  // <img src="...">
  const imgTag = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = imgTag.exec(html)) !== null) pushImg(m[1], 'img-src');

  // srcset=
  const srcset = /srcset=["']([^"']+)["']/gi;
  while ((m = srcset.exec(html)) !== null) {
    const parts = m[1].split(',').map(p => p.trim().split(/\s+/)[0]);
    parts.forEach(p => pushImg(p, 'srcset'));
  }

  // data-image="https://..."
  const dataImage = /data-image=["'](https?:[^"']+)["']/gi;
  while ((m = dataImage.exec(html)) !== null) pushImg(m[1], 'data-image');

  // Squarespace JSON blobs (common in static1)
  const sq = /https:\/\/images\.squarespace-cdn\.com\/[^"'\\\s>]+/gi;
  while ((m = sq.exec(html)) !== null) {
    const cleaned = m[0].replace(/\\u0026/g, '&').replace(/&quot;.*$/, '');
    pushImg(cleaned.split('&quot;')[0], 'embedded-url');
  }

  // Open Graph / Twitter
  const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (og) pushImg(og[1], 'og:image');

  const videos = [];
  const vTag = /<video[^>]+src=["']([^"']+)["']/gi;
  while ((m = vTag.exec(html)) !== null) {
    const n = normalizeImageUrl(m[1]);
    if (n) videos.push({ src: n.full, context: 'video-src' });
  }

  const embeds = [];
  const yt = /https:\/\/(?:www\.)?youtube\.com\/(?:embed\/|watch\?v=)([a-zA-Z0-9_-]{11})/g;
  while ((m = yt.exec(html)) !== null) {
    embeds.push({ type: 'youtube', id: m[1], watchUrl: `https://www.youtube.com/watch?v=${m[1]}` });
  }

  const ig = /https:\/\/www\.instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/g;
  while ((m = ig.exec(html)) !== null) {
    embeds.push({ type: 'instagram', shortcode: m[1] });
  }

  // Page title hint
  const titleM = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i.exec(html);
  const title = titleM ? titleM[1] : null;

  return { images, videos, embeds, titleHint: title, pageUrl };
}

function parseArgs() {
  const args = process.argv.slice(2);
  let max = 60;
  let useSitemap = true;
  for (const a of args) {
    if (a.startsWith('--max=')) max = Math.min(500, parseInt(a.slice(6), 10) || 60);
    if (a === '--no-sitemap') useSitemap = false;
  }
  return { max, useSitemap };
}

function loadPathMapTo() {
  const raw = JSON.parse(fs.readFileSync(URLS_FILE, 'utf8'));
  const map = {};
  for (const row of raw.paths || []) {
    map[row.path] = row.mapTo || null;
  }
  return map;
}

async function loadSeedUrls() {
  const raw = JSON.parse(fs.readFileSync(URLS_FILE, 'utf8'));
  return (raw.paths || []).map(row => ({
    url: BASE + row.path,
    path: row.path,
    mapTo: row.mapTo || null
  }));
}

async function discoverSitemapUrls(limit) {
  const text = await fetchText(
    `${BASE}/sitemap.xml`,
    'application/xml,text/xml,text/plain,*/*'
  );
  const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(x => x[1].trim())
    .filter(u => /suitrecoverywolverhampton\.com/i.test(u));
  return locs.slice(0, limit);
}

async function main() {
  const { max, useSitemap } = parseArgs();
  let targets = [];

  const pathMapTo = loadPathMapTo();

  if (useSitemap) {
    try {
      const urls = await discoverSitemapUrls(max);
      targets = urls.map(u => {
        let p = '';
        try {
          p = new URL(u).pathname;
        } catch {
          p = u;
        }
        return { url: u, path: p, mapTo: pathMapTo[p] || null };
      });
      console.log(`Sitemap: ${targets.length} URLs (cap ${max})`);
    } catch (e) {
      console.warn('Sitemap failed:', e.message, '— using legacy-urls.json');
      targets = await loadSeedUrls();
    }
  } else {
    targets = await loadSeedUrls();
  }

  const pages = [];
  const globalImages = new Map();

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    process.stdout.write(`\r[${i + 1}/${targets.length}] ${t.path || t.url} `);
    try {
      const html = await fetchText(t.url);
      const extracted = extractFromHtml(html, t.url);
      pages.push({
        path: t.path,
        url: t.url,
        mapTo: t.mapTo,
        titleHint: extracted.titleHint,
        imageCount: extracted.images.length,
        images: extracted.images,
        videos: extracted.videos,
        embeds: extracted.embeds
      });
      extracted.images.forEach(img => {
        if (!globalImages.has(img.dedupeKey)) globalImages.set(img.dedupeKey, { ...img, pages: [] });
        globalImages.get(img.dedupeKey).pages.push(t.path || t.url);
      });
    } catch (err) {
      pages.push({
        path: t.path,
        url: t.url,
        mapTo: t.mapTo,
        error: err.message
      });
    }
    await sleep(DELAY_MS);
  }

  process.stdout.write('\n');

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceSite: BASE,
    stats: {
      pagesFetched: pages.filter(p => !p.error).length,
      pagesFailed: pages.filter(p => p.error).length,
      uniqueImages: globalImages.size
    },
    pages,
    uniqueImages: [...globalImages.values()].sort((a, b) => b.pages.length - a.pages.length)
  };

  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Wrote ${OUT}`);
  console.log(`Unique images: ${manifest.stats.uniqueImages}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
