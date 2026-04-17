/**
 * Shared News & More page enrichment: hero + sections from community posts, optional related feed.
 * Used by server.js and scripts/prerender-public-site.js.
 */

function sortedCommunityPosts(community) {
  const posts = community && Array.isArray(community.posts) ? community.posts : [];
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
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
 */
function enrichNewsMorePage(page, community) {
  if (!page || typeof page !== 'object') return page;
  const posts = (community && community.posts) || [];
  const byId = id => posts.find(p => p.id === id);

  let heroImage = page.heroImage || '';
  let heroImageAlt = page.heroImageAlt || '';

  if (page.heroCommunityPostId) {
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

  let relatedCommunityPosts = [];
  const cat = page.relatedCommunityCategory;
  if (cat && typeof cat === 'string') {
    relatedCommunityPosts = sortedCommunityPosts(community).filter(p => p.category === cat);
    const lim = page.relatedCommunityLimit;
    if (typeof lim === 'number' && lim > 0) relatedCommunityPosts = relatedCommunityPosts.slice(0, lim);
    else relatedCommunityPosts = relatedCommunityPosts.slice(0, 12);
  }

  return {
    ...page,
    heroImage,
    heroImageAlt,
    sections,
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
  youtubeIdFromVideoUrl,
  filterHubCards
};
