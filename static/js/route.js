// Page state in the URL: parsing, conflict rules and share links. Pure: no DOM.
//
// Parameters (old links keep working): ra, dec, fov, target, embed; added: page, panel, band, a, b, mode, v,
// round (game), lesson (learn), trial (the reveal on the Predictions page) and step (the reveal's step, read once
// when the reveal opens; not written back).
// id is an alias of target. Coordinates are authoritative: a target named next to coordinates that point
// somewhere else is ignored, and the page says so.
import { separationDeg } from './coords.js';

export const PAGES = ['home', 'investigate', 'predictions', 'game', 'learn', 'about', 'loop', 'method'];
/** The reveal's steps, for ?step=1–6 next to ?trial (task B30: "How it works" links to steps 2 and 6). */
export const REVEAL_STEPS = 6;
export const PANELS = ['see', 'changed', 'prediction', 'evidence', 'spectrum'];
export const MODES = ['blink', 'side', 'swipe', 'diff'];
export const MAX_FOV_DEG = 2;
const TEXT_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$/;
const DETECTORS = 6;
const LAST_CHANNEL = 101;
const ONE_ARCSEC_DEG = 1 / 3600;
const COORD_DIGITS = 5;

export function parseBand(text) {
  if (text === null || text === undefined || text === '') return null;
  const value = String(text).toLowerCase();
  if (value === 'all') return { kind: 'composite' };
  const detector = /^d([1-9])$/.exec(value);
  if (detector && Number(detector[1]) <= DETECTORS) return { kind: 'detector', detector: Number(detector[1]) };
  const channel = /^c(\d{1,3})$/.exec(value);
  if (channel && Number(channel[1]) <= LAST_CHANNEL) return { kind: 'channel', channel: Number(channel[1]) };
  return null;
}

export function bandToParam(band) {
  if (!band || band.kind === 'composite') return 'all';
  if (band.kind === 'detector') return `d${band.detector}`;
  return `c${band.channel}`;
}

const cleanId = (value) => (value !== null && TEXT_ID.test(value) ? value : null);

/** Reads every parameter; anything malformed becomes null plus a note for the page to show. */
export function parseRoute(search) {
  const params = new URLSearchParams(search);
  const notes = [];
  const number = (name) => {
    if (!params.has(name) || params.get(name).trim() === '') return null;
    const value = Number(params.get(name));
    return Number.isFinite(value) ? value : NaN;
  };

  let target = cleanId(params.get('target'));
  const alias = cleanId(params.get('id'));
  if (!target && alias) target = alias;
  else if (target && alias && alias !== target) notes.push({ key: 'note.idIgnored', params: { id: alias, target } });

  let ra = number('ra');
  let dec = number('dec');
  const coordsGiven = ra !== null || dec !== null;
  if (coordsGiven && !(ra >= 0 && ra < 360 && Math.abs(dec) <= 90)) {
    notes.push({ key: 'note.badCoordinates' });
    ra = null;
    dec = null;
  }

  let fov = number('fov');
  if (fov !== null && !(fov > 0 && fov <= MAX_FOV_DEG)) {
    notes.push({ key: 'note.badFov' });
    fov = null;
  }

  const pick = (name, allowed) => (allowed.includes(params.get(name)) ? params.get(name) : null);
  const band = parseBand(params.get('band'));
  if (params.has('band') && !band) notes.push({ key: 'note.badBand' });

  return {
    page: pick('page', PAGES),
    panel: pick('panel', PANELS),
    mode: pick('mode', MODES),
    target,
    ra,
    dec,
    fov,
    band,
    round: cleanId(params.get('round')),
    lesson: cleanId(params.get('lesson')),
    trial: cleanId(params.get('trial')),
    step: /^[1-9]$/.test(params.get('step') ?? '') && Number(params.get('step')) <= REVEAL_STEPS ? Number(params.get('step')) : null,
    a: cleanId(params.get('a')),
    b: cleanId(params.get('b')),
    v: cleanId(params.get('v')),
    embed: params.get('embed') === '1',
    fixtures: params.get('fixtures') === '1',
    notes,
  };
}

/** Half the prepared field, so a link with the field's own centre or the star's position matches. */
const sameFieldDeg = (entry) => Math.max((entry.fov ?? 0) / 2, ONE_ARCSEC_DEG);

/**
 * Decides what a parsed URL opens. targets: [{ key, name, centre: { ra, dec } | null, fov }].
 * Returns { page, open, notes } where open is { kind: 'target', key, fov } or { kind: 'position', ra, dec, fov }.
 */
export function resolveRoute(route, targets) {
  const notes = [...route.notes];
  const named = route.target ? targets.find((entry) => entry.key === route.target) ?? null : null;
  if (route.target && !named) notes.push({ key: 'note.unknownTarget', params: { target: route.target } });
  let open = null;
  if (route.ra !== null && route.dec !== null) {
    const agrees = named?.centre
      && separationDeg(route.ra, route.dec, named.centre.ra, named.centre.dec) <= sameFieldDeg(named);
    if (agrees) {
      open = { kind: 'target', key: named.key, fov: route.fov ?? named.fov ?? null };
    } else {
      if (named) notes.push({ key: 'note.coordinatesWin', params: { name: named.name } });
      open = { kind: 'position', ra: route.ra, dec: route.dec, fov: route.fov };
    }
  } else if (named) {
    open = { kind: 'target', key: named.key, fov: route.fov ?? named.fov ?? null };
  }
  let page = route.page ?? (open ? 'investigate' : 'home');
  if (page === 'investigate' && !open) {
    notes.push({ key: 'note.nothingToInvestigate' });
    page = 'home';
  }
  return { page, open, notes };
}

const escapeAttribute = (text) => String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The <iframe> code for an embedded viewer. `url` is absolute and already carries embed=1; the frame is
 * responsive in width, lazy-loaded and may go full screen.
 */
export function embedCode(url, title, { height = 640 } = {}) {
  return `<iframe src="${escapeAttribute(url)}" title="${escapeAttribute(title)}" width="100%" height="${Number(height)}" `
    + 'style="border:0;max-width:960px" loading="lazy" allow="fullscreen; clipboard-write" allowfullscreen></iframe>';
}

/** The share link for a state. Order is fixed so equal states give equal links. */
export function buildRoute(state) {
  const params = new URLSearchParams();
  const page = state.page ?? 'home';
  if (page !== 'home') params.set('page', page);
  if (page === 'game' && state.round) params.set('round', state.round);
  if (page === 'learn' && state.lesson) params.set('lesson', state.lesson);
  if (page === 'predictions' && state.trial) params.set('trial', state.trial);
  if (page === 'investigate') {
    if (state.target) params.set('target', state.target);
    if (Number.isFinite(state.ra) && Number.isFinite(state.dec)) {
      params.set('ra', state.ra.toFixed(COORD_DIGITS));
      params.set('dec', state.dec.toFixed(COORD_DIGITS));
    }
    if (Number.isFinite(state.fov)) params.set('fov', String(state.fov));
    if (state.panel && state.panel !== 'see') params.set('panel', state.panel);
    if (state.band) params.set('band', bandToParam(state.band));
    if (state.mode) params.set('mode', state.mode);
    if (state.a) params.set('a', state.a);
    if (state.b) params.set('b', state.b);
    if (state.v) params.set('v', state.v);
  }
  if (state.embed) params.set('embed', '1');
  if (state.fixtures) params.set('fixtures', '1');
  const text = params.toString();
  return text ? `?${text}` : '';
}
