// Task B29g: Home's Famous targets cards and popups say no more than the record. Every line is checked against
// scoreboard.json (status, trial type, confirmation pending, the model's error, the see-only list) for all 8 targets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arcsecShort, famousLine, famousResult } from '../static/js/describe.js';
import { buildTargets } from '../static/js/targets.js';
import { famousEntries } from '../static/js/home.js';

const read = (path) => JSON.parse(readFileSync(new URL(`../static/data/${path}`, import.meta.url), 'utf8'));
const index = read('index.json');
const board = read(index.scoreboard_path);
const entries = famousEntries(buildTargets(index, []));
const lines = Object.fromEntries(entries.map((entry) => {
  const result = famousResult({ key: entry.key, board, trialIds: entry.prediction.trialIds });
  return [entry.key, { card: famousLine({ kind: entry.kind, distance: entry.map?.distance, status: result.card }), popup: result.popup }];
}));

test('the eight cards and popups say exactly what the user asked for, from the scoreboard', () => {
  assert.equal(entries.length, 8);
  assert.equal(lines.makemake.card, 'dwarf planet · too little data to forecast');
  assert.equal(lines.pluto.card, 'dwarf planet · blind forecast, confirmation pending');
  assert.equal(lines['3i-atlas'].card, 'interstellar comet · pictures only');
  assert.equal(lines.barnard.card, 'fast-moving star · 6 ly');
  assert.equal(lines.barnard.popup, 'Practice run: hit, 1.52″ off');
  assert.equal(lines.epsindib.popup, 'Practice run: hit, 0.08″ off');
  assert.equal(lines.pluto.popup, 'Real test: missed by 5.9″');
  assert.equal(lines.makemake.popup, 'Too little data to forecast');
  assert.equal(lines['3i-atlas'].popup, 'Pictures only');
  for (const key of ['wise0855', 'rwaur', 'rdra']) assert.equal(lines[key].popup, 'Too little data to forecast', key);
});

test('every card and popup line matches its scoreboard status and never overstates it', () => {
  for (const entry of entries) {
    const { card, popup } = lines[entry.key];
    const row = board.rows.find((item) => item.target_key === entry.key && entry.prediction.trialIds.includes(item.trial_id))
      ?? board.rows.find((item) => item.target_key === entry.key);
    const seeOnly = board.see_only.includes(entry.key);
    const both = `${card} | ${popup}`;
    assert.ok(!/preregistered/i.test(both), `${entry.key}: ${both}`);
    // A forecast is named only where the scoreboard has a scored model (hit or miss); "blind" only for a real test.
    if (/forecast,|blind/.test(both)) assert.ok(row && ['hit', 'miss'].includes(row.status) && row.category === 'prospective_unexposed', `${entry.key}: ${both}`);
    assert.equal(/pictures only/i.test(both), seeOnly, entry.key);
    assert.equal(/too little data/i.test(both), row?.status === 'insufficient_data' && !seeOnly, entry.key);
    if (row?.status === 'hit' || row?.status === 'miss') {
      assert.ok(popup.includes(arcsecShort(row.model_error_arcsec)), `${entry.key}: ${popup}`);
      assert.ok(popup.startsWith(row.category === 'prospective_unexposed' ? 'Real test' : 'Practice run'), `${entry.key}: ${popup}`);
      assert.ok(row.status === 'hit' ? /: hit, / .test(popup) : /missed by/.test(popup), `${entry.key}: ${popup}`);
    }
    if (/confirmation pending/.test(card)) assert.equal(row.confirmation_pending, true, entry.key);
  }
});

test('an open forecast without a model is not called a forecast (Makemake)', () => {
  const makemake = entries.find((entry) => entry.key === 'makemake');
  assert.ok(index.targets.find((target) => target.key === 'makemake').prediction.open_forecast_ids.length > 0);
  assert.ok(!/forecast,|blind/.test(`${lines.makemake.card} ${lines.makemake.popup}`));
  assert.equal(read(`trials/${index.targets.find((target) => target.key === 'makemake').prediction.open_forecast_ids[0]}/prediction.json`).prediction_status, 'insufficient_data');
  assert.ok(makemake);
});

test('without the scoreboard the cards claim nothing and say the status is unknown (See only still from index.json)', () => {
  for (const entry of entries) {
    const result = famousResult({ key: entry.key, board: null, seeOnly: entry.seeOnly });
    if (entry.seeOnly) assert.deepEqual(result, { card: 'pictures only', popup: 'Pictures only' });
    else assert.deepEqual(result, { card: null, popup: 'Forecast status unavailable' });
  }
});

test('another trial type is not called a practice run, and an exploratory row is never the headline', () => {
  const row = { target_key: 'x', trial_id: 'x-1', category: 'illustrative', status: 'hit', model_error_arcsec: 1, exploratory: false };
  assert.deepEqual(famousResult({ key: 'x', board: { see_only: [], rows: [row] } }), { card: null, popup: 'Trial: hit, 1″ off' });
  const exploratory = { ...row, category: 'retrospective_holdout', exploratory: true };
  assert.equal(famousResult({ key: 'x', board: { see_only: [], rows: [exploratory] } }).popup, 'No forecast yet');
});
