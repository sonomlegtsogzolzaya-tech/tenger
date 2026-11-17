// Client for static target data and, for any other position, the TENGER server (backend/api.py) on this origin.
import { decodeCodes, decodeFrames, decodeStaticFrames } from './stack.js';

const GZIP_MAGIC = [0x1f, 0x8b];
const STATIC_ATTEMPTS = 4;
const STATIC_RETRY_MS = 800;

/**
 * Live search needs the TENGER server, which answers on the same origin when the site runs locally
 * (uvicorn backend.api:app). Every public copy is static and has no server (GitHub Pages, the Space Apps link on
 * Cloudflare Pages at vestigium-82p.pages.dev, any custom domain), so there the client makes no live request at all and
 * says so: archive-only objects stay out of search, Real sky is not offered and coordinate search explains why
 * (user's decisions, 15 and 16 Nov 2026). The prepared targets need no server. Fix CF2: the live server is used only on
 * the local machine's own names; every other host, a LAN address included, behaves like the public site.
 */
export const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];
export const liveAvailable = (hostname = globalThis.location?.hostname ?? '') => LOCAL_HOSTS.includes(String(hostname).toLowerCase());

/** The error a live call gives on the public static site; nothing was requested. */
export const liveUnavailableError = () => Object.assign(new Error('live-unavailable'), { liveUnavailable: true });

async function request(path, params = {}) {
  if (!liveAvailable()) throw liveUnavailableError();
  const query = new URLSearchParams(params).toString();
  const response = await fetch(query ? `${path}?${query}` : path);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : response.statusText;
    throw Object.assign(new Error(detail), { status: response.status });
  }
  return response;
}

const json = async (path, params) => (await request(path, params)).json();

export const parsePosition = (text) => json('/api/parse', { text });
export const resolveName = (q) => json('/api/resolve', { q });
export const observe = (ra, dec, fov) => json('/api/observe', { ra, dec, fov });
export const jobStatus = (id) => json(`/api/job/${id}`);
export const getGaia = (ra, dec, fov) => json('/api/gaia', { ra, dec, fov });

export async function getFrames(id, start, size) {
  const buffer = await (await request(`/api/job/${id}/frames`, { start })).arrayBuffer();
  return decodeFrames(buffer, size);
}

export async function getWiseFrame(id, size) {
  const buffer = await (await request(`/api/job/${id}/wise`)).arrayBuffer();
  const headerLength = new DataView(buffer).getUint32(0, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, headerLength)));
  return { ...meta, pixels: new Float32Array(buffer, 4 + headerLength, size * size) };
}

// ---------- Static data shipped with the site ----------

/** One network hiccup must not leave an empty page, so static files are retried. */
async function fetchStatic(path) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(`data/${path}`);
      if (response.ok) return response;
      if (attempt >= STATIC_ATTEMPTS) throw new Error(`Missing site data: ${path}`);
    } catch (error) {
      if (attempt >= STATIC_ATTEMPTS) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, STATIC_RETRY_MS * attempt));
  }
}

async function staticJson(path) {
  return (await fetchStatic(path)).json();
}

async function staticBinary(path) {
  const buffer = await (await fetchStatic(path)).arrayBuffer();
  const start = new Uint8Array(buffer, 0, 2);
  if (start[0] !== GZIP_MAGIC[0] || start[1] !== GZIP_MAGIC[1]) return buffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

export const getTargets = () => staticJson('targets.json');
export const getResults = () => staticJson('results.json');

export async function getStaticTarget(key) {
  const [meta, buffer] = await Promise.all([staticJson(`${key}/meta.json`), staticBinary(`${key}/frames.bin.gz`)]);
  return { meta, frames: decodeStaticFrames(buffer, meta) };
}

export async function getStaticWise(key, meta) {
  const buffer = await staticBinary(`${key}/wise.bin.gz`);
  return { year: meta.wise.year, pixels: decodeCodes(new Int16Array(buffer), meta.wise.soft, meta.step) };
}
