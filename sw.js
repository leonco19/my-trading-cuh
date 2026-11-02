/* My Trading Cuh – service worker: makes the app work offline and keeps it up to date.
 * Bump VERSION whenever you change any file. The app's "Check for updates" button compares this number. */
const VERSION = 'mtb-v16';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './js/config.js', './js/content.js', './js/methods.js', './js/voice.js', './js/cloud.js', './js/news.js', './js/charts.js', './js/coach.js', './js/app.js', './js/arena.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never stores old files.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'version' && e.source) e.source.postMessage({ version: VERSION }); });

// Network first (so updates show up when online), cache as offline fallback.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  // Our own files: always ask the server if there's something newer ('no-cache' = revalidate, not "never cache").
  const net = !sameOrigin ? fetch(req) : req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req, { cache: 'no-cache' });
  e.respondWith(
    net.then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
