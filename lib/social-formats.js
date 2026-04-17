/**
 * Platform-specific text for the admin Share screen (copy/paste).
 * One-click posting via platform APIs can be added later if needed.
 */

function truncate(s, max) {
  const t = String(s || '').trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

function oneLineTeaser(item) {
  const sum = (item.summary || '').trim();
  const body = String(item.body || '')
    .replace(/\r\n/g, '\n')
    .split(/\n+/)[0]
    .trim();
  const raw = sum || body;
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * @param {object} item - page update record
 * @param {{ siteOrigin: string }} options
 */
function buildSocialSnippets(item, options) {
  const origin = String(options.siteOrigin || '').replace(/\/$/, '');
  const hash = `update-${item.id}`;
  const url = `${origin}/news-more/announcements#${hash}`;
  const title = String(item.title || '').trim();
  const teaser = oneLineTeaser(item);
  const teaserMed = teaser.length > 400 ? teaser.slice(0, 397) + '…' : teaser;

  return {
    facebook: {
      label: 'Facebook',
      text: `${title}${teaserMed ? `\n\n${teaserMed}` : ''}\n\n${url}`,
      hint: 'Paste as a post. Link previews depend on your page settings.'
    },
    instagram: {
      label: 'Instagram',
      text: `${title}${teaserMed ? `\n\n${teaserMed}` : ''}\n\nFull link and details: see our website (link in bio / stories).`,
      hint: 'Feed captions do not support tappable links. Upload square or vertical media separately; add the URL in your bio or a Story link sticker.'
    },
    twitter: {
      label: 'X (Twitter)',
      text: truncate(`${title}${teaser ? ` — ${teaser}` : ''} ${url}`, 280),
      hint: '280-character limit. Start a thread if you need more context.'
    },
    linkedin: {
      label: 'LinkedIn',
      text: `${title}${teaserMed ? `\n\n${teaserMed}` : ''}\n\nRead more: ${url}`,
      hint: 'Optional: add a document or native image post; keep the link in the first comment if you prefer.'
    },
    youtube: {
      label: 'YouTube (Community tab)',
      text: `${title}${teaserMed ? `\n\n${teaserMed}` : ''}\n\n${url}`,
      hint: 'Paste into the Community tab. Attach a thumbnail or poll separately if needed.'
    }
  };
}

module.exports = { buildSocialSnippets, truncate };
