require('dotenv').config();
/**
 * SUIT Wolverhampton 2026 — Main Server
 * Express + EJS + JSON flat-file CMS
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Paths ────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// ─── Helpers ──────────────────────────────────────────
function readJSON(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error(`[readJSON] Invalid JSON: ${filename}`, err.message);
    return null;
  }
}
function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

/** Safe shape for public /community when data file is missing or partial */
function loadCommunityForPublic() {
  const raw = readJSON('community.json');
  if (!raw || typeof raw !== 'object') {
    return {
      intro: { subtext: 'Community updates will appear here soon.' },
      projects: {},
      posts: [],
      socialWindows: {}
    };
  }
  return {
    ...raw,
    intro: raw.intro && typeof raw.intro === 'object' ? raw.intro : { subtext: '' },
    projects: raw.projects && typeof raw.projects === 'object' ? raw.projects : {},
    posts: Array.isArray(raw.posts) ? raw.posts : [],
    socialWindows: raw.socialWindows && typeof raw.socialWindows === 'object' ? raw.socialWindows : {}
  };
}

/** Admin / persistence: require real file or initialise empty shell */
function loadCommunityForAdmin() {
  let c = readJSON('community.json');
  if (!c || typeof c !== 'object') {
    c = { intro: { subtext: '' }, projects: {}, posts: [], socialWindows: {} };
  }
  if (!Array.isArray(c.posts)) c.posts = [];
  if (!c.projects || typeof c.projects !== 'object') c.projects = {};
  if (!c.intro || typeof c.intro !== 'object') c.intro = { subtext: '' };
  if (!c.socialWindows || typeof c.socialWindows !== 'object') c.socialWindows = {};
  return c;
}

function sortedCommunityPosts(community) {
  const posts = community && Array.isArray(community.posts) ? community.posts : [];
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

/** Normalise pathname for legacy lookup (trailing slash except root). */
function normalizeLegacyPath(p) {
  if (typeof p !== 'string') return '/';
  const s = p.trim();
  if (!s || s === '/') return '/';
  return s.replace(/\/+$/, '') || '/';
}

/** Resolve mapTo from scripts/legacy-urls.json to a redirect URL. */
function resolveLegacyMapTo(mapTo) {
  const m = String(mapTo).trim();
  if (!m) return null;
  if (m.startsWith('/')) return m;
  if (m === 'home') return '/';
  if (m === 'about') return '/about';
  if (m === 'community') return '/community';
  if (m === 'services') return '/services';
  const progMatch = /^programme:(.+)$/.exec(m);
  if (progMatch) {
    const slug = progMatch[1].trim();
    if (!slug) return '/timetable';
    return `/timetable#programme-${encodeURIComponent(slug)}`;
  }
  const contentMatch = /^content:(.+)$/.exec(m);
  if (contentMatch) {
    const slug = contentMatch[1].trim();
    if (!slug) return '/community/outreach';
    return `/community/outreach/${encodeURIComponent(slug)}`;
  }
  return null;
}

function loadLegacyRedirectMap() {
  const map = new Map();
  const filePath = path.join(__dirname, 'scripts', 'legacy-urls.json');
  if (!fs.existsSync(filePath)) {
    console.warn('[legacy-urls] scripts/legacy-urls.json not found; legacy redirects disabled');
    return map;
  }
  let j;
  try {
    j = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn('[legacy-urls] invalid JSON:', err.message);
    return map;
  }
  const paths = Array.isArray(j.paths) ? j.paths : [];
  for (const row of paths) {
    if (!row || typeof row.path !== 'string' || typeof row.mapTo !== 'string') continue;
    const key = normalizeLegacyPath(row.path);
    const target = resolveLegacyMapTo(row.mapTo);
    if (!target) continue;
    if (!map.has(key)) map.set(key, target);
  }
  return map;
}

const LEGACY_REDIRECT_MAP = loadLegacyRedirectMap();

// Create default admin account if not exists
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
if (!fs.existsSync(ADMIN_FILE)) {
  const initialPw = process.env.ADMIN_INITIAL_PASSWORD || 'ChangeMe!2026';
  const hash = bcrypt.hashSync(initialPw, 10);
  writeJSON('admin.json', { username: 'admin', password: hash });
}

// ─── Multer (File Uploads) ────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = req.uploadDest || 'gallery';
    const dir = path.join(UPLOAD_DIR, dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for video
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype) || file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/');
    if (extOk || mimeOk) return cb(null, true);
    cb(new Error('Only image and video files are allowed'));
  }
});

// ─── Middleware ────────────────────────────────────────
const ejsMate = require('ejs-mate');
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
/* EJS resolves includes relative to the current file first; this fallback finds partials/ from views root. */
app.set('view options', {
  views: [path.join(__dirname, 'views')]
});
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://code.iconify.design https://api.iconify.design; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://images.squarespace-cdn.com https://*.ytimg.com; " +
    "frame-src https://www.youtube.com https://www.google.com; " +
    "connect-src 'self' https://api.iconify.design;"
  );
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(session({
  secret: process.env.SESSION_SECRET || (() => { throw new Error('SESSION_SECRET env var is required'); })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Make data available to all templates
app.use((req, res, next) => {
  res.locals.content = readJSON('content.json');
  const nm = readJSON('news-more.json');
  const nmNavFb = readJSON('news-more.nav-fallback.json');
  res.locals.newsMore = nm;
  if (nm && nm.cards && nm.cards.length) {
    res.locals.newsMoreNavCards = nm.cards;
  } else if (nmNavFb && nmNavFb.cards && nmNavFb.cards.length) {
    res.locals.newsMoreNavCards = nmNavFb.cards;
  } else {
    res.locals.newsMoreNavCards = [];
  }
  res.locals.currentPath = req.path;
  res.locals.isAdmin = !!req.session.admin;
  next();
});

/** Verify you are running THIS project: open http://localhost:PORT/__suit-health */
app.get('/__suit-health', requireAdmin, (req, res) => {
  res.type('json').send(JSON.stringify({
    app: 'suit-wolverhampton-2026',
    serverFile: __filename,
    serverRoot: __dirname,
    processCwd: process.cwd(),
    listenPort: PORT,
    data: {
      culturalOutreachJson: fs.existsSync(path.join(DATA_DIR, 'cultural-outreach.json')),
      newsMoreJson: fs.existsSync(path.join(DATA_DIR, 'news-more.json')),
      newsMoreNavFallbackJson: fs.existsSync(path.join(DATA_DIR, 'news-more.nav-fallback.json'))
    },
    tryUrls: ['/community/outreach', '/news-more', '/community'],
    note: 'If serverRoot does not match your Cursor project folder, or data.* are false, you are not running the updated site. Stop other Node apps on this port and run npm start from serverRoot.'
  }, null, 2));
});

// ─── AUTH MIDDLEWARE ───────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login');
}

// ═══════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════

// Homepage
app.get('/', (req, res) => {
  const timetable = readJSON('timetable.json') || {};
  const stories = readJSON('stories.json') || [];
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const todayEvents = timetable[today] || [];
  res.render('pages/home', {
    todayEvents, today,
    stories: stories.filter(s => s.featured).slice(0, 3),
    pageCanonical: '/'
  });
});

// Get Help Now
app.get('/get-help', (req, res) => {
  res.render('pages/get-help', {
    pageTitle: 'Get Help Now',
    pageDescription: 'Need help with addiction in Wolverhampton? Call SUIT on 01902 328983 or walk in to Paycare House. Free, confidential, lived experience support. No referral needed.',
    pageCanonical: '/get-help'
  });
});

// How We Help (Services)
app.get('/services', (req, res) => {
  res.render('pages/services', {
    pageTitle: 'How We Help',
    pageDescription: 'SUIT offers peer mentoring, advocacy, drop-in sanctuary, creative arts therapy, clinical treatment pathways, and volunteering. Free wraparound support in Wolverhampton.',
    pageCanonical: '/services'
  });
});

// Timetable
app.get('/timetable', (req, res) => {
  const timetable = readJSON('timetable.json') || {};
  const progFile = readJSON('programmes.json');
  const programmes = (progFile && progFile.programmes) ? progFile.programmes : [];
  res.render('pages/timetable', {
    timetable,
    programmes,
    pageTitle: 'The Timetable',
    pageDescription: 'SUIT weekly diary: SMART Recovery, RISE Day Hab, women’s and men’s peer groups, weekly art group, and drop-ins. Recovery Hub Connaught Road and Paycare House, Wolverhampton.',
    pageCanonical: '/timetable'
  });
});

// Stories of Hope
app.get('/stories', (req, res) => {
  const stories = readJSON('stories.json') || [];
  res.render('pages/stories', {
    stories,
    pageTitle: 'Stories of Hope',
    pageDescription: 'Real recovery stories from the SUIT team in Wolverhampton. Read first-hand accounts of overcoming addiction from people with lived experience.',
    pageCanonical: '/stories'
  });
});

// Individual Story
app.get('/stories/:id', (req, res) => {
  const stories = readJSON('stories.json') || [];
  const story = stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).render('pages/404');
  res.render('pages/story-single', { story });
});

// Our Timeline
app.get('/timeline', (req, res) => {
  const timeline = readJSON('timeline.json') || [];
  const timelineCulture = readJSON('timeline-culture.json');
  res.render('pages/timeline', {
    timeline,
    timelineCulture,
    pageTitle: 'Our Timeline',
    pageDescription: 'SUIT Wolverhampton\'s journey from 2007 to today. Key milestones, awards, partnerships, and the growth of Wolverhampton\'s Lived Experience Recovery Organisation.',
    pageCanonical: '/timeline'
  });
});

// Community
app.get('/community', (req, res) => {
  const community = loadCommunityForPublic();
  const culturalOutreach = readJSON('cultural-outreach.json');
  const posts = sortedCommunityPosts(community);
  res.render('pages/community', {
    community,
    culturalOutreach,
    posts,
    pageTitle: 'SUIT in the Community',
    pageDescription: 'Art, music, drama, events, and five years of SUIT making a difference in Wolverhampton. Exhibitions, conferences, PRIDE, performances, and community partnerships.',
    pageCanonical: '/community'
  });
});

function renderCulturalOutreachHub(req, res) {
  const outreach = readJSON('cultural-outreach.json');
  if (!outreach || !outreach.cards) {
    return res.status(500).send(
      'Cultural outreach content is not available. Ensure data/cultural-outreach.json exists in this project folder (same place as server.js) and restart the server.'
    );
  }
  res.render('pages/cultural-outreach-hub', {
    outreach,
    pageTitle: `${outreach.hubTitle || 'Cultural Outreach'} | SUIT`,
    pageDescription: outreach.hubIntro || 'Multilingual and culturally sensitive recovery outreach in Wolverhampton.',
    pageCanonical: '/community/outreach'
  });
}

/* Exact trailing-slash redirects only (Express 5 can treat /path and /path/ as one pattern — avoid redirect loops) */
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const pathOnly = req.originalUrl.split('?')[0];
  const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  if (pathOnly === '/community/outreach/') {
    return res.redirect(308, '/community/outreach' + qs);
  }
  const outreachSlash = pathOnly.match(/^\/community\/outreach\/([^/]+)\/$/);
  if (outreachSlash) {
    return res.redirect(308, `/community/outreach/${outreachSlash[1]}` + qs);
  }
  if (pathOnly === '/news-more/') {
    return res.redirect(308, '/news-more' + qs);
  }
  const newsMoreSlash = pathOnly.match(/^\/news-more\/([^/]+)\/$/);
  if (newsMoreSlash) {
    return res.redirect(308, `/news-more/${newsMoreSlash[1]}` + qs);
  }
  next();
});

app.get('/community/outreach', renderCulturalOutreachHub);

app.get('/community/outreach/:slug', (req, res) => {
  const slug = req.params.slug;
  const outreach = readJSON('cultural-outreach.json');
  if (!outreach || !outreach.programmes) {
    return res.status(500).send(
      'Cultural outreach content is not available. Ensure data/cultural-outreach.json is valid and restart the server.'
    );
  }
  const programme = outreach.programmes[slug];
  if (!programme || typeof programme !== 'object') {
    return res.status(404).render('pages/404', {
      pageTitle: 'Page not found',
      pageCanonical: ''
    });
  }
  res.render('pages/outreach-programme', {
    outreach,
    programme,
    slug,
    pageTitle: `${programme.title} — Cultural Outreach | SUIT`,
    pageDescription: programme.heroLead,
    pageCanonical: `/community/outreach/${slug}`
  });
});

app.get('/news-more', (req, res) => {
  const nm = res.locals.newsMore || readJSON('news-more.json');
  if (!nm || !nm.cards) {
    return res.status(500).send('News & More content is not available.');
  }
  res.render('pages/news-more-hub', {
    nm,
    pageTitle: nm.hubTitle || 'News & More',
    pageDescription: (nm.hubIntro || '').slice(0, 160),
    pageCanonical: '/news-more'
  });
});

app.get('/news-more/:slug', (req, res) => {
  const slug = req.params.slug;
  const nm = res.locals.newsMore || readJSON('news-more.json');
  const page = nm && nm.pages && nm.pages[slug];
  if (!page || typeof page !== 'object') {
    return res.status(404).render('pages/404', {
      pageTitle: 'Page not found',
      pageCanonical: ''
    });
  }
  res.render('pages/news-more-page', {
    nm,
    page,
    slug,
    pageTitle: `${page.title} — ${nm.hubTitle || 'News & More'}`,
    pageDescription: (page.heroLead || '').slice(0, 160),
    pageCanonical: `/news-more/${slug}`
  });
});

/** Alternate paths → canonical (must be registered after /news-more so Express 5 path arrays do not shadow the hub). */
app.get('/news-and-more', (req, res) => res.redirect(301, '/news-more'));
app.get('/news_and_more', (req, res) => res.redirect(301, '/news-more'));
app.get('/cultural-outreach', (req, res) => res.redirect(301, '/community/outreach'));
app.get('/community/cultural-outreach', (req, res) => res.redirect(301, '/community/outreach'));

// About Us
app.get('/about', (req, res) => {
  const teamData = readJSON('team.json') || { staff: [], volunteers: [] };
  const staff = teamData.staff || [];
  const volunteers = teamData.volunteers || [];
  res.render('pages/about', {
    staff,
    volunteers,
    pageTitle: 'About the SUIT Family',
    pageDescription: 'Meet the SUIT team — 11 staff members and 16 volunteers, all using lived experience to support others. Queen\'s Award winners, European Model of Good Practice, and CLERO members since 2007.',
    pageCanonical: '/about'
  });
});

// Contact Us
app.get('/contact', (req, res) => {
  res.render('pages/contact', {
    sent: false,
    error: null,
    pageTitle: 'Contact Us',
    pageDescription: 'Contact SUIT Wolverhampton. Call 01902 328983, email suit@wvca.org.uk, or fill in our form. Paycare House, George Street, WV2 4DX.',
    pageCanonical: '/contact'
  });
});

// Socials - unified feed page
app.get('/socials', (req, res) => {
  const stories = readJSON('stories.json') || [];
  const community = loadCommunityForPublic();
  const communityPosts = community.posts;

  // Build unified feed from stories + community posts
  const feedItems = [];

  stories.forEach(s => {
    feedItems.push({
      type: 'story',
      title: s.title || s.name || 'A Story of Hope',
      excerpt: s.quote || s.bio || '',
      date: s.date || '2024-01-01',
      link: '/stories/' + s.id,
      imageUrl: s.image || '',
      videoUrl: '',
      tags: ['recovery', 'hope']
    });
  });

  communityPosts.forEach(p => {
    feedItems.push({
      type: 'community',
      title: p.title || 'Community Update',
      excerpt: p.content || p.description || '',
      date: p.date || '2024-01-01',
      link: '/community',
      imageUrl: p.imageUrl || '',
      videoUrl: p.videoUrl || '',
      tags: p.tags || ['community']
    });
  });

  // Sort newest first
  feedItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.render('pages/socials', {
    feedItems,
    pageTitle: 'Follow SUIT — Socials & RSS Feed',
    pageDescription: 'Follow SUIT Wolverhampton on Facebook, Instagram, X, and YouTube. Subscribe to our RSS feed for every story, community update, and recovery milestone.',
    pageCanonical: '/socials'
  });
});

// RSS Feed (XML)
app.get('/feed.xml', (req, res) => {
  const baseUrl = 'https://www.suitrecoverywolverhampton.com';
  const stories = readJSON('stories.json') || [];
  const community = loadCommunityForPublic();
  const communityPosts = community.posts;

  const items = [];

  stories.forEach(s => {
    items.push({
      title: s.title || s.name || 'A Story of Hope',
      description: s.quote || s.bio || '',
      link: baseUrl + '/stories/' + s.id,
      date: s.date || '2024-01-01',
      category: 'Stories of Hope'
    });
  });

  communityPosts.forEach(p => {
    items.push({
      title: p.title || 'Community Update',
      description: (p.content || p.description || '').substring(0, 500),
      link: baseUrl + '/community',
      date: p.date || '2024-01-01',
      category: 'Community'
    });
  });

  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  xml += '  <channel>\n';
  xml += '    <title>SUIT Wolverhampton — Stories &amp; Updates</title>\n';
  xml += '    <link>' + baseUrl + '</link>\n';
  xml += '    <description>Recovery stories, community updates, and the latest from the Service User Involvement Team, Wolverhampton.</description>\n';
  xml += '    <language>en-gb</language>\n';
  xml += '    <lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n';
  xml += '    <atom:link href="' + baseUrl + '/feed.xml" rel="self" type="application/rss+xml"/>\n';
  xml += '    <image>\n';
  xml += '      <url>' + baseUrl + '/images/suit-logo.webp</url>\n';
  xml += '      <title>SUIT Wolverhampton</title>\n';
  xml += '      <link>' + baseUrl + '</link>\n';
  xml += '    </image>\n';

  items.forEach(item => {
    const pubDate = new Date(item.date).toUTCString();
    xml += '    <item>\n';
    xml += '      <title>' + item.title.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</title>\n';
    xml += '      <link>' + item.link + '</link>\n';
    xml += '      <description>' + item.description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</description>\n';
    xml += '      <category>' + item.category + '</category>\n';
    xml += '      <pubDate>' + pubDate + '</pubDate>\n';
    xml += '      <guid isPermaLink="true">' + item.link + '</guid>\n';
    xml += '    </item>\n';
  });

  xml += '  </channel>\n';
  xml += '</rss>';

  res.set('Content-Type', 'application/rss+xml; charset=utf-8');
  res.send(xml);
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many messages sent. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Contact form submission
app.post('/contact', contactLimiter, (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 200);
  const email = String(req.body.email || '').trim().slice(0, 200);
  const phone = String(req.body.phone || '').trim().slice(0, 50);
  const message = String(req.body.message || '').trim().slice(0, 5000);
  const type = ['general', 'referral', 'volunteer', 'other'].includes(req.body.type) ? req.body.type : 'general';
  if (!name || !message) return res.render('pages/contact', { sent: false, error: 'Name and message are required.' });
  const messages = readJSON('messages.json') || [];
  messages.push({ id: uuidv4(), name, email, phone, message, type, date: new Date().toISOString(), read: false });
  writeJSON('messages.json', messages);
  res.render('pages/contact', { sent: true, error: null });
});

// PWA manifest
app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'SUIT Wolverhampton',
    short_name: 'SUIT',
    description: 'Lived Experience Recovery Support in Wolverhampton',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D1117',
    theme_color: '#00707F',
    icons: [
      { src: '/images/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/images/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  });
});

// Service Worker
app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Sitemap.xml (SEO)
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = 'https://www.suitrecoverywolverhampton.com';
  const pages = [
    { url: '/', priority: '1.0', freq: 'weekly' },
    { url: '/get-help', priority: '0.9', freq: 'monthly' },
    { url: '/services', priority: '0.8', freq: 'monthly' },
    { url: '/timetable', priority: '0.8', freq: 'weekly' },
    { url: '/stories', priority: '0.7', freq: 'monthly' },
    { url: '/community', priority: '0.8', freq: 'weekly' },
    { url: '/community/outreach', priority: '0.75', freq: 'monthly' },
    { url: '/timeline', priority: '0.6', freq: 'monthly' },
    { url: '/about', priority: '0.7', freq: 'monthly' },
    { url: '/socials', priority: '0.7', freq: 'weekly' },
    { url: '/contact', priority: '0.7', freq: 'yearly' },
    { url: '/news-more', priority: '0.72', freq: 'weekly' }
  ];
  const outreachData = readJSON('cultural-outreach.json');
  const outreachSlugs =
    outreachData && outreachData.programmes && typeof outreachData.programmes === 'object'
      ? Object.keys(outreachData.programmes)
      : ['punjabi', 'polish', 'afro-caribbean'];
  outreachSlugs.forEach(slug => {
    pages.push({ url: `/community/outreach/${slug}`, priority: '0.7', freq: 'monthly' });
  });
  const nmData = readJSON('news-more.json');
  const nmSlugs =
    nmData && nmData.pages && typeof nmData.pages === 'object' ? Object.keys(nmData.pages) : [];
  nmSlugs.forEach(slug => {
    const isAnnounce = slug === 'announcements';
    pages.push({
      url: `/news-more/${slug}`,
      priority: isAnnounce ? '0.7' : '0.65',
      freq: isAnnounce ? 'weekly' : 'monthly'
    });
  });
  // Add individual stories
  const stories = readJSON('stories.json') || [];
  stories.forEach(s => pages.push({ url: `/stories/${s.id}`, priority: '0.5', freq: 'yearly' }));

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  pages.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}${p.url}</loc>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  });
  xml += '</urlset>';
  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// Robots.txt (SEO)
app.get('/robots.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://www.suitrecoverywolverhampton.com/sitemap.xml`);
});

// ═══════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════

// Admin login
app.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

app.post('/admin/login', async (req, res) => {
  const admin = readJSON('admin.json');
  if (!admin) return res.render('admin/login', { error: 'Admin account not configured' });
  const match = await bcrypt.compare(req.body.password || '', admin.password);
  if (req.body.username === admin.username && match) {
    req.session.regenerate((err) => {
      if (err) return res.render('admin/login', { error: 'Session error, try again' });
      req.session.admin = true;
      res.redirect('/admin');
    });
    return;
  }
  res.render('admin/login', { error: 'Invalid username or password' });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Admin dashboard
app.get('/admin', requireAdmin, (req, res) => {
  const messages = readJSON('messages.json') || [];
  const stories = readJSON('stories.json') || [];
  const teamData = readJSON('team.json') || { staff: [], volunteers: [] };
  const team = teamData.staff || [];
  const community = loadCommunityForAdmin();
  const communityPosts = community.posts.length;
  const unread = messages.filter(m => !m.read).length;
  res.render('admin/dashboard', { messages, stories, team, unread, communityPosts, volunteers: teamData.volunteers || [] });
});

// ─── CONTENT EDITING ──────────────────────────────────
app.get('/admin/content', requireAdmin, (req, res) => {
  const content = readJSON('content.json');
  res.render('admin/edit-content', { content, saved: false });
});

app.post('/admin/content', requireAdmin, (req, res) => {
  const content = readJSON('content.json');
  if (!content) return res.status(500).send('content.json is missing or invalid');
  // Update hero
  content.hero.headline = req.body.heroHeadline || content.hero.headline;
  content.hero.subheadline = req.body.heroSubheadline || content.hero.subheadline;
  // Update impact
  content.impact.stat = req.body.impactStat || content.impact.stat;
  content.impact.text = req.body.impactText || content.impact.text;
  // Update quote
  content.quote.text = req.body.quoteText || content.quote.text;
  content.quote.author = req.body.quoteAuthor || content.quote.author;
  // Update contact info
  content.site.phone = req.body.sitePhone || content.site.phone;
  content.site.email = req.body.siteEmail || content.site.email;
  content.site.address = req.body.siteAddress || content.site.address;
  content.site.whatsapp = req.body.siteWhatsapp || content.site.whatsapp;
  content.site.facebook = req.body.siteFacebook || content.site.facebook;
  content.site.instagram = req.body.siteInstagram || content.site.instagram;

  ['facebook','instagram','whatsapp'].forEach(k => {
    const v = content.site[k];
    if (v && !/^https?:\/\//i.test(v)) content.site[k] = '';
  });

  writeJSON('content.json', content);
  res.render('admin/edit-content', { content, saved: true });
});

// ─── SERVICES EDITING ─────────────────────────────────
app.get('/admin/services', requireAdmin, (req, res) => {
  const content = readJSON('content.json');
  res.render('admin/edit-services', { services: content.services, saved: false });
});

app.post('/admin/services', requireAdmin, (req, res) => {
  const content = readJSON('content.json');
  const { serviceId, serviceIcon, serviceTitle, serviceDescription, serviceColor } = req.body;

  if (Array.isArray(serviceId)) {
    content.services = serviceId.map((id, i) => ({
      id: id || `service-${uuidv4().slice(0,8)}`,
      icon: serviceIcon[i] || '🔹',
      title: serviceTitle[i] || 'Service',
      description: serviceDescription[i] || '',
      colorClass: serviceColor[i] || 'card-orange'
    }));
  }

  writeJSON('content.json', content);
  res.render('admin/edit-services', { services: content.services, saved: true });
});

// ─── TIMETABLE EDITING ────────────────────────────────
app.get('/admin/timetable', requireAdmin, (req, res) => {
  const timetable = readJSON('timetable.json');
  const progFile = readJSON('programmes.json');
  const programmeOptions = (progFile && progFile.programmes) ? progFile.programmes : [];
  res.render('admin/edit-timetable', { timetable, programmeOptions, saved: false });
});

app.post('/admin/timetable', requireAdmin, (req, res) => {
  const { day, time, title, category, description, eventId } = req.body;
  const timetable = readJSON('timetable.json');
  const progFile = readJSON('programmes.json');
  const programmeOptions = (progFile && progFile.programmes) ? progFile.programmes : [];

  if (req.body.action === 'delete') {
    const dayKey = req.body.deleteDay;
    const delId = req.body.deleteId;
    if (timetable[dayKey]) {
      timetable[dayKey] = timetable[dayKey].filter(e => e.id !== delId);
    }
  } else if (req.body.action === 'update') {
    const dayKey = (req.body.updateDay || '').toLowerCase();
    const uid = req.body.updateId;
    if (dayKey && uid && timetable[dayKey]) {
      const idx = timetable[dayKey].findIndex(e => e.id === uid);
      if (idx >= 0) {
        const prev = timetable[dayKey][idx];
        const next = {
          ...prev,
          time: req.body.updateTime || prev.time,
          title: req.body.updateTitle || prev.title,
          category: req.body.updateCategory || prev.category,
          description: req.body.updateDescription != null ? req.body.updateDescription : prev.description
        };
        if (req.body.updateLocation && String(req.body.updateLocation).trim()) {
          next.location = String(req.body.updateLocation).trim();
        } else {
          delete next.location;
        }
        if (req.body.updateEndTime && String(req.body.updateEndTime).trim()) {
          next.endTime = String(req.body.updateEndTime).trim();
        } else {
          delete next.endTime;
        }
        if (req.body.updateProgrammeSlug && String(req.body.updateProgrammeSlug).trim()) {
          next.programmeSlug = String(req.body.updateProgrammeSlug).trim();
        } else {
          delete next.programmeSlug;
        }
        timetable[dayKey][idx] = next;
        timetable[dayKey].sort((a, b) => a.time.localeCompare(b.time));
      }
    }
  } else {
    const VALID_DAYS = new Set(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']);
    const dayKey = String(day || '').toLowerCase();
    if (!VALID_DAYS.has(dayKey)) return res.render('admin/edit-timetable', { timetable, programmeOptions, saved: false });
    if (!timetable[dayKey]) timetable[dayKey] = [];

    const newEvent = {
      id: eventId || `evt-${uuidv4().slice(0, 8)}`,
      time,
      title,
      category,
      description: description || ''
    };
    if (req.body.location && String(req.body.location).trim()) {
      newEvent.location = String(req.body.location).trim();
    }
    if (req.body.endTime && String(req.body.endTime).trim()) {
      newEvent.endTime = String(req.body.endTime).trim();
    }
    if (req.body.programmeSlug && String(req.body.programmeSlug).trim()) {
      newEvent.programmeSlug = String(req.body.programmeSlug).trim();
    }

    const existing = timetable[dayKey].findIndex(e => e.id === newEvent.id);
    if (existing >= 0) {
      timetable[dayKey][existing] = { ...timetable[dayKey][existing], ...newEvent };
    } else {
      timetable[dayKey].push(newEvent);
    }

    timetable[dayKey].sort((a, b) => a.time.localeCompare(b.time));
  }

  writeJSON('timetable.json', timetable);
  res.render('admin/edit-timetable', { timetable, programmeOptions, saved: true });
});

// ─── STORIES EDITING ──────────────────────────────────
app.get('/admin/stories', requireAdmin, (req, res) => {
  const stories = readJSON('stories.json');
  res.render('admin/edit-stories', { stories, saved: false, editing: null });
});

app.get('/admin/stories/new', requireAdmin, (req, res) => {
  res.render('admin/story-form', { story: null });
});

app.get('/admin/stories/edit/:id', requireAdmin, (req, res) => {
  const stories = readJSON('stories.json');
  const story = stories.find(s => s.id === req.params.id);
  if (!story) return res.redirect('/admin/stories');
  res.render('admin/story-form', { story });
});

app.post('/admin/stories/save', requireAdmin, (req, res, next) => {
  req.uploadDest = 'stories';
  next();
}, upload.fields([
  { name: 'storyImage', maxCount: 1 },
  { name: 'storyVideo', maxCount: 1 }
]), (req, res) => {
  const stories = readJSON('stories.json');
  const { storyId, name, title, excerpt, fullStory, featured } = req.body;

  const storyData = {
    id: storyId || `story-${uuidv4().slice(0,8)}`,
    name: name || 'Anonymous',
    title: title || '',
    excerpt: excerpt || '',
    fullStory: fullStory || '',
    image: req.files?.storyImage ? `/uploads/stories/${req.files.storyImage[0].filename}` : (req.body.existingImage || ''),
    video: req.files?.storyVideo ? `/uploads/stories/${req.files.storyVideo[0].filename}` : (req.body.existingVideo || ''),
    featured: featured === 'on' || featured === 'true',
    date: req.body.date || new Date().toISOString().split('T')[0]
  };

  const idx = stories.findIndex(s => s.id === storyData.id);
  if (idx >= 0) {
    stories[idx] = storyData;
  } else {
    stories.push(storyData);
  }

  writeJSON('stories.json', stories);
  res.redirect('/admin/stories');
});

app.post('/admin/stories/delete/:id', requireAdmin, (req, res) => {
  let stories = readJSON('stories.json');
  stories = stories.filter(s => s.id !== req.params.id);
  writeJSON('stories.json', stories);
  res.redirect('/admin/stories');
});

// ─── TEAM EDITING ─────────────────────────────────────
app.get('/admin/team', requireAdmin, (req, res) => {
  const teamData = readJSON('team.json');
  const team = teamData.staff || [];
  const volunteers = teamData.volunteers || [];
  res.render('admin/edit-team', { team, volunteers, saved: false });
});

app.get('/admin/team/new', requireAdmin, (req, res) => {
  res.render('admin/team-form', { member: null, isVolunteer: false });
});

app.get('/admin/team/edit/:id', requireAdmin, (req, res) => {
  const teamData = readJSON('team.json');
  const allMembers = [...(teamData.staff || []), ...(teamData.volunteers || [])];
  const member = allMembers.find(m => m.id === req.params.id);
  if (!member) return res.redirect('/admin/team');
  // check if volunteer
  const isVolunteer = (teamData.volunteers || []).some(v => v.id === req.params.id);
  res.render('admin/team-form', { member, isVolunteer });
});

app.post('/admin/team/save', requireAdmin, (req, res, next) => {
  req.uploadDest = 'team';
  next();
}, upload.single('memberImage'), (req, res) => {
  const teamData = readJSON('team.json');
  const { memberId, name, role, bio, videoUrl, memberType, volunteerTeam } = req.body;

  const isVolunteer = memberType === 'volunteer';

  const memberDataBase = {
    id: memberId || `member-${uuidv4().slice(0,8)}`,
    name: name || 'Team Member',
    role: role || '',
    bio: bio || '',
    image: req.file ? `/uploads/team/${req.file.filename}` : (req.body.existingImage || '')
  };

  if (isVolunteer) {
    memberDataBase.team = volunteerTeam || 'General';
    const volunteers = teamData.volunteers || [];
    const idx = volunteers.findIndex(m => m.id === memberDataBase.id);
    if (idx >= 0) {
      volunteers[idx] = memberDataBase;
    } else {
      volunteers.push(memberDataBase);
    }
    teamData.volunteers = volunteers;
  } else {
    memberDataBase.videoUrl = videoUrl || '';
    const staff = teamData.staff || [];
    const idx = staff.findIndex(m => m.id === memberDataBase.id);
    if (idx >= 0) {
      staff[idx] = memberDataBase;
    } else {
      staff.push(memberDataBase);
    }
    teamData.staff = staff;
  }

  writeJSON('team.json', teamData);
  res.redirect('/admin/team');
});

app.post('/admin/team/delete/:id', requireAdmin, (req, res) => {
  const teamData = readJSON('team.json');
  teamData.staff = (teamData.staff || []).filter(m => m.id !== req.params.id);
  teamData.volunteers = (teamData.volunteers || []).filter(m => m.id !== req.params.id);
  writeJSON('team.json', teamData);
  res.redirect('/admin/team');
});

// ─── MESSAGES ─────────────────────────────────────────
app.get('/admin/messages', requireAdmin, (req, res) => {
  const messages = readJSON('messages.json') || [];
  res.render('admin/messages', { messages });
});

// ─── COMMUNITY EDITING ───────────────────────────────
app.get('/admin/community', requireAdmin, (req, res) => {
  const community = loadCommunityForAdmin();
  const posts = sortedCommunityPosts(community);
  res.render('admin/edit-community', { posts, saved: false });
});

app.get('/admin/community/new', requireAdmin, (req, res) => {
  res.render('admin/community-form', { post: null });
});

app.get('/admin/community/edit/:id', requireAdmin, (req, res) => {
  const community = loadCommunityForAdmin();
  const post = community.posts.find(p => p.id === req.params.id);
  if (!post) return res.redirect('/admin/community');
  res.render('admin/community-form', { post });
});

app.post('/admin/community/save', requireAdmin, (req, res, next) => {
  req.uploadDest = 'community';
  next();
}, upload.fields([
  { name: 'postImage', maxCount: 1 },
  { name: 'postVideo', maxCount: 1 }
]), (req, res) => {
  const community = loadCommunityForAdmin();
  const { postId, title, date, category, tags, body, quote, quoteAuthor, link, linkText, pinned } = req.body;

  let imageUrl = String(req.body.imageUrl || '').trim();
  if (req.files?.postImage?.[0]) {
    imageUrl = `/uploads/community/${req.files.postImage[0].filename}`;
  }

  let videoUrl = String(req.body.videoUrl || '').trim();
  if (req.files?.postVideo?.[0]) {
    videoUrl = `/uploads/community/${req.files.postVideo[0].filename}`;
  }

  const postData = {
    id: postId || `post-${uuidv4().slice(0, 8)}`,
    date: date || new Date().toISOString().split('T')[0],
    category: category || 'announcements',
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    title: title || 'Untitled',
    body: body || '',
    quote: quote || '',
    quoteAuthor: quoteAuthor || '',
    source: 'admin',
    link: link || '',
    linkText: linkText || '',
    imageUrl,
    videoUrl,
    pinned: pinned === 'on' || pinned === 'true'
  };

  const idx = community.posts.findIndex(p => p.id === postData.id);
  if (idx >= 0) {
    community.posts[idx] = postData;
  } else {
    community.posts.push(postData);
  }

  writeJSON('community.json', community);
  res.redirect('/admin/community');
});

app.post('/admin/community/delete/:id', requireAdmin, (req, res) => {
  const community = loadCommunityForAdmin();
  community.posts = community.posts.filter(p => p.id !== req.params.id);
  writeJSON('community.json', community);
  res.redirect('/admin/community');
});

const COMMUNITY_PROJECT_KEYS = ['art', 'music', 'drama'];
const COMMUNITY_SOCIAL_KEYS = ['facebook', 'instagram', 'youtube', 'twitter'];

app.get('/admin/community/page', requireAdmin, (req, res) => {
  const community = loadCommunityForAdmin();
  if (!community.socialWindows) {
    community.socialWindows = {};
    COMMUNITY_SOCIAL_KEYS.forEach(k => {
      community.socialWindows[k] = { imageUrl: '', imageAlt: '' };
    });
  }
  res.render('admin/edit-community-page', {
    community,
    saved: req.query.saved === '1',
    adminTitle: 'Community page windows'
  });
});

app.post('/admin/community/page', requireAdmin, (req, res) => {
  const community = loadCommunityForAdmin();
  const nextProjects = { ...community.projects };
  COMMUNITY_PROJECT_KEYS.forEach(key => {
    const prev = community.projects[key] || {};
    const partnersRaw = String(req.body[`project_${key}_partners`] || '');
    const partners = partnersRaw.split('\n').map(s => s.trim()).filter(Boolean);
    const imageUrl = String(req.body[`project_${key}_imageUrl`] || '').trim();
    const imageAlt = String(req.body[`project_${key}_imageAlt`] || '').trim();
    const videoUrl = String(req.body[`project_${key}_videoUrl`] || '').trim();
    const title = String(req.body[`project_${key}_title`] || '').trim() || prev.title || '';
    const description = String(req.body[`project_${key}_description`] || '').trim() || prev.description || '';
    nextProjects[key] = { title, description, partners };
    if (imageUrl) nextProjects[key].imageUrl = imageUrl;
    if (imageAlt) nextProjects[key].imageAlt = imageAlt;
    if (videoUrl) nextProjects[key].videoUrl = videoUrl;
  });
  community.projects = nextProjects;

  const sw = { ...(community.socialWindows || {}) };
  COMMUNITY_SOCIAL_KEYS.forEach(k => {
    const imageUrl = String(req.body[`social_${k}_imageUrl`] || '').trim();
    const imageAlt = String(req.body[`social_${k}_imageAlt`] || '').trim();
    sw[k] = {};
    if (imageUrl) sw[k].imageUrl = imageUrl;
    if (imageAlt) sw[k].imageAlt = imageAlt;
  });
  community.socialWindows = sw;

  writeJSON('community.json', community);
  res.redirect('/admin/community/page?saved=1');
});

app.post('/admin/messages/read/:id', requireAdmin, (req, res) => {
  const messages = readJSON('messages.json') || [];
  const msg = messages.find(m => m.id === req.params.id);
  if (msg) msg.read = true;
  writeJSON('messages.json', messages);
  res.redirect('/admin/messages');
});

app.post('/admin/messages/delete/:id', requireAdmin, (req, res) => {
  let messages = readJSON('messages.json') || [];
  messages = messages.filter(m => m.id !== req.params.id);
  writeJSON('messages.json', messages);
  res.redirect('/admin/messages');
});

const ADMIN_TIMELINE_ICONS = [
  'lucide:sprout', 'lucide:crown', 'lucide:landmark', 'lucide:globe', 'lucide:handshake', 'lucide:earth',
  'lucide:palette', 'lucide:hospital', 'lucide:mic-2', 'lucide:graduation-cap', 'lucide:award', 'lucide:heart',
  'lucide:theater', 'lucide:footprints', 'lucide:clipboard-list', 'lucide:library', 'lucide:calendar',
  'lucide:users', 'lucide:music-2', 'lucide:image'
];
const ADMIN_TIMELINE_COLORS = ['orange', 'cyan', 'green', 'pink', 'teal'];

// ─── TIMELINE (milestones) ────────────────────────────
app.get('/admin/timeline', requireAdmin, (req, res) => {
  let timeline = readJSON('timeline.json') || [];
  if (!timeline.length) {
    timeline = [{ year: '', title: '', description: '', icon: 'lucide:sprout', color: 'teal' }];
  }
  res.render('admin/edit-timeline', {
    timeline,
    iconOptions: ADMIN_TIMELINE_ICONS,
    colorOptions: ADMIN_TIMELINE_COLORS,
    saved: false,
    adminTitle: 'Timeline milestones'
  });
});

app.post('/admin/timeline', requireAdmin, (req, res) => {
  const years = [].concat(req.body.m_year || []);
  const titles = [].concat(req.body.m_title || []);
  const descriptions = [].concat(req.body.m_description || []);
  const icons = [].concat(req.body.m_icon || []);
  const colors = [].concat(req.body.m_color || []);
  const n = Math.max(years.length, titles.length, descriptions.length, icons.length, colors.length);
  const timeline = [];
  for (let i = 0; i < n; i++) {
    const title = String(titles[i] || '').trim();
    if (!title) continue;
    timeline.push({
      year: String(years[i] || '').trim(),
      title,
      description: String(descriptions[i] || '').trim(),
      icon: String(icons[i] || 'lucide:sprout').trim(),
      color: String(colors[i] || 'teal').trim()
    });
  }
  writeJSON('timeline.json', timeline);
  res.render('admin/edit-timeline', {
    timeline,
    iconOptions: ADMIN_TIMELINE_ICONS,
    colorOptions: ADMIN_TIMELINE_COLORS,
    saved: true,
    adminTitle: 'Timeline milestones'
  });
});

// ─── TIMELINE culture strip (art / drama / music) ────
app.get('/admin/timeline-culture', requireAdmin, (req, res) => {
  const timelineCulture = readJSON('timeline-culture.json') || { pillars: [] };
  res.render('admin/edit-timeline-culture', {
    tc: timelineCulture,
    saved: false,
    adminTitle: 'Timeline photos',
    pillarIconOptions: ADMIN_TIMELINE_ICONS,
    pillarCardOptions: ['card-pink', 'card-teal', 'card-cyan', 'card-green', 'card-orange']
  });
});

app.post('/admin/timeline-culture', requireAdmin, (req, res) => {
  const prev = readJSON('timeline-culture.json') || { pillars: [] };
  const tc = {
    heading: String(req.body.tc_heading || '').trim() || prev.heading,
    subheading: String(req.body.tc_subheading || '').trim() || prev.subheading,
    credit: String(req.body.tc_credit || '').trim() || prev.credit,
    pillars: []
  };
  const pillarIds = (prev.pillars || []).map(p => p.id);
  pillarIds.forEach(id => {
    const pPrev = (prev.pillars || []).find(p => p.id === id) || { id, images: [] };
    const p = { ...pPrev };
    p.title = String(req.body[`p_${id}_title`] || '').trim() || pPrev.title;
    p.icon = String(req.body[`p_${id}_icon`] || '').trim() || pPrev.icon;
    p.cardClass = String(req.body[`p_${id}_cardClass`] || '').trim() || pPrev.cardClass;
    p.caption = String(req.body[`p_${id}_caption`] || '').trim() || pPrev.caption;
    p.sourceNote = String(req.body[`p_${id}_sourceNote`] || '').trim() || pPrev.sourceNote;
    const ytid = String(req.body[`p_${id}_youtubeId`] || '').trim();
    if (ytid) {
      p.youtubeId = ytid;
      const ytt = String(req.body[`p_${id}_youtubeTitle`] || '').trim();
      if (ytt) p.youtubeTitle = ytt;
    } else {
      delete p.youtubeId;
      delete p.youtubeTitle;
    }
    const galRaw = String(req.body[`p_${id}_gallery`] || '').trim();
    if (galRaw) {
      const galLines = galRaw.split(/\r?\n/);
      p.images = galLines.map(line => {
        const idx = line.indexOf('|');
        const src = idx >= 0 ? line.slice(0, idx).trim() : line.trim();
        const alt = idx >= 0 ? line.slice(idx + 1).trim() : '';
        if (!src) return null;
        return { src, alt: alt || 'SUIT programme photo' };
      }).filter(Boolean);
    }
    tc.pillars.push(p);
  });
  writeJSON('timeline-culture.json', tc);
  res.render('admin/edit-timeline-culture', {
    tc,
    saved: true,
    adminTitle: 'Timeline photos',
    pillarIconOptions: ADMIN_TIMELINE_ICONS,
    pillarCardOptions: ['card-pink', 'card-teal', 'card-cyan', 'card-green', 'card-orange']
  });
});

// ─── PROGRAMMES (timetable detail pages) ─────────────
app.get('/admin/programmes', requireAdmin, (req, res) => {
  const data = readJSON('programmes.json');
  const programmes = (data && data.programmes) ? data.programmes : [];
  res.render('admin/programmes-index', { programmes, adminTitle: 'Programmes' });
});

app.get('/admin/programmes/edit/:slug', requireAdmin, (req, res) => {
  const data = readJSON('programmes.json');
  const programmes = (data && data.programmes) ? data.programmes : [];
  const prog = programmes.find(p => p.slug === req.params.slug);
  if (!prog) return res.redirect('/admin/programmes');
  const galleryText = (prog.gallery || []).map(g => `${g.src} | ${g.alt || ''}`).join('\n');
  const linksText = (prog.links || []).map(l => `${l.label} | ${l.href}`).join('\n');
  res.render('admin/edit-programme', {
    prog,
    galleryText,
    linksText,
    saved: req.query.saved === '1',
    adminTitle: 'Edit programme'
  });
});

app.post('/admin/programmes/save', requireAdmin, (req, res) => {
  const data = readJSON('programmes.json');
  if (!data.programmes) data.programmes = [];
  const slug = String(req.body.slug || '').trim();
  const idx = data.programmes.findIndex(p => p.slug === slug);
  if (idx < 0) return res.redirect('/admin/programmes');
  const prev = data.programmes[idx];
  const prog = {
    ...prev,
    title: String(req.body.title || '').trim() || prev.title,
    teaser: String(req.body.teaser || '').trim(),
    scheduleSummary: String(req.body.scheduleSummary || '').trim(),
    location: String(req.body.location || '').trim(),
    referralNote: String(req.body.referralNote || '').trim(),
    mediaNote: String(req.body.mediaNote || '').trim()
  };
  const srcUrl = String(req.body.sourceUrl || '').trim();
  if (srcUrl) prog.sourceUrl = srcUrl;
  else delete prog.sourceUrl;

  const galRaw = String(req.body.galleryText || '').trim();
  if (galRaw) {
    const galLines = galRaw.split(/\r?\n/);
    prog.gallery = galLines.map(line => {
      const i = line.indexOf('|');
      const src = i >= 0 ? line.slice(0, i).trim() : line.trim();
      const alt = i >= 0 ? line.slice(i + 1).trim() : '';
      if (!src) return null;
      return { src, alt: alt || 'SUIT photo' };
    }).filter(Boolean);
  }

  const linksRaw = String(req.body.linksText || '').trim();
  if (linksRaw) {
    const linkLines = linksRaw.split(/\r?\n/);
    const links = linkLines.map(line => {
      const i = line.indexOf('|');
      const label = i >= 0 ? line.slice(0, i).trim() : '';
      const href = i >= 0 ? line.slice(i + 1).trim() : line.trim();
      if (!href) return null;
      return { label: label || href, href };
    }).filter(Boolean);
    if (links.length) prog.links = links;
    else delete prog.links;
  }

  data.programmes[idx] = prog;
  writeJSON('programmes.json', data);
  res.redirect(`/admin/programmes/edit/${encodeURIComponent(slug)}?saved=1`);
});

// ─── CHANGE PASSWORD ──────────────────────────────────
app.get('/admin/settings', requireAdmin, (req, res) => {
  res.render('admin/settings', { saved: false, error: null });
});

app.post('/admin/settings', requireAdmin, async (req, res) => {
  const admin = readJSON('admin.json');
  if (!admin) return res.render('admin/settings', { saved: false, error: 'Admin file missing' });
  const currentOk = await bcrypt.compare(req.body.currentPassword || '', admin.password);
  if (!currentOk) {
    return res.render('admin/settings', { saved: false, error: 'Current password is incorrect' });
  }
  if ((req.body.newPassword || '').length < 12) {
    return res.render('admin/settings', { saved: false, error: 'New password must be at least 12 characters' });
  }
  admin.password = await bcrypt.hash(req.body.newPassword, 12);
  if (req.body.newUsername) admin.username = req.body.newUsername;
  writeJSON('admin.json', admin);
  res.render('admin/settings', { saved: true, error: null });
});

// ─── GALLERY / MEDIA UPLOAD ──────────────────────────
app.get('/admin/gallery', requireAdmin, (req, res) => {
  const galleryDir = path.join(UPLOAD_DIR, 'gallery');
  let files = [];
  if (fs.existsSync(galleryDir)) {
    files = fs.readdirSync(galleryDir).map(f => ({
      name: f,
      url: `/uploads/gallery/${f}`,
      isVideo: /\.(mp4|webm|mov)$/i.test(f)
    }));
  }
  res.render('admin/gallery', { files });
});

app.post('/admin/gallery/upload', requireAdmin, (req, res, next) => {
  req.uploadDest = 'gallery';
  next();
}, upload.array('galleryFiles', 20), (req, res) => {
  res.redirect('/admin/gallery');
});

app.post('/admin/gallery/delete', requireAdmin, (req, res) => {
  const file = path.basename(req.body.filename || '');
  if (!file) return res.redirect('/admin/gallery');
  const galleryDir = path.resolve(UPLOAD_DIR, 'gallery');
  const filePath = path.resolve(galleryDir, file);
  if (!filePath.startsWith(galleryDir + path.sep) && filePath !== galleryDir) {
    return res.status(400).send('Invalid filename');
  }
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.redirect('/admin/gallery');
});

// ─── Legacy Squarespace paths → this site (before 404) ─
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/admin')) return next();
  const key = normalizeLegacyPath(req.path);
  const target = LEGACY_REDIRECT_MAP.get(key);
  if (target) return res.redirect(301, target);
  next();
});

// ─── Global error handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server error]', err.stack || err.message || err);
  if (res.headersSent) return next(err);
  res.status(500).render('pages/404', { pageTitle: 'Server Error', pageCanonical: '' });
});

// ─── 404 ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('pages/404');
});

// ─── START (only when run directly — allows `require('./server')` for prerender/tests) ─
function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    const coFile = path.join(DATA_DIR, 'cultural-outreach.json');
    const nmFile = path.join(DATA_DIR, 'news-more.json');
    const nmfFile = path.join(DATA_DIR, 'news-more.nav-fallback.json');
    console.log(`\n  SUIT Wolverhampton 2026`);
    console.log(`  Open in browser (HTTP only, not HTTPS):`);
    console.log(`    http://localhost:${PORT}`);
    console.log(`    http://127.0.0.1:${PORT}`);
    console.log(`  If Chrome says "invalid response", you are probably using https:// — switch to http://`);
    console.log(`  Verify this build: http://localhost:${PORT}/__suit-health`);
    console.log(`  Content Manager: http://localhost:${PORT}/admin/login`);
    console.log(`      Admin panel: /admin/login (change password after first login)`);
    console.log(`\n  Project folder: ${__dirname}`);
    console.log(`  data/cultural-outreach.json — ${fs.existsSync(coFile) ? 'found' : 'MISSING (cultural outreach will 500)'}`);
    console.log(`  data/news-more.json — ${fs.existsSync(nmFile) ? 'found' : 'MISSING (subpages500; nav uses fallback if present)'}`);
    console.log(`  data/news-more.nav-fallback.json — ${fs.existsSync(nmfFile) ? 'found' : 'MISSING (News & More nav may be empty)'}`);
    console.log(`  Routes: /community/outreach  /news-more`);
    console.log(`  Static HTML: prestart runs prerender; public/ mirrors all main routes (see scripts/prerender-public-site.js)`);
    console.log(`  Skip prerender: npm run start:only`);
    console.log(`  Legacy redirects loaded: ${LEGACY_REDIRECT_MAP.size} paths (scripts/legacy-urls.json)`);
    console.log(`  Tip: stop ALL other Node processes using port ${PORT}, run npm start from the folder above, then Ctrl+F5.\n`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
