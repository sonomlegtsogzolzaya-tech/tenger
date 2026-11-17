// Coordinates and small sky geometry without a server. Pure: no DOM, so it runs under Node tests.
const DEG = Math.PI / 180;
const ARCSEC_PER_RAD = 206264.80624709636;
const SEXAGESIMAL_PARTS = 3;
const MINUTES = 60;

/** Unicode minus, degree, prime and double-prime signs become plain ASCII markers. */
function normalise(text) {
  return String(text ?? '')
    .trim()
    .replace(/[−–—]/g, '-')
    .replace(/[°º]/g, 'd')
    .replace(/[′']/g, 'm')
    .replace(/[″"]/g, 's')
    .replace(/\s+/g, ' ');
}

/** Splits one angle into its sign and up to three numbers; null if it is not a clean angle. */
function angleParts(text) {
  const clean = normalise(text).toLowerCase();
  if (!clean) return null;
  const sign = clean.startsWith('-') ? -1 : 1;
  const body = clean.replace(/^[+-]\s*/, '');
  const numbers = body.replace(/s$/, '').split(/[hdm:\s]+/).filter(Boolean);
  if (!numbers.length || numbers.length > SEXAGESIMAL_PARTS) return null;
  if (numbers.some((part) => !/^\d+(\.\d+)?$/.test(part))) return null;
  const values = numbers.map(Number);
  if (values.slice(1).some((value) => value >= MINUTES)) return null;
  if (values.slice(0, -1).some((value) => !Number.isInteger(value))) return null;
  const value = values[0] + (values[1] ?? 0) / MINUTES + (values[2] ?? 0) / (MINUTES * MINUTES);
  return {
    sign,
    value,
    sexagesimal: values.length > 1,
    hours: body.includes('h'),
    degrees: body.includes('d'),
  };
}

/** Right ascension in degrees from "269.45", "17h57m48.5s", "17:57:48.5" or "17 57 48.5"; else null. */
export function parseRa(text) {
  const parts = angleParts(text);
  if (!parts || parts.sign < 0) return null;
  const inHours = parts.hours || (parts.sexagesimal && !parts.degrees);
  const degrees = inHours ? parts.value * 15 : parts.value;
  return degrees >= 0 && degrees < 360 ? degrees : null;
}

/** Declination in degrees from "+4.77", "-56.8", "+04d41m36s", "+04:41:36" or "4 41 36"; else null. */
export function parseDec(text) {
  const parts = angleParts(text);
  if (!parts || parts.hours) return null;
  const degrees = parts.sign * parts.value;
  return Math.abs(degrees) <= 90 ? degrees : null;
}

/** One text with both coordinates, e.g. "269.45 4.77", "269.45, +4.77" or "17 57 48.5 +04 41 36". */
export function parseCoordinates(text) {
  const clean = normalise(text);
  if (!clean) return null;
  let pieces = null;
  if (clean.includes(',')) {
    pieces = clean.split(',').map((piece) => piece.trim());
  } else {
    const tokens = clean.split(' ');
    const signAt = tokens.findIndex((token, index) => index > 0 && /^[+-]/.test(token));
    if (signAt > 0) pieces = [tokens.slice(0, signAt).join(' '), tokens.slice(signAt).join(' ')];
    else if (tokens.length === 2) pieces = tokens;
    else if (tokens.length === 2 * SEXAGESIMAL_PARTS) pieces = [tokens.slice(0, 3).join(' '), tokens.slice(3).join(' ')];
  }
  if (!pieces || pieces.length !== 2) return null;
  const ra = parseRa(pieces[0]);
  const dec = parseDec(pieces[1]);
  return ra === null || dec === null ? null : { ra, dec };
}

/** Great-circle separation in degrees (haversine, stable for small angles). */
export function separationDeg(ra1, dec1, ra2, dec2) {
  const dRa = (ra2 - ra1) * DEG;
  const dDec = (dec2 - dec1) * DEG;
  const h = Math.sin(dDec / 2) ** 2 + Math.cos(dec1 * DEG) * Math.cos(dec2 * DEG) * Math.sin(dRa / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / DEG;
}

/** East and north offsets in arcsec of (ra, dec) on the tangent plane at (ra0, dec0). */
export function tangentOffsetArcsec(ra0, dec0, ra, dec) {
  const dRa = (ra - ra0) * DEG;
  const d0 = dec0 * DEG;
  const d = dec * DEG;
  const cosC = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(dRa);
  return {
    east: ((Math.cos(d) * Math.sin(dRa)) / cosC) * ARCSEC_PER_RAD,
    north: ((Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(dRa)) / cosC) * ARCSEC_PER_RAD,
  };
}

/** The inverse: the sky position (degrees) at east/north offsets (arcsec) on the tangent plane at (ra0, dec0). */
export function tangentToSky(ra0, dec0, east, north) {
  const xi = east / ARCSEC_PER_RAD;
  const eta = north / ARCSEC_PER_RAD;
  const d0 = dec0 * DEG;
  const across = Math.cos(d0) - eta * Math.sin(d0);
  const ra = ra0 + Math.atan2(xi, across) / DEG;
  return { ra: ((ra % 360) + 360) % 360, dec: Math.atan2(Math.sin(d0) + eta * Math.cos(d0), Math.hypot(xi, across)) / DEG };
}

export function addCovariance(first, second) {
  return [
    [first[0][0] + second[0][0], first[0][1] + second[0][1]],
    [first[1][0] + second[1][0], first[1][1] + second[1][1]],
  ];
}

/**
 * The region r.T inv(C) r <= d2 of a 2x2 covariance (east, north): semi-axes in the covariance's
 * length unit and the major axis angle in degrees from east towards north. Null if C is not positive definite.
 */
export function covarianceEllipse(cov, d2) {
  if (!Array.isArray(cov) || cov.length !== 2 || !(d2 > 0)) return null;
  const a = cov[0][0];
  const d = cov[1][1];
  const b = (cov[0][1] + cov[1][0]) / 2;
  if (![a, b, d].every(Number.isFinite)) return null;
  const half = Math.sqrt(((a - d) / 2) ** 2 + b * b);
  const major = (a + d) / 2 + half;
  const minor = (a + d) / 2 - half;
  if (!(minor > 0)) return null;
  let angle;
  if (b !== 0) angle = Math.atan2(major - a, b);
  else angle = a >= d ? 0 : Math.PI / 2;
  return { major: Math.sqrt(major * d2), minor: Math.sqrt(minor * d2), angleDeg: angle / DEG };
}

export const formatRa = (ra) => `${ra.toFixed(4)}°`;
export const formatDec = (dec) => `${dec >= 0 ? '+' : '−'}${Math.abs(dec).toFixed(4)}°`;
