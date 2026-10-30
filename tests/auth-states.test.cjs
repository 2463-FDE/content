'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../assets/js/auth.js'), 'utf8');

function node(tag = 'div') {
  const listeners = {};
  const attrs = new Map();
  return {
    tagName: tag.toUpperCase(),
    value: '', textContent: '', disabled: false, parentNode: null,
    className: '', children: [], style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(name, value) { attrs.set(name, String(value)); },
    getAttribute(name) { return attrs.get(name) ?? null; },
    hasAttribute(name) { return attrs.has(name); },
    removeAttribute(name) { attrs.delete(name); },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    dispatch(type, event = {}) { return Promise.all((listeners[type] || []).map(fn => fn(event))); },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    insertBefore(child) { return this.appendChild(child); },
    replaceChildren(...children) { this.children = children; },
    focus() { this.ownerDocument.activeElement = this; },
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
}

function authHarness(fetchImpl) {
  const domReady = [];
  const input = node('input');
  const error = node('div');
  const button = node('button');
  const overlay = node('div');
  const body = node('body');
  const head = node('head');
  const storage = new Map();
  let reloaded = false;
  const document = {
    currentScript: { src: 'https://example.test/assets/js/auth.js' },
    activeElement: null,
    body, head,
    createElement(tag) {
      if (tag === 'div') {
        overlay.ownerDocument = document;
        Object.defineProperty(overlay, 'innerHTML', {
          configurable: true,
          set() {
            input.ownerDocument = document; error.ownerDocument = document; button.ownerDocument = document;
            overlay.querySelector = selector => ({ '.lc-input': input, '.lc-err': error, '.lc-go': button }[selector] || null);
          },
        });
        return overlay;
      }
      const created = node(tag); created.ownerDocument = document; return created;
    },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener(type, fn) { if (type === 'DOMContentLoaded') domReady.push(fn); },
  };
  body.ownerDocument = document; head.ownerDocument = document;
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  };
  const context = {
    document, localStorage, fetch: fetchImpl,
    location: { reload() { reloaded = true; } },
    window: { FDE_RUN_URL: 'https://auth.test' },
    URL, setTimeout(fn) { fn(); }, console,
  };
  context.window.window = context.window;
  vm.runInNewContext(source, context, { filename: 'auth.js' });
  domReady.forEach(fn => fn());
  return { input, error, button, overlay, document, storage, get reloaded() { return reloaded; } };
}

test('invalid sign-in gives specific recovery, restores focus, and retains no identity', async () => {
  const ui = authHarness(async () => ({ ok: false, status: 401, async json() { return { ok: false }; } }));
  ui.input.value = 'not-a-code';
  await ui.button.dispatch('click');
  assert.match(ui.error.textContent, /wasn’t recognized/);
  assert.match(ui.error.textContent, /ask your trainer/);
  assert.equal(ui.document.activeElement, ui.input);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.overlay.hasAttribute('aria-busy'), false);
  assert.equal(ui.storage.has('fde_identity'), false);
  assert.equal(ui.reloaded, false);
});

test('sign-in outage is not misreported as a bad code and preserves recovery behavior', async () => {
  const ui = authHarness(async () => { throw new Error('offline'); });
  ui.input.value = 'trainer-provided-code';
  await ui.button.dispatch('click');
  assert.match(ui.error.textContent, /temporarily unavailable/);
  assert.match(ui.error.textContent, /code was not changed/);
  assert.doesNotMatch(ui.error.textContent, /wasn’t recognized/);
  assert.equal(ui.document.activeElement, ui.input);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.storage.has('fde_identity'), false);
});

test('successful sign-in stores server identity and token before reload', async () => {
  const ui = authHarness(async () => ({
    ok: true, status: 200,
    async json() { return { ok: true, name: '<Trainer>', role: 'trainer', token: 'signed-token' }; },
  }));
  ui.input.value = 'local-code';
  await ui.button.dispatch('click');
  assert.deepEqual(JSON.parse(ui.storage.get('fde_identity')), {
    code: 'local-code', name: '<Trainer>', role: 'trainer',
  });
  assert.equal(ui.storage.get('fde_session'), 'signed-token');
  assert.equal(ui.reloaded, true);
});
