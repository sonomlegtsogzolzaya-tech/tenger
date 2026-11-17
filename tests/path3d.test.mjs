// Task B34: "Path through time (3D)". Every dot is one exposure in the published investigation file that our
// pipeline measured and identified as the target, at that exposure's own time and sky offset; dots are joined in date
// order; the model line comes only from the file's own fit. Checked against the files with an independent projection.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { t } from '../static/js/i18n.js';
import { MIN_POINTS, floorFrame, pathData, scaleArcsec } from '../static/js/path3d.js';

const read = (path) => JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'));
const doc = (key) => read(`../static/data/${key}/investigation.json`);
const UI = readFileSync(fileURLToPath(new URL('../static/js/path3d-ui.js', import.meta.url)), 'utf8');

/** Tangent-plane offsets by 3D unit vectors (a different route from path3d.js's spherical formulae). */
function vectorOffsets(ra0, dec0, ra, dec) {
  const unit = (a, d) => {
    const [ar, dr] = [a * Math.PI / 180, d * Math.PI / 180];
    return [Math.cos(dr) * Math.cos(ar), Math.cos(dr) * Math.sin(ar), Math.sin(dr)];
  };
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const centre = unit(ra0, dec0);
  const eastAxis = [-Math.sin(ra0 * Math.PI / 180), Math.cos(ra0 * Math.PI / 180), 0];
  const northAxis = [-Math.sin(dec0 * Math.PI / 180) * Math.cos(ra0 * Math.PI / 180), -Math.sin(dec0 * Math.PI / 180) * Math.sin(ra0 * Math.PI / 180), Math.cos(dec0 * Math.PI / 180)];
  const point = unit(ra, dec);
  const depth = dot(point, centre);
  const toArcsec = 180 / Math.PI * 3600;
  return { east: (dot(point, eastAxis) / depth) * toArcsec, north: (dot(point, northAxis) / depth) * toArcsec };
}

const identified = (row) => row.status === 'measured' && Number.isFinite(row.ra_deg) && Number.isFinite(row.dec_deg)
  && ('identified' in row ? row.identified === true && !row.contaminant : row.identification === 'body');

for (const key of ['barnard', 'epsindib', 'pluto']) {
  test(`${key}: every dot is a measured, identified exposure at its own date and offset, joined in date order`, () => {
    const file = doc(key);
    const rows = file.astrometry.per_exposure.filter(identified).sort((a, b) => a.mjd - b.mjd);
    const path = pathData(file);
    assert.ok(path && rows.length >= MIN_POINTS);
    assert.equal(path.points.length, rows.length);
    const origin = file.astrometry.reference ?? { ra_deg: rows[0].ra_deg, dec_deg: rows[0].dec_deg };
    rows.forEach((row, index) => {
      const point = path.points[index];
      assert.equal(point.mjd, row.mjd, `${key} #${index}: date`);
      assert.equal(point.obsKey, row.obs_key);
      const expected = vectorOffsets(origin.ra_deg, origin.dec_deg, row.ra_deg, row.dec_deg);
      assert.ok(Math.abs(point.east - expected.east) < 1e-6 && Math.abs(point.north - expected.north) < 1e-6, `${key} #${index}: offset`);
      if (index) assert.ok(point.mjd >= path.points[index - 1].mjd, 'date order');
    });
    // The floor holds every dot.
    const frame = floorFrame(path);
    for (const point of path.points) assert.ok(Math.abs(point.east - frame.centre.east) <= frame.half && Math.abs(point.north - frame.centre.north) <= frame.half);
    assert.ok(scaleArcsec(frame.half * 2) > 0);
  });
}

test('no model line: our model publishes no path over these dates, and the straight-line baseline is not drawn as one', () => {
  for (const key of ['barnard', 'epsindib', 'pluto']) assert.equal(pathData(doc(key)).model, null, key);
  // The stars' trial model (proper motion with parallax) has no track in its prediction file.
  for (const trial of ['barnard-position-2026b', 'epsindib-position-2026b']) {
    const prediction = read(`../static/data/trials/${trial}/prediction.json`);
    assert.ok(prediction.track === null || prediction.track === undefined, trial);
  }
  assert.equal(t('path3d.noModel'), 'Our files have no computed model path over these dates, so only the measured dots are drawn.');
});

test('targets whose files have fewer than 3 measured, identified positions get no panel', () => {
  // WISE 0855: its measured detections are all flagged as a contaminating source; Makemake: a static source.
  for (const key of ['wise0855', 'makemake', 'rwaur', 'rdra']) assert.equal(pathData(doc(key)), null, key);
});

test('the words, three.js loaded only on opening, and no auto-spin under reduced motion', () => {
  assert.equal(t('path3d.caption'), 'The floor is the sky (east left, north up); height is time. Drag to turn.');
  assert.equal(t('path3d.title'), 'Path through time (3D)');
  assert.equal(t('path3d.measured'), 'Measured by us from SPHEREx');
  assert.equal(t('path3d.shadow'), 'Shadow on the floor');
  assert.equal(t('path3d.reset'), 'Reset view');
  assert.ok(!/^import [^;]*three-tenger/m.test(UI), 'no static import of three.js');
  assert.match(UI, /import\('\.\.\/vendor\/three\/three-tenger\.min\.js'\)/);
  assert.match(UI, /controls\.autoRotate = !still;/);
  assert.match(UI, /const still = prefersReducedMotion\(\);/);
});
