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

// Redirect statuses whose "preserve the HTTP method" semantics break POST/redirect/GET.
const METHOD_PRESERVING_REDIRECTS = new Set([301, 302, 307, 308]);

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

  // 2) After a POST (login, admin saves, etc.) Express replies with a redirect.
  //    On Vercel that status arrives as 307/308 (Vercel's Node bridge converts
  //    302->307 / 301->308 via the statusCode setter to preserve the method), so
  //    the browser RE-POSTs to the redirect target. That target (e.g. GET /admin)
  //    is GET-only, so it 404s and the whole action looks like it failed — this is
  //    why login appeared broken even though auth succeeded and the cookie was set.
  //
  //    For non-GET requests, coerce any method-preserving redirect status to 303
  //    See Other, which forces the browser to follow up with a GET. We patch both
  //    the statusCode setter (where the 302->307 conversion happens) and writeHead
  //    (belt and suspenders). GET/HEAD redirects are untouched.
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      let code = res.statusCode;
      Object.defineProperty(res, 'statusCode', {
        configurable: true,
        enumerable: true,
        get() {
          return code;
        },
        set(v) {
          code = METHOD_PRESERVING_REDIRECTS.has(v) ? 303 : v;
        }
      });
    } catch (_) {
      /* statusCode not redefinable; rely on the writeHead patch below */
    }

    const writeHead = res.writeHead;
    res.writeHead = function (status, ...rest) {
      if (METHOD_PRESERVING_REDIRECTS.has(status)) status = 303;
      return writeHead.call(this, status, ...rest);
    };
  }

  return app(req, res);
};
