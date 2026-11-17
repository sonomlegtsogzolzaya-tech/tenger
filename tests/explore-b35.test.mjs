// Task B35: "More to explore" on Home: the search list's prepared objects, grouped as in search, pictures only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { exploreGroups } from '../static/js/home.js';
import { legacyPlaces } from '../static/js/targets.js';
import { has, t } from '../static/js/i18n.js';

const read = (path) => JSON.parse(readFileSync(new URL(`../static/data/${path}`, import.meta.url), 'utf8'));
const presets = read('targets.json');
const index = read('index.json');
const board = read(index.scoreboard_path);
const places = legacyPlaces(presets, index.targets.map((target) => ({ key: target.key })));
const groups = exploreGroups(places);
const keys = groups.flatMap((group) => group.members.map((entry) => entry.key));

test('More to explore lists the 17 prepared objects in the search groups, in search order', () => {
  assert.deepEqual(groups.map((group) => [group.group, group.members.length]), [['stars', 6], ['galaxies', 4], ['nebulae', 4], ['clusters', 3]]);
  assert.deepEqual(groups.map((group) => t(`category_${group.group}`)), ['Fast stars', 'Galaxies', 'Nebulae', 'Star clusters']);
  for (const key of ['barnard', 'wise0855', 'epsindib', 'rwaur', 'rdra', 'pluto', 'makemake', '3i-atlas']) assert.ok(!keys.includes(key), key);
});

test('each has its prepared pictures in the site (no server needed) and its one-line description', () => {
  for (const key of keys) {
    for (const file of ['meta.json', 'frames.bin.gz']) assert.ok(existsSync(new URL(`../static/data/${key}/${file}`, import.meta.url)), `${key}/${file}`);
    assert.ok(has(`hook_${key}`), `hook_${key}`);
  }
});

test('"Pictures only: no forecast" is true: none of them has a trial on the scoreboard', () => {
  assert.equal(t('explore.picturesOnly'), 'Pictures only: no forecast');
  for (const row of [...board.rows, ...(board.asteroid_batch?.rows ?? [])]) assert.ok(!keys.includes(row.target_key), row.trial_id);
  assert.ok(!index.targets.some((target) => keys.includes(target.key)));
});

test('an excluded object is left out', () => {
  assert.ok(!exploreGroups(places, ['m31']).flatMap((group) => group.members).some((entry) => entry.key === 'm31'));
});
