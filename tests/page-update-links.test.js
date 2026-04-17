'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePageUpdateLinks } = require('../lib/page-update-links');

test('empty input', () => {
  assert.deepEqual(parsePageUpdateLinks(''), []);
  assert.deepEqual(parsePageUpdateLinks(null), []);
});

test('single URL line', () => {
  assert.deepEqual(parsePageUpdateLinks('https://example.org'), [
    { label: 'https://example.org', href: 'https://example.org' }
  ]);
});

test('label pipe URL', () => {
  assert.deepEqual(parsePageUpdateLinks('Our site|https://suit.example/'), [
    { label: 'Our site', href: 'https://suit.example/' }
  ]);
  assert.deepEqual(parsePageUpdateLinks('|https://only.href'), [
    { label: 'https://only.href', href: 'https://only.href' }
  ]);
});

test('skips blank lines and trims', () => {
  const raw = '\n  https://a.test  \n\nLabel|https://b.test\n';
  assert.deepEqual(parsePageUpdateLinks(raw), [
    { label: 'https://a.test', href: 'https://a.test' },
    { label: 'Label', href: 'https://b.test' }
  ]);
});
