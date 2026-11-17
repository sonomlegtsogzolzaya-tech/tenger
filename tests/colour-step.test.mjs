// Task B31: the Colour slider under the picture (All · D1–D6). Display only: it sets the existing band (the URL band
// value), each array keeps one stretch for every date, and pictures with one colour (AllWISE, previews) turn it off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { t } from '../static/js/i18n.js';
import { bandToParam, parseBand } from '../static/js/route.js';
import { CHANNELS, DETECTOR_RANGES } from '../static/js/stack.js';

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const HTML = read('../static/index.html');
const MAIN = read('../static/js/main.js');

test('the line and the step labels come from our array table', () => {
  assert.equal(t('colourStep.line', { channels: String(CHANNELS), arrays: String(Object.keys(DETECTOR_RANGES).length) }),
    'SPHEREx sees every patch of sky in 102 colours, recorded by 6 detector arrays. Slide to see each one.');
  const label = (n) => t('colourStep.arrayValue', { n: String(n), low: DETECTOR_RANGES[n][0].toFixed(2), high: DETECTOR_RANGES[n][1].toFixed(2) });
  assert.equal(label(1), 'D1 · 0.75–1.09 µm');
  assert.equal(label(2), 'D2 · 1.10–1.62 µm');
  assert.equal(label(6), 'D6 · 4.42–5.00 µm');
  assert.equal(t('colourStep.allValue', { low: '0.75', high: '5.00' }), 'All · 0.75–5.00 µm');
  assert.equal(t('colourStep.single'), 'Only one colour is available for this picture. Pick two SPHEREx dates as A and B to see each colour.');
});

test('each step is a band the URL already carries, and back', () => {
  for (let n = 1; n <= 6; n += 1) assert.deepEqual(parseBand(bandToParam({ kind: 'detector', detector: n })), { kind: 'detector', detector: n });
  assert.deepEqual(parseBand(bandToParam({ kind: 'composite' })), { kind: 'composite' });
});

test('the control sits next to Contrast, sets the band, and is off for AllWISE and previews', () => {
  const contrast = HTML.indexOf('class="contrast-control"');
  const colour = HTML.indexOf('id="colour-step-control"');
  assert.ok(contrast > 0 && colour > contrast && colour - contrast < 1200, 'right after Contrast under the picture');
  assert.match(HTML, /<input id="colour-step" type="range" min="0" max="6" step="1" value="0"/);
  // The slider only calls setBand, the same path as the array tiles and ?band= (no new data, no measurement).
  const handler = MAIN.slice(MAIN.indexOf("$('colour-step').addEventListener('input'"), MAIN.indexOf('syncColourStep();\n}', MAIN.indexOf('function buildColourStep')));
  assert.match(handler, /setBand\(step >= 1 && step <= arrays \? \{ kind: 'detector', detector: step \} : \{ kind: 'composite' \}\)/);
  const single = MAIN.slice(MAIN.indexOf('function singleColour()'), MAIN.indexOf('function syncColourStep()'));
  assert.match(single, /state\.previews/);
  assert.match(single, /WISE_STEP/);
  // One stretch per array for every date: the painter still uses sharedLimits for a single array.
  assert.match(MAIN, /paintMono\(buffer, size, stacks\.image, sharedLimits\(size, band\), tintFor\(band\)\)/);
});
