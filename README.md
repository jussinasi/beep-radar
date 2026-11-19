# Beep Radar

Find a GPS coordinate by sound, like a metal detector. Enter a coordinate, send the link, and the person who opens it follows the beeps to the spot.

**Live:** https://REPLACE_USER.github.io/beep-radar/

- Accepts decimal degrees, degrees-minutes-seconds, **ETRS-TM35FIN** (Finland, EPSG:3067), and Google Maps / OpenStreetMap links
- The beeps get faster and higher-pitched as you get closer, and the screen turns green when you arrive
- Arrow from the phone compass (falls back to GPS walking direction, or north-up)
- Simulation mode for testing without walking
- Share via link, the share sheet or a QR code (generated locally)
- Works offline after the first load (PWA)
- Finnish / English

## Privacy

No backend, no account, no analytics. The target lives only in the URL **hash** (`#t=lat,lon&r=3&n=name`), which browsers never send to the server. The map tiles come from OpenStreetMap and the Leaflet library from cdnjs.

## Limits

Phone GPS is typically ±3–10 m, so it gets you to within a few metres, not centimetres. Keep the screen on. It is not for safety-critical use.

## Develop

A static site with no build step: serve the folder (`python -m http.server`) and open it. Run the unit tests (parser, ETRS conversion, distance, bearing, beep curve) with:

```
npm test
```

Uses [Leaflet](https://leafletjs.com/), [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles and [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT, vendored).

## License

MIT
