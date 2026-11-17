// Task B36: the Sky map. Pure parts and wiring: loaded only when opened, honest labels, no server, credits on About.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatRaDec, raOf, SPHEREX_HIPS, TWOMASS_HIPS } from '../static/js/skymap.js';
import { SOURCES } from '../static/js/pages.js';
import { t } from '../static/js/i18n.js';

const html = readFileSync(new URL('../static/index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../static/js/main.js', import.meta.url), 'utf8');
const skymap = readFileSync(new URL('../static/js/skymap.js', import.meta.url), 'utf8');

test('positions: right ascension from −180…180, and the empty-sky note', () => {
  assert.equal(raOf(-90), 270);
  assert.equal(raOf(30.5), 30.5);
  assert.deepEqual(formatRaDec(128.22758, -62.03417), { ra: '128.2276', dec: '−62.0342' });
  assert.equal(t('skymap.empty', formatRaDec(10, 5)), 'RA 10.0000°, Dec +5.0000°. Pictures for any position need our server; on this site, pick a marked object.');
});

test('the survey is IRSA\'s SPHEREx DR1 all-sky HiPS, else 2MASS labelled as not SPHEREx', () => {
  assert.equal(SPHEREX_HIPS, 'https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube');
  assert.match(TWOMASS_HIPS, /2MASS/);
  assert.equal(t('skymap.sourceSpherex'), 'SPHEREx survey tiles, live from NASA/IPAC IRSA');
  assert.equal(t('skymap.source2mass'), '2MASS, not SPHEREx');
  assert.equal(t('skymap.linesNote'), 'Constellation lines are a guide, not SPHEREx data');
});

test('loaded only when opened, never from our server, and credited on About', () => {
  assert.ok(!/from '\.\/skymap\.js'/.test(main) && /import\('\.\/skymap\.js'\)/.test(main));
  assert.ok(!/api\.|\/api\//.test(skymap));
  assert.match(html, /<button id="skymap-open" type="button"/);
  assert.match(html, /<section id="skymap" class="skymap" hidden aria-labelledby="skymap-title">/);
  assert.ok(SOURCES.some((source) => source.id === 'aladin') && SOURCES.some((source) => source.id === 'celestial'));
  assert.match(t('about.src.aladin.use'), /Sky map/);
  assert.match(t('about.src.celestial.name'), /BSD-3/);
});
