/* Service Worker: App-Seite online zuerst (so kommen Updates an), Auswertungsmodul (Pyodide) dauerhaft im Zwischenspeicher */
const SHELL = "ek-shell-v1", LIB = "ek-lib-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== LIB).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.includes("/pyodide/")) {                         // Pyodide: Zwischenspeicher zuerst
    e.respondWith(caches.open(LIB).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const res = await fetch(req); if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res;
    }));
  } else if (url.origin === location.origin) {                      // eigene Dateien: Netz zuerst, sonst Zwischenspeicher
    e.respondWith(fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(SHELL).then(c => c.put(req, cp)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || caches.match("index.html"))));
  }
});
