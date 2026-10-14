'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../assets/js/batch-context.js');
const config = require('../assets/js/curriculum-config.js');

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test('deep-link batch wins over persisted state and remains the selected model on reload', () => {
  const storage = memoryStorage({ fde_batch_context: '2463' });
  const location = { href: 'https://example.test/content/index.html?batch=2567#trainer-start' };
  const context = api.create(config, storage, location);

  assert.equal(context.read(), '2567');
  assert.equal(context.write(context.read()).persisted, true);
  assert.equal(storage.getItem('fde_batch_context'), '2567');
  assert.equal(api.modelFor(config, context.read()).id, 'ltm-2567');
});

test('supported cohorts resolve explicitly and unrelated cohorts do not inherit 2567 content', () => {
  assert.equal(api.modelFor(config, '2567').id, 'ltm-2567');
  assert.equal(api.modelFor(config, '2463'), null);
  assert.equal(api.modelFor(config, '987654321'), null);
});

test('curriculum navigation carries batch context without dropping route state', () => {
  assert.equal(
    api.contextualizeHref('client-delivery.html?w=5#packet', '2567', 'https://example.test/content/index.html'),
    'https://example.test/content/client-delivery.html?w=5&batch=2567#packet',
  );
  assert.equal(
    api.contextualizeHref('../../index.html#curriculum', '2567', 'https://example.test/content/weeks/w06/w06d1.html'),
    'https://example.test/content/index.html?batch=2567#curriculum',
  );
  assert.equal(
    api.contextualizeHref('https://outside.test/lesson', '2567', 'https://example.test/content/index.html'),
    'https://outside.test/lesson',
  );
});
