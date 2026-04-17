'use strict';

const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const fixtureDir = path.join(__dirname, 'fixtures', 'minimal-data');

function freshPageUpdates() {
  delete require.cache[require.resolve('../lib/page-updates')];
  return require('../lib/page-updates');
}

test.beforeEach(() => {
  process.env.SUIT_TEST_DATA_DIR = fixtureDir;
});

test.afterEach(() => {
  delete process.env.SUIT_TEST_DATA_DIR;
  delete require.cache[require.resolve('../lib/page-updates')];
});

test('normalizeCategoryIdsFromBody accepts array and dedupes', () => {
  const { normalizeCategoryIdsFromBody } = freshPageUpdates();
  assert.deepEqual(
    normalizeCategoryIdsFromBody({ categories: ['nm:gallery', 'nm:gallery', ' c:general '] }),
    ['nm:gallery', 'c:general']
  );
});

test('normalizeCategoryIdsFromBody single string becomes one id', () => {
  const { normalizeCategoryIdsFromBody } = freshPageUpdates();
  assert.deepEqual(normalizeCategoryIdsFromBody({ categories: 'nm:announcements' }), [
    'nm:announcements'
  ]);
});

test('validateCategoryIds rejects empty', () => {
  const { validateCategoryIds } = freshPageUpdates();
  assert.equal(validateCategoryIds([]), false);
});

test('validateCategoryIds accepts fixture-backed ids', () => {
  const { validateCategoryIds } = freshPageUpdates();
  assert.equal(validateCategoryIds(['nm:gallery', 'o:punjabi']), true);
});

test('validateCategoryIds rejects unknown id', () => {
  const { validateCategoryIds } = freshPageUpdates();
  assert.equal(validateCategoryIds(['nm:gallery', 'not-a-real-category']), false);
});
