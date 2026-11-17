// Investigation panels that read contract files (docs/DATA-CONTRACT.md): What changed, Prediction,
// Evidence and the Spectrum note. Missing files give honest "not published" states, example files are
// stamped, and nothing here computes a success number of its own.
import { addCovariance, covarianceEllipse, tangentOffsetArcsec } from './coords.js';
import { chip, dataTable, details, downloadLine, el, factList, formatNumber, formatUtc, withUnit } from './dom.js';
import { has, t, tData } from './i18n.js';
import { comparisonReasons } from './epochs.js';
import { categoryChip, categoryNote, exampleChip, trialStatusChip } from './labels.js';
import { trialLabels } from './ledger.js';
import { mjdToDate } from './stack.js';

const UNIT_SUFFIXES = ['arcsec_yr', 'mas_yr', 'mjy_sr', 'arcsec', 'deg', 'um', 'ujy', 'mag', 'days', 'mjd', 'au', 'pc'];
const HASH_SHOWN = 12;
const PLOT_SIZE = 240;
const PLOT_MARGIN = 0.18;

const exampleStamp = exampleChip;
const stateText = (result) => t(`state.${result?.state ?? 'missing'}`);
const note = (text, kind = '') => el('p', { class: `panel-note ${kind}`.trim(), text });

function unitOf(quantity) {
  const suffix = UNIT_SUFFIXES.find((unit) => quantity?.endsWith(`_${unit}`));
  return suffix ? t(`unit.${suffix}`) : '';
}

const quantityLabel = (quantity) => (has(`quantity.${quantity}`)
  ? t(`quantity.${quantity}`) : t('quantity.unknown', { name: quantity }));

function measurementValue(measurement) {
  if (measurement.value === null || measurement.value === undefined) {
    return t('changed.noValue', { status: t(`mstatus.${measurement.status ?? 'not_attempted'}`) });
  }
  return t('changed.value', {
    value: formatNumber(measurement.value),
    sigma: measurement.sigma === null ? '—' : formatNumber(measurement.sigma),
    unit: unitOf(measurement.quantity),
  });
}

function explanationText(item) {
  return tData(item.key, 'explain.unknown', item.params ?? {});
}

// ---------- What changed ----------

/** The validated part of What changed. investigation is a contract load result or null (custom position). */
export function renderChanged(host, { investigation, custom }) {
  if (custom) {
    host.replaceChildren(note(t('changed.customWaiting')));
    return;
  }
  if (investigation?.state !== 'ok') {
    host.replaceChildren(note(investigation?.state === 'missing' || !investigation ? t('changed.waiting') : stateText(investigation)));
    return;
  }
  const doc = investigation.doc;
  const measurements = doc.measurements ?? [];
  const valued = measurements.filter((measurement) => measurement.value !== null && measurement.value !== undefined);
  const missing = measurements.filter((measurement) => !valued.includes(measurement));
  const missingList = missing.length ? el('details', { class: 'missing-measurements' }, [
    el('summary', { text: t('changed.missingCount', { count: String(missing.length) }) }),
    el('ul', { class: 'measurements' }, missing.map(measurementItem)),
  ]) : null;
  const limitations = [...new Set([...(doc.limitation_keys ?? []), ...measurements.flatMap((item) => item.limitation_keys ?? [])])];
  host.replaceChildren(...[
    exampleStamp(doc),
    // At a glance (task B12): the first explanation is the finding; the checks and caveats after it sit under Details.
    ...(doc.explanation ?? []).slice(0, 1).map((item) => el('p', { class: 'changed-finding', text: explanationText(item) })),
    (doc.explanation ?? []).length > 1 ? details((doc.explanation ?? []).slice(1).map((item) => el('p', { class: 'note', text: explanationText(item) }))) : null,
    valued.length ? el('ul', { class: 'measurements' }, valued.map(measurementItem)) : note(t('changed.waiting')),
    missingList,
    limitations.length ? details([
      el('h4', { text: t('pred.limitations') }),
      el('ul', {}, limitations.map((key) => el('li', { text: tData(key, 'limit.unknown') }))),
    ], { label: t('pred.limitations') }) : null,
  ].filter(Boolean));
}

function measurementItem(measurement) {
  const inputs = Array.isArray(measurement.inputs) && measurement.inputs.length <= 2 ? measurement.inputs.join(' → ') : null;
  return el('li', { class: 'measurement' }, [
    el('strong', { text: quantityLabel(measurement.quantity) }),
    el('span', { class: 'measurement-value', text: measurementValue(measurement) }),
    chip(t(`content.${measurement.content_type}`), `chip-${measurement.content_type}`),
    measurement.status !== 'measured' ? chip(t(`mstatus.${measurement.status}`)) : null,
    inputs ? el('small', { text: t('changed.inputs', { inputs }) }) : null,
    Number.isFinite(measurement.raw_ratio) ? el('small', { text: t('changed.rawRatio', {
      raw: formatNumber(measurement.raw_ratio, 4),
      stat: Number.isFinite(measurement.sigma_statistical) ? formatNumber(measurement.sigma_statistical, 4) : '—',
    }) }) : null,
    measurement.control && Number.isFinite(measurement.control.n_stars) ? el('small', { text: t('changed.control', {
      n: String(measurement.control.n_stars),
      median: formatNumber(measurement.control.median_ratio, 4),
      scatter: Number.isFinite(measurement.control.scatter_fraction) ? formatNumber(measurement.control.scatter_fraction * 100, 1) : '—',
    }) }) : null,
    measurement.status_reason_key ? el('small', { text: tData(measurement.status_reason_key, 'explain.unknown') }) : null,
  ]);
}

// ---------- Prediction ----------

function positionValue(point) {
  const ellipse = covarianceEllipse(point.cov_arcsec2, 1);
  return t('pred.positionValue', {
    ra: `${formatNumber(point.ra_deg, 6)}°`,
    dec: `${formatNumber(point.dec_deg, 6)}°`,
    major: ellipse ? formatNumber(ellipse.major) : '—',
    minor: ellipse ? formatNumber(ellipse.minor) : '—',
  });
}

function pointValue(point) {
  if (!point) return '—';
  if (Number.isFinite(point.ra_deg)) return positionValue(point);
  return t('pred.scalarValue', { value: formatNumber(point.value), sigma: formatNumber(point.sigma), unit: point.unit ?? '' });
}

function scoringText(scoring) {
  if (!scoring) return '—';
  return t(`scoring.${scoring.kind}`, {
    coverage: String(Math.round((scoring.coverage ?? 0) * 100)),
    threshold: formatNumber(scoring.threshold_d2, 3),
    z: formatNumber(scoring.z_max, 3),
  });
}

/** The ellipse of a 2x2 covariance as an SVG path in plot coordinates. */
function ellipseNode(cov, d2, toPlot, scale, className) {
  const ellipse = covarianceEllipse(cov, d2);
  if (!ellipse) return null;
  const centre = toPlot(0, 0);
  return svg('ellipse', {
    cx: centre.x,
    cy: centre.y,
    rx: ellipse.major * scale,
    ry: ellipse.minor * scale,
    // East left and north up flip both screen axes, which leaves the axis angle of an ellipse unchanged.
    transform: `rotate(${ellipse.angleDeg} ${centre.x} ${centre.y})`,
    class: className,
  });
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(name, attributes, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Tangent-plane plot: model at the origin, its 95% region, the baseline and the observed point. */
function positionPlot(prediction, verification, trial) {
  const model = prediction.model;
  if (!Number.isFinite(model?.ra_deg)) return null;
  const d2 = trial?.scoring?.threshold_d2;
  const points = [{ label: t('pred.model'), east: 0, north: 0, className: 'pt-model' }];
  if (Number.isFinite(prediction.baseline?.ra_deg)) {
    points.push({ label: t('pred.baseline'), ...tangentOffsetArcsec(model.ra_deg, model.dec_deg, prediction.baseline.ra_deg, prediction.baseline.dec_deg), className: 'pt-baseline' });
  }
  const observed = verification?.observed;
  if (Number.isFinite(observed?.ra_deg)) {
    points.push({ label: t('pred.observed'), ...tangentOffsetArcsec(model.ra_deg, model.dec_deg, observed.ra_deg, observed.dec_deg), className: 'pt-observed' });
  }
  const region = observed?.cov_arcsec2 ? addCovariance(model.cov_arcsec2, observed.cov_arcsec2) : model.cov_arcsec2;
  const ellipse = d2 ? covarianceEllipse(region, d2) : null;
  const reach = Math.max(ellipse?.major ?? 0, ...points.map((point) => Math.hypot(point.east, point.north)), 0.1);
  const scale = (PLOT_SIZE * (0.5 - PLOT_MARGIN)) / reach;
  const toPlot = (east, north) => ({ x: PLOT_SIZE / 2 - east * scale, y: PLOT_SIZE / 2 - north * scale });
  const plot = svg('svg', { viewBox: `0 0 ${PLOT_SIZE} ${PLOT_SIZE}`, role: 'img', 'aria-label': t('pred.plotTitle'), class: 'pred-plot' });
  plot.append(svg('line', { x1: 0, x2: PLOT_SIZE, y1: PLOT_SIZE / 2, y2: PLOT_SIZE / 2, class: 'axis-line' }));
  plot.append(svg('line', { y1: 0, y2: PLOT_SIZE, x1: PLOT_SIZE / 2, x2: PLOT_SIZE / 2, class: 'axis-line' }));
  plot.append(svg('text', { x: 6, y: PLOT_SIZE / 2 - 6, class: 'axis-text' }, 'E'));
  plot.append(svg('text', { x: PLOT_SIZE / 2 + 6, y: 14, class: 'axis-text' }, 'N'));
  if (d2) {
    const node = ellipseNode(region, d2, toPlot, scale, 'region');
    if (node) plot.append(node);
  }
  for (const point of points) {
    const { x, y } = toPlot(point.east, point.north);
    plot.append(svg('circle', { cx: x, cy: y, r: 4.5, class: point.className }));
  }
  const legend = el('ul', { class: 'plot-legend' }, [
    ...points.map((point) => el('li', { class: point.className, text: point.label })),
    d2 ? el('li', { class: 'region', text: observed?.cov_arcsec2 ? t('pred.plotRegion') : t('pred.plotRegionModel') }) : null,
  ]);
  const table = dataTable({
    caption: t('pred.plotTitle'),
    summary: t('pred.plotTable'),
    columns: [t('pred.colPoint'), t('pred.colEast'), t('pred.colNorth')],
    rows: points.map((point) => [point.label, formatNumber(point.east, 3), formatNumber(point.north, 3)]),
  });
  return el('figure', { class: 'pred-figure' }, [plot, el('figcaption', {}, [el('p', { text: t('pred.plotTitle') }), legend]), table]);
}

function receiptFacts(receipt) {
  if (receipt?.state !== 'ok') return t('pred.receiptMissing');
  const doc = receipt.doc;
  const first = t('pred.receiptValue', {
    hash: String(doc.prediction_sha256 ?? '').slice(0, HASH_SHOWN),
    commit: doc.commit ?? '—',
    utc: doc.committed_utc ?? '—',
  });
  const pushed = doc.pushed?.utc
    ? t('pred.pushed', { remote: doc.pushed.remote, branch: doc.pushed.branch, utc: doc.pushed.utc })
    : t('pred.notPushed');
  return `${first}. ${pushed}`;
}

function verificationBlock(verification, trial) {
  if (verification?.state !== 'ok') {
    return note(verification?.state === 'missing' || !verification ? t('pred.verificationMissing') : stateText(verification));
  }
  const doc = verification.doc;
  const model = doc.residuals?.model;
  const baseline = doc.residuals?.baseline;
  const position = Number.isFinite(model?.error_arcsec);
  const unit = position ? 'arcsec' : doc.observed?.unit;
  const error = (residual) => withUnit(residual?.error_arcsec ?? residual?.error, unit);
  return el('div', { class: 'verification' }, [
    exampleStamp(doc),
    factList([
      [t('pred.result'), trialStatusChip(doc.status)],
      [t('pred.errors'), t('pred.errorsValue', { model: error(model), baseline: error(baseline) })],
      model && Number.isFinite(model.d2) ? [t('pred.testLabel'), t('pred.d2', {
        d2: formatNumber(model.d2), threshold: formatNumber(trial?.scoring?.threshold_d2, 3), baseline: formatNumber(baseline?.d2),
      })] : null,
      model && Number.isFinite(model.z) ? [t('pred.testLabel'), t('pred.z', {
        z: formatNumber(Math.abs(model.z)), threshold: formatNumber(trial?.scoring?.z_max, 3), baseline: formatNumber(Math.abs(baseline?.z)),
      })] : null,
      doc.identification ? [t('pred.identLabel'), t('pred.identification', {
        method: tData(doc.identification.method_key, 'explain.unknown'),
        count: String(doc.identification.alternatives ?? 0),
      })] : null,
    ]),
    doc.status_reason_key ? note(tData(doc.status_reason_key, 'explain.unknown')) : null,
  ]);
}

function trialCard(bundle) {
  const { trial, prediction, receipt, verification } = bundle;
  const header = el('h3', { text: t('pred.trial', { id: bundle.id }) });
  if (trial?.state !== 'ok') return el('article', { class: 'trial' }, [header, note(stateText(trial))]);
  const doc = trial.doc;
  const category = doc.category;
  const holdoutDate = Number.isFinite(doc.holdout?.t_mjd) ? formatUtc(mjdToDate(doc.holdout.t_mjd), { time: false }) : '—';
  // V5: training and holdout list observations as obs[] (V1: obs_keys / obs_ids); every label is shown.
  const trainingCount = doc.training?.obs_keys?.length ?? doc.training?.obs?.length ?? doc.training?.n_points ?? 0;
  const holdoutCount = doc.holdout?.obs_ids?.length ?? doc.holdout?.obs?.length ?? 0;
  const facts = factList([
    [t('pred.category'), el('span', { class: 'stamps' }, trialLabels(doc).map(categoryChip))],
    [t('pred.quantity'), quantityLabel(doc.quantity)],
    [t('pred.frozen'), doc.frozen_utc ?? '—'],
    [t('pred.training'), t('pred.trainingValue', { count: String(trainingCount) })],
    [t('pred.holdout'), t('pred.holdoutValue', { date: holdoutDate, count: String(holdoutCount) })],
    [t('pred.exposure'), t(`exposure.${doc.exposure?.status ?? 'unknown'}`)],
    [t('pred.scoring'), scoringText(doc.scoring)],
    [t('pred.receipt'), receiptFacts(receipt)],
  ]);
  const predicted = prediction?.state === 'ok'
    ? factList([
      [t('pred.model'), pointValue(prediction.doc.model)],
      [t('pred.baseline'), pointValue(prediction.doc.baseline)],
    ])
    : note(prediction?.state === 'missing' ? t('pred.predictionMissing') : stateText(prediction));
  const plot = prediction?.state === 'ok' && doc.quantity === 'position'
    ? positionPlot(prediction.doc, verification?.state === 'ok' ? verification.doc : null, doc)
    : null;
  const limitations = [...new Set([...(prediction?.doc?.limitation_keys ?? [])])];
  // At a glance (task B12): the trial's type and result as chips, the errors as the key number and the plot as the
  // picture; the category note, the frozen facts, the predicted values, the test and the limitations under Details.
  const checked = verification?.state === 'ok' ? verification.doc : null;
  const errorOf = (residual) => withUnit(residual?.error_arcsec ?? residual?.error, Number.isFinite(checked?.residuals?.model?.error_arcsec) ? 'arcsec' : checked?.observed?.unit);
  return el('article', { class: 'trial' }, [
    header,
    el('p', { class: 'stamps' }, [
      ...trialLabels(doc).map(categoryChip), checked ? trialStatusChip(checked.status) : null, exampleStamp(doc),
      doc.exploratory ? chip(t('chip.exploratory'), 'chip-pending') : null, doc.confirmation_pending === true ? chip(t('chip.pending'), 'chip-pending') : null,
    ]),
    checked ? el('p', { class: 'card-key' }, el('strong', { text: t('pred.errorsValue', { model: errorOf(checked.residuals?.model), baseline: errorOf(checked.residuals?.baseline) }) })) : null,
    plot,
    details([
      el('p', { class: 'panel-note', text: categoryNote(category) }),
      doc.exploratory ? el('p', { class: 'note', text: t('pred.exploratory', { id: doc.revises ?? '—' }) }) : null,
      doc.confirmation_pending === true ? el('p', { class: 'panel-note warn', text: t('ledger.confirmationPendingNote') }) : null,
      facts,
      predicted,
      verificationBlock(verification, doc),
      limitations.length ? el('div', {}, [
        el('h4', { text: t('pred.limitations') }),
        el('ul', {}, limitations.map((key) => el('li', { text: tData(key, 'limit.unknown') }))),
      ]) : null,
    ]),
    el('p', {}, el('a', { class: 'button-link', href: `?page=predictions${doc.example ? '&fixtures=1' : ''}${verification?.state === 'ok' && doc.quantity === 'position' ? `&trial=${bundle.id}` : ''}`, text: t('pred.toLedger') })),
  ]);
}

/**
 * entry: the target entry (or null for a custom position). indexState: the index load result.
 * loadTrial(id) resolves to a contract trial bundle.
 */
export async function renderPrediction(host, { entry, indexState, loadTrial }) {
  host.replaceChildren(note(t('loading')));
  if (!entry) {
    host.replaceChildren(note(t('pred.custom')));
    return;
  }
  if (entry.seeOnly || entry.prediction.status === 'see_only') {
    host.replaceChildren(note(t('pred.seeOnly')));
    return;
  }
  if (indexState?.state !== 'ok') {
    host.replaceChildren(note(t('pred.indexMissing')));
    return;
  }
  if (!entry.prediction.trialIds.length) {
    host.replaceChildren(note(t('pred.none')));
    return;
  }
  const bundles = await Promise.all(entry.prediction.trialIds.map((id) => loadTrial(id)));
  host.replaceChildren(...bundles.map(trialCard));
}

// ---------- Evidence ----------

function checksText(checks = {}) {
  return Object.entries(checks).map(([name, value]) => `${has(`checkName.${name}`) ? t(`checkName.${name}`) : name}: ${t(`check.${value}`)}`).join(', ');
}

function investigationEvidence(doc) {
  const observations = dataTable({
    caption: t('evidence.observations'),
    summary: t('evidence.observations'),
    columns: [t('col.observation'), t('col.start'), t('col.response'), t('col.release'), t('col.flagged')],
    rows: (doc.observations ?? []).map((obs) => [
      obs.obs_key,
      obs.t_start_utc ?? '—',
      obs.response ? `${formatNumber(obs.response.centre_um, 3)} ± ${formatNumber(obs.response.width_um / 2, 3)}` : '—',
      has(`release.${obs.collection}`) ? t(`release.${obs.collection}`) : obs.collection,
      Number.isFinite(obs.flagged_fraction) ? `${formatNumber(obs.flagged_fraction * 100, 1)}%` : '—',
    ]),
  });
  const comparisons = dataTable({
    caption: t('evidence.comparisons'),
    summary: t('evidence.comparisons'),
    columns: [t('col.pair'), t('col.grade'), t('col.checks'), t('col.reasons'), t('col.views')],
    rows: (doc.comparisons ?? []).map((comparison) => [
      `${comparison.a} → ${comparison.b}`,
      t(`grade.${comparison.grade}`),
      checksText(comparison.checks),
      comparisonReasons(comparison).map((key) => tData(key, 'explain.unknown')).join(' '),
      (comparison.modes ?? []).map((mode) => t(`mode.${mode === 'side_by_side' ? 'side' : mode === 'difference' ? 'diff' : mode}`)).join(', '),
    ]),
  });
  const values = dataTable({
    caption: t('evidence.values'),
    summary: t('evidence.values'),
    columns: [t('col.quantity'), t('col.value'), t('col.kind'), t('col.status')],
    rows: (doc.measurements ?? []).map((measurement) => [
      quantityLabel(measurement.quantity),
      measurementValue(measurement),
      t(`content.${measurement.content_type}`),
      t(`mstatus.${measurement.status}`),
    ]),
  });
  return [
    exampleStamp(doc),
    el('p', { text: t('evidence.coverage', {
      used: String(doc.coverage?.observations_used ?? '—'),
      listed: String(doc.coverage?.observations_listed ?? '—'),
      fov: String(doc.coverage?.available_fov_deg ?? '—'),
    }) }),
    el('p', { text: t('evidence.pipeline', { version: doc.pipeline?.version ?? '—', dataset: doc.dataset_version ?? '—' }) }),
    observations,
    comparisons,
    values,
    doc.legacy?.status ? note(t('evidence.legacyStatus', { status: doc.legacy.status })) : null,
    ...(doc.credits_keys ?? []).map((key) => el('p', { class: 'credit', text: tData(key, 'explain.unknown') })),
  ];
}

function legacyEvidence(legacy) {
  const { frames, meta, custom } = legacy;
  if (!frames?.length) return custom ? [note(t('evidence.custom'))] : [];
  const times = frames.map((frame) => frame.mjd);
  const releases = new Map();
  for (const frame of frames) releases.set(frame.release, (releases.get(frame.release) ?? 0) + 1);
  const releaseText = [...releases.entries()].sort().map(([release, count]) => t('release.count', {
    label: has(`release.${release}`) ? t(`release.${release}`) : release,
    count: String(count),
  })).join(', ');
  return [
    el('h3', { text: t('evidence.legacyTitle') }),
    note(custom ? t('evidence.custom') : t(legacy.kind === 'rebuilt' ? 'evidence.rebuiltLead' : 'evidence.legacyLead')),
    factList([
      [t('evidence.frames'), t('evidence.framesValue', {
        shown: String(frames.length), total: String(meta?.total ?? '—'), available: String(meta?.available ?? '—'),
      })],
      [t('evidence.dates'), String(new Set(frames.map((frame) => frame.visit)).size)],
      [t('evidence.span'), `${formatUtc(mjdToDate(Math.min(...times)))} → ${formatUtc(mjdToDate(Math.max(...times)))}`],
      [t('evidence.releases'), releaseText],
      [t('evidence.obsIds'), String(new Set(frames.map((frame) => frame.obsId)).size)],
    ]),
  ];
}

/**
 * investigation: contract load result (or null); legacy: { frames, meta, custom }; epochs: { matched, total };
 * download: { href, file, saveAs, name } of the target's published investigation file (task B30), or null.
 */
export function renderEvidence(host, { investigation, legacy, epochs, download = null }) {
  const parts = [];
  if (investigation?.state === 'ok') {
    parts.push(...investigationEvidence(investigation.doc));
    if (epochs?.total) {
      parts.push(note(t(epochs.preview ? 'evidence.previewEpochs' : 'evidence.epochsMatched', {
        matched: String(epochs.matched), total: String(epochs.total),
      })));
    }
  }
  else if (!legacy?.custom) parts.push(note(investigation && investigation.state !== 'missing' ? stateText(investigation) : t('evidence.waiting')));
  parts.push(...legacyEvidence(legacy ?? {}));
  if (investigation?.state === 'ok' && download) parts.push(downloadLine([download], download.name));
  host.replaceChildren(...parts.filter(Boolean));
}

/** The note above the quick-look spectrum: whether a validated spectrum exists. */
export function renderSpectrumNote(host, { investigation }) {
  const validated = investigation?.state === 'ok' && investigation.doc.capabilities?.spectrum === true;
  host.replaceChildren(...(validated ? [] : [note(t('spectrum.validated'))]));
}
