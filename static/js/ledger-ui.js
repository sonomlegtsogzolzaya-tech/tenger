// Predictions page (task B4): the scoreboard summary, one card per trial, the open forecasts and the
// See-only targets, built only from the trial files Session A publishes (DATA-CONTRACT V1 §6–10 and V5).
// Until real trial files exist, main.js hands this page the labelled development fixtures instead.
import { covarianceEllipse } from './coords.js';
import { $, chip, dataTable, details, downloadLine, el, formatNumber } from './dom.js';
import { TRIAL_FILES, trialFilePath } from './method.js';
import { has, t, tData } from './i18n.js';
import { categoryLabel, categoryNote, categoryTerm, exampleChip } from './labels.js';
import { asteroidLines, checkLines, itemName, itemSentence, storyChipKey, storyModel, untestedLine } from './predict-story.js';
import {
  CATEGORIES, forecastModel, formatArcsec, isOpenForecast, ledgerTrialIds, niceLength, predictedOf, revealModel, scoreboardTable, sortByStatus,
  trialLabels, trialStatus,
} from './ledger.js';
import { dateOfMjd, labelChips, receiptLine, residualTable, statusChip, utcText } from './ledger-parts.js';
import { closeReveal, goToStep, initReveal, openReveal, revealTrialId } from './reveal.js';
import { forecastRows, HINDCAST_PATH, POSTMORTEM_PATH, readHindcast, readPostmortem } from './postmortem.js';
import { whyWeMissed } from './postmortem-ui.js';
import { batchSection } from './batch-ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHART = 260;
const ZOOM_CHART = 150;

/** { source, fallback, fixtures, nameOf, investigateHref, onChange } from main.js. */
let context = null;
/** The loaded ledger: { boardDoc, cards, forecasts, seeOnly, bundles } (a promise until it resolves). */
let ledger = null;
let pendingTrial = null;
let pendingStep = null;

function svg(name, attributes = {}, text) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

const nameOf = (key) => context?.nameOf(key) ?? key ?? '—';

// ---------- Loading ----------

/** An optional JSON file next to the trials (the Pluto post-mortem and hindcast); null when absent or unreadable. */
async function optionalJson(path) {
  const url = context.source.url(path);
  if (!url) return null;
  try {
    const response = await fetch(url);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

/** "Why we missed" for a trial the post-mortem explains (null for every other trial). */
function whyFor(trialId, { open = false } = {}) {
  const why = ledgerWhy;
  if (!why?.postmortem || why.postmortem.trialId !== trialId) return null;
  return whyWeMissed(why, { open });
}

let ledgerWhy = null;

async function load() {
  const { source } = context;
  const index = await source.index();
  const indexDoc = index.state === 'ok' ? index.doc : null;
  const board = await source.scoreboard(indexDoc?.scoreboard_path);
  const boardDoc = board.state === 'ok' ? board.doc : null;
  // Trials of the asteroid batch are shown in its own section, not again as single cards. The scoreboard names them
  // (V13 asteroid_batch.rows), so they are not loaded twice here and their missing verification files are never
  // requested by the ledger; the batch loader reads them with the batch's own status.
  const batchRows = Array.isArray(boardDoc?.asteroid_batch?.rows) ? boardDoc.asteroid_batch.rows : [];
  const listedInBatch = new Set(batchRows.map((row) => row?.trial_id).filter((id) => typeof id === 'string'));
  const [bundles, batch] = await Promise.all([
    Promise.all(ledgerTrialIds(indexDoc, boardDoc).filter((id) => !listedInBatch.has(id)).map((id) => source.trial(id))),
    context.loadBatch ? context.loadBatch() : null,
  ]);
  const inBatch = new Set([...listedInBatch, ...(batch?.batch?.trialIds ?? [])]);
  const rowOf = (id) => (Array.isArray(boardDoc?.rows) ? boardDoc.rows.find((row) => row?.trial_id === id) ?? null : null);
  const cards = [];
  const forecasts = [];
  for (const bundle of bundles) {
    if (inBatch.has(bundle.id)) continue;
    const card = { bundle, row: rowOf(bundle.id), status: trialStatus(bundle, rowOf(bundle.id)) };
    if (isOpenForecast(bundle, boardDoc)) forecasts.push(card);
    else cards.push(card);
  }
  // Real files only: the example fixtures have no post-mortem.
  if (!context.fallback && !context.fixtures) {
    const [postmortem, hindcast] = await Promise.all([optionalJson(POSTMORTEM_PATH), optionalJson(HINDCAST_PATH)]);
    ledgerWhy = { postmortem: readPostmortem(postmortem), hindcast: readHindcast(hindcast), forecasts: forecastRows(bundles) };
  } else {
    ledgerWhy = null;
  }
  const seeOnly = Array.isArray(boardDoc?.see_only)
    ? boardDoc.see_only
    : (indexDoc?.targets ?? []).filter((target) => target?.prediction?.status === 'see_only').map((target) => target.key);
  return { index, board, boardDoc, cards: sortByStatus(cards), forecasts, seeOnly, bundles, batch };
}

// ---------- Scoreboard summary ----------

function boardSection(data) {
  const host = $('ledger-board');
  const table = scoreboardTable(data.boardDoc);
  if (!table) {
    host.replaceChildren(
      el('h2', { id: 'ledger-board-title', text: t('ledger.boardTitle') }),
      el('p', { class: 'panel-note', text: data.board.state === 'missing' ? t('ledger.boardMissing') : t(`state.${data.board.state}`) }),
    );
    return;
  }
  const forecastNames = (table.openForecasts ?? []).map((id) => {
    const bundle = data.bundles.find((item) => item.id === id);
    const key = bundle?.trial?.doc?.target_key;
    return key ? nameOf(key) : id;
  });
  // The full table, its notes and the trial types sit inside the closed "Full scoreboard and trial types" (task B15:
  // a static <details> in index.html).
  host.replaceChildren(...[
    el('p', { text: t('ledger.lead') }),
    el('div', { class: 'board-head' }, [
      el('h2', { id: 'ledger-board-title', text: t('ledger.boardTitle') }),
      table.example ? exampleChip({ example: true }) : null,
    ]),
    el('p', { class: 'note', text: t('ledger.boardLead', { utc: utcText(table.generatedUtc) }) }),
    el('div', { class: 'table-scroll' }, el('table', { class: 'board-table' }, [
      el('caption', { class: 'sr-only', text: t('ledger.boardCaption') }),
      el('thead', {}, el('tr', {}, [
        el('th', { scope: 'col', text: t('ledger.col.category') }),
        ...table.statuses.map((status) => el('th', { scope: 'col', class: `col-${status}`, text: has(`ledger.status.${status}`) ? t(`ledger.status.${status}`) : status })),
      ])),
      el('tbody', {}, table.rows.map((row) => el('tr', {}, [
        el('th', { scope: 'row' }, chip(categoryLabel(row.category), `chip-category-${row.category}`)),
        ...row.cells.map((cell, index) => el('td', { class: `col-${table.statuses[index]}${cell ? ' nonzero' : ''}`, text: cell === null ? '—' : String(cell) })),
      ]))),
    ])),
    el('ul', { class: 'board-notes' }, [
      el('li', { text: t('ledger.noRate') }),
      table.openForecasts ? el('li', { text: forecastNames.length ? t('ledger.boardOpen', { names: forecastNames.join(', ') }) : t('ledger.boardOpenNone') }) : null,
      el('li', { text: table.seeOnly.length ? t('ledger.boardSeeOnly', { names: table.seeOnly.map(nameOf).join(', ') }) : t('ledger.boardSeeOnlyNone') }),
    ]),
    el('h3', { class: 'category-title', text: t('ledger.categoriesTitle') }),
    el('dl', { class: 'category-list' }, CATEGORIES.flatMap((category) => [
      el('dt', {}, [chip(categoryLabel(category), `chip-category-${category}`), el('span', { class: 'sr-only', text: ` ${categoryTerm(category)}` })]),
      el('dd', { text: `${categoryTerm(category)}: ${categoryNote(category)}` }),
    ])),
  ]);
}

// ---------- Counts for the headline inside the full scoreboard ----------

/** "2 hits", "1 miss", "4 with too little data". */
const counted = (status, n) => (has(`ledger.count.${status}.one`) ? t(`ledger.count.${status}.${n === 1 ? 'one' : 'many'}`, { n: String(n) }) : t('ledger.count.other', { n: String(n) }));

/** "2 hits, 1 miss, 4 with too little data" from a list of statuses, results first. */
function statusSummary(statuses) {
  const order = ['hit', 'miss', 'waiting', 'insufficient_data', 'ambiguous', 'invalid_comparison'];
  const counts = new Map();
  for (const status of statuses) counts.set(status ?? 'other', (counts.get(status ?? 'other') ?? 0) + 1);
  const rank = (status) => (order.includes(status) ? order.indexOf(status) : order.length);
  return [...counts].sort((a, b) => rank(a[0]) - rank(b[0])).map(([status, n]) => counted(status, n)).join(', ');
}

// ---------- One card per trial ----------

function predictedLine(trial, prediction, threshold) {
  const what = predictedOf(prediction, trial);
  const date = dateOfMjd(what.tMjd);
  if (!prediction) return el('p', { class: 'muted', text: t('ledger.notFrozen', { date }) });
  if (what.kind === 'position') {
    const region = what.model.cov_arcsec2 && threshold ? covarianceEllipse(what.model.cov_arcsec2, threshold) : null;
    return el('div', { class: 'predicted' }, [
      el('p', {}, [el('strong', { text: t('ledger.predPosition', { date }) })]),
      el('p', { class: 'mono', text: t('ledger.positionValue', {
        ra: `${formatNumber(what.model.ra_deg, 5)}°`,
        dec: `${formatNumber(what.model.dec_deg, 5)}°`,
        region: region ? t('ledger.regionValue', { major: formatNumber(region.major, 1), minor: formatNumber(region.minor, 1) }) : t('ledger.regionUnknown'),
      }) }),
      what.track.length ? el('p', { class: 'note', text: t('ledger.trackWindow', { start: dateOfMjd(what.track[0].t_mjd), end: dateOfMjd(what.track.at(-1).t_mjd), count: String(what.track.length) }) }) : null,
    ]);
  }
  if (what.kind === 'value') {
    return el('div', { class: 'predicted' }, [
      el('p', {}, [el('strong', { text: t('ledger.predValue', { date }) })]),
      el('p', { class: 'mono', text: t('ledger.valueValue', {
        value: formatNumber(what.model.value, 2), sigma: Number.isFinite(what.model.sigma) ? formatNumber(what.model.sigma, 2) : '—', unit: what.model.unit ?? '',
      }) }),
    ]);
  }
  return el('p', { class: 'muted', text: t('ledger.predNone', { date }) });
}

function stamps(trial, row, extra = []) {
  return el('p', { class: 'stamps' }, [
    ...labelChips(trialLabels(trial)),
    ...extra,
    trial?.confirmation_pending === true ? chip(t('chip.pending'), 'chip-pending') : null,
    trial?.exploratory === true ? chip(t('chip.exploratory'), 'chip-pending') : null,
    row?.counts_as_prospective === true ? chip(t('score.counts'), 'chip-trial-hit') : null,
    exampleChip(trial),
  ]);
}

function cardHead(trial, id, status) {
  const quantity = trial?.quantity;
  return el('div', { class: 'card-head' }, [
    el('div', {}, [
      el('h3', { text: trial ? nameOf(trial.target_key) : id }),
      el('p', { class: 'note', text: has(`ledger.quantity.${quantity}`) ? t(`ledger.quantity.${quantity}`) : (quantity ?? '—') }),
    ]),
    status,
  ]);
}

function trialCard(card) {
  const { bundle, row, status } = card;
  const trial = bundle.trial?.state === 'ok' ? bundle.trial.doc : null;
  if (!trial) {
    return el('article', { class: 'ledger-card glass' }, [
      cardHead(null, bundle.id, statusChip(null)),
      el('p', { class: 'panel-note', text: t('ledger.trialUnreadable', { id: bundle.id, state: t(`state.${bundle.trial?.state ?? 'missing'}`) }) }),
    ]);
  }
  const prediction = bundle.prediction?.state === 'ok' ? bundle.prediction.doc : null;
  const verification = bundle.verification?.state === 'ok' ? bundle.verification.doc : null;
  const threshold = trial.scoring?.threshold_d2;
  const position = trial.quantity === 'position';
  const canReveal = Boolean(revealModel(bundle));
  const warnings = [];
  if (status.conflict) warnings.push(t('ledger.conflict', { board: row.status, file: status.status }));
  if (prediction?.category && prediction.category !== trial.category) warnings.push(t('ledger.categoryConflict', { prediction: categoryLabel(prediction.category), trial: categoryLabel(trial.category) }));
  if (bundle.prediction?.state && !['ok', 'missing'].includes(bundle.prediction.state)) warnings.push(t('ledger.fileState', { file: 'prediction.json', state: t(`state.${bundle.prediction.state}`) }));
  if (bundle.verification?.state && !['ok', 'missing'].includes(bundle.verification.state)) warnings.push(t('ledger.fileState', { file: 'verification.json', state: t(`state.${bundle.verification.state}`) }));
  const reason = status.reasonKey ? tData(status.reasonKey, 'explain.unknown') : null;
  // At a glance: name, result and chips, and the error as the key number; the rest under "Details" (task B12).
  const modelError = Number.isFinite(row?.model_error_arcsec) ? formatArcsec(row.model_error_arcsec) : null;
  const baselineError = Number.isFinite(row?.baseline_error_arcsec) ? formatArcsec(row.baseline_error_arcsec) : null;
  return el('article', { class: `ledger-card glass status-${status.status ?? 'none'}`, id: `trial-${bundle.id}` }, [
    cardHead(trial, bundle.id, statusChip(status.status)),
    stamps(trial, row),
    modelError ? el('p', { class: 'card-key' }, el('strong', { text: baselineError ? t('ledger.cardOff', { model: modelError, baseline: baselineError }) : t('ledger.cardOffModel', { model: modelError }) })) : null,
    details([
      predictedLine(trial, prediction, threshold),
      receiptLine(bundle.receipt),
      trial.exploratory === true ? el('p', { class: 'note', text: t('ledger.exploratory') }) : null,
      trial.confirmation_pending === true ? el('p', { class: 'note', text: t('ledger.confirmationPendingNote') }) : null,
      status.status === 'waiting' ? el('p', { class: 'note', text: t('ledger.waitingNote', { date: dateOfMjd(trial.holdout?.t_mjd) }) }) : null,
      reason ? el('p', { class: 'panel-note', text: reason }) : null,
      verification ? residualTable(verification.residuals, {
        position, limit: Number.isFinite(threshold) ? Math.sqrt(threshold) : null, unit: verification.observed?.unit ?? '',
      }) : null,
      verification ? el('p', { class: 'note', text: t('ledger.checkedOn', { utc: utcText(verification.revealed_utc) }) }) : null,
      trialDownloads(bundle, nameOf(trial.target_key)),
    ]),
    verification ? whyFor(bundle.id) : null,
    ...warnings.map((text) => el('p', { class: 'panel-note warn', text })),
    el('div', { class: 'card-actions' }, [
      canReveal ? el('button', {
        type: 'button', class: 'primary', text: t('ledger.watchReveal'), dataset: { reveal: bundle.id },
        onclick: () => showReveal(bundle.id),
      }) : null,
      el('a', { class: 'button-link', href: context.investigateHref(trial.target_key), text: t('ledger.openInvestigation', { name: nameOf(trial.target_key) }) }),
      trial.target_key === 'pluto' ? el('a', { class: 'button-link', href: '?page=loop', text: t('loop.link') }) : null,
    ]),
  ]);
}

// ---------- The story: results for a first-time visitor (task B15) ----------

const okDoc = (result) => (result?.state === 'ok' ? result.doc : null);
const bundleById = (data, id) => data.bundles.find((item) => item.id === id) ?? data.batch?.bundles?.find((item) => item?.id === id) ?? null;
/** "Download the data (JSON)" (task B30): the trial's published files that loaded, as they are on the server. */
function trialDownloads(bundle, name) {
  if (!bundle?.id) return null;
  const files = TRIAL_FILES.filter((file) => bundle[file]?.state === 'ok').map((file) => ({
    href: context.source.url(trialFilePath(bundle.id, file)), file: `${file}.json`, saveAs: `${bundle.id}-${file}.json`,
  }));
  return downloadLine(files, name);
}
const boardRow = (data, id) => (Array.isArray(data.boardDoc?.rows) ? data.boardDoc.rows.find((row) => row?.trial_id === id) ?? null : null);

/** Everything a story card used to show at a glance, now under its closed "Details". */
function storyDetails(entry, bundle, data) {
  const trial = okDoc(bundle?.trial);
  const row = entry.kind === 'trial' ? boardRow(data, entry.id) : null;
  const parts = [
    entry.gaia ? el('p', {}, el('strong', { text: t('story.gaia') })) : null,
    entry.gaia ? el('p', { class: 'note', text: t('story.gaiaNote') }) : null,
    el('p', { class: 'note', text: t('story.typeNote', { term: categoryTerm(entry.category) }) }),
    trial ? stamps(trial, row) : null,
    entry.pending ? el('p', { class: 'note', text: t('story.pendingNote') }) : null,
  ];
  if (entry.kind === 'asteroid') {
    return [...parts, bundle ? receiptLine(bundle.receipt) : null, el('p', { class: 'note', text: t('story.asteroidMore') }), trialDownloads(bundle, itemName(entry, nameOf))];
  }
  if (!trial) return parts;
  const prediction = okDoc(bundle.prediction);
  const verification = okDoc(bundle.verification);
  const threshold = trial.scoring?.threshold_d2;
  const modelError = Number.isFinite(row?.model_error_arcsec) ? formatArcsec(row.model_error_arcsec) : null;
  const baselineError = Number.isFinite(row?.baseline_error_arcsec) ? formatArcsec(row.baseline_error_arcsec) : null;
  const status = trialStatus(bundle, row);
  return [
    ...parts,
    modelError ? el('p', { class: 'card-key' }, el('strong', { text: baselineError ? t('ledger.cardOff', { model: modelError, baseline: baselineError }) : t('ledger.cardOffModel', { model: modelError }) })) : null,
    predictedLine(trial, prediction, threshold),
    receiptLine(bundle.receipt),
    trial.exploratory === true ? el('p', { class: 'note', text: t('ledger.exploratory') }) : null,
    verification ? residualTable(verification.residuals, {
      position: trial.quantity === 'position', limit: Number.isFinite(threshold) ? Math.sqrt(threshold) : null, unit: verification.observed?.unit ?? '',
    }) : null,
    verification ? el('p', { class: 'note', text: t('ledger.checkedOn', { utc: utcText(verification.revealed_utc) }) }) : null,
    status.conflict ? el('p', { class: 'panel-note warn', text: t('ledger.conflict', { board: row.status, file: status.status }) }) : null,
    trialDownloads(bundle, itemName(entry, nameOf)),
  ];
}

/** One result: name, Hit/Miss, "Real test" or "Practice run", one sentence, the reveal and a small Investigate link. */
function storyCard(entry, { practice }, data) {
  const bundle = entry.bundle ?? bundleById(data, entry.id);
  const trial = okDoc(bundle?.trial);
  const name = itemName(entry, nameOf);
  const chipKey = storyChipKey(entry.category);
  const canReveal = Boolean(bundle && revealModel(bundle));
  return el('article', { class: `ledger-card story-card glass status-${entry.status ?? 'none'}`, id: `trial-${entry.id}` }, [
    el('div', { class: 'card-head' }, [
      el('div', {}, [
        el('h4', { text: name }),
        el('p', { class: 'stamps' }, [chipKey ? chip(t(chipKey), `chip-story chip-category-${entry.category}`) : null, exampleChip(trial)]),
      ]),
      statusChip(entry.status),
    ]),
    el('p', { class: 'story-sentence', text: itemSentence(entry, { practice }) }),
    entry.pending ? el('p', { class: 'story-pending', text: t('story.pending') }) : null,
    el('div', { class: 'card-actions' }, [
      canReveal ? el('button', {
        type: 'button', class: 'primary', text: t('ledger.watchReveal'), dataset: { reveal: entry.id },
        onclick: () => showReveal(entry.id),
      }) : null,
      entry.kind === 'trial' ? el('a', { class: 'text-link', href: context.investigateHref(entry.targetKey), text: t('story.investigate', { name }) }) : null,
      entry.targetKey === 'pluto' ? el('a', { class: 'text-link', href: '?page=loop', text: t('loop.link') }) : null,
    ]),
    details(storyDetails(entry, bundle, data)),
    entry.kind === 'trial' && okDoc(bundle?.verification) ? whyFor(entry.id) : null,
  ]);
}

// Task B22: while "Why we missed" is open on the Pluto card, "Check us in 2027" moves right under that card (a
// layout change only), so the reason and the new forecasts are seen together; closing it puts the card back.
let checkHome = null;
function keepCheckUnderWhy(check) {
  const why = document.querySelector('#story-groups .why-missed');
  if (!why || check.hidden) return;
  if (!checkHome) {
    checkHome = document.createComment('story-check');
    check.before(checkHome);
  }
  const place = () => {
    if (why.open) why.closest('.story-card')?.after(check);
    else checkHome.after(check);
    check.classList.toggle('is-under-why', why.open);
  };
  why.addEventListener('toggle', place);
  place();
}

function storySection(data) {
  const model = storyModel({ board: data.boardDoc, bundles: data.bundles });
  const group = (titleKey, entries, practice) => (entries.length ? el('div', { class: 'story-group' }, [
    el('h3', { text: t(titleKey) }),
    el('div', { class: 'story-cards' }, entries.map((entry) => storyCard(entry, { practice }, data))),
  ]) : null);
  $('story-groups').replaceChildren(...[group('story.results.real', model.real, false), group('story.results.practice', model.practice, true)].filter(Boolean));

  // Could not be tested: one line, then the list (and the old full cards of those targets) under "Details".
  $('story-untested').textContent = untestedLine(model);
  const reason = (item) => (item.reasonKey ? tData(item.reasonKey, 'explain.unknown') : (has(`ledger.status.${item.status}`) ? t(`ledger.status.${item.status}`) : String(item.status ?? '—')));
  $('story-untested-list').replaceChildren(
    ...model.untested.targets.map((item) => el('li', { text: t('story.untested.item', { name: nameOf(item.targetKey), reason: reason(item) }) })),
    ...model.untested.asteroids.map((item) => el('li', { text: t('story.untested.item', { name: t('story.asteroidName', { name: item.name }), reason: reason(item) }) })),
  );
  const shownAbove = new Set([...model.real, ...model.practice].map((entry) => entry.id));
  const rest = data.cards.filter((card) => !shownAbove.has(card.bundle.id));
  $('ledger-list').replaceChildren(...(rest.length || data.cards.length
    ? rest.map(trialCard)
    : [el('p', { class: 'panel-note', text: data.index.state === 'ok' ? t('ledger.none') : t('ledger.indexMissing') })]));

  // The asteroid batch: two lines, the full section under "All 8 asteroids".
  const asteroids = $('story-asteroids');
  asteroids.hidden = !model.asteroids;
  if (model.asteroids) {
    const [title, lead] = asteroidLines(model.asteroids);
    $('story-asteroids-title').textContent = title;
    $('story-asteroids-lead').textContent = lead;
    $('story-asteroids-pending').hidden = !model.asteroids.pending;
    $('story-asteroids-label').textContent = t('story.asteroids.details', { n: String(model.asteroids.n) });
  }

  // Check us in 2027.
  const check = $('story-check');
  check.hidden = !model.check2027;
  if (model.check2027) {
    const [title, text] = checkLines(model.check2027, nameOf);
    $('story-check-title').textContent = title;
    $('story-check-text').textContent = text;
  }
  keepCheckUnderWhy(check);

  // "See how it works with Pluto" opens the Pluto reveal at step 1.
  const button = $('story-pluto');
  const plutoBundle = model.plutoTrialId ? bundleById(data, model.plutoTrialId) : null;
  button.disabled = !(plutoBundle && revealModel(plutoBundle));
  button.dataset.reveal = model.plutoTrialId ?? '';
  button.onclick = () => model.plutoTrialId && showReveal(model.plutoTrialId);
  return model;
}

// ---------- Open forecasts ----------

/** East is left and north is up, as on the sky. */
function plotFrame(view, size) {
  const scale = size / view.span;
  return {
    scale,
    x: (east) => size / 2 - (east - view.east) * scale,
    y: (north) => size / 2 - (north - view.north) * scale,
  };
}

function ellipseAt(frame, point, region, className) {
  if (!region) return null;
  const x = frame.x(point.east);
  const y = frame.y(point.north);
  return svg('ellipse', { cx: x, cy: y, rx: region.major * frame.scale, ry: region.minor * frame.scale, transform: `rotate(${region.angleDeg} ${x} ${y})`, class: className });
}

function scaleBar(frame, size, span) {
  const length = niceLength(span);
  const group = svg('g', { class: 'scale-bar' });
  group.append(
    svg('line', { x1: 12, x2: 12 + length * frame.scale, y1: size - 14, y2: size - 14 }),
    svg('text', { x: 12, y: size - 22 }, formatArcsec(length)),
  );
  return group;
}

function compass(size) {
  const group = svg('g', { class: 'compass' });
  group.append(svg('text', { x: size - 14, y: 18, 'text-anchor': 'end' }, t('reveal.lab.north')));
  group.append(svg('text', { x: size - 28, y: 34, 'text-anchor': 'end' }, t('reveal.lab.east')));
  return group;
}

function forecastSvg(model, view, size, label, { zoom = false } = {}) {
  const frame = plotFrame(view, size);
  const plot = svg('svg', { viewBox: `0 0 ${size} ${size}`, class: `forecast-plot${zoom ? ' zoom' : ''}`, role: 'img', 'aria-label': label });
  plot.append(svg('rect', { x: 0, y: 0, width: size, height: size, class: 'plot-bg' }));
  plot.append(svg('line', { x1: frame.x(0), x2: frame.x(0), y1: 0, y2: size, class: 'axis-line' }));
  plot.append(svg('line', { x1: 0, x2: size, y1: frame.y(0), y2: frame.y(0), class: 'axis-line' }));
  if (!zoom && model.track.length) {
    plot.append(svg('polyline', { points: model.track.map((point) => `${frame.x(point.east)},${frame.y(point.north)}`).join(' '), class: 'track' }));
    for (const point of model.track) {
      const node = ellipseAt(frame, point, point.region, 'region');
      if (node) plot.append(node);
      plot.append(svg('circle', { cx: frame.x(point.east), cy: frame.y(point.north), r: 2.5, class: 'track-dot' }));
    }
    const first = model.track[0];
    const last = model.track.at(-1);
    plot.append(svg('text', { x: frame.x(first.east), y: frame.y(first.north) - 10, class: 'point-label', 'text-anchor': 'middle' }, dateOfMjd(first.tMjd)));
    plot.append(svg('text', { x: frame.x(last.east), y: frame.y(last.north) + 18, class: 'point-label', 'text-anchor': 'middle' }, dateOfMjd(last.tMjd)));
  }
  const region = ellipseAt(frame, model.model, model.model.region, 'region region-model');
  if (region) plot.append(region);
  const x = frame.x(0);
  const y = frame.y(0);
  plot.append(svg('path', { d: `M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z`, class: 'mark-model-dot' }));
  if (model.baseline && Math.abs(model.baseline.east - view.east) < view.span / 2 && Math.abs(model.baseline.north - view.north) < view.span / 2) {
    const bx = frame.x(model.baseline.east);
    const by = frame.y(model.baseline.north);
    plot.append(svg('rect', { x: bx - 5, y: by - 5, width: 10, height: 10, class: 'mark-baseline-dot' }));
  }
  plot.append(scaleBar(frame, size, view.span), compass(size));
  return plot;
}

function forecastChart(prediction, trial, name) {
  const model = forecastModel(prediction, trial);
  if (!model) return null;
  const date = dateOfMjd(model.model.tMjd);
  const baselineDistance = model.baseline ? Math.hypot(model.baseline.east, model.baseline.north) : null;
  const baselineVisible = model.baseline && Math.abs(model.baseline.east - model.view.east) < model.view.span / 2
    && Math.abs(model.baseline.north - model.view.north) < model.view.span / 2;
  const rows = [
    [t('ledger.forecast.reference', { date }), '0.00', '0.00', model.model.region ? formatNumber(model.model.region.major, 2) : '—', model.model.region ? formatNumber(model.model.region.minor, 2) : '—'],
    ...model.track.map((point) => [dateOfMjd(point.tMjd), formatNumber(point.east, 2), formatNumber(point.north, 2),
      point.region ? formatNumber(point.region.major, 2) : '—', point.region ? formatNumber(point.region.minor, 2) : '—']),
  ];
  return el('figure', { class: 'forecast-figure' }, [
    el('div', { class: 'forecast-plots' }, [
      forecastSvg(model, model.view, CHART, t('ledger.forecast.plotLabel', { name, date })),
      model.zoom ? el('div', { class: 'zoom-box' }, [
        forecastSvg(model, model.zoom, ZOOM_CHART, t('ledger.forecast.zoomLabel', { date }), { zoom: true }),
        el('p', { class: 'note', text: t('ledger.forecast.zoom', { date }) }),
      ]) : null,
    ]),
    el('figcaption', {}, [
      el('ul', { class: 'forecast-legend' }, [
        el('li', { class: 'lg-model', text: t('ledger.forecast.legendModel') }),
        el('li', { class: 'lg-region', text: t('ledger.forecast.legendRegion') }),
        model.track.length ? el('li', { class: 'lg-track', text: t('ledger.forecast.legendTrack') }) : null,
        baselineVisible ? el('li', { class: 'lg-baseline', text: t('ledger.forecast.legendBaseline') }) : null,
      ]),
      Number.isFinite(baselineDistance) && !baselineVisible
        ? el('p', { class: 'note', text: t('ledger.forecast.baselineOff', { distance: formatArcsec(baselineDistance) }) }) : null,
    ]),
    dataTable({
      caption: t('ledger.forecast.tableCaption'),
      columns: [t('ledger.forecast.colTime'), t('ledger.col.east'), t('ledger.col.north'), t('ledger.forecast.colMajor'), t('ledger.forecast.colMinor')],
      rows,
    }),
  ]);
}

function forecastCard(card) {
  const { bundle, row } = card;
  const trial = bundle.trial?.state === 'ok' ? bundle.trial.doc : null;
  if (!trial) return trialCard(card);
  const prediction = bundle.prediction?.state === 'ok' ? bundle.prediction.doc : null;
  const name = nameOf(trial.target_key);
  const checkAfter = trial.holdout?.check_after_utc;
  const insufficient = prediction?.prediction_status === 'insufficient_data';
  return el('article', { class: 'ledger-card forecast-card glass', id: `trial-${bundle.id}` }, [
    cardHead(trial, bundle.id, insufficient ? statusChip('insufficient_data') : chip(t('ledger.status.open'), 'chip-trial chip-trial-open')),
    stamps(trial, row),
    el('p', { class: 'check-date' }, [el('strong', {
      text: typeof checkAfter === 'string' ? t('ledger.forecast.checkAfter', { date: utcText(checkAfter).replace(' 00:00 UTC', '') }) : t('ledger.forecast.checkUnknown'),
    })]),
    details([
      predictedLine(trial, prediction, trial.scoring?.threshold_d2),
      receiptLine(bundle.receipt),
      insufficient && prediction.status_reason_key ? el('p', { class: 'panel-note', text: tData(prediction.status_reason_key, 'explain.unknown') }) : null,
      trial.forecast_label_key ? el('p', { class: 'note', text: tData(trial.forecast_label_key, 'explain.unknown') }) : null,
      prediction && !insufficient ? forecastChart(prediction, trial, name) : null,
      el('p', { class: 'note', text: t('ledger.forecast.notCounted') }),
    ]),
    trial.target_key === 'pluto' ? el('p', {}, el('a', { class: 'button-link', href: '?page=loop', text: t('loop.link') })) : null,
  ]);
}

function seeOnlyCard(key) {
  return el('article', { class: 'ledger-card see-only-card glass' }, [
    el('div', { class: 'card-head' }, [el('h3', { text: nameOf(key) }), statusChip('see_only')]),
    details(el('p', { class: 'note', text: t('ledger.seeOnlyNote') })),
  ]);
}

// ---------- Page ----------

function render(data) {
  const banner = $('ledger-source');
  banner.hidden = !(context.fallback || context.fixtures);
  banner.replaceChildren(el('p', { text: t(context.fallback ? 'ledger.fallback' : 'ledger.fixtures') }));
  boardSection(data);
  // The count of every frozen prediction heads the full scoreboard (task B15), counted from the cards.
  $('ledger-trials-title').textContent = data.cards.length ? t('ledger.trialsHeadline', { n: String(data.cards.length), counts: statusSummary(data.cards.map((card) => card.status?.status)) }) : t('ledger.trialsTitle');
  $('ledger-forecasts-title').textContent = data.forecasts.length === 1 ? t('ledger.forecastsHeadlineOne') : data.forecasts.length ? t('ledger.forecastsHeadline', { n: String(data.forecasts.length) }) : t('ledger.forecastsTitle');
  const batch = batchSection(data.batch);
  $('ledger-batch-host').replaceChildren(...(batch ? [batch] : []));
  $('ledger-batch-host').hidden = !batch;
  storySection(data);
  $('ledger-seeonly').replaceChildren(...data.seeOnly.map(seeOnlyCard));
  $('ledger-seeonly-wrap').hidden = !data.seeOnly.length;
  $('ledger-forecast-list').replaceChildren(...(data.forecasts.length
    ? data.forecasts.map(forecastCard)
    : [el('p', { class: 'panel-note', text: t('ledger.forecast.none') })]));
}

/**
 * main.js calls this once the sources are known. source: the contract source to read trials from (real files,
 * or fixtures when nothing real is published: fallback = true); fixtures: the whole site is in ?fixtures=1 mode.
 */
export function initLedger(options) {
  context = options;
  ledger = null;
  initReveal({
    afterVerdict: (bundle) => whyFor(bundle.id),
    imageUrl: (path) => context.source.url(path),
    nameOf,
    loadTraining: (id) => context.source.training(id),
    onClose: () => context.onChange?.(),
  });
}

/** Loads (once) and draws the page; then opens the reveal the URL asked for, if any. */
export async function showLedger() {
  if (!context) return;
  if (!ledger) {
    // The page shows its heading and one loading line until everything is drawn (no layout shift).
    $('page-predictions').dataset.loading = '';
    ledger = load().then((data) => {
      render(data);
      return data;
    }).finally(() => {
      delete $('page-predictions').dataset.loading;
    });
  }
  const data = await ledger;
  if (pendingTrial) {
    const id = pendingTrial;
    const step = pendingStep;
    pendingTrial = null;
    pendingStep = null;
    showReveal(id, { push: false, step });
  }
  return data;
}

/** Opens the reveal of a trial (after the ledger has loaded). */
export async function showReveal(id, { push = true, step = null } = {}) {
  const data = await ledger;
  const bundle = data ? bundleById(data, id) : null;
  if (!bundle || !revealModel(bundle)) {
    context.onMissingTrial?.(id);
    return;
  }
  await openReveal(bundle, { example: Boolean(context.fallback || context.fixtures) });
  // ?step=N (task B30): open at that step, as if Next had been pressed N−1 times.
  if (Number.isInteger(step) && step > 1) goToStep(step - 1, { animate: false });
  context.onChange?.({ push });
}

/** The URL asked for ?trial=<id> (and maybe ?step=N): open it once the page has loaded, or close an open reveal. */
export function syncRevealFromUrl(id, step = null) {
  if (!id) {
    if (revealTrialId()) closeReveal({ notify: false });
    return;
  }
  if (revealTrialId() === id) return;
  if (ledger) showReveal(id, { push: false, step });
  else {
    pendingTrial = id;
    pendingStep = step;
  }
}

export const currentReveal = () => revealTrialId();
