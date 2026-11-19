// Beep Radar: pure functions (no DOM). Tested in test/lib.test.mjs.

const DEG = Math.PI / 180;
const R_EARTH = 6371008.8; // mean Earth radius, m

// ---------- ETRS-TM35FIN (EPSG:3067) -> WGS84 / ETRS89 ----------
// Inverse transverse Mercator with Krüger series (JHS 154). GRS80, CM 27°E, k0 0.9996, FE 500 000.
export function etrsTm35finToWgs84(northing, easting) {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, lon0 = 27 * DEG, E0 = 500000;
  const e2 = f * (2 - f), e = Math.sqrt(e2), n = f / (2 - f);
  const n2 = n * n, n3 = n2 * n, n4 = n3 * n;
  const A1 = (a / (1 + n)) * (1 + n2 / 4 + n4 / 64);
  const xi = northing / (A1 * k0), eta = (easting - E0) / (A1 * k0);
  const h = [
    n / 2 - (2 / 3) * n2 + (37 / 96) * n3 - (1 / 360) * n4,
    (1 / 48) * n2 + (1 / 15) * n3 - (437 / 1440) * n4,
    (17 / 480) * n3 - (37 / 840) * n4,
    (4397 / 161280) * n4,
  ];
  let xi1 = xi, eta1 = eta;
  for (let j = 1; j <= 4; j++) {
    xi1 -= h[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    eta1 -= h[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }
  const beta = Math.asin(Math.sin(xi1) / Math.cosh(eta1));
  const l = Math.asin(Math.tanh(eta1) / Math.cos(beta));
  const Q1 = Math.asinh(Math.tan(beta));
  let Q2 = Q1;
  for (let i = 0; i < 10; i++) Q2 = Q1 + e * Math.atanh(e * Math.tanh(Q2));
  return { lat: Math.atan(Math.sinh(Q2)) / DEG, lon: (lon0 + l) / DEG };
}

// ---------- Parsing ----------
const valid = (lat, lon) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const ok = (lat, lon, format) => (valid(lat, lon) ? { lat, lon, format } : null);

function parseUrl(s) {
  let m;
  // Google: !3dLAT!4dLON is the place itself, prefer it over the map centre (@)
  if ((m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/))) return ok(+m[1], +m[2], 'url');
  // OSM: mlat=..&mlon=..
  const mlat = s.match(/[?&]mlat=(-?\d+(?:\.\d+)?)/), mlon = s.match(/[?&]mlon=(-?\d+(?:\.\d+)?)/);
  if (mlat && mlon) return ok(+mlat[1], +mlon[1], 'url');
  // q= / query= / ll= / destination= / daddr= with "lat,lon"
  if ((m = s.match(/[?&](?:q|query|ll|sll|destination|daddr|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i)))
    return ok(+m[1], +m[2], 'url');
  // OSM: #map=zoom/lat/lon
  if ((m = s.match(/#map=\d+(?:\.\d+)?\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/))) return ok(+m[1], +m[2], 'url');
  // Google: /@lat,lon,zoom
  if ((m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/))) return ok(+m[1], +m[2], 'url');
  // This app's own link: #t=lat,lon
  if ((m = s.match(/[#&]t=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/))) return ok(+m[1], +m[2], 'url');
  return null;
}

function parseDms(s) {
  // Each part: optional hemisphere letter, degrees, optional minutes, optional seconds, optional hemisphere letter
  const re = /([NSEWPIÖLnsewpiöl])?\s*(\d+(?:[.,]\d+)?)\s*(?:°|º|d|\s)\s*(?:(\d+(?:[.,]\d+)?)\s*(?:'|′|’|m|\s)\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:"|″|”|''|s)\s*)?([NSEWPIÖLnsewpiöl])?/g;
  if (!/[°º'′’"″”]/.test(s)) return null;
  const parts = [];
  let m;
  while ((m = re.exec(s)) && parts.length < 2) {
    if (!m[0].trim()) { re.lastIndex++; continue; }
    const num = (x) => (x ? parseFloat(x.replace(',', '.')) : 0);
    const val = num(m[2]) + num(m[3]) / 60 + num(m[4]) / 3600;
    const hemi = (m[1] || m[5] || '').toUpperCase();
    parts.push({ val, hemi });
  }
  if (parts.length !== 2) return null;
  let lat = null, lon = null;
  for (const [i, p] of parts.entries()) {
    const sign = p.hemi === 'S' || p.hemi === 'W' || p.hemi === 'L' ? -1 : 1;
    const isLat = p.hemi ? 'NSP'.includes(p.hemi) : i === 0;
    // Finnish: P = pohjoinen (N), I = itä (E), L = länsi (W), E = etelä is ambiguous with East, so E = East
    if (isLat) lat = sign * p.val; else lon = sign * p.val;
  }
  if (lat === null || lon === null) return null;
  return ok(lat, lon, 'dms');
}

function parseEtrs(s) {
  const t = s.replace(/ /g, ' ');
  let m;
  // Labelled: N 6672000 E 385000, P=6672000 I=385000, x/y labels (Finnish usage: x = northing, y = easting)
  const nm = t.match(/(?:^|[^a-z])(?:n|p|x)\s*[:=]?\s*(\d{7}(?:[.,]\d+)?)/i);
  const em = t.match(/(?:^|[^a-z])(?:e|i|y)\s*[:=]?\s*(\d{5,6}(?:[.,]\d+)?)/i);
  if (nm && em) return fromEtrs(parseFloat(nm[1].replace(',', '.')), parseFloat(em[1].replace(',', '.')));
  // Bare pair: decide order by magnitude
  if ((m = t.match(/^\s*(\d{5,7}(?:\.\d+)?)\s*[,; ]\s*(\d{5,7}(?:\.\d+)?)\s*$/))) {
    const a = +m[1], b = +m[2];
    if (a >= 6500000 && a <= 7900000 && b > 0 && b < 1000000) return fromEtrs(a, b);
    if (b >= 6500000 && b <= 7900000 && a > 0 && a < 1000000) return fromEtrs(b, a);
  }
  return null;
}
function fromEtrs(N, E) {
  if (!(N >= 6500000 && N <= 7900000 && E > 0 && E < 1000000)) return null;
  const { lat, lon } = etrsTm35finToWgs84(N, E);
  return ok(lat, lon, 'etrs');
}

function parseDecimal(s) {
  let t = s.trim().replace(/ /g, ' ');
  let m;
  if (t.includes(';')) {
    const [a, b] = t.split(';').map((x) => parseFloat(x.trim().replace(',', '.')));
    return ok(a, b, 'decimal');
  }
  // "60,1699 24,9384" (decimal commas, space separated)
  if ((m = t.match(/^(-?\d+,\d+)\s+(-?\d+,\d+)$/))) return ok(+m[1].replace(',', '.'), +m[2].replace(',', '.'), 'decimal');
  if ((m = t.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/))) return ok(+m[1], +m[2], 'decimal');
  return null;
}

/** Parse any supported coordinate text. Returns {lat, lon, format} or null. */
export function parseCoordinates(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  if (/^geo:/i.test(s)) {
    const m = s.match(/^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    return m ? ok(+m[1], +m[2], 'url') : null;
  }
  if (/^https?:\/\/|^www\.|maps\.|openstreetmap|osm\.org/i.test(s)) return parseUrl(s);
  return parseEtrs(s) || parseDecimal(s) || parseDms(s);
}

// ---------- Geometry ----------
export function haversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG, dLon = (lon2 - lon1) * DEG;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing from point 1 to point 2, degrees 0..360 (0 = north). */
export function bearing(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * DEG, p2 = lat2 * DEG, dl = (lon2 - lon1) * DEG;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

/** Move a point by metres north and east (flat approximation, fine for < 10 km). */
export function offsetMeters(lat, lon, north, east) {
  return {
    lat: lat + north / R_EARTH / DEG,
    lon: lon + east / (R_EARTH * Math.cos(lat * DEG)) / DEG,
  };
}

// ---------- Sound ----------
export const FAR_M = 200, SLOW_S = 2.5, FAST_S = 0.12, LOW_HZ = 500, HIGH_HZ = 1500;

/** 0 at FAR_M or farther, 1 at the arrival radius or closer, logarithmic in between. */
export function closeness(distance, radius) {
  const r = Math.max(0.1, radius);
  if (distance <= r) return 1;
  if (distance >= FAR_M) return 0;
  return 1 - Math.log(distance / r) / Math.log(FAR_M / r);
}
/** Seconds between beeps. */
export function beepInterval(distance, radius) {
  const c = closeness(distance, radius);
  return c >= 1 ? FAST_S : SLOW_S - (SLOW_S - FAST_S) * c;
}
/** Beep pitch in Hz. */
export function beepPitch(distance, radius) {
  const c = closeness(distance, radius);
  return c >= 1 ? HIGH_HZ : LOW_HZ + (HIGH_HZ - LOW_HZ) * c;
}

// ---------- Formatting and link ----------
export function formatDistance(m) {
  if (!Number.isFinite(m)) return '–';
  if (m >= 1000) return (m / 1000).toFixed(2) + ' km';
  if (m >= 100) return Math.round(m) + ' m';
  return m.toFixed(1) + ' m';
}

export function buildHash({ lat, lon, r, n }) {
  let h = `#t=${lat.toFixed(6)},${lon.toFixed(6)}`;
  if (r !== undefined && r !== null && r !== '') h += `&r=${+(+r).toFixed(2)}`;
  if (n) h += `&n=${encodeURIComponent(n)}`;
  return h;
}

export function parseHash(hash) {
  const h = String(hash || '').replace(/^#/, '');
  if (!h) return null;
  const out = {};
  for (const part of h.split('&')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i), v = part.slice(i + 1);
    try { out[k] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { out[k] = v; }
  }
  if (!out.t) return null;
  const [lat, lon] = out.t.split(',').map(Number);
  if (!valid(lat, lon)) return null;
  let r = parseFloat(out.r);
  if (!Number.isFinite(r)) r = 3;
  r = Math.min(50, Math.max(0.5, r));
  return { lat, lon, r, n: (out.n || '').slice(0, 80) };
}

/** Average of fixes [{lat, lon, acc}], each weighted equally. */
export function averageFixes(fixes) {
  if (!fixes.length) return null;
  const s = fixes.reduce((a, f) => ({ lat: a.lat + f.lat, lon: a.lon + f.lon, acc: a.acc + f.acc }), { lat: 0, lon: 0, acc: 0 });
  return { lat: s.lat / fixes.length, lon: s.lon / fixes.length, acc: s.acc / fixes.length };
}
