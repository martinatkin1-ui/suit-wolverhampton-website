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
  // 1) Rebuild the real path from the __p query param (see vercel.json rewrite).
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

  // 2) After a POST (login, admin saves, etc.) Express replies with its default
  //    302 redirect. Vercel's rewrite layer rewrites 302->307 / 301->308, which
  //    PRESERVE the method — so the browser re-POSTs to the redirect target. That
  //    target (e.g. GET /admin) is GET-only, so it 404s and the action looks like
  //    it failed (this is why login appeared broken). Force non-GET redirects to
  //    303 See Other, which forces the browser to GET and which Vercel passes
  //    through unchanged. GET/HEAD redirects are left alone (307-of-a-GET is fine).
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const writeHead = res.writeHead;
    res.writeHead = function (status, ...rest) {
      if (status === 301 || status === 302) status = 303;
      return writeHead.call(this, status, ...rest);
    };
  }

  return app(req, res);
};
