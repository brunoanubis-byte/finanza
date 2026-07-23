importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
// Finanza PWA — Service Worker
// Versão: incrementar aqui força atualização do cache
const CACHE_NAME = 'finanza-v2';

// Arquivos que serão cacheados no install
const PRECACHE_URLS = [
  '/finanza/',
  '/finanza/index.html',
  '/finanza/manifest.json',
  '/finanza/icons/icon-192.png',
  '/finanza/icons/icon-512.png',
];

// ── Install: pré-cacheia os arquivos locais ──────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: limpa caches antigos ──────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estratégia Network-first ─────────────────────
// Para Firebase, CDNs e Google Fonts: sempre network (não cachear)
// Para arquivos locais do app: network-first, fallback para cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Deixa passar sem interceptar: Firebase, Google APIs, CDNs
  const bypass = [
    'firebaseio.com',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'googleapis.com',
    'gstatic.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
  ];
  if (bypass.some(domain => url.hostname.includes(domain))) {
    return; // deixa o browser resolver normalmente
  }

  // Para arquivos locais: network-first, fallback para cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cacheia respostas bem-sucedidas de arquivos locais
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: retorna do cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback: retorna o index.html para navegação offline
          if (event.request.mode === 'navigate') {
            return caches.match('/finanza/index.html');
          }
        });
      })
  );
});
