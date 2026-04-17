/**
 * One-time (or repeat-safe) copy of data/*.json into Neon cms_documents.
 * Requires DATABASE_URL in the environment.
 */
const fs = require('fs');
const path = require('path');

if (!process.env.VERCEL) {
  require('dotenv').config({ quiet: true });
}

const root = path.join(__dirname, '..');
const cms = require('../lib/cms-store');

cms.init(root);

async function main() {
  if (!cms.cmsEnabled()) {
    console.error('Set DATABASE_URL (Neon connection string) first.');
    process.exit(1);
  }
  const dataDir = path.join(root, 'data');
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const full = path.join(dataDir, f);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      console.warn('Skip (invalid JSON):', f, e.message);
      continue;
    }
    await cms.writeJSON(f, data);
    console.log('Upserted', f);
  }
  console.log('Done. Seeded', files.length, 'files.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
