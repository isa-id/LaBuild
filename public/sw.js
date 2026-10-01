/**
 * Service worker de LaBuild.
 *
 * Estrategia:
 * - Navegaciones: network-first con fallback a /offline. NUNCA cacheamos HTML
 *   de páginas autenticadas en el Cache Storage, porque quedarían visibles para
 *   cualquier otra persona que use el mismo dispositivo.
 * - Assets estáticos (/_next/static, iconos, manifest): cache-first, son
 *   inmutables y no contienen datos del usuario.
 * - /api/*: sólo red. Cachear respuestas de API filtraría datos de cuenta.
 */

const VERSION = "labuild-v1";
const STATIC_CACHE = `${VERSION}-static`;
const SHELL_CACHE = `${VERSION}-shell`;

const SHELL_ASSETS = [
  "/offline",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API: siempre red.
  if (url.pathname.startsWith("/api/")) return;

  // Navegaciones: red primero, luego la página offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match("/offline")
          .then((cached) => cached || Response.error())
      )
    );
    return;
  }

  // Assets estáticos: caché primero.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    SHELL_ASSETS.includes(url.pathname) ||
    /\.(png|jpg|jpeg|svg|ico|webp|css|js|woff2?)$/i.test(url.pathname);

  if (!isStatic) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Sólo guardamos respuestas completas y correctas.
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || Response.error());
    })
  );
});