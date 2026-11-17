// TENGER: the page shell (Home, Investigate, Predictions, Beat the physics, Learn, About) and the image viewer
// inherited from the open-source code this repository started from (MIT, see LICENSE), extended with explicit
// A/B observations, Swipe, a caption strip and URL state.
import * as api from './api.js';
import { comparisonWarning, CONTEXT_STEP, describePicture, describePreviewEpoch } from './caption.js';
import { drawLightCurve, drawSpectrum, drawWingCurve } from './chart.js';
import { createSource } from './contract.js';
import { allowsDifference, comparisonReasons, epochCoverage, pairComparison } from './epochs.js';
import { parseCoordinates, separationDeg } from './coords.js';
// Task B32: the shell's lookups never return null (dom.js part), so a missing part cannot stop the page.
import { part as $, chip, dataTable, el, formatNumber, formatUtc, installVersionedFetch, prefersReducedMotion } from './dom.js';
import {
  buildFovOptions, drawStarfield, entryName, famousEntries, famousLineOf, famousResultOf, famousThumb, fillCoordinates, formatDistance, kindLabel, placeMapLabels, predictionLabel,
  renderExplore, renderHome, startBlinking, statusLabel,
} from './home.js';
import { addMissingStrings, applyTranslations, has, t, tData } from './i18n.js';
import { findByName, searchMatches } from './names.js';
import { renderChanged, renderEvidence, renderPrediction, renderSpectrumNote } from './panels.js';
import { currentRoundId, renderGamePage, selectRound } from './game-ui.js';
import { currentLearnView, initLearn, setBatch, setPlanetX, showLearn } from './learn-ui.js';
import { initHelp } from './help.js';
import { hasPublishedTrials } from './ledger.js';
import { currentReveal, initLedger, showLedger, syncRevealFromUrl } from './ledger-ui.js';
import { renderAbout, renderReserved } from './pages.js';
import { initMethod, showMethod } from './method-ui.js';
import { renderPath3d } from './path3d-ui.js';
import { POSTMORTEM_PATH, readPostmortem } from './postmortem.js';
import {
  drawPlate, limitsFor, paintComposite, paintDifference, paintFalseColour, paintMono, stacksFor, StackCache, tintFor,
} from './plate.js';
import { loadReserved, reservedRegionNear } from './reserved.js';
import { bandToParam, buildRoute, embedCode, PAGES, parseRoute, resolveRoute } from './route.js';
import { isSaturated, measureMotion as trackMotion, measureSpectrum as photometry } from './science.js';
import { createSky } from './sky.js';
import { flyThen, homeShown, initSpace, releaseTarget, selectTarget, setFilter, setLayer, setScenePaused } from './space-ui.js';
import { showLoopPage } from './loop-ui.js';
import { loadPlanetX, renderHiddenRound } from './planetx-ui.js';
import { DEPTH_PATH, glanceOf, readDepth } from './planetx.js';
import { countUpShown, moonShare, plainLine } from './describe.js';
import { loadBatch } from './batch-ui.js';
import { isTourRunning, nextTourStep, runTour, stopTour } from './tour.js';
import {
  channelWavelength, CHANNELS, colourGroupsPresent, DETECTOR_RANGES, detectorOfChannel, mjdToDate, mjdToYear, pixelToSky, positionAt,
  selectBand, skyToPixel, visitsOf, wellCovered,
} from './stack.js';
import {
  buildTargets, canonicalKey, colourOf, findCoveringTarget, isLegacyOnly, isOpenable, isViewable, legacyPlaces,
} from './targets.js';
import { canvasToPlate, fullView, panBy, zoomAt } from './viewport.js';

const POLL_MS = 1500;
const DEFAULT_FOV = 0.1;
const CUSTOM_EPOCH = 2016;
const DEFAULT_MID_MJD = 61100;
const WISE_STEP = CONTEXT_STEP;
const WISE_ID = 'allwise';
const ALL_DATES = 'all';
const MOTION_SIGNIFICANCE = 3;
const AUTO_SPECTRUM_FRAMES = 12;
const FULL_RANGE_LABEL = '0.75–5 μm';
const COUNT_UP_MS = 800;
const DRAG_THRESHOLD_PX = 4;
const FILM_TILE_DELAY_MS = 30;
const FILM_FIRST_DELAY_MS = 120;
const FOLLOW_ZOOM = 2;
// A close pair of bright stars: the tracker can jump between them, so no number is shown.
const MOTION_UNRELIABLE = new Set(['61cyg']);
const MIN_NOTED_SPEED = 0.2;
const NEUTRAL_TINT = '214, 224, 240';
const GAIA_EPOCH = 2016;
const EDGE_PX = 6;
const CANDIDATES_FAST = 3;
const CANDIDATES_BRIGHT = 5;
const CANDIDATE_HIT_PX = 6;
const SAME_OBJECT_DEG = 0.004;
const FAST_MOVER_MAS = 1000;
// The long-wavelength array with the best date coverage for each variable star.
const CURVE_ARRAYS = { rwaur: 5, rdra: 4 };
const TRACK_MATCH_YEARS = 0.02;
const ARRAY_CANVAS_SIZE = 420;
const FILM_CANVAS_SIZE = 160;
const MOTION_PAINT_DELAY_MS = 40;
const ONE_ARCSEC_DEG = 1 / 3600;
const FOV_CHOICES = [0.05, 0.1, 0.2, 0.5];
const IDS_SHOWN = 1;
const IRSA_SPHEREX = 'https://irsa.ipac.caltech.edu/Missions/spherex.html';
const IRSA_WISE = 'https://irsa.ipac.caltech.edu/Missions/wise.html';
const KEY_STEP = { ArrowLeft: -1, ArrowRight: 1 };
const SWIPE_ENDS = [0, 100];
const RESIZE_MS = 150;

const buffer = document.createElement('canvas');
const cache = new StackCache();

/** The page shell: data sources, the target list and what the URL asked for. */
const app = {
  source: null,
  indexState: null,
  entries: [],
  allTargets: [],
  legacyPresets: [],
  thumbs: new Map(),
  page: 'home',
  panel: 'see',
  entry: null,
  requested: null,
  investigation: null,
  scoreboard: null,
  pending: null,
  notices: [],
  keepNotices: false,
  scrollToPanel: false,
  embed: false,
  sky: null,
};

/** The viewer. */
const state = {
  staticMeta: null,
  target: null,
  job: null,
  frames: [],
  visits: [],
  wiseFrame: null,
  position: 0,
  band: { kind: 'composite' },
  // "All bands" in display colours when a date has all three array groups; grayscale is one click away.
  colour: true,
  mode: 'blink',
  excludeFlags: false,
  gaia: [],
  spectrum: null,
  spectrumObject: null,
  pick: null,
  track: null,
  playing: false,
  range: { from: null, to: null, endpoints: true },
  received: 0,
  speedMs: 900,
  contrast: 1,
  swipe: 50,
  follow: false,
  lock: null,
  picking: false,
  candidates: null,
  next: 'a',
  plateView: { zoom: 1, x: 60, y: 60 },
  session: 0,
  auto: { spectrum: false },
  diffAsked: false,
};

let playTimer = null;
let filmGeneration = 0;
let captionKey = '';

// ---------- Sequence of dates and A/B ----------

/**
 * Dated steps with stable IDs: one per prepared visit, named by the UTC date of its mean frame time (the
 * name the evidence file's viewer.visits[].date_utc uses); the AllWISE frame is "allwise".
 */
function sequence() {
  if (state.previews) return state.previews;
  const used = new Map();
  const dated = state.visits.map((visit) => {
    const day = formatUtc(mjdToDate(visit.mjd), { time: false });
    const count = (used.get(day) ?? 0) + 1;
    used.set(day, count);
    return { ...visit, key: visit.visit, id: count > 1 ? `${day}-${count}` : day };
  });
  return state.wiseFrame && $('wise').checked
    ? [{ key: WISE_STEP, id: WISE_ID, frames: [state.wiseFrame], year: state.wiseFrame.year }, ...dated]
    : dated;
}

function currentStep() {
  const steps = sequence();
  if (state.position === ALL_DATES || !steps.length) return null;
  return steps[Math.min(state.position, steps.length - 1)];
}

const indexOfId = (steps, id, fallback) => {
  const index = steps.findIndex((step) => step.id === id);
  return index >= 0 ? index : fallback;
};

/** Positions of A and B in the sequence. */
function abPositions() {
  const steps = sequence();
  if (!steps.length) return [0, 0];
  return [indexOfId(steps, state.range.from, 0), indexOfId(steps, state.range.to, steps.length - 1)];
}

function abSteps() {
  const steps = sequence();
  const [a, b] = abPositions();
  return [steps[a] ?? null, steps[b] ?? null];
}

const yearOf = (step) => step.year ?? mjdToYear(step.mjd);

function midYear() {
  if (!state.visits.length) return mjdToYear(DEFAULT_MID_MJD);
  return mjdToYear(state.visits[Math.floor(state.visits.length / 2)].mjd);
}

// ---------- Drawing ----------

/** With the camera tied to an object, each date is centred on where that object is then. */
function viewFor(step) {
  if (!state.follow || !state.job) return state.plateView;
  const object = state.lock ?? state.target;
  const year = step ? yearOf(step) : midYear();
  const measured = state.track?.find((point) => Math.abs(point.year - year) < TRACK_MATCH_YEARS);
  const { ra, dec } = positionAt({ ...motionOf(object), ...object }, year);
  const { x, y } = measured ?? skyToPixel(ra, dec, state.job);
  const size = state.job.n;
  const half = size / FOLLOW_ZOOM / 2;
  const fit = (value) => Math.min(size - half, Math.max(half, value + 0.5));
  return { zoom: FOLLOW_ZOOM, x: fit(x), y: fit(y) };
}

function overlayFor(step, extra = {}) {
  return {
    grid: state.job,
    year: step ? yearOf(step) : midYear(),
    target: followedObject(),
    candidates: state.picking ? state.candidates : null,
    gaia: $('gaia').checked ? state.gaia : null,
    track: state.track,
    pick: state.pick,
    view: viewFor(step),
    ...extra,
  };
}

function stepLabel(step) {
  if (!step) return t('allDates');
  return step.key === WISE_STEP ? 'AllWISE 2010' : formatDate(mjdToDate(step.mjd));
}

/** "A · 15 Aug 2025" when the shown step is A or B. */
function plateLabel(step) {
  if (!step) return t('allDates');
  const [a, b] = abSteps();
  if (step === a || step?.id === a?.id) return t('plate.a', { date: stepLabel(step) });
  if (step?.id === b?.id) return t('plate.b', { date: stepLabel(step) });
  return stepLabel(step);
}

function render() {
  syncColourStep();
  if (state.previews) {
    renderPreview();
    return;
  }
  if (!state.job) return;
  const size = state.job.n;
  const [aStep, bStep] = abSteps();
  const mode = state.mode;
  const two = mode === 'side' || mode === 'swipe';
  let left = currentStep();
  if (mode === 'diff') left = bStep;
  else if (two) left = aStep;
  const shown = mode === 'diff' ? paintPair(aStep, bStep, size, state.band) : paintStep(left, size, state.band);
  $('plate-empty').hidden = shown || !state.frames.length;
  $('plate-empty').textContent = t('noFrames');
  drawPlate($('plate'), buffer, overlayFor(left));
  $('plate-date').textContent = mode === 'diff' ? t('plate.diff') : two ? t('plate.a', { date: stepLabel(aStep) }) : plateLabel(left);
  $('plate-colour').hidden = !shown || mode === 'diff' || !colourShown(left);
  $('colour-toggle').hidden = state.band.kind !== 'composite';
  $('colour-toggle').setAttribute('aria-pressed', String(!state.colour));
  $('second-frame').hidden = !two;
  if (two) renderSecond(bStep, size);
  $('arrays').hidden = mode !== 'blink';
  if (mode === 'blink') renderArrays(left, size);
  $('plates').dataset.mode = mode;
  $('swipe-control').hidden = mode !== 'swipe';
  $('observatory').dataset.mode = mode;
  document.body.dataset.layout = mode === 'side' ? 'compare' : 'one';
  describeStep(left);
  renderCaption(left, aStep, bStep);
  // How to read the picture sits under "How to look"; the finding (how far it moved) is right under the picture
  // (task B17), with a chip saying the shift comes from the catalogue motion.
  $('explain').textContent = explainNow();
  const finding = rangeNote();
  if ($('finding').textContent !== finding) {
    $('finding').textContent = finding;
    $('finding').dataset.source = finding ? t('rangeSource') : '';
  }
  $('finding').hidden = !finding;
  markFilm();
  paintAmbient();
}

function renderSecond(step, size) {
  paintStep(step, size, state.band);
  drawPlate($('plate-b'), buffer, overlayFor(step));
  $('plate-date-b').textContent = t('plate.b', { date: stepLabel(step) });
  $('plate-colour-b').hidden = !colourShown(step);
}

/** Six live plates, one per detector array, for the date on the main plate. */
function renderArrays(step, size) {
  const available = step?.key === WISE_STEP ? null : step;
  for (const tile of $('arrays').children) {
    const band = { kind: 'detector', detector: Number(tile.dataset.detector) };
    const painted = paintStep(available, size, band);
    if (painted) drawPlate(tile.querySelector('canvas'), buffer, overlayFor(available, { bare: true }));
    tile.classList.toggle('empty', !painted);
    tile.setAttribute('aria-pressed', String(state.band.kind === 'detector' && state.band.detector === band.detector));
  }
}

function buildArrays() {
  const tiles = Object.entries(DETECTOR_RANGES).map(([detector, [low, high]]) => {
    const canvas = el('canvas', { width: ARRAY_CANVAS_SIZE, height: ARRAY_CANVAS_SIZE });
    const tile = el('button', {
      type: 'button',
      dataset: { detector },
      'aria-label': t('caption.detector', { detector, low: String(low), high: String(high) }),
    }, [canvas, el('b', { text: `${low}–${high} μm` })]);
    tile.style.setProperty('--tint', NEUTRAL_TINT);
    tile.addEventListener('click', () => {
      const same = state.band.kind === 'detector' && state.band.detector === Number(detector);
      setBand(same ? { kind: 'composite' } : { kind: 'detector', detector: Number(detector) });
    });
    return tile;
  });
  $('arrays').replaceChildren(...tiles);
}

/** The page's background glow is the current picture itself, heavily blurred (when the page has one). */
function paintAmbient() {
  const ambient = document.getElementById('ambient'); // optional: drawn only where the page has it
  if (ambient) ambient.getContext('2d').drawImage($('plate'), 0, 0, ambient.width, ambient.height);
}

const paintKey = (prefix, wanted) => `${prefix}|${wanted.kind}${wanted.detector ?? wanted.channel ?? ''}|${state.excludeFlags}|${state.contrast}|${wanted.kind === 'composite' && state.colour ? 'rgb' : 'grey'}`;

/** True when this step is painted in display colours (All bands, colour on, all three array groups present). */
function colourShown(step, band = state.band) {
  if (band.kind !== 'composite' || !state.colour || step?.key === WISE_STEP || state.previews) return false;
  return colourGroupsPresent(step ? step.frames : state.frames);
}

/** Painting is the slow part, so finished pictures are kept and only copied afterwards. */
function remembered(key, paint) {
  const stored = cache.entries.get(key);
  if (stored !== undefined) {
    if (stored) copyCanvas(stored, buffer);
    return Boolean(stored);
  }
  const shown = paint();
  const copy = shown ? document.createElement('canvas') : null;
  if (copy) copyCanvas(buffer, copy);
  cache.entries.set(key, copy);
  return shown;
}

function paintStep(step, size, wanted) {
  return remembered(paintKey(`painted|${step?.key ?? ALL_DATES}`, wanted), () => paintFresh(step, size, wanted));
}

function paintPair(aStep, bStep, size, wanted) {
  return remembered(paintKey(`diff|${aStep?.key}|${bStep?.key}`, wanted), () => paintDifferenceOf(aStep, bStep, size, wanted));
}

function copyCanvas(from, to) {
  to.width = from.width;
  to.height = from.height;
  to.getContext('2d').drawImage(from, 0, 0);
}

function paintFresh(step, size, wanted) {
  if (step?.key === WISE_STEP) return paintWise(step, size);
  const frames = step ? step.frames : state.frames;
  // A date without an exposure in this band shows "no frames", never a neighbouring channel (contract v2.4).
  const band = wanted;
  if (!selectBand(frames, band).length) return false;
  const key = step ? `v${step.key}` : ALL_DATES;
  const stacks = stacksFor(frames, band, size, state.excludeFlags, cache, key);
  if (stacks.image) paintMono(buffer, size, stacks.image, sharedLimits(size, band), tintFor(band));
  else if (state.colour && colourGroupsPresent(frames)) paintFalseColour(buffer, size, stacks, sharedLimits(size, band));
  else paintComposite(buffer, size, stacks, sharedLimits(size, band));
  return true;
}

/** One stretch for every date, so brightness changes between frames are real. */
function sharedLimits(size, band) {
  const bandKey = `${band.kind}${band.detector ?? band.channel ?? ''}`;
  const limits = cache.get(`limits|${bandKey}|${state.excludeFlags}`, () =>
    limitsFor(stacksFor(state.frames, band, size, state.excludeFlags, cache, ALL_DATES)));
  return withContrast(limits);
}

function withContrast(limits) {
  if (limits.low !== undefined) return { low: limits.low, high: limits.low + (limits.high - limits.low) / state.contrast };
  return { red: withContrast(limits.red), green: withContrast(limits.green), blue: withContrast(limits.blue) };
}

function paintWise(step, size) {
  const image = step.frames[0].pixels;
  paintMono(buffer, size, image, withContrast(limitsFor({ image })), tintFor());
  return true;
}

/** B minus A in one band; only reachable when the pair has a validated comparison. */
function paintDifferenceOf(aStep, bStep, size, wanted) {
  if (!aStep || !bStep || aStep.key === WISE_STEP || bStep.key === WISE_STEP) return false;
  const band = wanted.kind === 'composite' ? { kind: 'all' } : wanted;
  if (!selectBand(aStep.frames, band).length || !selectBand(bStep.frames, band).length) return false;
  const later = stacksFor(bStep.frames, band, size, state.excludeFlags, cache, `v${bStep.key}`).image;
  const earlier = stacksFor(aStep.frames, band, size, state.excludeFlags, cache, `v${aStep.key}`).image;
  paintDifference(buffer, size, later, earlier);
  return true;
}

const formatDate = (date) =>
  new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);

function describeStep(step) {
  if (step?.key === WISE_STEP) {
    $('plate-info').textContent = '';
    return;
  }
  const pool = step ? step.frames : state.frames;
  const frames = selectBand(pool, state.band);
  const flagged = frames.length ? frames.reduce((sum, item) => sum + item.flaggedPct, 0) / frames.length : 0;
  const parts = [
    finishedMessage(state.job), t('frames', { count: frames.length }), t('flagged', { pct: flagged.toFixed(1) }),
  ].filter(Boolean);
  if (state.mode === 'diff') parts.push(t('differenceLegend'));
  else if (state.target?.pmra || state.target?.pmdec) parts.push(t('expected'));
  $('plate-info').textContent = `${parts.map((part) => part.replace(/\.$/, '')).join('. ')}.`;
}

function explainNow() {
  if (!state.target) return '';
  if (state.mode === 'side') return t('explainCompare');
  if (state.mode === 'swipe') return t('explainSwipe');
  if (state.mode === 'diff') return t('explainDiff');
  if (state.picking) return t('explainChoose');
  if (state.follow) return t('explainFollow');
  if (state.position === ALL_DATES) return t('explainSum');
  if (state.band.kind !== 'composite') return t('explainBand');
  if (isFastMover(state.target)) return t('explainMover');
  return t(state.target.kind === 'variable' ? 'explainVideo' : 'explainPlace');
}

// ---------- Caption strip ----------

function releaseText(releases) {
  if (!releases.length) return '—';
  return releases.map(({ release, count }) => t('release.count', {
    label: has(`release.${release}`) ? t(`release.${release}`) : release,
    count: String(count),
  })).join(', ');
}

function wavelengthText(picture) {
  if (picture.compositeVisit !== null && picture.compositeVisit !== undefined) return t('caption.compositePreview');
  const w = picture.wavelength;
  if (w.kind === 'allwise') return t('caption.allwise', { um: String(w.centre) });
  if (w.kind === 'composite') {
    const key = picture.colour ? 'caption.compositeColour' : state.colour && !picture.colour ? 'caption.compositeGreyMissing' : 'caption.composite';
    return t(key, { low: String(w.low), high: String(w.high) });
  }
  if (w.kind === 'detector') return t('caption.detector', { detector: String(w.detector), low: String(w.low), high: String(w.high) });
  const values = { um: w.wavelength.toFixed(2), channel: String(w.channel) };
  return t(w.present ? 'caption.channel' : 'caption.channelNone', values);
}

/** The wavelength in a few words for the caption (task B12); the full wording stays one click away. */
function wavelengthShort(picture) {
  if (picture.compositeVisit !== null && picture.compositeVisit !== undefined) return t('caption.compositePreviewShort');
  const w = picture.wavelength;
  if (w.kind === 'composite') return t(picture.colour ? 'caption.compositeColourShort' : 'caption.compositeShort', { low: String(w.low), high: String(w.high) });
  return wavelengthText(picture);
}

function timeText(picture) {
  if (picture.status === 'context') return t('caption.timeAllwise', { year: String(Math.floor(picture.year)) });
  if (!picture.start) return '—';
  const start = formatUtc(picture.start);
  const end = formatUtc(picture.end);
  return start === end ? start : t('caption.timeRange', { start, end });
}

function idsBlock(picture) {
  if (!picture.obs.length) return document.createTextNode(t('caption.idsNone'));
  const shown = picture.obs.slice(0, IDS_SHOWN).join(', ');
  const summary = picture.obs.length > IDS_SHOWN
    ? t('caption.idsMore', { first: shown, more: String(picture.obs.length - IDS_SHOWN) })
    : shown;
  if (picture.obs.length <= IDS_SHOWN) return el('code', { text: summary });
  return el('details', { class: 'ids' }, [
    el('summary', {}, el('code', { text: summary })),
    el('p', {}, el('code', { text: picture.obs.join(', ') })),
  ]);
}

/**
 * Where the viewer's frames come from: 'rebuilt' when the evidence file says the bundle was rebuilt from its
 * own exposures (legacy: null, DATA-CONTRACT V3.1/V3.5), 'legacy' for older prepared frames, 'live' otherwise.
 */
function framesKind() {
  if (state.previews) return 'preview';
  if (!state.target?.key) return 'live';
  const doc = app.investigation?.state === 'ok' ? app.investigation.doc : null;
  return doc && doc.legacy === null && state.staticMeta?.dataset_version ? 'rebuilt' : 'legacy';
}

function statusNote(picture) {
  if (picture.status === 'context') return t('statusNote.context');
  if (picture.status === 'difference') return `${t('statusNote.difference')} ${uncheckedText(currentComparison()?.comparison)}`.trim();
  const kind = framesKind();
  const combine = has(`statusNote.${picture.combine}`) ? t(`statusNote.${picture.combine}`) : '';
  return `${combine} ${kind === 'live' ? '' : t(`statusNote.${kind}`)}`.trim();
}

function captionColumn(letter, picture, side) {
  const source = picture.status === 'context' ? IRSA_WISE : IRSA_SPHEREX;
  return el('div', { class: 'caption-col', dataset: { side } }, [
    el('p', { class: 'caption-head' }, [
      el('span', { class: 'ab-letter', text: letter }),
      chip(t(`status.${picture.status}`), `chip-status-${picture.status}`),
    ]),
    // At a glance (task B12): when and in what light; the release, status, source and IDs one click away.
    el('dl', { class: 'facts' }, [
      el('dt', { text: t('caption.time') }), el('dd', { text: timeText(picture) }),
      el('dt', { text: t('caption.wavelength') }), el('dd', { text: wavelengthShort(picture) }),
    ]),
    el('details', { class: 'caption-more' }, [
      el('summary', { text: t('caption.more') }),
      el('dl', { class: 'facts' }, [
        wavelengthShort(picture) !== wavelengthText(picture) ? el('dt', { text: t('caption.wavelengthFull') }) : null,
        wavelengthShort(picture) !== wavelengthText(picture) ? el('dd', { text: wavelengthText(picture) }) : null,
        el('dt', { text: t('caption.release') }), el('dd', { text: releaseText(picture.releases) }),
        el('dt', { text: t('caption.status') }), el('dd', { text: statusNote(picture) }),
        el('dt', { text: t('caption.source') }), el('dd', {}, el('a', { href: source, target: '_blank', rel: 'noopener', text: t('caption.sourceIrsa') })),
        el('dt', { text: t('caption.ids') }), el('dd', {}, idsBlock(picture)),
      ]),
    ]),
  ]);
}

/** A and B columns (plus the date on the plate when Blink shows another one); rebuilt only when they change. */
function renderCaption(left, aStep, bStep) {
  const describe = (step, difference = false) => (step?.epoch
    ? { ...describePreviewEpoch(step.epoch), compositeVisit: state.colour && step.composite ? step.composite.visit : null }
    : { ...describePicture({ step, allFrames: state.frames, band: state.band, difference }), colour: !difference && colourShown(step) });
  const blink = state.mode === 'blink';
  const shownSide = !blink ? null : left && left.id === aStep?.id ? 'a' : left && left.id === bStep?.id ? 'b' : 'other';
  const key = [state.mode, aStep?.id, bStep?.id, shownSide === 'other' ? (left?.id ?? ALL_DATES) : '',
    bandToParam(state.band), state.target?.key ?? '', state.frames.length, state.colour].join('|');
  if (key !== captionKey) {
    captionKey = key;
    const a = describe(aStep);
    const b = describe(bStep);
    const columns = [];
    if (state.mode === 'diff') columns.push(captionColumn(t('plate.diff'), describe(bStep, true), 'diff'));
    if (shownSide === 'other') columns.push(captionColumn('·', describe(left), 'other'));
    columns.push(captionColumn(t('ab.a'), a, 'a'), captionColumn(t('ab.b'), b, 'b'));
    // A quantitative comparison of this pair in this array already says the responses match; the generic
    // broad-band warning would contradict it.
    const quantitative = currentComparison()?.comparison?.grade === 'quantitative';
    const general = comparisonWarning(a, b);
    const warning = general === 'caption.warnBroadBand' && quantitative ? null : general;
    $('caption-body').replaceChildren(...[
      el('div', { class: 'caption-cols' }, columns),
      gradeNote(),
      warning ? el('p', { class: 'note warn', text: t(warning) }) : null,
    ].filter(Boolean));
  }
  for (const column of $('caption-body').querySelectorAll('.caption-col')) {
    const on = blink && column.dataset.side === shownSide;
    column.classList.toggle('is-shown', on);
    if (on) column.setAttribute('aria-current', 'true');
    else column.removeAttribute('aria-current');
  }
}

// ---------- Controls ----------

function setPressed(container, attribute, value) {
  for (const button of container.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset[attribute] === String(value)));
  }
}

function filmTile(step, position) {
  const canvas = el('canvas', { width: FILM_CANVAS_SIZE, height: FILM_CANVAS_SIZE, 'aria-hidden': 'true' });
  const button = el('button', {
    type: 'button',
    class: 'film-tile',
    dataset: { position: String(position) },
    'aria-label': step ? `${stepLabel(step)} · ${step.id}` : t('allDates'),
  }, [canvas, el('span', { text: stepLabel(step), 'aria-hidden': 'true' })]);
  button.addEventListener('click', () => pickFilm(position));
  return { button, canvas, step };
}

function paintFilmTile({ canvas, step }) {
  if (step?.preview) {
    drawPreview(canvas, step);
    return;
  }
  if (!step && state.previews) return;
  const saved = document.createElement('canvas');
  copyCanvas(buffer, saved);
  if (paintStep(step, state.job.n, { kind: 'composite' })) drawPlate(canvas, buffer, { grid: state.job, bare: true });
  copyCanvas(saved, buffer);
}

/** The strip is laid out at once in date order; its pictures fill in one per tick. */
function renderDates() {
  filmGeneration += 1;
  const generation = filmGeneration;
  if (!state.job && !state.previews) {
    $('dates').replaceChildren();
    return;
  }
  const steps = sequence().map((step, index) => filmTile(step, index));
  const tiles = state.previews ? steps : [...steps, filmTile(null, ALL_DATES)];
  $('dates').replaceChildren(...tiles.map((tile) => tile.button));
  renderRange();
  markFilm();
  tiles.forEach((tile, order) => {
    setTimeout(() => {
      if (generation === filmGeneration && (state.job || state.previews)) paintFilmTile(tile);
    }, order * FILM_TILE_DELAY_MS + FILM_FIRST_DELAY_MS);
  });
}

function markFilm() {
  const [a, b] = abPositions();
  for (const tile of $('dates').children) {
    const position = tile.dataset.position === ALL_DATES ? ALL_DATES : Number(tile.dataset.position);
    const active = state.mode === 'blink' ? position === state.position : position === a || position === b;
    tile.setAttribute('aria-pressed', String(active));
    const side = state.mode === 'diff' || position === ALL_DATES ? '' : position === a ? 'a' : position === b ? 'b' : '';
    tile.dataset.ab = side;
    tile.dataset.abLabel = side ? t(`ab.${side}`) : '';
  }
}

/** In Blink a tile shows that date; otherwise each pick replaces A or B in turn. */
function pickFilm(position) {
  if (state.mode === 'blink') {
    selectPosition(position);
    return;
  }
  if (position === ALL_DATES) return;
  const step = sequence()[position];
  const side = state.next;
  state.next = side === 'a' ? 'b' : 'a';
  setRange(side === 'a' ? { from: step.id } : { to: step.id });
}

const isFastMover = (object) => Math.hypot(object.pmra ?? 0, object.pmdec ?? 0) > FAST_MOVER_MAS;

const followedObject = () => state.lock ?? state.target;

/** Ties the camera to an object. A year of SPHEREx moves a star little, so 2010 joins in. */
async function lockCamera(object) {
  state.lock = object;
  state.follow = true;
  state.picking = false;
  state.candidates = null;
  const sameAsTarget = object.key === state.target.key && Boolean(object.key);
  if (!sameAsTarget) state.track = null;
  if (state.mode !== 'blink') setMode('blink');
  if (state.staticMeta && !$('wise').checked && (object.pmra || object.pmdec)) {
    $('wise').checked = true;
    await toggleWise();
  }
  if (state.position === ALL_DATES) state.position = 0;
  setPlaying(!prefersReducedMotion());
  measureSpectrum(object, null);
  if (!sameAsTarget) {
    $('motion-result').replaceChildren();
    $('measure').hidden = false;
  }
  refreshFollowUi();
  render();
}

function unlockCamera() {
  state.follow = false;
  state.lock = null;
  state.picking = false;
  state.candidates = null;
  refreshFollowUi();
  render();
}

function targetAsObject() {
  return { ...state.target, short: state.target.name };
}

async function openChooser() {
  if (state.follow || state.picking) {
    unlockCamera();
    return;
  }
  if (!state.gaia.length && state.job) {
    try {
      state.gaia = state.staticMeta?.gaia ?? (await api.getGaia(state.job.ra, state.job.dec, state.job.fov));
    } catch {
      state.gaia = [];
    }
  }
  state.candidates = chooseCandidates();
  state.picking = true;
  setPlaying(false);
  if (state.position === ALL_DATES) state.position = 0;
  refreshFollowUi();
  render();
}

/** The target, the fastest catalogue stars and the brightest ones, without repeats. */
function chooseCandidates() {
  const onPlate = state.gaia.filter((star) => {
    const { x, y } = skyToPixel(star.ra, star.dec, state.job);
    return x > EDGE_PX && y > EDGE_PX && x < state.job.n - EDGE_PX && y < state.job.n - EDGE_PX;
  });
  const speed = (star) => Math.hypot(star.pmra, star.pmdec);
  const fastest = [...onPlate].sort((first, second) => speed(second) - speed(first)).slice(0, CANDIDATES_FAST);
  const brightest = [...onPlate].sort((first, second) => first.g - second.g).slice(0, CANDIDATES_BRIGHT);
  const stars = [...new Set([...fastest, ...brightest])]
    .filter((star) => !isSameObject(star))
    .map((star, index) => ({
      ...star,
      epoch: GAIA_EPOCH,
      short: String(index + 1),
      name: t('gaiaStar', { g: number(star.g, 1), pm: number(speed(star) / 1000, 2) }),
    }));
  return [targetAsObject(), ...stars];
}

function isSameObject(star) {
  const target = positionAt(state.target, GAIA_EPOCH);
  return Math.hypot((star.ra - target.ra) * Math.cos((star.dec * Math.PI) / 180), star.dec - target.dec) < SAME_OBJECT_DEG;
}

function refreshFollowUi() {
  $('follow').textContent = t(state.follow || state.picking ? 'unlock' : 'tryFollow');
  $('follow').setAttribute('aria-pressed', String(state.follow || state.picking));
  document.body.classList.toggle('picking', state.picking);
  $('lock').hidden = !state.follow;
  $('lock').textContent = state.follow ? t('lockedOn', { name: followedObject().name }) : '';
  $('chooser').hidden = !state.picking;
  if (!state.picking) return;
  const chips = state.candidates.map((candidate, index) => el('button', {
    type: 'button',
    text: index ? `${candidate.short}. ${candidate.name}` : candidate.name,
    onclick: () => lockCamera(candidate),
  }));
  $('chooser-list').replaceChildren(...chips);
}

/** While choosing, a click takes the nearest mark, or else that exact point of the sky. */
function chooseAt(plate) {
  const year = midYear();
  const hit = state.candidates.find((candidate) => {
    const place = positionAt(candidate, year);
    const { x, y } = skyToPixel(place.ra, place.dec, state.job);
    return Math.hypot(x + 0.5 - plate.x, y + 0.5 - plate.y) < CANDIDATE_HIT_PX;
  });
  if (hit) {
    lockCamera(hit);
    return;
  }
  const { ra, dec } = pixelToSky(plate.x - 0.5, plate.y - 0.5, state.job);
  lockCamera({
    ra, dec, pmra: 0, pmdec: 0, epoch: GAIA_EPOCH, short: '',
    name: t('skyPoint', { ra: number(ra, 3), dec: number(dec, 3) }),
  });
}

/** The evidence file's comparison for the A and B visits in the current band (same array only). */
function currentComparison() {
  const doc = app.investigation?.state === 'ok' ? app.investigation.doc : null;
  if (!doc) return null;
  if (state.previews) {
    const { from, to } = state.range;
    const comparison = (doc.comparisons ?? []).find((item) => (item.a === from && item.b === to) || (item.a === to && item.b === from)) ?? null;
    return { comparison, reason: comparison ? null : 'no-comparison', detector: null, pair: true };
  }
  const [aStep, bStep] = abSteps();
  const visitOf = (step) => (!step || step.key === WISE_STEP ? null : step.key);
  return pairComparison(doc, visitOf(aStep), visitOf(bStep), state.band);
}

/**
 * Difference needs a comparison of exactly this A/B pair that allows it, shown in that one detector array
 * (the comparison covers the array's exposures, not a single channel or the all-band composite).
 */
function differenceAllowed() {
  if (state.previews || state.band.kind !== 'detector') return false;
  return allowsDifference(currentComparison()?.comparison);
}

/** "Not checked: background." for the checks a comparison left open (the page never implies they passed). */
function uncheckedText(comparison) {
  const open = Object.entries(comparison?.checks ?? {}).filter(([, value]) => value === 'not_checked')
    .map(([name]) => (has(`checkName.${name}`) ? t(`checkName.${name}`) : name));
  return open.length ? t('caption.notChecked', { checks: open.join(', ') }) : '';
}

/** Contract V2.4: a pair covered by the evidence file is labelled with its comparison grade. */
function gradeNote() {
  const found = currentComparison();
  if (!found) return null;
  if (found.reason === 'composite') return el('p', { class: 'note', text: t('caption.gradePerArray') });
  if (!found.comparison) {
    if (found.reason === 'context') return null;
    return el('p', { class: 'note', text: t(found.pair ? 'caption.gradeNonePair' : 'caption.gradeNone') });
  }
  const { comparison } = found;
  const reasons = [...comparisonReasons(comparison), comparison.explain_key].filter(Boolean)
    .map((key) => tData(key, 'explain.unknown')).join(' ');
  const unchecked = uncheckedText(comparison);
  return el('p', { class: 'note' }, [
    chip(t(found.pair ? 'caption.gradePair' : 'caption.grade', {
      grade: has(`grade.${comparison.grade}`) ? t(`grade.${comparison.grade}`) : comparison.grade,
      detector: String(found.detector),
    })),
    reasons ? ` ${reasons}` : '',
    unchecked ? ` ${unchecked}` : '',
  ]);
}

function refreshModeButtons() {
  const allowed = differenceAllowed();
  const diff = $('modes').querySelector('[data-mode="diff"]');
  diff.setAttribute('aria-disabled', String(!allowed));
  $('diff-note').hidden = allowed || !state.diffAsked;
  setPressed($('modes'), 'mode', state.mode);
}

function setMode(mode, { write = true } = {}) {
  if (mode === 'diff' && !differenceAllowed()) {
    state.diffAsked = true;
    refreshModeButtons();
    return;
  }
  state.mode = mode;
  state.diffAsked = false;
  if (mode !== 'blink') {
    setPlaying(false);
    if (state.position === ALL_DATES) state.position = 0;
  }
  refreshModeButtons();
  render();
  if (write) writeUrl();
}

function selectPosition(position) {
  setPlaying(false);
  state.position = position;
  markFilm();
  render();
}

function setPlaying(playing) {
  state.playing = playing && state.mode === 'blink';
  $('play').textContent = t(state.playing ? 'pause' : 'play');
  $('play').setAttribute('aria-pressed', String(state.playing));
  clearInterval(playTimer);
  if (state.playing) playTimer = setInterval(advance, state.speedMs);
}

/** Positions that Blink plays: A and B, or every date from A to B. */
function playedPositions() {
  const steps = sequence();
  if (!steps.length) return [];
  const [first, last] = abPositions();
  const [low, high] = first <= last ? [first, last] : [last, first];
  if (state.range.endpoints) return first === last ? [first] : [first, last];
  return steps.map((_, index) => index).filter((index) => index >= low && index <= high);
}

function advance() {
  const played = playedPositions();
  if (played.length < 2) return;
  const at = played.indexOf(state.position);
  state.position = played[(at + 1) % played.length];
  markFilm();
  render();
}

function renderRange() {
  const steps = sequence();
  const options = () => steps.map((step) => el('option', {
    value: step.id,
    text: step.key === WISE_STEP ? stepLabel(step) : t('ab.option', { id: step.id, count: String(step.frames.length) }),
  }));
  const fill = (select, value) => {
    select.replaceChildren(...options());
    select.value = String(value ?? '');
  };
  fill($('range-from'), state.range.from ?? steps[0]?.id);
  fill($('range-to'), state.range.to ?? steps.at(-1)?.id);
  $('endpoints').setAttribute('aria-pressed', String(state.range.endpoints));
}

function setRange(change, { write = true } = {}) {
  state.range = { ...state.range, ...change };
  const played = playedPositions();
  if (played.length) state.position = played[0];
  renderRange();
  markFilm();
  if (state.mode === 'diff' && !differenceAllowed()) state.mode = 'blink';
  refreshModeButtons();
  if (state.mode === 'blink') setPlaying(!prefersReducedMotion());
  render();
  if (write) writeUrl();
}

/** How far the object should have moved between A and B, from its catalogue motion. */
function rangeNote() {
  const object = followedObject();
  const speed = Math.hypot(object?.pmra ?? 0, object?.pmdec ?? 0) / 1000;
  const [aStep, bStep] = abSteps();
  if (speed < MIN_NOTED_SPEED || !aStep || !bStep || aStep === bStep) return '';
  const years = Math.abs(yearOf(bStep) - yearOf(aStep));
  const shift = speed * years;
  // The target by its heading name; a star the camera was locked on by its own name.
  const name = object === state.target ? $('object-name').textContent : object?.name;
  if (!name) return t('rangeNote', { years: number(years, years >= 10 ? 0 : 1), shift: number(shift, 0) });
  return t('finding.moved', { years: number(years, years >= 10 ? 0 : 1), name, shift: number(shift, 0), moon: moonShare(shift) });
}

function setBand(band, { write = true } = {}) {
  state.band = band;
  if (state.mode === 'diff' && !differenceAllowed()) state.mode = 'blink';
  refreshModeButtons();
  $('composite').setAttribute('aria-pressed', String(band.kind === 'composite'));
  $('band-label').textContent = band.kind === 'channel'
    ? `≈${channelWavelength(band.channel).toFixed(2)} μm`
    : band.kind === 'detector' ? `D${band.detector}` : FULL_RANGE_LABEL;
  if (band.kind === 'channel') $('band').value = band.channel;
  render();
  drawCharts();
  if (write) writeUrl();
}

// ---------- Colour slider under the picture (task B31) ----------
// All, or one detector array (D1–D6), for both A and B: the existing per-array images and the URL band value.
// Display only: each array keeps one stretch for every date (sharedLimits), and no measurement changes.

const rangeText = (low, high) => ({ low: low.toFixed(2), high: high.toFixed(2) });

/** The step's words, e.g. "D3 · 1.63–2.41 µm", from our array table. */
function colourStepText(band) {
  if (band.kind === 'detector') return t('colourStep.arrayValue', { n: String(band.detector), ...rangeText(...DETECTOR_RANGES[band.detector]) });
  if (band.kind === 'channel') return t('colourStep.channelValue', { n: String(detectorOfChannel(band.channel)), um: channelWavelength(band.channel).toFixed(2) });
  return t('colourStep.allValue', rangeText(DETECTOR_RANGES[1][0], DETECTOR_RANGES[6][1]));
}

/** Pictures with only one colour: AllWISE as A or B, a preview-only target, or no frames at all. */
function singleColour() {
  if (state.previews || !state.job || !state.frames.length) return true;
  return abSteps().some((step) => step?.key === WISE_STEP);
}

function syncColourStep() {
  const input = $('colour-step');
  const band = state.band;
  const value = band.kind === 'detector' ? band.detector : band.kind === 'channel' ? detectorOfChannel(band.channel) : 0;
  if (Number(input.value) !== value) input.value = String(value);
  const text = colourStepText(band);
  $('colour-step-value').textContent = text;
  input.setAttribute('aria-valuetext', text);
  const single = singleColour();
  input.disabled = single;
  $('colour-step-control').classList.toggle('is-single', single);
  $('colour-step-control').title = single ? t('colourStep.single') : '';
  input.title = single ? t('colourStep.single') : '';
  $('colour-step-single').hidden = !single;
  input.setAttribute('aria-describedby', single ? 'colour-step-value colour-step-single' : 'colour-step-value');
}

function buildColourStep() {
  const arrays = Object.keys(DETECTOR_RANGES).length;
  $('colour-step-line').textContent = t('colourStep.line', { channels: String(CHANNELS), arrays: String(arrays) });
  $('colour-step').max = String(arrays);
  const steps = [['0', t('colourStep.all')], ...Object.keys(DETECTOR_RANGES).map((n) => [n, t('colourStep.array', { n })])];
  $('colour-step-ticks').replaceChildren(...steps.map(([value, label]) => el('option', { value, label })));
  $('colour-step-names').replaceChildren(...steps.map(([value, label]) => el('span', { dataset: { step: value }, text: label })));
  $('colour-step').addEventListener('input', () => {
    const step = Number($('colour-step').value);
    setBand(step >= 1 && step <= arrays ? { kind: 'detector', detector: step } : { kind: 'composite' });
  });
  syncColourStep();
}

function buildBandScale() {
  const stops = Array.from({ length: CHANNELS }, (_, channel) => el('span', {
    class: channel && detectorOfChannel(channel) !== detectorOfChannel(channel - 1) ? 'array-start' : null,
  }));
  $('band-scale').replaceChildren(...stops);
}

/** ← and → step through dates (B outside Blink); Space plays or pauses Blink, or flips the swipe. */
function onViewerKey(event) {
  if ((!state.job && !state.previews) || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target instanceof Element ? event.target : document.body;
  if (target.closest('input, select, textarea')) return;
  const steps = sequence();
  if (event.key in KEY_STEP && steps.length) {
    event.preventDefault();
    const delta = KEY_STEP[event.key];
    if (state.mode === 'blink') {
      const from = state.position === ALL_DATES ? 0 : state.position;
      selectPosition((from + delta + steps.length) % steps.length);
    } else {
      const [, b] = abPositions();
      setRange({ to: steps[(b + delta + steps.length) % steps.length].id });
    }
    return;
  }
  if (event.key !== ' ' || target.closest('button, a, summary')) return;
  event.preventDefault();
  if (state.mode === 'blink') setPlaying(!state.playing);
  else if (state.mode === 'swipe') setSwipe(state.swipe <= SWIPE_ENDS[0] ? SWIPE_ENDS[1] : SWIPE_ENDS[0]);
}

function setSwipe(value) {
  state.swipe = Math.min(100, Math.max(0, Number(value)));
  $('swipe').value = String(state.swipe);
  $('plates').style.setProperty('--swipe', `${state.swipe}%`);
}

// ---------- Opening a patch of sky ----------

const centreOf = (target) => ({ ra: target.centreRa ?? target.ra, dec: target.centreDec ?? target.dec });

function resetViewerState(target) {
  const session = state.session + 1;
  Object.assign(state, {
    session, target, job: null, staticMeta: null, frames: [], visits: [], wiseFrame: null, position: 0, gaia: [],
    spectrum: null, spectrumObject: null, track: null, pick: null, band: { kind: 'composite' }, mode: 'blink',
    auto: { spectrum: false }, follow: false, lock: null, picking: false, candidates: null, next: 'a',
    range: { from: null, to: null, endpoints: true }, received: 0, diffAsked: false, previews: null,
  });
  document.body.classList.remove('preview-mode');
  setPlaying(false);
  refreshFollowUi();
  cache.clear();
  return session;
}

async function openTarget(target, requestedFov = target.fov ?? DEFAULT_FOV) {
  const { ra, dec } = centreOf(target);
  let fov = requestedFov;
  const session = resetViewerState(target);
  if (target.key && fov !== target.fov && reservedRegionNear(ra, dec, fov)) {
    addNotice('note.preparedFov', { name: displayName(target), fov: String(target.fov) });
    fov = target.fov;
  }
  resetPanels(target, fov);
  writeUrl();
  if (!(target.key && fov === target.fov)) {
    const reserved = reservedRegionNear(ra, dec, fov);
    if (reserved) {
      addNotice('note.reserved', { name: reservedName(reserved) });
      showViewerEmpty(t('note.reservedEmpty'));
      return;
    }
    // The public static site has no TENGER server: say so instead of requesting anything.
    if (!api.liveAvailable()) {
      showViewerEmpty(t('note.liveUnavailable'));
      return;
    }
  }
  try {
    if (target.key && fov === target.fov) await openStatic(target, session);
    else await openLive(ra, dec, fov, session);
  } catch (error) {
    if (session !== state.session) return;
    if (error?.liveUnavailable) showViewerEmpty(t('note.liveUnavailable'));
    else showLoadProblem(target, fov);
  }
}

function reservedName(region) {
  const entry = app.allTargets.find((item) => item.key === region.key);
  return entry ? entryName(entry) : region.key;
}

function showViewerEmpty(text) {
  $('observatory').hidden = true;
  $('see-tools').hidden = true;
  $('see-empty').hidden = false;
  $('see-empty').textContent = text;
  $('progress').textContent = '';
  refreshPanels();
}

function showLoadProblem(target, fov) {
  const retry = el('button', { type: 'button', class: 'glow', text: t('retry'), onclick: () => openTarget(target, fov) });
  $('progress').replaceChildren(el('p', { text: t('loadFailed') }), retry);
}

/** The challenge targets ship with the site, so they open at once with no server. */
async function openStatic(target, session) {
  const loaded = await api.getStaticTarget(target.key);
  if (session !== state.session) return;
  const { meta } = loaded;
  const frames = wellCovered(loaded.frames);
  state.staticMeta = meta;
  state.job = { ...meta.grid, status: 'done', available: meta.available, total: meta.total, done: frames.length, failed: 0 };
  state.plateView = fullView(meta.grid.n);
  state.frames = frames;
  state.visits = visitsOf(frames);
  await ensureInvestigation();
  if (session !== state.session) return;
  if (isFastMover(target) && meta.wise) {
    state.wiseFrame = await api.getStaticWise(target.key, meta);
    if (session !== state.session) return;
    $('wise').checked = true;
  }
  const steps = sequence();
  state.range = { from: steps[0]?.id ?? null, to: steps.at(-1)?.id ?? null, endpoints: true };
  state.position = 0;
  applyPendingView();
  renderDates();
  setPlaying(state.mode === 'blink' && !prefersReducedMotion());
  render();
  reportProgress(state.job);
  autoMeasure();
  refreshPanels();
  writeUrl();
}

async function openLive(ra, dec, fov, session) {
  state.job = await api.observe(ra, dec, fov);
  if (session !== state.session) return;
  state.plateView = fullView(state.job.n);
  await followJob(session);
}

function resetPanels(target, fov) {
  $('observatory').hidden = false;
  $('see-tools').hidden = false;
  $('see-empty').hidden = true;
  document.body.dataset.kind = target.kind ?? 'custom';
  fillFovSelect(fov);
  $('wise').checked = false;
  $('gaia').checked = false;
  $('motion-result').replaceChildren();
  $('measure').hidden = false;
  $('chart').replaceChildren();
  $('curve-chart').replaceChildren();
  $('spectrum-table').replaceChildren();
  $('curve-table').replaceChildren();
  $('chart-note').textContent = t('clickHint');
  $('curve-note').textContent = '';
  $('progress').textContent = target.key ? '' : t('searching');
  describeTarget(target, fov);
  refreshModeButtons();
  setBand({ kind: 'composite' }, { write: false });
  setSwipe(state.swipe);
  renderDates();
}

function fillFovSelect(fov) {
  const choices = [...new Set([...FOV_CHOICES, fov])].sort((first, second) => first - second);
  $('fov').replaceChildren(...choices.map((value) => el('option', {
    value: String(value),
    text: t('search.fovOption', { arcmin: String(Math.round(value * 60)), deg: String(value) }),
  })));
  $('fov').value = String(fov);
}

/** The plain line under the name and the caption above the picture (task B17), from the target's kind and distance. */
function describePlain(entry, kind, { picture = true } = {}) {
  $('object-plain').textContent = plainLine({ kind: entry?.kind ?? kind, distance: entry?.map?.distance ?? null });
  const family = colourOf(entry?.kind ?? kind);
  const caption = !entry || !picture ? '' : family === 'solar' ? t('stage.captionSolar') : family === 'variable' ? t('stage.captionVariable') : t('stage.captionStar');
  $('stage-caption').textContent = caption;
  $('stage-caption').hidden = !caption;
}

function describeTarget(target, fov) {
  const { ra, dec } = centreOf(target);
  const entry = app.entry;
  $('object-name').textContent = entry ? entryName(entry) : displayName(target);
  $('object-kind').textContent = kindLabel(entry?.kind ?? target.kind ?? 'custom');
  $('object-coords').textContent = Number.isFinite(ra) && Number.isFinite(dec)
    ? t('inv.coords', { ra: `${ra.toFixed(4)}°`, dec: `${dec >= 0 ? '+' : '−'}${Math.abs(dec).toFixed(4)}°`, fov: String(fov) })
    : t('inv.bodyCentred');
  const chips = [];
  if (entry) {
    chips.push(chip(t(`role.${entry.role}`)));
    chips.push(chip(isViewable(entry) || state.previews ? t(`data.${framesKind()}`) : statusLabel(entry)));
    if (isLegacyOnly(entry)) chips.push(chip(t('data.legacyOnly')));
    chips.push(chip(predictionLabel(entry)));
  } else {
    chips.push(chip(t('kindcustom')));
  }
  $('object-status').replaceChildren(...chips);
  $('loop-link-wrap').hidden = entry?.key !== 'pluto';
  describePlain(entry, target.kind ?? 'custom');
  document.title = `${$('object-name').textContent} · ${t('site.title')}`;
}

async function followJob(session) {
  for (;;) {
    const status = await api.jobStatus(state.job.id);
    if (session !== state.session) return;
    state.job = status;
    await pullFrames(session);
    if (session !== state.session) return;
    reportProgress(status);
    if (status.status === 'done') {
      autoMeasure();
      refreshPanels();
    }
    if (status.status === 'done' || status.status === 'error') return;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

async function pullFrames(session) {
  if (state.job.done <= state.received) return;
  const incoming = await api.getFrames(state.job.id, state.received, state.job.n);
  if (session !== state.session || !incoming.length) return;
  const first = !state.frames.length;
  state.received += incoming.length;
  state.frames = [...state.frames, ...wellCovered(incoming)];
  state.visits = visitsOf(state.frames);
  const steps = sequence();
  state.range = { ...state.range, from: state.range.from ?? steps[0]?.id ?? null, to: steps.at(-1)?.id ?? null };
  cache.clear();
  renderDates();
  if (first) setPlaying(!prefersReducedMotion());
  render();
  autoMeasure();
}

/** Every opened field shows its quick-look spectrum and light curve; motion waits for a click. */
function autoMeasure() {
  if (!state.auto.spectrum && state.frames.length >= AUTO_SPECTRUM_FRAMES && state.job.status === 'done') {
    state.auto.spectrum = true;
    spectrumOfTarget();
  }
}

function reportProgress(status) {
  const messages = {
    searching: () => t('searching'),
    downloading: () => t('downloading', { done: status.done, total: status.total }),
    error: () => status.error,
    done: () => (status.available === 0 ? t('noCoverage') : ''),
  };
  $('progress').textContent = messages[status.status]?.() ?? '';
}

function finishedMessage(status) {
  if (status.available === 0) return t('noCoverage');
  const notes = [];
  if (status.total < status.available) notes.push(t('subset', { total: status.total, available: status.available }));
  if (status.failed) notes.push(t('failedFrames', { count: status.failed }));
  return notes.join(' ');
}

// ---------- Spectrum, light curve and motion (quick looks) ----------

const motionOf = (object) => ({
  pmra: object?.pmra ?? 0,
  pmdec: object?.pmdec ?? 0,
  epoch: object?.epoch ?? CUSTOM_EPOCH,
});

function measureSpectrum(object, pick) {
  state.pick = pick ?? state.pick;
  state.spectrumObject = object;
  state.spectrum = photometry(state.frames, state.job, { ...motionOf(object), ...object });
  render();
  drawCharts();
}

function drawCharts() {
  const points = state.spectrum;
  if (!points) return;
  if (!points.length) {
    $('chart').replaceChildren();
    $('curve-chart').replaceChildren();
    $('spectrum-table').replaceChildren();
    $('curve-table').replaceChildren();
    $('chart-note').textContent = t('noSpectrum');
    $('curve-note').textContent = t('noSpectrum');
    return;
  }
  drawSpectrum($('chart'), points);
  $('chart-note').textContent = `${t('flaggedNote')} ${t('clickHint')}`;
  $('spectrum-table').replaceChildren(dataTable({
    caption: t('spectrum'),
    columns: [t('table.wavelength'), t('table.flux'), t('table.error'), t('table.flagged'), t('table.array')],
    rows: [...points].sort((first, second) => first.wavelength - second.wavelength).map((point) => [
      formatNumber(point.wavelength, 3), formatNumber(point.flux, 1), formatNumber(point.error, 1),
      t(point.flagged ? 'table.yes' : 'table.no'), `D${point.detector}`,
    ]),
  }));
  const shown = bandPoints(points);
  const useWings = isSaturated(shown);
  if (useWings) drawWingCurve($('curve-chart'), shown);
  else drawLightCurve($('curve-chart'), shown);
  $('curve-note').textContent = t(useWings ? 'wingNote' : 'flaggedNote');
  const curveRows = [...shown].sort((first, second) => first.mjd - second.mjd).map((point) => [
    formatUtc(mjdToDate(point.mjd)),
    useWings ? formatNumber(point.wing, 3) : formatNumber(point.flux, 1),
    useWings ? '—' : formatNumber(point.error, 1),
    t(point.flagged ? 'table.yes' : 'table.no'),
    `D${point.detector}`,
  ]);
  $('curve-table').replaceChildren(dataTable({
    caption: t('lightCurve'),
    columns: [t('table.date'), t(useWings ? 'table.wing' : 'table.flux'), t('table.error'), t('table.flagged'), t('table.array')],
    rows: curveRows,
  }));
}

function bandPoints(points) {
  if (state.band.kind === 'composite') {
    const array = CURVE_ARRAYS[state.target?.key];
    return array ? points.filter((point) => point.detector === array) : points;
  }
  const detector = state.band.kind === 'channel' ? detectorOfChannel(state.band.channel) : state.band.detector;
  return points.filter((point) => point.detector === detector);
}

function plateFractions(canvas, event) {
  const box = canvas.getBoundingClientRect();
  return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
}

function pickAt(canvas, event) {
  const fraction = plateFractions(canvas, event);
  const plate = canvasToPlate(viewFor(currentStep()), state.job.n, fraction.x, fraction.y);
  if (state.picking) {
    chooseAt(plate);
    return;
  }
  const position = pixelToSky(plate.x - 0.5, plate.y - 0.5, state.job);
  measureSpectrum(position, position);
}

/** Wheel zooms, dragging pans, a click measures the spot, a double click resets the view. */
function bindPlateGestures(canvas) {
  let drag = null;
  canvas.addEventListener('wheel', (event) => {
    if (!state.job) return;
    event.preventDefault();
    const fraction = plateFractions(canvas, event);
    const plate = canvasToPlate(state.plateView, state.job.n, fraction.x, fraction.y);
    state.plateView = zoomAt(state.plateView, state.job.n, plate.x, plate.y, event.deltaY);
    render();
  }, { passive: false });
  canvas.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, y: event.clientY, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || !state.job) return;
    const distance = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    if (!drag.moved && distance < DRAG_THRESHOLD_PX) return;
    const box = canvas.getBoundingClientRect();
    const perPixel = state.job.n / state.plateView.zoom / box.width;
    state.plateView = panBy(state.plateView, state.job.n, (event.clientX - drag.x) * perPixel, (drag.y - event.clientY) * perPixel);
    drag = { x: event.clientX, y: event.clientY, moved: true };
    render();
  });
  canvas.addEventListener('pointerup', (event) => {
    if (drag && !drag.moved && state.job) pickAt(canvas, event);
    drag = null;
  });
  canvas.addEventListener('dblclick', () => {
    if (!state.job) return;
    state.plateView = fullView(state.job.n);
    render();
  });
}

function spectrumOfTarget() {
  return measureSpectrum(state.target, null);
}

/** Arrays where a target stands out clearly from its neighbours. */
const BEST_ARRAYS = { wise0855: [5, 6] };

function activeDetectors() {
  if (state.band.kind === 'channel') return [detectorOfChannel(state.band.channel)];
  if (state.band.kind === 'detector') return [state.band.detector];
  return BEST_ARRAYS[state.target?.key] ?? [1, 2, 3, 4, 5, 6];
}

async function measureMotion() {
  if (!state.job) return;
  const session = state.session;
  const object = state.spectrumObject ?? state.target;
  $('motion-result').textContent = t('measuring');
  // Let the message paint before the measurement occupies the page for a moment.
  await new Promise((resolve) => setTimeout(resolve, MOTION_PAINT_DELAY_MS));
  if (session !== state.session) return;
  try {
    const result = trackMotion(state.frames, state.job, { ...motionOf(object), ...object }, activeDetectors());
    state.track = result.visits;
    showMotion(result);
    render();
  } catch (error) {
    $('motion-result').textContent = error.message;
  }
}

function showMotion(result) {
  if (MOTION_UNRELIABLE.has(state.target?.key) && !state.lock) {
    $('motion-result').replaceChildren(el('p', { text: t('motionUnreliable') }));
    $('measure').hidden = true;
    state.track = null;
    return;
  }
  const unit = t('perYear');
  const floor = Math.max(result.controlMedian ?? Infinity, result.fit.totalErr);
  const real = result.fit.total > MOTION_SIGNIFICANCE * floor;
  const big = el('div', { class: real ? 'big-number' : 'big-words' });
  if (real) countUp(big, result.fit.total, unit);
  else big.textContent = t('notDetected');
  const rows = [
    [t('measured'), `${result.fit.total.toFixed(2)} ± ${result.fit.totalErr.toFixed(2)}${unit}`],
    ...(result.catalog ? [[t('catalogue'), `${result.catalog.toFixed(2)}${unit}`]] : []),
    ...(result.controlMedian !== null ? [[t('controls'), `${result.controlMedian.toFixed(2)}${unit}`]] : []),
  ];
  const table = el('table', {}, el('tbody', {}, rows.map(([label, value]) => el('tr', {}, [
    el('th', { scope: 'row', text: label }), el('td', { text: value }),
  ]))));
  const summary = el('p', { text: `${t(real ? 'motionVerdict' : 'motionWeak')} ${t('motionBaseline', {
    count: result.visits.length, detectors: result.detectors.join(', '),
  })}` });
  $('motion-result').replaceChildren(chip(t('changed.explore'), 'chip-example'), big, table, summary);
  $('measure').hidden = true;
}

function countUp(node, value, unit) {
  const write = (shown) => node.replaceChildren(shown.toFixed(2), el('small', { text: unit }));
  if (prefersReducedMotion()) {
    write(value);
    return;
  }
  // From 0 to the value in COUNT_UP_MS. A frame's time can be a little earlier than the start; countUpShown clamps
  // that to 0, so the number never shows below 0 or past the value (task B28).
  const started = performance.now();
  write(0);
  const step = (now) => {
    write(countUpShown(value, now - started, COUNT_UP_MS));
    if (now - started < COUNT_UP_MS) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- Overlays ----------

async function toggleGaia() {
  if ($('gaia').checked && !state.gaia.length && state.job) {
    try {
      state.gaia = state.staticMeta?.gaia ?? (await api.getGaia(state.job.ra, state.job.dec, state.job.fov));
    } catch (error) {
      $('progress').textContent = error?.liveUnavailable ? t('note.liveUnavailable') : t('gaiaFailed');
      $('gaia').checked = false;
    }
  }
  render();
}

async function toggleWise() {
  if ($('wise').checked && !state.wiseFrame && state.job) {
    try {
      state.wiseFrame = state.staticMeta
        ? await api.getStaticWise(state.target.key, state.staticMeta)
        : await api.getWiseFrame(state.job.id, state.job.n);
    } catch {
      $('progress').textContent = t('wiseFailed');
      $('wise').checked = false;
    }
  }
  const steps = sequence();
  const keep = (id) => (steps.some((step) => step.id === id) ? id : null);
  state.range = {
    ...state.range,
    from: keep(state.range.from) ?? steps[0]?.id ?? null,
    to: keep(state.range.to) ?? steps.at(-1)?.id ?? null,
  };
  if ($('wise').checked) state.range.from = WISE_ID;
  state.position = 0;
  renderDates();
  render();
  writeUrl();
}

// ---------- Investigation panels ----------

/** Loads the target's evidence file once (null for a custom position). */
async function ensureInvestigation() {
  const entry = app.entry;
  if (!entry) {
    app.investigation = null;
    return;
  }
  if (app.investigation?.path === entry.investigationPath && app.investigation?.key === entry.key) return;
  const loaded = entry.investigationPath ? await app.source.investigation(entry.investigationPath) : { state: 'missing' };
  app.investigation = { ...loaded, path: entry.investigationPath, key: entry.key };
}

async function refreshPanels() {
  const entry = app.entry;
  const custom = !entry;
  await ensureInvestigation();
  renderChanged($('changed-validated'), { investigation: app.investigation, custom });
  syncPlayButtons();
  // Path through time (3D) (task B34): our measured positions from the published investigation file only.
  if ($('changed-path').dataset.key !== `${entry?.key ?? ''}|${app.investigation?.path ?? ''}`) {
    $('changed-path').dataset.key = `${entry?.key ?? ''}|${app.investigation?.path ?? ''}`;
    renderPath3d($('changed-path'), { investigation: custom ? null : app.investigation, name: entry ? entryName(entry) : '' });
  }
  if (entry && state.target) describeTarget(state.target, Number($('fov').value) || state.target.fov || DEFAULT_FOV);
  captionKey = '';
  render();
  renderEvidence($('evidence-body'), {
    investigation: app.investigation,
    legacy: { frames: state.frames, meta: state.staticMeta, custom, kind: framesKind() },
    epochs: app.investigation?.state !== 'ok' ? null : state.previews
      ? { matched: state.previews.length, total: app.investigation.doc.epochs?.length ?? 0, preview: true }
      : epochCoverage(app.investigation.doc, state.visits.map((visit) => visit.visit)),
    // Task B30: the target's published investigation file, as it is on the server.
    download: entry && app.investigation?.path ? {
      href: `${app.source.base}${app.investigation.path}`,
      file: app.investigation.path.split('/').pop(),
      saveAs: app.investigation.path.replaceAll('/', '-'),
      name: entryName(entry),
    } : null,
  });
  renderSpectrumNote($('spectrum-note'), { investigation: app.investigation });
  $('explore-box').hidden = !state.frames.length;
  refreshModeButtons();
  await renderPrediction($('prediction-body'), { entry, indexState: app.indexState, loadTrial: (id) => app.source.trial(id) });
}

function setPanel(panel, { scroll = true, write = true, instant = false } = {}) {
  app.panel = panel;
  for (const button of document.querySelectorAll('.panel-nav button')) {
    button.setAttribute('aria-current', String(button.dataset.panel === panel));
  }
  const behavior = instant || prefersReducedMotion() ? 'auto' : 'smooth';
  if (scroll && panel !== 'see') $(`panel-${panel}`).scrollIntoView({ behavior, block: 'start' });
  else if (scroll) {
    $('inv-panel').scrollTo({ top: 0, behavior });
    scrollTo({ top: 0, behavior });
  }
  if (write) writeUrl();
}

// ---------- Notices ----------

function addNotice(key, params = {}) {
  if (!app.notices.some((item) => item.key === key && JSON.stringify(item.params) === JSON.stringify(params))) {
    app.notices.push({ key, params });
  }
  renderNotices();
}

function renderNotices() {
  $('notices').replaceChildren(...app.notices.map((item, index) => el('div', { class: 'notice', role: 'status' }, [
    el('p', { text: t(item.key, item.params) }),
    el('button', {
      type: 'button',
      text: '×',
      'aria-label': t('notice.dismiss'),
      onclick: () => {
        app.notices.splice(index, 1);
        renderNotices();
      },
    }),
  ])));
}

// ---------- Navigation and URL ----------

const dataVersion = () => (app.indexState?.state === 'ok' ? app.indexState.doc.dataset_version : 'legacy');

function routeState() {
  const base = {
    page: app.page,
    embed: app.embed,
    fixtures: app.source?.fixtures,
    round: app.page === 'game' ? currentRoundId() : null,
    lesson: app.page === 'learn' ? currentLearnView() : null,
    trial: app.page === 'predictions' ? currentReveal() : null,
  };
  if (app.page !== 'investigate' || !state.target) return base;
  const centre = app.requested ?? centreOf(state.target);
  return {
    ...base,
    target: app.entry?.key ?? null,
    ra: centre.ra,
    dec: centre.dec,
    fov: state.previews ? null : Number($('fov').value) || state.target.fov || DEFAULT_FOV,
    panel: app.panel,
    band: state.band,
    mode: state.mode,
    a: state.range.from,
    b: state.range.to,
    v: dataVersion(),
  };
}

function writeUrl({ push = false } = {}) {
  const search = buildRoute(routeState());
  const url = `${location.pathname}${search}`;
  // Inside an embed, "Open in TENGER" leads to the same view on the full site.
  if (app.embed) $('embed-open').href = `${location.pathname}${buildRoute({ ...routeState(), embed: false })}`;
  if (url === `${location.pathname}${location.search}`) return;
  if (push) history.pushState(null, '', url);
  else history.replaceState(null, '', url);
}

/** The phone menu (the nav is a drop-down below 720 px). */
function setMenu(open) {
  $('menu-toggle').setAttribute('aria-expanded', String(open));
  $('site-nav').classList.toggle('open', open);
}

function showPage(page, { push = true, focus = true } = {}) {
  // Home scrolls inside itself on wide screens (first screen, then the 3D map): an investigation hides the first
  // screen, so remember where Home was and return there.
  if (app.page === 'home' && page !== 'home') app.homeScroll = $('page-home').scrollTop;
  app.page = page;
  setMenu(false);
  for (const name of PAGES) $(`page-${name}`).hidden = name !== page && !(page === 'investigate' && name === 'home');
  // The investigation panel slides in over the map, which stays visible but out of reach.
  $('page-home').inert = page === 'investigate';
  document.body.dataset.page = page;
  for (const link of document.querySelectorAll('.nav [data-page-link]')) {
    const current = link.dataset.pageLink === page || (page === 'investigate' && link.dataset.pageLink === 'home');
    link.setAttribute('aria-current', current ? 'page' : 'false');
  }
  if (page === 'home' || page === 'investigate') {
    requestAnimationFrame(placeMapLabels);
    homeShown();
  }
  if (page === 'predictions') showLedger();
  if (page === 'method') showMethod();
  if (page === 'game' || page === 'learn') ensurePlanetX();
  if (page === 'learn') ensureBatch()?.then(setBatch);
  if (page === 'loop' && app.source) {
    const pluto = app.indexState?.state === 'ok' ? app.indexState.doc.targets?.find((target) => target.key === 'pluto') : null;
    showLoopPage({ source: app.source.fixtures ? createSource({ fixtures: false }) : app.source, openForecastIds: pluto?.prediction?.open_forecast_ids ?? [], embed: app.embed });
  }
  else syncRevealFromUrl(null);
  if (page !== 'investigate') {
    setPlaying(false);
    document.title = page === 'home' ? `${t('site.title')} · ${t('home.title')}` : `${t(`nav.${page}`)} · ${t('site.title')}`;
  }
  writeUrl({ push });
  if (page === 'home') {
    const top = app.homeScroll ?? 0;
    requestAnimationFrame(() => { $('page-home').scrollTop = top; });
  }
  if (focus) {
    scrollTo(0, 0);
    $('inv-panel').scrollTo(0, 0);
    const heading = page === 'investigate' ? $('object-name') : $(`page-${page}`).querySelector('h1');
    heading?.focus({ preventScroll: true });
  }
}

/** Opens a target entry: its prepared frames, or an honest "not available yet" page. */
function openEntry(entry, { fov = null, requested = null, push = true } = {}) {
  app.entry = entry;
  app.requested = requested;
  app.investigation = null;
  if (!app.keepNotices) app.notices = [];
  app.keepNotices = false;
  renderNotices();
  showPage('investigate', { push });
  if (!isViewable(entry) && isOpenable(entry)) {
    openPreview(entry);
    return;
  }
  if (!isViewable(entry)) {
    resetViewerState(null);
    describeEntryOnly(entry);
    addNotice('note.unavailable', { name: entryName(entry) });
    if (entry.statusReasonKey) addNotice('data.unavailableBecause', { reason: tData(entry.statusReasonKey, 'explain.unknown') });
    showViewerEmpty(t('data.unavailableLong'));
    writeUrl();
    scrollToLinkedPanel();
    return;
  }
  if (requested) {
    addNotice('note.covered', { name: entryName(entry) });
  }
  openTarget(entry.legacy, fov ?? entry.fov).then(() => {
    if (requested && state.job) {
      state.pick = requested;
      render();
    }
    scrollToLinkedPanel();
  });
}

// ---------- Preview-only investigations (epochs[].assets.preview, no frame bundle) ----------

const previewImages = new Map();

/**
 * V10 composites: for each preview step, the display-colour picture of its visit (matched by the epoch ids the
 * composite file lists). Missing or unreadable files leave the grey single-array previews.
 */
async function attachComposites(entry, steps) {
  const url = entry.compositesPath ? app.source.url(entry.compositesPath) : null;
  if (!url) return;
  try {
    const response = await fetch(url);
    if (!response.ok) return;
    const doc = await response.json();
    if (doc?.schema_version !== 'tenger.composites/1' || !Array.isArray(doc.visits)) return;
    for (const visit of doc.visits) {
      const src = visit?.path && visit.display_only ? app.source.url(visit.path) : null;
      if (!src) continue;
      for (const step of steps) if ((visit.epoch_ids ?? []).includes(step.id)) step.composite = { src, visit: visit.visit };
    }
  } catch {
    // Colour is optional: the grey previews stay.
  }
}

/** The picture a preview step shows: its visit's display colours when chosen and available, else its own preview. */
const previewSource = (step) => (state.colour && step?.composite ? step.composite.src : step?.preview);

function previewStepsOf(doc) {
  return (doc?.epochs ?? []).filter((epoch) => epoch?.assets?.preview && typeof epoch.id === 'string')
    .map((epoch) => ({
      key: `preview-${epoch.id}`,
      id: epoch.id,
      epoch,
      frames: [],
      preview: app.source.url(epoch.assets.preview),
      mjd: ((epoch.t_start_mjd ?? 0) + (epoch.t_end_mjd ?? epoch.t_start_mjd ?? 0)) / 2,
    }))
    .filter((step) => step.preview)
    .sort((first, second) => first.mjd - second.mjd);
}

/** Draws a preview image into a plate or tile canvas; redraws when it has loaded. */
function drawPreview(canvas, step) {
  const context = canvas.getContext('2d');
  context.fillStyle = '#05070d';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const source = previewSource(step);
  if (!source) return;
  let image = previewImages.get(source);
  if (!image) {
    image = new Image();
    image.decoding = 'async';
    image.addEventListener('load', () => {
      render();
      for (const tile of $('dates').children) {
        const index = Number(tile.dataset.position);
        const tileStep = sequence()[index];
        if (tileStep && previewSource(tileStep) === source) drawPreview(tile.querySelector('canvas'), tileStep);
      }
    });
    image.src = source;
    previewImages.set(source, image);
  }
  if (image.complete && image.naturalWidth) {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
}

function renderPreview() {
  const [aStep, bStep] = abSteps();
  const mode = state.mode === 'diff' ? 'blink' : state.mode;
  const two = mode === 'side' || mode === 'swipe';
  const left = two ? aStep : currentStep();
  drawPreview($('plate'), left);
  $('plate-date').textContent = two ? t('plate.a', { date: stepLabel(aStep) }) : plateLabel(left);
  $('plate-colour').hidden = !(state.colour && left?.composite);
  $('plate-colour-b').hidden = !(two && state.colour && bStep?.composite);
  $('colour-toggle').hidden = !state.previews.some((step) => step.composite);
  $('colour-toggle').setAttribute('aria-pressed', String(!state.colour));
  $('second-frame').hidden = !two;
  if (two) {
    drawPreview($('plate-b'), bStep);
    $('plate-date-b').textContent = t('plate.b', { date: stepLabel(bStep) });
  }
  $('plates').dataset.mode = mode;
  $('observatory').dataset.mode = mode;
  $('swipe-control').hidden = mode !== 'swipe';
  $('plate-empty').hidden = true;
  $('plate-info').textContent = '';
  document.body.dataset.layout = mode === 'side' ? 'compare' : 'one';
  renderCaption(left, aStep, bStep);
  $('explain').textContent = t(left?.epoch?.frame === 'body_centred' ? 'explainBodyCentred' : 'explainPreview');
  markFilm();
}

/** Opens a target whose evidence file has preview images but no frame bundle (e.g. Makemake). */
async function openPreview(entry) {
  const session = resetViewerState({ key: entry.key, name: entryName(entry), kind: entry.kind });
  document.body.classList.add('preview-mode');
  $('observatory').hidden = false;
  $('see-tools').hidden = false;
  $('see-empty').hidden = true;
  $('progress').textContent = '';
  $('chart-note').textContent = '';
  for (const id of ['chart', 'curve-chart', 'spectrum-table', 'curve-table', 'motion-result']) $(id).replaceChildren();
  describeTarget(state.target, null);
  await ensureInvestigation();
  if (session !== state.session) return;
  const steps = app.investigation?.state === 'ok' ? previewStepsOf(app.investigation.doc) : [];
  if (!steps.length) {
    showViewerEmpty(t('data.unavailableLong'));
    writeUrl();
    scrollToLinkedPanel();
    return;
  }
  await attachComposites(entry, steps);
  if (session !== state.session) return;
  state.previews = steps;
  const ids = new Set(steps.map((step) => step.id));
  const pair = (app.investigation.doc.comparisons ?? []).find((item) => ids.has(item.a) && ids.has(item.b));
  state.range = { from: pair?.a ?? steps[0].id, to: pair?.b ?? steps.at(-1).id, endpoints: true };
  state.position = Math.max(0, steps.findIndex((step) => step.id === state.range.from));
  applyPendingView();
  if (state.mode === 'diff') state.mode = 'blink';
  refreshModeButtons();
  renderDates();
  setPlaying(state.mode === 'blink' && !prefersReducedMotion());
  render();
  refreshPanels();
  writeUrl();
  scrollToLinkedPanel();
}

/** A link with panel=… scrolls there once the viewer above it has its final height. */
function scrollToLinkedPanel() {
  if (!app.scrollToPanel) return;
  app.scrollToPanel = false;
  if (app.panel !== 'see') setTimeout(() => setPanel(app.panel, { write: false, instant: true }), 0);
  else setPanel('see', { scroll: false, write: false });
}

function describeEntryOnly(entry) {
  $('object-name').textContent = entryName(entry);
  $('object-kind').textContent = kindLabel(entry.kind);
  $('object-coords').textContent = '';
  $('object-status').replaceChildren(chip(t(`role.${entry.role}`)), chip(t(`data.${entry.dataStatus}`)), chip(predictionLabel(entry)));
  $('loop-link-wrap').hidden = entry.key !== 'pluto';
  // No picture to look at (not available yet): no "watch the ring" caption.
  describePlain(entry, entry.kind, { picture: false });
  document.title = `${entryName(entry)} · ${t('site.title')}`;
}

function customTarget(ra, dec, fov) {
  return { name: t('inv.position', { ra: ra.toFixed(3), dec: dec.toFixed(3) }), ra, dec, pmra: 0, pmdec: 0, epoch: CUSTOM_EPOCH, kind: 'custom', fov };
}

/** Coordinates: a prepared field that contains them opens at once; anything else goes live (if allowed). */
function openPosition({ ra, dec, fov = null }, { push = true } = {}) {
  const covering = findCoveringTarget(app.allTargets, ra, dec);
  if (covering) {
    const off = separationDeg(ra, dec, covering.centre.ra, covering.centre.dec) > ONE_ARCSEC_DEG;
    openEntry(covering, { fov: fov ?? covering.fov, requested: off ? { ra, dec } : null, push });
    return;
  }
  app.entry = null;
  app.requested = { ra, dec };
  app.investigation = null;
  app.notices = app.keepNotices ? app.notices : [];
  app.keepNotices = false;
  renderNotices();
  showPage('investigate', { push });
  openTarget(customTarget(ra, dec, fov ?? DEFAULT_FOV), fov ?? DEFAULT_FOV).then(scrollToLinkedPanel);
}

/** View state from a link (band, mode, A/B, version), applied once the frames are in. */
function applyPendingView() {
  const pending = app.pending;
  app.pending = null;
  if (!pending) return;
  if (pending.v && pending.v !== dataVersion()) addNotice('note.version', { link: pending.v, current: dataVersion() });
  const steps = sequence();
  for (const [side, id] of [['from', pending.a], ['to', pending.b]]) {
    if (!id) continue;
    if (steps.some((step) => step.id === id)) state.range[side] = id;
    else addNotice('note.epochMissing', { id });
  }
  if (pending.band) setBand(pending.band, { write: false });
  if (pending.mode === 'diff' && !differenceAllowed()) {
    state.diffAsked = true;
  } else if (pending.mode) {
    state.mode = pending.mode;
  }
  refreshModeButtons();
}

/** Reads the address bar and shows what it asks for. */
function applyLocation({ push = false } = {}) {
  const route = parseRoute(location.search);
  app.embed = route.embed;
  document.body.classList.toggle('embed', route.embed);
  const resolved = resolveRoute(route, app.allTargets);
  app.notices = resolved.notes.slice();
  app.keepNotices = true;
  renderNotices();
  if (resolved.page !== 'investigate') {
    if (resolved.page === 'game' && route.round && route.round !== currentRoundId()) selectRound(route.round);
    if (resolved.page === 'learn' && (route.lesson ?? null) !== currentLearnView()) showLearn(route.lesson, { notify: false, focus: false });
    showPage(resolved.page, { push, focus: false });
    if (resolved.page === 'predictions') syncRevealFromUrl(route.trial, route.step);
    return;
  }
  app.panel = route.panel ?? 'see';
  app.scrollToPanel = true;
  app.pending = { band: route.band, mode: route.mode, a: route.a, b: route.b, v: route.v };
  const { open } = resolved;
  if (open.kind === 'target') {
    const entry = app.allTargets.find((item) => item.key === open.key);
    const off = route.ra !== null && entry.centre
      && separationDeg(route.ra, route.dec, entry.centre.ra, entry.centre.dec) > ONE_ARCSEC_DEG;
    openEntry(entry, { fov: open.fov, requested: off ? { ra: route.ra, dec: route.dec } : null, push });
  } else {
    openPosition({ ra: open.ra, dec: open.dec, fov: open.fov }, { push });
  }
}

/** The Share menu (task B17): Copy link and Copy embed code. */
function setShareMenu(open) {
  $('share-menu').hidden = !open;
  $('share-toggle').setAttribute('aria-expanded', String(open));
}

let copiedTimer = 0;
/** After a copy the Share button reads "Copied" for 2 seconds; the status line says the same to screen readers. */
function flashCopied() {
  clearTimeout(copiedTimer);
  $('share-toggle').textContent = t('inv.copiedShort');
  copiedTimer = setTimeout(() => { $('share-toggle').textContent = t('inv.share'); }, 2000);
}

async function share() {
  writeUrl();
  setShareMenu(false);
  $('embed-code').hidden = true;
  try {
    await navigator.clipboard.writeText(location.href);
    $('share-status').textContent = t('inv.copied');
    flashCopied();
  } catch {
    $('share-status').textContent = t('inv.copyFailed');
  }
}

/** Copies an <iframe> of this view in embed mode (viewer and See only). If copying fails, shows the code to copy by hand. */
async function copyEmbed() {
  const search = buildRoute({ ...routeState(), panel: null, embed: true, fixtures: false });
  const code = embedCode(new URL(`${location.pathname}${search}`, location.href).href, t('embed.frameTitle', { name: $('object-name').textContent }));
  const box = $('embed-code');
  box.value = code;
  setShareMenu(false);
  try {
    await navigator.clipboard.writeText(code);
    box.hidden = true;
    $('share-status').textContent = t('embed.copied');
    flashCopied();
  } catch {
    box.hidden = false;
    box.select();
    $('share-status').textContent = t('embed.copyFailed');
  }
}

// ---------- Search by name ----------

const displayName = (entry) => entry.name;

async function search(text) {
  const query = text.trim();
  if (!query) return;
  const coordinates = parseCoordinates(query);
  if (coordinates) {
    // The field size is chosen in Investigate (More tools); a search opens the default 6′ field (task B16).
    openPosition({ ...coordinates, fov: DEFAULT_FOV });
    return;
  }
  // Two numbers that are not valid coordinates: say so instead of searching for a name.
  if (/^[\d\s.,:+\-−hdms°′″'"]+$/i.test(query) && /\d/.test(query)) {
    $('search-input').setAttribute('aria-invalid', 'true');
    $('search-message').textContent = t('search.badCoords');
    return;
  }
  $('search-input').setAttribute('aria-invalid', 'false');
  const named = findByName(query, app.legacyPresets);
  if (named && (named.category ?? 'more') === 'more' && !api.liveAvailable()) {
    $('search-message').textContent = t('note.liveUnavailable');
    return;
  }
  if (named) {
    openNamed(named);
    return;
  }
  // Names outside the prepared list are looked up by the TENGER server, which the public static site does not have.
  if (!api.liveAvailable()) {
    $('search-message').textContent = t('note.liveUnavailable');
    return;
  }
  $('search-message').textContent = t('searchingName');
  try {
    const found = await api.resolveName(query);
    $('search-message').textContent = '';
    openPosition({ ra: found.ra, dec: found.dec });
  } catch (error) {
    $('search-message').textContent = error.status === 404 ? t('notFound') : error.message;
  }
}

function openNamed(found) {
  const entry = found.key ? app.allTargets.find((item) => item.key === found.key) : null;
  if (entry) {
    flyThen(entry.key, () => openEntry(entry));
    return;
  }
  const covering = findCoveringTarget(app.allTargets, found.ra, found.dec);
  if (covering) {
    openEntry(covering, { requested: { ra: found.ra, dec: found.dec } });
    return;
  }
  app.entry = null;
  app.requested = null;
  app.notices = [];
  renderNotices();
  showPage('investigate');
  const fov = found.fov ?? DEFAULT_FOV;
  openTarget({ pmra: 0, pmdec: 0, epoch: 2000, kind: 'custom', ...found, fov }, fov);
}

const SEARCH_GROUPS = ['stars', 'galaxies', 'nebulae', 'clusters', 'challenge'];

function searchRow(entry) {
  const thumb = app.thumbs.get(entry.key)?.frames?.[1];
  const row = el('button', { type: 'button', class: 'search-row' }, [
    thumb ? el('img', { src: `data/${entry.key}/${thumb.file}`, alt: '', loading: 'lazy' }) : null,
    el('span', {}, [
      el('strong', { text: entry.name }),
      el('small', { text: entry.key && has(`hook_${entry.key}`) ? t(`hook_${entry.key}`) : t('loadsLive') }),
    ]),
  ]);
  row.addEventListener('click', () => {
    closeSearchList();
    $('search-input').value = '';
    openNamed(entry);
  });
  return row;
}

function renderSearchList() {
  const matches = searchMatches($('search-input').value, app.legacyPresets);
  // Task B35: "More famous objects" load from the archive through our server, so the public site leaves them out.
  const groups = [...SEARCH_GROUPS, ...(api.liveAvailable() ? ['more'] : [])].flatMap((group) => {
    const members = matches.filter((entry) => (entry.category ?? 'more') === group);
    if (!members.length) return [];
    return [el('h3', { text: t(`category_${group}`) }), ...members.map(searchRow)];
  });
  // How to search (task B12): a tip at the top of the list while the box is empty. Screen readers hear the same
  // words with the box itself (aria-describedby="search-help"), so the copy here is hidden from them.
  const tip = $('search-input').value.trim() ? [] : [el('p', { class: 'search-list-tip', 'aria-hidden': 'true', text: t('search.help') })];
  $('search-list').replaceChildren(...tip, ...(groups.length ? groups : [el('p', { text: t('searchHint') })]));
  $('search-list').hidden = false;
}

function closeSearchList() {
  $('search-list').hidden = true;
}

function bindSearchList() {
  const input = $('search-input');
  input.addEventListener('focus', renderSearchList);
  input.addEventListener('input', renderSearchList);
  $('top-places').addEventListener('click', () => {
    closeMore();
    if (app.page !== 'home') showPage('home', { focus: false });
    app.homeScroll = 0;
    $('page-home').scrollTop = 0;
    input.value = '';
    input.focus();
    renderSearchList();
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search')) closeSearchList();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // An open dialog (shortcuts, limits, the reveal) takes Escape for itself.
    if (document.querySelector('dialog[open]')) return;
    closeSearchList();
    setMenu(false);
    // Escape closes the investigation panel (not while a form field or the full-screen viewer has it).
    const target = event.target instanceof Element ? event.target : null;
    if (app.page === 'investigate' && !app.embed && !document.fullscreenElement && !target?.closest('input, select, textarea')) showPage('home');
  });
}

// ---------- Real sky context (Aladin Lite, loaded on demand) ----------

/** The first screen's Planet X card (task B16): "4 to 7 magnitudes" comes from depth.json, read after the page has
 *  loaded (only that file: the game's pictures are not fetched on Home). Without it the card keeps its title. */
async function fillPlanetXCard() {
  const url = app.realSource?.url(DEPTH_PATH);
  if (!url) return;
  try {
    const response = await fetch(url);
    const glance = response.ok ? glanceOf(readDepth(await response.json())) : null;
    if (glance) {
      const line = t(glance.low === glance.high ? 'hero.planetxLineOne' : 'hero.planetxLine', { low: String(glance.low), high: String(glance.high) });
      $('hero-planetx-line').textContent = line;
      $('hero-planetx').title = line;
    }
  } catch {
    // The card still opens the Lab, which says what it can.
  }
}

/** "Guided tour and more" in the menu closes once one of its items is used. */
function closeMore() {
  $('nav-more').open = false;
  setMenu(false);
}

function toggleSkyPanel(wanted) {
  // Real sky picks positions to load live; the public static site cannot load them, so it never opens there (B16).
  if (!api.liveAvailable() || !document.getElementById('sky-panel')) return;
  const open = wanted ?? $('sky-panel').hidden;
  $('sky-panel').hidden = !open;
  $('sky-open').setAttribute('aria-expanded', String(open));
  if (open) openSkyContext();
}

async function openSkyContext() {
  if (app.sky) return;
  app.sky = 'loading';
  const sky = await createSky('sky', (ra, dec) => fillCoordinates(ra, dec));
  app.sky = sky;
  if (sky.unavailable) $('sky-message').textContent = t('sky.failed');
  else $('sky-message').textContent = '';
}

// ---------- Start ----------

function bindViewingTools() {
  $('speed').addEventListener('change', () => {
    state.speedMs = Number($('speed').value);
    if (state.playing) setPlaying(true);
  });
  // Contrast (task B23): display only, the same stretch for every date; kept in memory while the visitor moves
  // between targets. render() repaints the frame on screen; Blink keeps playing and paints each next frame with it.
  const setContrast = (value) => {
    state.contrast = value;
    $('contrast').value = String(value);
    $('contrast').setAttribute('aria-valuetext', t('contrast.value', { value: formatNumber(value, 1) }));
    render();
  };
  $('contrast').addEventListener('input', () => setContrast(Number($('contrast').value)));
  $('contrast-reset').addEventListener('click', () => setContrast(1));
  $('contrast').setAttribute('aria-valuetext', t('contrast.value', { value: formatNumber(1, 1) }));
  $('negative').addEventListener('change', () => {
    document.body.classList.toggle('negative', $('negative').checked);
  });
  $('fullscreen').addEventListener('click', () => {
    // The browser may refuse (an embed without allowfullscreen, or no user gesture): say so instead of failing.
    const request = document.fullscreenElement ? document.exitFullscreen() : $('plates').requestFullscreen?.();
    Promise.resolve(request).catch(() => addNotice('note.fullscreenRefused'));
  });
  $('save-image').addEventListener('click', savePlate);
}

function savePlate() {
  const label = $('plate-date').textContent.replace(/[^\p{L}\p{N}]+/gu, '-');
  el('a', { download: `tenger-${state.target?.key ?? 'sky'}-${label}.png`, href: $('plate').toDataURL('image/png') }).click();
}

/** localStorage, or null where reading it throws (blocked site data). */
function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const TOUR_READY_MS = 30000;
const TOUR_POLL_MS = 300;
let tourStep = 0;

/** What the guided tour may do: open a target, switch pages and viewer modes. It measures nothing. */
const tourActions = {
  render({ index, total, key, last }) {
    tourStep += 1;
    $('tour-step').textContent = t('tour.step', { n: String(index + 1), total: String(total) });
    $('tour-text').textContent = t(key);
    $('tour-next').textContent = t(last ? 'tour.finish' : 'tour.next');
  },
  showPage(page) {
    showPage(page, { focus: false });
    scrollTo(0, 0);
  },
  open(key) {
    const entry = app.allTargets.find((item) => item.key === key);
    if (!entry) return;
    app.panel = 'see';
    app.scrollToPanel = false;
    // Opening a target moves focus to its name; a keyboard user stepping through the tour keeps "Next".
    flyThen(key, () => {
      const keep = document.activeElement === $('tour-next');
      openEntry(entry);
      if (keep) $('tour-next').focus({ preventScroll: true });
    });
  },
  /** Runs `callback` once the opened target has two dates to compare, unless the tour has moved on. */
  whenReady(callback) {
    const step = tourStep;
    const started = Date.now();
    const poll = () => {
      if (step !== tourStep || !isTourRunning()) return;
      if (sequence().length >= 2) callback();
      else if (Date.now() - started < TOUR_READY_MS) setTimeout(poll, TOUR_POLL_MS);
    };
    poll();
  },
  /** Brings a "Watch the reveal" button into view when a checked trial has one (none before verification). */
  showReveal() {
    const step = tourStep;
    const started = Date.now();
    const poll = () => {
      if (step !== tourStep || !isTourRunning()) return;
      const button = document.querySelector('#page-predictions [data-reveal]');
      if (button) button.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      else if (!document.querySelector('#page-predictions .ledger-card') && Date.now() - started < TOUR_READY_MS) setTimeout(poll, TOUR_POLL_MS);
    };
    poll();
  },
  setMode: (mode) => setMode(mode),
  setPlaying,
  reducedMotion: prefersReducedMotion,
  started() {
    $('tour-bar').hidden = false;
    $('tour-start').textContent = t('tour.stop');
    $('tour-next').focus({ preventScroll: true });
  },
  finished() {
    tourStep += 1;
    const hadFocus = $('tour-bar').contains(document.activeElement);
    $('tour-bar').hidden = true;
    $('tour-start').textContent = t('tour.start');
    if (hadFocus) $('main').focus({ preventScroll: true });
  },
};

function bindControls() {
  bindSearchList();
  initHelp({ onOpen: () => setMenu(false) });
  $('tour-start').addEventListener('click', () => {
    closeMore();
    if (app.page !== 'home' && !isTourRunning()) showPage('home', { focus: false });
    runTour(tourActions, { storage: browserStorage() });
  });
  $('tour-next').addEventListener('click', nextTourStep);
  $('tour-stop').addEventListener('click', stopTour);
  bindViewingTools();
  $('menu-toggle').addEventListener('click', () => setMenu($('menu-toggle').getAttribute('aria-expanded') !== 'true'));
  bindFamous();
  // Real sky only where the local server runs: on github.io the button is removed and the map library never loads.
  if (api.liveAvailable()) {
    $('sky-open').addEventListener('click', () => {
      closeMore();
      if (app.page !== 'home') showPage('home', { focus: false });
      $('home-map').scrollIntoView({ block: 'start' });
      toggleSkyPanel(true);
    });
    $('sky-close').addEventListener('click', () => {
      toggleSkyPanel(false);
      $('sky-open').focus();
    });
  } else {
    $('sky-open').remove();
    $('sky-panel').remove();
  }
  // Planet X: the first screen's card and the menu item both open the Lab at its top (task B16).
  const openLab = (event) => {
    event?.preventDefault();
    app.notices = [];
    renderNotices();
    showPage('learn', { focus: false });
    showLearn('lab');
  };
  $('hero-planetx').addEventListener('click', openLab);
  $('nav-planetx').addEventListener('click', openLab);
  // The first screen's way in (task B16): Barnard's Star in Investigate, Blink playing AllWISE 2010 against the
  // newest SPHEREx picture (the default pair), without the 3D flight first.
  $('hero-watch').addEventListener('click', (event) => {
    event.preventDefault();
    const entry = findEntry('barnard');
    if (!entry) return;
    app.panel = 'see';
    app.scrollToPanel = false;
    setMode('blink');
    openEntry(entry);
  });
  $('search').addEventListener('submit', (event) => {
    event.preventDefault();
    closeSearchList();
    $('search-message').textContent = '';
    search($('search-input').value).catch((error) => {
      $('search-message').textContent = error.message;
    });
  });
  for (const link of document.querySelectorAll('[data-page-link]')) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      app.notices = [];
      renderNotices();
      showPage(link.dataset.pageLink);
    });
  }
  $('inv-back').addEventListener('click', () => showPage('home'));
  $('share-toggle').addEventListener('click', () => setShareMenu($('share-menu').hidden));
  document.addEventListener('click', (event) => {
    if (!$('share-menu').hidden && !event.target.closest('.inv-share')) setShareMenu(false);
  });
  // Escape closes the Share menu first (capture phase, before the page's own Escape closes the investigation).
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || $('share-menu').hidden) return;
    event.stopPropagation();
    setShareMenu(false);
    $('share-toggle').focus();
  }, true);
  $('share').addEventListener('click', share);
  $('embed-copy').addEventListener('click', copyEmbed);
  for (const button of document.querySelectorAll('.panel-nav button')) {
    button.addEventListener('click', () => setPanel(button.dataset.panel));
  }
  $('play').addEventListener('click', () => {
    if (state.mode !== 'blink') setMode('blink');
    setPlaying(!state.playing);
  });
  $('modes').addEventListener('click', (event) => {
    const mode = event.target.closest('button')?.dataset.mode;
    if (mode) setMode(mode);
  });
  $('composite').addEventListener('click', () => setBand({ kind: 'composite' }));
  $('colour-toggle').addEventListener('click', () => {
    state.colour = !state.colour;
    if (state.previews) renderDates();
    render();
  });
  $('band').addEventListener('input', () => setBand({ kind: 'channel', channel: Number($('band').value) }));
  $('fov').addEventListener('change', () => openTarget(state.target, Number($('fov').value)));
  $('gaia').addEventListener('change', toggleGaia);
  $('wise').addEventListener('change', toggleWise);
  $('flags').addEventListener('change', () => {
    state.excludeFlags = $('flags').checked;
    render();
  });
  $('swipe').addEventListener('input', () => setSwipe($('swipe').value));
  bindPlateGestures($('plate'));
  bindPlateGestures($('plate-b'));
  // The plate and time bar live in the stage, the rest of the viewer controls in the See section.
  $('observatory').addEventListener('keydown', onViewerKey);
  $('panel-see').addEventListener('keydown', onViewerKey);
  $('follow').addEventListener('click', openChooser);
  $('chooser-close').addEventListener('click', unlockCamera);
  $('range-from').addEventListener('change', () => setRange({ from: $('range-from').value }));
  $('range-to').addEventListener('change', () => setRange({ to: $('range-to').value }));
  $('swap').addEventListener('click', () => setRange({ from: state.range.to, to: state.range.from }));
  $('endpoints').addEventListener('click', () => setRange({ endpoints: !state.range.endpoints }));
  $('measure').addEventListener('click', measureMotion);

  addEventListener('popstate', () => applyLocation());
  let resizeTimer = null;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawStarfield();
      placeMapLabels();
    }, RESIZE_MS);
  });
}

const number = (value, digits = 2) =>
  new Intl.NumberFormat('en', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

/** Prepared thumbnails per key (only the thumbs field of the legacy results file; its numbers are not used). */
async function loadThumbs() {
  try {
    const results = await api.getResults();
    for (const result of results) if (result.thumbs) app.thumbs.set(result.key, result.thumbs);
  } catch {
    // Thumbnails are decoration; cards work without them.
  }
}

async function loadData() {
  const fixtures = parseRoute(location.search).fixtures;
  app.source = createSource({ fixtures });
  // Data-key text and reserved regions always come from real data, also in fixture mode.
  const real = fixtures ? createSource({ fixtures: false }) : app.source;
  const [presets, indexState, strings] = await Promise.all([
    api.getTargets(), app.source.index(), real.strings(), loadThumbs(), loadReserved(),
  ]);
  if (strings.state === 'ok') addMissingStrings(strings.doc.strings);
  app.legacyPresets = presets;
  app.indexState = indexState;
  const index = indexState.state === 'ok' ? indexState.doc : null;
  app.entries = buildTargets(index, presets);
  app.allTargets = [...app.entries, ...legacyPlaces(presets, app.entries)];
  const example = fixtures || Boolean(index?.example);
  $('example-banner').hidden = !example;
  document.body.classList.toggle('example-data', example);
  const [rounds, lessons, scoreboard] = await Promise.all([
    Promise.all((index?.game_rounds ?? []).map((path) => app.source.gameRound(path))),
    Promise.all((index?.lessons ?? []).map((path) => app.source.lesson(path))),
    app.source.scoreboard(index?.scoreboard_path),
  ]);
  app.scoreboard = scoreboard.state === 'ok' ? scoreboard.doc : null;
  const playable = rounds.filter((round) => round.state === 'ok');
  // Task B40: which round belongs to which trial, for the "Play" buttons.
  app.roundIds = playable.map((round) => ({ id: round.doc.round_id, trial: round.doc.trial_id }));
  const bundles = await Promise.all(playable.map((round) => app.source.trial(round.doc.trial_id)));
  renderGamePage({
    rounds: playable.map((round, index) => ({ doc: round.doc, bundle: bundles[index] })),
    skipped: rounds.filter((round) => round.state !== 'ok').map((round) => ({ path: round.path, reason: round.state })),
    fixtures,
    selected: parseRoute(location.search).round,
    nameOf: (key) => {
      const entry = key ? app.allTargets.find((item) => item.key === canonicalKey(key)) : null;
      return entry ? entryName(entry) : null;
    },
    imageUrl: (path) => app.source.url(path),
    scoreboardRow: (trialId) => app.scoreboard?.rows?.find((row) => row.trial_id === trialId) ?? null,
    onSelect: () => {
      if (app.page === 'game') writeUrl();
    },
  });
  // The exploratory Pluto post-mortem (V8) for Lesson 3; always the real file, never a fixture.
  const postmortem = fixtures ? null : await fetch(real.url(POSTMORTEM_PATH) ?? '').then((response) => (response.ok ? response.json() : null)).catch(() => null);
  app.realSource = real;
  // After the page has loaded and gone quiet, so the first screen paints first.
  const fillCard = () => (window.requestIdleCallback ?? ((callback) => setTimeout(callback, 200)))(() => fillPlanetXCard(), { timeout: 3000 });
  if (document.readyState === 'complete') fillCard();
  else addEventListener('load', fillCard, { once: true });
  initLearn({
    records: lessons,
    scoreboard: app.scoreboard,
    postmortem: readPostmortem(postmortem),
    nameOf: (key) => {
      const entry = key ? app.allTargets.find((item) => item.key === canonicalKey(key)) : null;
      return entry ? entryName(entry) : null;
    },
    onNavigate: () => {
      if (app.page === 'learn') writeUrl();
    },
  });
  showLearn(parseRoute(location.search).lesson, { notify: false, focus: false });
  delete $('page-learn').dataset.loading;
  // Predictions: real trial files as soon as the real index lists any; until then the labelled fixtures.
  const realIndex = fixtures ? await real.index() : indexState;
  const fallback = !fixtures && !hasPublishedTrials(realIndex);
  // "How it works" (task B30): real files only; its links to other pages switch the page in place.
  initMethod({
    nameOf: (key) => {
      const entry = key ? app.allTargets.find((item) => item.key === canonicalKey(key)) : null;
      return entry ? entryName(entry) : key;
    },
    onNavigate: (href) => {
      history.pushState(null, '', href);
      applyLocation();
    },
  });
  initLedger({
    source: fallback ? createSource({ fixtures: true }) : app.source,
    fallback,
    fixtures,
    nameOf: (key) => {
      const entry = key ? app.allTargets.find((item) => item.key === canonicalKey(key)) : null;
      return entry ? entryName(entry) : key;
    },
    investigateHref: (key) => buildRoute({ page: 'investigate', target: key, fixtures }),
    onChange: ({ push = false } = {}) => {
      if (app.page === 'predictions') writeUrl({ push });
    },
    onMissingTrial: (id) => addNotice('note.trialMissing', { id }),
    loadBatch: ensureBatch,
  });
}

/** Index thumbnails (V3.2) when the index lists them; otherwise the prepared legacy pair. */
function thumbsOf(entry) {
  const listed = (entry.thumbnails ?? []).map((thumb) => ({ ...thumb, src: app.source.url(thumb.path) })).filter((thumb) => thumb.src);
  if (listed.length) {
    return {
      kind: 'index',
      frames: listed.slice(0, 2).map((thumb) => ({
        src: thumb.src,
        label: thumb.time_utc ? String(thumb.time_utc).slice(0, 10) : '',
      })),
    };
  }
  return app.thumbs.get(entry.key) ?? null;
}

/**
 * Planet X files (V12): the measured depth file and the hidden-planet pairs, real ones else the labelled
 * examples. Loaded only when Beat the physics or Learn opens, so other pages never fetch them.
 */
let planetxLoad = null;
function ensurePlanetX() {
  if (!app.realSource) return null;
  if (!planetxLoad) {
    planetxLoad = loadPlanetX(app.realSource, createSource({ fixtures: true })).then((data) => {
      renderHiddenRound($('hidden-round'), data);
      setPlanetX(data);
      return data;
    });
  }
  return planetxLoad;
}

/**
 * The asteroid batch (task B6): the real batch when the real index lists one (batch_paths); the invented example
 * only in ?fixtures=1 mode, so a test scoreboard never shows on the public page. Loaded when Predictions or Learn opens.
 */
let batchLoad = null;
function ensureBatch() {
  if (!app.realSource) return null;
  if (!batchLoad) {
    const fixtures = Boolean(parseRoute(location.search).fixtures);
    batchLoad = loadBatch({ real: app.realSource, fixtures: createSource({ fixtures: true }), allowExample: fixtures }).catch(() => null);
  }
  return batchLoad;
}

// ---------- Famous targets (task B29) ----------

let famousOpen = null;

/** A card (or a target's 3D label): the camera flies there, the card is highlighted and the popup opens. */
function selectFamous(entry) {
  famousOpen = entry;
  for (const card of document.querySelectorAll('.famous-card')) card.setAttribute('aria-pressed', String(card.dataset.key === entry.key));
  $('pop-thumb').replaceChildren(famousThumb(entry, thumbsOf(entry)));
  $('pop-name').textContent = entryName(entry);
  if (entry.role === 'place') {
    // Task B35: a "More to explore" object has pictures and no trial; the popup says so first.
    $('pop-line').textContent = t('explore.picturesOnly');
    $('pop-status').textContent = has(`hook_${entry.key}`) ? t(`hook_${entry.key}`) : '';
  } else {
    $('pop-line').textContent = famousLineOf(entry, app.scoreboard);
    // The result in plain words with the trial type, from scoreboard.json (task B29g).
    $('pop-status').textContent = famousResultOf(entry, app.scoreboard).popup;
  }
  const see = $('pop-see');
  see.disabled = !isOpenable(entry);
  see.textContent = t(isOpenable(entry) ? 'famous.see' : 'famous.notReady');
  $('target-pop').hidden = false;
  syncPlayButtons();
  selectTarget(entry.key);
  (see.disabled ? $('pop-close') : see).focus({ preventScroll: true });
}

/** Closes the popup; the camera returns to the whole view and the motion resumes. quiet: no focus move. */
function closeFamous({ quiet = false, home = true } = {}) {
  if (!famousOpen) return;
  const key = famousOpen.key;
  const hadFocus = $('target-pop').contains(document.activeElement);
  famousOpen = null;
  $('target-pop').hidden = true;
  for (const card of document.querySelectorAll('.famous-card')) card.setAttribute('aria-pressed', 'false');
  if (home) releaseTarget();
  if (hadFocus && !quiet) document.querySelector(`.famous-card[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
}

/** The type filter's groups (task B29), from each target's kind in the data files. */
const FILTERS = [
  ['all', () => true],
  ['stars', (entry) => entry.kind === 'faststar' || entry.kind === 'star'],
  ['browndwarfs', (entry) => entry.kind === 'browndwarf'],
  ['variables', (entry) => entry.kind === 'variable'],
  ['solar', (entry) => colourOf(entry.kind) === 'solar'],
];

/** The filter chips above the rail (only groups with members) and the hint over the scene; after the data load. */
function renderFamousExtras() {
  const famous = famousEntries(app.entries);
  const targets = new Set(famous.map((entry) => entry.key));
  const choose = (name, test) => {
    const keys = name === 'all' ? null : new Set(famous.filter(test).map((entry) => entry.key));
    for (const chipButton of $('famous-filters').children) chipButton.setAttribute('aria-pressed', String(chipButton.dataset.filter === name));
    for (const card of document.querySelectorAll('.famous-card')) card.classList.toggle('is-dim', Boolean(keys) && !keys.has(card.dataset.key));
    setFilter(keys, targets);
    $('famous-filter-status').textContent = keys
      ? t('filter.status', { filter: t(`filter.${name}`), count: String(keys.size), total: String(famous.length) })
      : t('filter.statusAll', { total: String(famous.length) });
  };
  $('famous-filters').replaceChildren(...FILTERS.filter(([name, test]) => name === 'all' || famous.some(test)).map(([name, test]) => el('button', {
    type: 'button', class: 'filter-chip', 'data-filter': name, 'aria-pressed': String(name === 'all'), text: t(`filter.${name}`),
    onclick: () => choose(name, test),
  })));
  // The hint (task B29): the wide or the phone wording; it fades after the first interaction and returns on reload.
  const hint = $('space-hint');
  const wording = () => t(matchMedia('(max-width: 900px)').matches ? 'hint.phone' : 'hint.wide', { n: String(famous.length) });
  hint.textContent = wording();
  hint.hidden = false;
  matchMedia('(max-width: 900px)').addEventListener('change', () => { hint.textContent = wording(); });
  const fade = () => {
    hint.classList.add('is-gone');
    for (const name of ['pointerdown', 'wheel', 'touchstart', 'keydown']) $('home-map').removeEventListener(name, fade);
  };
  for (const name of ['pointerdown', 'wheel', 'touchstart', 'keydown']) $('home-map').addEventListener(name, fade, { passive: true });
}

/** Task B35: "More to explore" sits in the rail on wide screens (it scrolls) and below the first screen on phones. */
const PHONE_LAYOUT = '(max-width: 900px)';
function placeExplore() {
  const section = $('explore-more');
  if (matchMedia(PHONE_LAYOUT).matches) {
    if (section.parentElement !== $('page-home')) $('home-map').after(section);
  } else if (section.parentElement !== $('famous')) $('famous').insertBefore(section, document.querySelector('.famous-foot'));
}

/** Task B40: the game round whose trial is this target's (barnard-position, epsindib-position, pluto-position). */
function roundFor(entry) {
  if (!entry) return null;
  return app.roundIds?.find((round) => entry.prediction?.trialIds?.includes(round.trial)) ?? null;
}

/** Opens that round in Easy mode; the browser's Back returns to where the visitor was. */
function playRoundFor(entry) {
  const round = roundFor(entry);
  if (!round) return;
  showPage('game');
  selectRound(round.id);
  const easy = document.getElementById('mode-easy');
  if (easy && easy.getAttribute('aria-pressed') !== 'true' && !easy.disabled) easy.click();
}

/** Shows or hides the "Play" buttons for the current popup target and the open investigation. */
function syncPlayButtons() {
  $('pop-play').hidden = !roundFor(famousOpen);
  const changed = roundFor(app.entry);
  document.querySelector('.changed-play').hidden = !changed;
}

/** Task B36: the all-sky Sky map, loaded on first use; markers open Investigate; Close returns to Home. */
let skymapOpener = null;
async function showSkyMap(event) {
  const opener = event?.currentTarget ?? $('skymap-open');
  skymapOpener = opener;
  setScenePaused(true);
  const { openSkyMap } = await import('./skymap.js');
  const famous = famousEntries(app.entries);
  const places = app.allTargets.filter((entry) => entry.role === 'place');
  const fixed = [...famous, ...places].filter((entry) => Number.isFinite(entry.centre?.ra) && Number.isFinite(entry.centre?.dec))
    .map((entry) => ({ key: entry.key, name: entryName(entry), ra: entry.centre.ra, dec: entry.centre.dec, colour: famous.includes(entry) ? entry.colour : 'other' }));
  // Moving targets (Pluto, Makemake, 3I/ATLAS) have no fixed place: they are marked where our latest SPHEREx picture
  // of them was centred (its JPL Horizons position, from the investigation file), with that date in the label.
  const moving = await Promise.all(famous.filter((entry) => !fixed.some((marker) => marker.key === entry.key) && entry.investigationPath).map(async (entry) => {
    const doc = await fetch(`data/${entry.investigationPath}`).then((response) => (response.ok ? response.json() : null)).catch(() => null);
    const last = (doc?.observations ?? []).filter((item) => Number.isFinite(item.centre?.ra_deg) && Number.isFinite(item.centre?.dec_deg)).sort((a, b) => a.t_start_mjd - b.t_start_mjd).at(-1);
    if (!last) return null;
    const date = formatUtc(new Date((last.t_start_mjd - 40587) * 86400000), { time: false });
    return { key: entry.key, name: t('skymap.movingLabel', { name: entryName(entry), date }), ra: last.centre.ra_deg, dec: last.centre.dec_deg, colour: entry.colour };
  }));
  const markers = [...fixed, ...moving.filter(Boolean)];
  await openSkyMap({
    markers,
    focus: famousOpen?.key ?? app.entry?.key ?? 'barnard',
    onOpen: (key) => {
      const entry = findEntry(key);
      setScenePaused(false);
      if (!entry) return;
      app.panel = 'see';
      app.scrollToPanel = false;
      setMode('blink');
      openEntry(entry);
    },
    onClose: () => {
      setScenePaused(false);
      if (document.body.dataset.page === 'home') skymapOpener?.focus({ preventScroll: true });
    },
  });
}

function bindFamous() {
  matchMedia(PHONE_LAYOUT).addEventListener('change', placeExplore);
  $('skymap-open').addEventListener('click', showSkyMap);
  $('skymap-open-phone').addEventListener('click', showSkyMap);
  // Task B40: the target's round of Beat the physics, in Easy mode, from the popup and from What changed.
  $('pop-play').addEventListener('click', () => playRoundFor(famousOpen));
  $('changed-play').addEventListener('click', () => playRoundFor(app.entry));
  $('skymap-lines').addEventListener('click', async () => {
    const on = $('skymap-lines').getAttribute('aria-checked') !== 'true';
    const { setConstellationLines } = await import('./skymap.js');
    if (await setConstellationLines(on)) $('skymap-lines').setAttribute('aria-checked', String(on));
  });
  // The Key's layer switches (task B29): each shows or hides one layer of the 3D scene at once.
  for (const button of document.querySelectorAll('#key-layers [data-layer]')) {
    button.addEventListener('click', () => {
      const on = button.getAttribute('aria-checked') !== 'true';
      button.setAttribute('aria-checked', String(on));
      setLayer(button.dataset.layer, on);
    });
  }
  // Phones: the scene's chip and Key sit just above the target row, whose height this tracks.
  new ResizeObserver(() => $('home-map').style.setProperty('--famous-h', `${$('famous').offsetHeight}px`)).observe($('famous'));
  $('pop-close').addEventListener('click', () => closeFamous());
  $('pop-see').addEventListener('click', () => {
    const entry = famousOpen;
    if (!entry || !isOpenable(entry)) return;
    // Investigate opens over the scene (which pauses); Back returns to the whole view (space-ui onHome).
    $('target-pop').hidden = true;
    app.panel = 'see';
    app.scrollToPanel = false;
    setMode('blink');
    openEntry(entry);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !famousOpen || document.body.dataset.page !== 'home' || document.querySelector('dialog[open]')) return;
    event.stopPropagation();
    closeFamous();
  }, true);
  // The header search closes once a search runs or Esc is pressed inside it.
  $('head-search').addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('head-search').open) {
      event.stopPropagation();
      $('head-search').open = false;
      $('head-search').querySelector('summary').focus();
    }
  });
  $('head-search').addEventListener('toggle', () => {
    if ($('head-search').open) $('search-input').focus({ preventScroll: true });
  });
}

/** From Home: in the 3D view the camera flies to the target first, then its investigation opens. */
function openFromHome(entry) {
  flyThen(entry.key, () => {
    app.panel = 'see';
    app.scrollToPanel = false;
    openEntry(entry);
  });
}

const findEntry = (key) => app.allTargets.find((item) => item.key === key) ?? null;

function startSpace() {
  initSpace({
    embed: app.embed,
    entries: () => app.entries,
    nameOf: (key) => (findEntry(key) ? entryName(findEntry(key)) : null),
    nameOfEntry: entryName,
    distanceOf: (star) => formatDistance({ value: star.distance_pc, unit: 'pc' }),
    // Wide screens (task B29): the Famous targets rail covers the right of the scene; the Sun is centred in the rest
    // (a negative inset is a covered strip on the right).
    insetLeft: () => (matchMedia('(min-width: 901px)').matches
      ? -Math.max(0, $('space3d').getBoundingClientRect().right - $('famous').getBoundingClientRect().left)
      : 0),
    // A target's label or body: the camera flies there and its popup opens (task B29); any other body is only flown to.
    onPick: (key) => {
      const entry = findEntry(key);
      if (!entry || !isOpenable(entry)) return false;
      selectFamous(entry);
      return true;
    },
    // A click on empty space closes the popup and returns the camera to the whole view.
    onEmpty: () => closeFamous(),
    // Back from an investigation: the popup is gone and the camera returns to the whole view.
    onHome: () => closeFamous({ quiet: true }),
  });
}

/**
 * Before the data load: shows the section the address asks for (Predictions, Beat the physics, Learn, About),
 * so the first visible paint is already the right page. applyLocation() later does the full switch.
 */
function showInitialPage() {
  const { page } = parseRoute(location.search);
  if (page && page !== 'home' && page !== 'investigate') {
    for (const name of PAGES) $(`page-${name}`).hidden = name !== page;
    document.body.dataset.page = page;
  }
  document.body.classList.add('booted');
}

async function start() {
  // Task B32: data files carry the build version, like the modules and stylesheets (index.html's import map).
  installVersionedFetch();
  applyTranslations();
  document.title = `${t('site.title')} · ${t('home.title')}`;
  showInitialPage();
  buildBandScale();
  buildArrays();
  buildColourStep();
  buildFovOptions($('fov'));
  drawStarfield();
  // The Key starts closed (task B29: a calmer first screen; the "Schematic · not to scale" chip stays on screen).
  $('map-key').open = false;
  bindControls();
  setPressed($('modes'), 'mode', 'blink');
  $('composite').setAttribute('aria-pressed', 'true');
  $('play').textContent = t('play');
  refreshFollowUi();
  renderAbout();
  await loadData();
  renderHome({
    entries: app.entries,
    indexLoaded: app.indexState?.state === 'ok',
    thumbsOf,
    onOpen: openFromHome,
    onSelect: (entry) => selectFamous(entry),
    board: app.scoreboard,
  });
  renderFamousExtras();
  // Task B35: more prepared objects, pictures only (all 17 open on the public site: checked on a github.io build).
  renderExplore(app.allTargets.filter((entry) => entry.role === 'place'), thumbsOf, (entry) => selectFamous(entry));
  placeExplore();
  delete $('page-home').dataset.loading;
  renderReserved((key) => (findEntry(key) ? entryName(findEntry(key)) : null));
  startSpace();
  startBlinking();
  applyLocation();
  if (app.page === 'home' || app.page === 'investigate') homeShown();
  // Task B29: the guided tour no longer starts by itself; the hint over the Solar System guides a first visit, and
  // the tour stays under More ("Guided tour").
}

start().catch((error) => {
  document.body.classList.add('booted');
  for (const id of ['page-home', 'page-learn']) delete $(id).dataset.loading;
  $('caption').hidden = false;
  $('caption').textContent = error.message;
});
