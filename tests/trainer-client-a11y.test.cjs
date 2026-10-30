'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const vm = require('node:vm');
const { loadPage } = require('./support/page-model.cjs');
const ui = require('../assets/js/trainer-ui.js');

function runInlineScripts(page, globals) {
  const sandbox = { document: page.doc, console, URLSearchParams, setTimeout, clearTimeout, ...globals };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const script of page.doc.querySelectorAll('script')) {
    if (!script.getAttribute('src')) vm.runInContext(script.textContent, sandbox);
  }
  page.doc.readyState = 'complete';
  page.doc.dispatch('DOMContentLoaded');
  return sandbox;
}

function storage(values) {
  const map = new Map(Object.entries(values));
  return { getItem: (key) => (map.has(key) ? map.get(key) : null), setItem: (key, value) => map.set(key, String(value)), removeItem: (key) => map.delete(key) };
}

function mountTrainer() {
  const page = loadPage('trainer.html');
  const requests = [];
  runInlineScripts(page, {
    localStorage: storage({ fde_identity: JSON.stringify({ name: 'Synthetic Trainer', role: 'trainer' }), fde_session: 'synthetic' }),
    FDETrainerUI: ui,
    fetch: (url) => { requests.push(url); return new Promise(() => {}); },
    alert() {}, prompt() {},
  });
  return { page, requests, $: (id) => page.doc.getElementById(id) };
}

function px(value) {
  assert.match(value, /^-?[\d.]+(px)?$/, `expected a pixel length, got ${value}`);
  return parseFloat(value);
}

function flexParts(value) {
  const [grow, shrink, basis] = value.split(/\s+/);
  return { grow: Number(grow), shrink: Number(shrink), basis };
}

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

test('trainer report picker can shrink around long synthetic learner names at 320 and 390 CSS px', () => {
  const { page, $ } = mountTrainer();
  const select = $('rep-name');
  assert.equal(select.localName, 'select');
  const field = select.closest('.tr-field');
  assert.ok(field && field.classList.contains('rep-learner-field'), 'learner select must sit in the shrinkable report field');
  assert.equal(field.querySelector('label').getAttribute('for'), 'rep-name');
  const picker = field.closest('.rep-pick');
  assert.ok(picker, 'report field must sit in the report picker row');

  for (const width of [320, 390]) {
    const styles = page.styles({ width });
    const flex = flexParts(styles.computed(field, 'flex'));
    assert.ok(flex.shrink > 0, `${width}px: learner field must be allowed to shrink`);
    assert.ok(px(flex.basis) <= width, `${width}px: learner field basis must fit the viewport`);
    assert.equal(px(styles.computed(field, 'min-width')), 0, `${width}px: learner field min-width`);
    assert.equal(styles.computed(field, 'max-width'), '100%', `${width}px: learner field max-width`);
    assert.equal(px(styles.computed(select, 'min-width')), 0, `${width}px: learner select min-width overrides the 200px field default`);
    assert.equal(styles.computed(select, 'width'), '100%', `${width}px: learner select width`);
    assert.equal(styles.computed(select, 'max-width'), '100%', `${width}px: learner select max-width`);
    assert.equal(px(styles.computed(picker, 'min-width')), 0, `${width}px: picker min-width`);
    assert.equal(styles.computed(picker, 'flex-wrap'), 'wrap', `${width}px: picker wraps`);
  }
});

test('cohort validation is announced, associated, focused, and cleared after correction', () => {
  const { page, $ } = mountTrainer();
  const error = $('c-err');
  const input = $('c-num');
  assert.equal(error.getAttribute('role'), 'status');
  assert.equal(error.getAttribute('aria-live'), 'polite');
  assert.equal(error.getAttribute('aria-atomic'), 'true');

  input.value = '   ';
  $('c-go').click();
  assert.equal(error.textContent, 'Enter a cohort number.');
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.ok(input.getAttribute('aria-describedby').split(/\s+/).includes('c-err'));
  assert.equal(page.doc.activeElement, input);

  input.value = '2567';
  input.dispatch('input');
  assert.equal(error.textContent, '');
  assert.equal(input.getAttribute('aria-invalid'), null);
  assert.equal(input.getAttribute('aria-describedby'), null);
});

test('field error helpers preserve existing descriptions', () => {
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

test('trainer Curriculum Hub target renders at least 24 CSS pixels tall', () => {
  const page = loadPage('trainer.html');
  const links = page.doc.querySelectorAll('a').filter((link) => link.textContent.trim() === 'Curriculum Hub');
  assert.equal(links.length, 1);
  const [link] = links;
  assert.ok(link.classList.contains('topnav'));
  for (const width of [320, 390, 1280]) {
    const styles = page.styles({ width });
    assert.equal(styles.computed(link, 'display'), 'inline-flex', `${width}px: hub link display`);
    assert.ok(px(styles.computed(link, 'min-height')) >= 24, `${width}px: hub link target must be at least 24px`);
  }
});

test('Client Delivery has exactly one main landmark around both rendered persona states', () => {
  const page = loadPage('client-delivery.html');
  runInlineScripts(page, { location: { search: '' }, localStorage: storage({}) });
  const mains = page.doc.querySelectorAll('main');
  assert.equal(mains.length, 1);
  const [main] = mains;
  const heading = page.doc.querySelector('h1');
  assert.equal(heading.textContent, 'Client Delivery');
  assert.ok(heading.closest('main') === main, 'page heading must be inside main');
  const tabs = page.doc.getElementById('projtabs');
  const panel = page.doc.getElementById('panel');
  assert.ok(tabs.closest('main') === main && panel.closest('main') === main);

  const projects = tabs.querySelectorAll('.cd-proj');
  assert.deepEqual(projects.map((button) => button.dataset.proj), ['healthcare', 'finance']);
  for (const button of projects) {
    button.click();
    assert.ok(button.classList.contains('on'));
    assert.ok(panel.querySelector('h2').textContent.trim(), `${button.dataset.proj} panel renders a week title`);
    assert.ok(panel.querySelector('.cd-eyebrow').textContent.startsWith(button.querySelector('.pj-t').textContent));
    assert.equal(page.doc.querySelectorAll('main').length, 1, `${button.dataset.proj} state keeps one main landmark`);
  }
});
