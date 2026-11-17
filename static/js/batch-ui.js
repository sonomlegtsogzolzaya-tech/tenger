// "Asteroid batch" on the Predictions page: how often the truth landed inside our 95% regions, a chart of each
// trial's distance D against the 2.45 line, model versus straight-line errors, and one compact card per asteroid.
// Numbers come from the batch file and each asteroid's own trial files.
import { chip, details, downloadLine, el, formatNumber, formatUtc } from './dom.js';
import { REAL_BASE } from './contract.js';
import { TRIAL_FILES, trialFilePath } from './method.js';
import { has, t, tData } from './i18n.js';
import { categoryLabel } from './labels.js';
import { addCovariance, covarianceEllipse } from './coords.js';
import { commitInfo } from './ledger.js';
import { dateOfMjd } from './ledger-parts.js';
import { baselineWins, chartRows, coverageVerdict, D2_LIMIT_95, D_LIMIT_95, readBatch, whatIfRows } from './batch.js';

export const BATCH_FIXTURE_PATH = 'batches/asteroids-example.json';
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = (name, attributes = {}, children = []) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  node.append(...children.filter(Boolean));
  return node;
};
const words = (value) => document.createTextNode(value);
const pct = (value) => `${formatNumber(value * 100, 0)}%`;
const okDoc = (result) => (result?.state === 'ok' ? result.doc : null);
const note = (key) => (has(key) ? t(key) : tData(key, 'explain.unknown'));

async function json(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

/**
 * The batch and its trials. A real batch is read only when the real index lists it (batch_paths) and it is not an
 * example. The invented example is shown only in ?fixtures=1 mode (allowExample), never as a scoreboard on the
 * public page. Returns { batch, bundles } or null.
 */
export async function loadBatch({ real, fixtures, allowExample = false }) {
  const index = await real.index();
  const indexDoc = index?.state === 'ok' ? index.doc : null;
  const paths = Array.isArray(indexDoc?.batch_paths) ? indexDoc.batch_paths.filter((path) => typeof path === 'string') : [];
  for (const path of paths) {
    const batch = readBatch(await json(real.url(path)));
    // A row the batch marks as waiting has no verification file yet, so it is not requested (no failing request).
    const waiting = (id) => batch.rows.find((row) => row.trialId === id)?.status === 'waiting';
    if (batch && !batch.example) return { batch, path: `data/${path}`, bundles: await Promise.all(batch.trialIds.map((id) => real.trial(id, { waiting: waiting(id) }))) };
  }
  if (!allowExample) return null;
  const example = readBatch(await json(fixtures.url(BATCH_FIXTURE_PATH)));
  return example ? { batch: example, path: `dev-fixtures/${BATCH_FIXTURE_PATH}`, bundles: await Promise.all(example.trialIds.map((id) => fixtures.trial(id))) } : null;
}

/** "k of N inside (low–high)" for the second frozen model or the straight line, kept apart from the primary. */
function otherLine(key, calibration) {
  if (!calibration || !(calibration.n > 0)) return null;
  const range = calibration.interval ? `${pct(calibration.interval[0])}–${pct(calibration.interval[1])}` : '—';
  return el('p', { text: t(key, { k: String(calibration.k), n: String(calibration.n), range }) });
}

/** Counts by status ("1 inside its 95% region; 4 ambiguous (not counted)"): outcomes first, then the rows not counted. */
function statusCounts(batch) {
  const counts = new Map();
  for (const row of batch.rows) counts.set(row.status ?? 'unknown', (counts.get(row.status ?? 'unknown') ?? 0) + 1);
  const order = ['hit', 'miss', 'waiting', 'ambiguous', 'insufficient_data'];
  const rank = (status) => (order.includes(status) ? order.indexOf(status) : order.length);
  return [...counts].sort((a, b) => rank(a[0]) - rank(b[0])).map(([status, count]) => t(has(`batch.count.${status}`) ? `batch.count.${status}` : 'batch.count.other', { n: String(count), status })).join(t('batch.countJoin'));
}

/** "7 of 8 could not be scored: 4 ambiguous, 3 with too little data." (task B12), counted from the rows. */
function unscoredLine(batch, scored) {
  const counts = new Map();
  for (const row of batch.rows) if (!['hit', 'miss'].includes(row.status)) counts.set(row.status ?? 'other', (counts.get(row.status ?? 'other') ?? 0) + 1);
  const words = [...counts].sort((a, b) => b[1] - a[1]).map(([status, count]) => (has(`ledger.count.${status}.one`)
    ? t(`ledger.count.${status}.${count === 1 ? 'one' : 'many'}`, { n: String(count) }) : t('ledger.count.other', { n: String(count) })));
  return t('batch.unscored', { n: String(batch.rows.length - scored), total: String(batch.rows.length), counts: words.join(', ') });
}

function summary(batch) {
  const { n, k, interval, expected, method, computed, noteKey } = batch.calibration;
  if (!(n > 0)) {
    // Nothing checked yet: say what is frozen and what it waits for; never "0 of 0" or an interval.
    const frozen = batch.frozenUtc ? formatUtc(new Date(batch.frozenUtc), { time: true }) : null;
    return el('div', { class: 'batch-summary' }, [
      el('p', { class: 'batch-headline' }, [el('strong', { text: frozen
        ? t('batch.waitingHeadline', { count: String(batch.rows.length), date: frozen })
        : t('batch.waitingHeadlineNoDate', { count: String(batch.rows.length) }) })]),
      el('p', { text: `${statusCounts(batch)}.` }),
      batch.notAttempted.length ? el('p', { class: 'note', text: t('batch.notAttempted', { n: String(batch.notAttempted.length) }) }) : null,
      el('p', { class: 'note', text: t('batch.waitingNext') }),
    ]);
  }
  const verdict = coverageVerdict(batch.calibration);
  // "Consistent" says little when the interval covers most of 0–100%: say the batch is too small to test instead.
  const verdictKey = verdict === 'fits' && interval && interval[1] - interval[0] > 0.5 ? 'batch.tooFew' : verdict ? `batch.${verdict}` : null;
  const exploratory = batch.exploratory?.primary?.n > 0 ? batch.exploratory : null;
  // The file's own independence note when it has one (shown once, with the other notes), else ours.
  const independence = noteKey ? (batch.noteKeys.includes(noteKey) ? null : note(noteKey)) : t('batch.assumeIndependent');
  // At a glance (task B12): the section title carries "k of n"; one line says what could not be scored; the interval,
  // the verdict and every caveat sit under "Details" right below.
  return el('div', { class: 'batch-summary' }, [
    batch.rows.length > n ? el('p', { text: unscoredLine(batch, n) }) : null,
    details([
      batch.rows.length > n ? el('p', { text: t('batch.ofAll', { total: String(batch.rows.length), counts: statusCounts(batch) }) }) : null,
      el('p', { class: 'note', text: t('batch.lead') }),
      interval ? el('p', { text: t('batch.interval', { low: pct(interval[0]), high: pct(interval[1]), method: t(`batch.method.${method === 'wilson' ? 'wilson' : 'exact'}`) }) }) : null,
      verdictKey ? el('p', { text: t(verdictKey, { n: String(n) }) }) : null,
      el('p', { class: 'note', text: t('batch.expected', { expected: formatNumber(expected, 1), n: String(n) }) }),
      otherLine('batch.secondaryLine', batch.secondaryCalibration),
      otherLine('batch.baselineLine', batch.baselineCalibration),
      batch.notAttempted.length ? el('p', { class: 'note', text: t('batch.notAttempted', { n: String(batch.notAttempted.length) }) }) : null,
      el('p', { class: 'note', text: t('batch.smallN') }),
      independence ? el('p', { class: 'note', text: independence }) : null,
      computed ? el('p', { class: 'note', text: t('batch.computed') }) : null,
      exploratory ? el('p', { class: 'note batch-exploratory' }, [
        chip(t('batch.exploratoryChip'), 'chip-exploratory'),
        el('span', { text: ` ${exploratory.noteKey ? note(exploratory.noteKey) : ''} ${t('batch.exploratoryCounts', {
          k: String(exploratory.primary.k), n: String(exploratory.primary.n),
          k2: exploratory.secondary ? String(exploratory.secondary.k) : '—', n2: exploratory.secondary ? String(exploratory.secondary.n) : '—',
        })}`.trim() }),
      ]) : null,
      ...batch.noteKeys.map((key) => el('p', { class: 'note', text: note(key) })),
      batch.statementPending && !batch.noteKeys.includes('batch.team-statement-pending') ? el('p', { class: 'note', text: t('batch.statementPendingNote') }) : null,
      el('p', { class: 'note', text: t('batch.plotLegend') }),
      errorChart(batch),
    ]),
  ]);
}

function distanceChart(batch) {
  const rows = chartRows(batch);
  if (!rows.length) return null;
  const [width, height, left, right, top, bottom] = [560, 200, 40, 12, 14, 30];
  const top_ = Math.max(D_LIMIT_95 * 1.4, ...rows.map((row) => row.d)) * 1.05;
  const x = (index) => left + ((index + 0.5) / rows.length) * (width - left - right);
  const y = (d) => top + (1 - d / top_) * (height - top - bottom);
  const ticks = [];
  for (let d = 0; d <= top_; d += 1) ticks.push(svg('line', { x1: left, x2: width - right, y1: y(d), y2: y(d), class: 'grid' }), svg('text', { x: left - 6, y: y(d) + 4, class: 'tick', 'text-anchor': 'end' }, [words(String(d))]));
  return el('figure', { class: 'batch-figure' }, [
    el('figcaption', { text: t('batch.dTitle') }),
    svg('svg', { viewBox: `0 0 ${width} ${height}`, class: 'batch-chart', role: 'img', 'aria-label': t('batch.dLabel', { n: String(rows.length) }) }, [
      ...ticks,
      svg('line', { x1: left, x2: width - right, y1: y(D_LIMIT_95), y2: y(D_LIMIT_95), class: 'limit' }),
      svg('text', { x: left + 6, y: y(D_LIMIT_95) - 6, class: 'limit-label' }, [words(t('batch.limitLine'))]),
      ...rows.map((row, index) => svg('circle', { cx: x(index), cy: y(row.d), r: 5, class: row.inside ? 'inside' : 'outside' }, [svg('title', {}, [words(`${row.name}: D = ${formatNumber(row.d, 2)}`)])])),
      svg('text', { x: (left + width - right) / 2, y: height - 8, class: 'axis', 'text-anchor': 'middle' }, [words(t('batch.dAxis'))]),
    ]),
    el('details', { class: 'data-table' }, [
      el('summary', { text: t('table.show') }),
      el('div', { class: 'table-scroll' }, el('table', {}, [
        el('thead', {}, el('tr', {}, ['batch.col.asteroid', 'batch.col.d', 'batch.col.inside', 'batch.col.model', 'batch.col.baseline'].map((key) => el('th', { scope: 'col', text: t(key) })))),
        el('tbody', {}, batch.rows.map((row) => el('tr', {}, [
          el('th', { scope: 'row', text: row.name }),
          el('td', { text: Number.isFinite(row.d) ? formatNumber(row.d, 2) : '—' }),
          el('td', { text: row.excludedKey ? note(row.excludedKey) : row.inside === null ? '—' : t(row.inside ? 'batch.yes' : 'batch.no') }),
          el('td', { text: Number.isFinite(row.modelError) ? `${formatNumber(row.modelError, 1)}″` : '—' }),
          el('td', { text: Number.isFinite(row.baselineError) ? `${formatNumber(row.baselineError, 1)}″` : '—' }),
        ]))),
      ])),
    ]),
  ]);
}

function errorChart(batch) {
  const rows = batch.rows.filter((row) => Number.isFinite(row.modelError) && Number.isFinite(row.baselineError));
  if (!rows.length) return null;
  const max = Math.max(...rows.flatMap((row) => [row.modelError, row.baselineError])) * 1.08;
  const step = niceStep(max / 4);
  // Room for the widest tick label ("10,000") beside the rotated axis title.
  const widest = formatNumber(Math.floor(max / step) * step, step < 1 ? 1 : 0).length;
  const [size, left, bottom, top] = [240, Math.max(44, 24 + widest * 6.6), 40, 10];
  const span = size - left - top;
  const sx = (value) => left + (value / max) * span;
  const sy = (value) => size - bottom - (value / max) * (size - bottom - top);
  const ticks = [];
  for (let value = 0; value <= max; value += step) {
    ticks.push(
      svg('text', { x: sx(value), y: size - bottom + 14, class: 'tick', 'text-anchor': 'middle' }, [words(formatNumber(value, step < 1 ? 1 : 0))]),
      svg('text', { x: left - 6, y: sy(value) + 4, class: 'tick', 'text-anchor': 'end' }, [words(formatNumber(value, step < 1 ? 1 : 0))]),
    );
  }
  const wins = baselineWins(batch);
  return el('figure', { class: 'batch-figure' }, [
    el('figcaption', { text: t('batch.errorsTitle') }),
    svg('svg', { viewBox: `0 0 ${size} ${size}`, class: 'batch-chart batch-errors', role: 'img', 'aria-label': t('batch.errorsLabel', { model: String(wins.model), baseline: String(wins.baseline), n: String(wins.compared) }) }, [
      svg('line', { x1: sx(0), y1: sy(0), x2: sx(max), y2: sy(max), class: 'diagonal' }),
      svg('line', { x1: sx(0), y1: sy(0), x2: sx(max), y2: sy(0), class: 'grid' }),
      svg('line', { x1: sx(0), y1: sy(0), x2: sx(0), y2: sy(max), class: 'grid' }),
      ...ticks,
      ...rows.map((row) => svg('circle', { cx: sx(row.baselineError), cy: sy(row.modelError), r: 4.5, class: row.modelError < row.baselineError ? 'closer-model' : 'closer-line' }, [svg('title', {}, [words(`${row.name}: ${formatNumber(row.modelError, 1)}″ / ${formatNumber(row.baselineError, 1)}″`)])])),
      svg('text', { x: left + span / 2, y: size - 8, class: 'axis', 'text-anchor': 'middle' }, [words(t('batch.errorsX'))]),
      svg('text', { x: 12, y: (size - bottom + top) / 2, class: 'axis', 'text-anchor': 'middle', transform: `rotate(-90 12 ${(size - bottom + top) / 2})` }, [words(t('batch.errorsY'))]),
    ]),
    el('p', { class: 'note', text: t('batch.errorsSummary', { model: String(wins.model), baseline: String(wins.baseline), n: String(wins.compared) }) }),
  ]);
}

/** 1, 2 or 5 times a power of ten, at least `raw`. */
function niceStep(raw) {
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((factor) => factor * power).find((step) => step >= raw);
}

/** The 95% test region the verdict used: forecast plus measurement covariance, at the trial's threshold. */
function testRegion(bundle) {
  const prediction = okDoc(bundle?.prediction);
  const verification = okDoc(bundle?.verification);
  const residual = verification?.residuals?.model;
  const cPred = residual?.c_pred_arcsec2 ?? prediction?.model?.cov_arcsec2;
  const cObs = residual?.c_obs_arcsec2 ?? verification?.observed?.cov_arcsec2;
  const threshold = okDoc(bundle?.trial)?.scoring?.threshold_d2 ?? D2_LIMIT_95;
  const cov = cPred && cObs ? addCovariance(cPred, cObs) : cPred;
  const ellipse = cov ? covarianceEllipse(cov, threshold) : null;
  return ellipse ? { ...ellipse, withMeasurement: Boolean(cPred && cObs) } : null;
}

/** A tiny sky plot: the forecast at the centre, the 95% test region and where the asteroid was (east left, north up). */
function miniPlot(region, residual) {
  if (!region || !Number.isFinite(residual?.east_arcsec) || !Number.isFinite(residual?.north_arcsec)) return null;
  const size = 96;
  const centre = size / 2;
  const reach = Math.max(region.major, Math.hypot(residual.east_arcsec, residual.north_arcsec)) * 1.12;
  const scale = (size / 2 - 7) / reach;
  const ox = centre - residual.east_arcsec * scale;
  const oy = centre - residual.north_arcsec * scale;
  return svg('svg', { viewBox: `0 0 ${size} ${size}`, class: 'batch-mini', 'aria-hidden': 'true' }, [
    svg('line', { x1: 0, x2: size, y1: centre, y2: centre, class: 'axis-line' }),
    svg('line', { x1: centre, x2: centre, y1: 0, y2: size, class: 'axis-line' }),
    // East left and north up flip both screen axes, which leaves the axis angle of an ellipse unchanged.
    svg('ellipse', { cx: centre, cy: centre, rx: region.major * scale, ry: region.minor * scale, transform: `rotate(${region.angleDeg.toFixed(1)} ${centre} ${centre})`, class: 'region' }),
    svg('circle', { cx: centre, cy: centre, r: 2.5, class: 'forecast' }),
    svg('path', { d: `M${ox - 4},${oy - 4}L${ox + 4},${oy + 4}M${ox - 4},${oy + 4}L${ox + 4},${oy - 4}`, class: 'observed' }),
    svg('text', { x: 3, y: centre - 3, class: 'axis-text' }, [words('E')]),
    svg('text', { x: centre + 3, y: 10, class: 'axis-text' }, [words('N')]),
  ]);
}

function card(row, bundle, { example = false } = {}) {
  const trial = okDoc(bundle?.trial);
  const prediction = okDoc(bundle?.prediction);
  const verification = okDoc(bundle?.verification);
  const receipt = commitInfo(bundle?.receipt);
  const region = testRegion(bundle);
  const model = prediction?.model;
  const date = Number.isFinite(prediction?.t_mjd) ? dateOfMjd(prediction.t_mjd) : null;
  const inside = row.excludedKey ? null : row.inside;
  return el('article', { class: `batch-card glass ${inside === null ? '' : inside ? 'is-inside' : 'is-outside'}`.trim() }, [
    el('div', { class: 'card-head' }, [
      el('h4', { text: trial?.target_name ?? row.name }),
      inside === null && row.status === 'waiting' ? chip(t('batch.waiting'), 'chip-trial-waiting')
        : chip(inside === null ? (row.excludedKey ? t('batch.excluded') : row.status === 'insufficient_data' ? t('batch.insufficient') : row.status === 'ambiguous' ? t('batch.ambiguous') : t('batch.notScored')) : t(inside ? 'batch.inside' : 'batch.outside'), inside === null ? 'chip-trial-unavailable' : inside ? 'chip-trial-hit' : 'chip-trial-miss'),
    ]),
    el('div', { class: 'batch-card-body' }, [
      miniPlot(region, verification?.residuals?.model),
      el('dl', { class: 'batch-facts' }, [
        el('dt', { text: t('batch.f.forecast') }),
        el('dd', { class: 'mono', text: model && Number.isFinite(model.ra_deg) ? `${formatNumber(model.ra_deg, 4)}°, ${formatNumber(model.dec_deg, 4)}°` : '—' }),
        date ? el('dt', { text: t('batch.f.date') }) : null,
        date ? el('dd', { class: 'mono', text: date }) : null,
        el('dt', { text: t(region && !region.withMeasurement ? 'batch.f.regionForecast' : 'batch.f.region') }),
        el('dd', { text: region ? t('batch.regionValue', { major: formatNumber(region.major, 1), minor: formatNumber(region.minor, 1) }) : '—' }),
        el('dt', { text: t('batch.f.observed') }),
        el('dd', { text: Number.isFinite(row.modelError) ? t('batch.observedValue', { error: formatNumber(row.modelError, 1), d: Number.isFinite(row.d) ? formatNumber(row.d, 2) : '—' }) : '—' }),
        el('dt', { text: t('batch.f.baseline') }),
        el('dd', { text: Number.isFinite(row.baselineError) ? `${formatNumber(row.baselineError, 1)}″` : '—' }),
        row.horizons && Number.isFinite(row.horizons.error) ? el('dt', { text: t('batch.f.horizons') }) : null,
        row.horizons && Number.isFinite(row.horizons.error) ? el('dd', { text: t(row.horizons.inside === true ? 'batch.horizonsInside' : row.horizons.inside === false ? 'batch.horizonsOutside' : 'batch.horizonsValue', { error: formatNumber(row.horizons.error, 1) }) }) : null,
      ]),
    ]),
    details([
      region && !region.withMeasurement ? el('p', { class: 'note', text: t('batch.regionForecastNote') }) : null,
      row.excludedKey ? el('p', { class: 'note', text: note(row.excludedKey) }) : null,
      !row.excludedKey && row.statusKey ? el('p', { class: 'note', text: note(row.statusKey) }) : null,
      receipt?.url
        ? el('p', { class: 'note' }, [el('span', { text: `${t('batch.frozen')} ` }), el('a', { href: receipt.url, rel: 'noopener', class: 'mono', text: receipt.short })])
        : el('p', { class: 'note', text: receipt?.example ? t('batch.frozenExample') : t('batch.frozenNoLink') }),
      // Task B30: the asteroid's published trial files (real data only).
      !example && bundle?.id ? downloadLine(TRIAL_FILES.filter((file) => bundle[file]?.state === 'ok').map((file) => ({
        href: `${REAL_BASE}${trialFilePath(bundle.id, file)}`, file: `${file}.json`, saveAs: `${bundle.id}-${file}.json`,
      })), row.name ?? bundle.id) : null,
    ]),
  ]);
}

/** The whole section. data: loadBatch() result or null. */
export function batchSection(data) {
  if (!data?.batch) return null;
  const { batch, bundles } = data;
  const bundleOf = (id) => bundles.find((bundle) => bundle?.id === id) ?? null;
  const { n, k } = batch.calibration;
  // Waiting batches keep their own headline inside summary(); a checked batch says "k of n" in its title (task B12).
  const scored = n > 0 && !batch.example;
  return el('section', { id: 'ledger-batch', class: 'ledger-section batch-section', 'aria-labelledby': 'batch-title' }, [
    el('h2', { id: 'batch-title', text: scored ? t('batch.titleResult', { k: String(k), n: String(n) }) : t('batch.title') }),
    el('p', { class: 'stamps' }, [
      batch.category ? chip(categoryLabel(batch.category), `chip-category chip-${batch.category}`) : null,
      batch.example ? chip(t('example.tag'), 'chip-example') : null,
      batch.statementPending ? chip(t('chip.pending'), 'chip-pending') : null,
    ]),
    batch.example ? el('p', { class: 'panel-note warn', text: t('batch.exampleNote') }) : null,
    n > 0 && !scored ? el('p', { class: 'batch-headline' }, [el('strong', { text: t('batch.headline', { k: String(k), n: String(n) }) })]) : null,
    summary(batch),
    el('div', { class: 'batch-charts' }, [distanceChart(batch)]),
    details(el('div', { class: 'batch-cards' }, batch.rows.map((row) => card(row, bundleOf(row.trialId), { example: Boolean(batch.example) }))), { label: t('batch.cardsDetails', { n: String(batch.rows.length) }) }),
  ]);
}

/**
 * Lesson 3's worked example of calibration: what "k of N" means and why a small N gives a wide interval. The counts
 * and the interval come from the batch file; the what-if rows keep the same share and say they are computed.
 */
export function lessonBatchSection(data) {
  if (!data?.batch) return null;
  const { batch } = data;
  const { n, k, interval, expected } = batch.calibration;
  if (!(n > 0) || !interval) return null;
  const range = (pair) => (pair ? `${pct(pair[0])} – ${pct(pair[1])}` : '—');
  const rows = [{ n, k, interval, file: true }, ...whatIfRows(batch.calibration)];
  return el('section', { id: 'lesson-batch', class: 'lesson-part batch-lesson' }, [
    el('h3', { text: t('lesson.sure.batchTitle') }),
    el('p', { class: 'stamps' }, [
      batch.example ? chip(t('example.tag'), 'chip-example') : null,
      batch.statementPending ? chip(t('batch.statementPending'), 'chip-pending') : null,
    ]),
    batch.example ? el('p', { class: 'panel-note warn', text: t('lesson.sure.batchExample') }) : null,
    // Frozen and scored are different numbers: every row was frozen; only n could be scored.
    el('p', { text: n === 1
      ? t('lesson.sure.batchCountOne', { total: String(batch.rows.length), where: t(k === 1 ? 'lesson.sure.batchInside' : 'lesson.sure.batchOutside') })
      : t('lesson.sure.batchCount', { total: String(batch.rows.length), k: String(k), n: String(n), share: pct(k / n) }) }),
    el('p', { text: t('lesson.sure.batchMeaning', { k: String(k), n: String(n), expected: formatNumber(expected, 1) }) }),
    el('p', { text: t(n === 1 ? 'lesson.sure.batchIntervalOne' : 'lesson.sure.batchInterval', { n: String(n), low: pct(interval[0]), high: pct(interval[1]), width: formatNumber((interval[1] - interval[0]) * 100, 0) }) }),
    el('h4', { text: t('lesson.sure.batchWhatIf') }),
    el('div', { class: 'table-scroll' }, el('table', { class: 'results-table' }, [
      el('caption', { text: t('lesson.sure.batchCaption') }),
      el('thead', {}, el('tr', {}, ['lesson.sure.batchColN', 'lesson.sure.batchColK', 'lesson.sure.batchColInterval'].map((key) => el('th', { scope: 'col', text: t(key) })))),
      el('tbody', {}, rows.map((row) => el('tr', {}, [
        el('th', { scope: 'row', text: row.file ? t('lesson.sure.batchRowFile', { n: String(row.n) }) : String(row.n) }),
        el('td', { text: String(row.k) }),
        el('td', { text: range(row.interval) }),
      ]))),
    ])),
    // "Not badly wrong" needs an interval that rules out a low hit rate; a wide one says almost nothing yet.
    el('p', { class: 'worked-answer', text: t(interval[0] < 0.5 ? 'lesson.sure.batchLessonWeak' : 'lesson.sure.batchLesson', { k: String(k), n: String(n), low: pct(interval[0]), high: pct(interval[1]) }) }),
    el('p', { class: 'note', text: batch.calibration.noteKey ? note(batch.calibration.noteKey) : t('batch.assumeIndependent') }),
    el('p', { class: 'note', text: t('lesson.sure.batchSource', { file: data.path ?? t('batch.title') }) }),
  ]);
}
