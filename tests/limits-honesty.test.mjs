// Task B32a: three lines of "What Vestigium can and can't do" (dialog, About, How it works) come from the scoreboard
// and the trial and investigation files, and say no more than they do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { honestyFacts, saturates } from '../static/js/limits.js';
import { honestyTexts } from '../static/js/help.js';
import { englishKeys, t } from '../static/js/i18n.js';

const read = (path) => JSON.parse(readFileSync(new URL(`../static/data/${path}`, import.meta.url), 'utf8'));
const index = read('index.json');
const board = read(index.scoreboard_path);
const all = Object.fromEntries(index.targets.map((target) => [target.key, read(target.investigation_path)]));
const brightness = board.rows.filter((row) => row.quantity === 'brightness');
const predictions = Object.fromEntries(brightness.map((row) => [row.trial_id, read(`trials/${row.trial_id}/prediction.json`)]));
// What the dialog loads: Barnard's Star's investigation and those of the brightness trials' targets.
const loaded = { barnard: all.barnard, ...Object.fromEntries(brightness.map((row) => [row.target_key, all[row.target_key]])) };
const facts = honestyFacts({ index, board, investigations: loaded, predictions });

test('the facts: real tests, practice runs, saturated targets and RW Aurigae\'s real reason, from the files', () => {
  assert.deepEqual(facts.real, ['Pluto']);
  assert.equal(facts.asteroids, true);
  assert.deepEqual(facts.practice, ["Barnard's Star", 'Epsilon Indi B']);
  assert.deepEqual(facts.saturated, ["Barnard's Star", 'R Draconis']);
  assert.deepEqual(facts.positionInstead, ["Barnard's Star"]);
  assert.deepEqual(facts.tooLittle, ['R Draconis']);
  assert.deepEqual(facts.noPattern, [{ name: 'RW Aurigae', points: 15 }]);
  // The dialog loads only some investigations; over all 8 targets the saturated set is the same.
  assert.deepEqual(index.targets.filter((target) => saturates(all[target.key])).map((target) => target.name), facts.saturated);
  // RW Aurigae has usable brightness measurements, so it does not "saturate" in this sense.
  assert.ok(all.rwaur.photometry.n_measured > 0 && !saturates(all.rwaur));
});

test('the three lines say exactly what the user asked for', () => {
  const texts = honestyTexts(facts);
  assert.equal(texts.predict, "Our real tests (Pluto and the asteroids) are locked on GitHub before the newest pictures are opened. Practice runs (Barnard's Star, Epsilon Indi B) use data we had already seen, and are labelled that way.");
  assert.equal(t('limits.do.proof'), '→ We log who opened which data, and a test stays marked ‘confirmation pending’ until all four teammates confirm.');
  assert.equal(texts.saturatedLimit, "Very bright stars saturate SPHEREx, so their brightness cannot be measured (Barnard's Star and R Draconis).");
  assert.equal(texts.saturatedDo, "→ For Barnard's Star we use the position instead; R Draconis is marked ‘too little data’. RW Aurigae’s forecast had 15 brightness measurements to learn from, but no regular pattern to forecast from.");
  // The 15 is the frozen trial's training set (the investigation has more usable measurements, some held out).
  assert.equal(read('trials/rwaur-brightness-2026a/training.json').points.length, 15);
  assert.ok(all.rwaur.photometry.n_measured >= 15);
  // Before the files load: no names at all.
  const plain = honestyTexts({});
  assert.ok(!/Pluto|Barnard|Draconis|Aurigae/.test(Object.values(plain).join(' ')));
});

test('nowhere does the site say RW Aurigae saturates or that every forecast was locked before the pictures were seen', () => {
  for (const key of englishKeys()) {
    const text = t(key, { names: 'X', real: 'X', practice: 'X', name: 'X', n: '1' });
    assert.ok(!/RW Aur[^.]*(saturate SPHEREx|cannot be measured)|(saturate|saturated)[^.]*RW Aur/i.test(text) || /most pictures/.test(text), `${key}: ${text}`);
    assert.ok(!/each forecast is locked on GitHub before/i.test(text), `${key}: ${text}`);
    assert.ok(!/every teammate confirms/i.test(text), `${key}: ${text}`);
  }
  // About names exactly the saturated targets in its first sentence.
  const about = t('about.l.saturation').split(';')[0];
  assert.ok(about.includes('Barnard’s Star') && about.includes('R Draconis') && !about.includes('RW Aurigae'), about);
});
