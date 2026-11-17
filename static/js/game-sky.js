// Beat the physics, position rounds: "Where is this in the sky?". The real SPHEREx all-sky survey (IRSA, live) around
// the target, with a wavelength slider over the survey's frames, constellation lines and names as a guide, zoom
// presets from constellations down to the guessing chart, a ring where SPHEREx last measured the target and a square
// for the chart's area. Everything placed here comes from the training points only (never from the answer).
// Loaded when the panel first scrolls into view; one Aladin view is kept and reused from round to round.
import { tangentToSky } from './coords.js';
import { $, el, formatNumber, formatUtc } from './dom.js';
import { guessView, lastMeasurement } from './game.js';
import { t } from './i18n.js';
import { constellationOverlay, loadAladin, parseProperties, SPHEREX_HIPS, surveyProperties, TWOMASS_HIPS } from './skymap.js';
import { mjdToDate } from './stack.js';

/** Frames 50 and 51 of IRSA's cube (band 3 channel 17, band 4 channel 1: the dichroic channels) are blank. */
export const BLANK_FRAMES = new Set([50, 51]);
/** The frame shown first: 1.995 µm (band 3), where dust hides fewer stars than at the short end. */
export const START_FRAME = 42;
/** Zoom presets: field of view in degrees; 'chart' is worked out from the round. */
export const ZOOMS = [
  { key: 'constellation', fov: 60 },
  { key: 'neighbourhood', fov: 2 },
  { key: 'closeup', fov: 10 / 60 },
  { key: 'chart', fov: null },
];
const MIN_CHART_FOV = 1 / 60;
/**
 * The widest view: stereographic, seen from inside the sky like a planetarium (constellations keep their shapes);
 * capped so zooming out never turns it into a globe seen from outside.
 */
export const MAX_FOV = 120;
const PROJECTION = 'STG';
/** Colour maps for the one-wavelength picture (Aladin Lite names). The first is the default; grayscale is plain. */
export const COLOURS = ['magma', 'inferno', 'viridis', 'rainbow', 'grayscale'];
const LIGHT_M_S = 299792458;

/**
 * The frequency (Hz) to ask Aladin Lite for so it fetches cube frame `frame`. Aladin picks a cube's frame on an even
 * frequency scale between c/em_max and c/em_min (seen in its tile requests: setSliceNumber(42) fetched frame 17), so a
 * frame number is turned into the middle of that frame's frequency step. Pure.
 */
export function frameFrequency(frame, depth, emMin, emMax) {
  const low = LIGHT_M_S / emMax;
  const high = LIGHT_M_S / emMin;
  return low + ((frame + 0.5) / depth) * (high - low);
}

/**
 * Where the panel points, from a position round's training points: the last measurement (ring) and the corners of
 * the guessing chart's area before the reveal (square), on the sky. Null when the round has no sky frame. Pure.
 */
export function skyPlace(round) {
  const frame = round?.frame;
  if (!Number.isFinite(frame?.centre_ra_deg) || !Number.isFinite(frame?.centre_dec_deg) || !round.training_points?.length) return null;
  const origin = lastMeasurement(round);
  const toSky = (east, north) => tangentToSky(frame.centre_ra_deg, frame.centre_dec_deg, origin.east_arcsec + east, origin.north_arcsec + north);
  const view = guessView(round);
  const corners = [[view.east[0], view.north[0]], [view.east[1], view.north[0]], [view.east[1], view.north[1]], [view.east[0], view.north[1]]]
    .map(([east, north]) => toSky(east, north));
  return { star: toSky(0, 0), corners, spanArcsec: view.east[1] - view.east[0], t_mjd: origin.t_mjd };
}

/** "12.8″", "4.2′" or "8.4°": an angle in the unit that reads best. Pure. */
export function angleLabel(arcsec) {
  if (arcsec < 120) return `${formatNumber(arcsec, 1)}″`;
  if (arcsec < 7200) return `${formatNumber(arcsec / 60, 1)}′`;
  return `${formatNumber(arcsec / 3600, 1)}°`;
}

/** Which scale note fits: the chart spans under 3 picture pixels ('tiny'), more ('visible'), or the pixel is unknown. Pure. */
export function scaleKind(spanArcsec, pixelArcsec) {
  if (!pixelArcsec) return 'unknown';
  return spanArcsec < 3 * pixelArcsec ? 'tiny' : 'visible';
}

/** The chart preset's field of view (degrees): three chart widths, at least one arcminute. Pure. */
export const chartFov = (spanArcsec) => Math.max(MIN_CHART_FOV, (3 * spanArcsec) / 3600);

/**
 * The survey's frames as [{ frame, um }] from its properties (data_cube_crval3_arr), blank frames left out, and its
 * pixel size and dates. Pure.
 */
export function surveyFacts(text) {
  const values = parseProperties(text);
  const um = (values.get('data_cube_crval3_arr') ?? '').split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite);
  const frames = um.map((value, frame) => ({ frame, um: value })).filter((item) => !BLANK_FRAMES.has(item.frame));
  const pixelDeg = Number(values.get('hips_pixel_scale'));
  const tMin = Number(values.get('t_min'));
  const tMax = Number(values.get('t_max'));
  const depth = Number(values.get('hips_cube_depth'));
  const emMin = Number(values.get('em_min'));
  const emMax = Number(values.get('em_max'));
  const cube = depth > 0 && emMin > 0 && emMax > emMin;
  return {
    frames: cube ? frames : [],
    frequency: cube ? (frame) => frameFrequency(frame, depth, emMin, emMax) : null,
    pixelArcsec: Number.isFinite(pixelDeg) && pixelDeg > 0 ? pixelDeg * 3600 : null,
    from: Number.isFinite(tMin) ? tMin : null,
    to: Number.isFinite(tMax) ? tMax : null,
  };
}

/** Turns the survey layer to one cube frame. */
function showFrame(layer, facts, frame) {
  layer.setFrequency?.({ value: facts.frequency(frame), unit: 'Hz' });
}

const day = (mjd) => formatUtc(mjdToDate(mjd), { time: false });

/** The one Aladin view, its survey layer and what it currently marks. */
let sky = null;
/** The round the panel shows now. */
let current = null;

/** The panel for a position round (null if the round has no sky frame). Starts loading when it scrolls into view. */
export function gameSkyPanel(round, name) {
  const place = skyPlace(round);
  if (!place) return null;
  current = { place, name };
  const section = el('section', { class: 'game-sky', 'aria-labelledby': 'game-sky-title' }, [
    el('div', { class: 'game-sky-head' }, [
      el('h3', { id: 'game-sky-title', text: t('gamesky.title', { name }) }),
      el('p', { id: 'game-sky-source', class: 'chip skymap-chip' }),
    ]),
    el('p', { class: 'note', text: t('gamesky.lead', { name }) }),
    el('div', { class: 'game-sky-body' }, [
      el('div', { class: 'game-sky-dome' }, [
        el('div', { id: 'game-sky-frame', class: 'game-sky-frame' }, [el('p', { id: 'game-sky-status', class: 'note game-sky-status', role: 'status', text: t('gamesky.waiting') })]),
        el('div', { class: 'game-sky-dome-bar' }, [
          el('button', { type: 'button', class: 'quiet game-sky-step', 'aria-label': t('gamesky.zoomOut'), title: t('gamesky.zoomOut'), text: '−', onclick: () => sky?.map?.decreaseZoom?.() }),
          el('output', { id: 'game-sky-fov', class: 'game-sky-fov', 'aria-live': 'polite' }),
          el('button', { type: 'button', class: 'quiet game-sky-step', 'aria-label': t('gamesky.zoomIn'), title: t('gamesky.zoomIn'), text: '+', onclick: () => sky?.map?.increaseZoom?.() }),
        ]),
      ]),
      el('div', { class: 'game-sky-controls' }, [
        el('div', { class: 'game-sky-zooms', role: 'group', 'aria-label': t('gamesky.zoom') }, ZOOMS.map((zoom) => el('button', {
          type: 'button', class: 'quiet', dataset: { zoom: zoom.key }, text: t(`gamesky.zoom.${zoom.key}`), onclick: () => zoomTo(zoom.key),
        }))),
        el('label', { id: 'game-sky-band', class: 'game-sky-band', hidden: true }, [
          el('span', { class: 'game-sky-band-label' }, [t('gamesky.wavelength'), ' ', el('output', { id: 'game-sky-um' })]),
          el('input', { id: 'game-sky-slider', type: 'range', min: 0, max: 0, step: 1, value: 0, oninput: onSlide }),
          el('span', { class: 'game-sky-band-ends', 'aria-hidden': 'true' }, [el('span', { id: 'game-sky-um-min' }), el('span', { id: 'game-sky-um-max' })]),
        ]),
        el('label', { id: 'game-sky-colour', class: 'game-sky-colour', hidden: true }, [
          el('span', { text: t('gamesky.colours') }),
          el('select', { id: 'game-sky-colours', onchange: (event) => setColours(event.target.value) },
            COLOURS.map((name) => el('option', { value: name, text: t(`gamesky.colour.${name}`) }))),
        ]),
        el('p', { id: 'game-sky-colour-note', class: 'note', hidden: true, text: t('gamesky.falseColour') }),
        el('button', { id: 'game-sky-lines', type: 'button', role: 'switch', 'aria-checked': 'true', class: 'switch', onclick: toggleLines }, [
          el('span', { class: 'switch-track', 'aria-hidden': 'true' }, el('span', { class: 'switch-thumb' })),
          el('span', { text: t('gamesky.lines') }),
        ]),
        el('p', { class: 'note', text: t('gamesky.ring', { name, date: day(place.t_mjd) }) }),
        el('p', { id: 'game-sky-scale', class: 'note' }),
        el('p', { id: 'game-sky-dates', class: 'note' }),
        el('p', { class: 'note', text: t('gamesky.linesNote') }),
        el('p', { class: 'note', text: t('gamesky.viewer') }),
      ]),
    ]),
  ]);
  const start = () => mount().catch((error) => {
    console.warn('The game sky panel could not load:', error);
    const status = $('game-sky-status');
    if (status) status.textContent = t('gamesky.unavailable');
  });
  if (typeof IntersectionObserver === 'function') {
    const watch = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      watch.disconnect();
      start();
    }, { rootMargin: '200px' });
    watch.observe(section);
  } else queueMicrotask(start);
  return section;
}

async function mount() {
  const frame = $('game-sky-frame');
  if (!frame) return;
  if (!sky) {
    sky = { ready: null };
    sky.ready = (async () => {
      const [A, text] = await Promise.all([loadAladin(), surveyProperties(SPHEREX_HIPS)]);
      const facts = text ? surveyFacts(text) : null;
      const spherex = Boolean(facts?.frames.length);
      const layer = A.imageHiPS(spherex ? SPHEREX_HIPS : TWOMASS_HIPS, { name: spherex ? 'SPHEREx DR1' : '2MASS' });
      const view = el('div', { class: 'game-sky-view' });
      frame.append(view);
      const { star } = current.place;
      const map = A.aladin(view, {
        survey: layer, fov: ZOOMS[0].fov, projection: PROJECTION, cooFrame: 'ICRSd', target: `${star.ra} ${star.dec}`, log: false,
        showReticle: false, showCooLocation: false, showFov: false, showContextMenu: false, showStatusBar: false, showCooGrid: false,
        showFullscreenControl: false, showLayersControl: false, showGotoControl: false, showSimbadPointerControl: false,
        showShareControl: false, showProjectionControl: false, showFrame: false, showZoomControl: false,
      });
      // The round frame's corners would hide Aladin's own zoom buttons: ours sit under the circle, with the field shown.
      map.on?.('zoomChanged', showFov);
      map.setFoVRange?.(null, MAX_FOV);
      Object.assign(sky, { A, map, layer, view, facts: spherex ? facts : null, marks: null, lines: null, linesOn: true });
      if (spherex) {
        // IRSA serves every frame but the two blank ones; Aladin would start on the middle (blank) frame.
        for (let tries = 0; tries < 60 && !layer.added; tries += 1) await new Promise((resolve) => setTimeout(resolve, 50));
        showFrame(layer, facts, START_FRAME);
        setColours(sky.colours ?? COLOURS[0]);
      }
      sky.lines = await constellationOverlay(A, map, { names: true }).catch((error) => {
        console.warn('Constellation lines could not load:', error);
        return null;
      });
    })();
  } else if (sky.view && !frame.contains(sky.view)) frame.append(sky.view);
  await sky.ready;
  if (!sky.map) return;
  $('game-sky-status')?.remove();
  showRound();
}

/** Marks the current round: ring on the last measurement, square for the chart; turns the view to it. */
function showRound() {
  const { A, map, facts } = sky;
  const { place, name } = current;
  if (sky.marks) {
    map.removeLayer?.(sky.marks.ring);
    map.removeLayer?.(sky.marks.box);
  }
  const ring = A.catalog({ name: 'target', color: '#ffe08a', sourceSize: 18, shape: 'circle', displayLabel: true, labelColumn: 'name', labelColor: '#ffe08a', labelFont: '600 13px sans-serif' });
  map.addCatalog(ring);
  ring.addSources([A.source(place.star.ra, place.star.dec, { name })]);
  const box = A.graphicOverlay({ color: '#5cc8ff', lineWidth: 2 });
  map.addOverlay(box);
  box.add(A.polygon(place.corners.map((corner) => [corner.ra, corner.dec])));
  sky.marks = { ring, box };
  map.gotoRaDec(place.star.ra, place.star.dec);
  $('game-sky-source').textContent = t(facts ? 'skymap.sourceSpherex' : 'skymap.source2mass');
  const kind = scaleKind(place.spanArcsec, facts?.pixelArcsec);
  $('game-sky-scale').textContent = t(`gamesky.scale.${kind}`, {
    span: angleLabel(place.spanArcsec),
    pixel: facts?.pixelArcsec ? angleLabel(facts.pixelArcsec) : '',
    pixels: facts?.pixelArcsec ? formatNumber(place.spanArcsec / facts.pixelArcsec, 0) : '',
  });
  $('game-sky-dates').textContent = facts?.from && facts?.to ? t('gamesky.dates', { from: day(facts.from), to: day(facts.to) }) : '';
  if (facts) {
    const slider = $('game-sky-slider');
    slider.max = String(facts.frames.length - 1);
    const shown = sky.frame ?? START_FRAME;
    slider.value = String(Math.max(0, facts.frames.findIndex((item) => item.frame === shown)));
    $('game-sky-um-min').textContent = t('gamesky.um', { um: facts.frames[0].um.toFixed(2) });
    $('game-sky-um-max').textContent = t('gamesky.um', { um: facts.frames.at(-1).um.toFixed(2) });
    $('game-sky-band').hidden = false;
    showFrameLabel();
  }
  setLinesShown(sky.linesOn);
  $('game-sky-colour').hidden = !facts;
  $('game-sky-colour-note').hidden = !facts;
  if (facts) $('game-sky-colours').value = sky.colours ?? COLOURS[0];
  showFov();
}

/** The field of view under the circle, e.g. "60° across". */
function showFov() {
  const fov = sky?.map?.getFov?.()?.[0];
  const out = $('game-sky-fov');
  if (out && Number.isFinite(fov)) out.textContent = t('gamesky.fov', { fov: angleLabel(fov * 3600) });
}

/** False colour for the one-wavelength picture: brightness drawn through a colour map (grayscale is plain). */
function setColours(name) {
  if (!sky?.layer || !COLOURS.includes(name)) return;
  sky.colours = name;
  sky.layer.setOptions?.({ colormap: name, stretch: 'linear' });
}

function zoomTo(key) {
  if (!sky?.map || !current) return;
  const zoom = ZOOMS.find((item) => item.key === key);
  sky.map.gotoRaDec(current.place.star.ra, current.place.star.dec);
  sky.map.setFoV(zoom.fov ?? chartFov(current.place.spanArcsec));
}

function showFrameLabel() {
  const item = sky.facts.frames[Number($('game-sky-slider').value)];
  if (!item) return null;
  const text = t('gamesky.um', { um: item.um.toFixed(2) });
  $('game-sky-um').textContent = text;
  $('game-sky-slider').setAttribute('aria-valuetext', text);
  return item;
}

let slideTimer = null;
function onSlide() {
  if (!sky?.facts) return;
  const item = showFrameLabel();
  if (!item) return;
  clearTimeout(slideTimer);
  // Each frame is a new set of tiles: wait for the slider to settle before asking for them.
  slideTimer = setTimeout(() => {
    sky.frame = item.frame;
    showFrame(sky.layer, sky.facts, item.frame);
  }, 120);
}

function setLinesShown(on) {
  sky.linesOn = on;
  $('game-sky-lines')?.setAttribute('aria-checked', String(on));
  if (!sky.lines) return;
  if (on) {
    sky.lines.overlay.show();
    sky.lines.names?.show();
  } else {
    sky.lines.overlay.hide();
    sky.lines.names?.hide();
  }
}

function toggleLines() {
  if (!sky?.map) return;
  setLinesShown(!sky.linesOn);
}
