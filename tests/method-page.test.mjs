// Task B30: "How it works" (?page=method), the "Download the data (JSON)" links and the Space Apps footer line.
// Every number the page shows is read from a data file or our pipeline table; links go where the page says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { englishKeys, has, t } from '../static/js/i18n.js';
import { LIMITS_DO } from '../static/js/help.js';
import { limitsNumbers } from '../static/js/limits.js';
import {
  CANNOT, DATA_SOURCES, FAMILIAR, METHOD_FILES, PLUTO_TRIAL, REPO_URL, TRIAL_FILES, bandStrip, missionFacts, pipelineSteps, resultNumbers, trialFilePath,
} from '../static/js/method.js';
import { readDepth } from '../static/js/planetx.js';
import { shortAngle } from '../static/js/predict-story.js';
import { PAGES, parseRoute } from '../static/js/route.js';

const STATIC = fileURLToPath(new URL('../static/', import.meta.url));
const DATA = join(STATIC, 'data');
const read = (path) => JSON.parse(readFileSync(join(DATA, path), 'utf8'));
const files = { board: read(METHOD_FILES.board), receipt: read(METHOD_FILES.receipt), postmortem: read(METHOD_FILES.postmortem), depth: readDepth(read(METHOD_FILES.depth)) };
const HTML = readFileSync(join(STATIC, 'index.html'), 'utf8');

test('the results cards read the scoreboard, the post-mortem and the Planet X depth file', () => {
  const n = resultNumbers(files);
  const row = (id) => files.board.rows.find((item) => item.trial_id === id);
  assert.equal(n.pluto.status, row(PLUTO_TRIAL).status);
  assert.equal(n.pluto.error, shortAngle(row(PLUTO_TRIAL).model_error_arcsec));
  assert.equal(n.pluto.error, '5.9″');
  assert.equal(n.pluto.why, true, 'the "why" line needs the post-mortem file');
  assert.deepEqual([n.practice.hits, n.practice.n], [files.board.counts.retrospective_holdout.hit, 2]);
  const counts = files.board.asteroid_batch.counts;
  assert.deepEqual([n.asteroids.hits, n.asteroids.checked, n.asteroids.notScorable], [counts.hit, counts.hit + counts.miss, counts.insufficient_data + counts.ambiguous + counts.invalid_comparison]);
  assert.deepEqual([n.asteroids.few, n.asteroids.unclear], [counts.insufficient_data, counts.ambiguous]);
  const limits = limitsNumbers({ depth: files.depth });
  assert.deepEqual([n.planetX.low, n.planetX.high], [limits.low, limits.high], 'the same numbers as the "Can and can\'t do" dialog');
  // With no files, no number: the cards wait instead of inventing one.
  assert.deepEqual(resultNumbers({}), { pluto: null, practice: null, asteroids: null, planetX: null });
});

test('eight steps in order; Lock links the receipt\'s commit; Check says the team confirmation is pending', () => {
  const steps = pipelineSteps(files);
  assert.deepEqual(steps.map((step) => step.id), ['retrieve', 'select', 'clean', 'measure', 'model', 'lock', 'check', 'publish']);
  assert.equal(steps.find((step) => step.id === 'lock').href, `${REPO_URL}/commit/${files.receipt.commit}`);
  const pluto = files.board.rows.find((item) => item.trial_id === PLUTO_TRIAL);
  assert.equal(steps.find((step) => step.id === 'check').status, pluto.confirmation_pending ? 'pending' : 'done');
  assert.equal(pipelineSteps({}).find((step) => step.id === 'lock').status, 'missing', 'no receipt: no "Done"');
  for (const step of steps) {
    assert.ok(has(`method.status.${step.status}`) && has(`method.step.${step.id}.title`) && has(`method.step.${step.id}.text`) && has(`method.step.${step.id}.link`), step.id);
    if (step.external) continue;
    const route = parseRoute(step.href.slice(1));
    assert.ok(route.notes.length === 0, `${step.id}: ${step.href}`);
  }
  // Model and Check open the Pluto reveal at steps 2 and 6.
  assert.deepEqual(['model', 'check'].map((id) => parseRoute(steps.find((step) => step.id === id).href.slice(1))).map((route) => [route.page, route.trial, route.step]),
    [['predictions', PLUTO_TRIAL, 2], ['predictions', PLUTO_TRIAL, 6]]);
  assert.equal(parseRoute('page=predictions&trial=x&step=7').step, null);
  assert.equal(parseRoute('page=predictions&trial=x&step=2.5').step, null);
  assert.ok(PAGES.includes('method'));
});

test('SPHEREx facts cite a mission document; the band strip is our pipeline table', () => {
  const facts = missionFacts();
  assert.deepEqual(facts.map((fact) => fact.id), ['range', 'arrays', 'repeat', 'launch', 'data']);
  for (const fact of facts) assert.match(fact.source.href, /^https:\/\/(irsa\.ipac\.caltech\.edu|spherex\.caltech\.edu|www\.jpl\.nasa\.gov)\//, fact.id);
  assert.equal(t('method.fact.range.value', facts[0].values), '0.75 to 5 µm');
  assert.equal(t('method.fact.arrays.value', facts[1].values), '6');
  assert.deepEqual(bandStrip().map((band) => band.n), [1, 2, 3, 4, 5, 6]);
  assert.equal(bandStrip()[0].low, 0.75);
  assert.equal(bandStrip()[5].high, 5);
  assert.equal(t('method.bands.note'), 'Colours are for display, not physical.');
});

test('catalogue checks and sources: only services our code calls (no SkyBoT); every link is https', () => {
  assert.deepEqual(FAMILIAR.map((item) => item.id), ['stars', 'asteroids']);
  assert.deepEqual(DATA_SOURCES.map((item) => item.id), ['irsa', 'jpl', 'gaia', 'cds']);
  const page = [readFileSync(fileURLToPath(new URL('../static/js/method.js', import.meta.url)), 'utf8'), readFileSync(fileURLToPath(new URL('../static/js/method-ui.js', import.meta.url)), 'utf8')].join('\n');
  assert.ok(!/skybot|imcce/i.test(page), 'SkyBoT is not used, so the page does not list it');
  assert.ok(!englishKeys().some((key) => /skybot/i.test(key) || /SkyBoT|IMCCE/.test(t(key))), 'no SkyBoT string');
  for (const item of [...FAMILIAR, ...DATA_SOURCES]) for (const [href] of item.links) assert.match(href, /^https:\/\//);
  assert.equal(t('method.familiar.noMatch'), 'No match means ‘not in these catalogues’, not ‘new’.');
  assert.deepEqual(CANNOT, LIMITS_DO, 'the four limits are the dialog\'s');
});

test('download links point at published files only; links to the page and the footer line are in place', () => {
  for (const row of [...files.board.rows, ...files.board.asteroid_batch.rows]) {
    const present = TRIAL_FILES.filter((file) => existsSync(join(DATA, trialFilePath(row.trial_id, file))));
    assert.ok(present.includes('trial') && present.includes('prediction'), row.trial_id);
  }
  const index = read('index.json');
  for (const target of index.targets) if (target.investigation_path) assert.ok(existsSync(join(DATA, target.investigation_path)), target.key);
  assert.equal(t('download.label'), 'Download the data (JSON):');
  assert.equal(t('footer.spaceApps'), 'Built for the NASA Space Apps Challenge 2026. Not affiliated with or endorsed by NASA.');
  assert.match(HTML, /<footer class="site-footer">[\s\S]*data-t="footer\.spaceApps"[\s\S]*<\/footer>/);
  assert.match(HTML, /id="page-method"/);
  // "How it works →" from the top of Predictions, from About and from the "Can and can't do" dialog.
  for (const part of ['id="page-predictions"', 'id="page-about"', 'id="limits"']) {
    const at = HTML.indexOf(part);
    const next = HTML.indexOf('data-page-link="method"', at);
    assert.ok(at > 0 && next > at && next - at < 1500, part);
  }
  assert.equal(t('method.link'), 'How it works →');
  assert.equal(t('method.headline'), 'How we turn SPHEREx pictures into evidence');
});
