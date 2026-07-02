/**
 * Vercel serverless entry (root): mounts the Express app for `/` (rewritten to /api).
 * The catch-all api/[...path].js handles /api/<one-or-more-segments> (e.g. /admin/login).
 * @see https://vercel.com/docs/frameworks/backend/express
 */
const app = require('../server.js');

module.exports = app;
