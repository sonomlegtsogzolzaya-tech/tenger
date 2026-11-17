// Task B21 (re-make of B9): the 30-second demo video of Vestigium, made only from real screen recordings of the
// current build (no generated images, video, voice or music). Each shot is recorded in headless Chrome at 1280x720
// and cut to an exact number of frames at 30 fps; the captions are burned in from PNGs that Chrome renders in the
// site's own font (this ffmpeg has no text filters), and the title card is an HTML page using the site's stylesheet
// and logo (static/img/logo.svg). Writes vestigium-demo-30s.mp4 (H.264 High, yuv420p, 30 fps, no audio),
// vestigium-demo-30s.srt and vestigium-demo-30s-contact.png. Every shot checks that no page shows "TENGER",
// "SPHEREx Blink" or "pythonhack000". Numbers in the captions are read from the page or the data files.
// Usage: node docs/screens/demo/make-video.mjs [base URL]
//   Without a URL it serves this checkout's static/ folder itself on a free local port (the build as it is now).
//   ONLY=<shot id> records one shot and prints its frame times.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC = join(HERE, '..', '..', '..', 'static');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.gz': 'application/gzip', '.bin': 'application/octet-stream', '.txt': 'text/plain' };
let server = null;
let BASE = process.argv[2]?.replace(/\/$/, '');
if (!BASE) {
  server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(STATIC, path));
    if (!file.startsWith(normalize(STATIC))) { res.writeHead(403).end(); return; }
    try { res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  BASE = `http://127.0.0.1:${server.address().port}`;
}
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9400 + Math.floor(Math.random() * 400); // a fresh port, so a stale Chrome can never answer instead
const FPS = 30;
const OUT = join(HERE, 'vestigium-demo-30s');
const WORK = mkdtempSync(join(tmpdir(), 'vestigium-b21-'));
const NAMES = /spherex[\s_-]*blink|pythonhack000/i;
const OLD_BRAND = /TENGER|Tenger/;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Chrome over the DevTools protocol ----------

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'vestigium-b21-chrome-'))}`,
  // The Mac's GPU (Metal): with software rendering the viewer page draws about 2 frames a second and the blink is lost.
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist',
  '--allow-file-access-from-files', 'about:blank',
], { stdio: 'ignore' });
// Never leave this Chrome running, whatever happens (a stale one keeps its port and burns the CPU).
process.on('exit', () => chrome.kill());
process.on('uncaughtException', (error) => { console.error(error); chrome.kill(); process.exit(1); });
let info;
for (let attempt = 0; attempt < 50 && !info; attempt += 1) {
  await sleep(200);
  info = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).catch(() => null);
}
const socket = new WebSocket(info.find((item) => item.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve));
let nextId = 0;
const pending = new Map();
const listeners = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } else listeners.forEach((fn) => fn(message));
});
const send = (method, params = {}) => new Promise((resolve) => { nextId += 1; pending.set(nextId, resolve); socket.send(JSON.stringify({ id: nextId, method, params })); });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const problems = [];
listeners.push((message) => {
  if (message.method === 'Runtime.exceptionThrown') problems.push(message.params.exceptionDetails.exception?.description ?? 'exception');
  if (message.method === 'Network.requestWillBeSent' && /dev-fixtures|onrender\.com/.test(message.params.request.url)) problems.push(`request ${message.params.request.url}`);
});
for (const domain of ['Page', 'Runtime', 'Network']) await send(`${domain}.enable`);
/** A returning visitor: the tour already seen and the 3D Home chosen. */
let viewScript = null;
async function setView(view) {
  if (viewScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: viewScript });
  const added = await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('tenger.tour.v1', 'seen'); localStorage.setItem('tenger.view.v1', '${view}'); localStorage.setItem('tenger.game.howto.v1', '1'); } catch {}` });
  viewScript = added.result.identifier;
}
await setView('3d');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

async function open(path, ready) {
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(100);
  await send('Page.navigate', { url: BASE + path });
  for (let attempt = 0; attempt < 160; attempt += 1) {
    await sleep(250);
    if (await evaluate(`Boolean(${ready})`)) break;
  }
  await sleep(1200);
  await checkNames(path);
}

/** No page in the video may name the base project or its author, or show the old brand (user, 15 Nov). */
async function checkNames(where) {
  if (NAMES.test(await evaluate('document.documentElement.outerHTML'))) problems.push(`names on ${where}`);
  if (OLD_BRAND.test(await evaluate('document.title + " " + document.body.innerText'))) problems.push(`old brand on ${where}`);
}

const scrollTo = (selector, offset = -70) => evaluate(`scrollTo(0, document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top + scrollY + ${offset})`);
const smoothScroll = (selector, ms, offset = -70) => evaluate(`new Promise((resolve) => {
  const node = document.querySelector(${JSON.stringify(selector)});
  const from = scrollY;
  const to = Math.max(0, node.getBoundingClientRect().top + scrollY + ${offset});
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ${ms});
    const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    scrollTo(0, from + (to - from) * ease);
    if (k < 1) requestAnimationFrame(step); else resolve();
  };
  requestAnimationFrame(step);
})`);
const key = (name) => evaluate(`document.querySelector('#reveal').dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(name)}, bubbles: true }))`);

/** Chrome's screencast with arrival times; the first frame counts from the start (a still page sends it late). */
async function screencast(script) {
  const frames = [];
  const onFrame = (message) => {
    if (message.method !== 'Page.screencastFrame') return;
    frames.push({ data: message.params.data, t: Date.now() / 1000 });
    send('Page.screencastFrameAck', { sessionId: message.params.sessionId });
  };
  listeners.push(onFrame);
  await send('Page.startScreencast', { format: 'png', maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
  const start = Date.now() / 1000;
  await script(start);
  const end = Date.now() / 1000;
  await send('Page.stopScreencast');
  listeners.splice(listeners.indexOf(onFrame), 1);
  return { frames, start, end };
}

/**
 * Screenshots as fast as Chrome gives them, each kept with its arrival time, for `seconds`. Used where the
 * screencast misses changes (the blink swaps two layers without a new compositor frame).
 */
async function screenshotLoop(seconds) {
  const frames = [];
  const start = Date.now() / 1000;
  while (Date.now() / 1000 - start < seconds) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    frames.push({ data: shot.result.data, t: Date.now() / 1000 });
  }
  return { frames, start, end: Date.now() / 1000 };
}

/** Writes captured frames as one exact-length 30 fps clip (lossless enough to re-encode once at the end). */
function encodeShot(name, { frames, start, end, even }, count, skip = 0) {
  const dir = join(WORK, name);
  mkdirSync(dir, { recursive: true });
  const lines = [];
  frames.forEach((frame, index) => {
    const file = join(dir, `f${String(index).padStart(5, '0')}.png`);
    writeFileSync(file, Buffer.from(frame.data, 'base64'));
    const next = even ? 1 / FPS : (frames[index + 1]?.t ?? end) - (index === 0 ? start : Math.max(frame.t, start));
    lines.push(`file '${file}'`, `duration ${Math.max(0.001, next).toFixed(4)}`);
  });
  lines.push(`file '${join(dir, `f${String(frames.length - 1).padStart(5, '0')}.png`)}'`);
  writeFileSync(join(dir, 'list.txt'), lines.join('\n'));
  const output = join(WORK, `${name}.mp4`);
  run(['-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
    '-vf', `fps=${FPS},trim=start_frame=${skip},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=3,scale=1280:720:flags=lanczos,format=yuv420p`,
    '-frames:v', String(count), '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-an', output]);
  return output;
}

function run(args) {
  const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}

async function screenshotFile(url, file, transparent = false) {
  if (transparent) await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await send('Page.navigate', { url });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(100);
    if (await evaluate("document.readyState === 'complete' && document.fonts.status === 'loaded'")) break;
  }
  await sleep(300);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
  if (transparent) await send('Emulation.setDefaultBackgroundColorOverride', {});
}

// ---------- The take: one continuous recording with a visible cursor (task B26) ----------

const facts = {};
const clicks = [];
const path = []; // every mouse position sent, with its time: [ms, x, y]
const mouse = { x: 980, y: 300 };
let takeStart = 0;

/** A cursor drawn by the page itself (so the screencast shows it), following the real mouse events. */
const CURSOR_SCRIPT = `(() => {
  if (window.__demoCursor) return; window.__demoCursor = true;
  const cursor = document.createElement('div');
  cursor.id = 'demo-cursor'; cursor.setAttribute('aria-hidden', 'true');
  cursor.style.cssText = 'position:fixed;left:0;top:0;width:24px;height:24px;z-index:2147483647;pointer-events:none;will-change:transform;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.6));transform:translate(977px,298px)';
  cursor.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 2 L3 20 L8 15.5 L11.5 22.5 L14.6 21 L11.1 14 L18 14 Z" fill="#fff" stroke="#05070d" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const style = document.createElement('style');
  style.textContent = '@keyframes demo-ripple{from{transform:translate(-50%,-50%) scale(0.3);opacity:0.95}to{transform:translate(-50%,-50%) scale(1.7);opacity:0}}.demo-ripple{position:fixed;width:34px;height:34px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px rgba(5,7,13,0.55);pointer-events:none;z-index:2147483647;animation:demo-ripple 0.45s ease-out forwards}';
  const host = () => [...document.querySelectorAll('dialog[open]')].at(-1) ?? document.body;
  const place = () => { if (cursor.parentElement !== host()) host().append(cursor); };
  const start = () => { document.head.append(style); place(); new MutationObserver(place).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  addEventListener('pointermove', (event) => { cursor.style.transform = 'translate(' + (event.clientX - 3) + 'px,' + (event.clientY - 2) + 'px)'; }, true);
  // The browser's own tooltip (from title) is drawn by the system, so a recording never shows it: show the same
  // text the same way after the pointer rests on the element for 0.6 s.
  const tip = document.createElement('div');
  tip.style.cssText = 'position:fixed;z-index:2147483646;max-width:340px;padding:4px 8px;background:#f2f2f2;color:#111;font:12px/1.35 system-ui,sans-serif;border:1px solid #aaa;border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,0.35);pointer-events:none;display:none';
  let tipTimer = 0; let tipFor = null;
  addEventListener('pointermove', (event) => {
    const owner = document.elementFromPoint(event.clientX, event.clientY)?.closest('[title]') ?? null;
    if (owner !== tipFor) { tipFor = owner; tip.style.display = 'none'; clearTimeout(tipTimer);
      if (owner) tipTimer = setTimeout(() => { tip.textContent = owner.getAttribute('title'); tip.style.left = (event.clientX + 10) + 'px'; tip.style.top = (event.clientY + 22) + 'px'; host().append(tip); tip.style.display = 'block'; }, 600); }
  }, true);
  addEventListener('pointerdown', () => { clearTimeout(tipTimer); tip.style.display = 'none'; }, true);
  addEventListener('pointerdown', (event) => {
    const ring = document.createElement('div'); ring.className = 'demo-ripple';
    ring.style.left = event.clientX + 'px'; ring.style.top = event.clientY + 'px';
    host().append(ring); setTimeout(() => ring.remove(), 500);
  }, true);
})()`;

const mouseAt = async (x, y, buttons = 0) => {
  mouse.x = x; mouse.y = y;
  path.push([Date.now(), x, y]);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons, button: buttons ? 'left' : 'none' });
};
/**
 * An eased (ease-in-out), slightly curved move. 400 to 700 ms; a move that could not stay under about 115 px per
 * video frame in 700 ms goes in two hops. The cursor never goes below y = 600, where the captions are.
 */
async function moveTo(x, y, { ms = null, buttons = 0 } = {}) {
  y = Math.min(y, 600);
  const from = { ...mouse };
  const dx = x - from.x; const dy = y - from.y; const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  if (dist > 720 && ms === null) {
    await moveTo(from.x + dx * 0.5 + dy * 0.04, from.y + dy * 0.5 - dx * 0.04, { ms: 560, buttons });
    await moveTo(x, y, { ms: 560, buttons });
    return;
  }
  const duration = ms ?? Math.min(700, Math.max(400, dist * 0.95));
  const bend = 0.1 * dist;
  const cx = (from.x + x) / 2 - (dy / dist) * bend;
  const cy = (from.y + y) / 2 + (dx / dist) * bend;
  const t0 = Date.now();
  for (;;) {
    const k = Math.min(1, (Date.now() - t0) / duration);
    const e = (1 - Math.cos(Math.PI * k)) / 2; // ease-in-out (sine): gentle at both ends, never jumpy in the middle
    await mouseAt((1 - e) ** 2 * from.x + 2 * (1 - e) * e * cx + e * e * x, (1 - e) ** 2 * from.y + 2 * (1 - e) * e * cy + e * e * y, buttons);
    if (k >= 1) break;
    await sleep(12);
  }
}
const centre = (selector) => evaluate(`(() => { const n = document.querySelector(${JSON.stringify(selector)}); if (!n) return null; const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
/** Moves to an element, hovers a moment, checks that the pointer is on it, then presses and releases. */
async function click(selector, { dx = 0, dy = 0, expect = null } = {}) {
  const point = await centre(selector);
  if (!point) { problems.push(`click target missing: ${selector}`); return; }
  await moveTo(point[0] + dx, point[1] + dy);
  await sleep(180);
  const hit = await evaluate(`(() => { const n = document.elementFromPoint(${mouse.x}, ${mouse.y}); const t = document.querySelector(${JSON.stringify(selector)}); return Boolean(n && t && (t === n || t.contains(n))); })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mouse.x, y: mouse.y, button: 'left', buttons: 1, clickCount: 1 });
  await sleep(70);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mouse.x, y: mouse.y, button: 'left', buttons: 0, clickCount: 1 });
  clicks.push({ selector, at: ((Date.now() - takeStart) / 1000).toFixed(2), hit, expect });
  if (!hit) problems.push(`click missed ${selector} at ${Math.round(mouse.x)},${Math.round(mouse.y)} (target at ${point.map(Math.round)}; under the pointer: ${await evaluate(`(() => { const n = document.elementFromPoint(${mouse.x}, ${mouse.y}); return n ? (n.id || n.className || n.tagName) : 'nothing'; })()`)})`);
}
/** A click at a point measured before the take (no lookup while recording), still checked on its target. */
async function clickAt(point, selector, expect = null) {
  await moveTo(point[0], point[1]);
  await sleep(160);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mouse.x, y: mouse.y, button: 'left', buttons: 1, clickCount: 1 });
  await sleep(60);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mouse.x, y: mouse.y, button: 'left', buttons: 0, clickCount: 1 });
  clicks.push({ selector, at: ((Date.now() - takeStart) / 1000).toFixed(2), point: point.map(Math.round), expect });
}
/** Smooth wheel scrolling: many small steps over 600 to 900 ms at the pointer. */
async function wheel(total, ms = 760) {
  // Time-driven: small steps sent as the time passes, so a slow reply never stretches the scroll.
  const t0 = Date.now();
  let sent = 0;
  for (;;) {
    const k = Math.min(1, (Date.now() - t0) / ms);
    const delta = Math.round(total * k - sent);
    if (delta !== 0) {
      sent += delta;
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: mouse.x, y: mouse.y, deltaX: 0, deltaY: delta });
    }
    if (k >= 1) break;
    await sleep(30);
  }
  await sleep(250); // the browser animates each wheel step; let the last one land
}
const waitFor = async (expression, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await evaluate(`Boolean(${expression})`)) return true; await sleep(60); } return false; };

/** The shots: their captions and lengths (for the captions, the .srt and the contact sheet). Task B27. */
const SHOTS = [
  { id: 's1-home', seconds: 5, caption: 'Vestigium: watch the sky move in real NASA SPHEREx pictures.' },
  { id: 's2-3d', seconds: 5, caption: 'A live 3D map: the planets follow JPL’s orbits through time.' },
  { id: 's3-pick', seconds: 3, caption: 'Pick one of the five NASA challenge targets.' },
  { id: 's4-barnard', seconds: 7, top: true, caption: () => `Real pictures, ${facts.yearA} and ${facts.yearB}: Barnard's Star moved about ${facts.shift}″.` },
  // The user's caption for shot 5 (no numbers, 15 Nov); the click on "Estimate motion" stays.
  { id: 's5-changed', seconds: 6, caption: 'We measure how it moves from the pictures and check it against Gaia.' },
];
const TAKE_SECONDS = SHOTS.reduce((sum, shot) => sum + shot.seconds, 0);
const TITLE_SECONDS = 30 - TAKE_SECONDS;

/** The whole story in one screencast, written to disk frame by frame (JPEG) with arrival times. */
async function recordTake() {
  // The measured motion and Gaia's value, as the What changed panel shows them (from investigation.json).
  await open('/?target=barnard&panel=changed', "document.querySelector('#changed-validated .measurement') || document.querySelector('#panel-changed .changed-finding')");
  const finding = await evaluate("document.querySelector('#panel-changed .changed-finding')?.textContent ?? ''");
  const inv = await evaluate("fetch('data/barnard/investigation.json').then((r) => r.json())");
  const params = inv?.explanation?.find((item) => item.key === 'explain.motion-measured')?.params;
  facts.motion = Number.isFinite(params?.value) ? params.value.toFixed(2) : null;
  facts.gaia = Number.isFinite(params?.catalogue) ? params.catalogue.toFixed(2) : null;
  facts.findingOnPage = finding;
  if (!facts.motion || !facts.gaia || !finding.includes(String(params.value)) || !finding.includes(String(params.catalogue))) problems.push(`motion facts: ${JSON.stringify({ params, finding })}`);

  // Home with the 3D first screen running, the cursor over the scene.
  await open('/', "document.getElementById('hero-watch') && !document.getElementById('page-home').hasAttribute('data-loading')");
  const pickTop = await evaluate("document.querySelector('.hero-pick').getBoundingClientRect().top + document.getElementById('page-home').scrollTop");
  // The first screen can be taller than the window: the full 3D section starts where it ends.
  const homeHeight = await evaluate("document.getElementById('home-hero').offsetHeight");
  // Where things are, measured before recording: the chips after the scroll back up, and the time controls.
  const chipScroll = Math.max(0, pickTop - 330);
  const chips = await evaluate(`[...document.querySelectorAll('#shortcut-list li button')].slice(0, 2).map((b) => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + document.getElementById('page-home').scrollTop - ${chipScroll} + r.height / 2]; })`);
  await evaluate(`document.getElementById('page-home').scrollTop = ${homeHeight}`);
  await sleep(900);
  const controls = await evaluate("(() => { const s = document.getElementById('time-rate').getBoundingClientRect(); const l = document.getElementById('time-live').getBoundingClientRect(); return { rate: [s.left, s.top, s.width, s.height], live: [l.left + l.width / 2, Math.min(l.top + l.height / 2, l.bottom - 6)] }; })()");
  await evaluate("document.getElementById('page-home').scrollTop = 0");
  await sleep(1200);
  await mouseAt(mouse.x, mouse.y);
  await waitFor("document.getElementById('page-home').classList.contains('hero-mode')", 8000);
  await sleep(1500);

  const dir = join(WORK, 'take');
  mkdirSync(dir, { recursive: true });
  const frames = [];
  const onFrame = (message) => {
    if (message.method !== 'Page.screencastFrame') return;
    const file = join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(message.params.data, 'base64'));
    frames.push({ file, t: Date.now() });
    send('Page.screencastFrameAck', { sessionId: message.params.sessionId });
  };
  listeners.push(onFrame);
  await send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1280, maxHeight: 720, everyNthFrame: 2 });
  takeStart = Date.now();
  const at = async (seconds) => { const wait = takeStart + seconds * 1000 - Date.now(); if (wait > 0) await sleep(wait); };
  const box = (selector) => evaluate(`(() => { const n = document.querySelector(${JSON.stringify(selector)}); if (!n) return null; const r = n.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; })()`);
  /** A drag of a range input's thumb by dx pixels. */
  async function dragRange(selector, dx) {
    const r = await box(selector);
    const value = await evaluate(`(() => { const s = document.querySelector(${JSON.stringify(selector)}); return (Number(s.value) - Number(s.min)) / (Number(s.max) - Number(s.min)); })()`);
    const x = r.left + 8 + value * (r.width - 16); const y = Math.min(r.top + r.height / 2, Math.min(r.top + r.height - 4, 600));
    await moveTo(x, y);
    await sleep(150);
    const before = await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mouse.x, y: mouse.y, button: 'left', buttons: 1, clickCount: 1 });
    await moveTo(x + dx, y, { ms: 700, buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mouse.x, y: mouse.y, button: 'left', buttons: 0, clickCount: 1 });
    const after = await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`);
    clicks.push({ selector: `${selector} (drag)`, at: ((Date.now() - takeStart) / 1000).toFixed(2), hit: Number(after) > Number(before), expect: `${before} -> ${after}` });
    if (!(Number(after) > Number(before))) problems.push(`drag of ${selector} did not move it`);
    return [before, after];
  }

  // 0–5 s: the 3D first screen, the scene turning; the cursor drifts across it.
  await at(0.4); await moveTo(820, 330, { ms: 700 });
  await at(1.6); await moveTo(1010, 430, { ms: 700 });
  await at(2.9); await moveTo(900, 250, { ms: 700 });
  await at(4.1); await moveTo(330, 250, { ms: 700 });
  // 5–10 s: a smooth scroll down to the full 3D map (over the colour key's corner, so the scene never zooms);
  // the time slider dragged right (the planets orbit), then LIVE.
  // Over the left column: the first screen's text, then the (empty) left console of the full section; the colour
  // key keeps the wheel to itself, so the scroll is not done over it.
  await at(4.9); await wheel(homeHeight, 850);
  facts.scrolledDown = await evaluate("[document.getElementById('page-home').scrollTop, document.getElementById('home-hero').getBoundingClientRect().bottom - document.getElementById('page-home').getBoundingClientRect().top]");
  if (facts.scrolledDown[1] > 2) problems.push(`the first screen still shows after the scroll down: ${facts.scrolledDown}`);
  // The time slider: from 1 (real time) to the right, so the planets orbit.
  const [rx, ry, rw, rh] = controls.rate;
  const thumbX = rx + 8 + ((1 + 7) / 14) * (rw - 16); const thumbY = Math.min(ry + rh / 2, 600);
  await moveTo(thumbX, thumbY);
  await sleep(120);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mouse.x, y: mouse.y, button: 'left', buttons: 1, clickCount: 1 });
  await moveTo(thumbX + 72, thumbY, { ms: 650, buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mouse.x, y: mouse.y, button: 'left', buttons: 0, clickCount: 1 });
  clicks.push({ selector: '#time-rate (drag)', at: ((Date.now() - takeStart) / 1000).toFixed(2), expect: 'faster time' });
  await at(7.5); await click('#time-live', { expect: 'live' });
  // 10–13 s: back up to "Or pick a target" (the wheel over the time bar, which never zooms the scene); a hover
  // on WISE 0855 (its tooltip), then a click on Barnard's Star.
  await at(8.5); await wheel(chipScroll - homeHeight, 800);
  const wise = await centre('#shortcut-list li:nth-child(2) button');
  await moveTo(wise[0], wise[1]);
  await sleep(1150);
  await click('#shortcut-list li:nth-child(1) button', { expect: 'investigate (Barnard)' });
  facts.barnardClickAt = clicks.at(-1).at;
  // 13–20 s: Barnard's Star blinking; Contrast dragged right.
  await waitFor("document.body.dataset.page === 'investigate' && document.getElementById('play').getAttribute('aria-pressed') === 'true'", 4000);
  facts.opened = await evaluate("document.getElementById('object-name').textContent");
  facts.liveAfter = await evaluate("document.getElementById('time-live').getAttribute('aria-pressed')");
  facts.tooltip = await evaluate("document.querySelector('#shortcut-list li:nth-child(2) button').title");
  if (facts.opened !== "Barnard's Star") problems.push(`opened ${facts.opened}`);
  facts.openedAt = ((Date.now() - takeStart) / 1000).toFixed(2);
  await checkNames('Barnard (Home behind)');
  await at(15.0); facts.contrast = await dragRange('#contrast', 64);
  facts.findingShown = await evaluate("document.getElementById('finding').textContent");
  facts.shift = (facts.findingShown.match(/about ([\d,]+)″/) ?? [])[1];
  const labels = await evaluate(`new Promise((resolve) => { const seen = {}; const t0 = performance.now();
    const look = () => { const text = document.getElementById('plate-date')?.textContent ?? '';
      if (/^A\\b/.test(text)) seen.a = text; if (/^B\\b/.test(text)) seen.b = text;
      if ((seen.a && seen.b) || performance.now() - t0 > 2500) resolve(seen); else setTimeout(look, 40); };
    look(); })`);
  facts.yearA = (String(labels.a ?? '').match(/(19|20)\d\d/) ?? [])[0];
  facts.yearB = (String(labels.b ?? '').match(/(19|20)\d\d/) ?? [])[0];
  if (!facts.yearA || !facts.yearB || !facts.shift) problems.push(`Barnard facts: ${JSON.stringify({ labels, finding: facts.findingShown })}`);
  facts.behind = await evaluate("(() => { const p = document.getElementById('page-investigate').getBoundingClientRect(); const seen = []; for (const sel of ['.space-label', '#space-tools', '#space-time', '#map-key', '.console-left']) for (const n of document.querySelectorAll(sel)) { if (!n.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue; const r = n.getBoundingClientRect(); if (r.width && r.right > p.left && r.left < p.right && r.bottom > p.top && r.top < p.bottom && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === n) seen.push(sel); } return [...new Set(seen)]; })()");
  await checkNames('Barnard');
  await at(16.7); await moveTo(820, 300);
  // 17.5–26 s: "What changed", then "Estimate motion" (the quick look takes about 1.3 s to track the star, then the
  // number counts up from 0). Task B28: the final value, with the "Catalogue" row clear of the caption, holds through
  // 22–24 s; only then the brightness chart. The stage keeps blinking beside the panel meanwhile.
  await at(17.2); await click('.panel-nav [data-panel="changed"]', { expect: 'What changed' });
  // The panel scrolls itself to "What changed"; once it stops, "Estimate motion" is brought to the middle
  // (scrollIntoView) and left to settle before the cursor moves (user, 15 Nov).
  const settle = `new Promise((resolve) => { const p = document.getElementById('inv-panel'); let last = -1; const t0 = performance.now(); const look = () => { if (p.scrollTop === last || performance.now() - t0 > 2500) resolve(p.scrollTop); else { last = p.scrollTop; setTimeout(look, 100); } }; setTimeout(look, 150); })`;
  await evaluate(settle);
  await evaluate("document.getElementById('measure').scrollIntoView({ block: 'center' })");
  await evaluate(settle);
  // Every value the big number shows, recorded as it is written (none may be below 0 or past the result).
  await evaluate(`(() => { window.__shown = []; const box = document.getElementById('motion-result');
    new MutationObserver(() => { const n = box.querySelector('.big-number'); const v = n?.firstChild?.textContent; if (v && v !== window.__shown.at(-1)) window.__shown.push(v); })
      .observe(box, { subtree: true, childList: true, characterData: true }); })()`);
  await click('#measure', { expect: 'motion result' });
  facts.measureAt = clicks.at(-1).at;
  await waitFor("document.querySelectorAll('#motion-result tr').length >= 2", 4000);
  // The cursor steps off the number; if the "Catalogue" row would sit under the caption, the panel is wheeled up.
  const result = await evaluate("(() => { const r = document.querySelector('#motion-result').getBoundingClientRect(); return [r.right, r.top]; })()");
  await moveTo(Math.min(1250, result[0] - 24), Math.max(140, result[1] - 30), { ms: 400 });
  const rowBottom = await evaluate("[...document.querySelectorAll('#motion-result tr')].find((tr) => /Catalogue/.test(tr.textContent))?.getBoundingClientRect().bottom ?? 0");
  if (rowBottom > 540) await wheel(Math.round(rowBottom - 500), 450);
  await waitFor(`(() => { const big = document.querySelector('#motion-result .big-number'); const td = document.querySelector('#motion-result td');
    return Boolean(big && td && td.textContent.startsWith(big.firstChild.textContent + ' ')); })()`, 4000);
  facts.finalAt = ((Date.now() - takeStart) / 1000).toFixed(2);
  facts.estimate = await evaluate("document.getElementById('motion-result').innerText.split('\\n').slice(0, 3).join(' | ')");
  facts.quick = (String(facts.estimate).match(/Browser estimate\s+([\d.]+)/) ?? [])[1] ?? null;
  facts.held = await evaluate(`(() => { const big = document.querySelector('#motion-result .big-number').getBoundingClientRect();
    const row = [...document.querySelectorAll('#motion-result tr')].find((tr) => /Catalogue/.test(tr.textContent));
    const r = row.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + 20, r.top + r.height / 2);
    return { big: [Math.round(big.top), Math.round(big.bottom)], catalogue: [Math.round(r.top), Math.round(r.bottom)], text: row.textContent.trim(), onTop: row.contains(hit) }; })()`);
  if (Number(facts.finalAt) > 21.8) problems.push(`the motion result is final only at ${facts.finalAt} s`);
  if (!facts.held?.onTop || facts.held.catalogue[1] > 560 || facts.held.big[0] < 60) problems.push(`the result is not clear of the caption: ${JSON.stringify(facts.held)}`);
  await at(24.3); // the final value and the Catalogue row held through 22, 23 and 24 s
  facts.shown = await evaluate('window.__shown');
  const final = Number(facts.quick);
  if (!facts.shown?.length || facts.shown.some((v) => !(Number(v) >= 0 && Number(v) <= final)) || Number(facts.shown.at(-1)) !== final) problems.push(`count-up values ${JSON.stringify(facts.shown)} (final ${final})`);
  facts.heldUntil = await evaluate("document.querySelector('#motion-result .big-number')?.firstChild?.textContent");
  facts.chart = await evaluate("document.getElementById('curve-chart').childElementCount > 0");
  const chartBottom = await evaluate("document.getElementById('curve-chart').getBoundingClientRect().bottom");
  if (chartBottom > 560) await wheel(chartBottom - 540, 650);
  await moveTo(1100, 260);
  await checkNames('What changed');
  await at(TAKE_SECONDS + 0.3);
  const end = Date.now();
  await send('Page.stopScreencast');
  listeners.splice(listeners.indexOf(onFrame), 1);
  return { frames, start: takeStart, end };
}

/** Writes the take's frames as one exact-length 30 fps clip. */
function encodeTake({ frames, start, end }, count) {
  const dir = join(WORK, 'take');
  const lines = [];
  frames.forEach((frame, index) => {
    const next = ((frames[index + 1]?.t ?? end) - (index === 0 ? start : Math.max(frame.t, start))) / 1000;
    lines.push(`file '${frame.file}'`, `duration ${Math.max(0.001, next).toFixed(4)}`);
  });
  lines.push(`file '${frames.at(-1).file}'`);
  writeFileSync(join(dir, 'list.txt'), lines.join('\n'));
  const output = join(WORK, 'take.mp4');
  run(['-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
    '-vf', `fps=${FPS},tpad=stop_mode=clone:stop_duration=3,scale=1280:720:flags=lanczos,format=yuv420p`,
    '-frames:v', String(count), '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-an', output]);
  return output;
}

/** The largest step of the cursor between two video frames (30 fps), from the positions sent. */
function maxStepPerFrame(start) {
  const position = (ms) => { let last = path[0]; for (const point of path) { if (point[0] > ms) break; last = point; } return last; };
  let worst = 0;
  for (let frame = 1; frame < TAKE_SECONDS * FPS; frame += 1) {
    const a = position(start + ((frame - 1) * 1000) / FPS); const b = position(start + (frame * 1000) / FPS);
    worst = Math.max(worst, Math.hypot(b[1] - a[1], b[2] - a[2]));
  }
  return Math.round(worst);
}

// ---------- Record, caption, assemble ----------

const cursorScript = await send('Page.addScriptToEvaluateOnNewDocument', { source: CURSOR_SCRIPT });
const taken = await recordTake();
// The captions and the title card are drawn without the cursor (the title card has none, task B26).
await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: cursorScript.result.identifier });
const clips = [{ id: 'take', file: encodeTake(taken, TAKE_SECONDS * FPS) }];
facts.frames = taken.frames.length;
facts.maxCursorStepPx = maxStepPerFrame(taken.start);
if (facts.maxCursorStepPx > 120) problems.push(`cursor moved ${facts.maxCursorStepPx} px in one frame`);
console.log('recorded the take', taken.frames.length, 'frames');
const title = join(WORK, 'title.png');
await screenshotFile(pathToFileURL(join(HERE, 'video', 'title-card.html')).href, title);
const titleClip = join(WORK, 's7-title.mp4');
run(['-loop', '1', '-i', title, '-vf', `fps=${FPS},format=yuv420p`, '-frames:v', String(TITLE_SECONDS * FPS), '-c:v', 'libx264', '-crf', '12', '-an', titleClip]);
clips.push({ id: 's7-title', file: titleClip });

// The caption table: shot captions laid end to end; the title card carries its own text.
const cues = [];
let clock = 0;
for (const shot of SHOTS) {
  if (shot.captions) shot.captions.forEach((cue) => cues.push({ start: clock + cue.at, end: clock + cue.at + cue.seconds, text: typeof cue.text === 'function' ? cue.text() : cue.text }));
  else cues.push({ start: clock, end: clock + shot.seconds, top: shot.top === true, text: typeof shot.caption === 'function' ? shot.caption() : shot.caption });
  clock += shot.seconds;
}
const total = clock + TITLE_SECONDS;

// Each caption drawn by Chrome on a transparent page; its lines read back so the .srt breaks where the video does.
for (const [index, cue] of cues.entries()) {
  cue.png = join(WORK, `caption-${index + 1}.png`);
  await screenshotFile(`${pathToFileURL(join(HERE, 'video', 'caption.html')).href}?t=${encodeURIComponent(cue.text)}${cue.top ? '&pos=top' : ''}`, cue.png, true);
  cue.lines = await evaluate(`(() => {
    const rows = new Map();
    for (const span of document.querySelectorAll('#box span')) { const top = Math.round(span.offsetTop); rows.set(top, [...(rows.get(top) ?? []), span.textContent]); }
    return [...rows.keys()].sort((a, b) => a - b).map((top) => rows.get(top).join(' '));
  })()`);
  if (cue.lines.length > 2) problems.push(`caption ${index + 1} has ${cue.lines.length} lines`);
}

const inputs = [...clips.flatMap((clip) => ['-i', clip.file]), ...cues.flatMap((cue) => ['-loop', '1', '-i', cue.png])];
const filter = [`${clips.map((_, index) => `[${index}:v]`).join('')}concat=n=${clips.length}:v=1:a=0[v0]`];
cues.forEach((cue, index) => {
  filter.push(`[v${index}][${clips.length + index}:v]overlay=0:0:enable='gte(t,${cue.start})*lt(t,${cue.end})'[v${index + 1}]`);
});
run([...inputs, '-filter_complex', filter.join(';'), '-map', `[v${cues.length}]`, '-frames:v', String(total * FPS), '-r', String(FPS),
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-preset', 'slow', '-crf', '20',
  '-movflags', '+faststart', '-an', `${OUT}.mp4`]);

const stamp = (seconds) => {
  const ms = Math.round(seconds * 1000);
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};
writeFileSync(`${OUT}.srt`, cues.map((cue, index) => `${index + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.lines.join('\n')}\n`).join('\n'));

// Contact sheet: one frame from the middle of each shot, 4 across.
const middles = [];
clock = 0;
for (const shot of [...SHOTS.flatMap((item) => (item.captions ? item.captions.map((cue) => ({ seconds: cue.seconds })) : [{ seconds: item.seconds }])), { seconds: TITLE_SECONDS }]) {
  middles.push(clock + shot.seconds / 2);
  clock += shot.seconds;
}
const select = middles.map((time) => `eq(n\\,${Math.round(time * FPS)})`).join('+');
run(['-i', `${OUT}.mp4`, '-vf', `select='${select}',scale=640:360,tile=3x2:padding=8:color=0x05070d`, '-frames:v', '1', '-fps_mode', 'vfr', `${OUT}-contact.png`]);

const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
  'stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_frames:format=duration,size', '-of', 'json', `${OUT}.mp4`]).stdout.toString());
console.log(JSON.stringify({ facts, clicks, cues: cues.map(({ start, end, lines }) => ({ start, end, lines })), probe, bytes: statSync(`${OUT}.mp4`).size, problems }, null, 2));
rmSync(WORK, { recursive: true, force: true });
socket.close();
chrome.kill();
server?.close();
process.exit(problems.length ? 1 : 0);
