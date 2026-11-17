// One target list for the map, the feed, the shortcuts and the viewer, built from the site index
// (docs/DATA-CONTRACT.md §4) and the legacy targets.json that still holds the prepared viewer frames.
// Pure: no DOM.
import { separationDeg } from './coords.js';

/** The five official challenge targets, in the order of the NASA challenge. */
export const OFFICIAL_KEYS = ['barnard', 'wise0855', 'epsindib', 'rwaur', 'rdra'];

/** TENGER's three extra targets. They stay "not available yet" until the site index lists their products. */
export const PLANNED = [
  { key: 'makemake', kind: 'dwarfplanet', seeOnly: false },
  { key: 'pluto', kind: 'dwarfplanet', seeOnly: false },
  { key: '3i-atlas', kind: 'comet', seeOnly: true },
];
const ALIASES = { '3i_atlas': '3i-atlas', '3iatlas': '3i-atlas' };

const SOLAR_KINDS = new Set(['dwarfplanet', 'planet', 'comet', 'asteroid', 'tno', 'moon', 'solar_system']);
const STAR_KINDS = new Set(['faststar', 'star', 'browndwarf']);

/** Colour family on the map and the cards: stars amber, variables purple, Solar System cyan, hypothetical orange. */
export function colourOf(kind) {
  if (kind === 'variable') return 'variable';
  if (SOLAR_KINDS.has(kind)) return 'solar';
  if (kind === 'hypothetical') return 'hypothetical';
  if (STAR_KINDS.has(kind)) return 'star';
  return 'other';
}

export const canonicalKey = (key) => ALIASES[key] ?? key;

function legacyCentre(preset) {
  return { ra: preset.centreRa ?? preset.ra, dec: preset.centreDec ?? preset.dec };
}

function fromLegacy(preset) {
  return {
    key: preset.key,
    name: preset.name,
    nameKey: `target.${preset.key}.name`,
    kind: preset.kind,
    colour: colourOf(preset.kind),
    role: preset.category === 'challenge' ? 'challenge' : 'place',
    official: OFFICIAL_KEYS.includes(preset.key),
    seeOnly: false,
    dataStatus: 'available',
    prediction: { status: null, trialIds: [] },
    centre: legacyCentre(preset),
    fov: preset.fov ?? null,
    reference: null,
    map: null,
    investigationPath: null,
    thumbnails: [],
    legacy: preset,
    fromIndex: false,
  };
}

function placeholder(planned) {
  return {
    key: planned.key,
    name: null,
    nameKey: `target.${planned.key}.name`,
    kind: planned.kind,
    colour: colourOf(planned.kind),
    role: 'extra',
    official: false,
    seeOnly: planned.seeOnly,
    dataStatus: 'unavailable',
    prediction: { status: planned.seeOnly ? 'see_only' : null, trialIds: [] },
    centre: null,
    fov: null,
    reference: null,
    map: null,
    investigationPath: null,
    thumbnails: [],
    legacy: null,
    fromIndex: false,
  };
}

function fromIndex(target, preset) {
  const key = canonicalKey(target.key);
  const footprint = target.footprint;
  const planned = PLANNED.find((item) => item.key === key);
  const centre = footprint && Number.isFinite(footprint.centre_ra_deg)
    ? { ra: footprint.centre_ra_deg, dec: footprint.centre_dec_deg }
    : preset ? legacyCentre(preset) : null;
  return {
    key,
    name: target.name ?? preset?.name ?? null,
    nameKey: target.name_key ?? `target.${key}.name`,
    kind: target.kind ?? preset?.kind ?? planned?.kind ?? 'other',
    colour: colourOf(target.kind ?? preset?.kind ?? planned?.kind),
    role: target.role ?? 'extra',
    official: OFFICIAL_KEYS.includes(key),
    seeOnly: target.prediction?.status === 'see_only' || Boolean(planned?.seeOnly),
    dataStatus: target.data_status ?? 'unavailable',
    prediction: {
      status: target.prediction?.status ?? null,
      trialIds: Array.isArray(target.prediction?.trial_ids) ? target.prediction.trial_ids : [],
      // Open (blind) forecasts not yet checked (task B29: the Famous targets line says "our blind forecast").
      openForecastIds: Array.isArray(target.prediction?.open_forecast_ids) ? target.prediction.open_forecast_ids : [],
    },
    centre,
    fov: footprint?.fov_deg ?? preset?.fov ?? null,
    reference: target.reference ?? null,
    map: target.map ?? null,
    investigationPath: target.investigation_path ?? null,
    thumbnails: Array.isArray(target.thumbnails) ? target.thumbnails : [],
    // V10: per-visit display-colour previews for targets shown in preview mode (Pluto, Makemake, 3I/ATLAS).
    compositesPath: typeof target.composites_path === 'string' ? target.composites_path : null,
    legacy: preset ?? null,
    fromIndex: true,
    measurementStatus: target.measurement_status ?? null,
    statusReasonKey: target.status_reason_key ?? null,
  };
}

/**
 * The unified list. With an index, its targets come first in its order; the five official targets and the
 * three planned ones are always present (from legacy data or as "not available yet").
 */
export function buildTargets(index, legacyPresets = []) {
  const presets = new Map(legacyPresets.map((preset) => [preset.key, preset]));
  const entries = [];
  const seen = new Set();
  for (const target of index?.targets ?? []) {
    const key = canonicalKey(target.key);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(fromIndex(target, presets.get(key)));
  }
  for (const key of OFFICIAL_KEYS) {
    if (!seen.has(key) && presets.has(key)) {
      seen.add(key);
      entries.push(fromLegacy(presets.get(key)));
    }
  }
  for (const planned of PLANNED) {
    if (!seen.has(planned.key)) {
      seen.add(planned.key);
      entries.push(placeholder(planned));
    }
  }
  return entries;
}

/**
 * Whether the viewer has bundled frames to show. The five challenge targets stay viewable even when the
 * index has no validated product for them yet (CLAUDE.md: keep the five-target viewer); the labels then
 * say "legacy frames only".
 */
export const isViewable = (entry) => Boolean(entry?.legacy);

/** Frames to view, or an evidence file with epoch previews (data_status partial or available). */
export const isOpenable = (entry) => isViewable(entry)
  || (Boolean(entry?.investigationPath) && entry.dataStatus !== 'unavailable');

/** Bundled frames exist, but the index lists no validated product for the target. */
export const isLegacyOnly = (entry) => isViewable(entry) && entry.fromIndex && entry.dataStatus === 'unavailable';

/** The prepared field that contains a position, nearest centre first. */
export function findCoveringTarget(entries, ra, dec) {
  let best = null;
  for (const entry of entries) {
    if (!isViewable(entry) || !entry.centre || !entry.fov) continue;
    const distance = separationDeg(ra, dec, entry.centre.ra, entry.centre.dec);
    if (distance <= entry.fov / 2 && (!best || distance < best.distance)) best = { entry, distance };
  }
  return best?.entry ?? null;
}

/** Legacy "places" (galaxies, nebulae, other fast stars) the name search can open from prepared frames. */
export function legacyPlaces(legacyPresets, entries) {
  const listed = new Set(entries.map((entry) => entry.key));
  return legacyPresets.filter((preset) => !listed.has(preset.key)).map(fromLegacy);
}
