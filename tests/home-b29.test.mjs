// Task B29: Home is the Solar System. The rules here are the pure ones: when the scene turns by itself, how fast it
// turns and time runs, the Famous targets' lines (from the data files) and the page's wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUTO_STEP, AUTO_TURN_SPEED, RESUME_MS, shouldTurn } from '../static/js/space-ui.js';
import { rateText } from '../static/js/time-ui.js';
import { famousLine, famousResult } from '../static/js/describe.js';

const html = readFileSync(new URL('../static/index.html', import.meta.url), 'utf8');
const index = JSON.parse(readFileSync(new URL('../static/data/index.json', import.meta.url), 'utf8'));

test('the scene turns by itself only with Auto rotate on, nobody handling it, nothing chosen and Home in view', () => {
  const base = { on: true, interacting: false, selected: false, onHome: true, inView: true, hidden: false };
  assert.equal(shouldTurn(base), true);
  for (const [name, value] of [['on', false], ['interacting', true], ['selected', true], ['onHome', false], ['inView', false], ['hidden', true]]) {
    assert.equal(shouldTurn({ ...base, [name]: value }), false, name);
  }
});

test('one turn in about two minutes, time at one day per second, the turn back 5 s after the last touch', () => {
  // OrbitControls: autoRotateSpeed 1 is one turn per 60 s.
  assert.equal(60 / AUTO_TURN_SPEED, 120);
  assert.equal(rateText(AUTO_STEP), '1 day/s');
  assert.equal(RESUME_MS, 5000);
});

test('Home has one Solar System view: the rail, the popup, the Auto rotate switch, the layers, the Key line and the search icon', () => {
  assert.ok(!html.includes('home-spacer') && !html.includes('id="rail"') && !html.includes('id="shortcut-list"'));
  assert.match(html, /<section id="famous" class="famous" aria-labelledby="famous-title">/);
  assert.match(html, /<div id="target-pop" class="target-pop glass" role="dialog" aria-labelledby="pop-name" hidden>/);
  assert.match(html, /<button id="auto-rotate" type="button" role="switch" aria-checked="true"/);
  for (const layer of ['orbits', 'labels', 'kuiper', 'nine']) assert.match(html, new RegExp(`role="switch" aria-checked="true" class="switch" data-layer="${layer}"`));
  assert.match(html, /data-t="key\.notToScale"/);
  assert.match(html, /<details id="head-search" class="head-search">[\s\S]*<form id="search"/);
  assert.match(html, /<p id="famous-filter-status" class="sr-only" aria-live="polite"><\/p>/);
});

test('"How it works" sits between Predictions and Planet X; the Space Apps line shows on Home and Investigate too', () => {
  const nav = html.slice(html.indexOf('<nav id="site-nav"'), html.indexOf('</nav>', html.indexOf('<nav id="site-nav"')));
  const at = (needle) => nav.indexOf(needle);
  assert.ok(at('data-t="nav.predictions"') < at('data-t="nav.method"') && at('data-t="nav.method"') < at('id="nav-planetx"'));
  assert.match(html, /<p class="famous-foot" data-t="footer\.spaceApps"><\/p>\s*<\/section>/);
  assert.match(html, /<p class="inv-foot" data-t="footer\.spaceApps"><\/p>/);
});
