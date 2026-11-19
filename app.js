import {
  parseCoordinates, haversine, bearing, offsetMeters, beepInterval, beepPitch,
  formatDistance, buildHash, parseHash, averageFixes,
} from './lib.js';

// ---------------- i18n ----------------
const T = {
  fi: {
    createTitle: 'Luo kohde', createLead: 'Syötä koordinaatti, luo linkki ja lähetä se. Vastaanottaja avaa linkin ja löytää paikan piippausten avulla.',
    coordLabel: 'Koordinaatti tai karttalinkki', formatsTitle: 'Hyväksytyt muodot',
    etrsNote: '(ETRS-TM35FIN)', linkNote: 'Google Maps- tai OpenStreetMap-linkki, myös geo:-linkki',
    useLoc: '📍 Käytä nykyistä sijaintiani', mapHint: 'Napauta karttaa asettaaksesi kohteen. Merkkiä voi myös raahata.',
    nameLabel: 'Nimi (valinnainen)', radiusLabel: 'Perillä-säde (m)', createLink: 'Luo linkki',
    yourLink: 'Linkki', copy: 'Kopioi linkki', copied: 'Kopioitu ✓', share: 'Jaa…', tryIt: 'Kokeile itse',
    parsedPrefix: '✓ ', parsedFail: 'Koordinaattia ei tunnistettu', fmt: { decimal: 'desimaaliasteet', dms: 'asteet ja minuutit', etrs: 'ETRS-TM35FIN', url: 'linkistä', map: 'kartalta', gps: 'GPS' },
    locWaiting: 'Haetaan sijaintia… ({n}/5)', locDone: 'Sijainti haettu, {n} mittauksen keskiarvo, tarkkuus ±{acc} m', locFail: 'Sijaintia ei saatu.',
    start: 'START', startNote: 'Ääni ja kompassi vaativat napautuksen. Pidä äänet päällä (iPhonessa myös äänetön-kytkin pois).',
    simulation: 'SIMULAATIO', arrived: 'Olet perillä', volume: 'Äänenvoimakkuus', mute: '🔇 Mykistä', unmute: '🔊 Ääni päälle',
    simulate: 'Simuloi (testaa kävelemättä)', simHelp: 'Nuolet tai näppäimistön nuolinäppäimet: 1 m, Shift: 10 m. Nuolet ovat ilmansuuntia, ylös = pohjoinen.',
    jump: 'Hyppää 1 m päähän kohteesta', back: '← Luo uusi kohde', openMaps: 'Avaa kartassa ↗',
    accWarn: 'GPS-tarkkuus on heikompi kuin jäljellä oleva matka. Ääni voi hyppiä.',
    hCompass: 'Kompassi', hCourse: 'Kulkusuunta (GPS)', hNorth: 'Pohjoinen ylös', waitingGps: 'Odotetaan GPS-sijaintia…', poorGps: 'GPS liian epätarkka (±{acc} m), odotetaan…',
    geoDenied: 'Sijaintilupa on estetty.\n\niPhone: Asetukset → Tietosuoja ja suojaus → Sijaintipalvelut → Safari-verkkosivustot → "Kun appia käytetään", ja salli sijainti tälle sivulle.\nAndroid (Chrome): napauta osoiterivin vasemmalla olevaa kuvaketta → Luvat → Sijainti → Salli.\n\nVoit kokeilla sovellusta myös Simuloi-tilassa.',
    geoUnavailable: 'Sijaintia ei saada. Tarkista, että puhelimen sijaintipalvelu on päällä ja että olet ulkona tai ikkunan lähellä.',
    geoUnsupported: 'Tämä selain ei tue sijaintia.', insecure: 'Sijainti toimii vain https-osoitteessa.',
    noMap: 'Karttaa ei voitu ladata (ei verkkoyhteyttä?). Koordinaatin voi silti syöttää yllä.',
    footer: 'Beep Radar · tiedot eivät lähde laitteelta',
    targetDefault: 'Kohde', radiusText: 'perillä-säde {r} m',
    infoTitle: 'Tietoa ja rajoitukset',
    infoBody: '<p><b>Tarkkuus:</b> puhelimen GPS on tyypillisesti ±3–10 m, joten piippari vie muutaman metrin päähän, ei senttien tarkkuudella. Avoin taivas parantaa tarkkuutta, rakennukset ja tiheä metsä heikentävät sitä.</p><p><b>Näyttö päällä:</b> sovellus pitää näytön päällä. Lukitulla näytöllä tai taustalla ääni ja sijainti eivät toimi luotettavasti.</p><p><b>Kompassi:</b> nuoli käyttää puhelimen kompassia. Jos kompassia ei ole, nuoli käyttää kävelysuuntaa (kun kävelet) tai näyttää suunnan pohjoinen ylöspäin.</p><p><b>Yksityisyys:</b> ei tiliä, ei palvelinta, ei seurantaa. Koordinaatit ovat vain linkissä #-merkin jälkeen, eikä selain lähetä sitä osaa palvelimelle.</p><p>Ei turvallisuuskriittiseen käyttöön.</p>',
  },
  en: {
    createTitle: 'Create a target', createLead: 'Enter a coordinate, create a link and send it. The person who opens it finds the spot by following the beeps.',
    coordLabel: 'Coordinate or map link', formatsTitle: 'Accepted formats',
    etrsNote: '(ETRS-TM35FIN, Finland)', linkNote: 'Google Maps or OpenStreetMap link, or a geo: link',
    useLoc: '📍 Use my current location', mapHint: 'Tap the map to set the target. You can also drag the marker.',
    nameLabel: 'Name (optional)', radiusLabel: 'Arrival radius (m)', createLink: 'Create link',
    yourLink: 'Link', copy: 'Copy link', copied: 'Copied ✓', share: 'Share…', tryIt: 'Try it yourself',
    parsedPrefix: '✓ ', parsedFail: 'Coordinate not recognised', fmt: { decimal: 'decimal degrees', dms: 'degrees and minutes', etrs: 'ETRS-TM35FIN', url: 'from link', map: 'from map', gps: 'GPS' },
    locWaiting: 'Getting location… ({n}/5)', locDone: 'Location found, average of {n} fixes, accuracy ±{acc} m', locFail: 'Could not get location.',
    start: 'START', startNote: 'Sound and compass need a tap to start. Keep sound on (on iPhone, also the silent switch off).',
    simulation: 'SIMULATION', arrived: "You're there", volume: 'Volume', mute: '🔇 Mute', unmute: '🔊 Unmute',
    simulate: 'Simulate (test without walking)', simHelp: 'Arrow buttons or keyboard arrows: 1 m, Shift: 10 m. Arrows are compass directions, up = north.',
    jump: 'Jump to 1 m from target', back: '← Create a new target', openMaps: 'Open in maps ↗',
    accWarn: 'GPS accuracy is weaker than the remaining distance. The sound may jump.',
    hCompass: 'Compass', hCourse: 'Walking direction (GPS)', hNorth: 'North up', waitingGps: 'Waiting for GPS…', poorGps: 'GPS too inaccurate (±{acc} m), waiting…',
    geoDenied: 'Location permission is blocked.\n\niPhone: Settings → Privacy & Security → Location Services → Safari Websites → "While Using the App", then allow location for this page.\nAndroid (Chrome): tap the icon left of the address bar → Permissions → Location → Allow.\n\nYou can also try the app in Simulate mode.',
    geoUnavailable: 'No location available. Check that location services are on and that you are outdoors or near a window.',
    geoUnsupported: 'This browser does not support location.', insecure: 'Location only works on an https address.',
    noMap: 'The map could not load (offline?). You can still type the coordinate above.',
    footer: 'Beep Radar · no data leaves your device',
    targetDefault: 'Target', radiusText: 'arrival radius {r} m',
    infoTitle: 'About and limitations',
    infoBody: '<p><b>Accuracy:</b> phone GPS is typically ±3–10 m, so the beeper gets you to within a few metres, not centimetres. Open sky helps; buildings and dense forest make it worse.</p><p><b>Screen on:</b> the app keeps the screen awake. With a locked screen or in the background, sound and location do not work reliably.</p><p><b>Compass:</b> the arrow uses the phone compass. Without one, it uses your walking direction (while you walk) or shows the direction north-up.</p><p><b>Privacy:</b> no account, no server, no tracking. The coordinates live only in the link after the # sign, and browsers never send that part to a server.</p><p>Not for safety-critical use.</p>',
  },
};
const store = {
  get(k, d) { try { const v = localStorage.getItem('beepRadar.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('beepRadar.' + k, v); } catch { /* private mode */ } },
};
let lang = store.get('lang', (navigator.language || 'en').toLowerCase().startsWith('fi') ? 'fi' : 'en');
const t = (k, vars = {}) => String(T[lang][k] ?? T.en[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = T[lang][el.dataset.i18nHtml]; });
  document.querySelectorAll('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  updateParsed(); updateMute(); renderTargetHeader(); renderFind();
}
document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.lang; store.set('lang', lang); applyLang(); }));

const $ = (id) => document.getElementById(id);
const fmtLatLon = (p) => `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;
const isAndroid = /Android/i.test(navigator.userAgent);
const isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent) && 'ontouchend' in document;

// ---------------- Routing ----------------
let target = null;
function route() {
  const tgt = parseHash(location.hash);
  if (tgt) {
    target = tgt;
    $('createView').hidden = true; $('findView').hidden = false;
    renderTargetHeader();
    document.title = (tgt.n || t('targetDefault')) + ' · Beep Radar';
  } else {
    stopFinding();
    target = null;
    $('findView').hidden = true; $('createView').hidden = false;
    document.title = 'Beep Radar';
    initMap();
  }
}
window.addEventListener('hashchange', route);

// ================= CREATE VIEW =================
let draft = null; // {lat, lon, format}
let map = null, marker = null;

function setDraft(p, { fromInput = false, pan = true } = {}) {
  draft = p;
  if (p && !fromInput) $('coordInput').value = fmtLatLon(p);
  updateParsed();
  $('createBtn').disabled = !draft;
  $('shareBox').hidden = true;
  if (p && map && window.L) {
    if (!marker) {
      marker = L.marker([p.lat, p.lon], { draggable: true }).addTo(map);
      marker.on('dragend', () => { const ll = marker.getLatLng(); setDraft({ lat: ll.lat, lon: ll.lng, format: 'map' }, { pan: false }); });
    } else marker.setLatLng([p.lat, p.lon]);
    if (pan) map.setView([p.lat, p.lon], Math.max(map.getZoom(), 16));
  }
}
function updateParsed() {
  const el = $('parsed');
  if (!el) return;
  const raw = $('coordInput').value.trim();
  if (draft) { el.className = 'parsed ok'; el.textContent = `${t('parsedPrefix')}${fmtLatLon(draft)}  (${T[lang].fmt[draft.format] || ''})`; }
  else if (raw) { el.className = 'parsed bad'; el.textContent = t('parsedFail'); }
  else { el.className = 'parsed'; el.textContent = ''; }
}
$('coordInput').addEventListener('input', () => setDraft(parseCoordinates($('coordInput').value), { fromInput: true }));

function initMap() {
  if (map) { setTimeout(() => map.invalidateSize(), 50); return; }
  const el = $('map');
  if (!window.L) { el.classList.add('nomap'); el.textContent = t('noMap'); return; }
  map = L.map(el, { zoomControl: true, attributionControl: true }).setView([62, 25], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  map.on('click', (e) => setDraft({ lat: e.latlng.lat, lon: e.latlng.lng, format: 'map' }, { pan: false }));
  if (draft) setDraft(draft, { fromInput: true });
}

// "Use my current location": average 5 fixes
$('useLocBtn').addEventListener('click', () => {
  const status = $('locStatus');
  if (!navigator.geolocation) { status.textContent = t('geoUnsupported'); return; }
  const fixes = [];
  status.textContent = t('locWaiting', { n: 0 });
  $('useLocBtn').disabled = true;
  let id = null;
  const finish = (err) => {
    if (id !== null) navigator.geolocation.clearWatch(id);
    clearTimeout(timer);
    $('useLocBtn').disabled = false;
    if (fixes.length) {
      const a = averageFixes(fixes);
      setDraft({ lat: a.lat, lon: a.lon, format: 'gps' });
      status.textContent = t('locDone', { acc: a.acc.toFixed(1), n: fixes.length });
    } else status.textContent = t('locFail') + ' ' + (err ? geoErrorText(err) : '');
  };
  const timer = setTimeout(() => finish(), 30000);
  id = navigator.geolocation.watchPosition((pos) => {
    fixes.push({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy });
    status.textContent = t('locWaiting', { n: fixes.length });
    if (fixes.length >= 5) finish();
  }, (err) => finish(err), { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 });
});

function appBase() { return location.origin + location.pathname; }
function currentLink() {
  let r = parseFloat(String($('radiusInput').value).replace(',', '.'));
  if (!Number.isFinite(r)) r = 3;
  r = Math.min(50, Math.max(0.5, r));
  return appBase() + buildHash({ lat: draft.lat, lon: draft.lon, r, n: $('nameInput').value.trim() });
}
$('createBtn').addEventListener('click', () => {
  if (!draft) return;
  const link = currentLink();
  $('linkOut').value = link;
  $('openFindBtn').href = link.slice(link.indexOf('#'));
  $('shareBtn').hidden = !navigator.share;
  const qrEl = $('qr');
  qrEl.innerHTML = '';
  try {
    const q = qrcode(0, 'M'); q.addData(link); q.make();
    qrEl.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  } catch { qrEl.hidden = true; }
  $('shareBox').hidden = false;
  $('shareBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('copyBtn').addEventListener('click', async () => {
  const v = $('linkOut').value;
  try { await navigator.clipboard.writeText(v); } catch { $('linkOut').select(); document.execCommand('copy'); }
  $('copyBtn').textContent = t('copied');
  setTimeout(() => { $('copyBtn').textContent = t('copy'); }, 1800);
});
$('shareBtn').addEventListener('click', async () => {
  const name = $('nameInput').value.trim();
  try { await navigator.share({ title: name || 'Beep Radar', text: name ? `${name} · Beep Radar` : 'Beep Radar', url: $('linkOut').value }); } catch { /* cancelled */ }
});
[$('nameInput'), $('radiusInput')].forEach((el) => el.addEventListener('input', () => { $('shareBox').hidden = true; }));

// ================= FIND VIEW =================
function renderTargetHeader() {
  if (!target) return;
  $('targetName').textContent = target.n || t('targetDefault');
  $('targetCoords').textContent = `${fmtLatLon(target)} · ${t('radiusText', { r: target.r })}`;
  const { lat, lon } = target, label = encodeURIComponent(target.n || 'Target');
  $('mapsLink').href = isAndroid ? `geo:${lat},${lon}?q=${lat},${lon}(${label})`
    : isApple ? `https://maps.apple.com/?ll=${lat},${lon}&q=${label}`
    : `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lon}`;
}

// ---- state ----
const S = {
  running: false, sim: false,
  fixes: [], pos: null, acc: null, speed: null, course: null, lastFixAt: 0, poorAcc: null,
  simPos: null,
  compass: null, compassAt: 0,
  arrived: false, geoErr: null, watchId: null, wakeLock: null, vibTimer: null,
};

// ---- audio ----
const audio = {
  ctx: null, master: null, next: 0, timer: null,
  volume: parseFloat(store.get('vol', '0.8')), muted: store.get('muted', '0') === '1',
  start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    this.ctx.resume();
    this.applyVolume();
    // A silent blip unlocks audio on iOS inside the tap handler
    this.beep(this.ctx.currentTime, 440, 0.01, 0.0001);
    this.next = this.ctx.currentTime + 0.1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 25);
  },
  stop() { clearInterval(this.timer); this.timer = null; },
  applyVolume() { if (this.master) this.master.gain.value = this.muted ? 0 : this.volume; },
  beep(at, freq, dur, peak = 0.5) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    const attack = Math.min(0.005, dur / 4), release = Math.min(0.012, dur / 3);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
    g.gain.setValueAtTime(Math.max(peak, 0.0002), at + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(this.master);
    o.start(at); o.stop(at + dur + 0.01);
  },
  tick() {
    const c = this.ctx;
    if (!c || !target) return;
    const d = currentDistance();
    const now = c.currentTime;
    if (d === null) { this.next = Math.max(this.next, now + 0.05); this.last = null; return; }
    const interval = S.arrived ? 0.14 : beepInterval(d, target.r);
    // when you get closer, pull the next beep earlier so the rate reacts at once
    if (this.last != null) this.next = Math.min(this.next, this.last + interval);
    if (this.next < now) this.next = now + 0.02;
    while (this.next < now + 0.1) {
      if (S.arrived) this.beep(this.next, 1500, 0.1, 0.55); // continuous pulsing tone
      else this.beep(this.next, beepPitch(d, target.r), 0.06, 0.6);
      this.last = this.next;
      this.next += interval;
    }
  },
};
function updateMute() {
  const b = $('muteBtn');
  if (!b) return;
  b.textContent = audio.muted ? t('unmute') : t('mute');
  b.setAttribute('aria-pressed', String(audio.muted));
}
$('volume').value = String(audio.volume);
$('volume').addEventListener('input', (e) => { audio.volume = +e.target.value; store.set('vol', audio.volume); if (audio.volume > 0 && audio.muted) { audio.muted = false; store.set('muted', '0'); updateMute(); } audio.applyVolume(); });
$('muteBtn').addEventListener('click', () => { audio.muted = !audio.muted; store.set('muted', audio.muted ? '1' : '0'); audio.applyVolume(); updateMute(); });

// ---- position ----
function currentPos() { return S.sim ? S.simPos : S.pos; }
function currentAcc() { return S.sim ? 2 : S.acc; }
function currentDistance() {
  const p = currentPos();
  return p && target ? haversine(p.lat, p.lon, target.lat, target.lon) : null;
}
function onPosition(pos) {
  const c = pos.coords;
  S.geoErr = null;
  if (c.accuracy > 50) { S.poorAcc = c.accuracy; renderFind(); return; }
  S.poorAcc = null;
  S.fixes.push({ lat: c.latitude, lon: c.longitude, acc: c.accuracy });
  if (S.fixes.length > 3) S.fixes.shift();
  const a = averageFixes(S.fixes);
  S.pos = { lat: a.lat, lon: a.lon }; S.acc = a.acc;
  S.speed = c.speed; S.course = Number.isFinite(c.heading) ? c.heading : null;
  S.lastFixAt = Date.now();
  renderFind();
}
function geoErrorText(err) {
  if (!window.isSecureContext) return t('insecure');
  if (!err) return t('geoUnsupported');
  return err.code === 1 ? t('geoDenied') : t('geoUnavailable');
}
function onGeoError(err) {
  if (err.code === 3) return; // timeout: keep watching
  S.geoErr = geoErrorText(err);
  renderFind();
}

// ---- compass ----
function screenAngle() {
  return (screen.orientation && Number.isFinite(screen.orientation.angle)) ? screen.orientation.angle
    : Number.isFinite(window.orientation) ? window.orientation : 0;
}
function setCompass(h) {
  if (!Number.isFinite(h)) return;
  h = ((h + screenAngle()) % 360 + 360) % 360;
  if (S.compass === null) S.compass = h;
  else { // circular low-pass filter
    const diff = ((h - S.compass + 540) % 360) - 180;
    S.compass = (S.compass + diff * 0.35 + 360) % 360;
  }
  S.compassAt = Date.now();
}
function onAbsOrientation(e) { if (e.absolute !== false && e.alpha !== null) setCompass(360 - e.alpha); }
function onOrientation(e) {
  if (Number.isFinite(e.webkitCompassHeading)) setCompass(e.webkitCompassHeading);
  else if (e.absolute && e.alpha !== null && !('ondeviceorientationabsolute' in window)) setCompass(360 - e.alpha);
}
async function startCompass() {
  try {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      await DeviceOrientationEvent.requestPermission(); // iOS: must be inside the tap handler
    }
  } catch { /* denied: fall back to course / north-up */ }
  window.addEventListener('deviceorientationabsolute', onAbsOrientation);
  window.addEventListener('deviceorientation', onOrientation);
}
function headingInfo() {
  if (Date.now() - S.compassAt < 2000 && S.compass !== null) return { mode: 'compass', h: S.compass };
  if (!S.sim && S.course !== null && S.speed !== null && S.speed > 0.5) return { mode: 'course', h: S.course };
  return { mode: 'north', h: 0 };
}

// ---- wake lock ----
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && document.visibilityState === 'visible') S.wakeLock = await navigator.wakeLock.request('screen'); } catch { /* not allowed */ }
}
document.addEventListener('visibilitychange', () => {
  if (S.running && document.visibilityState === 'visible') { requestWakeLock(); audio.ctx && audio.ctx.resume(); }
});

// ---- start / stop ----
$('startBtn').addEventListener('click', async () => {
  audio.start(); // must happen synchronously in the tap
  const compassP = startCompass();
  S.running = true;
  $('startBtn').hidden = true; $('startNote').hidden = true; $('radar').hidden = false;
  if (!navigator.geolocation) S.geoErr = t('geoUnsupported');
  else if (!window.isSecureContext) S.geoErr = t('insecure');
  else S.watchId = navigator.geolocation.watchPosition(onPosition, onGeoError, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  requestWakeLock();
  await compassP;
  loop();
});
function stopFinding() {
  if (!S.running) return;
  S.running = false;
  audio.stop();
  if (S.watchId !== null) navigator.geolocation.clearWatch(S.watchId);
  S.watchId = null;
  window.removeEventListener('deviceorientationabsolute', onAbsOrientation);
  window.removeEventListener('deviceorientation', onOrientation);
  try { S.wakeLock && S.wakeLock.release(); } catch { /* ignore */ }
  clearInterval(S.vibTimer); S.vibTimer = null;
  Object.assign(S, { fixes: [], pos: null, acc: null, arrived: false, sim: false, simPos: null, compass: null, geoErr: null });
  $('simToggle').checked = false; $('simPad').hidden = true; $('simBadge').hidden = true;
  $('startBtn').hidden = false; $('startNote').hidden = false; $('radar').hidden = true;
  document.body.classList.remove('arrived', 'northup');
}

function loop() {
  if (!S.running) return;
  renderFind();
  requestAnimationFrame(loop);
}

let lastArrowDeg = 0;
function renderFind() {
  if (!S.running || !target) return;
  const p = currentPos(), d = currentDistance(), acc = currentAcc();
  const dist = $('dist'), arrow = $('arrow');

  // arrival with hysteresis so it does not flicker at the edge
  if (d !== null) {
    const wasArrived = S.arrived;
    S.arrived = S.arrived ? d <= target.r * 1.3 + 0.3 : d <= target.r;
    if (S.arrived !== wasArrived) {
      document.body.classList.toggle('arrived', S.arrived);
      if (S.arrived) {
        navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 400]);
        S.vibTimer = setInterval(() => navigator.vibrate && navigator.vibrate([150, 80, 150]), 2500);
      } else { clearInterval(S.vibTimer); S.vibTimer = null; navigator.vibrate && navigator.vibrate(0); }
    }
  }

  dist.textContent = d === null ? '–' : formatDistance(d);
  $('acc').textContent = acc === null ? (S.poorAcc ? t('poorGps', { acc: Math.round(S.poorAcc) }) : t('waitingGps')) : `±${acc < 10 ? acc.toFixed(1) : Math.round(acc)} m`;

  const hi = headingInfo();
  $('headingMode').textContent = { compass: t('hCompass'), course: t('hCourse'), north: t('hNorth') }[hi.mode];
  document.body.classList.toggle('northup', hi.mode === 'north');
  if (p) {
    const rel = bearing(p.lat, p.lon, target.lat, target.lon) - hi.h;
    // rotate the shortest way to avoid spinning through 360
    let delta = ((rel - lastArrowDeg) % 360 + 540) % 360 - 180;
    lastArrowDeg += delta;
    arrow.style.transform = `rotate(${lastArrowDeg}deg)`;
    arrow.classList.remove('nofix');
  } else arrow.classList.add('nofix');

  $('warn').hidden = !(d !== null && acc !== null && acc > d && !S.arrived);
  $('geoErr').hidden = !S.geoErr || S.sim;
  $('geoErr').textContent = S.geoErr || '';
}

// ---- simulation ----
$('simToggle').addEventListener('change', (e) => {
  S.sim = e.target.checked;
  $('simPad').hidden = !S.sim; $('simBadge').hidden = !S.sim;
  if (S.sim && target) S.simPos = offsetMeters(target.lat, target.lon, -40, 0);
  renderFind();
});
function simMove(dir, big) {
  if (!S.sim || !S.simPos) return;
  const m = big ? 10 : 1;
  const [n, e] = { n: [m, 0], s: [-m, 0], e: [0, m], w: [0, -m] }[dir];
  S.simPos = offsetMeters(S.simPos.lat, S.simPos.lon, n, e);
  renderFind();
}
document.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', (e) => simMove(b.dataset.move, e.shiftKey)));
$('jumpBtn').addEventListener('click', () => { if (S.sim && target) { S.simPos = offsetMeters(target.lat, target.lon, -1, 0); renderFind(); } });
window.addEventListener('keydown', (e) => {
  if (!S.sim) return;
  const dir = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e' }[e.key];
  if (dir) { e.preventDefault(); simMove(dir, e.shiftKey); }
});

$('backLink').addEventListener('click', (e) => { e.preventDefault(); history.pushState(null, '', location.pathname); route(); });
$('brandLink').addEventListener('click', (e) => { e.preventDefault(); history.pushState(null, '', location.pathname); route(); });

// ---------------- boot ----------------
route();
applyLang();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// expose for automated UI tests
window.__beepRadar = { S, audio };
