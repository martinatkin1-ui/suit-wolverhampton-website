/**
 * Full static mirror under public/ so /path maps to public/path/index.html (or public/index.html for /).
 * Run automatically before npm start / npm run dev via prestart / predev.
 *
 * Manual: node scripts/prerender-public-site.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');

function readJSON(filename) {
  const p = path.join(dataDir, filename);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('[prerender] Bad JSON:', filename, e.message);
    return null;
  }
}

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

function sortedCommunityPosts(community) {
  const posts = community && Array.isArray(community.posts) ? community.posts : [];
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function writeToPublic(urlPath, html) {
  const norm = urlPath === '/' || urlPath === '' ? '' : urlPath.replace(/^\//, '').replace(/\/+$/, '');
  if (!norm) {
    fs.mkdirSync(path.join(root, 'public'), { recursive: true });
    fs.writeFileSync(path.join(root, 'public', 'index.html'), html, 'utf8');
    return;
  }
  const dir = path.join(root, 'public', ...norm.split('/'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}

async function main() {
  const app = require('../server');
  const nm = readJSON('news-more.json');
  const navFb = readJSON('news-more.nav-fallback.json');
  const navCards =
    nm && Array.isArray(nm.cards) && nm.cards.length ? nm.cards : navFb && navFb.cards ? navFb.cards : [];

  const render = (view, locals) =>
    new Promise((resolve, reject) => {
      app.render(view, locals, (err, html) => (err ? reject(err) : resolve(html)));
    });

  const content = readJSON('content.json');
  if (!content) throw new Error('data/content.json missing');

  const B = (extra) => ({
    content,
    newsMoreNavCards: navCards,
    isAdmin: false,
    ...extra
  });

  let count = 0;
  const go = async (urlPath, view, locals) => {
    const html = await render(view, locals);
    writeToPublic(urlPath, html);
    count++;
    console.log('  ', urlPath || '/', '→', view);
  };

  console.log('[prerender] Building static HTML under public/ …');

  const timetable = readJSON('timetable.json') || {};
  const stories = readJSON('stories.json') || [];
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const todayEvents = timetable[today] || [];

  await go('/', 'pages/home', {
    ...B({ currentPath: '/', pageCanonical: '/' }),
    todayEvents,
    today,
    stories: stories.filter((s) => s.featured).slice(0, 3)
  });

  await go('/get-help', 'pages/get-help', {
    ...B({
      currentPath: '/get-help',
      pageTitle: 'Get Help Now',
      pageDescription:
        'Need help with addiction in Wolverhampton? Call SUIT on 01902 328983 or walk in to Paycare House. Free, confidential, lived experience support. No referral needed.',
      pageCanonical: '/get-help'
    })
  });

  await go('/services', 'pages/services', {
    ...B({
      currentPath: '/services',
      pageTitle: 'How We Help',
      pageDescription:
        'SUIT offers peer mentoring, advocacy, drop-in sanctuary, creative arts therapy, clinical treatment pathways, and volunteering. Free wraparound support in Wolverhampton.',
      pageCanonical: '/services'
    })
  });

  const progFile = readJSON('programmes.json');
  const programmes = progFile && progFile.programmes ? progFile.programmes : [];
  await go('/timetable', 'pages/timetable', {
    ...B({
      currentPath: '/timetable',
      pageTitle: 'The Timetable',
      pageDescription:
        'SUIT weekly diary: SMART Recovery, RISE Day Hab, women’s and men’s peer groups, weekly art group, and drop-ins. Recovery Hub Connaught Road and Paycare House, Wolverhampton.',
      pageCanonical: '/timetable'
    }),
    timetable,
    programmes
  });

  await go('/stories', 'pages/stories', {
    ...B({
      currentPath: '/stories',
      pageTitle: 'Stories of Hope',
      pageDescription:
        'Real recovery stories from the SUIT team in Wolverhampton. Read first-hand accounts of overcoming addiction from people with lived experience.',
      pageCanonical: '/stories'
    }),
    stories
  });

  for (const story of stories) {
    if (!story || !story.id) continue;
    const desc = String(story.quote || story.bio || (story.fullStory || '').slice(0, 160)).replace(/\s+/g, ' ');
    await go(`/stories/${story.id}`, 'pages/story-single', {
      ...B({
        currentPath: `/stories/${story.id}`,
        pageTitle: `${story.name || 'Story'}'s Story`,
        pageDescription: desc.slice(0, 160),
        pageCanonical: `/stories/${story.id}`
      }),
      story
    });
  }

  const timeline = readJSON('timeline.json') || [];
  const timelineCulture = readJSON('timeline-culture.json');
  await go('/timeline', 'pages/timeline', {
    ...B({
      currentPath: '/timeline',
      pageTitle: 'Our Timeline',
      pageDescription:
        "SUIT Wolverhampton's journey from 2007 to today. Key milestones, awards, partnerships, and the growth of Wolverhampton's Lived Experience Recovery Organisation.",
      pageCanonical: '/timeline'
    }),
    timeline,
    timelineCulture
  });

  const community = loadCommunityForPublic();
  const culturalOutreach = readJSON('cultural-outreach.json');
  const posts = sortedCommunityPosts(community);
  await go('/community', 'pages/community', {
    ...B({
      currentPath: '/community',
      pageTitle: 'SUIT in the Community',
      pageDescription:
        'Art, music, drama, events, and five years of SUIT making a difference in Wolverhampton. Exhibitions, conferences, PRIDE, performances, and community partnerships.',
      pageCanonical: '/community'
    }),
    community,
    culturalOutreach,
    posts
  });

  const outreach = readJSON('cultural-outreach.json');
  if (outreach && outreach.cards) {
    await go('/community/outreach', 'pages/cultural-outreach-hub', {
      ...B({
        currentPath: '/community/outreach',
        pageTitle: `${outreach.hubTitle || 'Cultural Outreach'} | SUIT`,
        pageDescription:
          outreach.hubIntro || 'Multilingual and culturally sensitive recovery outreach in Wolverhampton.',
        pageCanonical: '/community/outreach'
      }),
      outreach
    });
    for (const slug of Object.keys(outreach.programmes || {})) {
      const programme = outreach.programmes[slug];
      if (!programme || typeof programme !== 'object') continue;
      await go(`/community/outreach/${slug}`, 'pages/outreach-programme', {
        ...B({
          currentPath: `/community/outreach/${slug}`,
          pageTitle: `${programme.title} — Cultural Outreach | SUIT`,
          pageDescription: programme.heroLead || '',
          pageCanonical: `/community/outreach/${slug}`
        }),
        outreach,
        programme,
        slug
      });
    }
  }

  if (nm && nm.cards) {
    await go('/news-more', 'pages/news-more-hub', {
      ...B({
        currentPath: '/news-more',
        pageTitle: nm.hubTitle || 'News & More',
        pageDescription: (nm.hubIntro || '').slice(0, 160),
        pageCanonical: '/news-more'
      }),
      nm
    });
    for (const slug of Object.keys(nm.pages || {})) {
      const page = nm.pages[slug];
      if (!page || typeof page !== 'object') continue;
      await go(`/news-more/${slug}`, 'pages/news-more-page', {
        ...B({
          currentPath: `/news-more/${slug}`,
          pageTitle: `${page.title} — ${nm.hubTitle || 'News & More'}`,
          pageDescription: (page.heroLead || '').slice(0, 160),
          pageCanonical: `/news-more/${slug}`
        }),
        nm,
        page,
        slug
      });
    }
  }

  const teamData = readJSON('team.json') || { staff: [], volunteers: [] };
  await go('/about', 'pages/about', {
    ...B({
      currentPath: '/about',
      pageTitle: 'About the SUIT Family',
      pageDescription:
        "Meet the SUIT team — 11 staff members and 16 volunteers, all using lived experience to support others. Queen's Award winners, European Model of Good Practice, and CLERO members since 2007.",
      pageCanonical: '/about'
    }),
    staff: teamData.staff || [],
    volunteers: teamData.volunteers || []
  });

  await go('/contact', 'pages/contact', {
    ...B({
      currentPath: '/contact',
      pageTitle: 'Contact Us',
      pageDescription:
        'Contact SUIT Wolverhampton. Call 01902 328983, email suit@wvca.org.uk, or fill in our form. Paycare House, George Street, WV2 4DX.',
      pageCanonical: '/contact'
    }),
    sent: false
  });

  const communityPosts = community.posts || [];
  const feedItems = [];
  stories.forEach((s) => {
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
  communityPosts.forEach((p) => {
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
  feedItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  await go('/socials', 'pages/socials', {
    ...B({
      currentPath: '/socials',
      pageTitle: 'Follow SUIT — Socials & RSS Feed',
      pageDescription:
        'Follow SUIT Wolverhampton on Facebook, Instagram, X, and YouTube. Subscribe to our RSS feed for every story, community update, and recovery milestone.',
      pageCanonical: '/socials'
    }),
    feedItems
  });

  console.log('[prerender] Done.', count, 'HTML files written.');
}

main().catch((err) => {
  console.error('[prerender] Failed:', err);
  process.exit(1);
});
