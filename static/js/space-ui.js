// Chooses between the 3D home scene and the 2D schematic map, loads the 3D one lazily (three.js only arrives
// after the page is usable), and runs its buttons. The 2D map stays the fallback: no WebGL, reduced motion
// (unless the visitor switches 3D on), a device that draws too slowly, or a script that fails to load.
import { $, formatUtc, prefersReducedMotion } from './dom.js';
import { t } from './i18n.js';

export const VIEW_STORAGE_KEY = 'tenger.view.v1';
const LOW_MEMORY_GB = 2;

let state = { mode: 'unset', controller: null, loading: null, hooks: null, reason: null };

function savedView() {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveView(value) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, value);
  } catch {
    // Best effort: without storage the choice lasts for this page only.
  }
}

/**
 * Whether this browser has WebGL at all. A cheap check: creating a test context costs seconds on software
 * rendering, so a context that then fails to start is caught by createSpace (and the 2D map stays).
 */
export const webglAvailable = () => typeof window.WebGLRenderingContext === 'function' || typeof window.WebGL2RenderingContext === 'function';

/**
 * The view to start in, from the facts of this browser. Pure, so the rules are testable.
 * Returns { mode: '3d' | '2d', reason, offer3d } where offer3d says whether the "3D view" button may be shown.
 */
export function chooseView({ webgl, reducedMotion, saved, deviceMemory = null, embed = false }) {
  if (embed) return { mode: '2d', reason: null, offer3d: false };
  if (!webgl) return { mode: '2d', reason: 'space.noWebgl', offer3d: false };
  if (Number.isFinite(deviceMemory) && deviceMemory < LOW_MEMORY_GB) return { mode: '2d', reason: 'space.slow', offer3d: false };
  if (saved === '2d') return { mode: '2d', reason: null, offer3d: true };
  if (saved === '3d') return { mode: '3d', reason: null, offer3d: true };
  if (reducedMotion) return { mode: '2d', reason: 'space.reducedMotion', offer3d: true };
  return { mode: '3d', reason: null, offer3d: true };
}

async function loadSceneFile() {
  try {
    const response = await fetch('data/scene3d.json');
    if (!response.ok) return null;
    const doc = await response.json();
    return doc && typeof doc === 'object' && doc.bodies ? doc : null;
  } catch {
    return null;
  }
}

function showNote(key, values) {
  const note = $('space-note');
  note.textContent = key ? t(key, values) : '';
  note.hidden = !key;
}

/** The intended view; the 3D one is shown only once its scene exists (the 2D map stays until then). */
function setMode(mode, { shown = mode === '2d' } = {}) {
  state.mode = mode;
  if (shown) {
    document.body.classList.toggle('space-3d', mode === '3d');
    $('space3d').hidden = mode !== '3d';
  }
  // The button names the other view than the one on screen: "3D view" also while the 3D scene is still waiting
  // to start (the 2D map is what the visitor sees then).
  const other = document.body.classList.contains('space-3d') ? 'space.view2d' : 'space.view3d';
  $('space-toggle').textContent = t(`${other}Short`);
  $('space-toggle').setAttribute('aria-label', t(other));
  $('space-toggle').title = t(other);
}

function stop3d() {
  state.pauseWatch?.disconnect();
  state.pauseWatch = null;
  state.auto?.dispose();
  state.auto = null;
  state.time?.dispose();
  state.time = null;
  state.focus?.dispose();
  state.focus = null;
  state.controller?.dispose();
  state.controller = null;
}

// ---------- Home is the Solar System, moving on its own (task B29) ----------

/** The speed step Home runs at with no interaction: one day per second, so the planets visibly orbit. */
export const AUTO_STEP = 4;
/** OrbitControls' autoRotateSpeed 1 turns once a minute: 0.5 is one turn in about two minutes. */
export const AUTO_TURN_SPEED = 0.5;
/** After the last drag, wheel or touch on the scene, the slow turn resumes this much later. */
export const RESUME_MS = 5000;

/**
 * Whether the scene turns by itself now. Pure, so the rules are testable: only with the Auto rotate switch on (off at
 * the start under reduced motion), never while the visitor is handling the scene or a target is chosen, and never while
 * Home is not what the visitor sees (another page, an investigation over it, the scene scrolled off, a hidden tab).
 */
export function shouldTurn({ on, interacting, selected, onHome, inView, hidden }) {
  return Boolean(on) && !interacting && !selected && onHome && inView && !hidden;
}

/**
 * Home's motion: time runs at one day per second and the scene turns slowly; a drag takes over, and the turn resumes
 * 5 s after the last interaction. Reduced motion keeps a still frame. Phones: "Explore in 3D" opens the scene full
 * screen with the time control and Fly to; Close (or Esc) returns.
 */
function watchAuto(controller, time) {
  const host = $('space3d');
  const stage = $('home-map');
  const reduced = prefersReducedMotion();
  // The Auto rotate switch (task B29): on by default, off under reduced motion (a still frame); it runs or stops both
  // the camera's turn and the time.
  const toggle = $('auto-rotate');
  const facts = { on: !reduced, interacting: false, selected: false, inView: true };
  let turning = null;
  let resumeTimer = 0;
  if (facts.on) time.setStep(AUTO_STEP);
  else time.setMoving(false);
  toggle.setAttribute('aria-checked', String(facts.on));
  const onToggle = () => {
    facts.on = !facts.on;
    toggle.setAttribute('aria-checked', String(facts.on));
    if (facts.on && time.step() <= 0) time.setStep(AUTO_STEP);
    time.setMoving(facts.on);
    apply();
  };
  toggle.addEventListener('click', onToggle);
  const apply = () => {
    const on = shouldTurn({
      on: facts.on, interacting: facts.interacting, selected: facts.selected,
      onHome: document.body.dataset.page === 'home', inView: facts.inView, hidden: document.hidden,
    });
    if (on === turning) return;
    turning = on;
    controller.autoTurn(on, AUTO_TURN_SPEED);
  };
  const touched = () => {
    facts.interacting = true;
    apply();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      facts.interacting = false;
      apply();
    }, RESUME_MS);
  };
  const onMove = (event) => {
    if (event.buttons) touched();
  };
  for (const name of ['pointerdown', 'wheel', 'touchstart']) host.addEventListener(name, touched, { passive: true });
  host.addEventListener('pointermove', onMove, { passive: true });
  // Page, view and tab changes are also caught here, cheaply (apply changes nothing when the answer is the same).
  const poll = setInterval(apply, 250);
  const observer = new IntersectionObserver((entries) => {
    facts.inView = entries[entries.length - 1].intersectionRatio >= 0.5;
    apply();
  }, { threshold: [0, 0.5, 1] });
  observer.observe(stage);
  let page = document.body.dataset.page;
  const pageWatch = new MutationObserver(() => {
    const now = document.body.dataset.page;
    // Back from an investigation: the popup is closed and the camera returns to the whole view.
    if (now === 'home' && page === 'investigate') state.hooks.onHome?.();
    page = now;
    apply();
  });
  pageWatch.observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
  document.addEventListener('visibilitychange', apply);
  apply();

  const explore = $('hero-explore');
  const close = $('space-close');
  explore.hidden = false;
  const setExploring = (value) => {
    document.body.classList.toggle('exploring', value);
    requestAnimationFrame(() => {
      controller.resize();
      controller.relayout();
      (value ? close : explore).focus({ preventScroll: true });
    });
  };
  const onExplore = () => setExploring(true);
  const onClose = () => setExploring(false);
  const onKey = (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('exploring') && !document.querySelector('dialog[open]')) {
      event.stopPropagation();
      setExploring(false);
    }
  };
  explore.addEventListener('click', onExplore);
  close.addEventListener('click', onClose);
  document.addEventListener('keydown', onKey, true);
  return {
    select(on) {
      facts.selected = on;
      apply();
    },
    dispose() {
      clearTimeout(resumeTimer);
      clearInterval(poll);
      toggle.removeEventListener('click', onToggle);
      observer.disconnect();
      pageWatch.disconnect();
      for (const name of ['pointerdown', 'wheel', 'touchstart']) host.removeEventListener(name, touched);
      host.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', apply);
      explore.removeEventListener('click', onExplore);
      close.removeEventListener('click', onClose);
      document.removeEventListener('keydown', onKey, true);
      explore.hidden = true;
      document.body.classList.remove('exploring');
      controller.autoTurn(false);
    },
  };
}

/** Task B29: the Key's layer switches and the type filter, kept here so they hold before the 3D view starts too. */
const view = { layers: {}, filter: null, targets: new Set() };

export function setLayer(name, on) {
  view.layers[name] = on;
  state.controller?.setLayer(name, on);
}

/** keys: the targets of the chosen type (a Set), or null for all; targets: every Famous target's key. */
export function setFilter(keys, targets) {
  view.filter = keys;
  view.targets = targets;
  state.controller?.dimExcept(keys, targets);
}

/** A Famous target chosen (task B29): the turn stops, the camera flies to it and its label is highlighted. */
export function selectTarget(key) {
  if (!state.controller) return;
  state.auto?.select(true);
  state.controller.highlight(key);
  if (state.controller.has(key)) state.controller.flyTo(key);
}

/** The popup closed: the highlight goes, the camera returns to the whole view and the motion resumes. */
export function releaseTarget() {
  if (!state.controller) return;
  state.controller.highlight(null);
  state.controller.reset();
  state.auto?.select(false);
}

async function start3d() {
  // Once only: a click on "3D view" and the idle start can both ask for it.
  if (state.controller) return null;
  if (state.loading) return state.loading;
  const { hooks } = state;
  state.loading = (async () => {
    try {
      // The time control (B10) and the Fly to list (B11) arrive with the 3D view, so Home's first load does not grow.
      const [{ createSpace }, scene, { createTimeControl }, { createFocusControl }] = await Promise.all([
        import('./space3d.js'), loadSceneFile(), import('./time-ui.js'), import('./focus-ui.js'),
      ]);
      if (state.mode !== '3d') return;
      const sceneDate = scene?.epoch_jd_tdb ? formatUtc(new Date((scene.epoch_jd_tdb - 2440587.5) * 86400000), { time: false }) : '—';
      $('space-key-note').textContent = t('space.keyNote', { date: sceneDate });
      $('space-date').textContent = t('space.date', { date: formatUtc(new Date(), { time: false }) });
      const controller = createSpace($('space3d'), {
        scene,
        date: new Date(),
        reducedMotion: prefersReducedMotion(),
        allowSoftware: savedView() === '3d',
        nameOf: hooks.nameOf,
        distanceOf: hooks.distanceOf,
        labelOf: (key, values) => t(key.startsWith('planet.') ? key : `space.${key}`, values),
        insetLeft: hooks.insetLeft,
        // No label shows under these panels (task B29: the title block, the Famous targets and the popup too).
        blockers: () => [
          $('home-hero'), $('famous'), $('target-pop'), $('space-tools'), $('space-fly-list'), $('space-time'),
          $('map-key'), document.querySelector('.map-caption.space-3d-only'),
        ],
        onPick: (key) => hooks.onPick(key),
        onEmpty: () => hooks.onEmpty?.(),
        onNine: (kind) => state.focus?.nine(kind),
        onHud: ({ target }) => {
          $('space-target').textContent = t('space.target', { name: target });
        },
        onSlow: () => {
          stop3d();
          setMode('2d');
          showNote('space.slow');
          $('space-toggle').hidden = true;
        },
      });
      if (controller.unavailable) {
        setMode('2d');
        showNote(controller.unavailable === 'slow' ? 'space.slow' : 'space.noWebgl');
        return;
      }
      state.controller = controller;
      // Task B27a: while a target is open (the investigation covers Home), the scene draws nothing.
      const pauseWhileInvestigating = () => controller.setPaused(document.body.dataset.page === 'investigate');
      state.pauseWatch?.disconnect();
      state.pauseWatch = new MutationObserver(pauseWhileInvestigating);
      state.pauseWatch.observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
      pauseWhileInvestigating();
      setMode('3d', { shown: true });
      controller.resize();
      state.time = createTimeControl({ controller, host: $('space3d'), reducedMotion: prefersReducedMotion() });
      state.focus = createFocusControl({ controller });
      state.auto = watchAuto(controller, state.time);
      for (const [name, on] of Object.entries(view.layers)) controller.setLayer(name, on);
      controller.dimExcept(view.filter, view.targets);
      const unplaced = hooks.entries().filter((entry) => entry.key && !controller.has(entry.key)).map(hooks.nameOfEntry);
      showNote(scene ? (unplaced.length ? 'space.unplaced' : null) : 'space.noSceneFile', { names: unplaced.join(', ') });
    } catch (error) {
      console.error('The 3D view could not start:', error);
      stop3d();
      setMode('2d');
      showNote('space.failed');
    } finally {
      state.loading = null;
    }
  })();
  return state.loading;
}

/**
 * Called once Home has been drawn. hooks: entries(), nameOf(key), nameOfEntry(entry), distanceOf(star),
 * insetLeft(), onPick(key), embed.
 */
export function initSpace(hooks) {
  if (state.hooks) return;
  state.hooks = hooks;
  const choice = chooseView({
    webgl: !hooks.embed && webglAvailable(),
    reducedMotion: prefersReducedMotion(),
    saved: savedView(),
    deviceMemory: navigator.deviceMemory ?? null,
    embed: hooks.embed,
  });
  $('space-tools').hidden = !choice.offer3d;
  setMode(choice.mode);
  showNote(choice.reason);
  $('space-toggle').addEventListener('click', () => {
    if (state.controller) {
      saveView('2d');
      stop3d();
      setMode('2d');
      showNote(null);
    } else {
      saveView('3d');
      showNote(null);
      setMode('3d');
      start3d();
    }
  });
  $('space-reset').addEventListener('click', () => state.controller?.reset());
  $('space-top').addEventListener('click', () => state.controller?.top());
  state.pending = choice.mode === '3d';
}

/** After the page has loaded and stayed idle this long, the 3D view starts even without an interaction. */
export const IDLE_START_MS = 300;
const WAKE_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

/**
 * main.js calls this whenever Home (or an investigation over it) is on screen. The first time, and only if the
 * 3D view was chosen, three.js is fetched: on the visitor's first interaction, or once the page has loaded and
 * then stayed idle for IDLE_START_MS. Until then the 2D map is the page.
 */
export function homeShown() {
  if (!state.pending) return;
  state.pending = false;
  let started = false;
  const wake = () => {
    if (started) return;
    started = true;
    for (const name of WAKE_EVENTS) removeEventListener(name, wake);
    start3d();
  };
  for (const name of WAKE_EVENTS) addEventListener(name, wake, { passive: true });
  const idle = window.requestIdleCallback ?? ((callback) => setTimeout(callback, 50));
  const afterLoad = () => setTimeout(() => idle(wake, { timeout: 2000 }), IDLE_START_MS);
  if (document.readyState === 'complete') afterLoad();
  else addEventListener('load', afterLoad, { once: true });
}

/** Flies to a target in the 3D view, then runs `then`; without a 3D view (or that target) runs `then` at once. */
export function flyThen(key, then) {
  if (state.mode === '3d' && state.controller?.has(key) && state.controller.flyTo(key, { then })) return;
  then();
}

export const spaceMode = () => state.mode;

/** Task B36: the scene draws nothing while the Sky map covers Home (or an investigation does). */
export function setScenePaused(on) {
  state.controller?.setPaused(Boolean(on) || document.body.dataset.page === 'investigate');
}
