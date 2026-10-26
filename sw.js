/* Jarvis - service worker.
   Tiene l'applicazione in memoria sul dispositivo: si apre anche senza connessione
   (la grafica e i calcoli funzionano comunque; per parlare con Groq serve la rete). */

const CACHE = 'jarvis-v1';
const FILE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // le chiamate a Groq non vanno mai messe in memoria
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(trovato => {
      if (trovato) {
        // aggiorna in sottofondo, cosi la prossima apertura ha l'ultima versione
        fetch(e.request).then(r => {
          if (r && r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        }).catch(() => {});
        return trovato;
      }
      return fetch(e.request).then(r => {
        if (r && r.ok) {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return r;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
