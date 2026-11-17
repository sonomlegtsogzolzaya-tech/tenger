// The 3D home scene (three.js, loaded lazily by main.js after the page is usable). Positions come from orbits.js
// (planets today, JPL approximate elements) and from static/data/scene3d.json (Pluto and Makemake from JPL
// Horizons and SBDB, star directions from Gaia/SIMBAD, Planet Nine ranges from the papers). Distances use the
// labelled log scale of orbits.js; object sizes are exaggerated. The canvas is decoration for sighted mouse,
// touch and keyboard-on-canvas users: the Targets list stays the accessible path, so the canvas is aria-hidden.
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, CSS2DObject, CSS2DRenderer, DoubleSide, Float32BufferAttribute,
  Line, LineBasicMaterial, LineDashedMaterial, LineLoop, Mesh, MeshBasicMaterial, OrbitControls, PerspectiveCamera,
  Points, PointsMaterial, Raycaster, RingGeometry, Scene, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace,
  Vector2, Vector3, WebGLRenderer,
} from '../vendor/three/three-tenger.min.js';
import {
  equatorialToEcliptic, julianDate, kuiperBelt, orbitPoints, planetNineRanges, planetPosition, PLANETS,
  scalePosition, scaledRadius, smallBodyElements, smallBodyPosition,
} from './orbits.js';
import {
  chooseLabels, extentOf, FOCUS_KEYS, flyDistanceFor, HOME_MIN_DISTANCE, minDistanceFor, overlaps, pickOnScreen,
  sceneFitDistance, SIZE, STAR_SHELL,
} from './focus.js';

const FLIGHT_MS = 1400;
const INTRO_MS = 1200;
const SLOW_FRAME_MS = 60;
const MIN_FRAMES_TO_JUDGE = 10;
const CLICK_SLOP_PX = 6;
const MAX_PIXEL_RATIO = 2;
const REFERENCE_RINGS_AU = [1, 10, 100, 1000];
// Stars sit on a shell (STAR_SHELL, focus.js), so they read as the sky seen from the Solar System.
const END_ON_COSINE = Math.cos((20 * Math.PI) / 180);
const SIGHTLINE_START = scaledRadius(1000) + 2;
const SIGHTLINE_LABEL = scaledRadius(1000) + 4;
/** The opening and home views stay within this distance; the visitor may zoom out to sceneFitDistance (focus.js). */
const MAX_CAMERA_DISTANCE = 115;
const FOV_DEG = 42;
/** A star counts as clicked within its glow (scene units). */
const STAR_PICK_RADIUS = 2.75;
/** The Planet Nine rings: faint, and brighter while their explanation is open. */
const NINE_OPACITY = [0.045, 0.13];
/** Where a label may sit around its point (CSS2DObject.center): right (the usual place), left, above, below. */
const ANCHORS = [[-0.08, 0.5], [1.08, 0.5], [0.5, 1.3], [0.5, -0.3]];
/** A click on a label within this many px of another body's dot means that body. */
const DOT_RADIUS_PX = 8;
/** Planet orbit lines are redrawn from the elements of the shown date when it moves this far (days). */
const ORBIT_REDRAW_DAYS = 3652.5;
/**
 * The opening viewpoint, in ecliptic longitude/latitude (degrees) and scene units. Chosen (for the 14 Nov 2026
 * scene file) so that no target star's direction points at or away from the camera (all at least 57° off the line
 * of sight) and neither Pluto nor Makemake sits between the camera and the Sun (both more than 85° off).
 */
const HOME_VIEW = { longitude: 25, latitude: 40, distance: 86 };
const BACKGROUND_STARS = 1600;
const BELT_POINTS = 1400;
/** Planet tints (display only). Orbit lines, labels and targets use the design tokens. */
const PLANET_TINT = {
  mercury: '#b9bec8', venus: '#e9dbb4', earth: '#5cc8ff', mars: '#e48d6c', jupiter: '#e4caa2', saturn: '#e9d7aa', uranus: '#a9e2e7', neptune: '#7ea9ff',
};

/** Ecliptic (x toward the equinox, z to ecliptic north) → three.js (y up). */
const toScene = ([x, y, z]) => new Vector3(x, z, -y);
const sceneAt = (au) => toScene(scalePosition(au));
const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const fromEcliptic = ({ longitude, latitude, distance }) => {
  const [l, b] = [longitude * Math.PI / 180, latitude * Math.PI / 180];
  return toScene([Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)]).multiplyScalar(distance);
};
const easeInOut = (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

function rendererName(renderer) {
  try {
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
  } catch {
    return '';
  }
}

function glowTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(0.42, `${color}66`);
  gradient.addColorStop(1, `${color}00`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function glow(color, scale, opacity = 1) {
  const sprite = new Sprite(new SpriteMaterial({ map: glowTexture(color), blending: AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

function ball(radius, color) {
  return new Mesh(new SphereGeometry(radius, 24, 16), new MeshBasicMaterial({ color }));
}

function loop(points, material) {
  const geometry = new BufferGeometry().setFromPoints(points);
  const line = new LineLoop(geometry, material);
  if (material.isLineDashedMaterial) line.computeLineDistances();
  return line;
}

function circle(radius, material, segments = 256) {
  return loop(Array.from({ length: segments }, (_, index) => {
    const angle = (2 * Math.PI * index) / segments;
    return new Vector3(radius * Math.cos(angle), 0, -radius * Math.sin(angle));
  }), material);
}

function pointCloud(positions, material) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions.flatMap((vector) => [vector.x, vector.y, vector.z]), 3));
  return new Points(geometry, material);
}

/**
 * Builds the scene into `host`. Options: scene (scene3d.json or null), date, nameOf(key), labelOf(kind, values),
 * reducedMotion, insetLeft() (px of the host covered on the left, so the Sun sits in the free area),
 * blockers() (the panels over the scene: no label shows under them), onPick(key) (true when the page opened that
 * target), onHud({ target }), onNine('enter' | 'leave' | 'click' | 'away'), onSlow().
 * Returns the controller, or { unavailable } when WebGL fails.
 */
export function createSpace(host, options) {
  const { scene: data, date = new Date(), nameOf, labelOf, reducedMotion = false } = options;
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return { unavailable: 'webgl' };
  }
  // Software WebGL (SwiftShader, llvmpipe) draws this scene too slowly for a phone-class CPU: 2D map instead,
  // unless the visitor switched 3D on themselves.
  if (!options.allowSoftware && /swiftshader|llvmpipe|software/i.test(rendererName(renderer))) {
    renderer.dispose();
    return { unavailable: 'slow' };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.classList.add('space-canvas');
  const labels = new CSS2DRenderer();
  labels.domElement.classList.add('space-labels');
  labels.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement, labels.domElement);

  const accent = token('--accent', '#5cc8ff');
  const colours = {
    star: token('--star', '#ffe08a'), variable: token('--variable', '#c9a0ff'), solar: token('--solar', '#5cc8ff'),
    hypothetical: token('--hypothetical', '#ffa94d'), other: token('--other', '#c8d2e3'), muted: token('--muted', '#8d9bb0'),
  };
  const world = new Scene();
  const camera = new PerspectiveCamera(FOV_DEG, 1, 0.05, 3000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.minDistance = HOME_MIN_DISTANCE;
  controls.maxDistance = sceneFitDistance({ aspect: 1, fovDeg: FOV_DEG });
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.9;
  const starLabels = [];
  const places = new Map();
  // Every label, with its kind (focus.js LABEL_IMPORTANCE) and the body it names, for the overlap rule.
  const labelItems = [];
  let focusKey = null;

  /** A label. kind: target, sun, earth, planet, hypothetical, note or ring. key: the body a click on it chooses. */
  function label(text, className, position, { key = null, kind = 'note', onClick = null } = {}) {
    const node = document.createElement('div');
    node.className = `space-label ${className}`;
    node.textContent = text;
    if (key) {
      node.dataset.key = key;
      node.classList.add('is-pick');
      // A label may lie over another body's dot: a click right on that dot means that body.
      node.addEventListener('click', (event) => choose(bodyAt(event, DOT_RADIUS_PX) ?? key));
    } else if (onClick) {
      node.classList.add('is-pick');
      node.addEventListener('click', onClick);
    }
    const object = new CSS2DObject(node);
    object.position.copy(position);
    object.center.set(...ANCHORS[0]);
    world.add(object);
    labelItems.push({ object, kind, key, size: null, faded: false, anchor: 0 });
    return object;
  }

  /** A body's place: a click or tap near it chooses it (its drawn size, `extent`, widens the reach). */
  function place(key, position, { name, extent = 0, star = false }) {
    places.set(key, { position, name, extent, star });
  }

  // Bodies that move with the time control (setTime): everything drawn at the body's place, and its place.
  const movers = [];
  const planetOrbits = [];
  let orbitJd = null;

  // ---------- Background stars (decoration) ----------
  const random = (() => {
    let seed = 7;
    return () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
  })();
  const sky = Array.from({ length: BACKGROUND_STARS }, () => {
    const z = 2 * random() - 1;
    const angle = 2 * Math.PI * random();
    const radius = Math.sqrt(1 - z * z);
    return new Vector3(radius * Math.cos(angle), z, radius * Math.sin(angle)).multiplyScalar(900);
  });
  world.add(pointCloud(sky, new PointsMaterial({ color: colours.other, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false })));

  // ---------- Sun ----------
  world.add(ball(SIZE.sun, '#fff3c4'), glow('#ffd77a', 9, 0.9), glow('#fff3c4', 3.2));
  place('sun', new Vector3(), { name: labelOf('sun'), extent: extentOf('sun') });
  label(labelOf('sun'), 'is-sun', new Vector3(0, -1.6, 0), { key: 'sun', kind: 'sun' });

  // Task B29: the layers the Key's switches show and hide (orbits, Kuiper Belt, Planet Nine range; labels are one element).
  const layers = { orbits: [], kuiper: [], nine: [] };

  // ---------- Reference rings for the log scale ----------
  const ringMaterial = new LineBasicMaterial({ color: accent, transparent: true, opacity: 0.12 });
  for (const au of REFERENCE_RINGS_AU) {
    const radius = scaledRadius(au);
    world.add(circle(radius, ringMaterial));
    label(labelOf('ring', { value: new Intl.NumberFormat('en').format(au) }), 'is-ring', new Vector3(radius * Math.cos(5.2), 0, -radius * Math.sin(5.2)), { kind: 'ring' });
  }

  // ---------- Planets (JPL approximate elements), at the shown date ----------
  const jd = julianDate(date);
  orbitJd = jd;
  const orbitMaterial = new LineBasicMaterial({ color: accent, transparent: true, opacity: 0.32 });
  for (const planet of PLANETS) {
    const orbitLine = loop(orbitPoints(planet, jd, 256).map(sceneAt), orbitMaterial);
    planetOrbits.push({ planet, line: orbitLine });
    layers.orbits.push(orbitLine);
    world.add(orbitLine);
    const position = sceneAt(planetPosition(planet, jd));
    const body = ball(SIZE[planet], PLANET_TINT[planet]);
    body.position.copy(position);
    world.add(body);
    const drawn = [body];
    if (planet === 'saturn') {
      const rings = new Mesh(new RingGeometry(SIZE.saturn * 1.35, SIZE.saturn * 2.1, 48), new MeshBasicMaterial({ color: PLANET_TINT.saturn, side: DoubleSide, transparent: true, opacity: 0.55 }));
      rings.position.copy(position);
      rings.rotation.x = -Math.PI / 2 + 0.47;
      world.add(rings);
      drawn.push(rings);
    }
    if (planet === 'earth') {
      const halo = glow(accent, 1.4, 0.8);
      halo.position.copy(position);
      world.add(halo);
      drawn.push(halo);
    }
    // The label (Earth's says that SPHEREx orbits it) moves with its planet; a click on it, or near the planet, flies there.
    const kind = planet === 'earth' ? 'earth' : 'planet';
    drawn.push(label(labelOf(`planet.${planet}`), `is-${kind}`, position, { key: planet, kind }));
    place(planet, position, { name: labelOf(planet === 'earth' ? 'earth' : `planet.${planet}`), extent: extentOf(planet) });
    movers.push({ key: planet, at: (when) => planetPosition(planet, when), drawn });
  }

  // ---------- Kuiper Belt (illustration) ----------
  const belt = pointCloud(kuiperBelt(BELT_POINTS).map(sceneAt), new PointsMaterial({ color: colours.solar, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.32, depthWrite: false }));
  world.add(belt);
  const beltLabelRadius = scaledRadius(40);
  layers.kuiper.push(belt, label(labelOf('kuiper'), 'is-note', new Vector3(beltLabelRadius * Math.cos(2.4), 0.8, -beltLabelRadius * Math.sin(2.4)), { kind: 'note' }));

  // ---------- Pluto and Makemake (scene3d.json) ----------
  // With JPL Small-Body Database elements they move by Kepler's equation; without, they stay at the JPL Horizons
  // position of the file's date and are listed in fixedBodies (the time control says so).
  const fixedBodies = [];
  for (const key of ['pluto', 'makemake']) {
    const body = data?.bodies?.[key];
    const now = body?.position_now?.position_au;
    const elements = smallBodyElements(body?.catalogue_orbit);
    if (!Array.isArray(now) && !elements) continue;
    const orbit = body.catalogue_orbit?.orbit_points_au;
    if (Array.isArray(orbit) && orbit.length > 8) {
      const orbitLoop = loop(orbit.map(sceneAt), new LineBasicMaterial({ color: colours.solar, transparent: true, opacity: 0.55 }));
      world.add(orbitLoop);
      layers.orbits.push(orbitLoop);
    }
    const position = sceneAt(elements ? smallBodyPosition(elements, jd) : now);
    const dot = ball(SIZE.dwarf, colours.solar);
    dot.position.copy(position);
    const halo = glow(colours.solar, 1.5, 0.9);
    halo.position.copy(position);
    world.add(dot, halo);
    const name = nameOf(key) ?? key;
    const tag = label(name, 'is-target colour-solar', position, { key, kind: 'target' });
    place(key, position, { name, extent: extentOf(key) });
    if (elements) movers.push({ key, at: (when) => smallBodyPosition(elements, when), drawn: [dot, halo, tag] });
    else fixedBodies.push({ key, name, jd: body.position_now.epoch_jd_tdb });
  }

  // ---------- Planet Nine: faint shaded rings for the published ranges; no point, no orbit line ----------
  // The scene shows a short label only; the explanation with the cited ranges opens in the colour key when the ring,
  // the label or the key entry is clicked or hovered (onNine), never permanently over the scene.
  const ranges = planetNineRanges(data?.planet_nine);
  const orange = colours.hypothetical;
  const nineRings = [];
  for (const range of ranges) {
    const ring = new Mesh(
      new RingGeometry(scaledRadius(range.low), scaledRadius(range.high), 192, 1),
      new MeshBasicMaterial({ color: orange, transparent: true, opacity: NINE_OPACITY[0], side: DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    world.add(ring);
    nineRings.push(ring);
    layers.nine.push(ring);
  }
  const ninePlace = scaledRadius(ranges.length ? Math.max(...ranges.map((range) => range.high)) : 500);
  const cited = ranges.map((range) => labelOf('planetNineRange', { low: String(range.low), high: String(range.high), reference: range.reference })).join('; ');
  const nineText = ranges.length ? labelOf('planetNineRanges', { ranges: cited }) : labelOf('planetNine');
  const nineTag = label(labelOf('nineShort'), 'is-hypothetical', new Vector3(ninePlace * Math.cos(3.6), 0, -ninePlace * Math.sin(3.6)), {
    kind: 'hypothetical', onClick: () => options.onNine?.('click'),
  });
  layers.nine.push(nineTag);
  nineTag.element.addEventListener('pointerenter', () => options.onNine?.('enter'));
  nineTag.element.addEventListener('pointerleave', () => options.onNine?.('leave'));

  // ---------- Target stars: real directions, on an outer shell ----------
  // A dashed sightline runs from just outside the drawn Solar System toward each star, with the label on its
  // near part, so every direction shows from the default view; the star itself glows where the line ends.
  for (const star of data?.stars ?? []) {
    if (!Array.isArray(star.direction_icrs)) continue;
    const direction = toScene(equatorialToEcliptic(star.direction_icrs)).normalize();
    const position = direction.clone().multiplyScalar(STAR_SHELL);
    const variable = ['rwaur', 'rdra'].includes(star.key);
    const colour = variable ? colours.variable : colours.star;
    const sprite = glow(colour, 5.5);
    sprite.position.copy(position);
    const line = new Line(
      new BufferGeometry().setFromPoints([direction.clone().multiplyScalar(SIGHTLINE_START), position]),
      new LineDashedMaterial({ color: colour, dashSize: 1.2, gapSize: 1.6, transparent: true, opacity: 0.4 }),
    );
    line.computeLineDistances();
    world.add(sprite, line);
    const name = nameOf(star.key) ?? star.key;
    const tag = label(labelOf('star', { name, distance: options.distanceOf?.(star) ?? '' }), `is-target colour-${variable ? 'variable' : 'star'}`, direction.clone().multiplyScalar(SIGHTLINE_LABEL), { key: star.key, kind: 'target' });
    starLabels.push({ tag, direction: direction.clone() });
    place(star.key, position, { name, extent: STAR_PICK_RADIUS, star: true });
  }

  // ---------- Camera, views and flights ----------
  const views = {
    // Portrait screens need more distance to fit the same width of the Solar System.
    get home() {
      const distance = Math.min(MAX_CAMERA_DISTANCE - 3, HOME_VIEW.distance * Math.max(1, 1.2 / (camera.aspect || 1)));
      return { position: fromEcliptic({ ...HOME_VIEW, distance }), target: new Vector3(0, 0, 0), name: labelOf('sun') };
    },
    get top() {
      return { position: new Vector3(0, 96, 0.001), target: new Vector3(0, 0, 0), name: labelOf('sun') };
    },
  };
  controls.target.set(0, 0, 0);
  let frame = 0;
  let flight = null;
  let currentName = views.home.name;
  const frameTimes = [];
  let judging = !reducedMotion;
  let alive = true;
  /** Task B27a: no frames while an investigation covers the scene. */
  let paused = false;
  let size = { width: 1, height: 1 };

  /** A body the camera then follows: seen from outside its orbit, to one side and above, at its flight distance. */
  function focusView(key) {
    const spot = places.get(key);
    const distance = flyDistanceFor(key);
    let offset;
    if (key === 'sun' || !spot.position.lengthSq()) {
      offset = fromEcliptic({ ...HOME_VIEW, distance });
    } else {
      // The side offset puts the Sun to the right of the body (the left of the scene sits under the search console).
      const outward = spot.position.clone().normalize();
      const side = outward.clone().cross(new Vector3(0, 1, 0)).normalize();
      offset = outward.add(side.multiplyScalar(0.35)).add(new Vector3(0, 0.45, 0)).normalize().multiplyScalar(distance);
    }
    return { position: spot.position.clone().add(offset), target: spot.position.clone(), name: spot.name, focus: key, minDistance: minDistanceFor(key) };
  }

  function viewFor(key) {
    const spot = places.get(key);
    if (!spot) return null;
    if (!spot.star) return focusView(key);
    // Look from behind the Sun toward the star: the Solar System in front, the star's direction ahead.
    const direction = spot.position.clone().normalize();
    // The target is on the line to the star (closer than the shell), so the controls' distance limit holds.
    const position = direction.clone().multiplyScalar(-34).add(new Vector3(0, 9, 0));
    return { position, target: direction.clone().multiplyScalar(24), name: spot.name };
  }

  // ---------- Labels: the focused body's first, then the important and near ones; none under a panel ----------
  const projected = new Vector3();
  let blocked = null;
  function measureBlockers() {
    const box = host.getBoundingClientRect();
    const scene = { x: 0, y: 0, w: box.width, h: box.height };
    blocked = (options.blockers?.() ?? []).flatMap((node) => {
      // checkVisibility: the content of a closed <details> (the Fly to list) still reports boxes.
      if (!node || !(node.checkVisibility ? node.checkVisibility() : node.getClientRects().length > 0)) return [];
      const rect = node.getBoundingClientRect();
      const local = { x: rect.left - box.left, y: rect.top - box.top, w: rect.width, h: rect.height };
      return local.w > 0 && local.h > 0 && overlaps(local, scene) ? [local] : [];
    });
  }

  function arrangeLabels() {
    if (!blocked) measureBlockers();
    const candidates = [];
    for (const item of labelItems) {
      const node = item.object.element;
      if (node.style.display === 'none' || node.classList.contains('is-end-on')) continue;
      // Sizes are read once (and again after a resize or the web fonts arrive), not on every frame.
      if (!item.size) {
        if (!node.offsetWidth) continue;
        item.size = [node.offsetWidth, node.offsetHeight];
      }
      const [w, h] = item.size;
      projected.copy(item.object.position).project(camera);
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      // The label's box at each place around its point, its current place first (so it does not hop about).
      const order = [item.anchor, ...ANCHORS.keys()].filter((anchor, index, all) => all.indexOf(anchor) === index);
      candidates.push({
        id: item, order, rects: order.map((anchor) => ({ x: x - ANCHORS[anchor][0] * w, y: y - ANCHORS[anchor][1] * h, w, h })),
        kind: item.kind, depth: camera.position.distanceTo(item.object.position), focused: Boolean(item.key) && item.key === focusKey, shown: !item.faded,
      });
    }
    const placed = chooseLabels(candidates, { blocked, bounds: { x: 0, y: 0, w: size.width, h: size.height } });
    let moved = false;
    for (const candidate of candidates) {
      const item = candidate.id;
      if (!placed.has(item)) continue;
      const anchor = candidate.order[placed.get(item)];
      if (anchor === item.anchor) continue;
      item.anchor = anchor;
      item.object.center.set(...ANCHORS[anchor]);
      moved = true;
    }
    for (const item of labelItems) {
      // The followed body's label gets a dark backing: close up it sits on the body's own disc.
      const focused = Boolean(item.key) && item.key === focusKey;
      if (focused !== Boolean(item.focused)) {
        item.focused = focused;
        item.object.element.classList.toggle('is-focus', focused);
      }
      const faded = !placed.has(item);
      if (faded === item.faded) continue;
      item.faded = faded;
      item.object.element.classList.toggle('is-faded', faded);
    }
    // A label that changed sides is drawn there in this frame, not the next.
    if (moved) labels.render(world, camera);
  }

  const viewDirection = new Vector3();
  function render() {
    // A star whose direction points (almost) straight at or away from the camera would put its label on the Sun.
    viewDirection.subVectors(controls.target, camera.position).normalize();
    for (const { tag, direction } of starLabels) tag.element.classList.toggle('is-end-on', Math.abs(viewDirection.dot(direction)) > END_ON_COSINE);
    renderer.render(world, camera);
    labels.render(world, camera);
    arrangeLabels();
  }

  let lastTick = null;
  function tick(now) {
    frame = 0;
    if (!alive) return;
    if (judging) {
      frameTimes.push(now);
      if (frameTimes.length > MIN_FRAMES_TO_JUDGE && !flight) {
        judging = false;
        const gaps = frameTimes.slice(1).map((time, index) => time - frameTimes[index]).sort((a, b) => a - b);
        if (gaps[Math.floor(gaps.length / 2)] > SLOW_FRAME_MS) {
          options.onSlow?.();
          return;
        }
      }
    }
    let again = false;
    if (flight) {
      const k = Math.min(1, (now - flight.start) / flight.duration);
      const eased = easeInOut(k);
      // A flight to a moving body aims at where the body is now, so it arrives centred while time runs.
      if (flight.follow) {
        const spot = places.get(flight.follow).position;
        flight.to.target.copy(spot);
        flight.to.position.copy(spot).add(flight.offset);
      }
      camera.position.lerpVectors(flight.from.position, flight.to.position, eased);
      controls.target.lerpVectors(flight.from.target, flight.to.target, eased);
      if (k >= 1) {
        const done = flight.then;
        flight = null;
        controls.enabled = true;
        done?.();
      } else {
        again = true;
      }
    }
    // The slow turn is timed in seconds (task B29), so it is the same on a 60 Hz and a 120 Hz screen.
    const delta = lastTick === null ? null : Math.min(0.1, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;
    again = controls.update(delta) || again;
    render();
    if (again || judging) requestRender();
  }

  function requestRender() {
    if (!frame && alive && !paused) frame = requestAnimationFrame(tick);
  }

  function go(view, { then = null, duration = FLIGHT_MS } = {}) {
    if (!view) return false;
    currentName = view.name;
    focusKey = view.focus ?? null;
    // How close the camera may come depends on the body; pulling back is allowed until the whole scene shows.
    controls.minDistance = view.minDistance ?? HOME_MIN_DISTANCE;
    // A followed body stays centred: no panning away from it.
    controls.enablePan = !focusKey;
    options.onHud?.({ target: currentName });
    if (reducedMotion || duration === 0) {
      flight = null;
      camera.position.copy(view.position);
      controls.target.copy(view.target);
      controls.update();
      render();
      then?.();
      return true;
    }
    controls.enabled = false;
    flight = {
      start: performance.now(), duration, then, follow: focusKey,
      from: { position: camera.position.clone(), target: controls.target.clone() },
      to: { position: view.position.clone(), target: view.target.clone() },
      offset: view.position.clone().sub(view.target),
    };
    requestRender();
    return true;
  }

  /** A click or tap on a body or its label: a challenge target opens through the page (which flies there first); any other body is flown to and followed. */
  function choose(key) {
    if (options.onPick?.(key)) return;
    if (FOCUS_KEYS.includes(key) && places.has(key)) go(focusView(key));
  }

  // ---------- Size and the free area beside the left console ----------
  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    size = { width, height };
    renderer.setSize(width, height);
    labels.setSize(width, height);
    // In the phone layout the page scrolls past the scene: a vertical swipe scrolls, a sideways drag turns, a pinch zooms.
    renderer.domElement.style.touchAction = matchMedia('(max-width: 900px)').matches ? 'pan-y' : 'none';
    camera.aspect = width / height;
    // A positive inset is covered on the left, a negative one on the right (task B29: the Famous targets rail).
    const inset = Math.max(-width * 0.6, Math.min(options.insetLeft?.() ?? 0, width * 0.6));
    if (inset !== 0) camera.setViewOffset(width, height, -inset / 2, 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    // From any target the visitor may zoom out until the whole scene, star shell included, fits the free area.
    controls.maxDistance = sceneFitDistance({ aspect: (width - Math.abs(inset)) / height, fovDeg: FOV_DEG });
    blocked = null;
    for (const item of labelItems) item.size = null;
    requestRender();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  // The panels over the scene change size (the colour key opens, a note appears): measure them again.
  const blockerObserver = new ResizeObserver(() => {
    blocked = null;
    requestRender();
  });
  for (const node of options.blockers?.() ?? []) if (node) blockerObserver.observe(node);
  document.fonts?.ready.then(() => {
    for (const item of labelItems) item.size = null;
    requestRender();
  });

  // ---------- Picking (a click or tap, not the end of a drag) ----------
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let downAt = null;
  let overNine = false;
  const local = (event) => {
    const box = renderer.domElement.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  /** The body under a click or tap: the nearest on screen within a 44 px target or its disc (focus.js). */
  function bodyAt(event, minRadius) {
    const at = local(event);
    const scale = size.height / (2 * Math.tan((FOV_DEG / 2) * (Math.PI / 180)));
    const candidates = [];
    for (const [key, spot] of places) {
      projected.copy(spot.position).project(camera);
      if (projected.z < -1 || projected.z > 1) continue;
      const depth = camera.position.distanceTo(spot.position);
      candidates.push({
        key, depth, radius: (spot.extent * scale) / Math.max(depth, 1e-6),
        x: (projected.x * 0.5 + 0.5) * size.width, y: (-projected.y * 0.5 + 0.5) * size.height,
      });
    }
    return pickOnScreen(candidates, at, minRadius);
  }
  function onNineRing(event) {
    if (!nineRings.length || !nineRings[0].visible) return false;
    const at = local(event);
    pointer.set((at.x / size.width) * 2 - 1, -(at.y / size.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(nineRings, false).length > 0;
  }
  renderer.domElement.addEventListener('pointerdown', (event) => {
    downAt = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (event) => {
    if (!downAt || Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > CLICK_SLOP_PX) return;
    downAt = null;
    const key = bodyAt(event);
    if (key) choose(key);
    else if (onNineRing(event)) options.onNine?.('click');
    else {
      options.onNine?.('away');
      options.onEmpty?.(); // task B29: empty space closes a target's popup
    }
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (event.buttons) return;
    const key = bodyAt(event);
    const nine = !key && onNineRing(event);
    renderer.domElement.style.cursor = key || nine ? 'pointer' : '';
    if (nine !== overNine) {
      overNine = nine;
      options.onNine?.(nine ? 'enter' : 'leave');
    }
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    if (!overNine) return;
    overNine = false;
    options.onNine?.('leave');
  });
  // Labels that take clicks sit over the canvas: a wheel over one still zooms the scene.
  labels.domElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    renderer.domElement.dispatchEvent(new WheelEvent('wheel', event));
  }, { passive: false });
  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', () => {
    flight = null;
    controls.enabled = true;
  });

  resize();
  // An opening dolly from farther out; its frame times also tell whether this device copes.
  camera.position.copy(views.home.position).multiplyScalar(reducedMotion ? 1 : 1.3).clampLength(0, MAX_CAMERA_DISTANCE);
  go(views.home, { duration: reducedMotion ? 0 : INTRO_MS });
  options.onHud?.({ target: currentName });

  /** Moves the planets, Pluto and Makemake to `when` (a Date) and draws one frame. Stars, belt and rings stay. */
  const moved = new Vector3();
  function setTime(when) {
    const at = julianDate(when);
    if (!Number.isFinite(at)) return;
    const followed = focusKey ? places.get(focusKey) : null;
    if (followed) moved.copy(followed.position);
    for (const mover of movers) {
      const position = sceneAt(mover.at(at));
      for (const object of mover.drawn) object?.position.copy(position);
      places.get(mover.key)?.position.copy(position);
    }
    // The followed body stays centred: the camera moves with it (a flight already aims at its new place).
    if (followed && !flight) {
      moved.subVectors(followed.position, moved);
      camera.position.add(moved);
      controls.target.add(moved);
    }
    // The orbits themselves change slowly (perihelion and node drift): redraw them after a decade of change.
    if (Math.abs(at - orbitJd) > ORBIT_REDRAW_DAYS) {
      orbitJd = at;
      for (const { planet, line } of planetOrbits) line.geometry.setFromPoints(orbitPoints(planet, at, 256).map(sceneAt));
    }
    requestRender();
  }

  return {
    setTime,
    fixedBodies,
    /**
     * Home's first screen (task B25): the scene slowly turns (unless rotate is false, for reduced motion) and the
     * wheel scrolls the page instead of zooming; off, the scene behaves as before.
     */
    heroMode(on, { rotate = true } = {}) {
      controls.autoRotate = Boolean(on && rotate);
      controls.autoRotateSpeed = 0.35;
      controls.enableZoom = !on;
      requestRender();
    },
    /** Task B29: Home's slow turn (speed 0.5 is one turn in about two minutes); the wheel always zooms. */
    autoTurn(on, speed = 0.5) {
      controls.autoRotate = Boolean(on);
      controls.autoRotateSpeed = speed;
      controls.enableZoom = true;
      requestRender();
    },
    /** Task B29: the Key's layer switches: 'orbits', 'labels', 'kuiper' or 'nine', shown or hidden at once. */
    setLayer(name, on) {
      if (name === 'labels') labels.domElement.style.visibility = on ? '' : 'hidden';
      for (const object of layers[name] ?? []) object.visible = Boolean(on);
      blocked = null;
      requestRender();
    },
    /** Task B29: the type filter; targets outside `keys` (a Set, or null for all) are dimmed, those inside stand out. */
    dimExcept(keys, targets) {
      for (const item of labelItems) {
        if (!item.key || !targets.has(item.key)) continue;
        item.object.element.classList.toggle('is-dimmed', Boolean(keys) && !keys.has(item.key));
        item.object.element.classList.toggle('is-match', Boolean(keys) && keys.has(item.key));
      }
      requestRender();
    },
    /** Task B29: the chosen Famous target's label stands out (null clears it). */
    highlight(key) {
      for (const item of labelItems) item.object.element.classList.toggle('is-selected', Boolean(key) && item.key === key);
      requestRender();
    },
    has: (key) => places.has(key),
    nameOf: (key) => places.get(key)?.name ?? key,
    /** The bodies of the "Fly to" list that this scene has. */
    focusKeys: () => FOCUS_KEYS.filter((key) => places.has(key)),
    focused: () => focusKey,
    /** Flies to a body and keeps it centred while time runs (the "Fly to" list). */
    focus: (key) => (FOCUS_KEYS.includes(key) && places.has(key) ? go(focusView(key)) : false),
    flyTo: (key, { then = null } = {}) => go(viewFor(key), { then }),
    reset: () => go(views.home),
    top: () => go(views.top),
    /** The Planet Nine explanation (cited ranges) for the colour key, and its highlight in the scene. */
    nineText,
    highlightNine(on) {
      for (const ring of nineRings) ring.material.opacity = NINE_OPACITY[on ? 1 : 0];
      nineTag.element.classList.toggle('is-active', Boolean(on));
      requestRender();
    },
    /** Measure the panels over the scene again (one opened or closed). */
    relayout() {
      blocked = null;
      requestRender();
    },
    render: requestRender,
    /** Task B27a: stops drawing (an open target covers the scene) and starts again when it is closed. */
    setPaused(on) {
      paused = Boolean(on);
      if (paused && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      if (!paused) requestRender();
    },
    isPaused: () => paused,
    resize,
    dispose() {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      blockerObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labels.domElement.remove();
    },
  };
}
