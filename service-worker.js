// ROM Face Check - offline helper
const CACHE = 'rom-face-v3';
const CDN = 'cdnjs.cloudflare.com';
const PRECACHE = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const keep = res => res && (res.ok || res.type === 'opaque');

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app itself: always try the network first so updates arrive, fall back to the saved copy offline.
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (keep(res)) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }

  // Map libraries (Leaflet, JSZip): saved copy first.
  if (url.hostname === CDN) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (keep(res)) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
  // Map tiles and everything else go straight to the network (not saved).
});
