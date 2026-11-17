// Task B30: "How it works" (?page=method). Pure: documents in, numbers and links out; no DOM.
// Every number on the page comes from a data file read here (scoreboard.json, the Pluto receipt and post-mortem,
// planetx/depth.json) or from our own pipeline table (stack.js), and every mission fact carries the mission
// document it was checked against (15 Nov 2026). A value the files do not give is null, and the page leaves it out.
import { DETECTOR_RANGES, WAVE_MAX, WAVE_MIN } from './stack.js';
import { glanceOf } from './planetx.js';
import { shortAngle } from './predict-story.js';

export const REPO_URL = 'https://github.com/Nama2323/tenger';
export const PLUTO_TRIAL = 'pluto-position-2026b';
export const PRACTICE_TRIALS = ['barnard-position-2026b', 'epsindib-position-2026b'];
/** The files the page reads (paths under data/). */
export const METHOD_FILES = {
  board: 'scoreboard.json',
  receipt: `trials/${PLUTO_TRIAL}/receipt.json`,
  postmortem: 'trials/pluto/postmortem.json',
  depth: 'planetx/depth.json',
};

/** Mission documents the facts were checked against. */
export const MISSION_DOCS = {
  irsaDr1: { name: 'IRSA SPHEREx DR1 overview', href: 'https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_dr1.html' },
  instrument: { name: 'Caltech SPHEREx instrument page', href: 'https://spherex.caltech.edu/page/instrument' },
  jpl: { name: 'NASA JPL SPHEREx mission page', href: 'https://www.jpl.nasa.gov/missions/spherex/' },
  irsa: { name: 'IRSA SPHEREx mission page', href: 'https://irsa.ipac.caltech.edu/Missions/spherex.html' },
};

/**
 * "SPHEREx in one minute". Checked 15 Nov 2026: the DR1 overview says "from 0.75 to 5.0 um across the entire sky" and
 * "launched in March 2025"; the instrument page says "Six 2K x 2K HgCdTe detector arrays" with the band ranges in
 * stack.js; the JPL page says "Every six months, SPHEREx will survey the entire sky"; IRSA serves the data.
 * Wavelengths and the array count are read from our pipeline table, which matches the instrument page.
 */
export function missionFacts() {
  const arrays = Object.keys(DETECTOR_RANGES).length;
  return [
    { id: 'range', values: { low: String(WAVE_MIN), high: String(WAVE_MAX) }, source: MISSION_DOCS.irsaDr1 },
    { id: 'arrays', values: { n: String(arrays) }, source: MISSION_DOCS.instrument },
    { id: 'repeat', values: {}, source: MISSION_DOCS.jpl },
    { id: 'launch', values: {}, source: MISSION_DOCS.irsaDr1 },
    { id: 'data', values: {}, source: MISSION_DOCS.irsa },
  ];
}

/** D1–D6 and their wavelength ranges (µm) from our pipeline table. */
export const bandStrip = () => Object.entries(DETECTOR_RANGES).map(([n, [low, high]]) => ({ n: Number(n), low, high }));

const rowOf = (board, id) => (Array.isArray(board?.rows) ? board.rows.find((row) => row?.trial_id === id) ?? null : null);
const finite = (value) => (Number.isFinite(value) ? value : null);

/**
 * The eight pipeline steps, each with where its result is on the site. A step is 'done' only where the site shows
 * its result; 'pending' says the result is in but the team's confirmation is still to come (from the scoreboard).
 */
export function pipelineSteps({ board = null, receipt = null } = {}) {
  const pluto = rowOf(board, PLUTO_TRIAL);
  const commit = typeof receipt?.commit === 'string' && /^[0-9a-f]{40}$/.test(receipt.commit) ? receipt.commit : null;
  const reveal = (step) => `?page=predictions&trial=${PLUTO_TRIAL}&step=${step}`;
  return [
    { id: 'retrieve', status: 'done', href: '?target=barnard&panel=evidence' },
    { id: 'select', status: 'done', href: '?target=barnard&panel=evidence' },
    { id: 'clean', status: 'done', href: '?target=barnard&panel=evidence' },
    { id: 'measure', status: 'done', href: '?target=barnard&panel=changed' },
    { id: 'model', status: 'done', href: reveal(2) },
    { id: 'lock', status: commit ? 'done' : 'missing', href: commit ? `${REPO_URL}/commit/${commit}` : null, external: true, commit },
    { id: 'check', status: pluto?.confirmation_pending === true ? 'pending' : pluto?.status ? 'done' : 'missing', href: reveal(6) },
    { id: 'publish', status: board ? 'done' : 'missing', href: '?page=predictions' },
  ];
}

/** The four result cards' numbers, straight from the files. */
export function resultNumbers({ board = null, depth = null, postmortem = null } = {}) {
  const pluto = rowOf(board, PLUTO_TRIAL);
  const practice = PRACTICE_TRIALS.map((id) => rowOf(board, id)).filter((row) => row && (row.status === 'hit' || row.status === 'miss'));
  const batch = board?.asteroid_batch ?? null;
  const counts = batch?.counts ?? {};
  const checked = (counts.hit ?? 0) + (counts.miss ?? 0);
  const notScorable = (counts.insufficient_data ?? 0) + (counts.ambiguous ?? 0) + (counts.invalid_comparison ?? 0);
  const glance = depth ? glanceOf(depth) : null;
  const frozen = postmortem?.exploratory === true && postmortem?.trial_id === PLUTO_TRIAL ? postmortem.frozen : null;
  return {
    pluto: pluto && finite(pluto.model_error_arcsec) !== null ? {
      status: pluto.status,
      error: shortAngle(pluto.model_error_arcsec),
      pending: pluto.confirmation_pending === true,
      // Why: the frozen region was too small (exploratory post-mortem, made after the reveal).
      why: Boolean(frozen && finite(frozen.d2) !== null),
    } : null,
    practice: practice.length ? {
      n: practice.length,
      hits: practice.filter((row) => row.status === 'hit').length,
      items: practice.map((row) => ({ key: row.target_key, error: shortAngle(row.model_error_arcsec) })),
    } : null,
    asteroids: batch && counts ? {
      total: checked + notScorable + (counts.waiting ?? 0),
      checked,
      hits: counts.hit ?? 0,
      notScorable,
      few: counts.insufficient_data ?? 0,
      unclear: counts.ambiguous ?? 0,
      pending: batch.team_statement_pending === true,
    } : null,
    planetX: glance && Number.isFinite(glance.low) && Number.isFinite(glance.high) ? { low: glance.low, high: glance.high } : null,
  };
}

/** How we check known stars and asteroids: only the services our code calls (task B30b). */
export const FAMILIAR = [
  { id: 'stars', status: 'done', links: [['https://www.cosmos.esa.int/web/gaia/dr3', 'ESA Gaia DR3'], ['https://simbad.cds.unistra.fr/', 'SIMBAD']] },
  { id: 'asteroids', status: 'done', links: [['https://ssd.jpl.nasa.gov/horizons/', 'JPL Horizons'], ['https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html', 'JPL Small-Body Database'], ['https://irsa.ipac.caltech.edu/applications/MOST/', 'IRSA MOST']] },
];

/** "Data sources": the services behind the data, with their links. */
export const DATA_SOURCES = [
  { id: 'irsa', links: [['https://irsa.ipac.caltech.edu/', 'irsa.ipac.caltech.edu'], ['https://irsa.ipac.caltech.edu/Missions/spherex.html', 'SPHEREx at IRSA']] },
  { id: 'jpl', links: [['https://ssd.jpl.nasa.gov/horizons/', 'Horizons'], ['https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html', 'Small-Body Database']] },
  { id: 'gaia', links: [['https://www.cosmos.esa.int/web/gaia/dr3', 'Gaia DR3']] },
  { id: 'cds', links: [['https://simbad.cds.unistra.fr/', 'SIMBAD'], ['https://vizier.cds.unistra.fr/', 'VizieR']] },
];

/** The four limits of the "Can and can't do" dialog (help.js LIMITS_DO), in the same order. */
export const CANNOT = ['planetNine', 'blend', 'saturated', 'proof'];

/** Files a trial publishes, in reading order (only those that load are linked). */
export const TRIAL_FILES = ['trial', 'prediction', 'receipt', 'training', 'verification'];
export const trialFilePath = (id, file) => `trials/${id}/${file}.json`;
