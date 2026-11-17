// Task B32: every deploy gets one build version on its modules, stylesheets and data files, so a browser never runs a
// new index.html with old cached modules (raw string keys, "Cannot read properties of null"). And a missing string
// shows nothing instead of its key.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { modulesUnder, stamp } from '../.github/scripts/stamp-build.mjs';
import { versioned } from '../static/js/dom.js';
import { has, t } from '../static/js/i18n.js';

const STATIC = fileURLToPath(new URL('../static/', import.meta.url));
const html = readFileSync(new URL('../static/index.html', import.meta.url), 'utf8');
const modules = modulesUnder(STATIC);
const mapOf = (page) => JSON.parse(page.match(/<script type="importmap" id="build-map">([\s\S]*?)<\/script>/)[1]).imports;

test('the committed index.html is stamped "dev" and its import map lists every module (re-stamping changes nothing)', () => {
  assert.equal(stamp(html, modules, 'dev'), html, 'run: node .github/scripts/stamp-build.mjs static dev');
  assert.ok(html.indexOf('id="build-map"') < html.indexOf('<script type="module"'), 'the import map comes before any module');
});

test('a deploy stamp versions every module, stylesheet, the main script and the data files', () => {
  const page = stamp(html, modules, '0123abcd4567');
  const map = mapOf(page);
  for (const path of modules) assert.equal(map[`./${path}`], `./${path}?v=0123abcd4567`, path);
  const sheets = [...page.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(sheets.length >= 1 && sheets.every((href) => href.endsWith('?v=0123abcd4567')), sheets.join(' '));
  assert.match(page, /<script type="module" src="js\/main\.js\?v=0123abcd4567"><\/script>/);
  assert.match(page, /<meta name="build" content="0123abcd4567">/);
  assert.throws(() => stamp(html, modules, 'bad version!'));
});

test('every import in the site\'s modules (static and dynamic) goes through the import map', () => {
  const map = mapOf(html);
  for (const name of readdirSync(new URL('../static/js/', import.meta.url))) {
    if (!name.endsWith('.js')) continue;
    const source = readFileSync(new URL(`../static/js/${name}`, import.meta.url), 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*)'(\.{1,2}\/[^']+)'/g)) {
      const target = new URL(match[1], `https://site.test/js/${name}`).pathname.slice(1);
      assert.ok(map[`./${target}`], `${name} imports ${match[1]}, not in the import map`);
    }
  }
});

test('data requests carry the build; the API, other sites and non-data files do not', () => {
  assert.equal(versioned('data/index.json', 'abc'), 'data/index.json?v=abc');
  assert.equal(versioned('data/trials/x/trial.json?raw=1', 'abc'), 'data/trials/x/trial.json?raw=1&v=abc');
  assert.equal(versioned('https://example.org/tenger/data/index.json', 'abc', 'https://example.org'), 'https://example.org/tenger/data/index.json?v=abc');
  assert.equal(versioned('https://irsa.ipac.caltech.edu/data/x.json', 'abc', 'https://example.org'), 'https://irsa.ipac.caltech.edu/data/x.json');
  assert.equal(versioned('/api/targets', 'abc'), '/api/targets');
  assert.equal(versioned('data/index.json', ''), 'data/index.json');
});

test('a key with no text shows nothing, never the key itself', () => {
  assert.equal(has('no.such.key.b32'), false);
  assert.equal(t('no.such.key.b32'), '');
  assert.equal(t('nav.method'), 'How it works');
});

test('the stamp script also runs from a folder whose path has a space (Session A\'s report)', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync: write, readFileSync: readText } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const root = join(mkdtempSync(join(tmpdir(), 'stamp test ')), 'site with space');
  mkdirSync(join(root, 'js'), { recursive: true });
  mkdirSync(join(root, 'vendor'), { recursive: true });
  write(join(root, 'js', 'main.js'), '');
  write(join(root, 'index.html'), '<meta name="build" content="dev"><script type="importmap" id="build-map">{}</script><script type="module" src="js/main.js?v=dev"></script>');
  const script = fileURLToPath(new URL('../.github/scripts/stamp-build.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [script, root, 'spaced1'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /stamped .* with spaced1: 1 modules/);
  assert.match(readText(join(root, 'index.html'), 'utf8'), /js\/main\.js\?v=spaced1/);
});
