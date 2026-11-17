// Task B34: "Path through time (3D)" in What changed. The floor is the sky around the target (east left, north up,
// with an arcsecond scale); height is time. Each dot is a position measured by us from SPHEREx (path3d.js), joined in
// date order; the model line only where the file publishes a fit. three.js (the bundled copy) loads only when the
// panel opens; without WebGL the same path is drawn from above as a 2D chart. No auto-spin under reduced motion.
import { dataTable, details, el, formatNumber, prefersReducedMotion } from './dom.js';
import { t } from './i18n.js';
import { floorFrame, pathData, scaleArcsec } from './path3d.js';

const FLOOR = 10; // half-size of the floor in scene units
const HEIGHT = 12; // height of the time axis in scene units
const SVG = 'http://www.w3.org/2000/svg';
let threeModule = null;
let live = null;

const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const mjdDate = (mjd) => new Date(Date.UTC(1858, 10, 17) + mjd * 86400000);
const dayText = (mjd) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(mjdDate(mjd));
const utcText = (mjd) => mjdDate(mjd).toISOString().slice(0, 16).replace('T', ' ');
const arcsecText = (value) => `${new Intl.NumberFormat('en', { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)}″`;

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Scene coordinates of a sky offset at a time: east to the left (−x), north away from the viewer (−z), time up (y). */
function placer(path, frame) {
  const scale = FLOOR / frame.half;
  const t0 = path.points[0].mjd;
  const span = Math.max(path.points.at(-1).mjd - t0, 1);
  return {
    x: (east) => -(east - frame.centre.east) * scale,
    z: (north) => -(north - frame.centre.north) * scale,
    y: (mjd) => ((mjd - t0) / span) * HEIGHT,
    scale,
  };
}

function stopLive() {
  live?.dispose();
  live = null;
}

/** Draws the panel for the open target, or hides it when the files have fewer than 3 measured positions. */
export function renderPath3d(host, { investigation, name = '' }) {
  stopLive();
  const path = investigation?.state === 'ok' ? pathData(investigation.doc) : null;
  if (!path) {
    host.replaceChildren();
    host.hidden = true;
    return null;
  }
  host.hidden = false;
  const stage = el('div', { class: 'path3d-stage', role: 'img', 'aria-label': t('path3d.label', { name, n: String(path.points.length) }) });
  const shadow = el('input', { type: 'checkbox', role: 'switch', id: 'path3d-shadow' });
  const reset = el('button', { type: 'button', class: 'quiet', id: 'path3d-reset', text: t('path3d.reset') });
  const status = el('p', { class: 'note path3d-status', role: 'status', text: '' });
  const legend = el('ul', { class: 'path3d-legend' }, [
    el('li', { class: 'is-measured' }, [el('i', { 'aria-hidden': 'true' }), el('span', { text: t('path3d.measured') })]),
    path.model ? el('li', { class: 'is-model' }, [el('i', { 'aria-hidden': 'true' }), el('span', { text: t('path3d.model') })]) : null,
  ]);
  const body = el('div', { class: 'path3d-body' }, [
    el('p', { class: 'path3d-caption', text: t('path3d.caption') }),
    stage,
    el('div', { class: 'path3d-controls' }, [reset, el('label', { class: 'path3d-switch', for: 'path3d-shadow' }, [shadow, el('span', { text: t('path3d.shadow') })])]),
    legend,
    status,
    path.model ? null : el('p', { class: 'note', text: t('path3d.noModel') }),
    details([
      el('p', { class: 'note', text: t('path3d.count', { n: String(path.points.length), visits: String(path.visits.length) }) }),
      el('p', { class: 'note', text: t('path3d.about', { origin: t(`path3d.origin.${path.origin.kind}`) }) }),
      dataTable({
        caption: t('path3d.tableCaption'),
        columns: [t('path3d.col.date'), t('path3d.col.east'), t('path3d.col.north')],
        rows: path.points.map((point) => [utcText(point.mjd), formatNumber(point.east, 2), formatNumber(point.north, 2)]),
      }),
    ]),
  ]);
  const panel = el('details', { class: 'path3d glass', id: 'path3d' }, [el('summary', { text: t('path3d.title') }), body]);
  host.replaceChildren(panel);
  let started = false;
  panel.addEventListener('toggle', () => {
    if (!panel.open) {
      live?.pause?.();
      return;
    }
    if (started) {
      live?.resume?.();
      return;
    }
    started = true;
    const began = performance.now();
    status.textContent = t('path3d.loading');
    const done = (view) => {
      live = view;
      status.textContent = '';
      panel.dataset.openedMs = String(Math.round(performance.now() - began));
      panel.dataset.view = view?.kind ?? 'none';
    };
    if (!webglAvailable()) {
      done(draw2d(stage, path, { shadow, reset, status }));
      status.textContent = t('path3d.noWebgl');
      return;
    }
    threeModule ??= import('../vendor/three/three-tenger.min.js');
    threeModule.then((three) => {
      panel.dataset.importMs = String(Math.round(performance.now() - began));
      done(draw3d(three, stage, path, { shadow, reset }));
    })
      .catch(() => {
        threeModule = null; // a failed download is not kept: the next opening tries again
        started = false;
        done(draw2d(stage, path, { shadow, reset, status }));
        status.textContent = t('path3d.loadFailed');
      });
  });
  return panel;
}

function draw3d(THREE, stage, path, { shadow, reset }) {
  const {
    BufferGeometry, CSS2DObject, CSS2DRenderer, Float32BufferAttribute, Line, LineBasicMaterial, OrbitControls,
    PerspectiveCamera, Points, PointsMaterial, Scene, WebGLRenderer,
  } = THREE;
  const frame = floorFrame(path);
  const at = placer(path, frame);
  const accent = token('--accent', '#5cc8ff');
  const star = token('--star', '#ffe08a');
  const muted = token('--muted', '#8d9bb0');
  const border = token('--border-strong', '#2e3b52');
  const scene = new Scene();
  const line = (points, color, opacity = 1) => new Line(
    new BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
    new LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
  );
  const label = (text, [x, y, z], className = '') => {
    const node = el('span', { class: `path3d-label ${className}`.trim(), text });
    const object = new CSS2DObject(node);
    object.position.set(x, y, z);
    return object;
  };
  // The floor: a square of sky with a grid at the scale-bar step, E and N, and the scale bar.
  const step = scaleArcsec(frame.half * 2);
  const stepScene = step * at.scale;
  const lines = Math.min(40, Math.floor(FLOOR / stepScene));
  for (let k = -lines; k <= lines; k += 1) {
    scene.add(line([[k * stepScene, 0, -FLOOR], [k * stepScene, 0, FLOOR]], border, 0.55));
    scene.add(line([[-FLOOR, 0, k * stepScene], [FLOOR, 0, k * stepScene]], border, 0.55));
  }
  scene.add(line([[-FLOOR, 0, -FLOOR], [FLOOR, 0, -FLOOR], [FLOOR, 0, FLOOR], [-FLOOR, 0, FLOOR], [-FLOOR, 0, -FLOOR]], muted, 0.8));
  scene.add(label(t('path3d.east'), [-FLOOR - 1.2, 0, 0], 'is-axis'));
  scene.add(label(t('path3d.north'), [0, 0, -FLOOR - 1.2], 'is-axis'));
  const barStart = FLOOR - stepScene - 0.4;
  scene.add(line([[barStart, 0.02, FLOOR - 0.6], [barStart + stepScene, 0.02, FLOOR - 0.6]], star));
  scene.add(label(arcsecText(step), [barStart + stepScene / 2, 0, FLOOR + 0.4], 'is-scale'));
  // Time: a vertical axis at the back-left corner, with each visit's date.
  const corner = [-FLOOR, -FLOOR];
  scene.add(line([[corner[0], 0, corner[1]], [corner[0], HEIGHT, corner[1]]], muted));
  scene.add(label(t('path3d.time'), [corner[0], HEIGHT + 1.8, corner[1]], 'is-axis'));
  for (const visit of path.visits) {
    const y = at.y(visit.mjd);
    scene.add(line([[corner[0], y, corner[1]], [corner[0] + 0.6, y, corner[1]]], muted));
    scene.add(line([[corner[0], y, corner[1]], [FLOOR, y, corner[1]]], border, 0.25));
    scene.add(label(dayText(visit.mjd), [corner[0] - 2.4, y, corner[1]], 'is-date'));
  }
  // The measured dots, joined in date order, and their shadow on the floor.
  const placed = path.points.map((point) => [at.x(point.east), at.y(point.mjd), at.z(point.north)]);
  const dots = new BufferGeometry();
  dots.setAttribute('position', new Float32BufferAttribute(placed.flat(), 3));
  scene.add(new Points(dots, new PointsMaterial({ color: accent, size: 0.32, sizeAttenuation: true })));
  scene.add(line(placed, accent, 0.55));
  // The dots' label sits halfway along the path (inside the view for any target); the model's at its top end.
  const [first, last] = [placed[0], placed.at(-1)];
  scene.add(label(t('path3d.measured'), [(first[0] + last[0]) / 2 + 1.5, (first[1] + last[1]) / 2, (first[2] + last[2]) / 2], 'is-measured'));
  const flat = placed.map(([x, , z]) => [x, 0.03, z]);
  const shadowGroup = new THREE.Points(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(flat.flat(), 3)),
    new PointsMaterial({ color: muted, size: 0.22, transparent: true, opacity: 0.7 }));
  const shadowLine = line(flat, muted, 0.6);
  shadowGroup.visible = shadowLine.visible = shadow.checked;
  scene.add(shadowGroup, shadowLine);
  // The model line (computed from the file's fit), from the first to the last measured date.
  if (path.model) {
    const ends = [path.points[0].mjd, path.points.at(-1).mjd].map((mjd) => {
      const position = path.model.at(mjd);
      return [at.x(position.east), at.y(mjd), at.z(position.north)];
    });
    scene.add(line(ends, star, 0.9));
    scene.add(label(t('path3d.model'), [ends[1][0], ends[1][1] + 1.2, ends[1][2]], 'is-model'));
  }
  const width = () => Math.max(stage.clientWidth, 200);
  const height = () => Math.round(Math.min(Math.max(width() * 0.78, 260), 480));
  const camera = new PerspectiveCamera(42, width() / height(), 0.1, 500);
  camera.position.set(0, HEIGHT * 0.95, FLOOR * 2.6);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(width(), height());
  const labels = new CSS2DRenderer();
  labels.setSize(width(), height());
  labels.domElement.className = 'path3d-labels';
  stage.replaceChildren(renderer.domElement, labels.domElement);
  const controls = new OrbitControls(camera, labels.domElement);
  controls.target.set(0, HEIGHT / 2, 0);
  controls.enablePan = false;
  controls.minDistance = FLOOR * 0.8;
  controls.maxDistance = FLOOR * 6;
  const still = prefersReducedMotion();
  controls.enableDamping = !still;
  controls.autoRotate = !still;
  controls.autoRotateSpeed = 0.6;
  controls.update();
  controls.saveState();
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  let raf = null;
  let running = true; // the panel is open
  let visible = true; // the stage is on screen (not scrolled away, not on a hidden page)
  const frameOnce = () => {
    renderer.render(scene, camera);
    labels.render(scene, camera);
  };
  // Draws only while something moves (auto-spin, a drag settling) and the stage can be seen.
  const loop = () => {
    raf = null;
    if (!running || !visible || !stage.isConnected) return;
    const moved = controls.update();
    frameOnce();
    // update() fires 'change', which may already have scheduled the next frame: never schedule a second one.
    if ((controls.autoRotate || moved) && raf === null) raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (running && visible && raf === null) raf = requestAnimationFrame(loop); };
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    kick();
  });
  seen.observe(stage);
  controls.addEventListener('change', kick);
  shadow.onchange = () => {
    shadowGroup.visible = shadowLine.visible = shadow.checked;
    kick();
  };
  reset.onclick = () => {
    controls.reset();
    controls.autoRotate = false;
    kick();
  };
  const resize = new ResizeObserver(() => {
    camera.aspect = width() / height();
    camera.updateProjectionMatrix();
    renderer.setSize(width(), height());
    labels.setSize(width(), height());
    kick();
  });
  resize.observe(stage);
  frameOnce();
  kick();
  return {
    kind: '3d',
    camera,
    controls,
    pause() { running = false; },
    resume() { running = true; kick(); },
    dispose() {
      running = false;
      if (raf !== null) cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}

/** Without WebGL: the same path from above (east left, north up), dated at each visit, with the model line. */
function draw2d(stage, path, { shadow, reset }) {
  const frame = floorFrame(path);
  const size = 320;
  const pad = 30;
  const x = (east) => size / 2 - ((east - frame.centre.east) / frame.half) * (size / 2 - pad);
  const y = (north) => size / 2 - ((north - frame.centre.north) / frame.half) * (size / 2 - pad);
  const node = (name, attrs, text) => {
    const item = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, String(value));
    if (text) item.textContent = text;
    return item;
  };
  const svg = node('svg', { viewBox: `0 0 ${size} ${size}`, class: 'path3d-2d' });
  svg.append(node('rect', { x: pad / 2, y: pad / 2, width: size - pad, height: size - pad, fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.3 }));
  svg.append(node('polyline', { points: path.points.map((point) => `${x(point.east)},${y(point.north)}`).join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-opacity': 0.6 }));
  for (const point of path.points) svg.append(node('circle', { cx: x(point.east), cy: y(point.north), r: 2.4, fill: 'var(--accent)' }));
  if (path.model) {
    const [a, b] = [path.points[0].mjd, path.points.at(-1).mjd].map((mjd) => path.model.at(mjd));
    svg.append(node('line', { x1: x(a.east), y1: y(a.north), x2: x(b.east), y2: y(b.north), stroke: 'var(--star)' }));
  }
  for (const visit of path.visits) {
    const near = path.points.reduce((best, point) => (Math.abs(point.mjd - visit.mjd) < Math.abs(best.mjd - visit.mjd) ? point : best));
    svg.append(node('text', { x: x(near.east) + 6, y: y(near.north) - 6, fill: 'currentColor', 'font-size': 11 }, dayText(visit.mjd)));
  }
  svg.append(node('text', { x: 4, y: size / 2, fill: 'currentColor', 'font-size': 11 }, t('path3d.east')));
  svg.append(node('text', { x: size / 2, y: 11, fill: 'currentColor', 'font-size': 11, 'text-anchor': 'middle' }, t('path3d.north')));
  stage.replaceChildren(svg);
  // Turning and the shadow have no meaning in a top view: the controls go away rather than sit greyed out.
  shadow.closest('.path3d-controls').hidden = true;
  const caption = stage.parentElement?.querySelector('.path3d-caption');
  if (caption) caption.hidden = true;
  return { kind: '2d', dispose() {} };
}
