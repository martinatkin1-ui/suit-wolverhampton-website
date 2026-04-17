/**
 * Parse optional "links" textarea for page updates (admin).
 */

function parsePageUpdateLinks(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const links = [];
  raw.split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t) return;
    const pipe = t.indexOf('|');
    if (pipe > -1) {
      const label = t.slice(0, pipe).trim();
      const href = t.slice(pipe + 1).trim();
      if (href) links.push({ label: label || href, href });
    } else {
      links.push({ label: t, href: t });
    }
  });
  return links;
}

module.exports = { parsePageUpdateLinks };
