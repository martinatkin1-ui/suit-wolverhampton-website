/**
 * Timeline updates for Community, Cultural outreach, and News & More pages.
 * Stored in data/page-updates.json; media in public/uploads/page-updates/
 *
 * Each item uses `categories` (e.g. c:art, o:polish, nm:gallery) to decide which
 * pages show the update. Legacy items with only scope/slug still work.
 * /news-more/announcements lists every update (master feed).
 */
const fs = require('fs');
const path = require('path');

/** Override with absolute path for hermetic tests (see tests/page-updates.test.js). */
const DATA_DIR =
  process.env.SUIT_TEST_DATA_DIR != null && String(process.env.SUIT_TEST_DATA_DIR).trim() !== ''
    ? path.resolve(process.env.SUIT_TEST_DATA_DIR)
    : path.join(__dirname, '..', 'data');
const PAGE_UPDATES_FILE = 'page-updates.json';
const ANNOUNCEMENTS_SLUG = 'announcements';

function readJSON(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function loadRaw() {
  const j = readJSON(PAGE_UPDATES_FILE);
  if (!j || typeof j !== 'object') return { items: [] };
  if (!Array.isArray(j.items)) j.items = [];
  return j;
}

function pageKeyStr(scope, slug) {
  const s = slug == null || slug === '' ? '' : String(slug);
  return `${scope}|||${s}`;
}

/** @returns {Map<string, Array<{scope: string, slug: string|null}>>} */
function getCategoryTargetMap() {
  const defs = buildUpdateCategoryDefinitions();
  const m = new Map();
  defs.forEach((d) => m.set(d.id, d.targets));
  return m;
}

function collectItemPageKeys(item) {
  const keys = new Set();
  const add = (scope, slug) => keys.add(pageKeyStr(scope, slug));

  if (item && Array.isArray(item.categories) && item.categories.length) {
    const map = getCategoryTargetMap();
    item.categories.forEach((cid) => {
      const tgts = map.get(String(cid));
      if (tgts) tgts.forEach((t) => add(t.scope, t.slug));
    });
    return keys;
  }

  if (item && item.scope) {
    add(item.scope, item.slug);
  }
  return keys;
}

function itemMatchesPageKey(item, pageKey) {
  return collectItemPageKeys(item).has(pageKey);
}

/**
 * @param {string} scope - 'community' | 'outreach-hub' | 'outreach' | 'news-more-hub' | 'news-more'
 * @param {string|null} slug
 */
function getPageUpdates(scope, slug) {
  const j = loadRaw();
  const wantSlug = slug == null || slug === '' ? null : String(slug);

  if (scope === 'news-more' && wantSlug === ANNOUNCEMENTS_SLUG) {
    return [...j.items].sort(
      (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    );
  }

  const pageKey = pageKeyStr(scope, wantSlug);
  return j.items
    .filter((i) => i && itemMatchesPageKey(i, pageKey))
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
}

/** Admin: grouped checkboxes — community | outreach | newsMore */
function buildUpdateCategoryDefinitions() {
  const o = readJSON('cultural-outreach.json') || {};
  const nm = readJSON('news-more.json') || {};
  const cm = { scope: 'community', slug: null };
  const defs = [];

  const communityRows = [
    ['c:general', 'Community (general)'],
    ['c:art', 'Art'],
    ['c:music', 'Music'],
    ['c:drama', 'Drama'],
    ['c:events', 'Events'],
    ['c:pride', 'PRIDE'],
    ['c:cultural', 'Cultural']
  ];
  communityRows.forEach(([id, label]) => {
    defs.push({ id, label, group: 'community', targets: [cm] });
  });

  defs.push({
    id: 'o:hub',
    label: 'Cultural Outreach (hub)',
    group: 'outreach',
    targets: [{ scope: 'outreach-hub', slug: null }]
  });

  (Array.isArray(o.cards) ? o.cards : []).forEach((c) => {
    if (!c || !c.slug) return;
    defs.push({
      id: `o:${c.slug}`,
      label: `Outreach — ${c.title || c.slug}`,
      group: 'outreach',
      targets: [{ scope: 'outreach', slug: c.slug }]
    });
  });

  defs.push({
    id: 'nm:hub',
    label: 'News & More (hub)',
    group: 'newsMore',
    targets: [{ scope: 'news-more-hub', slug: null }]
  });

  Object.keys(nm.pages || {}).forEach((slug) => {
    const p = nm.pages[slug];
    defs.push({
      id: `nm:${slug}`,
      label: `News & More — ${p && p.title ? p.title : slug}`,
      group: 'newsMore',
      targets: [{ scope: 'news-more', slug }]
    });
  });

  return defs;
}

function groupCategoryDefinitionsForAdmin() {
  const defs = buildUpdateCategoryDefinitions();
  return {
    community: defs.filter((d) => d.group === 'community'),
    outreach: defs.filter((d) => d.group === 'outreach'),
    newsMore: defs.filter((d) => d.group === 'newsMore')
  };
}

function categoryLabelById() {
  const defs = buildUpdateCategoryDefinitions();
  return Object.fromEntries(defs.map((d) => [d.id, d.label]));
}

function normalizeCategoryIdsFromBody(body) {
  let raw = body && body.categories;
  if (raw == null) return [];
  if (!Array.isArray(raw)) raw = [raw];
  return [...new Set(raw.map((x) => String(x).trim()).filter(Boolean))];
}

function validateCategoryIds(ids) {
  const valid = new Set(Array.from(getCategoryTargetMap().keys()));
  return ids.length > 0 && ids.every((id) => valid.has(id));
}

function inferLegacyCategories(item) {
  if (!item || !item.scope) return [];
  if (item.scope === 'community') return ['c:general'];
  if (item.scope === 'outreach-hub') return ['o:hub'];
  if (item.scope === 'news-more-hub') return ['nm:hub'];
  if (item.scope === 'outreach' && item.slug) return [`o:${item.slug}`];
  if (item.scope === 'news-more' && item.slug) return [`nm:${item.slug}`];
  return [];
}

function categoriesForAdminFormItem(item) {
  if (!item) return [];
  if (Array.isArray(item.categories) && item.categories.length) return item.categories;
  return inferLegacyCategories(item);
}

/** @deprecated kept for any old deep-links; categories-only saves now */
function parseTargetKey(key) {
  if (!key || typeof key !== 'string') return { scope: 'community', slug: null };
  const k = key.trim();
  if (k === 'community') return { scope: 'community', slug: null };
  if (k === 'outreach-hub') return { scope: 'outreach-hub', slug: null };
  if (k === 'news-more-hub') return { scope: 'news-more-hub', slug: null };
  const i = k.indexOf('|');
  if (i < 0) return { scope: 'community', slug: null };
  const scope = k.slice(0, i);
  const slug = k.slice(i + 1).trim() || null;
  return { scope, slug };
}

function validateTarget(scope, slug) {
  const o = readJSON('cultural-outreach.json') || {};
  const nm = readJSON('news-more.json') || {};
  const outreachSlugs = new Set([
    ...Object.keys(o.programmes || {}),
    ...(Array.isArray(o.cards) ? o.cards.map((c) => c && c.slug).filter(Boolean) : [])
  ]);
  const nmSlugs = new Set(Object.keys(nm.pages || {}));

  if (scope === 'community') return slug == null || slug === '';
  if (scope === 'outreach-hub') return slug == null || slug === '';
  if (scope === 'news-more-hub') return slug == null || slug === '';
  if (scope === 'outreach') return !!slug && outreachSlugs.has(String(slug));
  if (scope === 'news-more') return !!slug && nmSlugs.has(String(slug));
  return false;
}

/** Dropdown options for admin: { key, label } — legacy list page labels */
function buildAdminTargetOptions() {
  const o = readJSON('cultural-outreach.json') || {};
  const nm = readJSON('news-more.json') || {};
  const opts = [
    { key: 'community', label: 'In the Community (main page)' },
    { key: 'outreach-hub', label: 'Cultural Outreach (hub)' }
  ];
  (Array.isArray(o.cards) ? o.cards : []).forEach((c) => {
    if (c && c.slug) {
      opts.push({
        key: `outreach|${c.slug}`,
        label: `Cultural Outreach — ${c.title || c.slug}`
      });
    }
  });
  opts.push({ key: 'news-more-hub', label: 'News & More (hub)' });
  Object.keys(nm.pages || {}).forEach((slug) => {
    const p = nm.pages[slug];
    opts.push({
      key: `news-more|${slug}`,
      label: `News & More — ${p && p.title ? p.title : slug}`
    });
  });
  return opts;
}

module.exports = {
  getPageUpdates,
  loadRaw,
  buildAdminTargetOptions,
  buildUpdateCategoryDefinitions,
  groupCategoryDefinitionsForAdmin,
  categoryLabelById,
  normalizeCategoryIdsFromBody,
  validateCategoryIds,
  categoriesForAdminFormItem,
  validateTarget,
  parseTargetKey,
  pageKeyStr,
  itemMatchesPageKey,
  collectItemPageKeys,
  ANNOUNCEMENTS_SLUG,
  PAGE_UPDATES_FILE,
  DATA_DIR
};
