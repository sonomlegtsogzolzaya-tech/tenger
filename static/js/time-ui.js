// The time control under the 3D Solar System on Home (task B10): LIVE, play/pause, the shown date (UTC) and a
// stepped speed slider (centre = paused, right = forward, left = backward). Loaded with the 3D view only.
// The animation loop runs only while time moves: a frame per display refresh at fast speeds, one per second at
// real speed (which looks still), none while paused, while the tab is hidden or while the scene is off screen.
import { $ } from './dom.js';
import { t } from './i18n.js';
import { createClock, formatClock, rateOf, REAL_TIME_STEP } from './time.js';

const SLOW_REFRESH_MS = 1000;
const NOTE_MS = 7000;
const DAY_MS = 86400000;

/** The rate as the bar shows it: "Paused", "Real time", "1 month/s", "-1 day/s". */
export function rateText(step) {
  const { key, backward } = rateOf(step);
  if (key === 'real' && backward) return t('time.realBackward');
  return backward ? t('time.rateBackward', { rate: t(`time.rate.${key}`) }) : t(`time.rate.${key}`);
}

/** For screen readers: "1 day/s, backward". */
function rateSpoken(step) {
  const { key, backward } = rateOf(step);
  if (key === 'paused') return t('time.rate.paused');
  return t(backward ? 'time.aria.backward' : 'time.aria.forward', { rate: t(`time.rate.${key}`) });
}

const editable = (node) => node instanceof HTMLElement && (node.isContentEditable || ['TEXTAREA', 'SELECT'].includes(node.tagName)
  || (node.tagName === 'INPUT' && node.type !== 'range'));

/**
 * Starts the control for a 3D controller (space3d.js: setTime, fixedBodies). host: the scene element.
 * Returns { dispose }.
 */
export function createTimeControl({ controller, host, reducedMotion = false }) {
  const bar = $('space-time');
  const live = $('time-live');
  const play = $('time-play');
  const dateText = $('time-date');
  const slider = $('time-rate');
  const rateLine = $('time-rate-text');
  const note = $('time-note');
  const planetsOn = $('space-date');
  const clock = createClock({ wallMs: Date.now(), reducedMotion });
  let frame = 0;
  let timer = 0;
  let noteTimer = 0;
  let onScreen = true;
  let held = null; // the speed set aside while the tab is hidden or the scene off screen
  let shownMinute = '';
  let noteKind = '';

  function showNote(text, { stay = false } = {}) {
    clearTimeout(noteTimer);
    note.textContent = text;
    note.hidden = !text;
    if (text && !stay) noteTimer = setTimeout(() => { note.hidden = true; }, NOTE_MS);
  }

  function reflect(wall) {
    const step = clock.step();
    slider.value = String(step);
    slider.setAttribute('aria-valuetext', rateSpoken(step));
    rateLine.textContent = rateText(step);
    const isLive = clock.isLive(wall);
    live.setAttribute('aria-pressed', String(isLive));
    live.classList.toggle('is-live', isLive);
    play.setAttribute('aria-label', t(clock.moving() ? 'time.pause' : 'time.play'));
    play.dataset.state = clock.moving() ? 'playing' : 'paused';
  }

  /** One update: the scene, the date, the controls and any note. */
  function draw() {
    const wall = Date.now();
    const sim = clock.now(wall);
    controller.setTime(new Date(sim));
    const text = formatClock(sim);
    dateText.textContent = text;
    if (text.slice(0, 16) !== shownMinute) {
      shownMinute = text.slice(0, 16);
      planetsOn.textContent = t('space.date', { date: shownMinute });
    }
    // A stop at 1900 or 2050 is said once (the note fades); bodies without elements are named while away from their date.
    const fixed = (controller.fixedBodies ?? []).filter((body) => Math.abs((sim / DAY_MS + 2440587.5) - body.jd) > 1);
    if (clock.limit() && noteKind !== `limit-${clock.limit()}`) {
      noteKind = `limit-${clock.limit()}`;
      showNote(t(`time.limit.${clock.limit()}`));
    } else if (!clock.limit() && fixed.length) {
      noteKind = 'fixed';
      const date = new Date((fixed[0].jd - 2440587.5) * DAY_MS).toISOString().slice(0, 10);
      showNote(t('time.fixed', { names: fixed.map((body) => body.name).join(', '), date }), { stay: true });
    } else if (!clock.limit() && noteKind) {
      noteKind = '';
      showNote('');
    }
    reflect(wall);
  }

  function stopLoop() {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    frame = 0;
    timer = 0;
  }

  /** Fast speeds: every display frame; real speed: once a second; paused, hidden or off screen: nothing. */
  function schedule() {
    stopLoop();
    if (!clock.moving() || document.hidden || !onScreen) return;
    if (Math.abs(clock.step()) <= REAL_TIME_STEP) {
      timer = setTimeout(() => { draw(); schedule(); }, SLOW_REFRESH_MS);
    } else {
      frame = requestAnimationFrame(() => { draw(); schedule(); });
    }
  }

  function act(change) {
    change(Date.now());
    draw();
    schedule();
  }

  // Hidden tab or scene off screen: the loop stops. Away from live, the time also waits, so it does not jump.
  function pauseOutOfSight() {
    const away = document.hidden || !onScreen;
    if (away && held === null && clock.moving() && !clock.isLive(Date.now())) {
      held = clock.step();
      clock.setStep(0, Date.now());
    } else if (!away && held !== null) {
      clock.setStep(held, Date.now());
      held = null;
    }
    if (!away) draw();
    schedule();
  }

  const onLive = () => act((at) => clock.goLive(at));
  const onPlay = () => act((at) => clock.toggle(at));
  const onSlide = () => act((at) => clock.setStep(Number(slider.value), at));
  const onKey = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || document.body.dataset.page !== 'home' || bar.hidden) return;
    const target = event.target;
    const inBar = bar.contains(target);
    const onPage = target === document.body || target === document.documentElement || host.contains(target);
    if (!(inBar || onPage) || editable(target)) return;
    if (event.key === ' ' || event.code === 'Space') {
      if (target instanceof HTMLButtonElement) return; // a focused button keeps its own Space
      event.preventDefault();
      onPlay();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (target === slider) return; // the slider moves itself and reports through 'input'
      event.preventDefault();
      act((at) => clock.stepBy(event.key === 'ArrowRight' ? 1 : -1, at));
    } else if (event.key === 'l' || event.key === 'L') {
      event.preventDefault();
      onLive();
    }
  };
  const observer = new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    pauseOutOfSight();
  });

  live.addEventListener('click', onLive);
  play.addEventListener('click', onPlay);
  slider.addEventListener('input', onSlide);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', pauseOutOfSight);
  observer.observe(host);
  bar.hidden = false;
  draw();
  schedule();

  return {
    /** The speed step (task B25: Home's first screen runs time gently, then gives the visitor's speed back). */
    step: () => clock.step(),
    /** Whether time is running (false after Pause, and while the tab is hidden or the scene off screen). */
    moving: () => clock.moving(),
    /** Task B29: the Auto rotate switch runs or stops the time (a no-op when it already does). */
    setMoving: (on) => act((at) => { if (clock.moving() !== Boolean(on)) clock.toggle(at); }),
    setStep: (step) => act((at) => clock.setStep(step, at)),
    isLive: () => clock.isLive(Date.now()),
    goLive: () => act((at) => clock.goLive(at)),
    dispose() {
      stopLoop();
      clearTimeout(noteTimer);
      observer.disconnect();
      live.removeEventListener('click', onLive);
      play.removeEventListener('click', onPlay);
      slider.removeEventListener('input', onSlide);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', pauseOutOfSight);
      bar.hidden = true;
    },
  };
}
