// Task B17: the plain line under a target's name and the full-Moon comparison under the picture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countUpShown, FULL_MOON_ARCSEC, formatLightYears, lightYears, moonShare, plainLine } from '../static/js/describe.js';

test('the plain line says what a target is and how far away, from its kind and distance', () => {
  assert.equal(plainLine({ kind: 'faststar', distance: { value: 1.83, unit: 'pc' } }), 'A fast-moving star, 6 light-years away.');
  assert.equal(plainLine({ kind: 'browndwarf', distance: { value: 2.28, unit: 'pc' } }), 'A brown dwarf, 7.4 light-years away.');
  assert.equal(plainLine({ kind: 'dwarfplanet', distance: { value: 35, unit: 'au' } }), 'A dwarf planet in our Solar System.');
  assert.equal(plainLine({ kind: 'comet' }), 'An interstellar comet passing through our Solar System.');
  assert.equal(plainLine({ kind: 'variable' }), 'A variable star.');
  assert.equal(plainLine({ kind: 'custom' }), 'A position you chose in the sky.');
  assert.equal(plainLine({ kind: 'mystery', distance: { value: 10, unit: 'ly' } }), 'An object, 10 light-years away.');
  assert.equal(lightYears({ value: 35, unit: 'au' }), null);
  assert.equal(formatLightYears(5.97), '6');
  assert.equal(formatLightYears(2607.4), '2,607');
});

test('every challenge target in the site index gets a plain line without placeholders', () => {
  const index = JSON.parse(readFileSync(new URL('../static/data/index.json', import.meta.url), 'utf8'));
  for (const target of index.targets ?? []) {
    const line = plainLine({ kind: target.kind, distance: target.distance ?? null });
    assert.ok(line.endsWith('.') && !/[{}]/.test(line), `${target.key}: ${line}`);
  }
});

test('a shift is compared with the full Moon in plain words', () => {
  assert.equal(FULL_MOON_ARCSEC, 1860);
  assert.equal(moonShare(168), 'about a tenth of the full Moon’s width');
  assert.equal(moonShare(930), 'about half of the full Moon’s width');
  assert.equal(moonShare(3720), 'about 2 times the full Moon’s width');
  assert.equal(moonShare(5), 'far less than a hundredth of the full Moon’s width');
  assert.equal(moonShare(0), null);
  assert.equal(moonShare(Number.NaN), null);
});

// Task B28: the "Estimate motion" big number counts up from 0 and never shows a value below 0 or past the result.
test('the count-up starts at 0, ends on the value and never goes below 0 or past it', () => {
  const value = 9.94;
  assert.equal(countUpShown(value, 0, 800), 0);
  assert.equal(countUpShown(value, -16, 800), 0); // a frame time slightly before the start
  assert.equal(countUpShown(value, 800, 800), value);
  assert.equal(countUpShown(value, 5000, 800), value);
  assert.equal(countUpShown(value, 100, 0), value); // no animation: the value at once
  let last = 0;
  for (let ms = -50; ms <= 900; ms += 7) {
    const shown = countUpShown(value, ms, 800);
    assert.ok(shown >= 0 && shown <= value && shown >= last, `${ms} ms: ${shown}`);
    last = shown;
  }
});
