// Task B34: "Path through time (3D)" in What changed. Pure: an investigation file in, the measured path out; no DOM.
// Every dot is one exposure our pipeline measured AND identified as the target (stars: identified === true; Solar
// System bodies: identification === 'body'), at its own time, as a gnomonic offset (east, north, arcsec) from the
// file's astrometry reference (stars) or from the first measured position (bodies, which have none). Nothing is typed in.

export const MIN_POINTS = 3;
const DEG = Math.PI / 180;
const ARCSEC_PER_RAD = 180 / Math.PI * 3600;

/** Gnomonic (standard coordinate) offsets of (ra, dec) from (ra0, dec0) in arcsec, as backend/astrometry.py. */
export function tangentOffsets(ra0, dec0, ra, dec) {
  const [a0, d0, a, d] = [ra0, dec0, ra, dec].map((value) => value * DEG);
  const cosC = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
  const xi = (Math.cos(d) * Math.sin(a - a0)) / cosC;
  const eta = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0)) / cosC;
  return { east: xi * ARCSEC_PER_RAD, north: eta * ARCSEC_PER_RAD };
}

const finite = (value) => Number.isFinite(value);

/** True for an exposure measured and identified as the target itself. */
export function isTargetMeasurement(row) {
  if (row?.status !== 'measured' || !finite(row.ra_deg) || !finite(row.dec_deg) || !finite(row.mjd)) return false;
  if ('identified' in row) return row.identified === true && !row.contaminant;
  return row.identification === 'body';
}

/**
 * The path of a target, or null when its file has fewer than MIN_POINTS measured, identified positions.
 * Returns { origin: {ra, dec, kind: 'reference'|'first'}, points: [{mjd, east, north, visit, obsKey}] in time order,
 * visits: [{visit, mjd (mean), n}], model: null | {kind: 'linear', mjdRef, east0, north0, pmEast, pmNorth, at(mjd)} }.
 */
export function pathData(doc) {
  const astrometry = doc?.astrometry;
  const rows = (Array.isArray(astrometry?.per_exposure) ? astrometry.per_exposure : []).filter(isTargetMeasurement)
    .sort((a, b) => a.mjd - b.mjd);
  if (rows.length < MIN_POINTS) return null;
  const reference = astrometry.reference;
  const origin = reference && finite(reference.ra_deg) && finite(reference.dec_deg)
    ? { ra: reference.ra_deg, dec: reference.dec_deg, kind: 'reference' }
    : { ra: rows[0].ra_deg, dec: rows[0].dec_deg, kind: 'first' };
  const points = rows.map((row) => ({
    mjd: row.mjd, ...tangentOffsets(origin.ra, origin.dec, row.ra_deg, row.dec_deg), visit: row.visit ?? null, obsKey: row.obs_key ?? null,
  }));
  const byVisit = new Map();
  for (const point of points) {
    const key = point.visit ?? `t${Math.round(point.mjd)}`;
    const entry = byVisit.get(key) ?? { visit: point.visit, sum: 0, n: 0 };
    entry.sum += point.mjd;
    entry.n += 1;
    byVisit.set(key, entry);
  }
  const visits = [...byVisit.values()].map((entry) => ({ visit: entry.visit, mjd: entry.sum / entry.n, n: entry.n })).sort((a, b) => a.mjd - b.mjd);
  // No model line: the trials' model (proper motion with parallax) publishes no path over these dates (the stars'
  // prediction tracks are null; Pluto's tracks are for 2027), and fit_linear is the no-parallax straight line the
  // trials use as their baseline, so it is not drawn as "the model" (B34 review). The UI draws a model only if one is set.
  const model = null;
  return { origin, points, visits, model };
}

/** A round scale-bar length (1, 2 or 5 × 10^k arcsec) about a fifth of `span`. */
export function scaleArcsec(span) {
  const target = Math.max(span, 1e-6) / 5;
  const power = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 5, 10].map((step) => step * power).find((value) => value >= target) ?? 10 * power;
}

/** The floor: its centre (arcsec) and half-size, holding every dot and the model line with a margin. */
export function floorFrame(path) {
  const all = [...path.points];
  if (path.model) all.push(path.model.at(path.points[0].mjd), path.model.at(path.points.at(-1).mjd));
  const easts = all.map((point) => point.east);
  const norths = all.map((point) => point.north);
  const centre = { east: (Math.min(...easts) + Math.max(...easts)) / 2, north: (Math.min(...norths) + Math.max(...norths)) / 2 };
  const half = Math.max(Math.max(...easts) - centre.east, Math.max(...norths) - centre.north) * 1.15;
  return { centre, half: Math.max(half, 0.5) };
}
