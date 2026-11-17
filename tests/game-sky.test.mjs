// The game's "Where is this in the sky?" panel: it is placed from the training points only, its tangent-plane maths
// round-trips, and the survey's wavelength frames come from IRSA's properties with the blank frames left out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tangentOffsetArcsec, tangentToSky } from '../static/js/coords.js';
import { BLANK_FRAMES, chartFov, frameFrequency, skyPlace, START_FRAME, surveyFacts } from '../static/js/game-sky.js';
import { guessView, lastMeasurement } from '../static/js/game.js';

const round = JSON.parse(readFileSync(new URL('../static/data/game/barnard-position.json', import.meta.url), 'utf8'));

test('tangentToSky inverts tangentOffsetArcsec', () => {
  for (const [ra0, dec0, east, north] of [[269.45, 4.77, -0.28, -11.09], [10, -60, 3600, -1800], [359.99, 89, 120, 40]]) {
    const sky = tangentToSky(ra0, dec0, east, north);
    const back = tangentOffsetArcsec(ra0, dec0, sky.ra, sky.dec);
    assert.ok(Math.abs(back.east - east) < 1e-6 && Math.abs(back.north - north) < 1e-6, JSON.stringify({ ra0, dec0, back }));
  }
});

test('the panel marks the last training measurement and the pre-reveal chart, never the answer', () => {
  const place = skyPlace(round);
  const origin = lastMeasurement(round);
  const at = tangentOffsetArcsec(round.frame.centre_ra_deg, round.frame.centre_dec_deg, place.star.ra, place.star.dec);
  assert.ok(Math.abs(at.east - origin.east_arcsec) < 1e-6 && Math.abs(at.north - origin.north_arcsec) < 1e-6);
  const view = guessView(round);
  assert.ok(Math.abs(place.spanArcsec - (view.east[1] - view.east[0])) < 1e-9);
  // Same result with every revealed part removed: nothing after the guess feeds the panel.
  const { baseline, model, actual, outcome, ...trainingOnly } = round;
  assert.deepEqual(skyPlace(trainingOnly), place);
  assert.equal(skyPlace({ ...round, frame: {} }), null);
});

test('the chart zoom is three chart widths, at least one arcminute', () => {
  assert.equal(chartFov(10), 1 / 60);
  assert.equal(chartFov(60), 3 / 60);
});

test('survey frames come from the properties file, without the blank dichroic frames', () => {
  const um = Array.from({ length: 102 }, (_, i) => (0.75 + i * 0.042).toFixed(3)).join(' ');
  const facts = surveyFacts(`# comment\nhips_pixel_scale     = 0.0035786\nhips_cube_depth = 102\nem_min = 7.430000e-07\nem_max = 5.009000e-06\nt_min = 60789.75\nt_max = 61174.49\ndata_cube_crval3_arr = ${um}\n`);
  assert.equal(facts.frames.length, 100);
  assert.ok(facts.frames.every((item) => !BLANK_FRAMES.has(item.frame)));
  assert.ok(facts.frames.some((item) => item.frame === START_FRAME));
  assert.ok(Math.abs(facts.pixelArcsec - 12.88296) < 1e-4);
  assert.deepEqual([facts.from, facts.to], [60789.75, 61174.49]);
  assert.deepEqual(surveyFacts('').frames, []);
});

test('each frame asks Aladin for a frequency inside that frame\'s step (its frame pick, as seen in its tile requests)', () => {
  const [depth, emMin, emMax] = [102, 7.43e-7, 5.009e-6];
  const low = 299792458 / emMax;
  const high = 299792458 / emMin;
  const aladinFrame = (hz) => Math.floor(((hz - low) / (high - low)) * depth);
  // What Aladin did with setSliceNumber(42) and (10): it fetched frames 17 and 58.
  const viaSlice = (slice) => aladinFrame(299792458 / (emMin + (slice / depth) * (emMax - emMin)));
  assert.deepEqual([viaSlice(42), viaSlice(10)], [17, 58]);
  for (let frame = 0; frame < depth; frame += 1) assert.equal(aladinFrame(frameFrequency(frame, depth, emMin, emMax)), frame);
});

test('the scale note only says "too small to see" when the chart is under three picture pixels', async () => {
  const { angleLabel, scaleKind } = await import('../static/js/game-sky.js');
  assert.equal(scaleKind(12.8, 12.9), 'tiny');
  assert.equal(scaleKind(30089.5, 12.9), 'visible');
  assert.equal(scaleKind(12.8, null), 'unknown');
  assert.deepEqual([angleLabel(12.8), angleLabel(300), angleLabel(30089.5)], ['12.8″', '5.0′', '8.4°']);
});

test('the sky is seen from inside (stereographic, zoom-out capped), never as a globe', async () => {
  const { MAX_FOV, ZOOMS } = await import('../static/js/game-sky.js');
  const source = readFileSync(new URL('../static/js/game-sky.js', import.meta.url), 'utf8');
  assert.match(source, /const PROJECTION = 'STG'/);
  assert.ok(MAX_FOV <= 150 && ZOOMS.every((zoom) => zoom.fov === null || zoom.fov <= MAX_FOV));
});

test('the picture starts in false colour, and every colour choice has a name in the strings file', async () => {
  const { COLOURS } = await import('../static/js/game-sky.js');
  const { has } = await import('../static/js/i18n.js');
  assert.equal(COLOURS[0], 'magma');
  assert.ok(COLOURS.includes('grayscale'));
  for (const name of COLOURS) assert.ok(has(`gamesky.colour.${name}`), name);
  assert.ok(has('gamesky.falseColour'));
});
