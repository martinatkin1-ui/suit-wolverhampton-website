/**
 * CMS persistence: local data/*.json by default; Neon (PostgreSQL) when DATABASE_URL is set.
 * Also used with connect-pg-simple for durable express-session on serverless.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let dataDir = '';
let pool = null;
let schemaPromise = null;

function cmsEnabled() {
  if (String(process.env.CMS_USE_FILES_ONLY || '').trim() === '1') return false;
  return Boolean(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim());
}

function init(rootDir) {
  dataDir = path.join(rootDir, 'data');
  if (!cmsEnabled()) return;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.PG_POOL_MAX || '5', 10),
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 15000
  });
  pool.on('error', (err) => console.error('[neon] pool error', err.message));
}

async function ensureSchema() {
  if (!pool) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cms_documents (
          id TEXT PRIMARY KEY,
          body JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cms_media (
          id TEXT PRIMARY KEY,
          content_type TEXT NOT NULL,
          body BYTEA NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })();
  }
  await schemaPromise;
}

function readJSONFile(filename) {
  const p = path.join(dataDir, filename);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    console.error(`[readJSONFile] Invalid JSON: ${filename}`, err.message);
    return null;
  }
}

function writeJSONFile(filename, data) {
  const filePath = path.join(dataDir, filename);
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

async function readJSON(filename) {
  if (!cmsEnabled()) return readJSONFile(filename);
  await ensureSchema();
  try {
    const r = await pool.query('SELECT body FROM cms_documents WHERE id = $1', [filename]);
    if (r.rows.length) {
      let doc = r.rows[0].body;
      if (typeof doc === 'string') {
        try {
          doc = JSON.parse(doc);
        } catch (_) {
          return null;
        }
      }
      return doc;
    }
    const fromFile = readJSONFile(filename);
    if (fromFile != null) {
      await writeJSON(filename, fromFile);
    }
    return fromFile;
  } catch (err) {
    console.error('[neon] readJSON', filename, err.message);
    return readJSONFile(filename);
  }
}

async function writeJSON(filename, data) {
  if (!cmsEnabled()) {
    writeJSONFile(filename, data);
    return;
  }
  await ensureSchema();
  await pool.query(
    `INSERT INTO cms_documents (id, body) VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, updated_at = NOW()`,
    [filename, JSON.stringify(data)]
  );
}

/** @param {typeof import('express-session')} Session */
function getSessionStore(Session) {
  if (!cmsEnabled() || !pool) return null;
  const PgSession = require('connect-pg-simple')(Session);
  return new PgSession({
    pool,
    createTableIfMissing: true
  });
}

function getPool() {
  return pool;
}

/**
 * Store a binary asset in Neon (for serverless hosts where public/uploads is not writable).
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {Promise<string>} UUID primary key for GET /uploads/cms/:id
 */
async function saveMedia(buffer, contentType) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('saveMedia expects a Buffer');
  }
  if (!cmsEnabled()) {
    throw new Error('saveMedia requires DATABASE_URL (Neon)');
  }
  await ensureSchema();
  const id = crypto.randomUUID();
  const ct = String(contentType || 'application/octet-stream').slice(0, 200);
  await pool.query(`INSERT INTO cms_media (id, content_type, body) VALUES ($1, $2, $3)`, [
    id,
    ct,
    buffer
  ]);
  return id;
}

/**
 * @param {string} id
 * @returns {Promise<{ contentType: string, buffer: Buffer } | null>}
 */
async function readMedia(id) {
  if (!cmsEnabled() || !id || typeof id !== 'string') return null;
  await ensureSchema();
  try {
    const r = await pool.query('SELECT content_type, body FROM cms_media WHERE id = $1', [id]);
    if (!r.rows.length) return null;
    return { contentType: r.rows[0].content_type, buffer: r.rows[0].body };
  } catch (err) {
    console.error('[neon] readMedia', id, err.message);
    return null;
  }
}

module.exports = {
  init,
  cmsEnabled,
  readJSON,
  writeJSON,
  readJSONFile,
  writeJSONFile,
  getSessionStore,
  getPool,
  saveMedia,
  readMedia
};
