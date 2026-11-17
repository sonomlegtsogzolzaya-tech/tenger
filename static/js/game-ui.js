// Beat the physics: one round at a time, built from a game record (DATA-CONTRACT §11) and its trial.
// The player places a guess (tap, arrow keys or numbers), then the page reveals, in this order,
// the straight-line baseline, the frozen model with its region, and the real observation.
import { covarianceEllipse } from './coords.js';
import { $, chip, dataTable, details, el, formatNumber, formatUtc, withUnit } from './dom.js';
import {
  checkRound, dateClusters, DIFFICULTY_ORDER, errorUnit, fromOffset, isMagnitude, lastMeasurement, physicsLost, readBest, revealView, roundDifficulty,
  roundKind, roundStars, roundType, saveBest, scalarView, scaleBarArcsec, scoreRound, ticks, toOffset,
} from './game.js';
import { gameSkyPanel } from './game-sky.js';
import { angleText, clusterDate, explainResult, HINT_COUNT, hintBody, hintOverlay, howToBox, timelineStrip, wordDate } from './game-help.js';
import { has, t } from './i18n.js';
import { challengeOutcome, challengeUrl, NAME_MAX, readChallenge, starText } from './challenge.js';
import { categoryChip, categoryNote, exampleChip, prospectiveChip, trialStatusChip } from './labels.js';
import { mjdToDate } from './stack.js';

const SIZE = 400;
const PAD = 46;
const INNER = SIZE - 2 * PAD;
const STEPS_PER_VIEW = 40;
const FAST_STEP = 5;
const STAGES = ['guess', 'locked', 'baseline', 'model', 'actual'];
const NEXT_LABEL = { locked: 'game.showBaseline', baseline: 'game.showModel', model: 'game.showActual' };
const FROM_ARCSEC = { arcsec: 1, arcmin: 1 / 60, deg: 1 / 3600 };
const SVG_NS = 'http://www.w3.org/2000/svg';
const ARROW_ID = 'track-head';

/** Everything the page needs, set by main.js. */
let context = null;
/** The round being played. */
let play = null;
/** Task B20: Easy mode (on by default) draws the track's arrowhead and hints 1–2 without being asked. */
let easyMode = true;
/** The automatic reveal after "Check my guess": straight line, then the model, then the real position. */
let revealTimer = null;
/** Task B24: the challenge read from the page's link (validated; never stored), or null. */
let challenge = null;
const REVEAL_STEP_MS = 700;

const storage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

function svg(name, attributes = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

/** An SVG group holding child nodes (svg() takes text, not children). */
function group(attributes, children) {
  const node = svg('g', attributes);
  node.append(...children);
  return node;
}

const dateOf = (mjd) => formatUtc(mjdToDate(mjd), { time: false });
const displayFactor = (round) => (roundKind(round) === 'position' ? FROM_ARCSEC[errorUnit(round)] ?? 1 : 1);

// ---------- Marker shapes (shared by the plot and its legend) ----------

function marker(who, x, y) {
  const group = svg('g', { class: `mark mark-${who}` });
  if (who === 'training') group.append(svg('circle', { cx: x, cy: y, r: 4.5 }));
  if (who === 'player') group.append(svg('circle', { cx: x, cy: y, r: 9 }), svg('circle', { cx: x, cy: y, r: 2 }));
  if (who === 'baseline') group.append(svg('rect', { x: x - 6, y: y - 6, width: 12, height: 12 }));
  if (who === 'model') group.append(svg('path', { d: `M${x} ${y - 8}L${x + 8} ${y}L${x} ${y + 8}L${x - 8} ${y}Z` }));
  if (who === 'actual') group.append(svg('path', { d: `M${x - 7} ${y - 7}L${x + 7} ${y + 7}M${x + 7} ${y - 7}L${x - 7} ${y + 7}` }));
  return group;
}

function legendIcon(who) {
  const icon = svg('svg', { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true', class: 'legend-icon' });
  if (who === 'region') icon.append(svg('ellipse', { cx: 12, cy: 12, rx: 10, ry: 6, class: 'region' }));
  else icon.append(marker(who, 12, 12));
  return icon;
}

// ---------- Geometry ----------

function revealedParts() {
  const index = STAGES.indexOf(play.stage);
  return ['baseline', 'model', 'actual'].filter((part) => index >= STAGES.indexOf(part));
}

/**
 * Position rounds are drawn in offsets from the last training measurement (east left, north up). Before the reveal
 * the view comes only from the training points (game.js guessView); afterwards it may widen to show everything.
 */
function positionGeometry() {
  const { round } = play;
  const origin = lastMeasurement(round);
  const shown = revealedParts().map((part) => round[part]);
  if (play.stage !== 'guess' && play.guess) shown.push(play.guess);
  const view = revealView(round, shown);
  const span = view.east[1] - view.east[0];
  const offsetToPlot = (offset) => ({
    x: PAD + ((view.east[1] - offset.east) / span) * INNER,
    y: PAD + ((view.north[1] - offset.north) / span) * INNER,
  });
  return {
    view,
    span,
    origin,
    offsetToPlot,
    toPlot: (point) => offsetToPlot(toOffset(origin, point)),
    fromPlot: (x, y) => fromOffset(origin, {
      east: view.east[1] - ((x - PAD) / INNER) * span,
      north: view.north[1] - ((y - PAD) / INNER) * span,
    }),
  };
}

function scalarGeometry() {
  const { round } = play;
  const view = scalarView(round, revealedParts().map((part) => round[part]));
  const inverted = isMagnitude(round.units);
  const timeSpan = view.time[1] - view.time[0];
  const valueSpan = view.value[1] - view.value[0];
  const yOf = (value) => (inverted
    ? PAD + ((value - view.value[0]) / valueSpan) * INNER
    : PAD + ((view.value[1] - value) / valueSpan) * INNER);
  return {
    view,
    span: valueSpan,
    xOf: (mjd) => PAD + ((mjd - view.time[0]) / timeSpan) * INNER,
    yOf,
    toPlot: (point, mjd = round.reveal_t_mjd) => ({ x: PAD + ((mjd - view.time[0]) / timeSpan) * INNER, y: yOf(point.value) }),
    fromPlot: (_x, y) => ({
      value: inverted ? view.value[0] + ((y - PAD) / INNER) * valueSpan : view.value[1] - ((y - PAD) / INNER) * valueSpan,
    }),
  };
}

const geometry = () => (play.kind === 'position' ? positionGeometry() : scalarGeometry());

// ---------- Plot ----------

function drawAxes(plot, geo) {
  const { round } = play;
  const factor = displayFactor(round);
  if (play.kind === 'position') {
    // Task B20: a faint grid, a compass (N up, E left) and a scale bar in arcseconds instead of axis titles.
    for (const tick of ticks(geo.view.east[0] * factor, geo.view.east[1] * factor)) {
      const { x } = geo.offsetToPlot({ east: tick / factor, north: geo.view.north[0] });
      plot.append(svg('line', { x1: x, x2: x, y1: PAD, y2: SIZE - PAD, class: 'grid' }));
    }
    for (const tick of ticks(geo.view.north[0] * factor, geo.view.north[1] * factor)) {
      const { y } = geo.offsetToPlot({ east: geo.view.east[0], north: tick / factor });
      plot.append(svg('line', { x1: PAD, x2: SIZE - PAD, y1: y, y2: y, class: 'grid' }));
    }
    const cx = SIZE - 22;
    const cy = 30;
    plot.append(group({ class: 'game-compass', 'aria-hidden': 'true' }, [
      svg('line', { x1: cx, y1: cy + 14, x2: cx, y2: cy - 6 }), svg('line', { x1: cx, y1: cy + 14, x2: cx - 20, y2: cy + 14 }),
      svg('text', { x: cx, y: cy - 10, 'text-anchor': 'middle' }, t('game.compassN')),
      svg('text', { x: cx - 30, y: cy + 18, 'text-anchor': 'middle' }, t('game.compassE')),
    ]));
    const length = scaleBarArcsec(geo.span);
    if (length) {
      const pixels = (length / geo.span) * INNER;
      const y = SIZE - 16;
      plot.append(group({ class: 'game-scale' }, [
        svg('line', { x1: PAD, x2: PAD + pixels, y1: y, y2: y }),
        svg('text', { x: PAD + pixels + 8, y: y + 4 }, t('game.scaleBar', { length: `${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(length)}″` })),
      ]));
    }
    return;
  }
  for (const tick of ticks(geo.view.time[0], geo.view.time[1], 4)) {
    const x = geo.xOf(tick);
    plot.append(svg('line', { x1: x, x2: x, y1: PAD, y2: SIZE - PAD, class: 'grid' }));
    plot.append(svg('text', { x, y: SIZE - PAD + 16, class: 'tick', 'text-anchor': 'middle' }, formatUtc(mjdToDate(tick), { time: false }).slice(0, 7)));
  }
  for (const tick of ticks(geo.view.value[0], geo.view.value[1])) {
    const y = geo.yOf(tick);
    plot.append(svg('line', { x1: PAD, x2: SIZE - PAD, y1: y, y2: y, class: 'grid' }));
    plot.append(svg('text', { x: PAD - 6, y: y + 4, class: 'tick', 'text-anchor': 'end' }, formatNumber(tick, 1)));
  }
  plot.append(svg('text', { x: 6, y: PAD - 14, class: 'axis' }, t(isMagnitude(round.units) ? 'game.axisMag' : 'game.axisValue', { unit: has(`unit.${round.units}`) ? t(`unit.${round.units}`) : (round.units ?? '') })));
  const revealX = geo.xOf(round.reveal_t_mjd);
  plot.append(svg('line', { x1: revealX, x2: revealX, y1: PAD, y2: SIZE - PAD, class: 'reveal-line' }));
  plot.append(svg('text', { x: revealX - 4, y: PAD - 4, class: 'axis', 'text-anchor': 'end' }, t('game.revealDate', { date: dateOf(round.reveal_t_mjd) })));
}

function drawRegion(plot, geo) {
  const { round, bundle } = play;
  if (play.kind === 'position') {
    const cov = bundle?.prediction?.doc?.model?.cov_arcsec2;
    const d2 = round.model.region_d2 ?? bundle?.trial?.doc?.scoring?.threshold_d2;
    const ellipse = cov && Number.isFinite(d2) ? covarianceEllipse(cov, d2) : null;
    if (!ellipse) return false;
    const centre = geo.toPlot(round.model);
    const scale = INNER / geo.span;
    plot.append(svg('ellipse', {
      cx: centre.x, cy: centre.y, rx: ellipse.major * scale, ry: ellipse.minor * scale,
      transform: `rotate(${ellipse.angleDeg} ${centre.x} ${centre.y})`, class: 'region',
    }));
    return true;
  }
  const sigma = round.model.sigma ?? bundle?.prediction?.doc?.model?.sigma;
  const z = bundle?.trial?.doc?.scoring?.z_max;
  if (!Number.isFinite(sigma) || !Number.isFinite(z)) return false;
  const x = geo.xOf(round.reveal_t_mjd);
  const top = geo.yOf(round.model.value - z * sigma);
  const bottom = geo.yOf(round.model.value + z * sigma);
  plot.append(svg('rect', { x: x - 8, y: Math.min(top, bottom), width: 16, height: Math.abs(bottom - top), class: 'region' }));
  return true;
}

function drawPlot() {
  const { round } = play;
  const geo = geometry();
  play.geo = geo;
  const plot = svg('svg', {
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    class: 'game-plot',
    tabindex: play.stage === 'guess' ? 0 : -1,
    role: 'application',
    'aria-label': t(play.kind === 'position' ? 'game.plotPosition' : 'game.plotScalar'),
    'aria-describedby': 'round-task game-keys',
  });
  plot.append(svg('rect', { x: PAD, y: PAD, width: INNER, height: INNER, class: 'plot-area' }));
  drawAxes(plot, geo);
  const training = [...round.training_points].sort((a, b) => a.t_mjd - b.t_mjd);
  const trainingXY = training.map((point) => (play.kind === 'position' ? geo.toPlot(point) : geo.toPlot(point, point.t_mjd)));
  if (easyMode && play.kind === 'position') {
    const head = svg('marker', { id: ARROW_ID, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse' });
    head.append(svg('path', { d: 'M0,0L10,5L0,10Z', class: 'track-head' }));
    const defs = svg('defs');
    defs.append(head);
    plot.append(defs);
  }
  plot.append(svg('polyline', {
    points: trainingXY.map(({ x, y }) => `${x},${y}`).join(' '), class: `track${easyMode ? ' track-easy' : ''}`,
    'marker-end': easyMode && play.kind === 'position' ? `url(#${ARROW_ID})` : null,
  }));
  trainingXY.forEach(({ x, y }) => plot.append(marker('training', x, y)));
  // Every group of dots (one SPHEREx visit) carries its dates.
  for (const cluster of dateClusters(round)) {
    const { x, y } = play.kind === 'position' ? geo.offsetToPlot(cluster.centre) : geo.toPlot({ value: cluster.value }, cluster.time);
    const right = x < SIZE - PAD - 120;
    plot.append(svg('text', { x: right ? x + 10 : x - 10, y: y - 10, class: 'point-label', 'text-anchor': right ? 'start' : 'end' }, clusterDate(cluster)));
  }
  if (play.kind === 'position' && play.hints) plot.append(...hintOverlay(round, play.hints, geo));
  const parts = revealedParts();
  const last = trainingXY.at(-1);
  if (parts.includes('baseline')) {
    const point = geo.toPlot(round.baseline);
    plot.append(svg('line', { x1: last.x, y1: last.y, x2: point.x, y2: point.y, class: 'baseline-line' }));
  }
  if (parts.includes('model')) play.regionShown = drawRegion(plot, geo);
  if (parts.includes('actual')) {
    const actual = geo.toPlot(round.actual);
    for (const who of ['player', 'baseline', 'model']) {
      const from = geo.toPlot(who === 'player' ? play.guess : round[who]);
      plot.append(svg('line', { x1: from.x, y1: from.y, x2: actual.x, y2: actual.y, class: `error-line error-${who}` }));
    }
  }
  for (const part of parts) {
    const { x, y } = geo.toPlot(round[part]);
    plot.append(marker(part, x, y));
  }
  if (play.guess) {
    const { x, y } = geo.toPlot(play.guess);
    plot.append(marker('player', Math.min(SIZE - 4, Math.max(4, x)), Math.min(SIZE - 4, Math.max(4, y))));
  }
  bindPlot(plot);
  $('round-plot').replaceChildren(plot);
}

// ---------- Guessing ----------

/** focusPlot: keep keyboard focus on the plot, which is redrawn (only for taps and arrow keys on it). */
function setGuess(point, { announce = true, focusPlot = false } = {}) {
  if (play.stage !== 'guess') return;
  play.guess = point;
  syncInputs();
  drawPlot();
  $('lock-guess').disabled = false;
  if (announce) $('round-status').textContent = guessText();
  if (focusPlot) $('round-plot').querySelector('svg')?.focus({ preventScroll: true });
}

function guessText() {
  if (!play.guess) return '';
  const factor = displayFactor(play.round);
  const unit = errorUnit(play.round);
  if (play.kind === 'position') {
    const offset = toOffset(lastMeasurement(play.round), play.guess);
    return t('game.guessPosition', { east: withUnit(offset.east * factor, unit), north: withUnit(offset.north * factor, unit) });
  }
  return t('game.guessValue', { value: withUnit(play.guess.value, play.round.units) });
}

function bindPlot(plot) {
  if (play.stage !== 'guess') return;
  plot.addEventListener('click', (event) => {
    const matrix = plot.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const x = Math.min(SIZE - PAD, Math.max(PAD, point.x));
    const y = Math.min(SIZE - PAD, Math.max(PAD, point.y));
    setGuess(play.geo.fromPlot(x, y), { focusPlot: true });
  });
  plot.addEventListener('keydown', (event) => {
    const moves = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (event.key === 'Enter' && play.guess) {
      event.preventDefault();
      lockGuess();
      return;
    }
    if (!(event.key in moves)) return;
    event.preventDefault();
    const [east, north] = moves[event.key];
    nudge(east, north, event.shiftKey ? FAST_STEP : 1, true);
  });
}

/** Moves the guess by steps of 1/40 of the view (east is left on the sky). Starts at the last training point. */
function nudge(east, north, times = 1, focusPlot = false) {
  const step = (play.geo.span / STEPS_PER_VIEW) * times;
  const start = play.guess ?? { ...play.round.training_points.at(-1) };
  if (play.kind === 'position') {
    setGuess({ east_arcsec: start.east_arcsec + east * step, north_arcsec: start.north_arcsec + north * step }, { focusPlot });
  } else if (north) {
    const brighterUp = isMagnitude(play.round.units) ? -1 : 1;
    setGuess({ value: start.value + brighterUp * north * step }, { focusPlot });
  }
}

function syncInputs() {
  const factor = displayFactor(play.round);
  if (play.kind === 'position') {
    const offset = play.guess ? toOffset(lastMeasurement(play.round), play.guess) : null;
    $('guess-east').value = offset ? (offset.east * factor).toFixed(2) : '';
    $('guess-north').value = offset ? (offset.north * factor).toFixed(2) : '';
  } else {
    $('guess-value').value = play.guess ? play.guess.value.toFixed(2) : '';
  }
}

function readInputs() {
  const factor = displayFactor(play.round);
  if (play.kind === 'position') {
    const east = Number($('guess-east').value);
    const north = Number($('guess-north').value);
    if ($('guess-east').value === '' || $('guess-north').value === '' || !Number.isFinite(east) || !Number.isFinite(north)) return;
    setGuess(fromOffset(lastMeasurement(play.round), { east: east / factor, north: north / factor }));
  } else {
    const value = Number($('guess-value').value);
    if ($('guess-value').value === '' || !Number.isFinite(value)) return;
    setGuess({ value });
  }
}

function lockGuess() {
  if (!play.guess || play.stage !== 'guess') return;
  play.stage = 'locked';
  renderControls();
  drawPlot();
  $('round-status').textContent = `${t('game.locked')} ${guessText()}`;
  // Task B20: "Check my guess" plays the reveal in its fixed order, one part at a time: the straight line, the
  // frozen model with its oval, then the real position and the result (no waiting under reduced motion).
  const delay = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : REVEAL_STEP_MS;
  const step = () => {
    revealTimer = null;
    if (!play || play.stage === 'actual' || play.stage === 'guess') return;
    revealNext();
    if (play.stage !== 'actual') revealTimer = setTimeout(step, delay);
  };
  revealTimer = setTimeout(step, delay);
}

function revealNext() {
  const next = { locked: 'baseline', baseline: 'model', model: 'actual' }[play.stage];
  if (!next) return;
  play.stage = next;
  drawPlot();
  renderControls();
  const messages = { baseline: 'game.saidBaseline', model: 'game.saidModel', actual: 'game.saidActual' };
  $('round-status').textContent = t(messages[next]);
  if (next === 'actual') {
    showResults();
    $('next-round')?.focus({ preventScroll: true });
  }
}

// ---------- Hints (position rounds) ----------

function hintButtonLabel() {
  return play.hints >= HINT_COUNT ? '' : t('game.hints.show', { n: String(play.hints + 1), title: t(`game.hint${play.hints + 1}.title`) });
}

function showHint() {
  if (play.stage !== 'guess' || play.hints >= HINT_COUNT) return;
  play.hints += 1;
  const n = play.hints;
  const unit = errorUnit(play.round);
  $('hint-list').append(el('article', { class: 'game-hint', id: `hint-${n}`, tabindex: '-1' }, [
    el('h4', { text: t(`game.hint${n}.title`) }),
    ...hintBody(n, play.round, play.type, play.name, unit),
  ]));
  drawPlot();
  const button = $('hint-next');
  button.hidden = play.hints >= HINT_COUNT;
  button.textContent = hintButtonLabel();
  $('hint-count').textContent = t('game.hints.used', { n: String(play.hints), total: String(HINT_COUNT) });
  $('round-status').textContent = t('game.hints.announce', { n: String(n), title: t(`game.hint${n}.title`) });
  if (button.hidden) $(`hint-${n}`).focus({ preventScroll: true });
}

function hintsPanel() {
  if (play.kind !== 'position') return null;
  return el('section', { class: 'hints', 'aria-labelledby': 'hints-title' }, [
    el('h3', { id: 'hints-title', text: t('game.hints.title') }),
    el('p', { class: 'note', text: t('game.hints.lead') }),
    el('div', { id: 'hint-list', class: 'hint-list' }),
    el('p', { id: 'hint-count', class: 'note', 'aria-live': 'polite' }),
    el('button', { id: 'hint-next', type: 'button', class: 'quiet', text: hintButtonLabel(), onclick: showHint }),
  ]);
}

// ---------- Results ----------

/** "You (Easy mode)", "You (Hard mode)" or "You (Hard mode, 2 hints)". */
function playerLabel() {
  if (play.easy) return t('game.who.playerEasy');
  if (!play.hints) return t('game.who.playerHard');
  return t(play.hints === 1 ? 'game.who.playerHardHint' : 'game.who.playerHardHints', { n: String(play.hints) });
}

function resultRow(who, result, unit) {
  const best = result.best.includes(who);
  return el('tr', { class: best ? 'is-best' : '' }, [
    el('th', { scope: 'row' }, [legendIcon(who), who === 'player' ? playerLabel() : t(`game.who.${who}`)]),
    el('td', { text: withUnit(result.errors[who], unit, 3) }),
    el('td', { text: result.scores[who] === null ? '—' : String(result.scores[who]) }),
    el('td', { text: best ? t('game.closest') : '' }),
  ]);
}

function verdict(result) {
  if (result.best.length > 1) return t('game.verdictTie');
  if (result.best[0] === 'player') return t('game.verdictPlayer');
  if (physicsLost(result)) return t('game.verdictBaseline');
  return t('game.verdictModel');
}

function actualImage() {
  const image = play.round.actual.image;
  if (!image) return el('p', { class: 'panel-note', text: t('game.noImage') });
  const path = typeof image === 'string' ? image : image.path;
  const url = path ? context.imageUrl(path) : null;
  if (!url) return el('p', { class: 'panel-note', text: t('game.noImage') });
  const contentType = typeof image === 'object' ? image.content_type : null;
  return el('figure', { class: 'actual-image' }, [
    el('img', { src: url, alt: t('game.imageAlt', { date: dateOf(play.round.reveal_t_mjd) }), loading: 'lazy' }),
    el('figcaption', {}, [
      el('span', { text: t('game.imageCaption', { date: dateOf(play.round.reveal_t_mjd) }) }),
      contentType && has(`content.${contentType}`) ? chip(t(`content.${contentType}`), `chip-${contentType}`) : null,
    ]),
  ]);
}

function showResults() {
  const { round, bundle } = play;
  const result = scoreRound(round, play.guess);
  const unit = result.unit;
  const best = result.scored ? saveBest(storage(), round.round_id, result.scores.player) : null;
  const verification = bundle?.verification;
  const official = verification?.state === 'ok'
    ? el('p', { class: 'stamps' }, [el('span', { text: t('game.official') }), trialStatusChip(verification.doc.status)])
    : el('p', { class: 'panel-note', text: t('game.noVerification') });
  // Task B20: the plain result first (three distances and stars), then the next round; the verdict, the score
  // table, the official result, the explanation and the score rule under Details.
  const perArcsec = { arcsec: 1, arcmin: 1 / 60, deg: 1 / 3600 }[unit] ?? 1;
  const away = (value) => (play.kind === 'position' ? angleText(value / perArcsec, unit) : withUnit(value, unit, 2));
  const stars = play.kind === 'position' ? roundStars(round, play.guess, result) : null;
  $('round-results').replaceChildren(...[
    el('p', { class: 'plain-result', text: t('game.plainResult', { player: away(result.errors.player), baseline: away(result.errors.baseline), model: away(result.errors.model) }) }),
    stars ? el('p', { class: `stars stars-${stars}` }, [
      el('span', { class: 'star-marks', 'aria-hidden': 'true', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }),
      el('span', { class: 'sr-only', text: t('game.starsLabel', { n: String(stars) }) }),
      el('span', { class: 'star-words', text: t(`game.stars.${stars}`) }),
    ]) : null,
    stars && activeChallenge() ? el('p', { id: 'challenge-outcome', class: 'challenge-outcome', text: outcomeText(stars) }) : null,
    el('p', { class: 'round-next' }, [
      el('button', { id: 'next-round', type: 'button', class: 'primary', text: t('game.nextRound'), onclick: () => startRound(nextRoundId(round.round_id)) }),
      el('button', { id: 'play-again', type: 'button', class: 'quiet', text: t('game.again'), onclick: () => startRound(round.round_id) }),
      stars ? el('button', {
        id: 'challenge-open', type: 'button', class: 'quiet', text: t(activeChallenge() ? 'challenge.back' : 'challenge.button'),
        onclick: () => openChallengeForm(stars),
      }) : null,
    ]),
    el('div', { id: 'challenge-host' }),
    details([
      el('h3', { text: t('game.resultsTitle') }),
      el('p', { class: 'verdict', text: verdict(result) }),
      el('div', { class: 'table-scroll' }, el('table', { class: 'results-table' }, [
        el('caption', { text: t('game.tableCaption') }),
        el('thead', {}, el('tr', {}, [t('game.colWho'), t('game.colError'), t('game.colScore'), ''].map((text) => el('th', { scope: 'col', text })))),
        el('tbody', {}, ['player', 'baseline', 'model'].map((who) => resultRow(who, result, unit))),
      ])),
      official,
      stars ? el('p', { class: 'note', text: t('game.starsRule') }) : null,
      explainResult(round, play.type, play.name, result),
      physicsLost(result) ? el('p', { class: 'note', text: t('game.physicsMayLose') }) : null,
      el('p', { class: 'note', text: result.scored
        ? t('game.scoreRule', { scale: withUnit(round.scoring.scale, unit, 2) })
        : t('game.noScore') }),
      play.regionShown === false ? el('p', { class: 'note', text: t('game.noRegion') }) : null,
      best !== null ? el('p', { class: 'note', text: t('game.best', { best: String(best) }) }) : null,
    ], { label: t('game.resultDetails') }),
    actualImage(),
  ].filter(Boolean));
}

// ---------- Challenge a friend (task B24) ----------

/** The challenge from the link, if it is for the round being played. */
const activeChallenge = () => (challenge && play && challenge.roundId === play.round.round_id ? challenge : null);

function outcomeText(stars) {
  const result = challengeOutcome(stars, challenge.stars);
  return t(`challenge.outcome.${result}`, { mine: starText(stars), name: challenge.name || t('challenge.friend') });
}

/** The banner above a challenged round. Only text: the name was validated, and it is set as textContent. */
function challengeBanner() {
  const active = activeChallenge();
  if (!active) return null;
  return el('p', { id: 'challenge-banner', class: 'challenge-banner', role: 'note', text: t(active.name ? 'challenge.banner' : 'challenge.bannerNoName', {
    name: active.name, stars: starText(active.stars), target: play.name, mode: t(`challenge.mode.${active.mode}`),
  }) });
}

/** Asks for an optional first name, then copies the link (and offers the share sheet where there is one). */
function openChallengeForm(stars) {
  const host = $('challenge-host');
  if (!host) return;
  const input = el('input', {
    id: 'challenge-name', type: 'text', maxlength: String(NAME_MAX), autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'challenge-hint',
  });
  const status = el('p', { id: 'challenge-status', class: 'note', role: 'status' });
  const link = el('input', { id: 'challenge-link', type: 'text', readonly: true, hidden: true, 'aria-label': t('challenge.linkLabel') });
  const share = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    ? el('button', { id: 'challenge-share', type: 'button', class: 'quiet', text: t('challenge.share'), hidden: true }) : null;
  const form = el('form', { class: 'challenge-form', novalidate: true }, [
    el('label', { for: 'challenge-name', text: t('challenge.nameLabel') }),
    input,
    el('p', { id: 'challenge-hint', class: 'note', text: t('challenge.nameHint') }),
    el('p', { class: 'challenge-actions' }, [el('button', { type: 'submit', class: 'primary', text: t('challenge.copy') }), share]),
    status,
    link,
  ]);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = challengeUrl(`${location.origin}${location.pathname}`, {
      roundId: play.round.round_id, name: input.value, stars, mode: play.easy ? 'easy' : 'hard',
    });
    if (!url) {
      status.textContent = t('challenge.badName');
      input.focus();
      return;
    }
    link.value = url;
    link.hidden = false;
    if (share) {
      share.hidden = false;
      share.onclick = () => navigator.share({ title: t('challenge.shareTitle'), text: t('challenge.shareText', { stars: starText(stars), target: play.name }), url }).catch(() => {});
    }
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = t('challenge.copied');
    } catch {
      status.textContent = t('challenge.copyManually');
      link.select();
    }
  });
  host.replaceChildren(form);
  input.focus({ preventScroll: false });
}

// ---------- Layout of one round ----------

function renderControls() {
  const guessing = play.stage === 'guess';
  for (const input of document.querySelectorAll('#guess-inputs input, #guess-inputs .nudge')) input.disabled = !guessing;
  if ($('hint-next')) $('hint-next').disabled = !guessing;
  $('lock-guess').hidden = !guessing;
  $('lock-guess').disabled = !play.guess;
  const label = NEXT_LABEL[play.stage];
  $('reveal-next').hidden = !label;
  if (label) $('reveal-next').textContent = t(label);
  if ($('mode-easy')) {
    for (const id of ['mode-easy', 'mode-hard']) $(id).disabled = !guessing;
  }
  const reached = STAGES.indexOf(play.stage);
  for (const item of document.querySelectorAll('#reveal-steps li')) {
    const done = reached >= STAGES.indexOf(item.dataset.stage) && !(item.dataset.stage === 'locked' && guessing);
    item.classList.toggle('done', done);
    if (done) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  }
}

function guessInputs() {
  const unit = play.kind === 'position' ? errorUnit(play.round) : play.round.units;
  const field = (id, labelKey) => el('label', { class: 'field' }, [
    el('span', { text: t(labelKey, { unit: t(`unit.${unit}`) }) }),
    el('input', { id, type: 'number', step: 'any', inputmode: 'decimal', onchange: readInputs }),
  ]);
  const nudgeButton = (labelKey, east, north) => el('button', {
    type: 'button', class: 'nudge', text: t(labelKey), onclick: () => nudge(east, north),
  });
  const fields = play.kind === 'position'
    ? [field('guess-east', 'game.inputEast'), field('guess-north', 'game.inputNorth')]
    : [field('guess-value', 'game.inputValue')];
  const nudges = play.kind === 'position'
    ? [nudgeButton('game.nudgeNorth', 0, 1), nudgeButton('game.nudgeEast', 1, 0), nudgeButton('game.nudgeWest', -1, 0), nudgeButton('game.nudgeSouth', 0, -1)]
    : [nudgeButton(isMagnitude(play.round.units) ? 'game.nudgeBrighter' : 'game.nudgeUp', 0, 1), nudgeButton(isMagnitude(play.round.units) ? 'game.nudgeFainter' : 'game.nudgeDown', 0, -1)];
  // Task B20: the number boxes and the arrow buttons sit in a closed Details; arrow keys on the chart still work.
  return details(el('fieldset', { id: 'guess-inputs', class: 'guess-inputs' }, [
    el('legend', { text: t('game.yourGuess') }),
    el('div', { class: 'guess-fields' }, fields),
    el('div', { class: `nudges nudges-${play.kind}` }, nudges),
  ]), { label: t('game.typeOrKeys'), className: 'guess-details' });
}

/** The Easy / Hard switch: two buttons, the current one pressed. */
function modeSwitch() {
  const button = (mode) => el('button', {
    id: `mode-${mode}`, type: 'button', class: 'mode-option', 'aria-pressed': String((mode === 'easy') === easyMode),
    text: t(`game.mode.${mode}`), onclick: () => setMode(mode === 'easy'),
  });
  return el('div', { class: 'mode-switch', role: 'group', 'aria-label': t('game.mode.label') }, [button('easy'), button('hard')]);
}

/** Easy mode shows hints 1 and 2 at once; Hard mode starts with none, as before. Only while guessing. */
function setMode(easy) {
  if (!play || play.stage !== 'guess' || easy === easyMode) return;
  easyMode = easy;
  const guess = play.guess;
  renderRound();
  if (guess) setGuess(guess, { announce: false });
  $(easy ? 'mode-easy' : 'mode-hard')?.focus({ preventScroll: true });
}

function legend() {
  const items = ['training', 'player', 'baseline', 'model', 'region', 'actual'];
  return el('ul', { class: 'game-legend' }, items.map((who) => el('li', {}, [legendIcon(who), t(`game.legend.${who}`)])));
}

function trainingTable() {
  const { round } = play;
  const factor = displayFactor(round);
  const unit = play.kind === 'position' ? errorUnit(round) : round.units;
  const columns = play.kind === 'position'
    ? [t('table.date'), t('game.inputEast', { unit: t(`unit.${unit}`) }), t('game.inputNorth', { unit: t(`unit.${unit}`) }), t('col.kind')]
    : [t('table.date'), t('game.inputValue', { unit: t(`unit.${unit}`) }), t('col.kind')];
  const origin = play.kind === 'position' ? lastMeasurement(round) : null;
  const rows = [...round.training_points].sort((a, b) => a.t_mjd - b.t_mjd).map((point) => [
    dateOf(point.t_mjd),
    ...(play.kind === 'position'
      ? [formatNumber(toOffset(origin, point).east * factor, 2), formatNumber(toOffset(origin, point).north * factor, 2)]
      : [formatNumber(point.value, 2)]),
    has(`content.${point.content_type}`) ? t(`content.${point.content_type}`) : '—',
  ]);
  return dataTable({ caption: t('game.trainingCaption'), summary: t('game.trainingTable'), columns, rows });
}

function renderRound() {
  const { round, bundle } = play;
  const name = context.nameOf(bundle?.trial?.doc?.target_key) ?? round.trial_id;
  const date = dateOf(round.reveal_t_mjd);
  const count = String(round.training_points.length);
  const row = context.scoreboardRow(round.trial_id);
  const position = play.kind === 'position';
  play.easy = easyMode && position;
  play.hints = play.easy ? 2 : 0;
  // Task B20: the title asks the question with the date in words; the trial type ("Practice run" or "Real test")
  // and the earlier chips sit in the round's Details. The chart comes right after the title.
  const storyKey = round.category === 'prospective_unexposed' ? 'story.chip.real' : round.category === 'retrospective_holdout' ? 'story.chip.practice' : null;
  $('round-area').replaceChildren(el('article', { class: 'round', 'aria-labelledby': 'round-title' }, [
    challengeBanner(),
    el('header', { class: 'round-head' }, [
      el('h2', { id: 'round-title', text: position ? t('game.titleWhere', { name, date: wordDate(round.reveal_t_mjd) }) : t('game.titleScalar', { name, date }) }),
      exampleChip(round),
    ]),
    el('div', { class: 'round-grid' }, [
      el('figure', { class: 'round-figure' }, [
        el('div', { id: 'round-plot', class: 'round-plot' }),
        el('figcaption', {}, [
          el('p', { id: 'game-keys', class: 'note', text: t('game.keys') }),
          details(legend(), { label: t('game.legendDetails') }),
        ]),
      ]),
      el('div', { class: 'round-side' }, [
        position ? modeSwitch() : null,
        play.easy && play.type === 'solar' ? el('p', { class: 'easy-note' }, [`${t('game.easy.pluto')} `, el('a', { href: '?page=loop', text: t('game.easy.plutoLink') })]) : null,
        el('button', { id: 'lock-guess', type: 'button', class: 'glow', text: t('game.check'), onclick: lockGuess, disabled: true }),
        el('p', { id: 'round-status', class: 'round-status', role: 'status' }),
        el('div', { id: 'round-results', class: 'round-results' }),
        el('ol', { id: 'reveal-steps', class: 'reveal-steps' }, ['locked', 'baseline', 'model', 'actual']
          .map((stage) => el('li', { dataset: { stage }, text: t(`game.step.${stage}`) }))),
        el('button', { id: 'reveal-next', type: 'button', class: 'glow', onclick: revealNext, hidden: true }),
        hintsPanel(),
        guessInputs(),
      ]),
    ]),
    position ? gameSkyPanel(round, name) : null,
    details([
      el('p', { class: 'stamps' }, [storyKey ? chip(t(storyKey), `chip-story chip-category-${round.category}`) : null, categoryChip(round.category), prospectiveChip(row)]),
      el('p', { id: 'round-task', class: 'round-task', text: t(position ? 'game.taskPositionShort' : 'game.taskScalarShort', { name, date }) }),
      el('p', { text: t(position ? 'game.taskPosition' : 'game.taskScalar', { name, date, count }) }),
      el('p', { class: 'note', text: categoryNote(round.category) }),
      el('p', { class: 'note', text: t('challenge.unverified') }),
    ], { label: t('game.roundDetails') }),
    howToBox(play.type, name),
    timelineStrip(round),
    trainingTable(),
  ]));
  // Easy mode: hints 1 and 2 are already written out in the hints panel.
  if (play.easy) {
    for (let n = 1; n <= 2; n += 1) {
      $('hint-list').append(el('article', { class: 'game-hint', id: `hint-${n}`, tabindex: '-1' }, [
        el('h4', { text: t(`game.hint${n}.title`) }), ...hintBody(n, round, play.type, play.name, errorUnit(round)),
      ]));
    }
    $('hint-next').textContent = hintButtonLabel();
    $('hint-count').textContent = t('game.hints.used', { n: String(play.hints), total: String(HINT_COUNT) });
  }
  renderControls();
  drawPlot();
}

/** The round after this one in the picker's order (easy → medium → hard), then back to the first. */
function nextRoundId(roundId) {
  const ids = context.rounds.map((entry) => entry.doc.round_id);
  return ids[(ids.indexOf(roundId) + 1) % ids.length];
}

function startRound(roundId) {
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = null;
  const entry = context.rounds.find((item) => item.doc.round_id === roundId) ?? context.rounds[0];
  const targetKey = entry.bundle?.trial?.doc?.target_key ?? null;
  play = {
    round: entry.doc, bundle: entry.bundle, kind: roundKind(entry.doc), stage: 'guess', guess: null, regionShown: null, hints: 0,
    type: roundType(entry.doc, targetKey), name: context.nameOf(targetKey) ?? entry.doc.trial_id,
  };
  for (const button of document.querySelectorAll('#round-picker button')) {
    button.setAttribute('aria-pressed', String(button.dataset.round === entry.doc.round_id));
  }
  renderRound();
  context.onSelect(entry.doc.round_id);
}

const difficultyOf = (entry) => roundDifficulty(entry.bundle?.trial?.doc?.target_key, roundType(entry.doc, entry.bundle?.trial?.doc?.target_key));

function pickerLabel(entry, sameQuantity = false) {
  const name = context.nameOf(entry.bundle?.trial?.doc?.target_key) ?? entry.doc.trial_id;
  // Task B20: "Barnard's Star · Easy": the name and how hard the round is, no chips.
  if (sameQuantity) return t('game.pickerLevel', { name, level: t(`game.level.${difficultyOf(entry)}`) });
  return t('game.pickerLabel', { name, quantity: has(`quantity.${entry.doc.quantity}`) ? t(`quantity.${entry.doc.quantity}`) : entry.doc.quantity });
}

/**
 * rounds: [{ doc, bundle }] with doc a game record that loaded; skipped: [{ path, reason }] for rounds that
 * could not be played. nameOf(targetKey), imageUrl(path), scoreboardRow(trialId), onSelect(roundId).
 */
export function renderGamePage(options) {
  context = options;
  const playable = options.rounds.filter((entry) => checkRound(entry.doc).ok)
    .sort((a, b) => DIFFICULTY_ORDER.indexOf(difficultyOf(a)) - DIFFICULTY_ORDER.indexOf(difficultyOf(b)));
  const problems = [
    ...options.skipped.map((item) => t('game.skipped', { path: item.path, reason: t(`state.${item.reason}`) })),
    ...options.rounds.filter((entry) => !checkRound(entry.doc).ok)
      .map((entry) => t('game.unplayable', { id: entry.doc.round_id, parts: checkRound(entry.doc).blocking.join(', ') })),
  ];
  context.rounds = playable;
  challenge = readChallenge(globalThis.location?.search ?? '', playable.map((entry) => entry.doc.round_id));
  if (challenge) easyMode = challenge.mode === 'easy';
  const host = $('game-rounds');
  if (!playable.length) {
    play = null;
    host.replaceChildren(...[
      el('p', { class: 'panel-note', text: t('game.waiting') }),
      options.fixtures ? null : el('p', {}, el('a', { href: '?page=game&fixtures=1', class: 'example-link', text: t('game.tryExample') })),
      ...problems.map((text) => el('p', { class: 'note warn', text })),
    ].filter(Boolean));
    return;
  }
  host.replaceChildren(
    el('nav', { id: 'round-picker', class: 'round-picker', 'aria-label': t('game.rounds') }, playable.map((entry) => el('button', {
      type: 'button', dataset: { round: entry.doc.round_id }, onclick: () => startRound(entry.doc.round_id), 'aria-pressed': 'false',
    }, [pickerLabel(entry, new Set(playable.map((item) => item.doc.quantity)).size === 1)]))),
    ...problems.map((text) => el('p', { class: 'note warn', text })),
    el('div', { id: 'round-area' }),
  );
  const first = challenge?.roundId ?? options.selected;
  startRound(first && playable.some((entry) => entry.doc.round_id === first) ? first : playable[0].doc.round_id);
}

export const currentRoundId = () => play?.round?.round_id ?? null;

/** Switches to a round named in a link, if it is one of the playable rounds. */
export function selectRound(roundId) {
  if (context?.rounds?.some((entry) => entry.doc.round_id === roundId)) startRound(roundId);
}
