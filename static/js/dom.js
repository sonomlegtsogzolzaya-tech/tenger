// Small DOM helpers shared by the TENGER pages.
import { has, t } from './i18n.js';

export const $ = (id) => document.getElementById(id);

/**
 * Task B32: an element by id for the page shell (main.js), which never checks for null. A missing element (an old
 * cached index.html with newer modules, or the reverse) gives a detached stand-in instead of null, so one missing
 * part never stops the whole page; it is reported once as a warning. Modules that test for null keep $.
 */
const missingParts = new Set();
export function part(id) {
  const node = document.getElementById(id);
  if (node) return node;
  if (!missingParts.has(id)) {
    missingParts.add(id);
    console.warn(`Vestigium: #${id} is not on this page (an older cached file?); that part is skipped.`);
  }
  return document.createElement(id === 'search' ? 'form' : 'div');
}

/** Task B32: the build this page was published with (index.html's <meta name="build">); '' where there is none. */
export const BUILD = (typeof document !== 'undefined' && document.querySelector('meta[name="build"]')?.content) || '';

/**
 * A data file's address with the build version (task B32), so a new deploy never reads an old cached data file:
 * "data/index.json" -> "data/index.json?v=<build>". Other sites, the API and non-data paths are left as they are.
 */
export function versioned(url, build = BUILD, origin = typeof location !== 'undefined' ? location.origin : '') {
  if (!build || typeof url !== 'string') return url;
  if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(url) && !(origin && url.startsWith(`${origin}/`))) return url;
  if (!/(^|\/)data\//.test(url.split('?')[0])) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(build)}`;
}

/** Task B32: every fetch of a data file carries the build version (called once, first thing in main.js). */
export function installVersionedFetch() {
  if (typeof window === 'undefined' || window.fetch.versioned) return;
  const native = window.fetch.bind(window);
  const wrapped = (input, init) => native(versioned(input), init);
  wrapped.versioned = true;
  window.fetch = wrapped;
}

/** Creates an element. props: class, text, dataset, on<event>, other attributes; children may nest. */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  const list = [children].flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);
  node.append(...list);
  return node;
}

/**
 * A closed "Details" disclosure (task B12): the longer explanation, method note, caveat or citation sits right under
 * the part it explains, one click (or Enter) away. Native <details>: keyboard-usable and announced as expanded/collapsed.
 */
export function details(children, { label = t('ui.details'), className = '' } = {}) {
  return el('details', { class: `more-info ${className}`.trim() }, [el('summary', { text: label }), children]);
}

/** A key number as a stat tile (task B12): the number, what it counts, and an optional chip. */
export function statTile({ value, label, badge = null, tone = '' }) {
  return el('div', { class: `stat-tile ${tone}`.trim() }, [el('p', { class: 'stat-value', text: value }), el('p', { class: 'stat-label', text: label }), badge]);
}

/**
 * "Download the data (JSON): a.json · b.json" (task B30). Links only to files that are already published; each
 * file: { href, file, saveAs }. Null when there is none.
 */
export function downloadLine(files, name) {
  if (!files?.length) return null;
  const links = files.flatMap(({ href, file, saveAs }, index) => [
    index ? ' · ' : null,
    // The build version (task B32) on the link too, so a download right after a deploy is never an old cached copy.
    el('a', { href: versioned(href), download: saveAs ?? file, text: file, 'aria-label': t('download.aria', { file, name }) }),
  ]);
  return el('p', { class: 'download-line' }, [el('span', { text: t('download.label') }), ' ', links]);
}

/** A labelled pill, e.g. a status or a content type. */
export const chip = (text, kind = '') => el('span', { class: `chip ${kind}`.trim(), text });

/** "2025-08-15 20:45 UTC" style: unambiguous for observation times. */
export function formatUtc(date, { time = true } = {}) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
  const iso = date.toISOString();
  return time ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10);
}

const SYMBOL_UNITS = new Set(['arcsec', 'arcmin', 'deg', 'deg/d', 'percent']);

/** A number with its unit from the resource file: symbols stick to the number (1.2″), words get a space. */
export function withUnit(value, unit, digits = 2) {
  const number = formatNumber(value, digits);
  if (!unit || number === '—') return number;
  return `${number}${unitSuffix(unit)}`;
}

/**
 * What follows a number for a unit: "″" for a symbol, " au" for a word, "" for a pure number. A unit without
 * English text is shown as written in the data, never as its key.
 */
export function unitSuffix(unit) {
  if (!unit) return '';
  const label = has(`unit.${unit}`) ? t(`unit.${unit}`) : unit;
  if (!label) return '';
  return SYMBOL_UNITS.has(unit) ? label : ` ${label}`;
}

export function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

/** Chart data as a real table inside a disclosure, so the numbers are readable without the picture. */
export function dataTable({ caption, columns, rows, summary = t('table.show') }) {
  const head = el('tr', {}, columns.map((column) => el('th', { scope: 'col', text: column })));
  const body = rows.map((row) => el('tr', {}, row.map((cell) => el('td', { text: cell }))));
  return el('details', { class: 'data-table' }, [
    el('summary', { text: summary }),
    el('div', { class: 'table-scroll' }, el('table', {}, [
      caption ? el('caption', { text: caption }) : null,
      el('thead', {}, head),
      el('tbody', {}, body),
    ])),
  ]);
}

/** A two-column list of facts (label, value). */
export function factList(pairs, className = 'facts') {
  return el('dl', { class: className }, pairs.filter(Boolean).flatMap(([label, value]) => [
    el('dt', { text: label }),
    el('dd', {}, value instanceof Node ? value : String(value)),
  ]));
}

export function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
