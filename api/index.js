/**
 * Vercel serverless entry: mounts the Express app for ALL routes.
 *
 * Vercel does not honour `[...]` catch-all filename routing for this (non-Next)
 * Express project, so a single function cannot receive `/api/<multi/segment>`
 * paths directly. Instead, vercel.json rewrites every request to this one
 * function and carries the real path in the `__p` query param:
 *
 *   { "source": "/:path*", "destination": "/api?__p=:path*" }
 *
 * Here we rebuild req.url from `__p` (preserving any real query string) before
 * handing off to Express, so routes like `/admin/login` match. This keeps all
 * routing logic in files we own — server.js is left untouched.
 *
 * @see https://vercel.com/docs/frameworks/backend/express
 */
const app = require('../server.js');

module.exports = (req, res) => {
  try {
    const u = new URL(req.url || '/', 'http://internal');
    if (u.searchParams.has('__p')) {
      const p = u.searchParams.get('__p') || '';
      u.searchParams.delete('__p');
      const qs = u.searchParams.toString();
      req.url = '/' + String(p).replace(/^\/+/, '') + (qs ? '?' + qs : '');
    }
  } catch (_) {
    /* fall through with the original req.url */
  }
  return app(req, res);
};
