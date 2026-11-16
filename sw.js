// Service worker: hämtar alltid senaste versionen från nätet (med omvalidering) och faller tillbaka på
// senast sparade kopia om nätet är nere. Det gör att spellänken alltid visar nyaste versionen utan att
// man behöver tömma cachen, och att spelet ändå öppnas offline.
const CACHE = 'rokkikraft-live';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' }); if (hit) return hit; throw err;
    }
  })());
});
