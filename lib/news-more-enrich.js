/**
 * Shared News & More page enrichment: hero + sections from community posts, optional related feed.
 * Used by server.js and scripts/prerender-public-site.js.
 *
 * Community posts can set syndicateNewsMoreSlugs / syndicateAsHeroOnNewsMoreSlugs from Admin
 * so one post is the single source of truth and appears on selected News & More pages.
 */

function sortedCommunityPosts(community) {
  const posts = community && Array.isArray(community.posts) ? community.posts : [];
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

/** Pinned first, then newest date (for hero + syndicated block order). */
function sortPostsForSyndication(posts) {
  return [...posts].sort((a, b) => {
    const ap = !!a.pinned;
    const bp = !!b.pinned;
    if (ap !== bp) return bp ? 1 : -1;
    return new Date(b.date) - new Date(a.date);
  });
}

function normalizeSlugArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  const s = String(v).trim();
  return s ? [s] : [];
}

function youtubeIdFromVideoUrl(vRaw) {
  if (!vRaw || typeof vRaw !== 'string') return '';
  const m = vRaw
    .trim()
    .match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}

/**
 * @param {object} page - raw page from news-more.json
 * @param {object} community - shape from loadCommunityForPublic()
 * @param {string} newsMoreSlug - e.g. "announcements" (required for syndication + hero from admin)
 */
function enrichNewsMorePage(page, community, newsMoreSlug) {
  if (!page || typeof page !== 'object') return page;
  const posts = (community && community.posts) || [];
  const byId = id => posts.find(p => p.id === id);
  const slug = typeof newsMoreSlug === 'string' ? newsMoreSlug.trim() : '';

  let heroImage = page.heroImage || '';
  let heroImageAlt = page.heroImageAlt || '';

  if (slug) {
    const heroCandidates = posts.filter(
      p =>
        normalizeSlugArray(p.syndicateAsHeroOnNewsMoreSlugs).includes(slug) &&
        p.imageUrl &&
        String(p.imageUrl).trim()
    );
    const heroPick = sortPostsForSyndication(heroCandidates)[0];
    if (heroPick) {
      heroImage = heroPick.imageUrl;
      heroImageAlt = page.heroImageAlt || heroPick.title || page.title || '';
    }
  }

  if (!heroImage && page.heroCommunityPostId) {
    const hp = byId(page.heroCommunityPostId);
    if (hp && hp.imageUrl) {
      heroImage = hp.imageUrl;
      heroImageAlt = page.heroImageAlt || hp.title || page.title || '';
    }
  }

  let sections = page.sections;
  if (Array.isArray(sections)) {
    sections = sections.map(block => {
      const b = { ...block };
      if (b.communityPostId) {
        const p = byId(b.communityPostId);
        if (p) {
          if (p.imageUrl && !b.image) {
            b.image = p.imageUrl;
            b.imageAlt = b.imageAlt || p.title;
          }
          const yid = youtubeIdFromVideoUrl(p.videoUrl);
          if (yid && !b.youtubeId) b.youtubeId = yid;
        }
      }
      return b;
    });
  }

  let syndicatedBlocks = [];
  if (slug) {
    const syn = posts.filter(p => normalizeSlugArray(p.syndicateNewsMoreSlugs).includes(slug));
    syndicatedBlocks = sortPostsForSyndication(syn);
  }

  let relatedCommunityPosts = [];
  const cat = page.relatedCommunityCategory;
  if (cat && typeof cat === 'string') {
    relatedCommunityPosts = sortedCommunityPosts(community).filter(p => p.category === cat);
    if (slug) {
      const synIds = new Set(syndicatedBlocks.map(p => p.id));
      relatedCommunityPosts = relatedCommunityPosts.filter(p => !synIds.has(p.id));
    }
    const lim = page.relatedCommunityLimit;
    if (typeof lim === 'number' && lim > 0) relatedCommunityPosts = relatedCommunityPosts.slice(0, lim);
    else relatedCommunityPosts = relatedCommunityPosts.slice(0, 12);
  }

  return {
    ...page,
    heroImage,
    heroImageAlt,
    sections,
    syndicatedBlocks,
    relatedCommunityPosts,
    relatedCommunityCategory: cat || ''
  };
}

/** Hub nav + News & More card grid: announcements has its own top-level header link. */
function filterHubCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.filter(c => c && c.slug !== 'announcements');
}

module.exports = {
  enrichNewsMorePage,
  sortedCommunityPosts,
  sortPostsForSyndication,
  normalizeSlugArray,
  youtubeIdFromVideoUrl,
  filterHubCards
};
