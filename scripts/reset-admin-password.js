/**
 * Set a new admin password (local files and/or Neon when DATABASE_URL is set).
 *
 * Usage (from project root, with .env or env vars):
 *   ADMIN_NEW_PASSWORD='your-new-password-at-least-12-chars' node scripts/reset-admin-password.js
 *
 * Optional: ADMIN_USERNAME=admin (default admin)
 */
if (!process.env.VERCEL) {
  require('dotenv').config({ quiet: true });
}

const path = require('path');
const bcrypt = require('bcryptjs');
const cms = require('../lib/cms-store');

const root = path.join(__dirname, '..');
cms.init(root);

async function main() {
  const newPw = String(process.env.ADMIN_NEW_PASSWORD || '').trim();
  if (newPw.length < 12) {
    console.error('ADMIN_NEW_PASSWORD must be at least 12 characters (same rule as /admin/settings).');
    process.exit(1);
  }

  const username = String(process.env.ADMIN_USERNAME || 'admin').trim() || 'admin';
  const hash = await bcrypt.hash(newPw, 12);

  const prev = (await cms.readJSON('admin.json')) || {};
  const next = {
    username: prev.username || username,
    password: hash
  };

  await cms.writeJSON('admin.json', next);
  console.log('Updated admin login for username:', next.username);
  console.log(cms.cmsEnabled() ? '(stored in Neon cms_documents)' : '(stored in data/admin.json)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
