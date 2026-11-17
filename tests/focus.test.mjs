// B11: flying to a body in the 3D Home scene: focus targets, zoom limits per body, picking and the label overlap rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { has, t } from '../static/js/i18n.js';
import { PLANET_ELEMENTS, scaledRadius } from '../static/js/orbits.js';
import {
  chooseLabels, extentOf, FOCUS_KEYS, flyDistanceFor, HOME_MIN_DISTANCE, LABEL_IMPORTANCE, minDistanceFor, overlaps,
  pickOnScreen, SCENE_RADIUS, sceneFitDistance, STAR_SHELL, TAP_RADIUS_PX, TARGET_REACH,
} from '../static/js/focus.js';
import { SHORTCUTS } from '../static/js/help.js';

const STATIC = fileURLToPath(new URL('../static/', import.meta.url));
const html = readFileSync(`${STATIC}index.html`, 'utf8');
const space3d = readFileSync(`${STATIC}js/space3d.js`, 'utf8');
const scene = JSON.parse(readFileSync(`${STATIC}data/scene3d.json`, 'utf8'));
const DEG = Math.PI / 180;

test('the Sun, all eight planets, Pluto and Makemake can be flown to, in that order', () => {
  assert.deepEqual(FOCUS_KEYS, ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'makemake']);
  // Every one has a name for the list and for "Camera on: ...".
  assert.equal(t('space.sun'), 'Sun');
  assert.equal(t('space.earth'), 'Earth');
  for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) assert.ok(has(`planet.${planet}`), planet);
  for (const key of ['pluto', 'makemake']) assert.ok(scene.bodies[key], `${key} is in the scene file`);
  assert.match(t('space.target', { name: 'Mars' }), /Camera on: Mars/);
});

test('the Fly to list is reachable by keyboard and Esc is listed with the 3D shortcuts', () => {
  assert.match(html, /<details id="space-fly" class="space-fly space-3d-only">\s*<summary class="tool-icon" data-t-label="space\.fly" data-t-title="space\.fly">/);
  assert.match(html, /id="space-fly-list"[^>]*role="group"[^>]*data-t-label="space\.flyLabel"/);
  assert.equal(t('space.fly'), 'Fly to');
  const rows = SHORTCUTS.find(([group]) => group === 'keys.group.time')[1].map(([, action]) => action);
  assert.ok(rows.includes('keys.a.flyEnter') && rows.includes('keys.a.flyEscape'));
});

test('each body has its own closest zoom: outside the body, about where it fills the view', () => {
  for (const key of FOCUS_KEYS) {
    const min = minDistanceFor(key);
    const extent = extentOf(key);
    assert.ok(min > extent * 2, `${key}: the camera stays outside the drawn body (${min} vs ${extent})`);
    // At the closest zoom the body is big: its angular radius is at least half of the 21° half-height of the view.
    assert.ok(Math.asin(extent / min) / DEG > 10.5, `${key}: fills much of the view`);
    assert.ok(min < flyDistanceFor(key), `${key}: a flight ends farther out than the closest zoom`);
  }
  assert.equal(minDistanceFor('earth'), 0.725);
  assert.ok(minDistanceFor('saturn') > minDistanceFor('jupiter'), 'Saturn’s rings count');
  assert.ok(minDistanceFor('mercury') < HOME_MIN_DISTANCE, 'closer than the old fixed 1.2');
});

test('zoomed in on an inner planet, its neighbours stay well apart from it', () => {
  // The scene's closest approach of two neighbouring orbits (log scale): the outer one's perihelion minus the inner one's aphelion.
  const scaled = (planet, side) => {
    const [a] = PLANET_ELEMENTS[planet].a;
    const [e] = PLANET_ELEMENTS[planet].e;
    return scaledRadius(a * (1 + side * e));
  };
  const gap = (inner, outer) => scaled(outer, -1) - scaled(inner, +1);
  const inner = ['mercury', 'venus', 'earth', 'mars'];
  for (const [index, planet] of inner.entries()) {
    const neighbours = [inner[index - 1], inner[index + 1]].filter(Boolean);
    const closest = Math.min(...neighbours.map((other) => (index < inner.indexOf(other) ? gap(planet, other) : gap(other, planet))));
    assert.ok(minDistanceFor(planet) < 0.75 * closest, `${planet}: closest zoom ${minDistanceFor(planet)} vs neighbour gap ${closest.toFixed(2)}`);
  }
});

test('from any target the camera may pull back until the whole scene, star shell included, is in view', () => {
  assert.equal(STAR_SHELL, 150);
  assert.ok(SCENE_RADIUS > STAR_SHELL);
  // The farthest target: Makemake at aphelion (about 53 au), or a star view's target 24 units out.
  assert.ok(TARGET_REACH >= scaledRadius(53) && TARGET_REACH >= 24);
  for (const aspect of [0.6, 0.89, 1, 1.6, 2.2]) {
    const far = sceneFitDistance({ aspect });
    const half = 21 * DEG;
    const narrower = Math.min(half, Math.atan(Math.tan(half) * aspect));
    // Worst case: the target at TARGET_REACH from the Sun, the camera `far` from the target on the far side.
    // The scene's sphere then sits at most far + reach away and must fit inside the narrower half-angle.
    for (const direction of [-1, 0, 1]) {
      const centre = Math.hypot(far + direction * TARGET_REACH, direction === 0 ? TARGET_REACH : 0);
      assert.ok(Math.asin(SCENE_RADIUS / centre) + Math.atan(TARGET_REACH / far) <= narrower + 1e-9, `aspect ${aspect}, case ${direction}`);
    }
    assert.ok(far < 3000 * 0.5, 'well inside the camera’s far plane');
  }
  assert.ok(sceneFitDistance({ aspect: 0.6 }) > sceneFitDistance({ aspect: 1.6 }), 'portrait screens pull back farther');
  // The scene uses it for the zoom-out limit, and the per-body limit for the zoom-in.
  assert.match(space3d, /controls\.maxDistance = sceneFitDistance\(/);
  assert.match(space3d, /controls\.minDistance = view\.minDistance \?\? HOME_MIN_DISTANCE/);
});

test('a click or tap chooses the body nearest the pointer within a 44 px target, or on its disc', () => {
  assert.equal(TAP_RADIUS_PX * 2, 44);
  const sun = { key: 'sun', x: 100, y: 100, radius: 30, depth: 20 };
  const mercury = { key: 'mercury', x: 112, y: 100, radius: 3, depth: 19 };
  assert.equal(pickOnScreen([sun, mercury], { x: 112, y: 101 }), 'mercury', 'a small planet in front of the Sun');
  assert.equal(pickOnScreen([sun, mercury], { x: 98, y: 100 }), 'sun');
  assert.equal(pickOnScreen([sun, mercury], { x: 128, y: 100 }), 'mercury', 'within 22 px of Mercury');
  assert.equal(pickOnScreen([mercury], { x: 140, y: 100 }), null, 'too far from anything');
  const near = { key: 'near', x: 0, y: 0, radius: 2, depth: 5 };
  const far = { key: 'far', x: 0, y: 0, radius: 2, depth: 50 };
  assert.equal(pickOnScreen([far, near], { x: 1, y: 1 }), 'near', 'on a tie the nearer body wins');
});

test('overlapping labels: the focused body’s label stays, then the important and near ones; the rest fade', () => {
  const box = (x, y, w = 80, h = 18) => ({ x, y, w, h });
  assert.equal(overlaps(box(0, 0), box(79, 0)), true);
  assert.equal(overlaps(box(0, 0), box(81, 0)), false);
  assert.equal(overlaps(box(0, 0), box(81, 0), 2), true, 'with 2 px clearance');
  const labels = [
    { id: 'venus', rect: box(100, 100), kind: 'planet', depth: 8 },
    { id: 'earth', rect: box(110, 104), kind: 'earth', depth: 9 },
    { id: 'mercury', rect: box(120, 96), kind: 'planet', depth: 7 },
    { id: 'ring', rect: box(300, 300), kind: 'ring', depth: 40 },
  ];
  // Earth outranks the plain planets; the ring label is far from the others and stays.
  assert.deepEqual([...chooseLabels(labels).keys()].sort(), ['earth', 'ring']);
  // The focused body wins over a more important neighbour.
  const focused = labels.map((label) => (label.id === 'venus' ? { ...label, focused: true } : label));
  assert.deepEqual([...chooseLabels(focused).keys()].sort(), ['ring', 'venus']);
  // Equal kinds: the nearer one stays.
  assert.deepEqual([...chooseLabels(labels.filter((label) => label.kind === 'planet')).keys()], ['mercury']);
  // One already showing keeps its place against a slightly nearer label of the same kind (no flicker).
  const steady = [{ id: 'a', rect: box(0, 0), kind: 'planet', depth: 10, shown: true }, { id: 'b', rect: box(10, 0), kind: 'planet', depth: 9 }];
  assert.deepEqual([...chooseLabels(steady).keys()], ['a']);
  // A Sun or challenge-target label outranks planets, rings and notes.
  assert.ok(LABEL_IMPORTANCE.target > LABEL_IMPORTANCE.planet && LABEL_IMPORTANCE.sun > LABEL_IMPORTANCE.earth);
  assert.ok(LABEL_IMPORTANCE.planet > LABEL_IMPORTANCE.hypothetical && LABEL_IMPORTANCE.hypothetical > LABEL_IMPORTANCE.ring);
});

test('no label sits under the time bar or a side panel, not even the focused one', () => {
  const timeBar = { x: 400, y: 600, w: 500, h: 70 };
  const keyPanel = { x: 980, y: 10, w: 280, h: 560 };
  const labels = [
    { id: 'under-bar', rect: { x: 600, y: 640, w: 80, h: 18 }, kind: 'target', depth: 1, focused: true },
    { id: 'edge-of-key', rect: { x: 950, y: 200, w: 80, h: 18 }, kind: 'planet', depth: 5 },
    { id: 'free', rect: { x: 600, y: 300, w: 80, h: 18 }, kind: 'planet', depth: 5 },
    { id: 'unmeasured', rect: { x: 0, y: 0, w: 0, h: 0 }, kind: 'planet', depth: 5 },
  ];
  assert.deepEqual([...chooseLabels(labels, { blocked: [timeBar, keyPanel] }).keys()], ['free']);
});

test('a label with no room on its usual side moves to the first free side instead of fading', () => {
  const keyPanel = { x: 980, y: 10, w: 280, h: 560 };
  // Earth's label would run under the colour key on the right; on the left of its point there is room.
  const right = { x: 900, y: 200, w: 130, h: 18 };
  const left = { x: 740, y: 200, w: 130, h: 18 };
  const placed = chooseLabels([{ id: 'earth', rects: [right, left], kind: 'earth', depth: 5 }], { blocked: [keyPanel] });
  assert.equal(placed.get('earth'), 1);
  // A more important label already on the left pushes it on to the next place (above), or it fades if none is free.
  const sun = { id: 'sun', rect: { x: 745, y: 195, w: 40, h: 18 }, kind: 'sun', depth: 4 };
  const above = { x: 835, y: 175, w: 130, h: 18 };
  assert.equal(chooseLabels([sun, { id: 'earth', rects: [right, left, above], kind: 'earth', depth: 5 }], { blocked: [keyPanel] }).get('earth'), 2);
  assert.equal(chooseLabels([sun, { id: 'earth', rects: [right, left], kind: 'earth', depth: 5 }], { blocked: [keyPanel] }).has('earth'), false);
});

test('a label is placed only where it fits inside the scene, not cut off at its edge', () => {
  const bounds = { x: 0, y: 0, w: 360, h: 400 };
  const offRight = { x: 300, y: 100, w: 120, h: 18 };
  const left = { x: 160, y: 100, w: 120, h: 18 };
  assert.equal(chooseLabels([{ id: 'earth', rects: [offRight, left], kind: 'earth', depth: 3, focused: true }], { bounds }).get('earth'), 1);
  assert.equal(chooseLabels([{ id: 'edge', rect: { x: -10, y: 5, w: 80, h: 18 }, kind: 'sun', depth: 3 }], { bounds }).size, 0);
});

test('Planet Nine: a short label in the scene; the explanation opens in the colour key, never over the scene', () => {
  assert.equal(t('space.nineShort'), 'Planet Nine? (hypothetical)');
  // The long cited text is no longer a scene label.
  assert.doesNotMatch(space3d, /label\(ranges\.length \? labelOf\('planetNineRanges'/);
  assert.match(space3d, /const nineText = ranges\.length \? labelOf\('planetNineRanges'/);
  // The explanation and its opener live in the colour key (the side panel; under the scene on phones).
  const key = html.slice(html.indexOf('<details id="map-key"'), html.indexOf('</details>', html.indexOf('<details id="map-key"')));
  assert.match(key, /<button id="space-nine-key" type="button" class="legend-button space-3d-only" aria-expanded="false" aria-controls="space-nine"/);
  assert.match(key, /<div id="space-nine" class="space-nine space-3d-only" hidden>/);
  assert.ok(has('space.nineHint'));
});
