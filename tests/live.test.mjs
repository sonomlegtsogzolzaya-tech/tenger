// Every public static copy (GitHub Pages, Cloudflare Pages, a custom domain) has no TENGER server: it must make no live
// request at all, in particular none to spherex-blink.onrender.com, which the team does not run (user's decisions,
// 15 and 16 Nov 2026). Running locally (same-origin uvicorn backend on localhost, 127.0.0.1 or [::1]) keeps live search.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { has, t } from '../static/js/i18n.js';
import * as api from '../static/js/api.js';

const STATIC = fileURLToPath(new URL('../static/', import.meta.url));

/** Runs fn with a pretend page address and a fetch spy; returns the URLs fetched. */
async function onHost(hostname, fn) {
  const saved = { location: globalThis.location, fetch: globalThis.fetch };
  const requested = [];
  globalThis.location = { hostname };
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    return { ok: true, status: 200, json: async () => ({ ra: 1, dec: 2, id: 'x' }), arrayBuffer: async () => new ArrayBuffer(8) };
  };
  try {
    await fn();
  } finally {
    globalThis.location = saved.location;
    globalThis.fetch = saved.fetch;
  }
  return requested;
}

// Fix CF2 (16 Nov 2026): every public copy behaves like GitHub Pages, including the Space Apps link on Cloudflare Pages
// (vestigium-82p.pages.dev), any other pages.dev name, a custom domain and a LAN address.
const PUBLIC_HOSTS = ['nama2323.github.io', 'vestigium-82p.pages.dev', 'cloudflare-mirror.vestigium-82p.pages.dev', 'vestigium.example.org', '192.168.1.20'];

test('on every public host (github.io, pages.dev, a custom domain) no live call makes any request; each says live search is unavailable', async () => {
  for (const hostname of PUBLIC_HOSTS) {
    const requested = await onHost(hostname, async () => {
      assert.equal(api.liveAvailable(), false, hostname);
      for (const call of [() => api.observe(150.1, 2.2, 0.1), () => api.resolveName('M31'), () => api.getGaia(1, 2, 0.1), () => api.jobStatus('x'), () => api.parsePosition('10 20')]) {
        await assert.rejects(call(), (error) => error.liveUnavailable === true);
      }
    });
    assert.deepEqual(requested, [], `${hostname}: nothing fetched`);
  }
});

test('running locally (localhost, 127.0.0.1, [::1]) keeps live search, on this same origin and never on another host', async () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'LOCALHOST']) {
    const requested = await onHost(hostname, async () => {
      assert.equal(api.liveAvailable(), true, hostname);
      await api.observe(150.1, 2.2, 0.1);
    });
    assert.deepEqual(requested, ['/api/observe?ra=150.1&dec=2.2&fov=0.1'], hostname);
  }
});

test('one rule: no other module tests the page\'s host; they all ask api.liveAvailable()', () => {
  const offenders = [];
  for (const entry of readdirSync(`${STATIC}js`)) {
    if (!entry.endsWith('.js') || entry === 'api.js') continue;
    const code = readFileSync(`${STATIC}js/${entry}`, 'utf8').split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
    if (/location\.(hostname|host|origin)\b[^;]*(github|pages\.dev|localhost|127\.0\.0\.1)|['"`][^'"`]*github\.io['"`]|\.endsWith\(['"`](github|\.pages)/.test(code)) offenders.push(entry);
  }
  assert.deepEqual(offenders, []);
  assert.deepEqual(api.LOCAL_HOSTS, ['localhost', '127.0.0.1', '[::1]', '::1']);
});

test('no file the site serves names onrender.com; the note says what works', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.(html|js|mjs|css|json)$/.test(entry.name)) files.push(path);
    }
  };
  walk(STATIC.replace(/\/$/, ''));
  assert.deepEqual(files.filter((path) => /onrender\.com/i.test(readFileSync(path, 'utf8'))), []);
  assert.ok(has('note.liveUnavailable'));
  assert.equal(t('note.liveUnavailable'), 'Live search needs the Vestigium server, which is not running on this public site; the prepared targets work.');
});
