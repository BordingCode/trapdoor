// Network-first for same-origin GETs: online players always get fresh code, the cache is
// the offline safety net. Bump CACHE on every shippable change or the old files stick.
const CACHE = 'trapdoor-v10';
const SHELL = [
  '.',
  'index.html',
  'manifest.json',
  'css/main.css?v=4',
  'js/main.js?v=4',
  'js/audio.js',
  'js/engine/loop.js',
  'js/engine/canvas.js',
  'js/engine/input.js',
  'js/engine/fx.js',
  'js/game/world.js',
  'js/game/render.js',
  'js/game/levels.js',
  'js/game/save.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'reload' bypasses the HTTP cache — never snapshot stale files into a new SW cache
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))),
  );
});
