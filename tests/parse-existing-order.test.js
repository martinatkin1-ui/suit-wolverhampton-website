'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePageUpdateExistingOrder } = require('../lib/parse-existing-order');

test('empty len returns []', () => {
  assert.deepEqual(parsePageUpdateExistingOrder('', 0), []);
  assert.deepEqual(parsePageUpdateExistingOrder('0,1', 0), []);
});

test('missing or blank order is identity', () => {
  assert.deepEqual(parsePageUpdateExistingOrder('', 3), [0, 1, 2]);
  assert.deepEqual(parsePageUpdateExistingOrder(null, 3), [0, 1, 2]);
  assert.deepEqual(parsePageUpdateExistingOrder('   ', 4), [0, 1, 2, 3]);
});

test('valid permutation is accepted', () => {
  assert.deepEqual(parsePageUpdateExistingOrder('2,0,1', 3), [2, 0, 1]);
  assert.deepEqual(parsePageUpdateExistingOrder(' 2 , 0 , 1 ', 3), [2, 0, 1]);
});

test('wrong length falls back to identity', () => {
  assert.deepEqual(parsePageUpdateExistingOrder('2,0', 3), [0, 1, 2]);
  assert.deepEqual(parsePageUpdateExistingOrder('0,1,2,3', 3), [0, 1, 2]);
});

test('duplicate index falls back to identity', () => {
  assert.deepEqual(parsePageUpdateExistingOrder('0,0,1', 3), [0, 1, 2]);
});

test('out of range falls back to identity', () => {
  assert.deepEqual(parsePageUpdateExistingOrder('0,1,3', 3), [0, 1, 2]);
  assert.deepEqual(parsePageUpdateExistingOrder('-1,0,1', 3), [0, 1, 2]);
});

test('non-integer token falls back to identity', () => {
  assert.deepEqual(parsePageUpdateExistingOrder('0,1,NaN', 3), [0, 1, 2]);
});
