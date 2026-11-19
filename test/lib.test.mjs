import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCoordinates, etrsTm35finToWgs84, haversine, bearing, beepInterval, beepPitch,
  buildHash, parseHash, formatDistance, offsetMeters, FAST_S, SLOW_S,
} from '../lib.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (tol ${tol})`);
const expectPoint = (input, lat, lon, tol = 0.0001, format) => {
  const p = parseCoordinates(input);
  assert.ok(p, `parse failed: ${input}`);
  near(p.lat, lat, tol, `lat of "${input}"`);
  near(p.lon, lon, tol, `lon of "${input}"`);
  if (format) assert.equal(p.format, format);
};

test('decimal WGS84', () => {
  expectPoint('60.1699, 24.9384', 60.1699, 24.9384, 1e-9, 'decimal');
  expectPoint('60.1699 24.9384', 60.1699, 24.9384, 1e-9);
  expectPoint('60.1699,24.9384', 60.1699, 24.9384, 1e-9);
  expectPoint('60,1699; 24,9384', 60.1699, 24.9384, 1e-9);
  expectPoint('60.1699;24.9384', 60.1699, 24.9384, 1e-9);
  expectPoint('-33.8568, 151.2153', -33.8568, 151.2153, 1e-9);
});

test('DMS and degrees-minutes', () => {
  expectPoint(`60°10'11.6"N 24°56'18.2"E`, 60 + 10 / 60 + 11.6 / 3600, 24 + 56 / 60 + 18.2 / 3600, 1e-7, 'dms');
  expectPoint(`N 60° 10.193' E 24° 56.303'`, 60 + 10.193 / 60, 24 + 56.303 / 60, 1e-7);
  expectPoint(`33°51'24.5"S 151°12'55.1"E`, -(33 + 51 / 60 + 24.5 / 3600), 151 + 12 / 60 + 55.1 / 3600, 1e-7);
  expectPoint(`40°26'46"N 79°58'56"W`, 40 + 26 / 60 + 46 / 3600, -(79 + 58 / 60 + 56 / 3600), 1e-7);
});

test('ETRS-TM35FIN -> WGS84 known point (pyproj reference)', () => {
  const p = etrsTm35finToWgs84(6672000, 385000);
  near(p.lat, 60.16867, 0.0001, 'lat');
  near(p.lon, 24.92746, 0.0001, 'lon');
  // central meridian: easting 500000 must give exactly 27°E
  near(etrsTm35finToWgs84(7000000, 500000).lon, 27, 1e-9, 'CM');
});

test('ETRS-TM35FIN text formats', () => {
  expectPoint('N 6672000 E 385000', 60.16867, 24.92746, 0.0001, 'etrs');
  expectPoint('N=6672000, E=385000', 60.16867, 24.92746);
  expectPoint('P 6672000 I 385000', 60.16867, 24.92746);
  expectPoint('6672000, 385000', 60.16867, 24.92746);
  expectPoint('385000 6672000', 60.16867, 24.92746);
  expectPoint('6672000.5;385000.25', 60.16867, 24.92746);
});

test('map links', () => {
  expectPoint('https://www.google.com/maps/place/Helsinki/@60.1698557,24.938379,12z/data=!3d60.1699!4d24.9384', 60.1699, 24.9384, 1e-9, 'url');
  expectPoint('https://www.google.com/maps/@60.1698557,24.938379,15z', 60.1698557, 24.938379, 1e-9);
  expectPoint('https://maps.google.com/?q=60.1699,24.9384', 60.1699, 24.9384, 1e-9);
  expectPoint('https://www.google.com/maps/search/?api=1&query=60.1699%2C24.9384', 60.1699, 24.9384, 1e-9);
  expectPoint('https://www.openstreetmap.org/?mlat=60.1699&mlon=24.9384#map=17/60.17/24.94', 60.1699, 24.9384, 1e-9);
  expectPoint('https://www.openstreetmap.org/#map=17/60.16990/24.93840', 60.1699, 24.9384, 1e-9);
  expectPoint('geo:60.1699,24.9384', 60.1699, 24.9384, 1e-9);
  expectPoint('https://example.github.io/beep-radar/#t=60.169900,24.938400&r=3', 60.1699, 24.9384, 1e-9);
});

test('rejects garbage and out-of-range', () => {
  for (const s of ['', 'hello', '95, 24', '60, 200', '123', 'N 123 E 456']) assert.equal(parseCoordinates(s), null, s);
});

test('haversine distance', () => {
  // 1 minute of latitude is about 1852 m
  near(haversine(60, 25, 60 + 1 / 60, 25), 1853, 3, '1 arcmin');
  // Helsinki -> Tampere about 160 km
  near(haversine(60.1699, 24.9384, 61.4978, 23.761), 160e3, 2e3, 'HEL-TRE');
  assert.equal(haversine(60, 25, 60, 25), 0);
});

test('bearing', () => {
  near(bearing(60, 25, 61, 25), 0, 1e-9, 'north');
  near(bearing(60, 25, 59, 25), 180, 1e-9, 'south');
  near(bearing(0, 0, 0, 1), 90, 1e-9, 'east');
  near(bearing(0, 0, 0, -1), 270, 1e-9, 'west');
});

test('offsetMeters round trip', () => {
  const p = offsetMeters(60.1699, 24.9384, -40, 0);
  near(haversine(p.lat, p.lon, 60.1699, 24.9384), 40, 0.01, '40 m');
  near(bearing(p.lat, p.lon, 60.1699, 24.9384), 0, 0.01, 'target is north');
});

test('beep interval and pitch', () => {
  assert.equal(beepInterval(500, 3), SLOW_S);
  assert.equal(beepInterval(200, 3), SLOW_S);
  assert.equal(beepInterval(3, 3), FAST_S);
  assert.equal(beepInterval(1, 3), FAST_S);
  let prev = Infinity;
  for (const d of [199, 100, 50, 20, 10, 5, 3.1]) {
    const i = beepInterval(d, 3);
    assert.ok(i < prev && i > FAST_S && i < SLOW_S, `monotonic at ${d}`);
    prev = i;
  }
  assert.equal(beepPitch(500, 3), 500);
  assert.equal(beepPitch(2, 3), 1500);
  assert.ok(beepPitch(20, 3) > beepPitch(50, 3));
});

test('hash link round trip', () => {
  const h = buildHash({ lat: 60.1699, lon: 24.9384, r: 3, n: 'Hole R1-01 & ä' });
  assert.equal(h, '#t=60.169900,24.938400&r=3&n=Hole%20R1-01%20%26%20%C3%A4');
  assert.deepEqual(parseHash(h), { lat: 60.1699, lon: 24.9384, r: 3, n: 'Hole R1-01 & ä' });
  assert.equal(parseHash('#t=60,25').r, 3, 'default radius');
  assert.equal(parseHash('#t=60,25&r=999').r, 50, 'clamped');
  assert.equal(parseHash('#t=95,25'), null);
  assert.equal(parseHash(''), null);
});

test('formatDistance', () => {
  assert.equal(formatDistance(12.44), '12.4 m');
  assert.equal(formatDistance(345.6), '346 m');
  assert.equal(formatDistance(1320), '1.32 km');
});
