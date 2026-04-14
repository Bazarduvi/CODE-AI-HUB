// sw.js — Service Worker v2.0 — CodeAI Hub Online
const CACHE_NAME = "codeai-hub-v2.0.0";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.png"
];

// ── INSTALL ──────────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────
const API_HOSTS = [
  "groq.com",
  "googleapis.com",
  "generativelanguage.googleapis.com",
  "developer.mozilla.org",
  "api.github.com",
  "registry.npmjs.org",
  "allorigins.win"
];

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const isAPI = API_HOSTS.some(h => url.hostname.includes(h));

  if (isAPI) {
    // Network-first para APIs
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "Offline" }), {
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Cache-first para assets locales
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

// ── PUSH NOTIFICATIONS ───────────────────────────────────
self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : { title: "CodeAI Hub", body: "Notificación" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
      badge: "/icon.png"
    })
  );
});

// ── BACKGROUND SYNC ──────────────────────────────────────
self.addEventListener("sync", event => {
  if (event.tag === "sync-snippets") {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: "BG_SYNC" }));
      })
    );
  }
});
