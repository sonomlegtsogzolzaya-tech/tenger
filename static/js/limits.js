// "What Vestigium can and can't do" (task B19): the numbers in the dialog, read from the data files, never typed
// in. Pure: documents in, numbers out.
import { glanceOf } from './planetx.js';

/**
 * barnard: Barnard's Star investigation.json; depth: planetx/depth.json read by readDepth().
 * gaiaPct: how far our measured total proper motion is from Gaia's, in percent, rounded UP to 0.1 (so "within"
 * stays true); blendArcsec: the fit radius inside which two sources merge (pipeline core_radius_arcsec);
 * injected: artificial planets in the pooled recovery curves; low/high: magnitudes the nominal Planet Nine is too
 * faint for one image. Any value the files do not give is null, and the sentence is shown without it.
 */
export function limitsNumbers({ barnard = null, depth = null } = {}) {
  const motion = barnard?.explanation?.find((item) => item?.key === 'explain.motion-measured')?.params;
  const gaiaPct = Number.isFinite(motion?.value) && Number.isFinite(motion?.catalogue) && motion.catalogue > 0
    ? Math.ceil((Math.abs(motion.value - motion.catalogue) / motion.catalogue) * 1000 - 1e-9) / 10 : null;
  const radius = barnard?.pipeline?.settings?.core_radius_arcsec;
  const injected = depth?.bands?.length ? depth.bands.reduce((sum, band) => sum + band.curve.reduce((count, point) => count + (Number.isFinite(point.injected) ? point.injected : 0), 0), 0) : null;
  const glance = depth ? glanceOf(depth) : null;
  return {
    gaiaPct, blendArcsec: Number.isFinite(radius) ? radius : null, injected: injected || null,
    low: glance?.low ?? null, high: glance?.high ?? null,
  };
}

const FLAGGED = 'measure.flagged-pixels-in-aperture';
const scored = (row) => row.status === 'hit' || row.status === 'miss';

/** Task B32a: a target saturates when no brightness was usable and most pictures were refused for flagged pixels. */
export function saturates(investigation) {
  const photometry = investigation?.photometry;
  const flagged = photometry?.refused?.[FLAGGED] ?? 0;
  return Boolean(photometry) && photometry.n_points > 0 && photometry.n_measured === 0 && flagged > photometry.n_points / 2;
}

/**
 * Task B32a: the facts behind three lines of "Can and can't do", from the scoreboard and the trial and investigation
 * files, never typed in. index: index.json (names); board: scoreboard.json; investigations: {key: investigation.json}
 * of the targets that may saturate; predictions: {trial_id: prediction.json} of the brightness trials.
 * Returns names: real tests (prospective_unexposed; asteroids when the batch is one), practice runs (scored
 * retrospective holdouts), saturated targets (split into those whose position we use instead and the rest, marked
 * too little data) and brightness trials with measurements but no period model.
 */
export function honestyFacts({ index = null, board = null, investigations = {}, predictions = {} } = {}) {
  const order = (index?.targets ?? []).map((target) => target.key);
  const nameOf = (key) => index?.targets?.find((target) => target.key === key)?.name ?? key;
  const rows = board?.rows ?? [];
  const keysOf = (test) => [...new Set(rows.filter(test).map((row) => row.target_key))];
  const saturated = Object.keys(investigations).filter((key) => saturates(investigations[key]))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const positionInstead = saturated.filter((key) => rows.some((row) => row.target_key === key && row.quantity === 'position' && scored(row)));
  return {
    real: keysOf((row) => row.category === 'prospective_unexposed').map(nameOf),
    asteroids: board?.asteroid_batch?.category === 'prospective_unexposed',
    practice: keysOf((row) => row.category === 'retrospective_holdout' && scored(row)).map(nameOf),
    saturated: saturated.map(nameOf),
    positionInstead: positionInstead.map(nameOf),
    tooLittle: saturated.filter((key) => !positionInstead.includes(key)).map(nameOf),
    noPattern: rows.filter((row) => row.quantity === 'brightness' && row.status_reason_key === 'predict.no-period-model')
      .map((row) => ({ name: nameOf(row.target_key), points: predictions[row.trial_id]?.diagnostics?.n_training_points ?? null })),
    loaded: Boolean(index && board),
  };
}
