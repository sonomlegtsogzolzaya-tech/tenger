// Two small dialogs reachable from the top bar on every page: the keyboard shortcuts (also opened with "?")
// and "What TENGER can and can't see". Native <dialog>: focus stays inside, Escape closes, focus returns.
import { $, details, el } from './dom.js';
import { t } from './i18n.js';
import { honestyFacts, limitsNumbers } from './limits.js';
import { readDepth } from './planetx.js';

/** Shortcut groups: [title key, [[keys key, action key], ...]]. Every row is a real handler in the app. */
export const SHORTCUTS = [
  ['keys.group.page', [['keys.k.help', 'keys.a.help'], ['keys.k.escape', 'keys.a.escape'], ['keys.k.tab', 'keys.a.tab']]],
  ['keys.group.viewer', [['keys.k.space', 'keys.a.viewerSpace'], ['keys.k.leftRight', 'keys.a.viewerArrows'], ['keys.k.escape', 'keys.a.viewerEscape']]],
  ['keys.group.game', [['keys.k.arrows', 'keys.a.gameArrows'], ['keys.k.shiftArrows', 'keys.a.gameFast'], ['keys.k.enter', 'keys.a.gameEnter']]],
  ['keys.group.reveal', [['keys.k.nextStep', 'keys.a.revealNext'], ['keys.k.prevStep', 'keys.a.revealBack'], ['keys.k.homeEnd', 'keys.a.revealEnds'], ['keys.k.escape', 'keys.a.revealClose']]],
  ['keys.group.time', [
    ['keys.k.space', 'keys.a.timeSpace'], ['keys.k.leftRight', 'keys.a.timeArrows'], ['keys.k.live', 'keys.a.timeLive'],
    ['keys.k.enter', 'keys.a.flyEnter'], ['keys.k.escape', 'keys.a.flyEscape'],
  ]],
];

/** "It can" (task B19): the dialog and the About page show the same list. */
export const CAN_DO = ['pictures', 'moved', 'positions', 'predict', 'detect', 'forecasts', 'teach', 'search'];
/** "Its limits, and what we do about them": each limit and, on a line starting with "→", what we do about it. */
export const LIMITS_DO = ['planetNine', 'blend', 'saturated', 'proof'];

// Numbers from the data files (limits.js), loaded the first time the list is drawn; until then each sentence is
// shown without its number, never with an invented one.
let numbers = {};
let facts = { loaded: false };
let loading = null;
const hosts = new Set();
const json = (path) => fetch(path).then((response) => (response.ok ? response.json() : null)).catch(() => null);
const count = (value) => new Intl.NumberFormat('en').format(value);
const andList = (items) => new Intl.ListFormat('en', { type: 'conjunction' }).format(items);

function canText(id) {
  if (id === 'positions' && numbers.gaiaPct !== null && numbers.gaiaPct !== undefined) return t('limits.can.positions', { pct: String(numbers.gaiaPct) });
  if (id === 'positions') return t('limits.can.positionsPlain');
  if (id === 'detect' && numbers.injected) return t('limits.can.detect', { n: count(numbers.injected) });
  if (id === 'detect') return t('limits.can.detectPlain');
  if (id === 'predict') return honestyTexts(facts).predict;
  return t(`limits.can.${id}`);
}

function limitText(id) {
  if (id === 'blend' && numbers.blendArcsec) return t('limits.limit.blend', { arcsec: String(numbers.blendArcsec) });
  if (id === 'blend') return t('limits.limit.blendPlain');
  if (id === 'saturated') return honestyTexts(facts).saturatedLimit;
  return t(`limits.limit.${id}`);
}

function doText(id) {
  if (id === 'planetNine' && Number.isFinite(numbers.low) && Number.isFinite(numbers.high)) {
    return t(numbers.low === numbers.high ? 'limits.do.planetNineOne' : 'limits.do.planetNine', { low: String(numbers.low), high: String(numbers.high) });
  }
  if (id === 'planetNine') return t('limits.do.planetNinePlain');
  if (id === 'saturated') return honestyTexts(facts).saturatedDo;
  return t(`limits.do.${id}`);
}

/**
 * Task B32a: the three lines that come from the scoreboard and the trial and investigation files (limits.js
 * honestyFacts): real tests and practice runs; which targets saturate; what we do about it, with RW Aurigae's real
 * reason. Before the files load (or without them) each line is shown without names, never with invented ones.
 */
export function honestyTexts(f = {}) {
  const predict = f.loaded && f.practice?.length && (f.real?.length || f.asteroids)
    ? t('limits.can.predict', { real: andList([...f.real, ...(f.asteroids ? [t('limits.asteroids')] : [])]), practice: f.practice.join(', ') })
    : t('limits.can.predictPlain');
  if (!f.saturated?.length) return { predict, saturatedLimit: t('limits.limit.saturatedPlain'), saturatedDo: t('limits.do.saturated') };
  const facts = f;
  const parts = [];
  if (facts.positionInstead.length) parts.push(t('limits.do.satPosition', { names: andList(facts.positionInstead) }));
  if (facts.tooLittle.length) parts.push(t(facts.tooLittle.length > 1 ? 'limits.do.satTooLittleMany' : 'limits.do.satTooLittleOne', { names: andList(facts.tooLittle) }));
  const first = parts.join('; ');
  const pattern = facts.noPattern.map(({ name, points }) => (Number.isFinite(points) ? t('limits.do.noPattern', { name, n: count(points) }) : t('limits.do.noPatternPlain', { name })));
  return {
    predict,
    saturatedLimit: t('limits.limit.saturated', { names: andList(facts.saturated) }),
    saturatedDo: [`→ ${first.charAt(0).toUpperCase()}${first.slice(1)}.`, ...pattern].join(' '),
  };
}

function fill(host) {
  // "How it works" (task B30) shows only the limits: each in one line, what we do about them in closed Details.
  if (host.dataset.only === 'cannot') {
    host.replaceChildren(
      el('ul', { class: 'limits-list' }, LIMITS_DO.map((id) => el('li', { text: limitText(id) }))),
      details(el('ul', { class: 'limits-list' }, LIMITS_DO.map((id) => el('li', { class: 'limits-do', text: doText(id) }))), { label: t('method.cannot.do') }),
    );
    return;
  }
  host.replaceChildren(
    el('section', { class: 'limits-group can' }, [el('h3', { text: t('limits.canTitle') }), el('ul', {}, CAN_DO.map((id) => el('li', { text: canText(id) })))]),
    el('section', { class: 'limits-group cannot' }, [
      el('h3', { text: t('limits.cannotTitle') }),
      el('ul', { class: 'limits-list' }, LIMITS_DO.map((id) => el('li', {}, [el('p', { text: limitText(id) }), el('p', { class: 'limits-do', text: doText(id) })]))),
    ]),
  );
}

/**
 * Draws the two lists into host (the dialog's body or the About card) and fills in the numbers once loaded.
 * only: 'cannot' draws the limits alone ("How it works").
 */
export function renderLimits(host, { only = null } = {}) {
  if (!host) return;
  if (only) host.dataset.only = only;
  for (const each of hosts) if (!each.isConnected && each !== host) hosts.delete(each);
  hosts.add(host);
  fill(host);
  loading ??= Promise.all([json('data/barnard/investigation.json'), json('data/planetx/depth.json'), json('data/index.json')]).then(async ([barnard, depth, index]) => {
    numbers = limitsNumbers({ barnard, depth: readDepth(depth) });
    for (const each of hosts) fill(each);
    // Task B32a: the scoreboard, and for each brightness trial its target's investigation and its prediction.
    const board = index?.scoreboard_path ? await json(`data/${index.scoreboard_path}`) : null;
    const brightness = (board?.rows ?? []).filter((row) => row.quantity === 'brightness');
    const pathOf = (key) => index?.targets?.find((target) => target.key === key)?.investigation_path;
    const [investigations, predictions] = await Promise.all([
      Promise.all(brightness.map((row) => (pathOf(row.target_key) ? json(`data/${pathOf(row.target_key)}`) : null))),
      Promise.all(brightness.map((row) => json(`data/trials/${row.trial_id}/prediction.json`))),
    ]);
    facts = honestyFacts({
      index, board,
      investigations: { barnard, ...Object.fromEntries(brightness.map((row, at) => [row.target_key, investigations[at]])) },
      predictions: Object.fromEntries(brightness.map((row, at) => [row.trial_id, predictions[at]])),
    });
    for (const each of hosts) fill(each);
  });
}

function keyCaps(text) {
  return el('span', { class: 'keycaps' }, text.split(' ').map((part) => (part === '/' || part === '+' ? el('span', { class: 'key-sep', text: part }) : el('kbd', { text: part }))));
}

function fillShortcuts() {
  // How to search (moved here from under the Home search box, task B12), then the keyboard shortcuts.
  const search = el('section', { class: 'keys-group' }, [el('h3', { text: t('keys.group.search') }), el('p', { class: 'note', text: t('search.help') })]);
  $('shortcuts-body').replaceChildren(search, ...SHORTCUTS.map(([title, rows]) => el('section', { class: 'keys-group' }, [
    el('h3', { text: t(title) }),
    el('dl', {}, rows.flatMap(([keys, action]) => [el('dt', {}, keyCaps(t(keys))), el('dd', { text: t(action) })])),
  ])));
}

function fillLimits() {
  renderLimits($('limits-body'));
}

export function openDialog(id) {
  const dialog = $(id);
  if (!dialog || dialog.open) return;
  if (id === 'shortcuts') fillShortcuts();
  if (id === 'limits') fillLimits();
  dialog.showModal();
}

const typing = (target) => target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

export function initHelp({ onOpen = () => {} } = {}) {
  for (const button of document.querySelectorAll('[data-dialog]')) {
    button.addEventListener('click', () => {
      onOpen();
      openDialog(button.dataset.dialog);
    });
  }
  for (const dialog of document.querySelectorAll('dialog.sheet')) {
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
    // A link to another page ("How it works", task B30) closes the sheet as the page changes.
    for (const pageLink of dialog.querySelectorAll('[data-page-link]')) pageLink.addEventListener('click', () => dialog.close());
    // A click on the dimmed backdrop (outside the sheet's box) closes it too.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  document.addEventListener('keydown', (event) => {
    const question = event.key === '?' || (event.key === '/' && event.shiftKey);
    if (!question || event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) return;
    if (document.querySelector('dialog.sheet[open]')) return;
    event.preventDefault();
    onOpen();
    openDialog('shortcuts');
  });
}
