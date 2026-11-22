// Minimaler Service Worker: App-Hülle offline verfügbar, sonst immer Netz zuerst.
// Bei Änderungen an der Hülle CACHE-Version erhöhen.
const CACHE = 'marvin-shell-v20';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'face.js', 'face.css', 'manifest.json', 'icons/icon.svg', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    // Nur eigene GET-Requests anfassen (Backend und Gemini laufen direkt)
    if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
    e.respondWith(
        fetch(e.request, { cache: 'no-cache' }) // HTTP-Cache von GitHub Pages umgehen
            .then(res => {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
