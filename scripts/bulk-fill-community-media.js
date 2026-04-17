/**
 * Fill community post imageUrl / videoUrl from data/legacy-media-manifest.json.
 *
 * Rules:
 * - Only touches posts with BOTH imageUrl and videoUrl empty (skips e.g. liver scans).
 * - Video is taken ONLY from legacy pages listed in videoPaths — never from imagePaths.
 *   (Avoids attaching the same conference promo clip to unrelated stories.)
 *
 * Usage: node scripts/bulk-fill-community-media.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const manifestPath = path.join(ROOT, 'data', 'legacy-media-manifest.json');
const communityPath = path.join(ROOT, 'data', 'community.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const byPath = Object.fromEntries(manifest.pages.map(p => [p.path, p]));

function skipImageUrl(u) {
  if (!u || typeof u !== 'string') return true;
  const s = u.toLowerCase();
  if (s.includes('wvca_logo') || s.includes('wvca+logo') || s.includes('with+credit')) return true;
  if (s.includes('imgg-gi3')) return true;
  if (s.includes('sunburst')) return true;
  if (s.includes('cranberry-splash') || s.includes('blueberry-sky') || s.includes('amber-glow')) return true;
  if (s.includes('emerald-mist') || s.includes('creamy-peach') || s.includes('sapphire-dream')) return true;
  if (s.includes('mint-breeze') || s.includes('deep-space')) return true;
  if (s.includes('turquoise-tide') || s.includes('snowy-mountains')) return true;
  if (s.includes('asylum+logo')) return true;
  if (s.includes('social+media+post+logo')) return true;
  if (s.endsWith('/oip.webp')) return true;
  if (s.includes('unsplash-image')) return true;
  if (s.includes('mmo.aiircdn.com')) return true;
  return false;
}

function pickImage(paths) {
  for (const pth of paths) {
    const page = byPath[pth];
    if (!page?.images?.length) continue;
    for (const img of page.images) {
      const src = img.src || '';
      if (!skipImageUrl(src)) return src;
    }
  }
  return '';
}

function pickYoutube(paths) {
  if (!paths || !paths.length) return '';
  for (const pth of paths) {
    const page = byPath[pth];
    const embeds = page?.embeds || [];
    const yt = embeds.find(e => e.type === 'youtube' && e.watchUrl);
    if (yt) return yt.watchUrl;
  }
  return '';
}

/** post id -> imagePaths[], videoPaths[] (video only if you want a YouTube embed from those pages) */
const RULES = {
  'post-british-library-2026': { imagePaths: ['/publications'], videoPaths: [] },
  'post-profile-art-gallery-2026': { imagePaths: ['/asylum-artist-quarter', '/gallery'], videoPaths: [] },
  'post-mental-health-drop-in-2026': { imagePaths: ['/announcements', '/leag'], videoPaths: [] },
  'post-liver-scans-2025': { imagePaths: [], videoPaths: [] },
  'post-yoga-with-cate': { imagePaths: ['/gallery', '/announcements'], videoPaths: [] },
  'post-halloween-tattoo-bash-2025': { imagePaths: ['/gallery', '/conferences'], videoPaths: [] },
  'post-national-recovery-walk-2025': { imagePaths: ['/conferences', '/gallery'], videoPaths: [] },
  'post-favor-uk-conference-2025': { imagePaths: ['/conferences'], videoPaths: ['/conferences'] },
  'post-drama-performance-2024': { imagePaths: ['/drama'], videoPaths: ['/drama'] },
  'post-wolverhampton-pride-2024': { imagePaths: ['/gallery', '/announcements'], videoPaths: [] },
  'post-ddn-conference-2024': { imagePaths: ['/conferences'], videoPaths: [] },
  'post-pop-art-recovery-2024': { imagePaths: ['/artists', '/gallery'], videoPaths: [] },
  'post-forest-faced-2025': { imagePaths: ['/the-forest-faced'], videoPaths: ['/the-forest-faced'] },
  'post-asylum-artist-quarter': { imagePaths: ['/asylum-artist-quarter'], videoPaths: [] },
  'post-ddn-conference-2023': { imagePaths: ['/conferences'], videoPaths: [] },
  'post-aquarius-conference-2024': { imagePaths: ['/conferences', '/gallery'], videoPaths: [] },
  'post-clero-membership': { imagePaths: ['/conferences', '/announcements'], videoPaths: [] },
  'post-literature-festival': { imagePaths: ['/wolverhampton-literature-festival'], videoPaths: [] },
  'post-geese-theatre-2023': { imagePaths: ['/drama'], videoPaths: ['/drama'] },
  'post-wolves-foundation-2023': { imagePaths: ['/creative-arts', '/volunteering'], videoPaths: [] },
  'post-cultural-engagement-2020': { imagePaths: ['/punjabi-project-1', '/announcements'], videoPaths: ['/punjabi-project-1'] },
  'post-hospital-dalt-2022': { imagePaths: ['/announcements'], videoPaths: [] },
  'post-smart-recovery': { imagePaths: ['/smart-recovery'], videoPaths: [] },
  'post-art-group-weekly': { imagePaths: ['/creative-arts', '/gallery'], videoPaths: [] },
  'post-music-sessions': { imagePaths: ['/gallery', '/creative-arts'], videoPaths: [] },
  'post-recovery-ambassadors-programme': { imagePaths: ['/volunteering', '/leag'], videoPaths: [] },
  'post-leag-launch-2025': { imagePaths: ['/leag', '/announcements'], videoPaths: [] },
  'post-karolina-music-video-2024': { imagePaths: ['/podcasts'], videoPaths: ['/podcasts'] }
};

const community = JSON.parse(fs.readFileSync(communityPath, 'utf8'));
let updated = 0;

for (const post of community.posts) {
  const rule = RULES[post.id];
  if (!rule) continue;

  const hadImg = String(post.imageUrl || '').trim();
  const hadVid = String(post.videoUrl || '').trim();
  if (hadImg || hadVid) continue;

  const imagePaths = rule.imagePaths || [];
  const videoPaths = rule.videoPaths || [];

  const imageUrl = pickImage(imagePaths);
  const videoUrl = pickYoutube(videoPaths);

  if (imageUrl) post.imageUrl = imageUrl;
  if (videoUrl) post.videoUrl = videoUrl;
  if (imageUrl || videoUrl) {
    updated++;
    console.log(post.id, imageUrl ? 'image' : '', videoUrl ? 'video' : '');
  }
}

fs.writeFileSync(communityPath, JSON.stringify(community, null, 2), 'utf8');
console.log(`\nUpdated ${updated} posts → ${communityPath}`);
