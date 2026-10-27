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
  assert.deepEqual([...config.cloudPath.options], ['aws', 'gcp', 'both']);
  assert.equal(config.cloudPath.active, true);
  assert.deepEqual(config.batch.next, { id: null, label: 'Next batch', status: 'unconfigured' });
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
    api.contextualizeHref('d2a.html?cloud=gcp#exercise', '2567', 'https://example.test/content/weeks/w01/d1.html'),
    'https://example.test/content/weeks/w01/d2a.html?cloud=gcp&batch=2567#exercise',
  );
  assert.equal(
    api.contextualizeHref('https://outside.test/lesson', '2567', 'https://example.test/content/index.html'),
    'https://outside.test/lesson',
  );
});

test('Week 1 history, reload, and unsupported deep links resolve without cohort leakage', () => {
  const storage = memoryStorage({ fde_batch_context: '2567' });
  const location = { href: 'https://example.test/content/weeks/w01/d3b.html?batch=9001&cloud=aws#exercise' };
  const context = api.create(config, storage, location);

  assert.equal(context.read(), '9001');
  assert.equal(api.modelFor(config, context.read()), null);
  assert.equal(context.write(context.read()).persisted, true);
  assert.equal(storage.getItem('fde_batch_context'), '9001');

  location.href = 'https://example.test/content/weeks/w01/d3b.html?batch=2567&cloud=aws#exercise';
  assert.equal(context.read(), '2567');
  assert.equal(api.modelFor(config, context.read()).id, 'ltm-2567');

  // Reload keeps the deep-link model authoritative over stale persisted state.
  storage.setItem('fde_batch_context', '9001');
  const reloaded = api.create(config, storage, location);
  assert.equal(reloaded.read(), '2567');
  assert.equal(api.modelFor(config, reloaded.read()).id, 'ltm-2567');

  // Simulated back navigation restores the unsupported URL and never inherits 2567.
  location.href = 'https://example.test/content/weeks/w01/d3b.html?batch=9001&cloud=aws#exercise';
  assert.equal(reloaded.read(), '9001');
  assert.equal(api.modelFor(config, reloaded.read()), null);
});

test('storage outage keeps the selected page context explicit without inventing a cohort', () => {
  const brokenStorage = {
    getItem() { throw new Error('offline'); },
    setItem() { throw new Error('offline'); },
    removeItem() { throw new Error('offline'); },
  };
  const location = { href: 'https://example.test/content/weeks/w01/d1.html?batch=2567' };
  const context = api.create(config, brokenStorage, location);
  assert.equal(context.read(), '2567');
  assert.deepEqual(context.write('2567'), { ok: true, value: '2567', persisted: false });
  assert.equal(context.write('next').ok, false);
  assert.equal(config.batch.next.id, null);
});
