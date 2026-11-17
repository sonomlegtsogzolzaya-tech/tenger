// Plain words for the target view (task B17): one line saying what a target is and how far away, and the
// finding under the image compared with the full Moon. Pure: numbers in, text out (strings from js/i18n.js).
import { has, t } from './i18n.js';
import { AU_PER_UNIT } from './map.js';
import { colourOf } from './targets.js';

/** The full Moon's apparent width, about 31 arcminutes (it ranges 29.3′–34.1′ over the Moon's orbit). */
export const FULL_MOON_ARCSEC = 31 * 60;

/** Light-years for a {value, unit} distance in pc or ly; null for Solar System units or none. */
export function lightYears(distance) {
  const value = Number(distance?.value);
  if (!distance || !Number.isFinite(value) || value <= 0) return null;
  // The same constants as the map and the target list, so the numbers agree everywhere.
  if (distance.unit === 'pc') return (value * AU_PER_UNIT.pc) / AU_PER_UNIT.ly;
  if (distance.unit === 'ly') return value;
  return null;
}

/** "6", "7.4", "598", "2,500,000": whole numbers from 10 light-years up, one decimal below (no ".0"). */
export function formatLightYears(ly) {
  return new Intl.NumberFormat('en', { maximumFractionDigits: ly >= 10 ? 0 : 1 }).format(ly);
}

/**
 * One plain line under a target's name: "A fast-moving star, 6 light-years away.", "A dwarf planet in our Solar
 * System.", or for a position the visitor chose, "A position you chose in the sky." kind and distance come from
 * the site's data files.
 */
export function plainLine({ kind, distance } = {}) {
  if (!kind || kind === 'custom') return t('plain.custom');
  const noun = has(`plain.kind.${kind}`) ? t(`plain.kind.${kind}`) : t('plain.kind.other');
  if (colourOf(kind) === 'solar') return has(`plain.solar.${kind}`) ? t(`plain.solar.${kind}`) : t('plain.solar', { noun });
  const ly = lightYears(distance);
  return ly === null ? t('plain.noDistance', { noun }) : t('plain.far', { noun, ly: formatLightYears(ly) });
}

/** Trial types in plain words (the Predictions page's own chips). */
const TRIAL_TYPE = { retrospective_holdout: 'story.chip.practice', prospective_unexposed: 'story.chip.real' };

/** An error on the sky in arcseconds, to two decimals without trailing zeros: 1.52″, 0.08″, 5.9″. */
export const arcsecShort = (value) => `${new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value)}″`;

/**
 * What Home says about a target's forecast (task B29g), taken only from scoreboard.json: its see-only list and the
 * target's scored row (status, trial type, confirmation pending, the model's error). Never stronger than the record:
 * an open forecast without a model is not "a forecast". Returns { card, popup }: card is the short status for a
 * Solar System card's line (stars keep kind · distance), popup the plain result line.
 */
export function famousResult({ key, board, trialIds = [], seeOnly = false } = {}) {
  if (board?.see_only?.includes(key) || seeOnly) return { card: t('famous.seeOnly'), popup: t('famous.pop.seeOnly') };
  // Without the scoreboard Home says it does not know, never "no forecast" (the trial files may hold one).
  if (!board) return { card: null, popup: t('famous.pop.unknown') };
  // The target's own trial (index.json), else a non-exploratory row; an exploratory revision is never the headline.
  const rows = board.rows?.filter((row) => row.target_key === key) ?? [];
  const row = rows.find((item) => trialIds.includes(item.trial_id)) ?? rows.find((item) => !item.exploratory) ?? null;
  if (!row) return { card: null, popup: t('famous.pop.none') };
  if (row.status === 'insufficient_data') return { card: t('famous.tooLittle'), popup: t('famous.pop.tooLittle') };
  const real = row.category === 'prospective_unexposed';
  const type = t(TRIAL_TYPE[row.category] ?? 'famous.type.other');
  const error = Number.isFinite(row.model_error_arcsec) ? arcsecShort(row.model_error_arcsec) : null;
  let popup;
  if (row.status === 'hit' && error) popup = t('famous.pop.hit', { type, error });
  else if (row.status === 'miss' && error) popup = t('famous.pop.miss', { type, error });
  else popup = t(has(`famous.pop.${row.status}`) ? `famous.pop.${row.status}` : 'famous.pop.notScored', { type });
  let card;
  const practice = row.category === 'retrospective_holdout';
  if (row.status === 'waiting') card = t('famous.waiting');
  else if (row.status !== 'hit' && row.status !== 'miss') card = t('famous.notScored');
  else if (real && row.confirmation_pending) card = t('famous.blindPending');
  else if (real || practice) card = t(`famous.${real ? 'blind' : 'practice'}${row.status === 'hit' ? 'Hit' : 'Miss'}`);
  else card = null; // another trial type (e.g. illustrative) is not called a forecast on a card
  return { card, popup };
}

/**
 * The short line on a Famous targets card (task B29), from the data files: stars "fast-moving star · 6 ly"; Solar
 * System bodies their kind and their status from famousResult ("dwarf planet · too little data to forecast",
 * "dwarf planet · blind forecast, confirmation pending", "interstellar comet · pictures only").
 */
export function famousLine({ kind, distance, status = null } = {}) {
  const noun = t(has(`famous.kind.${kind}`) ? `famous.kind.${kind}` : 'famous.kind.other');
  const ly = lightYears(distance);
  let detail;
  if (ly !== null && colourOf(kind) !== 'solar') detail = t('famous.ly', { ly: formatLightYears(ly) });
  else if (status) detail = status;
  else if (colourOf(kind) === 'solar') detail = t('famous.solar');
  return detail ? `${noun} · ${detail}` : noun;
}

/**
 * The number a count-up shows after elapsedMs of durationMs (task B28): from 0 to value with an ease-out, never
 * below 0 or past the value (progress is clamped, so a frame time slightly before the start cannot go negative).
 */
export function countUpShown(value, elapsedMs, durationMs) {
  if (!Number.isFinite(value)) return value;
  const progress = durationMs > 0 ? Math.max(0, Math.min(1, elapsedMs / durationMs)) : 1;
  return progress >= 1 ? value : value * (1 - (1 - progress) ** 3);
}

const FRACTIONS = [[2, 'half'], [3, 'third'], [4, 'quarter'], [5, 'fifth'], [10, 'tenth'], [20, 'twentieth'], [50, 'fiftieth'], [100, 'hundredth']];

/**
 * How a shift on the sky compares with the full Moon: "about a tenth of the full Moon's width" (168″),
 * "about half of …", "about 2 times …". Below a hundredth it says so; the nearest listed fraction wins.
 */
export function moonShare(arcsec) {
  if (!Number.isFinite(arcsec) || arcsec <= 0) return null;
  const ratio = arcsec / FULL_MOON_ARCSEC;
  if (ratio >= 0.75) return t('moon.times', { n: new Intl.NumberFormat('en', { maximumFractionDigits: ratio < 10 ? 1 : 0 }).format(ratio) });
  if (ratio < 1 / 150) return t('moon.tiny');
  const [, word] = FRACTIONS.reduce((best, item) => (Math.abs(Math.log(ratio * item[0])) < Math.abs(Math.log(ratio * best[0])) ? item : best));
  return t(`moon.${word}`);
}
