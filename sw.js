// sw.js — Service Worker v1.1 — CodeAI Hub Online

const CACHE_NAME = "codeai-hub-v1.1.0";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/src/style.css",
  "/src/app.js",
  "/src/storage.js",
  "/src/dashboard.js",
  "/src/i18n.js",
  "/agents/codeAgent.js",
  "/agents/docAgent.js",
  "/config/config.js",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-192x192.png",
  "/icons/maskable-512x512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Always network for API calls
  if (url.hostname.includes("groq.com") ||
      url.hostname.includes("googleapis.com") ||
      url.hostname.includes("generativelanguage.googleapis.com") ||
      url.hostname.includes("developer.mozilla.org") ||
      url.hostname.includes("api.github.com") ||
      url.hostname.includes("registry.npmjs.org") ||
      url.hostname.includes("allorigins.win")) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: "Offline" }), {
        headers: { "Content-Type": "application/json" }
      })
    ));
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match("/index.html"));
    })
  );
});
