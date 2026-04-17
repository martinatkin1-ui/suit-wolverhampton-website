'use strict';

const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const fixtureDir = path.join(__dirname, 'fixtures', 'minimal-data');

function freshPageUpdates() {
  const resolved = require.resolve('../lib/page-updates');
  delete require.cache[resolved];
  return require('../lib/page-updates');
}

test.beforeEach(() => {
  process.env.SUIT_TEST_DATA_DIR = fixtureDir;
});

test.afterEach(() => {
  delete process.env.SUIT_TEST_DATA_DIR;
  delete require.cache[require.resolve('../lib/page-updates')];
});

test('announcements returns all items newest first', () => {
  const { getPageUpdates } = freshPageUpdates();
  const rows = getPageUpdates('news-more', 'announcements');
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.map((r) => r.id),
    ['new-announce', 'mid-both', 'old-gallery', 'legacy-outreach']
  );
});

test('gallery page lists items tagged nm:gallery', () => {
  const { getPageUpdates } = freshPageUpdates();
  const rows = getPageUpdates('news-more', 'gallery');
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.id),
    ['mid-both', 'old-gallery']
  );
});

test('outreach punjabi includes legacy scope item', () => {
  const { getPageUpdates } = freshPageUpdates();
  const rows = getPageUpdates('outreach', 'punjabi');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'legacy-outreach');
});

test('community hub lists c:general posts', () => {
  const { getPageUpdates } = freshPageUpdates();
  const rows = getPageUpdates('community', null);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'mid-both');
});

test('itemMatchesPageKey identifies gallery targets', () => {
  const pu = freshPageUpdates();
  const key = pu.pageKeyStr('news-more', 'gallery');
  assert.equal(key, 'news-more|||gallery');
  const ids = pu
    .loadRaw()
    .items.filter((item) => pu.itemMatchesPageKey(item, key))
    .map((i) => i.id)
    .sort();
  assert.deepEqual(ids, ['mid-both', 'old-gallery'].sort());
});
