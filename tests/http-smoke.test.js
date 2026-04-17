'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

test('GET /__suit-health responds OK', async () => {
  const app = require('../server');
  const res = await request(app).get('/__suit-health').expect(200);
  assert.ok(typeof res.text === 'string');
  assert.ok(res.text.length > 0);
});

test('GET home returns 200 HTML', async () => {
  const app = require('../server');
  const res = await request(app).get('/').expect(200);
  assert.ok(res.headers['content-type']?.includes('html'));
});

test('GET /news-more/announcements resolves to200 (static may301 to trailing slash)', async () => {
  const app = require('../server');
  await request(app).get('/news-more/announcements').redirects(1).expect(200);
});
