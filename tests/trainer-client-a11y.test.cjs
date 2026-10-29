'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const trainer = fs.readFileSync(path.join(ROOT, 'trainer.html'), 'utf8');
const clientDelivery = fs.readFileSync(path.join(ROOT, 'client-delivery.html'), 'utf8');
const ui = require('../assets/js/trainer-ui.js');

function element(attrs = {}) {
  const values = new Map(Object.entries(attrs).map(([key, value]) => [key, String(value)]));
  const listeners = {};
  return {
    id: attrs.id || '', hidden: false, tabIndex: 0, textContent: '', focused: false,
    classList: { toggle() {} },
    getAttribute(name) { return values.get(name) ?? null; },
    setAttribute(name, value) { values.set(name, String(value)); },
    removeAttribute(name) { values.delete(name); },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    dispatch(type, event = {}) { for (const fn of listeners[type] || []) fn(event); },
    focus() { this.focused = true; },
  };
}

function tabsHarness() {
  const reports = element({ id: 'tab-reports', 'data-tab': 'reports', 'aria-selected': 'true' });
  const logins = element({ id: 'tab-logins', 'data-tab': 'logins', 'aria-selected': 'false' });
  const reportsPanel = element({ 'data-panel': 'reports' });
  const loginsPanel = element({ 'data-panel': 'logins' });
  loginsPanel.hidden = true;
  const container = {
    querySelectorAll(selector) {
      if (selector === '.tr-tab') return [reports, logins];
      if (selector === '.tr-tabpanel') return [reportsPanel, loginsPanel];
      return [];
    },
  };
  ui.bindTabs(container);
  return { reports, logins, reportsPanel, loginsPanel };
}

function keyEvent(key) {
  return { key, prevented: false, preventDefault() { this.prevented = true; } };
}

test('trainer report picker can shrink around long synthetic learner names', () => {
  assert.match(trainer, /\.rep-learner-field\s*\{[^}]*flex:\s*1 1 240px;[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*\}/s);
  assert.match(trainer, /#rep-name\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*\}/s);
  assert.match(trainer, /<div class="tr-field rep-learner-field"><label for="rep-name">/);
  assert.match(trainer, /\.rep-pick\s*\{[^}]*min-width:\s*0;/s);
});

test('cohort validation is announced, associated, focused, and cleared after correction', () => {
  assert.match(trainer, /id="c-err" role="status" aria-live="polite" aria-atomic="true"/);
  const input = element({ 'aria-describedby': 'cohort-hint' });
  const error = element({ id: 'c-err' });
  ui.setFieldError(input, error, 'Enter a cohort number.', true);
  assert.equal(error.textContent, 'Enter a cohort number.');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(input.getAttribute('aria-describedby'), 'cohort-hint c-err');
  assert.equal(input.focused, true);
  ui.clearFieldError(input, error);
  assert.equal(error.textContent, '');
  assert.equal(input.getAttribute('aria-invalid'), null);
  assert.equal(input.getAttribute('aria-describedby'), 'cohort-hint');
});

test('trainer tabs use roving tabindex and arrow/Home/End selection movement', () => {
  const h = tabsHarness();
  assert.equal(h.reports.tabIndex, 0);
  assert.equal(h.logins.tabIndex, -1);

  const right = keyEvent('ArrowRight');
  h.reports.dispatch('keydown', right);
  assert.equal(right.prevented, true);
  assert.equal(h.reports.getAttribute('aria-selected'), 'false');
  assert.equal(h.reports.tabIndex, -1);
  assert.equal(h.logins.getAttribute('aria-selected'), 'true');
  assert.equal(h.logins.tabIndex, 0);
  assert.equal(h.logins.focused, true);
  assert.equal(h.reportsPanel.hidden, true);
  assert.equal(h.loginsPanel.hidden, false);

  const home = keyEvent('Home');
  h.logins.dispatch('keydown', home);
  assert.equal(h.reports.getAttribute('aria-selected'), 'true');
  assert.equal(h.reports.focused, true);

  const end = keyEvent('End');
  h.reports.dispatch('keydown', end);
  assert.equal(h.logins.getAttribute('aria-selected'), 'true');

  h.reports.dispatch('click');
  assert.equal(h.reports.getAttribute('aria-selected'), 'true');
  assert.equal(h.reportsPanel.hidden, false);
});

test('trainer Curriculum Hub target has an explicit area above 24 CSS pixels', () => {
  assert.match(trainer, /class="topnav trainer-hub-link"[^>]*>Curriculum Hub<\/a>/);
  const match = trainer.match(/\.trainer-hub-link\s*\{([^}]*)\}/s);
  assert.ok(match, 'trainer target rule is required');
  const height = Number(match[1].match(/min-height:\s*([\d.]+)px/)[1]);
  assert.ok(height >= 24, `expected at least 24px, got ${height}px`);
  assert.match(match[1], /display:\s*inline-flex/);
});

test('Client Delivery has exactly one main landmark around both persona states', () => {
  assert.equal((clientDelivery.match(/<main\b/g) || []).length, 1);
  assert.equal((clientDelivery.match(/<\/main>/g) || []).length, 1);
  const main = clientDelivery.match(/<main class="cd-wrap">([\s\S]*?)<\/main>/);
  assert.ok(main, 'unique Client Delivery content must be inside main');
  assert.match(main[1], /id="projtabs"/);
  assert.match(main[1], /id="panel"/);
  assert.match(clientDelivery, /healthcare:\s*\{/);
  assert.match(clientDelivery, /finance:\s*\{/);
  assert.ok(clientDelivery.indexOf('<h1>Client <b>Delivery</b></h1>') < clientDelivery.indexOf('id="panel"'));
});
